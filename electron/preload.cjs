const { contextBridge, ipcRenderer } = require('electron');

// Bridge para comunicação IPC segura
contextBridge.exposeInMainWorld('electronAPI', {
    // Autenticação Google via navegador do sistema
    // Retorna uma Promise que resolve com { success, idToken, accessToken }
    startGoogleLogin: () => ipcRenderer.invoke('start-google-login'),

    // App info
    getAppVersion: () => ipcRenderer.invoke('app:get-version'),

    // Auto-updater (events + commands)
    updater: {
        checkForUpdates: () => ipcRenderer.send('update:check'),
        downloadUpdate: () => ipcRenderer.send('update:download'),
        installUpdate: () => ipcRenderer.send('update:install'),

        onChecking: (callback) => ipcRenderer.on('update:checking', () => callback()),
        onUpdateAvailable: (callback) => ipcRenderer.on('update:available', (_, data) => callback(data)),
        onUpdateNotAvailable: (callback) => ipcRenderer.on('update:not-available', (_, data) => callback(data)),
        onUpdateProgress: (callback) => ipcRenderer.on('update:progress', (_, data) => callback(data)),
        onUpdateDownloaded: (callback) => ipcRenderer.on('update:downloaded', (_, data) => callback(data)),
        onUpdateError: (callback) => ipcRenderer.on('update:error', (_, data) => callback(data)),
    }
});
