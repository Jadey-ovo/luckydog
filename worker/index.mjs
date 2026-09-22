const DAY = 86400000;
const WEEK = 7 * DAY;
const SESSION_LEASE = 90000;
const SQL_NOW = "CAST((julianday('now') - 2440587.5) * 86400000 AS INTEGER)";
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(24)), b => b.toString(16).padStart(2, '0')).join('');
const voterToken = request => /(?:^|;\s*)luckydog-voter=([a-f0-9]{48})(?:;|$)/.exec(request.headers.get('cookie') || '')?.[1];
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const name = value => {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > 80) fail('用户名请填写 1–80 个字符');
  return value.trim();
};
const drawResult = value => {
  if (!value || !Array.isArray(value.winners) || !value.winners.length || value.winners.length > 5000 || !Number.isFinite(value.timestamp)) fail('中奖名单无效');
  return { winners: value.winners.map(participant => ({ id: crypto.randomUUID(), name: name(participant?.name) })), timestamp: value.timestamp };
};
const databaseErrors = {
  ROOM_GONE: ['邀请已过期或不存在', 404],
  ROOM_CLOSED: ['报名已结束', 409],
  VOTER_DUPLICATE: ['你已经参与过本次报名', 409],
  NAME_DUPLICATE: ['此用户名已参与，请使用其他用户名', 409],
  ROOM_FULL: ['参与人数已满', 400],
};
async function readBody(request) {
  if (request.method === 'GET') return {};
  if (request.headers.get('content-type') !== 'application/json') fail('仅接受 JSON 请求', 415);
  const reader = request.body?.getReader();
  const chunks = [];
  let size = 0;
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > 1024 * 1024) { await reader.cancel(); fail('提交内容过大', 413); }
      chunks.push(value);
    }
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  try { return JSON.parse(new TextDecoder().decode(bytes) || '{}'); }
  catch { fail('无效请求'); }
}
export async function prune(db) {
  await db.batch([
    db.prepare(`DELETE FROM rooms WHERE expires <= ${SQL_NOW}`),
    db.prepare(`DELETE FROM results WHERE expires < ${SQL_NOW} OR (active_until IS NOT NULL AND active_until < ${SQL_NOW})`),
  ]);
}
export default {
  async scheduled(_event, env) { await prune(env.DB); },
  async fetch(request, env) {
    const url = new URL(request.url);
    if (!url.pathname.startsWith('/api/')) return env.ASSETS.fetch(request);
    const headers = new Headers({ 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
    const send = (status, value) => new Response(JSON.stringify(value), { status, headers });
    try {
      const body = await readBody(request);
      const [, , kind, id, action] = url.pathname.split('/');
      const db = env.DB;
      if (kind === 'rooms' && !id && request.method === 'POST') {
        const durationMinutes = body?.durationMinutes ?? 5;
        if (![5, 10, 30].includes(durationMinutes)) fail('请选择 5、10 或 30 分钟有效期');
        const id = token(), owner = token(), now = Date.now();
        const joinExpires = now + durationMinutes * 60000;
        const inserted = await db.prepare(`INSERT INTO rooms (id, owner, join_expires, expires, active_until)
          SELECT ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM rooms WHERE expires >= ${SQL_NOW}) < 10000`)
          .bind(id, owner, joinExpires, now + DAY, now + SESSION_LEASE).run();
        if (!inserted.meta.changes) fail('活动数量已达上限', 503);
        return send(201, { id, owner, joinExpires, expires: now + DAY });
      }
      if (kind === 'rooms' && id) {
        const room = await db.prepare(`SELECT * FROM rooms WHERE id = ? AND expires > ${SQL_NOW}`).bind(id).first();
        if (!room) fail('邀请已过期或不存在', 404);
        const hostGone = !room.archived && room.active_until !== null && room.active_until <= Date.now();
        const interrupted = hostGone && !room.result_winners;
        const registrationOpen = !room.archived && !interrupted && !room.result_winners && !!room.open && Date.now() < room.join_expires;
        if (action === 'join' && request.method === 'POST') {
          if (!registrationOpen) fail('报名已结束', 409);
          let voter = voterToken(request);
          if (!voter) {
            voter = token();
            headers.set('Set-Cookie', `luckydog-voter=${voter}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${url.protocol === 'https:' ? '; Secure' : ''}`);
          }
          if (await db.prepare('SELECT 1 FROM participants WHERE room_id = ? AND voter = ?').bind(id, voter).first()) fail('你已经参与过本次报名', 409);
          await db.prepare('INSERT INTO participants (id, room_id, name, voter) VALUES (?, ?, ?, ?)')
            .bind(crypto.randomUUID(), id, name(body?.name), voter).run();
          return send(201, { ok: true });
        }
        const owner = request.headers.get('authorization') === `Bearer ${room.owner}`;
        if (request.method === 'GET') {
          if (owner && !hostGone && !room.archived) await db.prepare(`UPDATE rooms SET active_until = ? WHERE id = ? AND archived = 0 AND expires > ${SQL_NOW} AND (active_until IS NULL OR active_until > ${SQL_NOW})`).bind(Date.now() + SESSION_LEASE, id).run();
          const snapshot = await db.batch([
            db.prepare(`SELECT *, (archived = 0 AND open = 1 AND result_winners IS NULL AND join_expires > ${SQL_NOW} AND (active_until IS NULL OR active_until > ${SQL_NOW})) AS registration_open FROM rooms WHERE id = ? AND expires > ${SQL_NOW}`).bind(id),
            db.prepare(owner ? 'SELECT id, name FROM participants WHERE room_id = ? ORDER BY seq' : 'SELECT COUNT(*) AS count FROM participants WHERE room_id = ?').bind(id),
          ]);
          const current = snapshot[0].results[0];
          if (!current) fail('邀请已过期或不存在', 404);
          const result = current.result_winners ? { winners: JSON.parse(current.result_winners), timestamp: current.result_timestamp } : null;
          const voter = !owner && voterToken(request);
          const participant = voter ? await db.prepare('SELECT id, name FROM participants WHERE room_id = ? AND voter = ?').bind(id, voter).first() : null;
          const inactive = current.active_until !== null && current.active_until <= Date.now();
          const state = current.archived || (inactive && result) ? 'ended' : result ? 'drawn' : inactive ? 'interrupted' : current.registration_open ? 'open' : 'closed';
          // Never serialize the full result for a visitor, including an unregistered browser.
          const rounds = participant && result ? (await db.prepare('SELECT timestamp, winners FROM room_draws WHERE room_id = ? ORDER BY seq').bind(id).all()).results : [];
          const history = rounds.map((draw, index) => ({ round: index + 1, timestamp: draw.timestamp,
            won: JSON.parse(draw.winners).some(winner => winner.id === participant.id) }));
          const personalResult = history.at(-1);
          return send(200, { state, expires: current.expires, open: !!current.registration_open, joinExpires: current.join_expires,
            ...(owner ? { participants: snapshot[1].results, ...(result ? { result } : {}) }
              : { ...(state === 'open' ? { count: snapshot[1].results[0].count } : {}),
                  ...(participant ? { participant: { name: participant.name } } : {}), ...(personalResult ? { personalResult, history } : {}) }) });
        }
        if (!owner) fail('无权管理此活动', 403);
        // Resetting the host archives the activity; its existing link and records keep their original expiry.
        // Treat legacy DELETE requests as archive too, so an older client cannot erase participant history.
        if ((request.method === 'PATCH' && body?.archive === true) || request.method === 'DELETE') {
          await db.prepare('UPDATE rooms SET archived = 1, open = 0, active_until = NULL WHERE id = ?').bind(id).run();
          return send(200, { ok: true });
        }
        if (request.method === 'PATCH') {
          if (room.archived) fail('活动已结束，请创建新邀请', 409);
          if (interrupted) fail('发起人连接已中断，请返回重新发起', 409);
          if (body?.removeParticipantId !== undefined) {
            if (room.result_winners) fail('开奖后不能移除参与者', 409);
            if (typeof body.removeParticipantId !== 'string' || !body.removeParticipantId) fail('参与者信息无效');
            await db.prepare(`DELETE FROM participants WHERE room_id = ? AND id = ? AND EXISTS (SELECT 1 FROM rooms WHERE id = participants.room_id AND archived = 0 AND result_winners IS NULL AND expires > ${SQL_NOW} AND (active_until IS NULL OR active_until > ${SQL_NOW}))`).bind(id, body.removeParticipantId).run();
            await db.prepare(`UPDATE rooms SET active_until = CASE WHEN result_winners IS NULL THEN ? ELSE NULL END WHERE id = ? AND archived = 0 AND expires > ${SQL_NOW} AND (result_winners IS NOT NULL OR active_until IS NULL OR active_until > ${SQL_NOW})`).bind(Date.now() + SESSION_LEASE, id).run();
            const participants = await db.prepare('SELECT id, name FROM participants WHERE room_id = ? ORDER BY seq').bind(id).all();
            return send(200, { participants: participants.results, open: registrationOpen });
          }
          if (body?.result !== undefined) {
            const result = drawResult(body.result);
            const roster = (await db.prepare('SELECT id, name FROM participants WHERE room_id = ?').bind(id).all()).results;
            const ids = body.result.winners.map(winner => winner.id);
            if (new Set(ids).size !== ids.length || ids.some(id => !roster.some(p => p.id === id))) fail('中奖者必须来自当前参与名单');
            result.winners = ids.map(id => roster.find(p => p.id === id));
            const saved = await db.prepare('SELECT winners FROM room_draws WHERE room_id = ? AND timestamp = ?').bind(id, result.timestamp).first();
            if (saved) {
              if (saved.winners !== JSON.stringify(result.winners)) fail('本轮已保存，请勿修改已公布的结果', 409);
              return send(200, { participants: roster, open: false, result });
            }
            if (room.result_timestamp !== null && result.timestamp <= room.result_timestamp) fail('开奖时间早于已公布的轮次，请重新抽奖', 409);
            const updated = await db.prepare(`UPDATE rooms SET open = 0, result_winners = ?, result_timestamp = ?, active_until = ?
              WHERE id = ? AND archived = 0 AND expires > ${SQL_NOW} AND (active_until IS NULL OR active_until > ${SQL_NOW})
              AND (result_timestamp IS NULL OR result_timestamp < ?)
              AND (SELECT COUNT(*) FROM participants WHERE room_id = rooms.id AND id IN (SELECT value FROM json_each(?))) = ? RETURNING open`)
              .bind(JSON.stringify(result.winners), result.timestamp, Date.now() + SESSION_LEASE, id, result.timestamp, JSON.stringify(ids), ids.length).first();
            if (!updated) {
              // A concurrent retry may have committed the same round while this request was waiting.
              const concurrent = await db.prepare('SELECT winners FROM room_draws WHERE room_id = ? AND timestamp = ?').bind(id, result.timestamp).first();
              if (!concurrent || concurrent.winners !== JSON.stringify(result.winners)) fail('活动状态或名单已变更，请刷新后重试', 409);
            }
            const participants = await db.prepare('SELECT id, name FROM participants WHERE room_id = ? ORDER BY seq').bind(id).all();
            return send(200, { participants: participants.results, open: false, result });
          }
          const snapshot = await db.batch([
            db.prepare(`UPDATE rooms SET open = (? = 1 AND join_expires > ${SQL_NOW} AND result_winners IS NULL), active_until = ?
              WHERE id = ? AND archived = 0 AND expires > ${SQL_NOW} AND (active_until IS NULL OR active_until > ${SQL_NOW}) RETURNING open`)
              .bind(body?.open === true ? 1 : 0, Date.now() + SESSION_LEASE, id),
            db.prepare('SELECT id, name FROM participants WHERE room_id = ? ORDER BY seq').bind(id),
          ]);
          if (!snapshot[0].results.length) fail('邀请已过期或不存在', 404);
          return send(200, { participants: snapshot[1].results, open: !!snapshot[0].results[0].open });
        }
      }
      if (kind === 'results' && !id && request.method === 'POST') {
        const winners = drawResult(body).winners;
        const id = token(), owner = token(), now = Date.now();
        const inserted = await db.prepare(`INSERT INTO results (id, owner, winners, timestamp, expires, active_until)
          SELECT ?, ?, ?, ?, ?, ? WHERE (SELECT COUNT(*) FROM results WHERE expires >= ${SQL_NOW}) < 10000`)
          .bind(id, owner, JSON.stringify(winners), body.timestamp, now + WEEK, now + SESSION_LEASE).run();
        if (!inserted.meta.changes) fail('分享数量已达上限', 503);
        return send(201, { id, owner });
      }
      if (kind === 'results' && id) {
        const result = await db.prepare(`SELECT * FROM results WHERE id = ? AND expires >= ${SQL_NOW}
          AND (active_until IS NULL OR active_until >= ${SQL_NOW})`).bind(id).first();
        if (!result) fail('结果已过期或不存在', 404);
        if (request.method === 'GET') return send(200, { winners: JSON.parse(result.winners), timestamp: result.timestamp, expires: result.expires });
        const owner = request.headers.get('authorization') === `Bearer ${result.owner}`;
        if (!owner) fail('无权管理此结果', 403);
        if (request.method === 'PATCH') {
          await db.prepare('UPDATE results SET active_until = ? WHERE id = ?').bind(Date.now() + SESSION_LEASE, id).run();
          return send(200, { ok: true });
        }
        if (request.method === 'DELETE') {
          await db.prepare('DELETE FROM results WHERE id = ?').bind(id).run();
          return send(200, { ok: true });
        }
      }
      return send(404, { error: '接口不存在' });
    } catch (error) {
      const mapped = Object.entries(databaseErrors).find(([code]) => error.message?.includes(code))?.[1];
      return send(mapped?.[1] || error.status || 500, { error: mapped?.[0] || (error.status ? error.message : '服务暂时不可用，请重试') });
    }
  },
};
