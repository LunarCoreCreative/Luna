import { useEffect, useRef, useState, useMemo, useCallback, memo } from "react";
import {
    MessageSquare,
    Plus,
    Send,
    Bot,
    User,
    Menu,
    X,
    MoreHorizontal,
    Compass,
    Image as ImageIcon,
    PenTool,
    Lightbulb,
    MessageCircle,
    Home,
    Loader2,
    Globe,
    FileText,
    CheckCircle2,
    Brain,
    Sun,
    Moon,
    Upload,
    RotateCcw,
    Star,
    History,
    Eye,
    EyeOff,
    Zap,
    ZapOff,
    BellOff,
    Clock,
    LayoutDashboard,
    PanelRight,
    Code,
    XCircle,
    BookOpen,
    LogOut,
    Building2,
    Heart
} from "lucide-react";
// Importações normais - tudo carregado diretamente
import { StudyMode } from "./components/StudyMode";
import { BusinessMode } from "./components/business/BusinessMode";
import { SettingsPage } from "./pages/SettingsPage";
import Canvas from "./components/Canvas";
import IDEView from "./components/ide/IDEView";
import { HealthMode } from "./components/health";

// Keep lightweight components as regular imports
import { Markdown } from "./components/markdown/Markdown";
import { TypingIndicator } from "./components/chat/TypingIndicator";
import { MessageList } from "./components/chat/MessageList";
import { ChatInput } from "./components/chat/ChatInput";

import { useChat } from "./hooks/useChat";
import { useArtifacts } from "./hooks/useArtifacts";
import { useAttachments } from "./hooks/useAttachments";
import { generateArtifactSummary, filterSummaryText } from "./utils/artifactUtils";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ModalProvider } from "./contexts/ModalContext";
import { LoginPage } from "./pages/LoginPage";
import { SidebarProfile } from "./components/sidebar/SidebarProfile";
import { parseThought, getGreeting, cleanContent } from "./utils/messageUtils";
import { API_CONFIG } from "./config/api";
import { UpdateNotification } from "./components/UpdateNotification";
import { ChangelogModal } from "./components/ChangelogModal";
import { parseChangelogVersion, getCurrentVersion } from "./utils/changelogParser";
import { LoadingFeedback, LoadingOverlay, LoadingToast } from "./components/LoadingFeedback";
import { usePreloader } from "./hooks/usePreloader";

const MEMORY_SERVER = API_CONFIG.BASE_URL;

// Log da URL do servidor para debug
console.log('[APP] MEMORY_SERVER configurado para:', MEMORY_SERVER);
console.log('[APP] IS_PRODUCTION:', import.meta.env.PROD);

const filterToolCallLeaks = (text) => {
    if (!text) return "";

    // 1. Remove Qwen/DeepSeek special tokens with flexible spacing (e.g. "< | tool_calls_begin | >")
    let filtered = text.replace(/<\s*\|\s*tool_calls_begin\s*\|\s*>/g, "");
    filtered = filtered.replace(/<\s*\|\s*tool_calls_end\s*\|\s*>/g, "");
    filtered = filtered.replace(/<\s*\|\s*tool_call_begin\s*\|\s*>/g, "");
    filtered = filtered.replace(/<\s*\|\s*tool_call_end\s*\|\s*>/g, "");
    filtered = filtered.replace(/<\s*\|\s*tool_sep\s*\|\s*>/g, "");

    // 2. Remove standard XML-like tags
    filtered = filtered.replace(/<tool_call>/g, "");
    filtered = filtered.replace(/<\/tool_call>/g, "");

    // 3. Remove tool calls in format: tool_name{...} (e.g., edit_artifact{"id":...})
    // Helper function to find and remove tool calls with balanced braces
    const removeToolCalls = (text, toolNames) => {
        const toRemove = [];
        const allMatches = [];
        
        // Find all tool call starts
        for (const toolName of toolNames) {
            const regex = new RegExp(`\\b${toolName}\\s*\\{`, "g");
            let match;
            while ((match = regex.exec(text)) !== null) {
                allMatches.push({ name: toolName, start: match.index, matchEnd: match.index + match[0].length });
            }
        }
        
        // Sort by position
        allMatches.sort((a, b) => a.start - b.start);
        
        // For each match, find the matching closing brace
        for (const match of allMatches) {
            let braceCount = 1; // Start at 1 because we're already inside the first {
            let inString = false;
            let escapeNext = false;
            let endPos = match.matchEnd - 1;
            let found = false;
            
            for (let i = match.matchEnd; i < text.length; i++) {
                const char = text[i];
                
                if (escapeNext) {
                    escapeNext = false;
                    continue;
                }
                
                if (char === '\\') {
                    escapeNext = true;
                    continue;
                }
                
                if (char === '"' && !escapeNext) {
                    inString = !inString;
                    continue;
                }
                
                if (!inString) {
                    if (char === '{') braceCount++;
                    if (char === '}') {
                        braceCount--;
                        if (braceCount === 0) {
                            endPos = i;
                            toRemove.push({ start: match.start, end: endPos + 1 });
                            found = true;
                            break;
                        }
                    }
                }
            }
        }
        
        // Remove all matches in reverse order to maintain positions
        let result = text;
        for (let i = toRemove.length - 1; i >= 0; i--) {
            const { start, end } = toRemove[i];
            result = result.slice(0, start) + result.slice(end);
        }
        
        return result;
    };
    
    // List of known tool names (including business and health tools)
    const toolNames = [
        "edit_artifact", "create_artifact", "get_artifact", "web_search", "run_command", "add_knowledge", "think",
        // Business tools
        "add_transaction", "edit_transaction", "update_transaction", "delete_transaction",
        "add_tag", "get_balance", "list_transactions", "get_transactions",
        "add_client", "get_recurring_items",
        // Overdue bills tools
        "add_overdue_bill", "list_overdue_bills", "pay_overdue_bill", "get_overdue_summary",
        // Health tools
        "add_meal", "edit_meal", "delete_meal", "list_meals",
        "get_nutrition_summary", "update_goals", "get_goals",
        // Common patterns that might leak
        "get_expenses_by_category", "get_expenses", "get_summary", "search_clients"
    ];
    filtered = removeToolCalls(filtered, toolNames);
    
    // Also capture generic pattern: word followed by {} (empty tool call)
    // This catches any tool_name{} pattern even if not in our list
    filtered = filtered.replace(/\b[a-zA-Z_][a-zA-Z0-9_]*\s*\{\s*\}/g, "");

    // 4. Check if the string contains a tool call JSON pattern
    if (text.includes('{"name":') || text.includes('{"name" :') || text.includes('{"artifact_id":')) {
        // Remove full JSON blocks (including nested braces)
        filtered = filtered.replace(/\{"name"\s*:\s*"[a-zA-Z0-9_-]+"[\s\S]*?\}\s*\}\s*\}?/g, "");
        filtered = filtered.replace(/\{"name"\s*:\s*"[a-zA-Z0-9_-]+"[\s\S]*?\]\s*\}\s*\}?/g, "");
        filtered = filtered.replace(/\{"name"\s*:\s*"[a-zA-Z0-9_-]+"[\s\S]*?\}\s*\}?/g, "");

        // Remove partial JSON starts
        filtered = filtered.replace(/\{"name"\s*:\s*"[^"]*"?/g, "");
        filtered = filtered.replace(/"arguments"\s*:\s*\{?/g, "");
        filtered = filtered.replace(/"artifact_id"\s*:\s*"[^"]*"?/g, "");
        filtered = filtered.replace(/"changes"\s*:\s*\[?/g, "");
        filtered = filtered.replace(/"artifact_updates"\s*:\s*\[?/g, "");
    }

    return filtered.trim();
};



// Energy Components with Timer Support - Memoized for performance
const EnergyDisplay = memo(() => {
    const { energy, plan } = useAuth();
    const [timeLeft, setTimeLeft] = useState("");

    // Memoize computed values
    const isInfinite = useMemo(() => ['nexus', 'eclipse'].includes(plan), [plan]);
    const isEmpty = useMemo(() => energy?.current <= 0, [energy?.current]);

    // Hook para atualizar o timer a cada minuto se estiver em cooldown
    useEffect(() => {
        if (energy?.nextRefill && energy.current <= 0) {
            const updateTimer = () => {
                const diff = Math.max(0, energy.nextRefill - Date.now());
                if (diff <= 0) {
                    // Refresh opcional ou deixar o contexto lidar
                }
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                setTimeLeft(`${h}h ${m}m`);
            };

            updateTimer(); // Initial
            const interval = setInterval(updateTimer, 60000);

            return () => clearInterval(interval);
        }
    }, [energy?.nextRefill, energy?.current]);

    if (!energy) return null;

    return (
        <div className="fixed top-16 right-4 z-20 text-white animate-in slide-in-from-top-4 fade-in duration-500 select-none group">
            <div className={`
                flex items-center gap-2 pl-3 pr-4 py-2 rounded-full border shadow-lg backdrop-blur-md transition-all
                ${isEmpty
                    ? 'bg-red-500/10 border-red-500/30 shadow-red-500/10'
                    : isInfinite
                        ? plan === 'eclipse' ? 'bg-violet-500/10 border-violet-500/30' : 'bg-amber-500/10 border-amber-500/30'
                        : 'bg-gray-800/80 border-white/10'
                }
            `}>
                <div className={`
                    w-6 h-6 rounded-full flex items-center justify-center
                    ${isEmpty ? 'bg-red-500/20 text-red-400' : isInfinite ? (plan === 'eclipse' ? 'bg-violet-500/20 text-violet-400' : 'bg-amber-500/20 text-amber-400') : 'bg-white/10 text-yellow-400'}
                `}>
                    {isEmpty ? <ZapOff size={14} /> : <Zap size={14} className={isInfinite ? "" : "fill-current"} />}
                </div>

                <div className="flex flex-col leading-none">
                    <span className={`text-xs font-bold font-mono ${isEmpty ? 'text-red-400' : 'text-gray-200'}`}>
                        {isInfinite ? "∞" : isEmpty ? timeLeft || "..." : `${energy.current}/${energy.max}`}
                    </span>
                    <span className="text-[9px] text-gray-400 font-medium uppercase tracking-wider">
                        {plan === 'eclipse' ? 'A G E N T' : plan === 'nexus' ? 'N E X U S' : isEmpty ? 'COOLDOWN' : 'ENERGY'}
                    </span>
                </div>
            </div>

            {/* Tooltip Detalhado */}
            <div className="absolute top-full right-0 mt-2 w-56 p-3 bg-[#161b22] border border-white/10 rounded-xl shadow-xl opacity-0 scale-95 group-hover:opacity-100 group-hover:scale-100 pointer-events-none transition-all z-[100]">
                <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-gray-300 uppercase">Seu Plano</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${plan === 'eclipse' ? 'bg-violet-500/20 text-violet-400' :
                        plan === 'nexus' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-700 text-gray-300'
                        }`}>
                        {plan}
                    </span>
                </div>

                {plan === 'spark' && (
                    <div className="space-y-2">
                        <div className="w-full bg-gray-700 h-1.5 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-500 ${isEmpty ? 'bg-red-500' : 'bg-yellow-400'}`}
                                style={{ width: `${(energy.current / energy.max) * 100}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-gray-500 leading-tight">
                            {isEmpty
                                ? "Você esgotou seu pool de energia. Aguarde o contador zerar para continuar."
                                : "Energia recarrega automaticamente após esgotar (Cooldown de 3h)."
                            }
                        </p>
                    </div>
                )}

                {isInfinite && (
                    <p className="text-[10px] text-gray-400 leading-tight">
                        Você tem poder ilimitado. Use com sabedoria, {plan === 'eclipse' ? 'Agente' : 'Mestre'}.
                    </p>
                )}
            </div>
        </div>
    );
});


function App() {
    // Pré-carregamento em segundo plano
    const preloader = usePreloader();

    // Boot state
    const [appState, setAppState] = useState("BOOTING");
    const [bootStatus, setBootStatus] = useState("Conectando ao núcleo...");

    // UI state
    const [homeInput, setHomeInput] = useState("");

    const [isStreaming, setIsStreaming] = useState(false);
    const [streamBuffer, setStreamBuffer] = useState("");
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem("luna-theme") || "dark");
    const [unreadCount, setUnreadCount] = useState(0);

    // Tool state
    const [activeMenu, setActiveMenu] = useState(null);
    const [toolStatus, setToolStatus] = useState(null);
    const [activeTool, setActiveTool] = useState(null);
    const activeToolRef = useRef(null);
    const [streamThought, setStreamThought] = useState(null);
    const [isThinkingMode, setIsThinkingMode] = useState(false);
    const [isCanvasMode, setIsCanvasMode] = useState(false);
    const [studyModeOpen, setStudyModeOpen] = useState(false);
    const [ideMode, setIdeMode] = useState(false);
    const [businessModeOpen, setBusinessModeOpen] = useState(false);
    const [healthModeOpen, setHealthModeOpen] = useState(false);
    const [settingsTab, setSettingsTab] = useState("general");
    const [learningNotification, setLearningNotification] = useState(null);
    const [changelogModalOpen, setChangelogModalOpen] = useState(false);
    const [changelogData, setChangelogData] = useState(null);
    const [currentAppVersion, setCurrentAppVersion] = useState(null);
    
    // Loading states com feedbacks
    const [loadingState, setLoadingState] = useState(null); // { message, subMessage, type }
    const [operationFeedback, setOperationFeedback] = useState(null); // Feedback durante operações
    const auth = useAuth();
    const { user, profile } = auth;

    // Energy check - available component-wide
    const hasEnergy = (!auth.isAuthenticated) || (auth.plan === 'nexus') || (auth.energy?.current > 0);

    // Custom hooks
    const chat = useChat();
    const artifacts = useArtifacts(chat.currentChatId, chat.persistChat);
    const attachmentsHook = useAttachments(setToolStatus);

    // Refs
    const messagesEndRef = useRef(null);
    const homeInputRef = useRef(null);
    const chatInputRef = useRef(null);

    // Solicitar permissão de notificação no montar
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    // Fix para inputs que param de funcionar (funciona no navegador e Electron)
    useEffect(() => {
        let clickTimeout = null;
        let lastClickTime = 0;
        let clickCount = 0;
        let lastClickedInput = null;

        const handleInputClick = (e) => {
            const target = e.target;
            // Verifica se é um input ou textarea
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
                // Não interfere se o input está desabilitado
                if (target.disabled || target.readOnly) return;

                const now = Date.now();
                const isSameInput = lastClickedInput === target;
                
                // Detecta múltiplos cliques rápidos no mesmo input (sinal de que não está respondendo)
                if (isSameInput && now - lastClickTime < 500) {
                    clickCount++;
                    if (clickCount >= 2) {
                        // Força o foco se múltiplos cliques não funcionaram
                        setTimeout(() => {
                            if (document.activeElement !== target) {
                                console.log('[INPUT-FIX] Input não responsivo após múltiplos cliques, forçando foco...');
                                // Força blur e focus para resetar
                                target.blur();
                                setTimeout(() => {
                                    target.focus();
                                    // Se ainda não funcionou, tenta via Electron (se disponível)
                                    if (window.electron?.inputFix) {
                                        window.electron.inputFix.forceFocus();
                                        setTimeout(() => target.focus(), 50);
                                    }
                                }, 10);
                            }
                            clickCount = 0;
                        }, 50);
                    }
                } else {
                    clickCount = 1;
                }
                lastClickTime = now;
                lastClickedInput = target;

                // Timeout de segurança: se após 150ms o input não estiver focado, força
                clearTimeout(clickTimeout);
                clickTimeout = setTimeout(() => {
                    if (document.activeElement !== target && target === lastClickedInput) {
                        console.log('[INPUT-FIX] Input não ganhou foco após clique, forçando...');
                        target.blur();
                        setTimeout(() => {
                            target.focus();
                            // Tenta via Electron se disponível
                            if (window.electron?.inputFix) {
                                window.electron.inputFix.forceFocus();
                            }
                        }, 10);
                    }
                }, 150);
            }
        };

        // Adiciona listener global para cliques em inputs (capture phase para pegar antes de outros handlers)
        document.addEventListener('mousedown', handleInputClick, true);
        document.addEventListener('click', handleInputClick, true);

        return () => {
            document.removeEventListener('mousedown', handleInputClick, true);
            document.removeEventListener('click', handleInputClick, true);
            if (clickTimeout) clearTimeout(clickTimeout);
        };
    }, []);

    // Theme Effect
    // Theme Effect (Sync Cloud <-> Local)
    useEffect(() => {
        // 1. Load from Cloud (Priority)
        if (profile?.preferences?.theme && profile.preferences.theme !== theme) {
            setTheme(profile.preferences.theme);
        }
    }, [profile]);

    useEffect(() => {
        // 2. Apply Theme
        document.documentElement.classList.remove(
            "dark", "dark-ocean", "dark-forest",
            "light", "light-sky", "light-mint"
        );
        document.documentElement.classList.add(theme);
        localStorage.setItem("luna-theme", theme);

        // 3. Persist to Cloud
        if (user && profile?.preferences && profile.preferences.theme !== theme) {
            const timer = setTimeout(() => {
                auth.updateProfile({
                    preferences: { ...profile.preferences, theme }
                });
            }, 1000); // Debounce to avoid rapid writes
            return () => clearTimeout(timer);
        }
    }, [theme]);

    const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");

    // Boot Sequence
    useEffect(() => {
        let retries = 0;
        const maxRetries = 30; // Limita a 60 segundos (30 * 2s)
        const checkHealth = async () => {
            try {
                console.log(`[BOOT] Tentando conectar a ${MEMORY_SERVER}/health (tentativa ${retries + 1})`);
                
                // Timeout manual para compatibilidade
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 5000);
                
                const r = await fetch(`${MEMORY_SERVER}/health`, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    signal: controller.signal
                });
                
                clearTimeout(timeoutId);
                
                if (!r.ok) {
                    throw new Error(`HTTP ${r.status}: ${r.statusText}`);
                }
                
                const d = await r.json();
                console.log('[BOOT] Resposta do servidor:', d);
                
                if (d.status === "ready") {
                    setBootStatus("Carregando memórias...");
                    setLoadingState({ message: "Carregando memórias", subMessage: "Preparando sua experiência", type: "loading" });
                    await chat.loadChats();
                    setLoadingState({ message: "Tudo pronto!", subMessage: "Bem-vindo de volta", type: "success" });
                    setTimeout(() => {
                        setLoadingState(null);
                        setAppState("READY");
                    }, 500);
                } else {
                    retries++;
                    setBootStatus(`Aquecendo motores neurais... (${retries})`);
                    setLoadingState({ message: "Aquecendo motores neurais", subMessage: `Tentativa ${retries}/${maxRetries}`, type: "processing" });
                    if (retries < maxRetries) {
                        setTimeout(checkHealth, 1000);
                    } else {
                        setBootStatus(`Servidor não está pronto. Tentando novamente...`);
                        setLoadingState({ message: "Servidor não está pronto", subMessage: "Tentando novamente...", type: "loading" });
                        retries = 0;
                        setTimeout(checkHealth, 2000);
                    }
                }
            } catch (e) {
                retries++;
                console.error(`[BOOT] Erro na conexão (tentativa ${retries}):`, e);
                setBootStatus(`Tentando conexão com servidor... (${retries}/${maxRetries})`);
                setLoadingState({ message: "Tentando conexão", subMessage: `Tentativa ${retries}/${maxRetries}`, type: "loading" });
                
                // Após muitas tentativas, mostra erro mas continua tentando
                if (retries >= maxRetries) {
                    setBootStatus(`Não foi possível conectar ao servidor em ${MEMORY_SERVER}. Verifique se o servidor Python está rodando.`);
                    setLoadingState({ message: "Servidor não encontrado", subMessage: "Verifique se o servidor está rodando", type: "loading" });
                    retries = 0; // Reinicia contador
                }
                
                setTimeout(checkHealth, 2000);
            }
        };
        checkHealth();
    }, []);

    // Trigger initial overlay if enabled
    useEffect(() => {
        chat.loadChats();
    }, []);

    // Verificar versão e mostrar changelog após atualização
    useEffect(() => {
        const checkVersionAndShowChangelog = async () => {
            try {
                console.log('[CHANGELOG] Iniciando verificação de versão...');
                
                // Obtém a versão atual do package.json
                const version = await getCurrentVersion();
                console.log('[CHANGELOG] Versão atual detectada:', version);
                setCurrentAppVersion(version);

                // Verifica a última versão vista pelo usuário
                const lastSeenVersion = localStorage.getItem('luna-last-seen-version');
                console.log('[CHANGELOG] Última versão vista:', lastSeenVersion);
                
                // Sempre tenta carregar o changelog para a versão atual
                // Se a versão for diferente da última vista OU se não há versão salva, mostra
                const shouldShow = !lastSeenVersion || lastSeenVersion !== version;
                
                if (shouldShow && version) {
                    console.log('[CHANGELOG] Verificando changelog para versão:', version);
                    
                    // Carrega o CHANGELOG.md
                    try {
                        const response = await fetch('/CHANGELOG.md');
                        console.log('[CHANGELOG] Resposta do fetch:', response.status, response.statusText);
                        
                        if (response.ok) {
                            const changelogContent = await response.text();
                            console.log('[CHANGELOG] Conteúdo carregado, tamanho:', changelogContent.length);
                            
                            const parsedData = parseChangelogVersion(changelogContent, version);
                            console.log('[CHANGELOG] Dados parseados:', parsedData);
                            
                            if (parsedData && (parsedData.features?.length > 0 || parsedData.improvements?.length > 0 || parsedData.bugfixes?.length > 0 || parsedData.raw)) {
                                setChangelogData(parsedData);
                                setChangelogModalOpen(true);
                                console.log('[CHANGELOG] Modal será exibido!');
                                // NÃO salva a versão aqui - será salva quando o modal for fechado
                            } else {
                                console.warn('[CHANGELOG] Não foi possível parsear os dados da versão', version, 'ou changelog vazio');
                                // Mesmo sem changelog, salva a versão para não tentar novamente
                                if (!lastSeenVersion) {
                                    localStorage.setItem('luna-last-seen-version', version);
                                }
                            }
                        } else {
                            console.error('[CHANGELOG] Erro ao carregar CHANGELOG.md:', response.status, response.statusText);
                            // Tenta caminho alternativo
                            try {
                                const altResponse = await fetch('./CHANGELOG.md');
                                if (altResponse.ok) {
                                    const changelogContent = await altResponse.text();
                                    const parsedData = parseChangelogVersion(changelogContent, version);
                                    if (parsedData && (parsedData.features?.length > 0 || parsedData.improvements?.length > 0 || parsedData.bugfixes?.length > 0)) {
                                        setChangelogData(parsedData);
                                        setChangelogModalOpen(true);
                                    }
                                }
                            } catch (altError) {
                                console.error('[CHANGELOG] Erro no caminho alternativo:', altError);
                            }
                            // Se não conseguiu carregar, salva a versão para não tentar infinitamente
                            if (!lastSeenVersion) {
                                localStorage.setItem('luna-last-seen-version', version);
                            }
                        }
                    } catch (error) {
                        console.error('[CHANGELOG] Erro ao carregar CHANGELOG.md:', error);
                        // Se não conseguiu carregar, salva a versão para não tentar infinitamente
                        if (!lastSeenVersion) {
                            localStorage.setItem('luna-last-seen-version', version);
                        }
                    }
                } else {
                    console.log('[CHANGELOG] Versão já vista ou não há versão, não exibindo modal. Last seen:', lastSeenVersion, 'Current:', version);
                }
            } catch (error) {
                console.error('[CHANGELOG] Erro ao verificar versão:', error);
            }
        };

        // Aguarda o app estar pronto antes de verificar
        if (appState === "READY") {
            // Pequeno delay para garantir que tudo está carregado
            setTimeout(() => {
                checkVersionAndShowChangelog();
            }, 1000);
        }
    }, [appState]);

    // Integração com sistema de autoupdate - detecta quando atualização foi instalada
    useEffect(() => {
        if (!window.electron?.updater) return;

        const updater = window.electron.updater;

        // Quando uma atualização é baixada e instalada, o app reinicia
        // Na próxima inicialização, a versão será diferente e o modal aparecerá
        updater.onUpdateDownloaded((data) => {
            console.log('[CHANGELOG] Atualização baixada, versão:', data.version);
            // Não mostra o modal aqui, pois o app vai reiniciar
            // O modal será mostrado na próxima inicialização
        });
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chat.messages, streamBuffer]);

    // Reset unread count when entering chat
    useEffect(() => {
        if (chat.view === "CHAT") {
            setUnreadCount(0);
        }
    }, [chat.view]);

    // Auto-resize Input (Home only)
    useEffect(() => {
        if (homeInputRef.current) {
            homeInputRef.current.style.height = "auto";
            homeInputRef.current.style.height = Math.min(homeInputRef.current.scrollHeight, 160) + "px";
        }
    }, [homeInput]);

    // Memoize artifact messages for sidebar
    const artifactMessages = useMemo(() => {
        return chat.messages.filter(m => m.artifact);
    }, [chat.messages]);

    const startNewChat = useCallback(() => {
        if (chat.isStreamingRef.current) return;
        chat.startNewChat();
        setStreamBuffer(""); // Limpa buffer para compatibilidade
    }, [chat]);

    const loadChat = useCallback(async (id) => {
        if (chat.isStreamingRef.current) return;
        await chat.loadChat(id);
        setStreamBuffer(""); // Limpa buffer para compatibilidade
    }, [chat]);

    const stopGeneration = useCallback(() => {
        // Reset streaming state (não há mais WebSocket para fechar)
        chat.isStreamingRef.current = false;
        setIsStreaming(false);
    }, [chat]);

    const sendMessage = useCallback(async (textInput = null) => {
        // Prevent race conditions / double submits synchronously
        if (chat.isStreamingRef.current) return;
        // Determine text source: argument (from ChatInput/Suggestions) or homeInput state
        const text = (typeof textInput === 'string' ? textInput : homeInput).trim();

        // Allow sending if there are attachments even if text is empty
        // Efeito de bloqueio se sem energia
        const hasEnergy = (!auth.isAuthenticated) || (auth.plan === 'nexus') || (auth.energy.current > 0);

        const handleSend = async (text, attachments = [], documentAttachments = []) => {
            // Feedback inicial
            setOperationFeedback({ message: "Analisando sua mensagem", type: "analyzing" });
            if (!text.trim() && attachments.length === 0 && documentAttachments.length === 0) return;

            // Verificar Energia antes de enviar
            if (auth.isAuthenticated && auth.plan !== 'nexus') {
                const cost = 1; // Basic chat cost
                if (!auth.consumeEnergy(cost)) {
                    // Show upgrade prompt (idealmente um toast ou modal, por enquanto só log)
                    console.log("Sem energia!");
                    return;
                }
            }

            // Prevent race conditions / double submits synchronously
            if (chat.isStreamingRef.current) return;

            // Ocultar mensagem de boas-vindas se for a primeira mensagem
            // Assuming setShowWelcome is a state setter for a welcome message
            // If not defined, this line might cause an error or needs to be removed/adapted.
            // For now, I'll assume it's defined or can be ignored if not relevant.
            // setShowWelcome(false); // Update UI state
            setToolStatus(null); // Reset status
            setActiveTool(null); // Reset active tool
            setStreamThought(null); // Reset thought

            // If coming from home, switch view first
            if (chat.view === "HOME") {
                chat.setView("CHAT");
                setHomeInput(""); // Clear home input
            }

            const currentAttachments = [...attachments];
            const currentDocuments = [...documentAttachments];

            // Build message content with document context
            let messageContent = text;
            if (currentDocuments.length > 0) {
                const docContext = currentDocuments.map(doc =>
                    `[DOCUMENTO: ${doc.filename}]\n${doc.content.slice(0, 15000)}`  // Limit per doc
                ).join("\n\n");
                messageContent = text ? `${text}\n\n--- Documentos anexados ---\n${docContext}` : `Analise estes documentos:\n${docContext}`;
            }

            // Prepare Message
            const newMessage = {
                role: "user",
                content: messageContent || (currentAttachments.length > 0 ? "Analise estas imagens:" : "."),
                images: currentAttachments,
                documents: currentDocuments.map(d => d.filename), // Store filenames for display
                timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            };

            const next = [...chat.messages, newMessage];
            chat.setMessages(next);

            // Start Streaming State
            chat.isStreamingRef.current = true;
            setIsStreaming(true);

            // Input clearing handled by components or setHomeInput above
            attachmentsHook.clearAttachments(); // Clear attachments immediately
            setStreamBuffer(""); // Mantido para compatibilidade com componentes, mas não será atualizado durante streaming

            // Persist immediately after user message to ensure it's there even if request fails
            // AWAIT this to get the real ID if it was null
            let activeChatId = chat.currentChatId;
            const newId = await chat.persistChat(next, activeChatId);
            if (newId) {
                activeChatId = newId;
                // setCurrentChatId(newId); // Already done in chat.persistChat, but good for local clarity if needed
            }

            try {
                // Feedback: Processando
                setOperationFeedback({ message: "Processando sua solicitação", subMessage: "Aguarde um momento...", type: "processing" });
                
                // Usa endpoint não-streaming
                const response = await fetch(`${MEMORY_SERVER}/agent/message`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        messages: next,
                        agent_mode: true,
                        deep_thinking: isThinkingMode,
                        active_artifact_id: artifacts.activeArtifact?.id,
                        user_id: user?.uid || null,
                        user_name: profile?.displayName || user?.displayName || "Usuário"
                    }),
                });

                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }

                // Feedback: Analisando resposta
                setOperationFeedback({ message: "Analisando resposta", subMessage: "Preparando conteúdo...", type: "analyzing" });
                
                const data = await response.json();

                if (!data.success) {
                    throw new Error(data.error || "Erro desconhecido");
                }

                // Processa eventos retornados
                let fullText = "";
                let currentThought = data.thought || null;
                let hasArtifact = false;
                let currentArtifact = data.artifact || null;
                let summaryText = "";

                // Processa tool calls e results
                if (data.events && Array.isArray(data.events)) {
                    for (const event of data.events) {
                        // Processa tool calls
                        if (event.tool_call) {
                            const toolName = event.tool_call.name;
                            console.log("[TOOL_CALL]", toolName, event.tool_call.args);

                            if (toolName === "think") {
                                const thoughtArg = event.tool_call.args.detailed_thought;
                                currentThought = parseThought(thoughtArg);
                            } else {
                                let toolInfo = { name: toolName, message: "Executando ferramenta...", args: event.tool_call.args };
                                if (toolName === "web_search") {
                                    toolInfo.message = `Pesquisando: ${event.tool_call.args.query || '...'}`;
                                    toolInfo.icon = "search";
                                }
                                if (toolName === "read_url") {
                                    toolInfo.message = `Lendo página: ${event.tool_call.args.url || '...'}`;
                                    toolInfo.icon = "read";
                                }
                                
                                // Record to tool history
                                const historyEntry = {
                                    ...toolInfo,
                                    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                };
                                chat.setToolHistory(prev => [...prev, historyEntry]);
                            }
                        }

                        // Processa tool results
                        if (event.tool_result) {
                            const result = event.tool_result;
                            if (result.success) {
                                if (result.artifact) {
                                    console.log("[CANVAS] Artifact received:", result.artifact.title);
                                    artifacts.setActiveArtifact(result.artifact);
                                    artifacts.setCanvasOpen(true);
                                    currentArtifact = result.artifact;
                                    hasArtifact = true;
                                } else if (result.content && (result.content.includes("TITULO:") || result.content.length > 50)) {
                                    chat.setMessages(prev => {
                                        return [...prev, {
                                            role: "tool-card",
                                            content: result.content,
                                            type: result.content.includes("TITULO:") ? "search" : "read"
                                        }];
                                    });
                                }
                            }
                        }

                        // Acumula conteúdo
                        if (event.content) {
                            let filteredContent = filterToolCallLeaks(event.content);
                            const specialTokensRegex = /<\s*\|\s*tool_calls_(begin|end)\s*\|\s*>|<\s*\|\s*tool_call_(begin|end)\s*\|\s*>|<\s*\|\s*tool_sep\s*\|\s*>/g;
                            filteredContent = filteredContent.replace(specialTokensRegex, "");

                            if (filteredContent && filteredContent.trim()) {
                                if (hasArtifact) {
                                    summaryText += filterSummaryText(filteredContent);
                                } else {
                                    fullText += filteredContent;
                                }
                            }
                        }
                    }
                }

                // Usa mensagem completa do backend se disponível
                if (data.message) {
                    fullText = data.message;
                }
                
                // Apply content cleanup to remove leaked tool calls and malformed responses
                const cleanedText = cleanContent(fullText);

                // Adiciona mensagem final
                if (cleanedText.trim() && !hasArtifact) {
                    const finalAssistantMsg = {
                        role: "assistant",
                        content: cleanedText.trim(),
                        thought: currentThought,
                        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    };

                    chat.setMessages(prev => {
                        const finalMessages = [...prev, finalAssistantMsg];
                        chat.persistChat(finalMessages, activeChatId);
                        return finalMessages;
                    });
                } else if (hasArtifact && currentArtifact) {
                    const noteMsg = {
                        role: "assistant",
                        content: generateArtifactSummary(currentArtifact, summaryText),
                        artifact: currentArtifact,
                        thought: currentThought,
                        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                    };
                    chat.setMessages(prev => {
                        const finalMessages = [...prev, noteMsg];
                        chat.persistChat(finalMessages, activeChatId);
                        return finalMessages;
                    });
                }

                // Limpa estados
                setStreamBuffer(""); // Mantido para compatibilidade
                setStreamThought(null); // Mantido para compatibilidade
                setToolStatus(null);
                setActiveTool(null);
                activeToolRef.current = null;
                setOperationFeedback(null); // Limpa feedback

                chat.isStreamingRef.current = false;
                setIsStreaming(false);

                chat.loadChats();

            } catch (e) {
                console.error("[SEND] Erro:", e);
                chat.setMessages(prev => [...prev, { role: "assistant", content: `Erro: ${e.message}` }]);
                setToolStatus({ message: "Erro na conexão", type: 'error' });
                setOperationFeedback(null); // Limpa feedback em caso de erro
                setTimeout(() => setToolStatus(null), 3000);

                chat.isStreamingRef.current = false;
                setIsStreaming(false);
            }
        };

        // Call the new handleSend function with current inputs
        await handleSend(text, attachmentsHook.attachments, attachmentsHook.documentAttachments);
    }, [chat, homeInput, attachmentsHook, auth, isThinkingMode, artifacts, user, profile, setToolStatus, setActiveTool, setStreamThought, setHomeInput, setStreamBuffer, setIsStreaming]);

    const regenerateResponse = useCallback(async (messageIndex) => {
        // Find the last user message before this assistant message
        let lastUserMsgIndex = -1;
        for (let i = messageIndex - 1; i >= 0; i--) {
            if (chat.messages[i].role === "user") {
                lastUserMsgIndex = i;
                break;
            }
        }

        if (lastUserMsgIndex === -1) return;

        // Remove all messages AFTER the user message (keep user message)
        const newMessages = chat.messages.slice(0, lastUserMsgIndex + 1);

        chat.setMessages(newMessages);

        // Prepara nova mensagem e usa sendMessage para reutilizar a lógica
        const lastUserMsg = newMessages[newMessages.length - 1];
        // Atualiza o input home com a última mensagem do usuário para reenviar
        setHomeInput(lastUserMsg.content || "");
        // Usa sendMessage com o texto da última mensagem do usuário
        setTimeout(() => {
            sendMessage(lastUserMsg.content);
        }, 100);
    }, [chat.messages, chat.setMessages, sendMessage, setHomeInput]);

    const handleHomeKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    if (appState === "BOOTING") {
        return (
            <div className="flex h-screen w-screen bg-[var(--bg-primary)] items-center justify-center flex-col text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--bg-secondary)_0%,_var(--bg-primary)_100%)] opacity-50" />
                <div className="z-10 flex flex-col items-center gap-6 animate-in fade-in zoom-in duration-1000">
                    <div className="relative">
                        <div className="w-24 h-24 bg-violet-600/20 rounded-full animate-ping absolute inset-0" />
                        <Bot size={96} className="text-violet-500 relative z-10 drop-shadow-[0_0_30px_rgba(139,92,246,0.5)]" />
                    </div>
                    <h1 className="text-3xl font-bold text-white tracking-tight">Luna AI</h1>
                    {loadingState ? (
                        <LoadingFeedback 
                            message={loadingState.message} 
                            subMessage={loadingState.subMessage}
                            type={loadingState.type}
                            size="default"
                        />
                    ) : (
                        <div className="flex items-center gap-3 text-blue-300/80 bg-blue-900/20 px-4 py-2 rounded-full border border-blue-500/10">
                            <Loader2 size={16} className="animate-spin" />
                            <span className="text-sm font-medium">{bootStatus}</span>
                        </div>
                    )}
                </div>
            </div>
        );
    }


    return (
        <div className={`flex h-screen w-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden relative ${artifacts.canvasOpen ? 'split-view' : ''}`}>


            {/* Sidebar Backdrop - Click to close */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 z-[150] transition-opacity duration-200"
                    style={{ 
                        opacity: sidebarOpen ? 1 : 0,
                        willChange: 'opacity',
                        pointerEvents: sidebarOpen ? 'auto' : 'none'
                    }}
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar (Overlay/Slide) - Optimized */}
            <div 
                className={`fixed inset-y-0 left-0 z-[160] w-[280px] bg-[var(--bg-glass-solid)] border-r border-white/10 ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}
                style={{
                    willChange: 'transform',
                    transform: sidebarOpen ? 'translate3d(0, 0, 0)' : 'translate3d(-100%, 0, 0)',
                    transition: 'transform 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                    contain: 'layout style paint'
                }}
            >
                <div className="p-4 pt-12 flex flex-col h-full">
                    <button onClick={startNewChat} className="flex items-center gap-3 px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-lg shadow-blue-900/20 mb-3">
                        <Plus size={18} />
                        <span className="font-medium">Nova Conversa</span>
                    </button>

                    {/* Artifacts Quick Access */}
                    {artifactMessages.length > 0 && (
                        <div className="mb-4">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2 flex items-center gap-2">
                                <PanelRight size={12} />
                                Artefatos
                            </div>
                            <div className="space-y-1 max-h-[200px] overflow-y-auto">
                                {artifactMessages.map((m, idx) => (
                                    <button
                                        key={m.artifact.id || idx}
                                        onClick={() => {
                                            artifacts.setActiveArtifact(m.artifact);
                                            artifacts.setCanvasOpen(true);
                                            setSidebarOpen(false);
                                        }}
                                        className={`w-full text-left px-3 py-2 rounded-lg hover:bg-violet-500/10 transition-colors flex items-center gap-2 text-sm ${artifacts.activeArtifact?.id === m.artifact.id ? 'bg-violet-500/20 text-violet-300' : 'text-gray-400'}`}
                                    >
                                        <FileText size={14} className="shrink-0 text-violet-400" />
                                        <span className="truncate">{m.artifact.title}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Study Mode Button */}
                    <button
                        onClick={() => { setStudyModeOpen(true); setSidebarOpen(false); }}
                        className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-violet-600/20 to-purple-600/20 hover:from-violet-600/30 hover:to-purple-600/30 border border-violet-500/30 rounded-xl transition-all mb-4"
                    >
                        <BookOpen size={18} className="text-violet-400" />
                        <span className="text-sm text-violet-300">Modo de Estudo</span>
                    </button>

                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">Recentes</div>
                    <div className="flex-1 overflow-y-auto space-y-1 pr-2 custom-scrollbar" style={{ contain: 'layout style paint' }}>
                        {chat.chats.map(c => (
                            <div key={c.id} className="relative group">
                                <div
                                    role="button"
                                    onClick={() => { loadChat(c.id); setSidebarOpen(false); }}
                                    className={`w-full text-left px-3 py-3 rounded-lg hover:bg-white/5 transition-colors flex items-center justify-between group cursor-pointer ${chat.currentChatId === c.id ? 'bg-white/10' : ''}`}
                                >
                                    <div className="flex items-center gap-3 truncate pr-8">
                                        <MessageSquare size={16} className={`shrink-0 ${chat.currentChatId === c.id ? 'text-blue-400' : 'text-gray-400 group-hover:text-blue-400'}`} />
                                        <span className="truncate text-sm text-gray-300 group-hover:text-white">{c.title || "Sem título"}</span>
                                    </div>

                                    <button
                                        onClick={(e) => { e.stopPropagation(); setActiveMenu(activeMenu === c.id ? null : c.id); }}
                                        className="p-1 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
                                    >
                                        <MoreHorizontal size={14} className="text-gray-400" />
                                    </button>
                                </div>

                                {/* Dropdown Menu - Optimized */}
                                {activeMenu === c.id && (
                                    <div 
                                        className="absolute right-2 top-10 w-32 bg-[#161b22] border border-white/10 rounded-lg shadow-xl z-50 text-sm overflow-hidden"
                                        style={{
                                            willChange: 'transform, opacity',
                                            transform: 'translateZ(0)',
                                            animation: 'fadeInUp 0.15s ease-out',
                                            contain: 'layout style paint'
                                        }}
                                    >
                                        <button
                                            onClick={(e) => { chat.renameChat(e, c.id, c.title); setActiveMenu(null); }}
                                            className="w-full text-left px-4 py-2 hover:bg-white/5 text-gray-300 hover:text-white flex items-center gap-2"
                                        >
                                            <PenTool size={12} /> Renomear
                                        </button>
                                        <button
                                            onClick={(e) => { chat.deleteChat(e, c.id); setActiveMenu(null); }}
                                            className="w-full text-left px-4 py-2 hover:bg-red-900/20 text-red-400 hover:text-red-300 flex items-center gap-2"
                                        >
                                            <X size={12} /> Excluir
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Profile & Settings Menu */}
                    <SidebarProfile chat={chat} setSettingsTab={setSettingsTab} />
                </div>
            </div>

            {/* Overlay removed - already handled in Sidebar Backdrop above */}

            {/* Hidden File Input */}
            <input
                type="file"
                ref={attachmentsHook.fileInputRef}
                onChange={attachmentsHook.handleFileSelect}
                className="hidden"
                multiple
                accept="image/*,.pdf,.txt,application/pdf,text/plain"
            />

            {/* Main Content */}
            <main className={`flex-1 flex flex-col h-full relative z-10 ${businessModeOpen || healthModeOpen ? 'hidden' : ''}`}>
                {/* Header */}
                {!ideMode && chat.view !== "SETTINGS" && (
                    <header className="absolute top-0 left-0 w-full p-4 flex items-center justify-between z-20" style={{ WebkitAppRegion: "drag" }}>
                        <div className="flex items-center gap-4 pointer-events-auto pt-2 pl-2 relative z-[60]" style={{ WebkitAppRegion: "no-drag" }}>
                            <button onClick={() => { setSidebarOpen(true); setUnreadCount(0); }} className="p-2 hover:bg-white/10 rounded-lg transition-colors relative">
                                <Menu size={24} className="text-gray-300" />
                                {unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 flex h-4 w-4">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-4 w-4 bg-blue-500 text-[10px] items-center justify-center font-bold text-white shadow-lg">
                                            {unreadCount}
                                        </span>
                                    </span>
                                )}
                            </button>
                            <div className="flex items-center gap-2 opacity-80" onClick={() => { chat.setView("HOME"); chat.setMessages([]); }} role="button">
                                <Bot size={24} className="text-violet-500" />
                                <span className="font-semibold text-lg tracking-tight">Luna</span>
                            </div>
                        </div>
                        <div className="pointer-events-auto pt-2 pr-2 flex items-center gap-2 relative z-[60]" style={{ WebkitAppRegion: "no-drag" }}>
                            {/* IDE Mode Toggle */}
                            <button
                                onClick={() => {
                                    if (auth.plan === 'eclipse') {
                                        setIdeMode(!ideMode);
                                    } else {
                                        chat.setView("SETTINGS");
                                        setSettingsTab("premium");
                                    }
                                }}
                                className={`p-2 hover:bg-white/10 rounded-lg transition-colors ${ideMode ? 'bg-green-500/20 text-green-400' : 'text-gray-400'}`}
                                title={ideMode ? "Voltar para Chat" : (auth.plan === 'eclipse' ? "Modo IDE" : "Modo IDE (Requer Eclipse)")}
                            >
                                <Code size={20} />
                            </button>

                            {/* Business Mode Toggle */}
                            <button
                                onClick={() => {
                                    setBusinessModeOpen(true);
                                    setHealthModeOpen(false); // Fecha Health Mode se estiver aberto
                                }}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-emerald-400"
                                title="Luna Gestão"
                            >
                                <Building2 size={20} />
                            </button>

                            {/* Health Mode Toggle */}
                            <button
                                onClick={() => {
                                    setHealthModeOpen(true);
                                    setBusinessModeOpen(false); // Fecha Business Mode se estiver aberto
                                }}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-green-400"
                                title="Luna Health"
                            >
                                <Heart size={20} />
                            </button>

                            {/* Canvas Toggle */}
                            {artifacts.activeArtifact && !ideMode && (
                                <button
                                    onClick={() => artifacts.setCanvasOpen(!artifacts.canvasOpen)}
                                    className={`p-2 hover:bg-white/10 rounded-lg transition-colors ${artifacts.canvasOpen ? 'bg-violet-500/20 text-violet-400' : 'text-gray-400'}`}
                                    title={artifacts.canvasOpen ? "Fechar Canvas" : "Abrir Canvas"}
                                >
                                    <PanelRight size={20} />
                                </button>
                            )}

                            {/* Tool History Toggle (only in CHAT view with history) */}
                            {chat.view === "CHAT" && chat.toolHistory.length > 0 && (
                                <button
                                    onClick={() => chat.setShowToolHistory(!chat.showToolHistory)}
                                    className={`p-2 hover:bg-white/10 rounded-lg transition-colors relative ${chat.showToolHistory ? 'bg-white/10' : ''}`}
                                    title="Histórico de Ferramentas"
                                >
                                    <History size={18} className="text-cyan-400" />
                                    <span className="absolute -top-1 -right-1 bg-cyan-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                        {chat.toolHistory.length}
                                    </span>
                                </button>
                            )}



                            {activeTool ? (
                                <div className="bg-gradient-to-r from-blue-600/30 to-violet-600/30 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-medium border border-blue-500/30 flex items-center gap-2 text-blue-200 shadow-lg">
                                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                                    {activeTool.icon === "search" && <Globe size={12} className="text-blue-400" />}
                                    {activeTool.icon === "read" && <FileText size={12} className="text-violet-400" />}
                                    {activeTool.message}
                                </div>
                            ) : toolStatus ? (
                                <div className="bg-blue-900/40 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-medium border border-blue-500/20 flex items-center gap-2 animate-pulse text-blue-200">
                                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
                                    {toolStatus.message}
                                </div>
                            ) : (
                                <div className="bg-white/10 backdrop-blur-md px-3 py-1.5 rounded-full text-xs font-medium border border-white/5 flex items-center gap-2">
                                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                                    Luna AI
                                </div>
                            )}
                        </div>

                    </header>
                )}

                {/* Tool History Panel */}
                {chat.showToolHistory && chat.toolHistory.length > 0 && (
                    <div className="absolute top-16 right-4 z-30 w-80 max-h-64 overflow-y-auto glass-panel rounded-xl p-3 shadow-xl animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
                            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <History size={14} className="text-cyan-400" />
                                Ferramentas Usadas
                            </h3>
                            <button onClick={() => chat.setShowToolHistory(false)} className="p-1 hover:bg-white/10 rounded">
                                <X size={14} />
                            </button>
                        </div>
                        {/* Energy Components with Timer Support */}
                        <div className="space-y-2">
                            {chat.toolHistory.map((tool, idx) => (
                                <div key={idx} className="flex items-start gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-colors">
                                    <div className="mt-0.5">
                                        {tool.icon === "search" ? <Globe size={12} className="text-blue-400" /> :
                                            tool.icon === "read" ? <FileText size={12} className="text-violet-400" /> :
                                                <CheckCircle2 size={12} className="text-green-400" />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{tool.name}</span>
                                            <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>{tool.timestamp}</span>
                                        </div>
                                        <p className="text-[10px] truncate" style={{ color: 'var(--text-secondary)' }}>
                                            {tool.args?.query || tool.args?.url || JSON.stringify(tool.args || {}).slice(0, 40)}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* View: SETTINGS */}
                {!ideMode && (chat.view === "SETTINGS") && (
                    <SettingsPage
                        initialTab={settingsTab}
                        theme={theme}
                        onThemeChange={setTheme}
                        onBack={() => chat.setView("HOME")}
                    />
                )}

                {/* IDE Mode View */}
                {ideMode && (
                    <div className={`flex-1 overflow-hidden ${ideMode ? '' : 'pt-12'}`}>
                        <IDEView onClose={() => setIdeMode(false)} />
                    </div>
                )}

                {/* View: HOME */}
                {!ideMode && (chat.view === "HOME") && (
                    <div className="flex-1 flex flex-col items-center overflow-y-auto p-6 animate-in fade-in zoom-in-95 duration-500 custom-scrollbar">
                        <div className="max-w-4xl w-full flex flex-col items-center gap-8 py-8">
                            {/* Hero Section */}
                            <div className="text-center space-y-3">
                                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-violet-500/20 to-blue-500/20 border border-violet-500/30 mb-4">
                                    <Zap size={14} className="text-violet-400" />
                                    <span className="text-xs font-medium text-violet-300">Powered by AI Agent</span>
                                </div>
                                <h1 className="text-4xl md:text-5xl font-bold text-center leading-tight bg-gradient-to-br from-white via-gray-200 to-gray-400 bg-clip-text text-transparent">
                                    {getGreeting()}, {profile?.name || (user?.email?.split('@')[0]) || 'usuário'}
                                </h1>
                                <p className="text-lg text-gray-400 max-w-lg mx-auto">
                                    O que você gostaria de explorar hoje?
                                </p>
                            </div>

                            {/* Input Bar (Home) */}
                            <div className="w-full max-w-2xl relative glass-bar rounded-3xl p-1 shadow-2xl shadow-violet-900/20 transition-all focus-within:ring-2 focus-within:ring-violet-500/50 flex flex-col">
                                {/* Attachment Previews */}
                                {(attachmentsHook.attachments.length > 0 || attachmentsHook.documentAttachments.length > 0) && (
                                    <div className="flex gap-2 p-4 pb-0 overflow-x-auto pb-2">
                                        {/* Image attachments */}
                                        {attachmentsHook.attachments.map((img, idx) => (
                                            <div key={`img-${idx}`} className="relative group shrink-0">
                                                <img src={img} alt="attachment" className="h-16 w-16 object-cover rounded-lg border border-white/20" />
                                                <button
                                                    onClick={() => attachmentsHook.setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                                    className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                        {/* Document attachments */}
                                        {attachmentsHook.documentAttachments.map((doc, idx) => (
                                            <div key={`doc-${idx}`} className="relative group shrink-0 flex items-center gap-2 px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                                                <FileText size={16} className="text-blue-400" />
                                                <span className="text-sm text-blue-300 max-w-[100px] truncate">{doc.filename}</span>
                                                <button
                                                    onClick={() => attachmentsHook.setDocumentAttachments(prev => prev.filter((_, i) => i !== idx))}
                                                    className="text-red-400 hover:text-red-300 transition-colors"
                                                >
                                                    <X size={14} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <textarea
                                    ref={homeInputRef}
                                    value={homeInput}
                                    onChange={(e) => setHomeInput(e.target.value)}
                                    onKeyDown={handleHomeKeyDown}
                                    onPaste={attachmentsHook.handlePaste}
                                    placeholder="Pergunte qualquer coisa..."
                                    className="w-full bg-transparent border-0 px-6 py-4 text-lg focus:ring-0 resize-none outline-none custom-scrollbar"
                                    style={{ color: 'var(--text-primary)' }}
                                    rows={1}
                                />
                                <div className="flex items-center justify-between px-4 pb-2">
                                    <div className="flex gap-2 text-gray-400">
                                        <button onClick={() => attachmentsHook.fileInputRef.current?.click()} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-blue-400" title="Anexar arquivo (imagem, PDF, TXT)"><Upload size={20} /></button>
                                        <button
                                            onClick={() => setIsThinkingMode(!isThinkingMode)}
                                            className={`p-2 hover:bg-white/10 rounded-lg transition-colors ${isThinkingMode ? "text-violet-400 bg-violet-500/10" : "text-gray-400"}`}
                                            title="Ativar Pensamento Profundo"
                                        >
                                            <Brain size={20} className={isThinkingMode ? "animate-pulse" : ""} />
                                        </button>
                                    </div>
                                    <button
                                        onClick={() => sendMessage()}
                                        disabled={!homeInput.trim() && attachmentsHook.attachments.length === 0}
                                        className={`p-3 rounded-xl transition-all ${(homeInput.trim() || attachmentsHook.attachments.length > 0) ? "bg-gradient-to-r from-violet-500 to-blue-500 text-white hover:scale-105 shadow-lg shadow-violet-500/25" : "bg-white/10 text-gray-500"}`}
                                    >
                                        <Send size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Luna Modes Section */}
                            <div className="w-full space-y-4">
                                <div className="flex items-center gap-2 px-1">
                                    <LayoutDashboard size={16} className="text-gray-500" />
                                    <span className="text-sm font-medium text-gray-400">Modos Especializados</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full">
                                    {/* Health Mode */}
                                    <button
                                        onClick={() => { setHealthModeOpen(true); setBusinessModeOpen(false); }}
                                        className="group relative overflow-hidden p-5 rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-950/50 to-emerald-900/20 hover:border-emerald-500/40 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/10 text-left"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative z-10 space-y-3">
                                            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 flex items-center justify-center">
                                                <Heart size={20} className="text-emerald-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-white">Luna Health</h3>
                                                <p className="text-xs text-gray-400 mt-1">Nutrição e bem-estar com IA</p>
                                            </div>
                                        </div>
                                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-medium">Novo</span>
                                        </div>
                                    </button>

                                    {/* Business Mode */}
                                    <button
                                        onClick={() => { setBusinessModeOpen(true); setHealthModeOpen(false); }}
                                        className="group relative overflow-hidden p-5 rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-950/50 to-blue-900/20 hover:border-blue-500/40 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-blue-500/10 text-left"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative z-10 space-y-3">
                                            <div className="w-10 h-10 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                                <Building2 size={20} className="text-blue-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-white">Luna Business</h3>
                                                <p className="text-xs text-gray-400 mt-1">Gestão financeira inteligente</p>
                                            </div>
                                        </div>
                                    </button>

                                    {/* Study Mode */}
                                    <button
                                        onClick={() => setStudyModeOpen(true)}
                                        className="group relative overflow-hidden p-5 rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-950/50 to-violet-900/20 hover:border-violet-500/40 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-violet-500/10 text-left"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative z-10 space-y-3">
                                            <div className="w-10 h-10 rounded-xl bg-violet-500/20 flex items-center justify-center">
                                                <BookOpen size={20} className="text-violet-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-white">Modo Estudo</h3>
                                                <p className="text-xs text-gray-400 mt-1">Flashcards e revisão espaçada</p>
                                            </div>
                                        </div>
                                    </button>

                                    {/* IDE Mode */}
                                    <button
                                        onClick={() => {
                                            if (auth.plan === 'eclipse') {
                                                setIdeMode(true);
                                            } else {
                                                chat.setView("SETTINGS");
                                                setSettingsTab("premium");
                                            }
                                        }}
                                        className="group relative overflow-hidden p-5 rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-950/50 to-amber-900/20 hover:border-amber-500/40 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-amber-500/10 text-left"
                                    >
                                        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <div className="relative z-10 space-y-3">
                                            <div className="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
                                                <Code size={20} className="text-amber-400" />
                                            </div>
                                            <div>
                                                <h3 className="font-semibold text-white">Modo IDE</h3>
                                                <p className="text-xs text-gray-400 mt-1">Código e projetos avançados</p>
                                            </div>
                                        </div>
                                        {auth.plan !== 'eclipse' && (
                                            <div className="absolute top-3 right-3">
                                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-medium">Eclipse</span>
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Features Section */}
                            <div className="w-full space-y-4">
                                <div className="flex items-center gap-2 px-1">
                                    <Zap size={16} className="text-gray-500" />
                                    <span className="text-sm font-medium text-gray-400">Recursos Avançados</span>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full">
                                    {/* Deep Thinking */}
                                    <button
                                        onClick={() => setIsThinkingMode(!isThinkingMode)}
                                        className={`group relative overflow-hidden p-4 rounded-2xl border transition-all hover:-translate-y-0.5 text-left flex items-center gap-4 ${isThinkingMode ? 'border-violet-500/50 bg-violet-500/10' : 'border-white/10 bg-white/5 hover:border-violet-500/30 hover:bg-violet-500/5'}`}
                                    >
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isThinkingMode ? 'bg-violet-500/30' : 'bg-violet-500/10'}`}>
                                            <Brain size={24} className={`text-violet-400 ${isThinkingMode ? 'animate-pulse' : ''}`} />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-white flex items-center gap-2">
                                                Deep Thinking
                                                {isThinkingMode && <span className="text-[10px] px-1.5 py-0.5 rounded bg-violet-500/30 text-violet-300">Ativo</span>}
                                            </h3>
                                            <p className="text-xs text-gray-400 mt-0.5">Raciocínio profundo para problemas complexos</p>
                                        </div>
                                    </button>

                                    {/* Agent Mode Info */}
                                    <div className="group relative overflow-hidden p-4 rounded-2xl border border-cyan-500/20 bg-cyan-500/5 text-left flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-cyan-500/20 flex items-center justify-center shrink-0">
                                            <Globe size={24} className="text-cyan-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-white flex items-center gap-2">
                                                Agent Mode
                                                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/30 text-cyan-300">Sempre Ativo</span>
                                            </h3>
                                            <p className="text-xs text-gray-400 mt-0.5">Busca na web, executa comandos e mais</p>
                                        </div>
                                    </div>

                                    {/* Canvas/Artifacts */}
                                    <div className="group relative overflow-hidden p-4 rounded-2xl border border-pink-500/20 bg-pink-500/5 text-left flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-xl bg-pink-500/20 flex items-center justify-center shrink-0">
                                            <PenTool size={24} className="text-pink-400" />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-semibold text-white">Canvas & Artefatos</h3>
                                            <p className="text-xs text-gray-400 mt-0.5">Crie documentos, código e designs</p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Quick Suggestions */}
                            <div className="w-full space-y-4">
                                <div className="flex items-center gap-2 px-1">
                                    <Lightbulb size={16} className="text-gray-500" />
                                    <span className="text-sm font-medium text-gray-400">Comece rapidamente</span>
                                </div>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                                    <button
                                        onClick={() => sendMessage("Escreva um email profissional sobre...")}
                                        className="group p-4 rounded-xl border border-blue-500/10 bg-blue-500/5 hover:border-blue-500/30 hover:bg-blue-500/10 transition-all hover:-translate-y-0.5 text-left flex items-center gap-3"
                                    >
                                        <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400"><PenTool size={16} /></div>
                                        <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Escreva um email</span>
                                    </button>
                                    <button
                                        onClick={() => sendMessage("Crie um roteiro de viagem para...")}
                                        className="group p-4 rounded-xl border border-emerald-500/10 bg-emerald-500/5 hover:border-emerald-500/30 hover:bg-emerald-500/10 transition-all hover:-translate-y-0.5 text-left flex items-center gap-3"
                                    >
                                        <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400"><Compass size={16} /></div>
                                        <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Planeje uma viagem</span>
                                    </button>
                                    <button
                                        onClick={() => sendMessage("Me dê 5 ideias criativas para...")}
                                        className="group p-4 rounded-xl border border-amber-500/10 bg-amber-500/5 hover:border-amber-500/30 hover:bg-amber-500/10 transition-all hover:-translate-y-0.5 text-left flex items-center gap-3"
                                    >
                                        <div className="p-2 rounded-lg bg-amber-500/20 text-amber-400"><Lightbulb size={16} /></div>
                                        <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Ideias criativas</span>
                                    </button>
                                    <button
                                        onClick={() => sendMessage("Vamos conversar sobre...")}
                                        className="group p-4 rounded-xl border border-violet-500/10 bg-violet-500/5 hover:border-violet-500/30 hover:bg-violet-500/10 transition-all hover:-translate-y-0.5 text-left flex items-center gap-3"
                                    >
                                        <div className="p-2 rounded-lg bg-violet-500/20 text-violet-400"><MessageCircle size={16} /></div>
                                        <span className="text-sm font-medium text-gray-300 group-hover:text-white transition-colors">Chat casual</span>
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* View: CHAT */}
                {!ideMode && (chat.view === "CHAT") && (
                    <div className="flex-1 flex flex-col h-full animate-in slide-in-from-bottom-10 duration-500">
                        <MessageList
                            messages={chat.messages}
                            isStreaming={isStreaming}
                            streamBuffer={streamBuffer}
                            streamThought={streamThought}
                            activeTool={activeTool}
                            toolStatus={toolStatus}
                            onRegenerate={regenerateResponse}
                            onFavorite={(idx) => chat.setMessages(prev => prev.map((msg, i) => i === idx ? { ...msg, isFavorite: !msg.isFavorite } : msg))}
                            onOpenArtifact={(art) => { artifacts.setActiveArtifact(art); artifacts.setCanvasOpen(true); }}
                            onContinueArtifact={() => {
                                chatInputRef.current?.setValue("Continue a escrita neste artefato.");
                            }}
                        />

                        {/* Input Area */}
                        <div className="w-full max-w-4xl mx-auto px-4 pb-6 relative z-10">
                            {!hasEnergy ? (
                                <div className="glass-panel p-4 rounded-xl flex items-center justify-between gap-4 border-l-4 border-amber-500 animate-in slide-in-from-bottom-2 fade-in">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center relative">
                                            <ZapOff size={20} className="text-amber-500" />
                                            <div className="absolute inset-0 border border-amber-500/20 rounded-full animate-pulse" />
                                        </div>
                                        <div>
                                            <h3 className="font-bold text-white text-sm flex items-center gap-2">
                                                Recarregando Energia
                                                {auth.energy.nextRefill && (
                                                    <span className="text-xs font-mono bg-black/30 px-2 py-0.5 rounded text-amber-400">
                                                        {(() => {
                                                            const diff = Math.max(0, auth.energy.nextRefill - Date.now());
                                                            const h = Math.floor(diff / 3600000);
                                                            const m = Math.floor((diff % 3600000) / 60000);
                                                            return `${h}h ${m}m`;
                                                        })()}
                                                    </span>
                                                )}
                                            </h3>
                                            <p className="text-xs text-gray-400">Aguarde o cooldown ou faça upgrade para liberar tudo.</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSettingsTab("planos")}
                                        className="px-5 py-2.5 bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-bold rounded-lg shadow-lg shadow-amber-900/20 transition-all flex items-center gap-2 group"
                                    >
                                        <Zap size={14} className="fill-white group-hover:scale-110 transition-transform" />
                                        VIRAR NEXUS
                                    </button>
                                </div>
                            ) : (
                                <div className="relative">
                                    <ChatInput
                                        ref={chatInputRef}
                                        onSend={sendMessage}
                                        isStreaming={isStreaming}
                                        onStop={stopGeneration}
                                        attachmentsHook={attachmentsHook}
                                        isThinkingMode={isThinkingMode}
                                        setIsThinkingMode={setIsThinkingMode}
                                        isCanvasMode={isCanvasMode}
                                        setIsCanvasMode={setIsCanvasMode}
                                    />
                                </div>
                            )}
                            <div className="text-center mt-3">
                                <a onClick={() => setSettingsTab("planos")} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full hover:bg-white/5 transition-colors cursor-pointer group">
                                    {auth.plan === 'spark' && <div className="w-1.5 h-1.5 rounded-full bg-gray-500" />}
                                    {auth.plan === 'nexus' && <div className="w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_5px_rgba(251,191,36,0.5)]" />}
                                    {auth.plan === 'eclipse' && <div className="w-1.5 h-1.5 rounded-full bg-violet-400 shadow-[0_0_5px_rgba(167,139,250,0.5)]" />}

                                    <span className="text-[10px] font-medium text-gray-500 group-hover:text-gray-300 uppercase tracking-wider transition-colors">
                                        {auth.plan === 'nexus' ? "Powered by Luna Nexus" :
                                            auth.plan === 'eclipse' ? "Powered by Luna Eclipse" :
                                                "Luna Spark • Ver Planos"}
                                    </span>
                                </a>
                            </div>
                        </div>
                    </div>
                )}

                {/* Energy Widget */}
                {auth.isAuthenticated && <EnergyDisplay />}

            </main>

            {/* Canvas Panel */}
            {artifacts.canvasOpen && (
                <Canvas
                    artifact={artifacts.activeArtifact}
                    artifacts={chat.messages.filter(m => m.artifact).map(m => m.artifact)}
                    onSelectArtifact={(art) => {
                        artifacts.setActiveArtifact(art);
                    }}
                    isOpen={artifacts.canvasOpen}
                    onClose={() => artifacts.setCanvasOpen(false)}
                    onSave={(content) => artifacts.handleSaveArtifact(content, chat.messages, chat.setMessages)}
                    onDelete={(id) => artifacts.handleDeleteArtifact(id, chat.messages, chat.setMessages)}
                />
            )}

            {/* Study Mode Modal */}
            {studyModeOpen && (
                <StudyMode
                    isOpen={studyModeOpen}
                    onClose={() => setStudyModeOpen(false)}
                />
            )}

            {/* Business Mode */}
            {businessModeOpen && (
                <BusinessMode
                    isOpen={businessModeOpen}
                    onClose={() => setBusinessModeOpen(false)}
                    userId={user?.uid}
                />
            )}

            {/* Health Mode */}
            {healthModeOpen && (
                <HealthMode
                    isOpen={healthModeOpen}
                    onClose={() => setHealthModeOpen(false)}
                    userId={user?.uid}
                />
            )}

            {/* Operation Feedback Toast */}
            {operationFeedback && (
                <LoadingToast 
                    message={operationFeedback.message}
                    type={operationFeedback.type}
                    onClose={() => setOperationFeedback(null)}
                />
            )}

            {/* Learning Notification Toast */}
            {learningNotification && (
                <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right-5 fade-in duration-300">
                    <div className="glass-panel px-4 py-3 rounded-xl border border-violet-500/30 shadow-lg shadow-violet-500/10 flex items-center gap-3 max-w-sm">
                        <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-purple-600 rounded-lg flex items-center justify-center shrink-0">
                            <Brain size={16} className="text-white" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="text-xs text-violet-400 font-medium mb-0.5">Conhecimento Absorvido</div>
                            <div className="text-sm text-gray-200 truncate">{learningNotification}</div>
                        </div>
                    </div>
                </div>
            )}

            {/* Changelog Modal - Aparece após atualização */}
            {currentAppVersion && (
                <ChangelogModal
                    isOpen={changelogModalOpen}
                    version={currentAppVersion}
                    changelogData={changelogData}
                    onClose={() => {
                        console.log('[CHANGELOG] Modal fechado');
                        setChangelogModalOpen(false);
                        // Garante que a versão seja salva mesmo se fechar sem usar handleClose
                        if (currentAppVersion) {
                            localStorage.setItem('luna-last-seen-version', currentAppVersion);
                            console.log('[CHANGELOG] Versão salva no localStorage:', currentAppVersion);
                        }
                    }}
                />
            )}

            {/* Pré-carregamento em segundo plano - Feedback visual */}
            {preloader.isPreloading && preloader.loadingProgress.current && (
                <div className="fixed bottom-4 left-4 z-50 animate-in slide-in-from-left-5 fade-in duration-300">
                    <div className="glass-panel px-4 py-3 rounded-xl border border-blue-500/30 shadow-lg shadow-blue-500/10 flex items-center gap-3 max-w-sm">
                        <Loader2 size={16} className="text-blue-400 animate-spin" />
                        <div className="flex-1 min-w-0">
                            <div className="text-xs text-blue-400 font-medium mb-0.5">Carregando componentes</div>
                            <div className="text-sm text-gray-200 truncate">{preloader.loadingProgress.current}</div>
                            {preloader.progress > 0 && (
                                <div className="mt-1 w-full bg-white/10 rounded-full h-1">
                                    <div 
                                        className="bg-blue-500 h-1 rounded-full transition-all duration-300"
                                        style={{ width: `${preloader.progress}%` }}
                                    />
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Debug: Botão para testar o modal (apenas em dev) */}
            {import.meta.env.DEV && (
                <button
                    onClick={() => {
                        console.log('[CHANGELOG] Teste manual do modal');
                        // Limpa a versão vista para forçar o modal
                        localStorage.removeItem('luna-last-seen-version');
                        // Recarrega a verificação
                        const checkVersion = async () => {
                            const version = await getCurrentVersion();
                            setCurrentAppVersion(version);
                            try {
                                const response = await fetch('/CHANGELOG.md');
                                if (response.ok) {
                                    const content = await response.text();
                                    const parsed = parseChangelogVersion(content, version);
                                    if (parsed) {
                                        setChangelogData(parsed);
                                        setChangelogModalOpen(true);
                                    }
                                }
                            } catch (e) {
                                console.error('[CHANGELOG] Erro no teste:', e);
                            }
                        };
                        checkVersion();
                    }}
                    className="fixed bottom-4 left-4 z-50 px-3 py-2 bg-red-500 text-white text-xs rounded"
                    style={{ display: 'none' }} // Escondido por padrão, pode remover o style para ver
                >
                    Testar Changelog
                </button>
            )}

        </div >
    );
}

// =============================================================================
// WRAPPER COM AUTENTICAÇÃO
// =============================================================================

function AppWithAuth() {
    const { user, loading, isAuthenticated, logout, profile } = useAuth();

    // Loading state
    if (loading) {
        return (
            <div className="flex h-screen w-screen bg-[#060b1e] items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                    <Loader2 size={48} className="text-violet-500 animate-spin" />
                    <p className="text-gray-400">Carregando...</p>
                </div>
            </div>
        );
    }

    // Not authenticated - show login
    if (!isAuthenticated) {
        return <LoginPage onSuccess={() => window.location.reload()} />;
    }

    // Authenticated - show app
    return <App />;
}

// =============================================================================
// EXPORT COM PROVIDER
// =============================================================================

function AppRoot() {
    return (
        <AuthProvider>
            <ModalProvider>
                <AppWithAuth />
                <UpdateNotification />
            </ModalProvider>
        </AuthProvider>
    );
}

export default AppRoot;

