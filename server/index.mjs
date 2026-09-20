import http from 'node:http';
import { randomUUID, randomBytes } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, renameSync, existsSync } from 'node:fs';
import { resolve, extname } from 'node:path';
const dir = resolve(process.env.DATA_DIR || '.luckydog-data');
mkdirSync(dir, { recursive: true });
const file = resolve(dir, 'shares.json');
const db = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : { rooms: {}, results: {} };
const save = () => { writeFileSync(file + '.tmp', JSON.stringify(db), { mode: 0o600 }); renameSync(file + '.tmp', file); };
const token = () => randomBytes(24).toString('hex');
const expires = () => Date.now() + 7 * 86400000;
const prune = () => { for (const group of Object.values(db)) for (const [id, item] of Object.entries(group)) if (item.expires < Date.now()) delete group[id]; save(); };
prune(); setInterval(prune, 3600000).unref();
const fail = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
const name = value => { if (typeof value !== 'string' || !value.trim() || value.trim().length > 80) fail('用户名请填写 1–80 个字符'); return value.trim(); };
const server = http.createServer(async (req, res) => {
 const send = (status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
 try {
  const url = new URL(req.url, 'http://localhost');
  if (!url.pathname.startsWith('/api/')) {
   const path = resolve('dist', '.' + decodeURIComponent(url.pathname === '/' ? '/index.html' : url.pathname));
   if (!path.startsWith(resolve('dist') + '/') || !existsSync(path)) return send(404, {error:'页面不存在'});
   res.setHeader('Content-Type', ({'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.png':'image/png','.xlsx':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'})[extname(path)] || 'application/octet-stream');
   return res.end(readFileSync(path));
  }
  if (req.method !== 'GET' && req.headers['content-type'] !== 'application/json') fail('仅接受 JSON 请求', 415);
  let body = {};
  if (req.method !== 'GET') { let raw = ''; for await (const chunk of req) { raw += chunk; if (Buffer.byteLength(raw) > 1024 * 1024) fail('提交内容过大', 413); } try { body = JSON.parse(raw || '{}'); } catch { fail('无效请求'); } }
  const [, , kind, id, action] = url.pathname.split('/');
  if (kind === 'rooms' && !id && req.method === 'POST') {
   if (Object.keys(db.rooms).length >= 10000) fail('活动数量已达上限', 503);
   const durationMinutes=body.durationMinutes ?? 5;
   if (![5,10,30].includes(durationMinutes)) fail('请选择 5、10 或 30 分钟有效期');
   const joinExpires=Date.now()+durationMinutes*60000;
   const id = token(), owner = token(); db.rooms[id] = { owner, participants: [], voters: [], open: true, joinExpires, expires: expires() }; save(); return send(201, {id, owner, joinExpires});
  }
  if (kind === 'rooms' && id) {
   const room = db.rooms[id]; if (!room || room.expires < Date.now()) fail('邀请已过期或不存在', 404);
   const registrationOpen=room.open && Date.now() < (room.joinExpires ?? room.expires);
   if (action === 'join' && req.method === 'POST') {
    if (!registrationOpen) fail('报名已结束', 409);
    let voter = /(?:^|; )luckydog-voter=([a-f0-9]{48})(?:;|$)/.exec(req.headers.cookie || '')?.[1];
    if (!voter) { voter = token(); res.setHeader('Set-Cookie', `luckydog-voter=${voter}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${req.socket.encrypted || req.headers['x-forwarded-proto'] === 'https' ? '; Secure' : ''}`); }
    if (room.voters.includes(voter)) fail('你已经参与过本次报名', 409);
    const username = name(body.name);
    if (room.participants.some(p => p.name === username)) fail('此用户名已参与，请使用其他用户名', 409);
    if (room.participants.length >= 5000) fail('参与人数已满');
    room.voters.push(voter); room.participants.push({ id: randomUUID(), name: username }); save(); return send(201, {ok:true});
   }
   const owner = req.headers.authorization === `Bearer ${room.owner}`;
   if (req.method === 'GET') return send(200, owner ? {participants:room.participants, open:registrationOpen, joinExpires:room.joinExpires} : {open:registrationOpen, joinExpires:room.joinExpires, count:room.participants.length});
   if (!owner) fail('无权管理此活动', 403);
   if (req.method === 'PATCH') { room.open = body.open === true && Date.now() < (room.joinExpires ?? room.expires); save(); return send(200, {participants:room.participants, open:room.open}); }
   if (req.method === 'DELETE') { delete db.rooms[id]; save(); return send(200, {ok:true}); }
  }
  if (kind === 'results' && !id && req.method === 'POST') {
   if (!Array.isArray(body.winners) || !body.winners.length || body.winners.length > 5000 || !Number.isFinite(body.timestamp)) fail('中奖名单无效');
   if (Object.keys(db.results).length >= 10000) fail('分享数量已达上限', 503);
   const winners = body.winners.map(p => ({id:randomUUID(), name:name(p.name)}));
   const id = token(); db.results[id] = {winners, timestamp:body.timestamp, expires:expires()}; save(); return send(201, {id});
  }
  if (kind === 'results' && id && req.method === 'GET') { const result=db.results[id]; if (!result || result.expires < Date.now()) fail('结果已过期或不存在',404); return send(200,result); }
  send(404,{error:'接口不存在'});
 } catch (error) { send(error.status || 500, {error:error.status ? error.message : '服务暂时不可用，请重试'}); }
});
server.listen(Number(process.env.PORT || 3001), process.env.HOST || '127.0.0.1', () => console.log('Luckydog sharing server ready'));
