const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('hub', { call: (action, payload) => ipcRenderer.invoke('hub', action, payload), onProgress: callback => { const listener = (_, value) => callback(value); ipcRenderer.on('progress', listener); return () => ipcRenderer.removeListener('progress', listener); } });
