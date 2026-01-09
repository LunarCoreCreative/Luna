/**
 * Luna Auto-Updater Module
 * Uses electron-updater for automatic updates via GitHub Releases
 */

const { autoUpdater } = require('electron-updater');
const { ipcMain } = require('electron');

let mainWindow = null;

// Configure updater
autoUpdater.autoDownload = false; // Let user decide
autoUpdater.autoInstallOnAppQuit = true;

function setupAutoUpdater(window) {
    mainWindow = window;

    console.log('[UPDATER] Initializing auto-updater...');

    // Check for updates on startup (after window is ready)
    setTimeout(() => {
        autoUpdater.checkForUpdates().catch(err => {
            console.log('[UPDATER] Check failed:', err.message);
        });
    }, 3000);

    // Update events
    autoUpdater.on('checking-for-update', () => {
        console.log('[UPDATER] Checking for updates...');
        sendToRenderer('update:checking');
    });

    autoUpdater.on('update-available', (info) => {
        console.log('[UPDATER] Update available:', info.version);
        sendToRenderer('update:available', {
            version: info.version,
            releaseDate: info.releaseDate,
            releaseNotes: info.releaseNotes
        });
    });

    autoUpdater.on('update-not-available', (info) => {
        console.log('[UPDATER] No update available. Current:', info.version);
        sendToRenderer('update:not-available', { version: info.version });
    });

    autoUpdater.on('download-progress', (progress) => {
        console.log(`[UPDATER] Download progress: ${progress.percent.toFixed(1)}%`);
        sendToRenderer('update:progress', {
            percent: progress.percent,
            bytesPerSecond: progress.bytesPerSecond,
            transferred: progress.transferred,
            total: progress.total
        });
    });

    autoUpdater.on('update-downloaded', (info) => {
        console.log('[UPDATER] Update downloaded:', info.version);
        sendToRenderer('update:downloaded', {
            version: info.version,
            releaseNotes: info.releaseNotes
        });
    });

    autoUpdater.on('error', (err) => {
        console.error('[UPDATER] Error:', err.message);
        sendToRenderer('update:error', { message: err.message });
    });

    // IPC Handlers
    ipcMain.on('update:check', () => {
        console.log('[UPDATER] Manual check requested');
        autoUpdater.checkForUpdates().catch(err => {
            console.log('[UPDATER] Check failed:', err.message);
        });
    });

    ipcMain.on('update:download', () => {
        console.log('[UPDATER] Download requested');
        autoUpdater.downloadUpdate().catch(err => {
            console.log('[UPDATER] Download failed:', err.message);
        });
    });

    ipcMain.on('update:install', () => {
        console.log('[UPDATER] Install requested - quitting and installing...');
        autoUpdater.quitAndInstall(false, true);
    });
}

function sendToRenderer(channel, data = {}) {
    if (mainWindow && mainWindow.webContents) {
        mainWindow.webContents.send(channel, data);
    }
}

// Manual check function for external use
function checkForUpdates() {
    return autoUpdater.checkForUpdates();
}

module.exports = { setupAutoUpdater, checkForUpdates };
