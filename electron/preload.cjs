const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('luckydogDesktop', {
  request: request => ipcRenderer.invoke('luckydog:sharing-request', request),
});
