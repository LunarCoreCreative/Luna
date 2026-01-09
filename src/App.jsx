import { useEffect, useRef, useState, useMemo, useCallback } from "react";
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
    Building2
} from "lucide-react";
import { Canvas } from "./components/Canvas";
import { StudyMode } from "./components/StudyMode";
import { BusinessMode } from "./components/business/BusinessMode";
import { Markdown } from "./components/markdown/Markdown";
import { TypingIndicator } from "./components/chat/TypingIndicator";
import { MessageList } from "./components/chat/MessageList";
import { ChatInput } from "./components/chat/ChatInput";
import IDEView from "./components/ide/IDEView";

import { useChat } from "./hooks/useChat";
import { useArtifacts } from "./hooks/useArtifacts";
import { useAttachments } from "./hooks/useAttachments";
import { generateArtifactSummary, filterSummaryText } from "./utils/artifactUtils";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { LoginPage } from "./pages/LoginPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SidebarProfile } from "./components/sidebar/SidebarProfile";
import { parseThought, getGreeting } from "./utils/messageUtils";
import { API_CONFIG } from "./config/api";
import { UpdateNotification } from "./components/UpdateNotification";

const MEMORY_SERVER = API_CONFIG.BASE_URL;

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

    // 3. Check if the string contains a tool call JSON pattern
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

        return filtered.trim();
    }

    return filtered;
};



// Energy Components with Timer Support
const EnergyDisplay = () => {
    const { energy, plan } = useAuth();
    const [timeLeft, setTimeLeft] = useState("");

    // Hook para atualizar o timer a cada minuto se estiver em cooldown
    useEffect(() => {
        if (energy.nextRefill && energy.current <= 0) {
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
    }, [energy.nextRefill, energy.current]);

    if (!energy) return null;

    const isInfinite = ['nexus', 'eclipse'].includes(plan);
    const isEmpty = energy.current <= 0;

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
};


function App() {
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
    const [settingsTab, setSettingsTab] = useState("general");
    const [learningNotification, setLearningNotification] = useState(null);
    const auth = useAuth();
    const { user, profile } = auth;

    // Energy check - available component-wide
    const hasEnergy = (!auth.isAuthenticated) || (auth.plan === 'nexus') || (auth.energy?.current > 0);

    // Custom hooks
    const chat = useChat();
    const artifacts = useArtifacts(chat.currentChatId, chat.persistChat);
    const attachmentsHook = useAttachments(setToolStatus);

    // Refs
    const wsRef = useRef(null);
    const messagesEndRef = useRef(null);
    const homeInputRef = useRef(null);
    const chatInputRef = useRef(null);

    // Solicitar permissão de notificação no montar
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
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
        document.documentElement.classList.remove("light", "dark", "glass", "neon");
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
        const checkHealth = async () => {
            try {
                const r = await fetch(`${MEMORY_SERVER}/health`);
                const d = await r.json();
                if (d.status === "ready") {
                    setBootStatus("Carregando memórias...");
                    await chat.loadChats();
                    setAppState("READY");
                } else {
                    setBootStatus(`Aquecendo motores neurais... (${retries})`);
                    setTimeout(checkHealth, 1000);
                }
            } catch (e) {
                retries++;
                setBootStatus(`Tentando conexão com servidor... (${retries})`);
                setTimeout(checkHealth, 2000);
            }
        };
        checkHealth();
    }, []);

    // Trigger initial overlay if enabled
    useEffect(() => {
        chat.loadChats();
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

    const startNewChat = () => {
        if (chat.isStreamingRef.current) return;
        chat.startNewChat();
        setStreamBuffer("");
    };

    const loadChat = async (id) => {
        if (chat.isStreamingRef.current) return;
        await chat.loadChat(id);
        setStreamBuffer("");
    };


    const regenerateResponse = async (messageIndex) => {
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

        // Directly trigger agent response without re-adding user message
        setTimeout(() => {
            streamAgentViaWS(newMessages, isThinkingMode, chat.currentChatId);
        }, 100);
    };

    const stopGeneration = () => {
        // Close WebSocket if exists
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        // Reset streaming state
        chat.isStreamingRef.current = false;
        setIsStreaming(false);
    };

    const streamAgentViaWS = (next, thinkingMode, activeChatId) => {
        return new Promise((resolve, reject) => {
            let ws;
            let fullText = "";
            let currentThought = null;
            let streamCompleted = false;
            let hasArtifact = false;
            let currentArtifact = null;
            let summaryText = "";
            try {
                ws = new WebSocket(API_CONFIG.WS_AGENT);
                wsRef.current = ws; // Store for cancellation
            } catch (e) {
                reject(e);
                return;
            }
            ws.onopen = () => {
                console.log("[WS] Connected, sending request...");
                ws.send(JSON.stringify({
                    type: "start",
                    request: {
                        messages: next,
                        agent_mode: true,
                        deep_thinking: thinkingMode,
                        canvas_mode: isCanvasMode,
                        active_artifact_id: artifacts.activeArtifact?.id, // Injeta o ID do artefato ativo se houver
                        user_id: user?.uid || null,
                        user_name: profile?.displayName || user?.displayName || "Usuário"
                    }
                }));
            };
            ws.onmessage = (evt) => {
                try {
                    const data = JSON.parse(evt.data);
                    console.log("[WS] Received:", Object.keys(data));
                    if (data.status) setToolStatus({ message: data.status, type: 'info' });
                    if (data.phase === "thinking") setToolStatus({ message: "Pensando...", type: 'info' });
                    if (data.thinking) {
                        currentThought = (currentThought || "") + data.thinking;
                        setStreamThought(currentThought);
                    }
                    if (data.partial_artifact) {
                        const part = data.partial_artifact;
                        const art = {
                            id: part.id || `temp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                            title: part.title || "Gerando...",
                            type: part.type || "code",
                            language: part.language || "markdown",
                            content: part.content || ""
                        };

                        artifacts.setActiveArtifact(art);
                        currentArtifact = art; // Persiste para o fechamento da mensagem
                        artifacts.setCanvasOpen(true);
                        hasArtifact = true;
                        setStreamBuffer(""); // Limpa buffer do chat se começou o artefato
                    }
                    if (data.tool_call) {
                        const toolName = data.tool_call.name;
                        if (toolName === "think") {
                            const thoughtArg = data.tool_call.args.detailed_thought;
                            const cleanThought = parseThought(thoughtArg);
                            currentThought = cleanThought;
                            setStreamThought(cleanThought);
                        } else {
                            let toolInfo = { name: toolName, message: "Executando ferramenta...", args: data.tool_call.args };
                            if (toolName === "web_search") { toolInfo.message = `Pesquisando: ${data.tool_call.args.query || '...'}`; toolInfo.icon = "search"; }
                            if (toolName === "read_url") { toolInfo.message = `Lendo página: ${data.tool_call.args.url || '...'}`; toolInfo.icon = "read"; }
                            if (toolName === "create_artifact") { toolInfo.message = `Gerando: ${data.tool_call.args.title || 'artefato'}...`; toolInfo.icon = "code"; }

                            setActiveTool(toolInfo);
                            activeToolRef.current = toolInfo;
                            chat.setToolHistory(prev => [...prev, { ...toolInfo, timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }]);
                        }
                    }
                    if (data.tool_result) {
                        const result = data.tool_result;

                        // Handle create_artifact result - Open Canvas!
                        if (result.success && result.artifact) {
                            const art = result.artifact;
                            console.log("[CANVAS] Artifact received:", art.title);

                            // Check if this is an update to an artifact already in history
                            const isHistorical = next.some(m => m.artifact && m.artifact.id === art.id);
                            // Check if this is an update to an artifact created in this very turn (re-edit)
                            const isSameTurn = currentArtifact && currentArtifact.id === art.id;

                            if (isHistorical) {
                                console.log("[CANVAS] Updating historical artifact");
                                // Update the artifact in the message history state
                                chat.setMessages(prev => prev.map(m => {
                                    if (m.artifact && m.artifact.id === art.id) {
                                        return { ...m, artifact: art };
                                    }
                                    return m;
                                }));

                                artifacts.setActiveArtifact(art); // Update visible canvas
                                hasArtifact = false; // Do NOT generate a new artifact card message
                                fullText += "\n\n> [!STATUS] ⚡ *Conteúdo atualizado no Canvas.*\n\n"; // Premium status badge
                            } else {
                                // New artifact OR update to an artifact created in this turn
                                currentArtifact = art;
                                artifacts.setActiveArtifact(art);
                                artifacts.setCanvasOpen(true);
                                hasArtifact = true; // Will generate/update the artifact card message at the end

                                // Only clearing text if it's a fresh creation to avoid clutter
                                if (!isSameTurn) fullText = "";
                            }

                            setActiveTool(null);
                            activeToolRef.current = null;
                            setStreamBuffer("");
                        }
                        // Handle web_search / read_url content
                        else if (result.content && (result.content.includes("TITULO:") || result.content.length > 50)) {
                            chat.setMessages(prev => [...prev, { role: "tool-card", content: result.content, type: result.content.includes("TITULO:") ? "search" : "read" }]);
                        }
                    }
                    // Handle learning events
                    if (data.learning) {
                        const titles = Array.isArray(data.learning) ? data.learning : [data.learning];
                        if (titles.length > 0) {
                            setLearningNotification(titles[0]); // Mostra o primeiro título
                            setTimeout(() => setLearningNotification(null), 4000);
                        }
                    }
                    if (data.content) {
                        if (activeToolRef.current) { setActiveTool(null); activeToolRef.current = null; }
                        // Filter out special model tokens that may leak
                        let filteredContent = data.content;
                        const specialTokens = ['<|tool_calls_begin|>', '<|tool_calls_end|>', '< | tool_calls_begin | >', '< | tool_calls_end | >', '<tool_call>', '</tool_call>'];
                        for (const token of specialTokens) {
                            filteredContent = filteredContent.replace(token, '');
                        }
                        // Filter out JSON tool call leaks
                        filteredContent = filterToolCallLeaks(filteredContent);
                        if (filteredContent && filteredContent.trim()) {
                            if (hasArtifact) {
                                summaryText += filterSummaryText(filteredContent);
                            } else {
                                fullText += filteredContent;
                                setStreamBuffer(prev => prev + filteredContent);
                            }
                        }
                    }
                    if (data.done) {
                        streamCompleted = true; // Mark as completed
                        console.log("[WS] Stream done, fullText length:", fullText.length, "hasArtifact:", hasArtifact);

                        // Final cleanup to ensure no split tokens leaked into the full text
                        // Only remove if it looks like a system token block
                        // ESCAPED PIPES: \| to match literal pipe
                        const finalCleanRegex = /<\s*\|\s*tool_calls_begin\s*\|\s*>[\s\S]*?<\s*\|\s*tool_calls_end\s*\|\s*>/g;
                        fullText = fullText.replace(finalCleanRegex, "").trim();

                        // Only add message if there's content AND no artifact was generated
                        if (fullText.trim() && !hasArtifact) {
                            const finalAssistantMsg = { role: "assistant", content: fullText, thought: data.thought || currentThought, timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) };
                            chat.setMessages(prev => {
                                const finalMessages = [...prev, finalAssistantMsg];
                                chat.persistChat(finalMessages, activeChatId);
                                return finalMessages;
                            });
                        } else if (hasArtifact) {
                            // If we have an artifact, add a small note message
                            const noteMsg = {
                                role: "assistant",
                                content: generateArtifactSummary(currentArtifact, summaryText),
                                artifact: currentArtifact, // Attach artifact to message
                                thought: currentThought,
                                timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                            };
                            chat.setMessages(prev => {
                                const finalMessages = [...prev, noteMsg];
                                chat.persistChat(finalMessages, activeChatId);
                                return finalMessages;
                            });
                        }

                        setStreamBuffer(""); setStreamThought(null); setToolStatus(null); setActiveTool(null); activeToolRef.current = null;
                        chat.isStreamingRef.current = false; setIsStreaming(false);
                        chat.loadChats();
                        try { ws.close(); } catch { }
                        resolve(true);
                    }
                } catch (e) {
                    console.error("[WS] Parse error:", e);
                }
            };
            ws.onerror = (e) => {
                console.error("[WS] Error:", e);
                try { ws.close(); } catch { }
                reject(new Error("ws"));
            };
            ws.onclose = () => {
                console.log("[WS] Closed, streamCompleted:", streamCompleted);
                // Only reject if stream didn't complete normally
                if (!streamCompleted) {
                    reject(new Error("ws closed before completion"));
                }
            };
        });
    };

    const sendMessage = async (textInput = null) => {
        // Prevent race conditions / double submits synchronously
        if (chat.isStreamingRef.current) return;
        // Determine text source: argument (from ChatInput/Suggestions) or homeInput state
        const text = (typeof textInput === 'string' ? textInput : homeInput).trim();

        // Allow sending if there are attachments even if text is empty
        // Efeito de bloqueio se sem energia
        const hasEnergy = (!auth.isAuthenticated) || (auth.plan === 'nexus') || (auth.energy.current > 0);

        const handleSend = async (text, attachments = [], documentAttachments = []) => {
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
            setStreamBuffer("");

            // Persist immediately after user message to ensure it's there even if stream fails
            // AWAIT this to get the real ID if it was null
            let activeChatId = chat.currentChatId;
            const newId = await chat.persistChat(next, activeChatId);
            if (newId) {
                activeChatId = newId;
                // setCurrentChatId(newId); // Already done in chat.persistChat, but good for local clarity if needed
            }

            try {
                try {
                    const ok = await streamAgentViaWS(next, isThinkingMode, activeChatId);
                    if (ok) return;
                } catch { }
                const response = await fetch(`${MEMORY_SERVER}/agent/stream`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        messages: next,
                        agent_mode: true,
                        deep_thinking: isThinkingMode,
                        active_artifact_id: artifacts.activeArtifact?.id // Injeta o ID do artefato ativo se houver
                    }),
                });
                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                let fullText = "";
                let currentThought = null;
                let hasArtifact = false;
                let currentArtifact = null;
                let summaryText = "";

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    const lines = decoder.decode(value).split("\n");
                    for (const line of lines) {
                        if (!line.startsWith("data: ")) continue;
                        try {
                            const data = JSON.parse(line.slice(6));

                            // Handle Status Updates
                            if (data.status) {
                                setToolStatus({ message: data.status, type: 'info' });
                            }

                            // Handle Phase Updates (Thinking vs Response)
                            if (data.phase === "thinking") {
                                // Backend indicates it started thinking
                                setToolStatus({ message: "Pensando...", type: 'info' });
                            }

                            // Handle Pure Thinking (Meta-Reasoning)
                            if (data.thinking) {
                                currentThought = (currentThought || "") + data.thinking;
                                setStreamThought(currentThought);
                            }

                            if (data.partial_artifact) {
                                const part = data.partial_artifact;
                                const art = {
                                    id: part.id || `temp_${Date.now()}_${Math.floor(Math.random() * 1000)}`,
                                    title: part.title || "Gerando...",
                                    type: part.type || "code",
                                    language: part.language || "markdown",
                                    content: part.content || ""
                                };
                                artifacts.setActiveArtifact(art);
                                currentArtifact = art;
                                artifacts.setCanvasOpen(true);
                                hasArtifact = true;
                                setStreamBuffer("");
                            }

                            // Handle Tool Calls (Visual Feedback & Logic)
                            if (data.tool_call) {
                                const toolName = data.tool_call.name;
                                console.log("[TOOL_CALL RECEIVED]", toolName, data.tool_call.args);

                                // Special Handling for 'think' tool
                                if (toolName === "think") {
                                    const thoughtArg = data.tool_call.args.detailed_thought;
                                    const cleanThought = parseThought(thoughtArg);
                                    currentThought = cleanThought;
                                    setStreamThought(cleanThought); // Update stream view
                                } else {
                                    // Usar estado dedicado para ferramenta ativa
                                    let toolInfo = { name: toolName, message: "Executando ferramenta...", args: data.tool_call.args };
                                    if (toolName === "web_search") {
                                        toolInfo.message = `Pesquisando: ${data.tool_call.args.query || '...'}`;
                                        toolInfo.icon = "search";
                                    }
                                    if (toolName === "read_url") {
                                        toolInfo.message = `Lendo página: ${data.tool_call.args.url || '...'}`;
                                        toolInfo.icon = "read";
                                    }



                                    console.log("[SETTING ACTIVE TOOL]", toolInfo);
                                    setActiveTool(toolInfo);
                                    activeToolRef.current = toolInfo; // Atualiza ref também

                                    // Record to tool history
                                    const historyEntry = {
                                        ...toolInfo,
                                        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                    };
                                    chat.setToolHistory(prev => [...prev, historyEntry]);
                                }
                            }

                            // Tool Results
                            if (data.tool_result) {
                                const result = data.tool_result;

                                if (result.success) {
                                    // Handle create_artifact - Open Canvas!
                                    if (result.artifact) {
                                        console.log("[CANVAS] Artifact received:", result.artifact.title);
                                        // currentArtifact removed (undeclared)
                                        artifacts.setActiveArtifact(result.artifact);
                                        artifacts.setCanvasOpen(true);
                                        setActiveTool(null);
                                        activeToolRef.current = null;
                                        hasArtifact = true; // Mark artifact generated
                                        fullText = ""; // Clear pre-artifact text
                                        setStreamBuffer(""); // Clear buffer
                                    }
                                    // Handle web_search / read_url content cards
                                    else if (result.content && (result.content.includes("TITULO:") || result.content.length > 50)) {
                                        chat.setMessages(prev => {
                                            const updated = [...prev, {
                                                role: "tool-card",
                                                content: result.content,
                                                type: result.content.includes("TITULO:") ? "search" : "read"
                                            }];
                                            return updated;
                                        });
                                    }
                                }
                            }

                            if (data.content) {
                                // Quando começar a receber conteúdo, limpa o activeTool usando ref
                                if (activeToolRef.current) {
                                    console.log("[CLEARING ACTIVE TOOL] - content received");
                                    setActiveTool(null);
                                    activeToolRef.current = null;
                                }

                                // Filter out special model tokens that may leak
                                let filteredContent = data.content;

                                // Clean using the robust regex function first
                                filteredContent = filterToolCallLeaks(filteredContent);

                                // Additional safety for split tokens or partials
                                // ESCAPED PIPES: \| to match literal pipe
                                const specialTokensRegex = /<\s*\|\s*tool_calls_(begin|end)\s*\|\s*>|<\s*\|\s*tool_call_(begin|end)\s*\|\s*>|<\s*\|\s*tool_sep\s*\|\s*>/g;
                                filteredContent = filteredContent.replace(specialTokensRegex, "");

                                if (filteredContent && filteredContent.trim()) {
                                    if (hasArtifact) {
                                        summaryText += filterSummaryText(filteredContent);
                                    } else {
                                        fullText += filteredContent;
                                        setStreamBuffer(prev => prev + filteredContent);
                                    }
                                }
                            }

                            if (data.done) {
                                // Only add message if there's content AND no artifact was generated
                                if (fullText.trim() && !hasArtifact) {
                                    const finalAssistantMsg = {
                                        role: "assistant",
                                        content: fullText,
                                        thought: data.thought || currentThought,
                                        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                    };

                                    chat.setMessages(prev => {
                                        const finalMessages = [...prev, finalAssistantMsg];
                                        chat.persistChat(finalMessages, activeChatId);
                                        return finalMessages;
                                    });
                                } else if (hasArtifact) {
                                    // If we have an artifact, add a small note message
                                    const noteMsg = {
                                        role: "assistant",
                                        content: generateArtifactSummary(currentArtifact, summaryText),
                                        artifact: currentArtifact, // Attach artifact
                                        thought: currentThought,
                                        timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                    };
                                    chat.setMessages(prev => {
                                        const finalMessages = [...prev, noteMsg];
                                        chat.persistChat(finalMessages, activeChatId);
                                        return finalMessages;
                                    });
                                }

                                setStreamBuffer("");
                                setStreamThought(null);
                                setToolStatus(null);
                                setActiveTool(null);
                                activeToolRef.current = null;

                                chat.isStreamingRef.current = false;
                                setIsStreaming(false);

                                chat.loadChats();
                            }
                        } catch { }
                    }
                }
            } catch (e) {
                chat.setMessages(prev => [...prev, { role: "assistant", content: `Erro: ${e.message}` }]);
                setToolStatus({ message: "Erro na conexão", type: 'error' });
                setTimeout(() => setToolStatus(null), 3000);

                chat.isStreamingRef.current = false;
                setIsStreaming(false);
            }
        };

        // Call the new handleSend function with current inputs
        await handleSend(text, attachmentsHook.attachments, attachmentsHook.documentAttachments);
    };

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
                    <div className="flex items-center gap-3 text-blue-300/80 bg-blue-900/20 px-4 py-2 rounded-full border border-blue-500/10">
                        <Loader2 size={16} className="animate-spin" />
                        <span className="text-sm font-medium">{bootStatus}</span>
                    </div>
                </div>
            </div>
        );
    }


    return (
        <div className={`flex h-screen w-screen bg-[var(--bg-primary)] text-[var(--text-primary)] overflow-hidden relative ${artifacts.canvasOpen ? 'split-view' : ''}`}>


            {/* Sidebar Backdrop - Click to close */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[150] transition-opacity animate-in fade-in duration-300"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar (Overlay/Slide) */}
            <div className={`fixed inset-y-0 left-0 z-[160] w-[280px] bg-[var(--bg-glass-solid)] backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="p-4 pt-12 flex flex-col h-full">
                    <button onClick={startNewChat} className="flex items-center gap-3 px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-lg shadow-blue-900/20 mb-3">
                        <Plus size={18} />
                        <span className="font-medium">Nova Conversa</span>
                    </button>

                    {/* Artifacts Quick Access */}
                    {chat.messages.filter(m => m.artifact).length > 0 && (
                        <div className="mb-4">
                            <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 px-2 flex items-center gap-2">
                                <PanelRight size={12} />
                                Artefatos
                            </div>
                            <div className="space-y-1 max-h-[200px] overflow-y-auto">
                                {chat.messages.filter(m => m.artifact).map((m, idx) => (
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
                    <div className="flex-1 overflow-y-auto space-y-1 pr-2">
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

                                {/* Dropdown Menu */}
                                {activeMenu === c.id && (
                                    <div className="absolute right-2 top-10 w-32 bg-[#161b22] border border-white/10 rounded-lg shadow-xl z-50 text-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
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

            {/* Overlay to close sidebar */}
            {sidebarOpen && (
                <div className="fixed inset-0 bg-black/60 z-30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            )}

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
            <main className="flex-1 flex flex-col h-full relative z-10">
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
                                onClick={() => setBusinessModeOpen(true)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-gray-400 hover:text-emerald-400"
                                title="Luna Gestão"
                            >
                                <Building2 size={20} />
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
                    <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-500">
                        <div className="max-w-2xl w-full flex flex-col items-center gap-8">
                            <h1 className="text-4xl md:text-5xl font-semibold text-center leading-tight" style={{ color: 'var(--text-primary)' }}>
                                <span className="block text-2xl mb-2 font-normal" style={{ color: 'var(--text-secondary)' }}>
                                    {getGreeting()}, {profile?.name || (user?.email?.split('@')[0]) || 'usuário'}
                                </span>
                                Como posso ajudar você hoje?
                            </h1>

                            {/* Input Bar (Home) */}
                            <div className="w-full relative glass-bar rounded-3xl p-1 shadow-2xl shadow-blue-900/10 transition-all focus-within:ring-2 focus-within:ring-blue-500/50 flex flex-col">
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
                                        className={`p-3 rounded-xl transition-all ${(homeInput.trim() || attachmentsHook.attachments.length > 0) ? "bg-white text-black hover:scale-105" : "bg-white/10 text-gray-500"}`}
                                    >
                                        <Send size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Suggestions */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 w-full">
                                {[
                                    { icon: <PenTool size={18} />, text: "Escreva um email", prompt: "Escreva um email profissional sobre..." },
                                    { icon: <Compass size={18} />, text: "Planeje uma viagem", prompt: "Crie um roteiro de viagem para..." },
                                    { icon: <Lightbulb size={18} />, text: "Ideias criativas", prompt: "Me dê 5 ideias criativas para..." },
                                    { icon: <MessageCircle size={18} />, text: "Chat casual", prompt: "Vamos conversar sobre..." },
                                ].map((s, i) => (
                                    <button
                                        key={i}
                                        onClick={() => sendMessage(s.prompt)}
                                        className="glass-panel p-4 rounded-2xl flex flex-col gap-3 items-start hover:bg-white/10 dark:hover:bg-white/10 transition-all hover:-translate-y-1 text-left"
                                        style={{ color: 'var(--text-primary)' }}
                                    >
                                        <div className="p-2 rounded-lg" style={{ background: 'var(--bg-glass)' }}>{s.icon}</div>
                                        <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>{s.text}</span>
                                    </button>
                                ))}
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

            {/* Study Mode Modal */}
            <StudyMode
                isOpen={studyModeOpen}
                onClose={() => setStudyModeOpen(false)}
            />

            {/* Business Mode */}
            <BusinessMode
                isOpen={businessModeOpen}
                onClose={() => setBusinessModeOpen(false)}
                userId={user?.uid}
            />

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
            <AppWithAuth />
            <UpdateNotification />
        </AuthProvider>
    );
}

export default AppRoot;

