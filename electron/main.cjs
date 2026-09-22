const { app, BrowserWindow, Menu, session, dialog, shell, ipcMain, net } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('node:path');
app.setName('Luckydog');
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
let window;
const productionSharingOrigin = 'https://luckydog-draw.jadey-owo.chatgpt.site';
const developmentSharingOrigin = process.env.LUCKYDOG_TEST_SHARE_ORIGIN;
const sharingOrigin = !app.isPackaged && /^http:\/\/127\.0\.0\.1:\d+$/.test(developmentSharingOrigin || '') ? developmentSharingOrigin : productionSharingOrigin;
const sharingPath = /^(rooms(?:\/[a-f0-9]{48})?|results(?:\/[a-f0-9]{48})?)$/;
const ownerToken = /^[a-f0-9]{48}$/;
ipcMain.handle('luckydog:sharing-request', async (_event, request) => {
  const { path: apiPath, method = 'GET', body, owner } = request || {};
  if (!sharingPath.test(apiPath || '') || !['GET', 'POST', 'PATCH', 'DELETE'].includes(method)) throw new Error('不支持的分享请求');
  if (owner !== undefined && !ownerToken.test(owner)) throw new Error('活动管理凭证无效');
  const serialized = body === undefined ? undefined : JSON.stringify(body);
  if (serialized && Buffer.byteLength(serialized) > 1024 * 1024) throw new Error('分享数据过大');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);
  try {
    const response = await net.fetch(`${sharingOrigin}/api/${apiPath}`, {
      method,
      headers: { ...(serialized ? { 'Content-Type': 'application/json' } : {}), ...(owner ? { Authorization: `Bearer ${owner}` } : {}) },
      body: serialized,
      signal: controller.signal,
    });
    if (!response.headers.get('content-type')?.includes('application/json')) throw new Error('在线邀请服务返回了无法识别的内容');
    return { ok: response.ok, status: response.status, value: await response.json() };
  } finally { clearTimeout(timeout); }
});
function configureAutoUpdates() {
  if (!app.isPackaged) return;
  let availableVersion = null;
  let fallbackShown = false;
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.on('update-available', info => { availableVersion = info.version; });
  autoUpdater.on('update-downloaded', async info => {
    const result = await dialog.showMessageBox(window, {
      type: 'info',
      title: 'Luckydog 已准备好更新',
      message: `新版本 ${info.version} 已下载完成`,
      detail: '现在重启即可完成更新，也可以稍后退出应用时自动安装。',
      buttons: ['立即重启更新', '稍后'],
      defaultId: 0,
      cancelId: 1,
    });
    if (result.response === 0) autoUpdater.quitAndInstall();
  });
  autoUpdater.on('error', async error => {
    console.warn('Automatic update check failed:', error.message);
    if (!availableVersion || fallbackShown || !window) return;
    fallbackShown = true;
    const result = await dialog.showMessageBox(window, {
      type: 'warning',
      title: '发现新版本',
      message: `Luckydog ${availableVersion} 已发布`,
      detail: '系统未能自动完成更新，你可以前往官方下载页重新安装。',
      buttons: ['打开下载页', '稍后'],
      defaultId: 0,
      cancelId: 1,
    });
    if (result.response === 0) void shell.openExternal('https://github.com/Jadey-ovo/luckydog/releases/latest');
  });
  setTimeout(() => void autoUpdater.checkForUpdatesAndNotify(), 6000);
  setInterval(() => void autoUpdater.checkForUpdatesAndNotify(), 4 * 60 * 60 * 1000);
}
function createWindow() {
  window = new BrowserWindow({ width: 1280, height: 900, minWidth: 1000, minHeight: 720, backgroundColor: '#efe9df', show: false, webPreferences: { preload: path.join(__dirname, 'preload.cjs'), nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true } });
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https://github.com/Jadey-ovo/luckydog')) void shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', event => event.preventDefault());
  window.once('ready-to-show', () => window.show());
  window.on('closed', () => { window = null; });
  window.loadFile(path.join(__dirname, '../dist/index.html'));
}
if (gotLock) {
  app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.focus(); } });
  app.whenReady().then(() => {
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] }, (details, callback) => callback({ cancel: !details.url.startsWith(`${sharingOrigin}/api/`) }));
    Menu.setApplicationMenu(Menu.buildFromTemplate([
      ...(process.platform === 'darwin' ? [{ label: 'Luckydog', submenu: [{ role: 'about' }, { type: 'separator' }, { role: 'quit' }] }] : []),
      { label: '编辑', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
      { label: '视图', submenu: [{ role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'togglefullscreen' }] }
    ]));
    createWindow();
    configureAutoUpdates();
    app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
  });
  app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
}
