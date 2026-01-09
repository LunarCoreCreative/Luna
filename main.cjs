const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
// const isDev = require('electron-is-dev'); 
const { spawn } = require('child_process');
const { LinkService } = require('./LinkService.cjs');
const { setupAutoUpdater } = require('./updater.cjs');

let mainWindow;
let pythonProcess = null;
let linkService = null;
let serverProcess = null; // Express server instance

// Determine if we are in development mode reliably
const isDev = !app.isPackaged;

// SaaS Mode: Only start Python locally in development
const USE_LOCAL_PYTHON = isDev;
const CLOUD_WS_URL = 'wss://luna-production-94f2.up.railway.app/ws/link'; // Luna Link tunnel

// Start local web server for production to support Firebase Auth (needs localhost)
function startLocalWebServer() {
    if (isDev) return; // Vite handles dev

    console.log('[ELECTRON] Starting local Express server for production...');
    const express = require('express');
    const appServer = express();
    const PORT = 4173;

    // Serve static files
    appServer.use(express.static(path.join(__dirname, 'dist')));

    // SPA Fallback (using app.use for catch-all to avoid Express 5 regex issues)
    appServer.use((req, res) => {
        res.sendFile(path.join(__dirname, 'dist/index.html'));
    });

    serverProcess = appServer.listen(PORT, () => {
        console.log(`[ELECTRON] Local server running on http://localhost:${PORT}`);
    });
}

function startPythonServer() {
    if (!USE_LOCAL_PYTHON) {
        console.log('[ELECTRON] SaaS Mode: Skipping local Python server (using cloud).');
        return;
    }

    console.log('[ELECTRON] Dev Mode: Iniciando servidor Python local...');

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';

    pythonProcess = spawn(pythonCmd, ['-m', 'server.main'], {
        cwd: __dirname,
        env: { ...process.env, PYTHONUNBUFFERED: '1' }
    });

    pythonProcess.stdout.on('data', (data) => {
        console.log(`[PYTHON] ${data}`);
    });

    pythonProcess.stderr.on('data', (data) => {
        console.error(`[PYTHON-ERR] ${data}`);
    });

    pythonProcess.on('close', (code) => {
        console.log(`[ELECTRON] Servidor Python encerrado com código ${code}`);
    });
}

function createWindow() {
    // Start services
    startPythonServer();
    startLocalWebServer();

    // Calculate preload path: 
    // - In dev: same folder as main.cjs
    // - In production: extraResources copies preload.cjs to resources folder
    const preloadPath = isDev
        ? path.join(__dirname, 'preload.cjs')
        : path.join(process.resourcesPath, 'preload.cjs');

    console.log('[ELECTRON] Preload path:', preloadPath);
    console.log('[ELECTRON] isDev:', isDev);
    console.log('[ELECTRON] resourcesPath:', process.resourcesPath);

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: true,
        autoHideMenuBar: true,
        backgroundColor: '#0d1117', // Match Luna background
        webPreferences: {
            preload: preloadPath,
            nodeIntegration: false,
            contextIsolation: true,
            devTools: true, // Enable for debugging preload issues
        },
    });

    const startURL = isDev
        ? 'http://localhost:5173'
        : 'http://localhost:4173'; // Use local express server

    mainWindow.loadURL(startURL);

    // Initialize auto-updater in production
    if (!isDev) {
        mainWindow.webContents.on('did-finish-load', () => {
            setupAutoUpdater(mainWindow);
        });
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.on('ready', createWindow);

app.on('window-all-closed', () => {
    // Matar o processo Python ao fechar todas as janelas
    if (pythonProcess) {
        pythonProcess.kill();
        pythonProcess = null;
    }
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', () => {
    if (pythonProcess) {
        pythonProcess.kill();
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

// Luna Link IPC Handlers
ipcMain.on('luna-link:connect', (event, token) => {
    if (!USE_LOCAL_PYTHON) {
        // Only connect to cloud in production mode
        if (!linkService) {
            linkService = new LinkService();
        }
        linkService.connect(CLOUD_WS_URL, token);
        console.log('[ELECTRON] Luna Link connection initiated.');
    }
});

ipcMain.on('luna-link:disconnect', () => {
    if (linkService) {
        linkService.disconnect();
        console.log('[ELECTRON] Luna Link disconnected.');
    }
});

// Luna Link: Folder Picker (invoked from renderer)
ipcMain.handle('luna-link:pick-folder', async () => {
    const { dialog } = require('electron');
    const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory'],
        title: 'Selecione a pasta do projeto'
    });

    if (result.canceled || !result.filePaths.length) {
        return { success: false, error: 'Nenhuma pasta selecionada' };
    }

    return { success: true, path: result.filePaths[0] };
});

// Luna Link: Status check
ipcMain.handle('luna-link:status', () => {
    return linkService ? linkService.connected : false;
});
