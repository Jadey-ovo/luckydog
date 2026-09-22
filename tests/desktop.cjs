const { _electron: electron } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const http = require('node:http');

(async () => {
 const id = 'a'.repeat(48), owner = 'b'.repeat(48);
 const participants = [{id:'p1',name:'测试甲'},{id:'p2',name:'测试乙'},{id:'p3',name:'测试丙'}];
 let open = true, result = null, archived = false;
 const requests = [];
 const server = http.createServer(async (request,response) => {
  const chunks=[]; for await (const chunk of request) chunks.push(chunk);
  const body=chunks.length?JSON.parse(Buffer.concat(chunks).toString()):{};
  requests.push({url:request.url,method:request.method,body,authorization:request.headers.authorization});
  let status=200, value;
  if(request.url==='/api/rooms'&&request.method==='POST') { status=201; value={id,owner,joinExpires:Date.now()+300000,expires:Date.now()+86400000}; }
  else if(request.url===`/api/rooms/${id}`&&request.headers.authorization===`Bearer ${owner}`) {
   if(request.method==='GET') value={participants,open,joinExpires:Date.now()+300000,expires:Date.now()+86400000,state:archived?'ended':result?'drawn':open?'open':'closed',...(result?{result}: {})};
   else if(body.removeParticipantId) { const index=participants.findIndex(item=>item.id===body.removeParticipantId); if(index>=0)participants.splice(index,1); value={participants,open}; }
   else if(body.result) { result=body.result;open=false;value={participants,open,result}; }
   else if(body.archive) { archived=true;open=false;value={ok:true}; }
   else { open=body.open===true;value={participants,open}; }
  } else { status=404;value={error:'接口不存在'}; }
  response.writeHead(status,{'Content-Type':'application/json'});response.end(JSON.stringify(value));
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const origin=`http://127.0.0.1:${server.address().port}`;
 const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'luckydog-test-'));
 const executablePath = process.env.LUCKYDOG_EXECUTABLE;
 const app = await electron.launch({ ...(executablePath ? { executablePath } : {}), args: [...(executablePath ? [] : ['.']), '--user-data-dir=' + profile], env:{...process.env,LUCKYDOG_TEST_SHARE_ORIGIN:origin} });
 try {
  const page = await app.firstWindow();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  assert.equal(await page.evaluate(()=>typeof window.luckydogDesktop?.request),'function');
  await page.getByRole('button',{name:'创建抽奖邀请'}).click();
  await page.getByText('报名进行中').waitFor({timeout:5000}).catch(async error=>{console.error(await page.locator('body').innerText());throw error;});
  assert.equal(await page.locator('img[alt="扫描二维码打开分享链接"]').count(),1);
  await page.getByRole('button',{name:'截止报名'}).click();
  await page.getByRole('button',{name:'确认截止'}).click();
  await page.getByRole('button',{name:'确认名单',exact:true}).click();
  await page.locator('input[type=number]').fill('2');
  await page.getByRole('button', {name: '开始抽奖'}).click();
  await page.getByRole('heading', {name: '幸运名单'}).waitFor();
  assert.equal(await page.locator('.winner-card strong').count(), 2);
  await page.getByRole('button',{name:'查看活动二维码'}).click();
  await page.getByRole('dialog').getByText(/24 小时内有效/).waitFor();
  assert.ok(requests.some(item=>item.method==='POST'&&item.url==='/api/rooms'));
  assert.ok(requests.some(item=>item.method==='PATCH'&&item.body.result&&item.authorization===`Bearer ${owner}`));
  assert.deepEqual(errors, []);
  const security = await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences());
  assert.equal(security.nodeIntegration, false); assert.equal(security.contextIsolation, true); assert.equal(security.sandbox, true);
  console.log('PASS: desktop creates an online invitation through the restricted bridge, receives participants, draws, and publishes results');
 } finally { await app.close(); await new Promise(resolve=>server.close(resolve)); fs.rmSync(profile, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exit(1); });
