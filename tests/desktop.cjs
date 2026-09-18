const { _electron: electron } = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
(async () => {
 const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'luckydog-test-'));
 const executablePath = process.env.LUCKYDOG_EXECUTABLE;
 const app = await electron.launch({ ...(executablePath ? { executablePath } : {}), args: [...(executablePath ? [] : ['.']), '--user-data-dir=' + profile] });
 try {
  const page = await app.firstWindow();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.waitForSelector('textarea');
  await page.evaluate(() => localStorage.clear()); await page.reload();
  assert.equal(await page.locator('textarea').count(), 1);
  await page.locator('textarea').fill('测试甲\n测试乙\n测试丙');
  await page.getByRole('button', {name: '批量导入'}).click();
  await page.locator('input[type=number]').fill('2');
  await page.getByRole('button', {name: '开始抽奖'}).click();
  assert.equal(await page.locator('textarea').isDisabled(), true);
  await page.getByRole('heading', {name: '中奖名单'}).waitFor();
  assert.equal(await page.locator('section .text-4xl').count(), 2);
  fs.mkdirSync('work', {recursive:true});
  await page.screenshot({path: 'work/desktop-result.png'});
  await page.reload();
  await page.getByText('名单库 (3)', {exact:true}).waitFor();
  page.once('dialog', d => d.accept());
  await page.getByRole('button', {name: '全部清空'}).click();
  await page.reload();
  await page.getByText('名单库 (0)', {exact:true}).waitFor();
  assert.equal(await page.getByRole('button', {name:'开始抽奖'}).isDisabled(), true);
  assert.deepEqual(errors, []);
  const security = await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].webContents.getLastWebPreferences());
  assert.equal(security.nodeIntegration, false); assert.equal(security.sandbox, true);
  console.log('PASS: desktop launch, import, draw lock, two unique winners, reload persistence, empty persistence, renderer errors, sandbox');
 } finally { await app.close(); fs.rmSync(profile, { recursive: true, force: true }); }
})().catch(e => { console.error(e); process.exit(1); });
