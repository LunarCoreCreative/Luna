const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');
const { spawn } = require('child_process');
const { LinkService } = require('./LinkService.cjs');

let mainWindow;
let pythonProcess = null;
let linkService = null;

// SaaS Mode: Only start Python locally in development
const USE_LOCAL_PYTHON = isDev;
const CLOUD_WS_URL = 'wss://luna.squareweb.app/ws/link'; // Luna Link tunnel

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
    // Inicia o servidor Python APENAS se estivermos em modo local
    startPythonServer();

    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: true,
        autoHideMenuBar: true,
        backgroundColor: '#0d1117', // Match Luna background
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            devTools: isDev,
        },
    });

    const startURL = isDev
        ? 'http://localhost:5173'
        : `file://${path.join(__dirname, 'dist/index.html')}`;

    mainWindow.loadURL(startURL);

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

// Luna Link IPC Handler
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

