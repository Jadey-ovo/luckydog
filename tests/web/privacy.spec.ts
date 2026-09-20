import {test,expect} from '@playwright/test';
async function configure(page:any,names='春风\n明月\n山海',count='3') {
 await page.getByLabel('参与名单').fill(names);
 await page.getByRole('button',{name:'确认名单',exact:true}).click();
 await expect(page.getByLabel('参与名单')).toHaveCount(0);
 await expect(page.getByRole('spinbutton',{name:'中奖名额'})).toHaveCount(0);
 await page.getByRole('button',{name:'确认名单',exact:true}).click();
 await page.getByRole('spinbutton',{name:'中奖名额'}).fill(count);
}
test('local three-step draw is offline and memory only',async({page,context})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('./');await page.waitForLoadState('networkidle');await context.setOffline(true);
 const requests:string[]=[];page.on('request',r=>requests.push(r.url()));
 await configure(page);await page.getByRole('button',{name:'开始抽奖'}).click();
 await expect(page.getByRole('heading',{name:'幸运名单'})).toBeVisible();
 expect(new Set(await page.locator('.winner-card strong').allTextContents()).size).toBe(3);
 await expect(page.getByRole('button',{name:'收起结果'})).toHaveCount(0);
 await page.locator('.result-actions').getByRole('button',{name:'返回',exact:true}).click();
 await expect(page.getByRole('button',{name:'开始抽奖'})).toBeVisible();
 expect(requests).toEqual([]);expect(errors).toEqual([]);
 expect(await page.evaluate(()=>localStorage.length)).toBe(0);
 await context.setOffline(false);await page.reload();await expect(page.getByLabel('参与名单')).toBeVisible();await expect(page.getByRole('button',{name:'开始抽奖'})).toBeDisabled();
});
test('back allows preserving or clearing names',async({page})=>{
 await page.goto('./');await configure(page);
 await page.getByRole('button',{name:'返回',exact:true}).click();await page.getByRole('button',{name:'返回',exact:true}).click();
 await page.getByRole('button',{name:'保留并返回'}).click();
 await page.getByLabel('参与名单').fill('星河');await page.getByRole('button',{name:'确认名单',exact:true}).click();
 await expect(page.locator('tbody tr')).toHaveCount(4);
 await page.getByRole('button',{name:'返回',exact:true}).click();await page.getByRole('button',{name:'清空并返回'}).click();
 await expect(page.getByLabel('参与名单')).toBeVisible();await expect(page.getByRole('button',{name:'确认名单',exact:true})).toBeDisabled();
});
test('xlsx import preserves whole usernames',async({page})=>{
 const {default:ExcelJS}=await import('exceljs');const wb=new ExcelJS.Workbook();const sheet=wb.addWorksheet('名单');sheet.addRows([['用户名'],['张 小满'],['阿青']]);
 await page.goto('./');await page.getByRole('tab',{name:'名单导入'}).click();
 await page.getByLabel('导入 Excel 名单').setInputFiles({name:'名单.xlsx',mimeType:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',buffer:Buffer.from(await wb.xlsx.writeBuffer())});
 await expect(page.getByText('名单.xlsx · 2 人')).toBeVisible();await page.getByRole('button',{name:'确认名单',exact:true}).click();await expect(page.locator('tbody tr')).toHaveCount(2);await expect(page.getByRole('cell',{name:'张 小满',exact:true})).toBeVisible();
});
test('real invitation, duplicate prevention, closed registration and shared results',async({page,browser})=>{
 await page.goto('./');await page.getByRole('tab',{name:'分享邀请'}).click();await page.getByRole('button',{name:'创建抽奖邀请'}).click();
 const link=page.getByLabel('分享链接');await expect(link).toBeVisible();const url=await link.inputValue();
 const guest=await browser.newContext();const guestPage=await guest.newPage();await guestPage.goto(url);await guestPage.getByLabel('用户名').fill('扫码来客');await guestPage.getByRole('button',{name:'确认参与'}).click();await expect(guestPage.getByRole('heading',{name:'报名成功'})).toBeVisible();
 await guestPage.reload();await guestPage.getByLabel('用户名').fill('再次报名');await guestPage.getByRole('button',{name:'确认参与'}).click();await expect(guestPage.getByRole('alert')).toHaveText('你已经参与过本次报名');
 await expect(page.getByRole('button',{name:'结束报名并确认名单'})).toBeEnabled();await page.getByRole('button',{name:'结束报名并确认名单'}).click();
 await guestPage.reload();await expect(guestPage.getByText('本次报名已结束')).toBeVisible();
 await page.getByRole('button',{name:'确认名单',exact:true}).click();await page.getByRole('button',{name:'开始抽奖'}).click();await expect(page.getByRole('heading',{name:'幸运名单'})).toBeVisible();
 await page.getByRole('button',{name:'分享抽奖结果'}).click();await page.getByRole('button',{name:'生成分享链接'}).click();await expect(link).toBeVisible();await guestPage.goto(await link.inputValue());await expect(guestPage.locator('.winner-card strong')).toHaveText('扫码来客');await guest.close();
});
test('large result list scrolls without hiding first or last winner',async({page})=>{
 await page.goto('./');await configure(page,Array.from({length:100},(_,i)=>`用户${i+1}`).join('\n'),'100');await page.getByRole('button',{name:'开始抽奖'}).click();await expect(page.locator('.winner-card')).toHaveCount(100);
 const grid=page.locator('.winner-grid');expect(await grid.evaluate(el=>el.scrollHeight>el.clientHeight)).toBe(true);await page.locator('.winner-card').last().scrollIntoViewIfNeeded();await expect(page.locator('.winner-card').last()).toBeVisible();
 await page.screenshot({path:'test-results/results-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/results-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('switching methods discards data only after confirmation and row deletion works',async({page})=>{
 await page.goto('./');await page.getByLabel('参与名单').fill('张三\n李四');
 await page.getByRole('tab',{name:'名单导入'}).click();await expect(page.getByRole('dialog')).toBeVisible();
 await page.getByRole('button',{name:'关闭弹窗'}).click();await expect(page.getByLabel('参与名单')).toHaveValue('张三\n李四');
 await page.getByRole('button',{name:'确认名单',exact:true}).click();await page.getByRole('button',{name:'删除 张三'}).click();await expect(page.locator('tbody tr')).toHaveCount(1);
 await page.getByRole('button',{name:'返回',exact:true}).click();await page.getByRole('button',{name:'保留并返回'}).click();await expect(page.getByRole('button',{name:'确认名单',exact:true})).toBeEnabled();
 await page.getByRole('tab',{name:'名单导入'}).click();await page.getByRole('button',{name:'清空并切换'}).click();await expect(page.getByRole('button',{name:'确认名单',exact:true})).toBeDisabled();
 await page.getByRole('tab',{name:'名单输入'}).click();await expect(page.getByLabel('参与名单')).toBeEmpty();await expect(page.getByRole('button',{name:'确认名单',exact:true})).toBeDisabled();
});
test('unavailable sharing uses a toast and setup layout stays anchored',async({page})=>{
 await page.goto('./');await page.route('**/api/rooms',route=>route.fulfill({status:200,contentType:'text/html',body:'static site'}));
 const input=await page.getByLabel('参与名单').boundingBox();expect(input!.height).toBeGreaterThan(300);
 const before=await page.getByRole('button',{name:'确认名单',exact:true}).boundingBox();
 await page.getByRole('tab',{name:'分享邀请'}).click();const after=await page.getByRole('button',{name:'创建抽奖邀请'}).boundingBox();expect(Math.abs(before!.y-after!.y)).toBeLessThan(2);
 await page.getByRole('button',{name:'创建抽奖邀请'}).click();await expect(page.locator('.toast')).toContainText('此站点尚未启用在线分享服务');
 await page.getByRole('button',{name:'关闭提示'}).click();await expect(page.locator('.toast')).toHaveCount(0);
 await page.getByRole('tab',{name:'名单输入'}).click();await page.screenshot({path:'test-results/setup-desktop.png'});
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'test-results/setup-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('invite durations are validated and returned as actual deadlines',async({request})=>{
 for(const minutes of [5,10,30]){
  const before=Date.now();const response=await request.post('/api/rooms',{data:{durationMinutes:minutes}});expect(response.status()).toBe(201);const room=await response.json();expect(room.joinExpires-before).toBeGreaterThanOrEqual(minutes*60000);expect(room.joinExpires-before).toBeLessThan(minutes*60000+5000);
  const publicRoom=await (await request.get(`/api/rooms/${room.id}`)).json();expect(publicRoom.joinExpires).toBe(room.joinExpires);
  await request.delete(`/api/rooms/${room.id}`,{headers:{Authorization:`Bearer ${room.owner}`},data:{}});
 }
 expect((await request.post('/api/rooms',{data:{durationMinutes:1}})).status()).toBe(400);
});
test('progress, auto-dismiss delete toast, SVG back and close controls',async({page})=>{
 await page.goto('./');await expect(page.locator('.flow-step[aria-current=step]')).toContainText('添加名单');
 await page.getByLabel('参与名单').fill('张三 李四');await page.getByRole('button',{name:'确认名单',exact:true}).click();
 await expect(page.locator('.back-button svg')).toHaveCount(1);await page.getByRole('button',{name:'删除 张三'}).click();await expect(page.locator('.toast-success')).toContainText('删除成功');await expect(page.locator('.toast-success .toast-status-icon')).toBeVisible();await expect(page.locator('.toast-success').getByRole('button',{name:'关闭提示'})).toHaveCount(0);
 const cell=await page.locator('td.remove-column').boundingBox();const button=await page.getByRole('button',{name:'删除 李四'}).boundingBox();expect(Math.abs(cell!.x+cell!.width-button!.x-button!.width-8)).toBeLessThan(2);
 await page.getByRole('button',{name:'确认名单',exact:true}).click();await expect(page.locator('.setting-label')).toContainText('不超过参与人数');await page.getByRole('button',{name:'开始抽奖'}).click();await page.getByRole('button',{name:'分享抽奖结果'}).click();await expect(page.getByRole('dialog').getByRole('button',{name:'关闭',exact:true})).toHaveCount(0);await page.getByRole('button',{name:'关闭弹窗'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
});
test('Worker serves API JSON even for browser navigation and static assets remain available',async({request})=>{
 const unknown=await request.get('/api/does-not-exist',{headers:{'Sec-Fetch-Mode':'navigate'}});
 expect(unknown.status()).toBe(404);expect(unknown.headers()['content-type']).toContain('application/json');expect(await unknown.json()).toEqual({error:'接口不存在'});
 const page=await request.get('/');expect(page.status()).toBe(200);expect(page.headers()['content-type']).toContain('text/html');
 const template=await request.get('/participants-template.xlsx');expect(template.status()).toBe(200);expect((await template.body()).subarray(0,2).toString()).toBe('PK');
});
