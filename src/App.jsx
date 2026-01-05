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
    BellOff,
    Clock,
    LayoutDashboard,
    PanelRight,
    Code,
    XCircle,
    BookOpen
} from "lucide-react";
import { Canvas } from "./components/Canvas";
import { StudyMode } from "./components/StudyMode";
import { Markdown } from "./components/markdown/Markdown";
import { TypingIndicator } from "./components/chat/TypingIndicator";
import { useChat } from "./hooks/useChat";
import { useArtifacts } from "./hooks/useArtifacts";
import { useAttachments } from "./hooks/useAttachments";
import { generateArtifactSummary } from "./utils/artifactUtils";
import { parseThought, getGreeting } from "./utils/messageUtils";

const MEMORY_SERVER = "http://127.0.0.1:8001";



function App() {
    // Boot state
    const [appState, setAppState] = useState("BOOTING");
    const [bootStatus, setBootStatus] = useState("Conectando ao núcleo...");

    // UI state
    const [input, setInput] = useState("");
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
    const [studyModeOpen, setStudyModeOpen] = useState(false);

    // Custom hooks
    const chat = useChat();
    const artifacts = useArtifacts(chat.currentChatId, chat.persistChat);
    const attachmentsHook = useAttachments(setToolStatus);

    // Refs
    const wsRef = useRef(null);
    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Solicitar permissão de notificação no montar
    useEffect(() => {
        if ("Notification" in window && Notification.permission === "default") {
            Notification.requestPermission();
        }
    }, []);

    // Theme Effect
    useEffect(() => {
        document.documentElement.classList.toggle("light", theme === "light");
        localStorage.setItem("luna-theme", theme);
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

    // Auto-resize Input
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = "auto";
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 160) + "px";
        }
    }, [input]);

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
                ws = new WebSocket("ws://127.0.0.1:8001/ws/agent");
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
                        active_artifact_id: artifacts.activeArtifact?.id // Injeta o ID do artefato ativo se houver
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
                            id: part.id || "temp",
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
                        else if (result.success && result.content && (result.content.includes("TITULO:") || result.content.length > 50)) {
                            chat.setMessages(prev => [...prev, { role: "tool-card", content: result.content, type: result.content.includes("TITULO:") ? "search" : "read" }]);
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
                        if (filteredContent) {
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

    const sendMessage = async (overrideInput = null) => {
        // Prevent race conditions / double submits synchronously
        if (chat.isStreamingRef.current) return;

        const text = (overrideInput || input).trim();
        // Allow sending if there are attachments even if text is empty
        if (!text && attachmentsHook.attachments.length === 0 && attachmentsHook.documentAttachments.length === 0) return;

        chat.isStreamingRef.current = true; // Lock immediately
        setIsStreaming(true); // Update UI state
        setToolStatus(null); // Reset status
        setActiveTool(null); // Reset active tool
        setStreamThought(null); // Reset thought

        // If coming from home, switch view first
        if (chat.view === "HOME") {
            chat.setView("CHAT");
        }

        const currentAttachments = [...attachmentsHook.attachments];
        const currentDocuments = [...attachmentsHook.documentAttachments];

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
        setInput("");
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
                    active_artifact_id: activeArtifact?.id // Injeta o ID do artefato ativo se houver
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
                                id: part.id || "temp",
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
                                chat.setToolHistory(prev => [...prev, {
                                    ...toolInfo,
                                    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                }]);
                            }
                        }

                        // Tool Results
                        if (data.tool_result) {
                            const result = data.tool_result;

                            if (result.success) {
                                // Handle create_artifact - Open Canvas!
                                if (result.artifact) {
                                    console.log("[CANVAS] Artifact received:", result.artifact.title);
                                    currentArtifact = result.artifact; // Save locally
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
                            const specialTokens = ['<|tool_calls_begin|>', '<|tool_calls_end|>', '< | tool_calls_begin | >', '< | tool_calls_end | >', '<tool_call>', '</tool_call>'];
                            for (const token of specialTokens) {
                                filteredContent = filteredContent.replace(token, '');
                            }

                            if (filteredContent) {
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

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    if (appState === "BOOTING") {
        return (
            <div className="flex h-screen w-screen bg-[#060b1e] items-center justify-center flex-col text-center relative overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_#1e2645_0%,_#000000_100%)] opacity-50" />
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
        <div className={`flex h-screen w-screen text-gray-100 overflow-hidden relative ${artifacts.canvasOpen ? 'split-view' : ''}`}>
            {/* Native Title Bar Drag Area */}
            <div className="absolute top-0 left-0 w-full h-8 app-region-drag z-50 hover:bg-white/5 transition-colors" />

            {/* Sidebar (Overlay/Slide) */}
            <div className={`fixed inset-y-0 left-0 z-40 w-[280px] bg-[#0d1117]/95 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
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
                <header className="absolute top-0 left-0 w-full p-4 flex items-center justify-between z-20 pointer-events-none">
                    <div className="flex items-center gap-4 pointer-events-auto pt-2 pl-2">
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
                    <div className="pointer-events-auto pt-2 pr-2 flex items-center gap-2">
                        {/* Canvas Toggle */}
                        {artifacts.activeArtifact && (
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
                                            <span className="text-[10px]" style={{ color: 'var(--text-secondary)' }}>{tool.timestamp}</span>
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

                {/* View: HOME */}
                {chat.view === "HOME" && (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-500">
                        <div className="max-w-2xl w-full flex flex-col items-center gap-8">
                            <h1 className="text-4xl md:text-5xl font-semibold text-center leading-tight" style={{ color: 'var(--text-primary)' }}>
                                <span className="block text-2xl mb-2 font-normal" style={{ color: 'var(--text-secondary)' }}>{getGreeting()}</span>
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
                                    ref={inputRef}
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
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
                                        disabled={!input.trim() && attachmentsHook.attachments.length === 0}
                                        className={`p-3 rounded-xl transition-all ${(input.trim() || attachmentsHook.attachments.length > 0) ? "bg-white text-black hover:scale-105" : "bg-white/10 text-gray-500"}`}
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
                {chat.view === "CHAT" && (
                    <div className="flex-1 flex flex-col h-full animate-in slide-in-from-bottom-10 duration-500">
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pt-20 pb-32">
                            <div className="max-w-3xl mx-auto space-y-6">
                                {chat.messages.map((m, i) => {
                                    if (m.role === "tool-card") {
                                        return (
                                            <div key={i} className="flex justify-start w-full my-2 pl-4">
                                                <div className="glass-panel border-l-4 border-blue-500/50 rounded-r-xl p-4 max-w-[80%] bg-blue-900/5 hover:bg-blue-900/10 transition-colors text-sm text-gray-300">
                                                    <div className="flex items-center gap-2 mb-2 text-blue-400 font-medium">
                                                        {m.type === 'search' ? <Globe size={14} /> : <FileText size={14} />}
                                                        <span>{m.type === 'search' ? 'Resultados da Pesquisa' : 'Conteúdo da Página'}</span>
                                                    </div>
                                                    <div className="max-h-40 overflow-y-auto custom-scrollbar opacity-90 leading-relaxed whitespace-pre-wrap font-mono text-xs">
                                                        {m.content.length > 500 ? m.content.slice(0, 500) + "..." : m.content}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }

                                    return (
                                        <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"} message-enter`}>
                                            <div
                                                className={`max-w-[85%] rounded-2xl px-5 py-4 text-base leading-relaxed shadow-lg ${m.role === "user" ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-tr-sm border border-white/20 whitespace-pre-wrap" : "glass-panel rounded-tl-sm"}`}
                                                style={{ color: m.role === "user" ? 'white' : 'var(--text-primary)' }}
                                            >
                                                {/* Render images if user sent them */}
                                                {m.role === "user" && m.images && m.images.length > 0 && (
                                                    <div className="flex flex-wrap gap-2 mb-2">
                                                        {m.images.map((img, idx) => (
                                                            <img key={idx} src={img} className="max-h-48 rounded-lg border border-white/10" />
                                                        ))}
                                                    </div>
                                                )}

                                                {/* Reasoning Block (Using 'thought' property from tool call) */}
                                                {m.thought && (
                                                    <details className="mb-4 group" open={false}>
                                                        <summary className="cursor-pointer list-none flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-blue-300 transition-colors select-none mb-2">
                                                            <div className="p-1 bg-white/5 rounded-md group-open:bg-blue-500/20 transition-colors">
                                                                <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center border border-current opacity-70">
                                                                    <div className="w-1 h-1 rounded-full bg-current" />
                                                                </div>
                                                            </div>
                                                            <span>Processo de Pensamento</span>
                                                        </summary>
                                                        <div className="pl-2 border-l-2 border-white/10 ml-1.5 my-2">
                                                            <div className="text-sm text-gray-400 font-mono bg-[#0d1117] p-3 rounded-lg opacity-90 whitespace-pre-wrap">
                                                                {parseThought(m.thought)}
                                                            </div>
                                                        </div>
                                                    </details>
                                                )}

                                                {m.role === "assistant" ? (
                                                    m.content === "✨ *Artefato gerado no Canvas* →" ? (
                                                        <button
                                                            onClick={() => {
                                                                if (m.artifact) artifacts.setActiveArtifact(m.artifact);
                                                                artifacts.setCanvasOpen(true);
                                                            }}
                                                            className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-300 hover:bg-violet-500/20 transition-all group"
                                                        >
                                                            <div className="p-2 bg-violet-500/20 rounded-lg group-hover:scale-110 transition-transform">
                                                                <PanelRight size={18} />
                                                            </div>
                                                            <div className="flex flex-col items-start text-sm">
                                                                <span className="font-semibold">Artefato gerado no Canvas</span>
                                                                <span className="text-xs opacity-70">Clique para abrir e visualizar</span>
                                                            </div>
                                                        </button>
                                                    ) : m.content && m.content.includes("[!RESUMO]") ? (
                                                        <div className="glass-panel rounded-2xl rounded-tl-sm p-4 shadow-lg">
                                                            <div className="flex items-center justify-between mb-3">
                                                                <div className="flex items-center gap-2">
                                                                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-violet-600/20 text-violet-200 text-xs tracking-wide">Resumo</span>
                                                                    {isStreaming && (
                                                                        <div className="h-1 w-12 bg-violet-500/20 rounded overflow-hidden">
                                                                            <div className="h-1 w-1/2 bg-violet-400 animate-pulse" />
                                                                        </div>
                                                                    )}
                                                                </div>
                                                                {m.artifact && (
                                                                    <span className="text-xs opacity-60">{m.artifact.language || m.artifact.type}</span>
                                                                )}
                                                            </div>
                                                            <div className="space-y-3">
                                                                <Markdown content={cleanContent(m.content) || "..."} />
                                                            </div>
                                                            <div className="flex items-center gap-2 mt-3">
                                                                <button
                                                                    onClick={() => {
                                                                        if (m.artifact) artifacts.setActiveArtifact(m.artifact);
                                                                        artifacts.setCanvasOpen(true);
                                                                    }}
                                                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-200 text-xs transition-colors"
                                                                    aria-label="Abrir Canvas"
                                                                >
                                                                    <PanelRight size={14} />
                                                                    Abrir Canvas
                                                                </button>
                                                                <button
                                                                    onClick={() => {
                                                                        setInput("Continue a escrita neste artefato.");
                                                                        inputRef.current?.focus();
                                                                    }}
                                                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-200 text-xs transition-colors"
                                                                    aria-label="Continuar escrita"
                                                                >
                                                                    <PenTool size={14} />
                                                                    Continuar escrita
                                                                </button>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <Markdown content={cleanContent(m.content) || "..."} />
                                                    )
                                                ) : (
                                                    <Markdown content={cleanContent(m.content) || "..."} />
                                                )}

                                                {/* Timestamp */}
                                                {m.timestamp && (
                                                    <div className={`text-[10px] mt-2 opacity-40 flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                                                        {m.timestamp}
                                                    </div>
                                                )}

                                                {/* Action buttons for assistant messages */}
                                                {m.role === "assistant" && (
                                                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
                                                        <button
                                                            onClick={() => regenerateResponse(i)}
                                                            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md hover:bg-white/10 transition-colors"
                                                            style={{ color: 'var(--text-secondary)' }}
                                                            title="Regenerar resposta"
                                                        >
                                                            <RotateCcw size={12} />
                                                            Regenerar
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                chat.setMessages(prev => prev.map((msg, idx) =>
                                                                    idx === i ? { ...msg, isFavorite: !msg.isFavorite } : msg
                                                                ));
                                                            }}
                                                            className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-md hover:bg-white/10 transition-colors ${m.isFavorite ? 'text-yellow-400' : ''}`}
                                                            style={{ color: m.isFavorite ? undefined : 'var(--text-secondary)' }}
                                                            title={m.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                                                        >
                                                            <Star size={12} fill={m.isFavorite ? "currentColor" : "none"} />
                                                            {m.isFavorite ? "Favoritada" : "Favoritar"}
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })}

                                {isStreaming && (
                                    <div className="flex flex-col items-start gap-2">
                                        {/* Stream Thought (Active) */}
                                        {streamThought && (
                                            <div className="flex justify-start w-full mb-2 pl-1">
                                                <div className="max-w-[85%] rounded-2xl px-5 py-4 glass-panel border border-blue-500/10">
                                                    <div className="flex items-center gap-2 text-blue-400 mb-2 text-xs font-semibold uppercase tracking-wider">
                                                        <Loader2 size={12} className="animate-spin" />
                                                        Pensando...
                                                    </div>
                                                    <div className="text-xs text-gray-400 font-mono opacity-90">
                                                        <Markdown content={streamThought} />
                                                    </div>
                                                </div>
                                            </div>
                                        )}

                                        {/* Streaming Content */}
                                        {streamBuffer ? (
                                            <div className="glass-panel text-gray-100 rounded-2xl rounded-tl-sm px-5 py-4 max-w-[85%] shadow-lg message-enter">
                                                <Markdown content={streamBuffer} />
                                                <span className="inline-block w-2 h-4 ml-1 bg-blue-400 animate-pulse align-middle" />
                                            </div>
                                        ) : !activeTool && !streamThought && (
                                            /* Typing Indicator - Shows when waiting for Luna to start responding */
                                            <TypingIndicator />
                                        )}

                                        {/* Active Tool Badge - Dedicated persistent badge */}
                                        {activeTool && (
                                            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600/20 to-violet-600/20 border border-blue-500/30 rounded-2xl text-blue-200 text-sm ml-1 mb-2 shadow-lg shadow-blue-900/20">
                                                <div className="relative">
                                                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-ping absolute" />
                                                    <div className="w-3 h-3 bg-blue-400 rounded-full relative" />
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    {activeTool.icon === "search" && <Globe size={16} className="text-blue-400" />}
                                                    {activeTool.icon === "read" && <FileText size={16} className="text-violet-400" />}
                                                    {activeTool.icon === "doc" && <FileText size={16} className="text-cyan-400" />}
                                                    <span className="font-medium">{activeTool.message}</span>
                                                </div>
                                            </div>
                                        )}

                                        {/* General Status Messages (fallback) */}
                                        {toolStatus && !activeTool && (
                                            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-300 text-sm animate-pulse ml-1 mb-2">
                                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping" />
                                                {toolStatus.message}
                                            </div>
                                        )}

                                        <div ref={messagesEndRef} />
                                    </div>
                                )}
                                {!isStreaming && <div ref={messagesEndRef} />}
                            </div>
                        </div>

                        {/* Chat Input Bar (Bottom) */}
                        <div className="absolute bottom-6 left-0 w-full px-4">
                            <div className="max-w-3xl mx-auto glass-bar rounded-3xl p-2 pl-2 shadow-2xl flex flex-col gap-2 transition-all focus-within:ring-1 focus-within:ring-white/20">
                                {attachmentsHook.attachments.length > 0 && (
                                    <div className="flex gap-2 px-4 pt-2 overflow-x-auto">
                                        {attachmentsHook.attachments.map((img, idx) => (
                                            <div key={idx} className="relative group shrink-0">
                                                <img src={img} alt="attachment" className="h-16 w-16 object-cover rounded-lg border border-white/20" />
                                                <button
                                                    onClick={() => attachmentsHook.setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                                    className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="flex items-end gap-2 px-2 pb-1">
                                    <button onClick={() => attachmentsHook.fileInputRef.current?.click()} className="p-2 mb-1 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-blue-400"><ImageIcon size={20} /></button>
                                    <button
                                        onClick={() => setIsThinkingMode(!isThinkingMode)}
                                        className={`p-2 mb-1 hover:bg-white/10 rounded-full transition-colors ${isThinkingMode ? "text-violet-400 bg-violet-500/10" : "text-gray-400"}`}
                                        title="Ativar Pensamento Profundo"
                                    >
                                        <Brain size={20} className={isThinkingMode ? "animate-pulse" : ""} />
                                    </button>
                                    <textarea
                                        ref={inputRef}
                                        value={input}
                                        onChange={(e) => setInput(e.target.value)}
                                        onKeyDown={handleKeyDown}
                                        onPaste={attachmentsHook.handlePaste}
                                        placeholder="Responda..."
                                        className="flex-1 bg-transparent border-0 text-white placeholder-gray-400 focus:ring-0 resize-none outline-none custom-scrollbar py-3"
                                        rows={1}
                                        style={{ minHeight: "24px", maxHeight: "160px" }}
                                    />
                                    {isStreaming ? (
                                        <button
                                            onClick={() => stopGeneration()}
                                            className="p-3 rounded-full bg-red-600 text-white hover:bg-red-500 transition-all mb-1"
                                            title="Parar geração"
                                        >
                                            <XCircle size={18} />
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => sendMessage()}
                                            disabled={!input.trim() && attachmentsHook.attachments.length === 0}
                                            className={`p-3 rounded-full transition-all mb-1 ${(input.trim() || attachmentsHook.attachments.length > 0) ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-white/5 text-gray-500"}`}
                                        >
                                            <Send size={18} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                    </div>
                )
                }


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

        </div >
    );
}



// Helper para limpar tags de pensamento vazadas e tokens internos + formatar texto
function cleanContent(content) {
    if (!content) return "";

    // Debug log (visível no console do Chrome/Edge)
    if (content.includes('###')) console.log("[LUNA-CLEAN] Antes:", content.slice(0, 100));

    // Normalização inicial
    let cleaned = content.replace(/\r\n/g, "\n"); // Garantir line endings consistentes

    // Remove blocos <think>...</think> (incluindo quebras de linha)
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, "");

    // Remove tokens de controle da Together/DeepSeek
    cleaned = cleaned.replace(/<\|.*?\|>/g, "");
    cleaned = cleaned.replace(/<\s*\|\s*tool_calls_begin\s*\|\s*>/g, "");
    cleaned = cleaned.replace(/<\s*\|\s*tool_calls_end\s*\|\s*>/g, "");
    cleaned = cleaned.replace(/<\s*\|\s*tool_call_begin\s*\|\s*>/g, "");
    cleaned = cleaned.replace(/<\s*\|\s*tool_call_end\s*\|\s*>/g, "");

    // === NORMALIZAÇÃO DE MARKDOWN ABSOLUTA ===

    // 1. Corrigir headers grudados no texto acima: "Texto###" -> "Texto\n\n###"
    cleaned = cleaned.replace(/([^\n])(#{1,4}\s+)/g, '$1\n\n$2');

    // 2. Corrigir headers grudados no texto abaixo: "### Header\nTexto" -> "### Header\n\nTexto"
    cleaned = cleaned.replace(/^(#{1,4}\s+[^\n]+)\n([^\n#\s-])/gm, '$1\n\n$2');

    // 3. Corrigir indentação acidental de headers: "  ###" -> "###"
    cleaned = cleaned.replace(/^[ \t]+(#{1,4}\s)/gm, '$1');

    // 4. Corrigir falta de espaço após hashes: "###Header" -> "### Header"
    cleaned = cleaned.replace(/^(#{1,4})([^#\s\n])/gm, '$1 $2');

    // 5. Corrigir falta de espaço APÓS o fechamento de itálico/negrito (apenas se houver texto grudado depois)
    // Mas NUNCA adicionar espaço após o asterisco de abertura.
    cleaned = cleaned.replace(/(\*[^* \n][^*]*\*)([a-zA-ZÁÉÍÓÚÇ0-9])/g, '$1 $2');
    cleaned = cleaned.replace(/(\*\*[^* \n][^*]*\*\*)([a-zA-ZÁÉÍÓÚÇ0-9])/g, '$1 $2');

    // === FORMATAÇÃO DE TEXTO (para legibilidade) ===

    // 1. Quebra antes de bullet points: "Texto- **" -> "Texto\n\n- **"
    cleaned = cleaned.replace(/([^\n\-])(\s*[\-\*]\s+\*\*)/g, '$1\n\n$2');

    // 2. Quebra após parênteses fechado seguido de letra maiúscula: ")Frase" -> ")\n\nFrase"
    cleaned = cleaned.replace(/\)([A-ZÁÉÍÓÚÇ])/g, ')\n\n$1');

    // 3. Quebra após pontuação forte e emojis
    const emojis = "✨💖🌙🎯📚🔧💡🎉⚡🌟❤️💕🌸☀️🌈🎨📝🚀💫🌺🔮✏️📖💻📱🎵🎶🌷📂🗂️🌍🌎🎭🌱";
    const emojiRegex = new RegExp(`\\.([\\s]*[${emojis}])`, 'g');
    cleaned = cleaned.replace(emojiRegex, '.\n\n$1');

    const dotsEmojiRegex = new RegExp(`\\.\\.\\.([\\s]*[${emojis}])`, 'g');
    cleaned = cleaned.replace(dotsEmojiRegex, '...\n\n$1');

    // 4. Limita quebras de linha consecutivas a máximo 2
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // 5. Garantir que símbolos de status (⚡, 🔍, 📖, ✅, ❌) tenham espaço ou quebra antes de texto
    cleaned = cleaned.replace(/([⚡🔍📖✅❌])([a-zA-ZÁÉÍÓÚÇ])/g, '$1 $2');

    return cleaned.trim();
}

export default App;
