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
 await expect(page.getByRole('button',{name:'返回',exact:true})).toBeDisabled();
 await expect(page.locator('.toast')).toHaveCount(0,{timeout:10000});
 await page.screenshot({path:'docs/preview.png',animations:'disabled'});
 await expect(guestPage.getByRole('heading',{name:'恭喜你中奖啦'})).toBeVisible({timeout:10000});
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
 await expect(dialog).toContainText('24 小时');
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

test('wide layout fills the viewport and closing the host preserves its invitation',async({page,request})=>{
 await page.setViewportSize({width:1920,height:1080});const url=await createInvite(page);
 const workspace=await page.locator('.workspace').boundingBox();expect(workspace!.x).toBeLessThanOrEqual(1);expect(workspace!.width).toBeGreaterThanOrEqual(1919);
 const id=/#join=([a-f0-9]{48})$/.exec(url)![1];await page.close();
 await expect.poll(async()=>(await request.get(`/api/rooms/${id}`)).status(),{timeout:5000}).toBe(200);
});


test('slow first request never flashes a closed state; recoverable errors and mobile layout',async({page})=>{
 const id='a'.repeat(48);let release!:()=>void;
 const gate=new Promise<void>(resolve=>{release=resolve;});
 await page.route('**/api/rooms/*',async route=>{await gate;await route.fulfill({json:{state:'open',open:true,joinExpires:Date.now()+60000,expires:Date.now()+86400000}});});
 await page.setViewportSize({width:390,height:844});await page.goto(`./#join=${id}`);
 await expect(page.getByRole('heading',{name:'正在加载活动…'})).toBeVisible();
 await expect(page.getByText(/报名已截止|活动已结束|该活动已失效/)).toHaveCount(0);
 release();await expect(page.getByRole('heading',{name:'加入这场好运'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.unroute('**/api/rooms/*');
 await page.route('**/api/rooms/*',route=>route.fulfill({status:503,json:{error:'temporarily unavailable'}}));
 await expect(page.getByRole('heading',{name:'暂时无法读取活动'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'该活动已失效'})).toHaveCount(0);
 await page.unroute('**/api/rooms/*');
 await page.route('**/api/rooms/*',route=>route.fulfill({status:404,json:{error:'gone'}}));
 await page.getByRole('button',{name:'重试',exact:true}).click();
 await expect(page.getByRole('heading',{name:'该活动已失效'})).toBeVisible();
});

test('personal result changes, refresh and host close preserve results without disclosing others',async({page,browser,request})=>{
 const created=page.waitForResponse(response=>response.url().endsWith('/api/rooms')&&response.request().method()==='POST');
 await createInvite(page);const room=await (await created).json();
 const path=`/api/rooms/${room.id}`;const auth={Authorization:`Bearer ${room.owner}`};
 const guest=await browser.newContext();const visitor=await guest.newPage();
 await visitor.goto(`./#join=${room.id}`);
 await visitor.getByLabel('用户名').fill('演示小鹿');await visitor.getByRole('button',{name:'确认参与'}).click();
 await expect(visitor.getByRole('heading',{name:'报名成功'})).toBeVisible();
 await request.post(`${path}/join`,{data:{name:'演示小熊'}});
 const roster=(await (await request.get(path,{headers:auth})).json()).participants;
 const publish=async(name:string)=>{expect((await request.patch(path,{headers:auth,data:{result:{winners:roster.filter((p:any)=>p.name===name),timestamp:Date.now()}}})).ok()).toBe(true);};
 await publish('演示小熊');await expect(visitor.getByRole('heading',{name:'本次未中奖'})).toBeVisible();
 await expect(visitor.getByText('演示小熊')).toHaveCount(0);
 await publish('演示小鹿');await expect(visitor.getByRole('heading',{name:'恭喜你中奖啦'})).toBeVisible();
 await visitor.reload();await expect(visitor.getByRole('heading',{name:'恭喜你中奖啦'})).toBeVisible();
 await page.reload();await expect(page.getByRole('button',{name:'创建抽奖邀请'})).toBeVisible();
 await visitor.reload();await expect(visitor.getByRole('heading',{name:'恭喜你中奖啦'})).toBeVisible();
 await page.goto(`./#join=${room.id}`);await expect(page.getByRole('heading',{name:'活动已结束'})).toBeVisible();
 await expect(page.getByText(/演示小鹿|演示小熊/)).toHaveCount(0);
 await page.close();await visitor.reload();await expect(visitor.getByRole('heading',{name:'恭喜你中奖啦'})).toBeVisible();
 await visitor.setViewportSize({width:390,height:844});
 expect(await visitor.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await visitor.screenshot({path:'docs/participant-result.png',fullPage:true});
 await guest.close();
});

test('natural deadline, removal, interrupted and 24 hour expiry states',async({page})=>{
 const id='b'.repeat(48);let state:any={state:'open',open:true,joinExpires:Date.now()+1500,expires:Date.now()+86400000,participant:{name:'演示小狐'}};
 await page.route('**/api/rooms/*',route=>route.fulfill({json:state}));
 await page.goto(`./#join=${id}`);
 await expect(page.getByRole('heading',{name:'报名成功'})).toBeVisible();
 await expect(page.getByRole('heading',{name:'报名已截止'})).toBeVisible();
 state={...state,state:'closed',open:false,participant:undefined};
 await expect(page.getByText('演示小狐')).toHaveCount(0);
 state={...state,state:'interrupted'};await expect(page.getByRole('heading',{name:'活动已中断'})).toBeVisible();
 state={...state,expires:Date.now()-1};await expect(page.getByRole('heading',{name:'该活动已失效'})).toBeVisible();
});


test('failed result sync retries the same draw and clear failure keeps the activity',async({page,request})=>{
 const url=await createInvite(page);const id=/#join=([a-f0-9]{48})$/.exec(url)![1];
 await request.post(`/api/rooms/${id}/join`,{data:{name:'重试演示'}});
 await page.getByRole('button',{name:'截止报名'}).click();await page.getByRole('button',{name:'确认截止'}).click();await page.getByRole('button',{name:'确认名单',exact:true}).click();
 let failSync=true;let failClear=true;
 await page.route(`**/api/rooms/${id}`,async route=>{
  if(route.request().method()==='PATCH'&&route.request().postDataJSON()?.result&&failSync)return route.fulfill({status:503,json:{error:'同步暂时失败'}});
  if(route.request().method()==='DELETE'&&failClear)return route.fulfill({status:503,json:{error:'清空暂时失败'}});
  return route.continue();
 });
 await page.getByRole('button',{name:'开始抽奖'}).click();await expect(page.getByRole('button',{name:'重试同步开奖结果'})).toBeVisible();
 await expect(page.getByRole('button',{name:'继续抽奖',exact:true})).toBeDisabled();
 failSync=false;await page.getByRole('button',{name:'重试同步开奖结果'}).click();
 await expect(page.getByRole('button',{name:'继续抽奖',exact:true})).toBeEnabled();
 expect((await (await request.get(`/api/rooms/${id}`)).json()).state).toBe('drawn');
 await page.getByRole('button',{name:'清空返回'}).click();await page.getByRole('button',{name:'确认清空并返回'}).click();
 await expect(page.getByRole('dialog')).toBeVisible();expect((await request.get(`/api/rooms/${id}`)).status()).toBe(200);
 failClear=false;await page.getByRole('button',{name:'确认清空并返回'}).click();
 await expect(page.getByRole('button',{name:'创建抽奖邀请'})).toBeVisible();expect((await request.get(`/api/rooms/${id}`)).status()).toBe(404);
});


test('interrupted host cannot start a draw and can still clear',async({page,request})=>{
 const url=await createInvite(page);const id=/#join=([a-f0-9]{48})$/.exec(url)![1];
 await request.post(`/api/rooms/${id}/join`,{data:{name:'中断演示'}});
 await page.getByRole('button',{name:'截止报名'}).click();await page.getByRole('button',{name:'确认截止'}).click();await page.getByRole('button',{name:'确认名单',exact:true}).click();
 await page.route(`**/api/rooms/${id}`,async route=>{
  if(route.request().method()!=='GET')return route.continue();
  const response=await route.fetch();const body=await response.json();await route.fulfill({json:{...body,state:'interrupted',open:false}});
 });
 await expect(page.getByRole('alert')).toContainText('活动已中断或过期');
 await expect(page.getByRole('button',{name:'开始抽奖'})).toBeDisabled();
 await page.getByRole('button',{name:'清空本次活动',exact:true}).click();await page.getByRole('button',{name:'确认清空并返回'}).click();
 await expect(page.getByRole('button',{name:'创建抽奖邀请'})).toBeVisible();
});
