/**
 * Luna Auto-Updater Module (Current)
 * Uses electron-updater for automatic updates via GitHub Releases (electron-builder publish config)
 */

const { autoUpdater } = require('electron-updater');
const { ipcMain, app } = require('electron');

let mainWindow = null;

// Configure updater
autoUpdater.autoDownload = false; // User-controlled download
autoUpdater.autoInstallOnAppQuit = true;
autoUpdater.channel = 'latest';
autoUpdater.allowPrerelease = true; // Permitir detectar pre-releases (beta, alpha, etc)

// Configurar provider do GitHub explicitamente
// O electron-updater usa a configuração do package.json, mas podemos forçar aqui também
if (app.isPackaged) {
    // Em produção, garantir que está usando GitHub provider
    const { GitHubProvider } = require('electron-updater/out/providers/GitHubProvider');
    // A configuração vem do package.json build.publish
}

// Basic logger (avoid requiring electron-log)
autoUpdater.logger = {
    info: (message) => console.log('[UPDATER]', message),
    warn: (message) => console.warn('[UPDATER]', message),
    error: (message) => console.error('[UPDATER]', message),
};

function sendToRenderer(channel, data = {}) {
    if (mainWindow && mainWindow.webContents && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send(channel, data);
    }
}

function setupAutoUpdater(window) {
    mainWindow = window;

    const currentVersion = typeof app.getVersion === 'function' ? app.getVersion() : '0.0.0';

    console.log('[UPDATER] Initializing auto-updater...');
    console.log('[UPDATER] Current version:', currentVersion);
    console.log('[UPDATER] Provider:', autoUpdater.provider?.constructor?.name || 'default');
    console.log('[UPDATER] Allow prerelease:', autoUpdater.allowPrerelease);
    console.log('[UPDATER] Channel:', autoUpdater.channel);
    
    // Log da configuração do provider se disponível
    if (autoUpdater.provider) {
        console.log('[UPDATER] Provider config:', {
            owner: autoUpdater.provider?.owner || 'N/A',
            repo: autoUpdater.provider?.repo || 'N/A',
            channel: autoUpdater.provider?.channel || 'N/A'
        });
    }

    // Check for updates shortly after UI is ready
    setTimeout(() => {
        console.log('[UPDATER] Checking for updates...');
        autoUpdater.checkForUpdates().catch((err) => {
            console.error('[UPDATER] Check failed:', err.message);
            console.error('[UPDATER] Error details:', err);
        });
    }, 3000);

    // Update events -> renderer
    autoUpdater.on('checking-for-update', () => {
        sendToRenderer('update:checking');
    });

    autoUpdater.on('update-available', (info) => {
        sendToRenderer('update:available', {
            version: info.version,
            releaseDate: info.releaseDate,
            releaseNotes: info.releaseNotes,
        });
    });

    autoUpdater.on('update-not-available', (info) => {
        sendToRenderer('update:not-available', { version: info.version });
    });

    autoUpdater.on('download-progress', (progress) => {
        sendToRenderer('update:progress', {
            percent: progress.percent,
            bytesPerSecond: progress.bytesPerSecond,
            transferred: progress.transferred,
            total: progress.total,
        });
    });

    autoUpdater.on('update-downloaded', (info) => {
        sendToRenderer('update:downloaded', {
            version: info.version,
            releaseNotes: info.releaseNotes,
        });
    });

    autoUpdater.on('error', (err) => {
        console.error('[UPDATER] Error details:', {
            message: err.message,
            stack: err.stack,
            code: err.code,
            errno: err.errno
        });
        
        // Mensagem mais amigável para o usuário
        let userMessage = err.message;
        if (err.message && err.message.includes('No published versions')) {
            userMessage = 'Nenhuma versão publicada encontrada no GitHub. Verifique se há releases disponíveis.';
        } else if (err.message && err.message.includes('404')) {
            userMessage = 'Repositório ou release não encontrado. Verifique a configuração.';
        }
        
        sendToRenderer('update:error', { message: userMessage, originalError: err.message });
    });

    // IPC commands from renderer
    ipcMain.on('update:check', () => {
        autoUpdater.checkForUpdates().catch((err) => {
            console.log('[UPDATER] Check failed:', err.message);
        });
    });

    ipcMain.on('update:download', () => {
        autoUpdater.downloadUpdate().catch((err) => {
            console.log('[UPDATER] Download failed:', err.message);
        });
    });

    ipcMain.on('update:install', () => {
        autoUpdater.quitAndInstall(false, true);
    });
}

module.exports = { setupAutoUpdater };

