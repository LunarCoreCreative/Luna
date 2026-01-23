const { app, BrowserWindow, shell, Menu, session, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const http = require('http');
const { URL } = require('url');
const crypto = require('crypto');
const { setupAutoUpdater } = require('./updater.cjs');

// Use native Electron API instead of electron-is-dev (avoids dependency issues in packaged builds)
const isDev = !app.isPackaged;

// Set app name early (before any windows are created)
// In production, electron-builder uses productName from package.json, but we set it explicitly to be sure
app.setName('Luna');

console.log('Electron is starting...');
console.log('[Electron] isDev:', isDev);
console.log('[Electron] NODE_ENV:', process.env.NODE_ENV);
console.log('[Electron] app.isPackaged:', app.isPackaged);
console.log('[Electron] app.getName():', app.getName());

// REMOVIDO: disableHardwareAcceleration() estava causando lentidão
// A aceleração de hardware melhora muito a performance
// Se houver problemas específicos, podemos adicionar de volta com condições

// Bypass Google's "User Agent" block for Electron with a hardcoded Chrome string
// We use a very clean version of Chrome to avoid security blocks
const chromeUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
app.userAgentFallback = chromeUA;

// Start local web server for production to serve static files (needed for Firebase Auth and proper file serving)
function startLocalWebServer() {
    if (isDev) return; // Vite handles dev

    console.log('[ELECTRON] Starting local Express server for production...');
    const express = require('express');
    const appServer = express();
    const PORT = 4173;

    // Determine dist path (works both in dev and packaged)
    // When packaged: __dirname is app.asar/electron/, so ../dist is app.asar/dist/
    // When unpacked: __dirname is electron/, so ../dist is dist/
    const distPath = path.join(__dirname, '../dist');
    console.log('[ELECTRON] Serving static files from:', distPath);
    console.log('[ELECTRON] __dirname:', __dirname);
    console.log('[ELECTRON] app.getAppPath():', app.getAppPath());

    // Serve static files
    appServer.use(express.static(distPath, {
        extensions: ['html', 'js', 'css', 'json', 'md']
    }));

    // SPA Fallback - serve index.html for all routes
    appServer.use((req, res) => {
        const indexPath = path.join(distPath, 'index.html');
        console.log('[ELECTRON] Serving index.html from:', indexPath);
        res.sendFile(indexPath, (err) => {
            if (err) {
                console.error('[ELECTRON] Error serving index.html:', err);
                res.status(500).send('Error loading application');
            }
        });
    });

    serverProcess = appServer.listen(PORT, () => {
        console.log(`[ELECTRON] Local server running on http://localhost:${PORT}`);
    });

    serverProcess.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.warn(`[ELECTRON] Port ${PORT} already in use, assuming server already running`);
        } else {
            console.error('[ELECTRON] Server error:', err);
        }
    });
}

let mainWindow;
let splashWindow;
let pythonProcess = null;
let serverProcess = null; // Express server instance for production

function createSplashWindow() {
    // Determine icon path (works in dev and production)
    // In production, resource folder might be in app.asar or resources folder
    let iconPath = path.join(__dirname, '../resource/logo.png');
    if (!require('fs').existsSync(iconPath) && app.isPackaged) {
        // Try alternative path in packaged app
        iconPath = path.join(process.resourcesPath, 'resource/logo.png');
    }
    
    splashWindow = new BrowserWindow({
        width: 450,
        height: 300,
        transparent: true,
        frame: false,
        alwaysOnTop: true,
        resizable: false,
        icon: iconPath,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true
        }
    });

    splashWindow.loadFile(path.join(__dirname, 'splash.html'));
    splashWindow.on('closed', () => (splashWindow = null));
    
    // Timeout de segurança REDUZIDO: fechar splash após 1s
    setTimeout(() => {
        if (splashWindow && !splashWindow.isDestroyed()) {
            console.log('[Splash] Timeout - fechando splash após 1s');
            splashWindow.close();
            splashWindow = null;
        }
    }, 1000);
}

function createMainWindow() {
    console.log('Preparing main window...');
    console.log('[MainWindow] isDev:', isDev);

    // Start local server in production
    startLocalWebServer();

    // Remover menu padrão mundialmente
    Menu.setApplicationMenu(null);

    // Determine icon path (works in dev and production)
    // In production, resource folder might be in app.asar or resources folder
    const fs = require('fs');
    let iconPath = path.join(__dirname, '../resource/logo.png');
    
    // Verificar se o arquivo existe
    if (!fs.existsSync(iconPath)) {
        if (app.isPackaged) {
            // Try alternative paths in packaged app
            const altPaths = [
                path.join(process.resourcesPath, 'resource/logo.png'),
                path.join(process.resourcesPath, 'app.asar/resource/logo.png'),
                path.join(app.getAppPath(), 'resource/logo.png')
            ];
            
            for (const altPath of altPaths) {
                if (fs.existsSync(altPath)) {
                    iconPath = altPath;
                    console.log('[MainWindow] Icon found at:', iconPath);
                    break;
                }
            }
        }
    } else {
        console.log('[MainWindow] Icon found at:', iconPath);
    }

    // Get app name (já foi definido no início do arquivo)
    const appName = app.getName();
    console.log('[MainWindow] App name:', appName);
    console.log('[MainWindow] Icon path:', iconPath);
    console.log('[MainWindow] Icon exists:', fs.existsSync(iconPath));
    
    mainWindow = new BrowserWindow({
        width: 1280,
        height: 800,
        title: appName,
        backgroundColor: '#09090b',
        autoHideMenuBar: true,
        show: true, // MOSTRAR IMEDIATAMENTE - não esperar
        icon: iconPath,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.cjs'),
            partition: 'persist:luna', // Isolated session for auth
            // Otimizações de performance
            enableRemoteModule: false,
            sandbox: false, // Necessário para preload funcionar
            // Pré-carregar recursos críticos
            backgroundThrottling: false // Não throttlar quando em background
        }
    });

    const startURL = isDev
        ? 'http://localhost:5173'
        : 'http://localhost:4173'; // Use local express server in production
    
    console.log('[MainWindow] Start URL:', startURL);
    console.log('[MainWindow] isDev:', isDev);

    // Timeout de segurança REDUZIDO: fechar splash após 1s
    let splashTimeout = setTimeout(() => {
        console.log('[MainWindow] Timeout - fechando splash após 1s');
        if (splashWindow) {
            splashWindow.close();
            splashWindow = null;
        }
    }, 1000);

    // Carregar URL imediatamente - não esperar verificação
    // O Vite já está configurado para esperar no package.json
    mainWindow.loadURL(startURL).catch((error) => {
        console.error('[MainWindow] Erro ao carregar URL:', error);
        if (isDev) {
            // Em dev, tentar novamente rapidamente
            setTimeout(() => {
                mainWindow.loadURL(startURL).catch(() => {
                    console.error('[MainWindow] Falha ao carregar após retry');
                });
            }, 200);
        }
    });

    // Error handling
    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
        if (!isDev) console.error(`FAILED TO LOAD: ${errorCode} - ${errorDescription}`);
    });

    // Quando a página terminar de carregar (DOM pronto) - fechar splash imediatamente
    mainWindow.webContents.once('did-finish-load', () => {
        console.log('[MainWindow] Page loaded - closing splash');
        clearTimeout(splashTimeout);
        if (splashWindow) {
            splashWindow.close();
            splashWindow = null;
        }
        // Abrir DevTools apenas em modo desenvolvimento
        if (isDev) {
            console.log('[MainWindow] Opening DevTools in dev mode...');
            // Abrir DevTools de forma não bloqueante
            setTimeout(() => {
                try {
                    mainWindow.webContents.openDevTools();
                    console.log('[MainWindow] DevTools opened successfully');
                } catch (error) {
                    console.error('[MainWindow] Error opening DevTools:', error);
                }
            }, 500);
        } else {
            console.log('[MainWindow] Running in production mode - DevTools disabled');
        }

        // Auto-updater only in packaged builds
        if (app.isPackaged) {
            try {
                setupAutoUpdater(mainWindow);
            } catch (e) {
                console.error('[UPDATER] Failed to init:', e?.message || e);
            }
        }
    });

    // Fallback: Abrir DevTools imediatamente se em dev (caso did-finish-load não dispare)
    if (isDev) {
        console.log('[MainWindow] Dev mode detected - will open DevTools after page loads');
        // Também tentar abrir após um tempo maior como fallback
        setTimeout(() => {
            if (mainWindow && !mainWindow.isDestroyed()) {
                try {
                    if (!mainWindow.webContents.isDevToolsOpened()) {
                        console.log('[MainWindow] Fallback: Opening DevTools...');
                        mainWindow.webContents.openDevTools();
                    }
                } catch (error) {
                    console.error('[MainWindow] Fallback error opening DevTools:', error);
                }
            }
        }, 2000);
    }

    mainWindow.on('closed', () => {
        mainWindow = null;
    });

    // Atalho de teclado para abrir/fechar DevTools (F12 ou Ctrl+Shift+I)
    // Funciona mesmo em produção para debug
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F12' || (input.control && input.shift && input.key === 'I')) {
            if (mainWindow.webContents.isDevToolsOpened()) {
                mainWindow.webContents.closeDevTools();
            } else {
                mainWindow.webContents.openDevTools();
            }
        }
    });

    // Handle external links vs Auth popups
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        // Permitir popups do Firebase/Google internamente para o login funcionar
        if (url.includes('firebaseapp.com') || url.includes('google.com')) {
            return {
                action: 'allow',
                overrideBrowserWindowOptions: {
                    autoHideMenuBar: true,
                    backgroundColor: '#ffffff',
                    userAgent: chromeUA // Forçar o mesmo UA no popup
                }
            };
        }

        // Links normais abrem no navegador do sistema
        shell.openExternal(url);
        return { action: 'deny' };
    });
}

// =============================================================================
// GOOGLE OAUTH VIA NAVEGADOR DO SISTEMA
// =============================================================================

// Configuração do Firebase (mesma do frontend)
const FIREBASE_API_KEY = 'AIzaSyCosp9qvfflDF3hFFvmbg5ei4a6v8NCfA0';
const FIREBASE_AUTH_DOMAIN = 'luna-8787d.firebaseapp.com';
const GOOGLE_WEB_CLIENT_ID = '529601808898-nmlorgto19a1smpagh6vj33mn4b1g2qi.apps.googleusercontent.com';

/**
 * Inicia um servidor HTTP local temporário para receber o callback do OAuth
 */
function startOAuthCallbackServer() {
    return new Promise((resolve, reject) => {
        const server = http.createServer((req, res) => {
            try {
                const reqUrl = new URL(req.url, 'http://127.0.0.1');

                if (reqUrl.pathname === '/callback') {
                    // Página HTML bonita para feedback ao usuário
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(`
                        <!DOCTYPE html>
                        <html>
                        <head>
                            <title>Luna - Login Realizado</title>
                            <style>
                                body { 
                                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                                    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
                                    color: white;
                                    display: flex;
                                    justify-content: center;
                                    align-items: center;
                                    height: 100vh;
                                    margin: 0;
                                }
                                .container {
                                    text-align: center;
                                    padding: 40px;
                                    background: rgba(255,255,255,0.1);
                                    border-radius: 16px;
                                    backdrop-filter: blur(10px);
                                }
                                h1 { color: #a78bfa; margin-bottom: 10px; }
                                p { color: #94a3b8; }
                                .spinner {
                                    width: 40px;
                                    height: 40px;
                                    border: 3px solid rgba(167, 139, 250, 0.3);
                                    border-top-color: #a78bfa;
                                    border-radius: 50%;
                                    animation: spin 1s linear infinite;
                                    margin: 20px auto;
                                }
                                @keyframes spin { to { transform: rotate(360deg); } }
                            </style>
                        </head>
                        <body>
                            <div class="container">
                                <h1>✨ Login Realizado!</h1>
                                <div class="spinner"></div>
                                <p>Retornando para a Luna...</p>
                                <p style="font-size: 12px; margin-top: 20px;">Esta janela fechará automaticamente.</p>
                            </div>
                            <script>setTimeout(() => window.close(), 2000);</script>
                        </body>
                        </html>
                    `);

                    // Extrair o fragmento da URL (contém o token)
                    // Como o fragmento não chega ao servidor, usamos uma página intermediária
                    const code = reqUrl.searchParams.get('code');
                    const idToken = reqUrl.searchParams.get('id_token');
                    const accessToken = reqUrl.searchParams.get('access_token');

                    server.close();
                    resolve({ code, idToken, accessToken, hash: reqUrl.hash });
                }

                // Página intermediária para capturar tokens do fragmento
                if (reqUrl.pathname === '/auth-landing') {
                    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end(`
                        <!DOCTYPE html>
                        <html>
                        <head><title>Processando...</title></head>
                        <body>
                            <script>
                                // O token está no fragmento (#), precisamos enviá-lo como query
                                const hash = window.location.hash.substring(1);
                                const params = new URLSearchParams(hash);
                                const redirectUrl = '/callback?' + params.toString();
                                window.location.href = redirectUrl;
                            </script>
                        </body>
                        </html>
                    `);
                }
            } catch (err) {
                console.error('[OAuth] Error processing request:', err);
                res.writeHead(500);
                res.end('Error');
            }
        });

        server.on('error', (err) => {
            reject(err);
        });

        // Escutar em porta fixa para facilitar a configuração do redirect_uri
        const OAUTH_PORT = 5167;
        server.listen(OAUTH_PORT, '127.0.0.1', () => {
            console.log(`[OAuth] Callback server started on port ${OAUTH_PORT}`);
            resolve({ server, port: OAUTH_PORT });
        });
    });
}

/**
 * Handler IPC para iniciar o login com Google
 */
ipcMain.handle('start-google-login', async () => {
    try {
        console.log('[OAuth] Starting Google login flow...');

        // 1. Iniciar servidor de callback
        const { server, port } = await startOAuthCallbackServer();
        const redirectUri = `http://127.0.0.1:${port}/auth-landing`;

        // 2. Gerar state e nonce para segurança
        const state = crypto.randomBytes(16).toString('hex');
        const nonce = crypto.randomBytes(16).toString('hex');

        // 3. Construir URL de autenticação OAuth direto com Google
        // Isso abre a tela de login do Google no navegador do sistema
        const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
        authUrl.searchParams.set('client_id', GOOGLE_WEB_CLIENT_ID);
        authUrl.searchParams.set('redirect_uri', redirectUri);
        authUrl.searchParams.set('response_type', 'id_token token');
        authUrl.searchParams.set('scope', 'openid email profile');
        authUrl.searchParams.set('state', state);
        authUrl.searchParams.set('nonce', nonce);
        authUrl.searchParams.set('prompt', 'select_account');

        console.log('[OAuth] Opening browser for authentication...');
        console.log('[OAuth] Redirect URI:', redirectUri);

        // 4. Abrir no navegador do sistema
        shell.openExternal(authUrl.toString());

        // 5. Aguardar callback (com timeout de 5 minutos)
        return new Promise((resolve, reject) => {
            const timeout = setTimeout(() => {
                server.close();
                reject(new Error('Login timeout - 5 minutes exceeded'));
            }, 5 * 60 * 1000);

            // Substituir o resolve do servidor
            const originalResolve = server._resolve;
            server.on('close', () => {
                clearTimeout(timeout);
            });

            // Escutar evento de conexão para capturar tokens
            server.on('request', (req, res) => {
                const reqUrl = new URL(req.url, 'http://127.0.0.1');
                if (reqUrl.pathname === '/callback') {
                    const idToken = reqUrl.searchParams.get('id_token');
                    const accessToken = reqUrl.searchParams.get('access_token');

                    if (idToken) {
                        console.log('[OAuth] Received tokens successfully!');
                        clearTimeout(timeout);
                        resolve({ success: true, idToken, accessToken });
                    } else {
                        reject(new Error('No id_token received'));
                    }
                }
            });
        });
    } catch (error) {
        console.error('[OAuth] Error:', error);
        return { success: false, error: error.message };
    }
});

// App: version (used by renderer)
ipcMain.handle('app:get-version', () => {
    try {
        return app.getVersion();
    } catch (e) {
        return '0.0.0';
    }
});

function startBackend() {
    console.log('[Backend] Attempting to start backend...');
    console.log('[Backend] isDev:', isDev);
    console.log('[Backend] isPackaged:', app.isPackaged);

    // Command setup (assuming python is in PATH)
    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3';
    
    // Determine server path based on environment
    let serverPath;
    if (app.isPackaged) {
        // In packaged app, server should be in resources folder
        serverPath = path.join(process.resourcesPath, 'server', 'app.py');
        // Fallback: try app.asar path
        if (!require('fs').existsSync(serverPath)) {
            serverPath = path.join(app.getAppPath(), 'server', 'app.py');
        }
    } else {
        // In dev, use relative path
        serverPath = path.join(__dirname, '../server/app.py');
    }

    // Determine working directory
    let serverDir;
    if (app.isPackaged) {
        serverDir = path.join(process.resourcesPath, 'server');
        if (!require('fs').existsSync(serverDir)) {
            serverDir = path.join(app.getAppPath(), 'server');
        }
    } else {
        serverDir = path.join(__dirname, '../server');
    }

    console.log(`[Backend] Python command: ${pythonCmd}`);
    console.log(`[Backend] Server path: ${serverPath}`);
    console.log(`[Backend] Server directory: ${serverDir}`);
    console.log(`[Backend] Server path exists: ${require('fs').existsSync(serverPath)}`);

    // Check if server file exists
    if (!require('fs').existsSync(serverPath)) {
        console.error(`[Backend] ❌ Server file not found at: ${serverPath}`);
        console.error('[Backend] 💡 Backend will not start. Some features may not work.');
        return;
    }

    pythonProcess = spawn(pythonCmd, [serverPath], {
        cwd: serverDir,
        env: { ...process.env, PYTHONUNBUFFERED: '1' } // Para ver logs em tempo real
    });

    pythonProcess.stdout.on('data', (data) => {
        const output = data.toString();
        process.stdout.write(`[Backend]: ${output}`);
        // Verificar se o servidor iniciou com sucesso
        if (output.includes('Uvicorn running') || output.includes('Application startup complete')) {
            console.log('[Backend] ✅ Server started successfully on port 3001');
        }
    });

    pythonProcess.stderr.on('data', (data) => {
        const error = data.toString();
        process.stderr.write(`[Backend Error]: ${error}`);
        // Log erros críticos
        if (error.includes('ModuleNotFoundError') || error.includes('ImportError')) {
            console.error('[Backend] ❌ Python module error - check requirements.txt');
        }
        if (error.includes('Address already in use') || error.includes('port')) {
            console.error('[Backend] ❌ Port 3001 is already in use');
        }
    });

    pythonProcess.on('error', (error) => {
        console.error('[Backend] ❌ Failed to start Python process:', error.message);
        console.error('[Backend] Make sure Python is installed and in PATH');
    });

    pythonProcess.on('close', (code) => {
        if (code !== 0 && code !== null) {
            console.error(`[Backend] ❌ Process exited with code ${code}`);
        } else {
            console.log(`[Backend] Process exited with code ${code}`);
        }
    });
}

// 1. Iniciar o Backend imediatamente (Paralelo)
// Aguardar um pouco antes de iniciar para garantir que tudo está pronto
setTimeout(() => {
    startBackend();
    
    // Verificar se o servidor está rodando após 3 segundos
    setTimeout(async () => {
        try {
            const http = require('http');
            const checkRequest = http.get('http://localhost:3001/health', (res) => {
                console.log('[Backend] ✅ Health check passed - server is running');
            });
            
            checkRequest.on('error', (err) => {
                console.error('[Backend] ❌ Health check failed - server may not be running');
                console.error('[Backend] Error:', err.message);
                console.error('[Backend] 💡 Try starting the server manually:');
                console.error('[Backend]    cd server && python app.py');
            });
            
            checkRequest.setTimeout(2000, () => {
                checkRequest.destroy();
                console.error('[Backend] ❌ Health check timeout - server may not be running');
            });
        } catch (error) {
            console.error('[Backend] Health check error:', error);
        }
    }, 3000);
}, 500);

// 2. Coordenar janelas assim que o Electron estiver pronto
app.whenReady().then(() => {
    // App name já foi definido no início do arquivo
    // Get the specific session for our app (matches the partition in BrowserWindow)
    const lunaSession = session.fromPartition('persist:luna');

    // Advanced Bypass: Strip X-Requested-With and force User Agent at the session level
    // This removes the "Electron" signature that Google blocks
    lunaSession.webRequest.onBeforeSendHeaders(
        { urls: ['https://accounts.google.com/*', 'https://*.firebaseui.com/*', 'https://*.firebaseapp.com/*', 'https://*.googleapis.com/*'] },
        (details, callback) => {
            const { requestHeaders } = details;
            requestHeaders['User-Agent'] = chromeUA;
            delete requestHeaders['X-Requested-With'];
            callback({ requestHeaders });
        }
    );

    // Override COOP headers from Google responses
    lunaSession.webRequest.onHeadersReceived(
        { urls: ['https://accounts.google.com/*', 'https://*.firebaseapp.com/*'] },
        (details, callback) => {
            const { responseHeaders } = details;
            // Remove Cross-Origin policies that block popups
            delete responseHeaders['Cross-Origin-Opener-Policy'];
            delete responseHeaders['Cross-Origin-Embedder-Policy'];
            callback({ responseHeaders });
        }
    );

    createSplashWindow();
    createMainWindow(); // Sem delay artificial

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            if (splashWindow) createSplashWindow();
            else createMainWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('will-quit', () => {
    if (pythonProcess) {
        process.stdout.write('Stopping Python Backend...\n');
        pythonProcess.kill();
    }
    if (serverProcess) {
        console.log('[ELECTRON] Stopping Express server...');
        serverProcess.close();
    }
});
