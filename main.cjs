const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
// const isDev = require('electron-is-dev'); 
const { spawn, exec } = require('child_process');
const { LinkService } = require('./LinkService.cjs');
const { setupAutoUpdater } = require('./updater.cjs');

// Lê a versão do package.json
let appVersion = '1.0.0';
try {
    const packageJson = require('./package.json');
    appVersion = packageJson.version || '1.0.0';
} catch (e) {
    console.warn('[MAIN] Não foi possível ler versão do package.json, usando fallback');
}

let mainWindow;
let pythonProcess = null;
let linkService = null;
let serverProcess = null; // Express server instance

// Determine if we are in development mode reliably
const isDev = !app.isPackaged;

// Fix para inputs no Windows: Desabilita aceleração de hardware que pode causar problemas
if (process.platform === 'win32') {
    app.disableHardwareAcceleration();
}

// SaaS Mode: Only start Python locally in development
const USE_LOCAL_PYTHON = isDev;
// Detect staging environment
const IS_STAGING = process.env.STAGING === 'true' || process.env.VITE_STAGING === 'true';
const PRODUCTION_WS_URL = 'wss://luna-production-94f2.up.railway.app/ws/link';
const STAGING_WS_URL = 'wss://luna-staging.up.railway.app/ws/link';
const CLOUD_WS_URL = IS_STAGING ? STAGING_WS_URL : PRODUCTION_WS_URL; // Luna Link tunnel

// Start local web server for production to support Firebase Auth (needs localhost)
function startLocalWebServer() {
    if (isDev) return; // Vite handles dev

    console.log('[ELECTRON] Starting local Express server for production...');
    const express = require('express');
    const appServer = express();
    const PORT = 4173;

    // Serve static files (incluindo CHANGELOG.md)
    appServer.use(express.static(path.join(__dirname, 'dist'), {
        // Permite servir arquivos .md
        extensions: ['html', 'js', 'css', 'json', 'md']
    }));

    // Rota específica para CHANGELOG.md (garantir que funcione)
    appServer.get('/CHANGELOG.md', (req, res) => {
        const changelogPath = path.join(__dirname, 'dist', 'CHANGELOG.md');
        res.sendFile(changelogPath, (err) => {
            if (err) {
                console.error('[ELECTRON] Erro ao servir CHANGELOG.md:', err);
                res.status(404).send('CHANGELOG.md não encontrado');
            }
        });
    });

    // SPA Fallback (using app.use for catch-all to avoid Express 5 regex issues)
    appServer.use((req, res) => {
        res.sendFile(path.join(__dirname, 'dist/index.html'));
    });

    serverProcess = appServer.listen(PORT, () => {
        console.log(`[ELECTRON] Local server running on http://localhost:${PORT}`);
    });
}

// Função para verificar se o servidor já está rodando na porta
function checkServerRunning(port, callback) {
    const http = require('http');
    const req = http.get(`http://localhost:${port}/health`, { timeout: 1000 }, (res) => {
        // Se recebeu resposta, o servidor está rodando
        callback(true);
    });
    
    req.on('error', () => {
        // Se deu erro, o servidor não está rodando
        callback(false);
    });
    
    req.on('timeout', () => {
        req.destroy();
        callback(false);
    });
}

// Função para liberar a porta 8001 se estiver ocupada
function killProcessOnPort(port, callback) {
    if (process.platform === 'win32') {
        // Windows: usar netstat para encontrar PID e taskkill para matar
        exec(`netstat -ano | findstr :${port}`, (error, stdout) => {
            if (stdout) {
                const lines = stdout.trim().split('\n');
                const pids = new Set();
                
                lines.forEach(line => {
                    const parts = line.trim().split(/\s+/);
                    const pid = parts[parts.length - 1];
                    if (pid && !isNaN(pid)) {
                        pids.add(pid);
                    }
                });
                
                if (pids.size > 0) {
                    console.log(`[ELECTRON] Encontrados processos na porta ${port}: ${Array.from(pids).join(', ')}`);
                    const pidArray = Array.from(pids);
                    let killed = 0;
                    
                    pidArray.forEach(pid => {
                        exec(`taskkill /F /PID ${pid}`, (err) => {
                            if (!err) {
                                console.log(`[ELECTRON] Processo ${pid} encerrado`);
                            }
                            killed++;
                            if (killed === pidArray.length) {
                                // Aguarda um pouco para a porta ser liberada
                                setTimeout(() => callback(), 500);
                            }
                        });
                    });
                } else {
                    callback();
                }
            } else {
                callback();
            }
        });
    } else {
        // Unix/Mac: usar lsof para encontrar PID e kill para matar
        exec(`lsof -ti:${port}`, (error, stdout) => {
            if (stdout) {
                const pids = stdout.trim().split('\n').filter(pid => pid);
                if (pids.length > 0) {
                    console.log(`[ELECTRON] Encontrados processos na porta ${port}: ${pids.join(', ')}`);
                    pids.forEach(pid => {
                        exec(`kill -9 ${pid}`, (err) => {
                            if (!err) {
                                console.log(`[ELECTRON] Processo ${pid} encerrado`);
                            }
                        });
                    });
                    setTimeout(() => callback(), 500);
                } else {
                    callback();
                }
            } else {
                callback();
            }
        });
    }
}

function startPythonServer() {
    if (!USE_LOCAL_PYTHON) {
        console.log('[ELECTRON] SaaS Mode: Skipping local Python server (using cloud).');
        return;
    }

    console.log('[ELECTRON] Dev Mode: Verificando se servidor Python já está rodando...');
    
    // Primeiro verifica se o servidor já está rodando
    checkServerRunning(8001, (isRunning) => {
        if (isRunning) {
            console.log('[ELECTRON] Servidor Python já está rodando na porta 8001. Pulando inicialização.');
            return;
        }
        
        console.log('[ELECTRON] Servidor não encontrado. Verificando porta 8001...');
        
        // Libera a porta 8001 antes de iniciar o servidor (caso tenha processo órfão)
        killProcessOnPort(8001, () => {
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
        });
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
            spellcheck: false, // Desabilita spellcheck que pode causar problemas de foco no Windows
            backgroundThrottling: false, // Previne throttling quando a janela perde foco
        },
    });

    const startURL = isDev
        ? 'http://localhost:5173'
        : 'http://localhost:4173'; // Use local express server

    // Em dev mode, aguarda o Vite estar pronto antes de carregar
    if (isDev) {
        const maxRetries = 30; // 30 tentativas = 15 segundos
        let retries = 0;
        
        const tryLoadVite = () => {
            const http = require('http');
            const req = http.get('http://localhost:5173', { timeout: 500 }, (res) => {
                // Vite está pronto, carrega a URL
                console.log('[ELECTRON] Vite está pronto, carregando aplicação...');
                mainWindow.loadURL(startURL);
            });
            
            req.on('error', () => {
                retries++;
                if (retries < maxRetries) {
                    // Tenta novamente em 500ms
                    setTimeout(tryLoadVite, 500);
                } else {
                    // Timeout - mostra erro
                    console.error('[ELECTRON] Timeout: Vite não está respondendo na porta 5173');
                    mainWindow.loadURL('data:text/html,<html><body style="background:#1a1a1a;color:#fff;font-family:monospace;padding:20px;"><h1>Erro: Vite não está rodando</h1><p>Certifique-se de que o Vite está rodando na porta 5173.</p><p>Execute: <code>npm run dev</code> em outro terminal.</p></body></html>');
                }
            });
            
            req.on('timeout', () => {
                req.destroy();
                retries++;
                if (retries < maxRetries) {
                    setTimeout(tryLoadVite, 500);
                } else {
                    console.error('[ELECTRON] Timeout: Vite não está respondendo');
                    mainWindow.loadURL('data:text/html,<html><body style="background:#1a1a1a;color:#fff;font-family:monospace;padding:20px;"><h1>Erro: Vite não está rodando</h1><p>Certifique-se de que o Vite está rodando na porta 5173.</p><p>Execute: <code>npm run dev</code> em outro terminal.</p></body></html>');
                }
            });
        };
        
        // Inicia tentativa de carregar
        tryLoadVite();
    } else {
        // Production: carrega direto
        mainWindow.loadURL(startURL);
    }

    // Fix para inputs que param de funcionar no Windows
    // Função auxiliar para restaurar foco e eventos de mouse
    const restoreInputFocus = () => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            try {
                // Garante que eventos de mouse estão habilitados
                mainWindow.setIgnoreMouseEvents(false, { forward: true });
                // Força o webContents a ganhar foco novamente
                mainWindow.webContents.focus();
            } catch (e) {
                console.error('[ELECTRON] Erro ao restaurar foco:', e);
            }
        }
    };

    // Restaura o foco quando a janela ganha foco novamente
    mainWindow.on('focus', () => {
        restoreInputFocus();
    });

    // Fix adicional: restaura foco após mostrar a janela (inclui quando restaura de minimizado)
    mainWindow.on('show', () => {
        setTimeout(() => {
            restoreInputFocus();
        }, 100);
    });

    // Fix para quando a janela é restaurada (especialmente no Windows)
    if (process.platform === 'win32') {
        mainWindow.on('restore', () => {
            setTimeout(() => {
                restoreInputFocus();
            }, 50);
        });

        // Garante eventos de mouse ativos quando o DOM estiver pronto
        mainWindow.webContents.on('dom-ready', () => {
            mainWindow.setIgnoreMouseEvents(false, { forward: true });
        });

        // Monitora quando a janela perde foco e força restauração quando ganha
        let wasBlurred = false;
        mainWindow.on('blur', () => {
            wasBlurred = true;
        });
        const originalFocusHandler = () => {
            restoreInputFocus();
        };
        // Adiciona handler adicional para quando a janela ganha foco após blur
        mainWindow.on('focus', () => {
            if (wasBlurred) {
                wasBlurred = false;
                setTimeout(() => {
                    restoreInputFocus();
                    // Executa JavaScript no renderer para forçar foco em inputs ativos
                    mainWindow.webContents.executeJavaScript(`
                        (function() {
                            const activeElement = document.activeElement;
                            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                                activeElement.blur();
                                setTimeout(() => activeElement.focus(), 50);
                            }
                        })();
                    `).catch(() => {});
                }, 100);
            }
        });
    }

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

// App: Get version
ipcMain.handle('app:get-version', () => {
    return appVersion;
});

// Fix para inputs que param de funcionar: Handler IPC para forçar restauração de foco
ipcMain.on('force-input-focus', () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        try {
            // Força eventos de mouse ativos
            mainWindow.setIgnoreMouseEvents(false, { forward: true });
            // Força foco no webContents
            mainWindow.webContents.focus();
            // Executa JavaScript para forçar foco em inputs visíveis
            mainWindow.webContents.executeJavaScript(`
                (function() {
                    // Tenta focar no elemento ativo primeiro
                    const activeElement = document.activeElement;
                    if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
                        activeElement.blur();
                        setTimeout(() => {
                            activeElement.focus();
                            activeElement.click(); // Força evento de clique
                        }, 10);
                        return;
                    }
                    // Se não há elemento ativo, tenta focar no primeiro input/textarea visível
                    const inputs = document.querySelectorAll('input:not([type="hidden"]), textarea');
                    for (let input of inputs) {
                        const rect = input.getBoundingClientRect();
                        if (rect.width > 0 && rect.height > 0) {
                            input.focus();
                            input.click();
                            break;
                        }
                    }
                })();
            `).catch(() => {});
        } catch (e) {
            console.error('[ELECTRON] Erro ao forçar foco:', e);
        }
    }
});
