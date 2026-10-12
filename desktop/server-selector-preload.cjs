const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('desktopServerSelector', {
  getOptions: () => ipcRenderer.invoke('desktop-server:get-options'),
  saveServer: (url) => ipcRenderer.invoke('desktop-server:save', url),
  close: () => ipcRenderer.send('desktop-server:close')
});
