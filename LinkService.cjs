/**
 * Luna Link Service (Client-side for Electron)
 * Handles the secure tunnel connection to the cloud server
 * and executes local file/terminal operations.
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const WebSocket = require('ws');

class LinkService {
    constructor() {
        this.ws = null;
        this.connected = false;
        this.serverUrl = null;
        this.authToken = null;
    }

    /**
     * Connect to the Luna Cloud server's Link endpoint.
     * @param {string} serverUrl - The cloud server URL (e.g., wss://luna.squareweb.app/ws/link)
     * @param {string} token - Firebase ID token for authentication
     */
    connect(serverUrl, token) {
        this.serverUrl = serverUrl;
        this.authToken = token;

        console.log('[LUNA-LINK] Connecting to:', serverUrl);
        this.ws = new WebSocket(serverUrl);

        this.ws.on('open', () => {
            console.log('[LUNA-LINK] Connection established. Authenticating...');
            this.ws.send(JSON.stringify({ type: 'auth', token: this.authToken }));
        });

        this.ws.on('message', async (data) => {
            try {
                const msg = JSON.parse(data.toString());

                if (msg.type === 'connected') {
                    this.connected = true;
                    console.log('[LUNA-LINK] Authenticated successfully!');
                    return;
                }

                if (msg.error) {
                    console.error('[LUNA-LINK] Server error:', msg.error);
                    return;
                }

                // Handle incoming commands from the cloud
                const result = await this.executeCommand(msg);
                this.ws.send(JSON.stringify(result));

            } catch (e) {
                console.error('[LUNA-LINK] Message parse error:', e);
            }
        });

        this.ws.on('close', () => {
            this.connected = false;
            console.log('[LUNA-LINK] Disconnected. Attempting reconnect in 5s...');
            setTimeout(() => this.connect(this.serverUrl, this.authToken), 5000);
        });

        this.ws.on('error', (err) => {
            console.error('[LUNA-LINK] WebSocket error:', err.message);
        });
    }

    /**
     * Execute a command received from the cloud server.
     * @param {object} command - Command object with type, path, content, etc.
     */
    async executeCommand(command) {
        const requestId = command.request_id;
        const type = command.type;

        try {
            switch (type) {
                case 'FS_READ':
                    return this.handleFsRead(requestId, command.path);

                case 'FS_WRITE':
                    return this.handleFsWrite(requestId, command.path, command.content);

                case 'FS_LIST':
                    return this.handleFsList(requestId, command.path);

                case 'TERM_EXEC':
                    return await this.handleTermExec(requestId, command.command, command.cwd);

                case 'PICK_FOLDER':
                    // This is handled by the main process, so we need IPC
                    // For now, we'll use a callback mechanism
                    return this.handlePickFolder(requestId);

                default:
                    return { request_id: requestId, success: false, error: `Unknown command: ${type}` };
            }
        } catch (e) {
            return { request_id: requestId, success: false, error: e.message };
        }
    }

    // --- Folder Picker Handler (uses Electron dialog via main process) ---
    handlePickFolder(requestId) {
        // Since we're in the main process context (LinkService runs in main.cjs),
        // we can directly use the dialog module
        const { dialog } = require('electron');
        const { BrowserWindow } = require('electron');

        return new Promise(async (resolve) => {
            try {
                const focusedWindow = BrowserWindow.getFocusedWindow();
                const result = await dialog.showOpenDialog(focusedWindow, {
                    properties: ['openDirectory'],
                    title: 'Luna: Selecione a pasta do projeto'
                });

                if (result.canceled || !result.filePaths.length) {
                    resolve({ request_id: requestId, success: false, error: 'Nenhuma pasta selecionada' });
                } else {
                    resolve({ request_id: requestId, success: true, path: result.filePaths[0] });
                }
            } catch (e) {
                resolve({ request_id: requestId, success: false, error: e.message });
            }
        });
    }

    // --- File System Handlers ---

    handleFsRead(requestId, filePath) {
        if (!fs.existsSync(filePath)) {
            return { request_id: requestId, success: false, error: 'File not found' };
        }
        const content = fs.readFileSync(filePath, 'utf-8');
        return { request_id: requestId, success: true, content };
    }

    handleFsWrite(requestId, filePath, content) {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(filePath, content, 'utf-8');
        return { request_id: requestId, success: true };
    }

    handleFsList(requestId, dirPath) {
        if (!fs.existsSync(dirPath) || !fs.statSync(dirPath).isDirectory()) {
            return { request_id: requestId, success: false, error: 'Directory not found' };
        }
        const entries = fs.readdirSync(dirPath, { withFileTypes: true }).map(dirent => ({
            name: dirent.name,
            isDirectory: dirent.isDirectory(),
        }));
        return { request_id: requestId, success: true, entries };
    }

    // --- Terminal Handler ---

    handleTermExec(requestId, command, cwd) {
        return new Promise((resolve) => {
            exec(command, { cwd: cwd || process.cwd(), shell: true, maxBuffer: 10 * 1024 * 1024 }, (error, stdout, stderr) => {
                if (error) {
                    resolve({ request_id: requestId, success: false, error: error.message, stdout, stderr });
                } else {
                    resolve({ request_id: requestId, success: true, stdout, stderr });
                }
            });
        });
    }

    disconnect() {
        if (this.ws) {
            this.ws.close();
            this.ws = null;
            this.connected = false;
        }
    }
}

module.exports = { LinkService };
