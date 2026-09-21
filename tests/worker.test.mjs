import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { Miniflare } from 'miniflare';
let mf, db;
before(async () => {
  mf = new Miniflare({ modules: true, scriptPath: process.env.LUCKYDOG_TEST_SITES === 'source' ? 'worker/sites.mjs' : process.env.LUCKYDOG_TEST_SITES ? 'dist/server/index.js' : 'worker/index.mjs', compatibilityDate: '2026-07-01', d1Databases: { DB: 'test-db' } });
  db = await mf.getD1Database('DB');
  // Execute the actual migration, including multi-statement trigger bodies.
  const files = process.env.LUCKYDOG_TEST_SITES
    ? JSON.parse(await readFile('drizzle/meta/_journal.json', 'utf8')).entries.map(entry => `drizzle/${entry.tag}.sql`)
    : ['migrations/0001_sharing.sql', 'migrations/0002_ephemeral_sessions.sql', 'migrations/0003_room_results.sql', 'migrations/0004_activity_history.sql', 'migrations/0005_round_history.sql'];
  for (const file of files) {
    if (file.includes('0004_')) {
      const now = Date.now();
      await db.prepare('INSERT INTO rooms (id, owner, join_expires, expires, active_until) VALUES (?, ?, ?, ?, ?)').bind('legacy', 'legacy-owner', now+300000, now+7*86400000, now+90000).run();
      await db.prepare('INSERT INTO participants (id, room_id, name, voter) VALUES (?, ?, ?, ?)').bind('legacy-person', 'legacy', '迁移演示', 'legacy-voter').run();
      await db.prepare('UPDATE rooms SET result_winners = ?, result_timestamp = 123 WHERE id = ?').bind(JSON.stringify([{id:'old-random',name:'迁移演示'}]), 'legacy').run();
    }
    const sql = await readFile(file, 'utf8');
    await db.exec(sql.replace(/--[^\n]*/g, '').replace(/\n/g, ' '));
  }
});
after(async () => { await mf?.dispose(); });
async function api(path, method = 'GET', body, headers = {}) {
  const response = await mf.dispatchFetch(`https://luckydog.test/api/${path}`, {
    method, headers: { ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}), ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  assert.match(response.headers.get('cache-control'), /no-store/);
  return { status: response.status, value: await response.json(), headers: response.headers };
}
const create = async (durationMinutes = 5) => (await api('rooms', 'POST', { durationMinutes })).value;
const ownerHeaders = room => ({ Authorization: `Bearer ${room.owner}` });
const cookie = n => ({ Cookie: `luckydog-voter=${n.toString(16).padStart(48, '0')}` });

test('v5 migration preserves creation deadline and maps historical winner identity', async () => {
  const row = await db.prepare('SELECT * FROM rooms WHERE id = ?').bind('legacy').first();
  assert.ok(Math.abs(row.expires - Date.now() - 86400000) < 5000);
  assert.equal(row.active_until, null);
  assert.deepEqual(JSON.parse(row.result_winners), [{ id:'legacy-person',name:'迁移演示' }]);
  const history = await db.prepare('SELECT timestamp, winners FROM room_draws WHERE room_id = ?').bind('legacy').all();
  assert.deepEqual(history.results, [{ timestamp:123, winners:row.result_winners }]);
});

test('room protocol, duration, public privacy, authorization and archive retention', async () => {
  for (const duration of [5, 10, 30]) {
    const start = Date.now(), room = await create(duration);
    assert.match(room.id, /^[a-f0-9]{48}$/); assert.match(room.owner, /^[a-f0-9]{48}$/);
    assert.ok(room.joinExpires >= start + duration * 60000);
    assert.ok(room.joinExpires < Date.now() + duration * 60000 + 50);
    const joined = await api(`rooms/${room.id}/join`, 'POST', { name: '  春风  ' });
    assert.equal(joined.status, 201);
    assert.match(joined.headers.get('set-cookie'), /HttpOnly; SameSite=Strict; Path=\/; Max-Age=604800; Secure/);
    assert.deepEqual((await api(`rooms/${room.id}`)).value, { state: 'open', expires: room.expires, open: true, joinExpires: room.joinExpires, count: 1 });
    const owned = (await api(`rooms/${room.id}`, 'GET', undefined, ownerHeaders(room))).value;
    assert.equal(owned.participants[0].name, '春风'); assert.equal(owned.participants[0].voter, undefined);
    for (const method of ['PATCH', 'DELETE']) assert.equal((await api(`rooms/${room.id}`, method, {}, { Authorization: 'Bearer wrong' })).status, 403);
    assert.equal((await api(`rooms/${room.id}`, 'DELETE', {}, ownerHeaders(room))).status, 200);
    assert.equal((await api(`rooms/${room.id}`)).value.state, 'ended');
    assert.equal((await db.prepare('SELECT COUNT(*) AS n FROM participants WHERE room_id = ?').bind(room.id).first()).n, 1);
    assert.equal((await api(`rooms/${room.id}/join`, 'POST', {name:'结束后来客'})).status, 409);
    assert.equal((await api(`rooms/${room.id}`, 'PATCH', {open:true}, ownerHeaders(room))).status, 409);
  }
  assert.equal((await api('rooms', 'POST', { durationMinutes: 1 })).status, 400);
  const start = Date.now(), room = (await api('rooms', 'POST', {})).value;
  assert.ok(room.joinExpires >= start + 300000 && room.joinExpires < Date.now() + 300100);
});

test('concurrent same-name and same-browser registrations have exactly one winner', async () => {
  for (const sameBrowser of [false, true]) {
    const room = await create();
    const responses = await Promise.all(Array.from({ length: 20 }, (_, i) => api(`rooms/${room.id}/join`, 'POST', { name: sameBrowser ? `来客${i}` : '同名' }, cookie(sameBrowser ? 1 : i + 1))));
    assert.equal(responses.filter(r => r.status === 201).length, 1);
    const rejected = responses.filter(r => r.status === 409);
    assert.equal(rejected.length, 19);
    assert.ok(rejected.every(r => r.value.error === (sameBrowser ? '你已经参与过本次报名' : '此用户名已参与，请使用其他用户名')));
    assert.equal((await api(`rooms/${room.id}`)).value.count, 1);
  }
});

test('a participant can read only their own registration and owner removal persists', async () => {
  const room = await create();
  await api(`rooms/${room.id}/join`, 'POST', { name: '本人信息' }, cookie(91));
  await api(`rooms/${room.id}/join`, 'POST', { name: '其他用户' }, cookie(92));
  const self = (await api(`rooms/${room.id}`, 'GET', undefined, cookie(91))).value;
  assert.equal(self.participant.name, '本人信息');
  assert.equal(self.participants, undefined);
  const stranger = (await api(`rooms/${room.id}`)).value;
  assert.equal(stranger.participant, undefined);
  const owned = (await api(`rooms/${room.id}`, 'GET', undefined, ownerHeaders(room))).value;
  const removed = await api(`rooms/${room.id}`, 'PATCH', { removeParticipantId: owned.participants[0].id }, ownerHeaders(room));
  assert.equal(removed.status, 200);
  assert.deepEqual(removed.value.participants.map(participant => participant.name), ['其他用户']);
  assert.equal((await api(`rooms/${room.id}`, 'GET', undefined, cookie(91))).value.participant, undefined);
});

test('manual closure and deadlines keep owner access but prohibit new joins and reopening after deadline', async () => {
  const room = await create();
  await api(`rooms/${room.id}/join`, 'POST', { name: '已报名' });
  assert.equal((await api(`rooms/${room.id}`, 'PATCH', { open: false }, ownerHeaders(room))).value.open, false);
  assert.equal((await api(`rooms/${room.id}/join`, 'POST', { name: '太晚' })).status, 409);
  assert.equal((await api(`rooms/${room.id}`, 'PATCH', { open: true }, ownerHeaders(room))).value.open, true);
  await db.prepare('UPDATE rooms SET join_expires = ? WHERE id = ?').bind(Date.now() - 1, room.id).run();
  const owner = await api(`rooms/${room.id}`, 'GET', undefined, ownerHeaders(room));
  assert.equal(owner.status, 200); assert.equal(owner.value.open, false); assert.equal(owner.value.participants.length, 1);
  assert.equal((await api(`rooms/${room.id}/join`, 'POST', { name: '太晚' })).value.error, '报名已结束');
  assert.equal((await api(`rooms/${room.id}`, 'PATCH', { open: true }, ownerHeaders(room))).value.open, false);
  // Directly exercise the atomic database guard, not just the HTTP pre-check.
  await assert.rejects(db.prepare('INSERT INTO participants (id, room_id, name, voter) VALUES (?, ?, ?, ?)').bind('late-id', room.id, '太晚', 'late-voter').run(), /ROOM_CLOSED/);
  await db.prepare('UPDATE rooms SET expires = ? WHERE id = ?').bind(Date.now() - 1, room.id).run();
  for (const method of ['GET', 'PATCH', 'DELETE']) assert.equal((await api(`rooms/${room.id}`, method, method === 'GET' ? undefined : {}, ownerHeaders(room))).status, 404);
});

test('personal results, latest replacement, fixed retention and safe interruption', async () => {
  const room = await create();
  assert.ok(Math.abs(room.expires - Date.now() - 86400000) < 2000);
  await api(`rooms/${room.id}/join`, 'POST', { name: '甲' }, cookie(81));
  await api(`rooms/${room.id}/join`, 'POST', { name: '乙' }, cookie(82));
  const roster = (await api(`rooms/${room.id}`, 'GET', undefined, ownerHeaders(room))).value.participants;
  for (const [i, timestamp, round] of [[0, 123, 1], [1, 456, 2], [1, 789, 3]]) {
    const published = await api(`rooms/${room.id}`, 'PATCH', { result: { winners: [roster[i]], timestamp } }, ownerHeaders(room));
    assert.equal(published.status, 200);
    const stranger = (await api(`rooms/${room.id}`)).value;
    assert.deepEqual(Object.keys(stranger).sort(), ['expires', 'joinExpires', 'open', 'state']);
    assert.equal(stranger.state, 'drawn');
    for (const j of [0, 1]) {
      const self = (await api(`rooms/${room.id}`, 'GET', undefined, cookie(81+j))).value;
      assert.deepEqual(self.participant, { name: roster[j].name });
      assert.deepEqual(self.personalResult, { won: i === j, timestamp, round });
      assert.equal(self.history.length, round);
      assert.equal(self.result, undefined);assert.equal(self.participants, undefined);
      assert.equal(self.expires, room.expires);
    }
  }
  assert.equal((await api(`rooms/${room.id}`, 'PATCH', { removeParticipantId: roster[0].id }, ownerHeaders(room))).status, 409);
  assert.equal((await api(`rooms/${room.id}`, 'PATCH', { result: { winners: [{ id: 'fake', name: '甲' }], timestamp: 10 } }, ownerHeaders(room))).status, 400);
  assert.equal((await api(`rooms/${room.id}`, 'PATCH', { open: true }, ownerHeaders(room))).value.open, false);
  assert.equal((await api(`rooms/${room.id}/join`, 'POST', { name: '开奖后来客' })).status, 409);
  // Completed results do not require heartbeats and retain the original expiry.
  assert.equal((await db.prepare('SELECT active_until FROM rooms WHERE id = ?').bind(room.id).first()).active_until, null);
  await db.prepare('UPDATE rooms SET expires = ? WHERE id = ?').bind(Date.now(), room.id).run();
  assert.equal((await api(`rooms/${room.id}`)).status, 404);
  const abandoned = await create();
  await api(`rooms/${abandoned.id}/join`, 'POST', { name: '中断用户' }, cookie(85));
  await db.prepare('UPDATE rooms SET active_until = 0 WHERE id = ?').bind(abandoned.id).run();
  const self = (await api(`rooms/${abandoned.id}`, 'GET', undefined, cookie(85))).value;
  assert.equal(self.state, 'interrupted');assert.equal(self.open, false);assert.equal(self.participant.name, '中断用户');
  assert.equal((await api(`rooms/${abandoned.id}`, 'GET', undefined, ownerHeaders(abandoned))).value.state, 'interrupted');
  assert.equal((await api(`rooms/${abandoned.id}`, 'PATCH', {open:true}, ownerHeaders(abandoned))).status, 409);
  assert.equal((await api(`rooms/${abandoned.id}/join`, 'POST', {name:'迟到'})).status, 409);
  assert.equal((await api(`rooms/${abandoned.id}`, 'DELETE', {}, ownerHeaders(abandoned))).status, 200);
});

test('close racing with joins returns a final consistent list', async () => {
  const room = await create();
  const joins = Array.from({ length: 15 }, (_, i) => api(`rooms/${room.id}/join`, 'POST', { name: `报名${i}` }, cookie(i + 1)));
  const closed = await api(`rooms/${room.id}`, 'PATCH', { open: false }, ownerHeaders(room));
  const replies = await Promise.all(joins);
  assert.ok(replies.every(r => [201, 409].includes(r.status)));
  assert.equal(closed.value.participants.length, replies.filter(r => r.status === 201).length);
  assert.deepEqual((await api(`rooms/${room.id}`, 'GET', undefined, ownerHeaders(room))).value.participants, closed.value.participants);
});

test('shared results require their owner session, support heartbeat and cleanup', async () => {
  const start = Date.now();
  const created = await api('results', 'POST', { winners: [{ id: 'local-only', name: '幸运儿' }], timestamp: 123 });
  assert.equal(created.status, 201);
  assert.match(created.value.owner, /^[a-f0-9]{48}$/);
  const result = await api(`results/${created.value.id}`);
  assert.equal(result.value.timestamp, 123); assert.equal(result.value.winners[0].name, '幸运儿');
  assert.notEqual(result.value.winners[0].id, 'local-only');
  assert.ok(result.value.expires >= start + 7 * 86400000);
  assert.equal((await api(`results/${created.value.id}`, 'PATCH', {}, { Authorization: 'Bearer wrong' })).status, 403);
  assert.equal((await api(`results/${created.value.id}`, 'PATCH', {}, ownerHeaders(created.value))).status, 200);
  const room = await create(); await api(`rooms/${room.id}/join`, 'POST', { name: '待清理' });
  await db.prepare('UPDATE rooms SET expires = 0 WHERE id = ?').bind(room.id).run();
  await db.prepare('UPDATE results SET expires = 0 WHERE id = ?').bind(created.value.id).run();
  assert.equal((await api(`results/${created.value.id}`)).status, 404);
  const worker = await mf.getWorker(); await worker.scheduled({ cron: '0 * * * *' });
  assert.equal(await db.prepare('SELECT * FROM rooms WHERE id = ?').bind(room.id).first(), null);
  assert.equal(await db.prepare('SELECT * FROM participants WHERE room_id = ?').bind(room.id).first(), null);
  assert.equal(await db.prepare('SELECT * FROM results WHERE id = ?').bind(created.value.id).first(), null);
});

test('result owner can immediately invalidate a shared result', async () => {
  const created = await api('results', 'POST', { winners: [{ name: '用完即弃' }], timestamp: 123 });
  assert.equal((await api(`results/${created.value.id}`, 'DELETE', {}, { Authorization: 'Bearer wrong' })).status, 403);
  assert.equal((await api(`results/${created.value.id}`, 'DELETE', {}, ownerHeaders(created.value))).status, 200);
  assert.equal((await api(`results/${created.value.id}`)).status, 404);
});

test('inactive unfinished hosts keep interrupted status while legacy shares expire', async () => {
  const room = await create();
  const created = await api('results', 'POST', { winners: [{ name: '短暂结果' }], timestamp: 123 });
  await db.prepare('UPDATE rooms SET active_until = 0 WHERE id = ?').bind(room.id).run();
  await db.prepare('UPDATE results SET active_until = 0 WHERE id = ?').bind(created.value.id).run();
  assert.equal((await api(`rooms/${room.id}`)).value.state, 'interrupted');
  assert.equal((await api(`results/${created.value.id}`)).status, 404);
  const worker = await mf.getWorker(); await worker.scheduled({ cron: '0 * * * *' });
  assert.ok(await db.prepare('SELECT * FROM rooms WHERE id = ?').bind(room.id).first());
  assert.equal(await db.prepare('SELECT * FROM results WHERE id = ?').bind(created.value.id).first(), null);
});

test('invalid and oversized input, unknown routes and API navigation return JSON errors', async () => {
  const room = await create();
  for (const bad of ['', ' '.repeat(3), 'x'.repeat(81), null]) assert.equal((await api(`rooms/${room.id}/join`, 'POST', { name: bad })).status, 400);
  for (const bad of [{}, { winners: [], timestamp: 1 }, { winners: [{ name: 'a' }], timestamp: 'bad' }]) assert.equal((await api('results', 'POST', bad)).status, 400);
  assert.equal((await api(`rooms/${room.id}`, 'PATCH', { result: { winners: [], timestamp: 1 } }, ownerHeaders(room))).status, 400);
  assert.equal((await api('results', 'POST', { winners: [{ name: 'x'.repeat(1024 * 1024) }], timestamp: 1 })).status, 413);
  const malformed = await mf.dispatchFetch('https://luckydog.test/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{' });
  assert.equal(malformed.status, 400);
  const wrongType = await mf.dispatchFetch('https://luckydog.test/api/rooms', { method: 'POST', body: '{}' });
  assert.equal(wrongType.status, 415);
  assert.equal((await api('unknown', 'GET', undefined, { 'Sec-Fetch-Mode': 'navigate' })).status, 404);
});

test('participant capacity is enforced atomically under concurrency', async () => {
  const room = await create();
  await db.prepare(`WITH RECURSIVE numbers(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM numbers WHERE n < 4999)
    INSERT INTO participants (id, room_id, name, voter)
    SELECT 'capacity-' || n, ?, '已有' || n, 'voter-' || n FROM numbers`).bind(room.id).run();
  const replies = await Promise.all(Array.from({ length: 8 }, (_, i) => api(`rooms/${room.id}/join`, 'POST', { name: `最后${i}` }, cookie(i + 1))));
  assert.equal(replies.filter(r => r.status === 201).length, 1);
  assert.equal(replies.filter(r => r.status === 400 && r.value.error === '参与人数已满').length, 7);
  assert.equal((await api(`rooms/${room.id}`)).value.count, 5000);
});

test('round retries are idempotent; archive preserves private history until expiry and cleanup', async () => {
  const room = await create();
  for (const [n, name] of [[701, '历史甲'], [702, '历史乙']]) await api(`rooms/${room.id}/join`, 'POST', {name}, cookie(n));
  const roster = (await api(`rooms/${room.id}`, 'GET', undefined, ownerHeaders(room))).value.participants;
  const first = {result:{winners:[roster[0]],timestamp:1000}};
  const second = {result:{winners:[roster[1]],timestamp:2000}};
  const retries = await Promise.all(Array.from({length:8},()=>api(`rooms/${room.id}`, 'PATCH', first, ownerHeaders(room))));
  assert.ok(retries.every(r=>r.status===200));
  assert.equal((await api(`rooms/${room.id}`, 'PATCH', second, ownerHeaders(room))).status,200);
  assert.equal((await api(`rooms/${room.id}`, 'PATCH', first, ownerHeaders(room))).status,200);
  const expected=[{round:1,timestamp:1000,won:true},{round:2,timestamp:2000,won:false}];
  const read=async()=>(await api(`rooms/${room.id}`,'GET',undefined,cookie(701))).value;
  assert.deepEqual((await read()).history,expected);
  assert.equal((await read()).personalResult.timestamp,2000);
  assert.equal((await api(`rooms/${room.id}`,'PATCH',{archive:true})).status,403);
  assert.equal((await api(`rooms/${room.id}`,'PATCH',{archive:true},ownerHeaders(room))).status,200);
  assert.deepEqual((await read()).history,expected);
  assert.equal((await read()).expires,room.expires);
  assert.equal((await api(`rooms/${room.id}`,'PATCH',second,ownerHeaders(room))).status,409);
  assert.equal((await api(`rooms/${room.id}`,'DELETE',{},ownerHeaders(room))).status,200);
  const stranger=(await api(`rooms/${room.id}`)).value;
  assert.deepEqual(Object.keys(stranger).sort(),['expires','joinExpires','open','state']);
  assert.deepEqual((await read()).history,expected);
  const next=await create();assert.notEqual(next.id,room.id);
  await db.prepare('UPDATE rooms SET expires = 0 WHERE id = ?').bind(room.id).run();
  assert.equal((await api(`rooms/${room.id}`)).status,404);
  const worker=await mf.getWorker();await worker.scheduled({cron:'0 * * * *'});
  for(const table of ['participants','room_draws']) assert.equal((await db.prepare(`SELECT COUNT(*) AS n FROM ${table} WHERE room_id = ?`).bind(room.id).first()).n,0);
});

test('room and result caps remain atomic and expired rows do not consume quota', async () => {
  // A fresh local database gives a deterministic boundary without changing other fixtures.
  await db.batch([db.prepare('DELETE FROM rooms'), db.prepare('DELETE FROM results')]);
  const expiry = Date.now() + 86400000;
  await db.prepare(`WITH RECURSIVE numbers(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM numbers WHERE n < 9999)
    INSERT INTO rooms (id, owner, join_expires, expires) SELECT 'quota-' || n, 'owner', ?, ? FROM numbers`).bind(expiry, expiry).run();
  await db.prepare(`WITH RECURSIVE numbers(n) AS (SELECT 1 UNION ALL SELECT n + 1 FROM numbers WHERE n < 9999)
    INSERT INTO results (id, winners, timestamp, expires) SELECT 'quota-' || n, '[]', 0, ? FROM numbers`).bind(expiry).run();
  for (const kind of ['rooms', 'results']) {
    const body = kind === 'rooms' ? {} : { winners: [{ name: '中奖' }], timestamp: 123 };
    const replies = await Promise.all(Array.from({ length: 5 }, () => api(kind, 'POST', body)));
    assert.equal(replies.filter(r => r.status === 201).length, 1);
    assert.equal(replies.filter(r => r.status === 503).length, 4);
    await db.prepare(`UPDATE ${kind} SET expires = 0 WHERE id = 'quota-1'`).run();
    assert.equal((await api(kind, 'POST', body)).status, 201);
  }
});
