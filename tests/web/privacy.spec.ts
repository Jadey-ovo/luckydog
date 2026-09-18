import { test, expect } from '@playwright/test';

test('default memory-only draw sends no requests and works offline', async ({page, context, baseURL}) => {
  const requests: string[] = [];
  const errors: string[] = [];
  page.on('request', request => requests.push(request.url()));
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('./');
  await expect(page.getByRole('button', {name:'开始抽奖'})).toBeVisible();
  await page.waitForLoadState('networkidle');
  expect(requests.every(url => url.startsWith(new URL(baseURL!).origin + '/'))).toBeTruthy();
  requests.length = 0;
  await context.setOffline(true);
  await page.getByLabel('参与名单').fill('演示甲\n演示乙\n演示丙');
  await page.getByRole('button', {name:'批量导入'}).click();
  await page.getByLabel('中奖名额').fill('2');
  await page.getByRole('button', {name:'开始抽奖'}).click();
  await expect(page.getByLabel('参与名单')).toBeDisabled();
  await expect(page.getByRole('heading', {name:'中奖名单'})).toBeVisible();
  const winners = await page.locator('section .text-4xl').allTextContents();
  expect(new Set(winners).size).toBe(2);
  expect(requests).toEqual([]);
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  expect(errors).toEqual([]);
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByText('名单库 (0)', {exact:true})).toBeVisible();
});

test('persistence is opt-in and can be removed', async ({page}) => {
  await page.goto('./');
  await page.getByLabel('参与名单').fill('演示甲\n演示乙');
  await page.getByRole('button', {name:'批量导入'}).click();
  await page.getByLabel('在此浏览器记住名单').check();
  await page.reload();
  await expect(page.getByText('名单库 (2)', {exact:true})).toBeVisible();
  await page.getByLabel('在此浏览器记住名单').uncheck();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
  await page.reload();
  await expect(page.getByText('名单库 (0)', {exact:true})).toBeVisible();
  await page.getByLabel('在此浏览器记住名单').check();
  await page.getByLabel('参与名单').fill('演示丙');
  await page.getByRole('button', {name:'批量导入'}).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', {name:'全部清空'}).click();
  await page.reload();
  await expect(page.getByText('名单库 (0)', {exact:true})).toBeVisible();
});
