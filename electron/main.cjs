const { app, BrowserWindow, Menu, session, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('node:path');
app.setName('Luckydog');
const gotLock = app.requestSingleInstanceLock();
if (!gotLock) app.quit();
let window;
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
  window = new BrowserWindow({ width: 1280, height: 900, minWidth: 1000, minHeight: 720, backgroundColor: '#efe9df', show: false, webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true } });
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
    session.defaultSession.webRequest.onBeforeRequest({ urls: ['http://*/*', 'https://*/*', 'ws://*/*', 'wss://*/*'] }, (_details, callback) => callback({ cancel: true }));
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
