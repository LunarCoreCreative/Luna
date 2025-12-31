const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: true,
        autoHideMenuBar: true,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            devTools: isDev, // habilita DevTools apenas em dev
        },
    });

    const startURL = isDev
        ? 'http://localhost:5173'
        : `file://${path.join(__dirname, 'dist/index.html')}`;

    mainWindow.loadURL(startURL);

    // Toggle DevTools via F12 ou Ctrl+Shift+I quando necessário (sem abrir automaticamente)
    mainWindow.webContents.on('before-input-event', (event, input) => {
        const isToggleDevtools =
            input.key.toLowerCase() === 'f12' ||
            (input.key.toLowerCase() === 'i' && input.control && input.shift);
        if (isToggleDevtools) {
            if (mainWindow.webContents.isDevToolsOpened()) {
                mainWindow.webContents.closeDevTools();
            } else if (isDev) {
                mainWindow.webContents.openDevTools({ mode: 'detach' });
            }
            event.preventDefault();
        }
    });

    mainWindow.on('closed', () => (mainWindow = null));
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('activate', () => {
    if (mainWindow === null) {
        createWindow();
    }
});

// IPC Handlers para controle da janela
ipcMain.on('window-controls:close', () => {
    app.quit();
});

ipcMain.on('window-controls:minimize', () => {
    if (mainWindow) mainWindow.minimize();
});

ipcMain.on('window-controls:maximize', () => {
    if (mainWindow) {
        if (mainWindow.isMaximized()) {
            mainWindow.unmaximize();
        } else {
            mainWindow.maximize();
        }
    }
});
