const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    windowControls: {
        close: () => ipcRenderer.send('window-controls:close'),
        minimize: () => ipcRenderer.send('window-controls:minimize'),
        maximize: () => ipcRenderer.send('window-controls:maximize'),
    }
});
