import {test,expect} from '@playwright/test';

async function createInvite(page:any) {
 await page.goto('./');
 await page.getByRole('button',{name:'创建抽奖邀请'}).click();
 const link=page.getByLabel('分享链接');
 await expect(link).toBeVisible();
 return await link.inputValue();
}

test('invitation lifecycle keeps the visitor informed and supports redraw or clear',async({page,browser,request})=>{
 const url=await createInvite(page);
 const id=/#join=([a-f0-9]{48})$/.exec(url)![1];
 await expect(page.locator('.toast-info')).toContainText('报名截止倒计时');
 const guest=await browser.newContext();const guestPage=await guest.newPage();
 await guestPage.goto(url);
 await expect(guestPage.getByRole('timer')).toContainText('报名截止倒计时');
 await expect(guestPage.locator('.join-notes li')).toHaveCount(3);
 await guestPage.getByLabel('用户名').fill('扫码来客');
 await guestPage.getByRole('button',{name:'确认参与'}).click();
 await expect(guestPage.getByRole('heading',{name:'报名成功'})).toBeVisible();
 await request.post(`/api/rooms/${id}/join`,{headers:{Cookie:`luckydog-voter=${'2'.padStart(48,'0')}`},data:{name:'待移除用户'}});
 await expect(page.getByLabel('实时参与名单')).toContainText('扫码来客');
 await expect(page.getByLabel('实时参与名单')).toContainText('待移除用户');
 await page.getByRole('button',{name:'截止报名'}).click();
 await expect(page.getByRole('dialog')).toContainText('距离自动截止还有');
 await page.getByRole('button',{name:'继续报名'}).click();
 await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('button',{name:'截止报名'}).click();
 await page.getByRole('button',{name:'确认截止'}).click();
 await guestPage.reload();
 await expect(guestPage.getByRole('heading',{name:'报名已截止'})).toBeVisible();
 await expect(guestPage.getByText('扫码来客')).toBeVisible();
 await expect(guestPage.getByText(/等待发起人公布抽奖结果/)).toBeVisible();
 await expect(guestPage.getByLabel('用户名')).toHaveCount(0);
 await page.getByRole('button',{name:'移除 待移除用户'}).click();
 await expect(page.getByRole('dialog')).toContainText('移除后该用户不会参与');
 await page.getByRole('button',{name:'取消'}).click();
 await page.getByRole('button',{name:'移除 待移除用户'}).click();
 await page.getByRole('button',{name:'确认移除'}).click();
 await expect(page.getByText('待移除用户')).toHaveCount(0);
 await page.getByRole('button',{name:'继续报名'}).click();
 await expect(page.getByRole('button',{name:'截止报名'})).toBeVisible();
 await guestPage.reload();await expect(guestPage.getByRole('heading',{name:'报名成功'})).toBeVisible();
 await page.getByRole('button',{name:'截止报名'}).click();await page.getByRole('button',{name:'确认截止'}).click();
 await page.getByRole('button',{name:'确认名单',exact:true}).click();
 await expect(page.locator('.participant-card-name')).toHaveText('扫码来客');
 await expect(page.getByText('当前已参与 1 名用户')).toBeVisible();
 await expect(page.getByRole('button',{name:'开始抽奖'})).toBeEnabled();
 await page.getByRole('button',{name:'开始抽奖'}).click();
 await expect(page.getByRole('heading',{name:'幸运名单'})).toBeVisible();
 await page.screenshot({path:'test-results/same-link-result.png'});
 await expect(guestPage.getByRole('heading',{name:'幸运名单'})).toBeVisible({timeout:10000});
 expect(guestPage.url()).toBe(url);
 await page.getByRole('button',{name:'查看活动二维码'}).click();
 await expect(page.getByLabel('分享链接')).toHaveValue(url);
 await page.getByRole('button',{name:'关闭弹窗'}).click();
 await page.getByRole('button',{name:'继续抽奖'}).click();
 await expect(page.getByRole('dialog')).toContainText('可能与上一轮的中奖者重复');
 await page.getByRole('button',{name:'确认继续抽奖'}).click();
 await expect(page.getByRole('button',{name:'开始抽奖'})).toBeEnabled();
 await page.getByRole('button',{name:'开始抽奖'}).click();
 await expect(page.getByRole('heading',{name:'幸运名单'})).toBeVisible();
 await page.getByRole('button',{name:'清空返回'}).click();
 await expect(page.getByRole('dialog')).toContainText('原邀请二维码、邀请链接及参与者正在查看的结果页都会失效');
 await page.getByRole('button',{name:'确认清空并返回'}).click();
 await expect(page.getByRole('button',{name:'创建抽奖邀请'})).toBeVisible();
 await expect.poll(async()=>{await guestPage.reload();return await guestPage.getByRole('heading').first().textContent();},{timeout:10000}).toBe('该活动已失效');
 await guest.close();
});

test('copy reports success only in a toast',async({page,context})=>{
 await context.grantPermissions(['clipboard-read','clipboard-write']);
 await createInvite(page);
 await page.getByRole('button',{name:'复制链接'}).click();
 await expect(page.locator('.toast-success')).toHaveText(/邀请链接复制成功/);
 await expect(page.locator('.share-link small')).not.toContainText('已复制');
});

test('product manual is available from the top right',async({page})=>{
 await page.goto('./');
 await page.getByRole('button',{name:'查看产品手册'}).click();
 const dialog=page.getByRole('dialog');
 await expect(dialog.getByRole('heading',{name:'产品手册'})).toBeVisible();
 await expect(dialog.locator('li')).toHaveCount(3);
 await expect(dialog).toContainText('约 90 秒内失效');
 await dialog.getByRole('button',{name:'关闭产品手册'}).click();
 await expect(dialog).toHaveCount(0);
});

test('large live roster uses compact cards and keeps the draw action visible',async({page,request})=>{
 const url=await createInvite(page);const id=/#join=([a-f0-9]{48})$/.exec(url)![1];
 for(let i=1;i<=36;i++) await request.post(`/api/rooms/${id}/join`,{headers:{Cookie:`luckydog-voter=${i.toString(16).padStart(48,'0')}`},data:{name:`参与者${i}`}});
 await expect(page.getByLabel('实时参与名单').locator('> div')).toHaveCount(36,{timeout:10000});
 await page.getByRole('button',{name:'截止报名'}).click();await page.getByRole('button',{name:'确认截止'}).click();await page.getByRole('button',{name:'确认名单',exact:true}).click();
 await expect(page.locator('.participant-card')).toHaveCount(36);
 await expect(page.locator('.participant-card-grid')).toHaveClass(/dense/);
 await expect(page.getByRole('button',{name:'开始抽奖'})).toBeVisible();
 await page.screenshot({path:'test-results/live-roster-desktop.png'});
 await page.setViewportSize({width:390,height:844});
 await expect(page.getByRole('button',{name:'开始抽奖'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/live-roster-mobile.png',fullPage:true});
});

test('invite durations are validated and returned as actual deadlines',async({request})=>{
 for(const minutes of [5,10,30]){
  const before=Date.now();const response=await request.post('/api/rooms',{data:{durationMinutes:minutes}});expect(response.status()).toBe(201);const room=await response.json();expect(room.joinExpires-before).toBeGreaterThanOrEqual(minutes*60000);expect(room.joinExpires-before).toBeLessThan(minutes*60000+5000);
  await request.delete(`/api/rooms/${room.id}`,{headers:{Authorization:`Bearer ${room.owner}`},data:{}});
 }
 expect((await request.post('/api/rooms',{data:{durationMinutes:1}})).status()).toBe(400);
});

test('unavailable sharing uses a dismissible toast',async({page})=>{
 await page.goto('./');await page.route('**/api/rooms',route=>route.fulfill({status:200,contentType:'text/html',body:'static site'}));
 await page.getByRole('button',{name:'创建抽奖邀请'}).click();
 await expect(page.locator('.toast')).toContainText('此站点尚未启用在线分享服务');
 await page.getByRole('button',{name:'关闭提示'}).click();await expect(page.locator('.toast')).toHaveCount(0);
});

test('Worker serves API JSON and static assets',async({request})=>{
 const unknown=await request.get('/api/does-not-exist',{headers:{'Sec-Fetch-Mode':'navigate'}});
 expect(unknown.status()).toBe(404);expect(unknown.headers()['content-type']).toContain('application/json');expect(await unknown.json()).toEqual({error:'接口不存在'});
 const page=await request.get('/');expect(page.status()).toBe(200);expect(page.headers()['content-type']).toContain('text/html');
});

test('wide layout fills the viewport and closing the host invalidates its invitation',async({page,request})=>{
 await page.setViewportSize({width:1920,height:1080});const url=await createInvite(page);
 const workspace=await page.locator('.workspace').boundingBox();expect(workspace!.x).toBeLessThanOrEqual(1);expect(workspace!.width).toBeGreaterThanOrEqual(1919);
 const id=/#join=([a-f0-9]{48})$/.exec(url)![1];await page.close();
 await expect.poll(async()=>(await request.get(`/api/rooms/${id}`)).status(),{timeout:5000}).toBe(404);
});
