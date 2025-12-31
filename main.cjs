const { app, BrowserWindow, ipcMain, screen } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

let mainWindow;
let overlayWindow;

function clampOverlayPosition(pos, winSize) {
    try {
        const displays = screen.getAllDisplays();
        const { width: w, height: h } = winSize || { width: 380, height: 600 };
        if (!pos || typeof pos.x !== 'number' || typeof pos.y !== 'number') return null;
        for (const d of displays) {
            const area = d.workArea;
            const minX = area.x;
            const minY = area.y;
            const maxX = area.x + area.width - w;
            const maxY = area.y + area.height - h;
            if (pos.x >= area.x - w && pos.x <= area.x + area.width && pos.y >= area.y - h && pos.y <= area.y + area.height) {
                return {
                    x: Math.max(minX, Math.min(pos.x, maxX)),
                    y: Math.max(minY, Math.min(pos.y, maxY)),
                };
            }
        }
        return null;
    } catch {
        return null;
    }
}

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

    mainWindow.on('closed', () => {
        mainWindow = null;
        if (overlayWindow) overlayWindow.close();
    });
}

function createOverlayWindow(initialPos = null) {
    if (overlayWindow) return;

    const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize;

    // New defaults for the 380x600 window
    const defaultX = screenWidth - 400;
    const defaultY = screenHeight - 620;

    const safePos = clampOverlayPosition(initialPos, { width: 380, height: 600 });

    overlayWindow = new BrowserWindow({
        width: 380, // Aumentado um pouco para dar folga ao badge
        height: 600, // Aumentado para acomodar stack de mensagens
        x: safePos ? safePos.x : initialPos ? initialPos.x : defaultX,
        y: safePos ? safePos.y : initialPos ? initialPos.y : defaultY,
        frame: false,
        transparent: true,
        alwaysOnTop: true,
        skipTaskbar: true,
        resizable: false,
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
        },
    });

    const startURL = isDev
        ? 'http://localhost:5173?mode=overlay'
        : `file://${path.join(__dirname, 'dist/index.html?mode=overlay')}`;

    overlayWindow.loadURL(startURL);
    overlayWindow.on('closed', () => (overlayWindow = null));
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

// Overlay Controls
ipcMain.on('overlay:toggle', (event, shouldOpen, initialPos) => {
    if (shouldOpen) {
        createOverlayWindow(initialPos);
    } else {
        if (overlayWindow) overlayWindow.close();
    }
});

// Broadcast notification to overlay
ipcMain.on('overlay:push-notification', (event, data) => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.webContents.send('overlay:on-notification', data);
    }
});

ipcMain.on('overlay:show-main', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.show();
        mainWindow.focus();
    }
});

ipcMain.on('overlay:set-ignore-mouse', (event, ignore, options) => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.setIgnoreMouseEvents(ignore, options);
    }
});

ipcMain.on('overlay:move', (event, { x, y }) => {
    if (overlayWindow && !overlayWindow.isDestroyed()) {
        overlayWindow.setPosition(Math.round(x), Math.round(y));
    }
});
