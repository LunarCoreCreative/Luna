const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electron', {
    overlay: {
        toggle: (shouldOpen, initialPos) => ipcRenderer.send('overlay:toggle', shouldOpen, initialPos),
        showMain: () => ipcRenderer.send('overlay:show-main'),
        pushNotification: (data) => ipcRenderer.send('overlay:push-notification', data),
        onNotification: (callback) => ipcRenderer.on('overlay:on-notification', (event, data) => callback(data)),
        setIgnoreMouse: (ignore, options) => ipcRenderer.send('overlay:set-ignore-mouse', ignore, options),
        move: (pos) => ipcRenderer.send('overlay:move', pos),
    },
    windowControls: {
        close: () => ipcRenderer.send('window-controls:close'),
        minimize: () => ipcRenderer.send('window-controls:minimize'),
        maximize: () => ipcRenderer.send('window-controls:maximize'),
    },
    // Luna Link: Bridge between cloud and local filesystem
    lunaLink: {
        connect: (token) => ipcRenderer.send('luna-link:connect', token),
        disconnect: () => ipcRenderer.send('luna-link:disconnect'),
        pickFolder: () => ipcRenderer.invoke('luna-link:pick-folder'),
        isConnected: () => ipcRenderer.invoke('luna-link:status'),
    },
    // Auto-Updater
    updater: {
        checkForUpdates: () => ipcRenderer.send('update:check'),
        downloadUpdate: () => ipcRenderer.send('update:download'),
        installUpdate: () => ipcRenderer.send('update:install'),
        onUpdateAvailable: (callback) => ipcRenderer.on('update:available', (_, data) => callback(data)),
        onUpdateProgress: (callback) => ipcRenderer.on('update:progress', (_, data) => callback(data)),
        onUpdateDownloaded: (callback) => ipcRenderer.on('update:downloaded', (_, data) => callback(data)),
        onUpdateError: (callback) => ipcRenderer.on('update:error', (_, data) => callback(data)),
    },
    // Fix para inputs que param de funcionar
    inputFix: {
        forceFocus: () => ipcRenderer.send('force-input-focus'),
    }
});
