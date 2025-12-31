import { useEffect, useRef, useState } from "react";
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
    Copy,
    Check,
    Upload,
    RotateCcw,
    Star,
    History,
    Eye,
    EyeOff
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

const MEMORY_SERVER = "http://127.0.0.1:8001";

// Code Block with Copy Button
const CodeBlock = ({ language, children }) => {
    const [copied, setCopied] = useState(false);
    const code = String(children).replace(/\n$/, "");

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group my-4">
            <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors opacity-0 group-hover:opacity-100"
                title="Copiar código"
            >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-gray-400" />}
            </button>
            <SyntaxHighlighter
                style={vscDarkPlus}
                language={language || "text"}
                PreTag="div"
                customStyle={{
                    margin: 0,
                    borderRadius: "0.75rem",
                    padding: "1rem",
                    fontSize: "0.85rem",
                    background: "rgba(30, 30, 46, 0.8)",
                    border: "1px solid rgba(255,255,255,0.1)"
                }}
            >
                {code}
            </SyntaxHighlighter>
        </div>
    );
};

// Safe Markdown Component with Syntax Highlighting
const Markdown = ({ content }) => (
    <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
            code({ inline, className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || "");
                const language = match ? match[1] : "";

                // Multi-line code block
                if (!inline && (match || String(children).includes("\n"))) {
                    return <CodeBlock language={language}>{children}</CodeBlock>;
                }

                // Inline code
                return <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-cyan-300">{children}</code>;
            },
            p: ({ children }) => <p className="mb-4 last:mb-0 leading-7">{children}</p>,
            ul: ({ children }) => <ul className="list-disc pl-4 mb-4 space-y-1">{children}</ul>,
            ol: ({ children }) => <ol className="list-decimal pl-4 mb-4 space-y-1">{children}</ol>,
            a: ({ href, children }) => <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
        }}
    >
        {content}
    </ReactMarkdown>
);

// Typing Indicator Component
const TypingIndicator = () => (
    <div className="flex items-center gap-3 px-5 py-4 glass-panel rounded-2xl rounded-tl-sm max-w-[200px] message-enter">
        <Bot size={18} className="text-violet-400" />
        <div className="flex items-center gap-1.5">
            <div className="typing-dot" />
            <div className="typing-dot" />
            <div className="typing-dot" />
        </div>
    </div>
);

function App() {
    const [appState, setAppState] = useState("BOOTING"); // BOOTING | READY
    const [bootStatus, setBootStatus] = useState("Conectando ao núcleo...");
    const [view, setView] = useState("HOME"); // HOME | CHAT
    const [messages, setMessages] = useState([]);
    const [input, setInput] = useState("");
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamBuffer, setStreamBuffer] = useState("");
    const [chats, setChats] = useState([]);
    const [currentChatId, setCurrentChatId] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [theme, setTheme] = useState(() => localStorage.getItem("luna-theme") || "dark");
    const [pcObserverEnabled, setPcObserverEnabled] = useState(true);
    const [pcContext, setPcContext] = useState(null);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour >= 5 && hour < 12) return "Bom dia";
        if (hour >= 12 && hour < 18) return "Boa tarde";
        return "Boa noite";
    };

    const isStreamingRef = useRef(false); // Synchronous lock

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);

    // Theme Effect
    useEffect(() => {
        document.documentElement.classList.toggle("light", theme === "light");
        localStorage.setItem("luna-theme", theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem("luna-pc-observer", pcObserverEnabled);

        // Sync with backend
        fetch(`${MEMORY_SERVER}/pc/toggle?enabled=${pcObserverEnabled}`, { method: 'POST' });

        if (pcObserverEnabled) {
            const poll = setInterval(async () => {
                try {
                    const r = await fetch(`${MEMORY_SERVER}/pc/context`);
                    const d = await r.json();
                    if (d.success) setPcContext(d.context);
                } catch (e) {
                    console.error("PC Observer poll failed", e);
                }
            }, 3000);
            return () => clearInterval(poll);
        } else {
            setPcContext(null);
        }
    }, [pcObserverEnabled]);

    const toggleTheme = () => setTheme(prev => prev === "dark" ? "light" : "dark");

    const loadChats = async () => {
        try {
            const r = await fetch(`${MEMORY_SERVER}/chats`);
            const d = await r.json();
            if (d.success) setChats(d.chats);
        } catch (e) {
            console.error("Failed to load chats", e);
        }
    };

    // Boot Sequence
    useEffect(() => {
        let retries = 0;
        const checkHealth = async () => {
            try {
                const r = await fetch(`${MEMORY_SERVER}/health`);
                const d = await r.json();
                if (d.status === "ready") {
                    setBootStatus("Carregando memórias...");
                    await loadChats();
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

    useEffect(() => {
        loadChats();
    }, []);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, streamBuffer]);

    // Auto-resize Input
    useEffect(() => {
        if (inputRef.current) {
            inputRef.current.style.height = "auto";
            inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 160) + "px"; // Limit to ~160px
        }
    }, [input]);

    const startNewChat = () => {
        if (isStreamingRef.current) return;
        setMessages([]);
        setCurrentChatId(null);
        setStreamBuffer("");
        setView("HOME");
        setToolHistory([]); // Clear tool history for new chat
        setShowToolHistory(false);
    };

    const loadChat = async (id) => {
        if (isStreamingRef.current) return;
        try {
            const r = await fetch(`${MEMORY_SERVER}/chats/${id}`);
            const d = await r.json();
            if (d.success) {
                const msgs = (d.chat.messages || []).map(m => {
                    if (m.events) {
                        const text = m.events.filter(e => e.type === "text").map(e => e.content).join("\n");
                        return { role: m.role, content: text };
                    }
                    return m;
                });
                setMessages(msgs);
                setCurrentChatId(d.chat.id);
                setStreamBuffer("");
                setView("CHAT");
            }
        } catch (e) {
            console.error("Failed to load chat", e);
        }
    };

    const [attachments, setAttachments] = useState([]); // Array of base64 strings (images)
    const [documentAttachments, setDocumentAttachments] = useState([]); // Array of {filename, content} for PDF/TXT
    const fileInputRef = useRef(null);

    const handlePaste = (e) => {
        const items = e.clipboardData.items;
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf("image") !== -1) {
                e.preventDefault();
                const blob = items[i].getAsFile();
                const reader = new FileReader();
                reader.onload = (event) => {
                    setAttachments(prev => [...prev, event.target.result]);
                };
                reader.readAsDataURL(blob);
            }
        }
    };

    const handleFileSelect = async (e) => {
        const files = Array.from(e.target.files);

        for (const file of files) {
            const filename = file.name.toLowerCase();

            // Handle images
            if (file.type.startsWith("image/")) {
                const reader = new FileReader();
                reader.onload = (event) => {
                    setAttachments(prev => [...prev, event.target.result]);
                };
                reader.readAsDataURL(file);
            }
            // Handle PDF/TXT documents
            else if (filename.endsWith(".pdf") || filename.endsWith(".txt")) {
                try {
                    setToolStatus({ message: `Processando ${file.name}...`, type: 'info' });
                    const formData = new FormData();
                    formData.append("file", file);

                    const response = await fetch(`${MEMORY_SERVER}/upload`, {
                        method: "POST",
                        body: formData
                    });
                    const data = await response.json();

                    if (data.success) {
                        setDocumentAttachments(prev => [...prev, {
                            filename: data.filename,
                            content: data.content,
                            type: data.type
                        }]);
                        setToolStatus({ message: `${file.name} carregado!`, type: 'success' });
                        setTimeout(() => setToolStatus(null), 2000);
                    } else {
                        alert(`Erro ao processar ${file.name}: ${data.error}`);
                        setToolStatus(null);
                    }
                } catch (err) {
                    alert(`Erro ao enviar ${file.name}: ${err.message}`);
                    setToolStatus(null);
                }
            } else {
                alert(`Tipo de arquivo não suportado: ${file.name}. Use imagens, PDF ou TXT.`);
            }
        }
        e.target.value = null; // Reset input
    };

    const deleteChat = async (e, id) => {
        e.stopPropagation();
        if (!confirm("Tem certeza que deseja excluir esta conversa?")) return;
        try {
            const r = await fetch(`${MEMORY_SERVER}/chats/${id}`, { method: "DELETE" });
            const d = await r.json();
            if (d.success) {
                if (currentChatId === id) startNewChat();
                loadChats();
            }
        } catch (e) {
            console.error("Failed to delete chat", e);
        }
    };

    const renameChat = async (e, id, currentTitle) => {
        e.stopPropagation();
        const newTitle = prompt("Novo título para o chat:", currentTitle);
        if (!newTitle || newTitle === currentTitle) return;

        try {
            const res = await fetch(`${MEMORY_SERVER}/chats/${id}`);
            const data = await res.json();
            if (data.success) {
                const body = {
                    chat_id: id,
                    messages: data.chat.messages,
                    title: newTitle
                };
                await fetch(`${MEMORY_SERVER}/chats`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(body)
                });
                loadChats();
            }
        } catch (e) {
            console.error("Failed to rename chat", e);
        }
    };

    const [activeMenu, setActiveMenu] = useState(null);
    const [toolStatus, setToolStatus] = useState(null);
    const [activeTool, setActiveTool] = useState(null); // Estado dedicado para ferramenta ativa
    const activeToolRef = useRef(null); // Ref para evitar stale closure
    const [streamThought, setStreamThought] = useState(null);
    const [isThinkingMode, setIsThinkingMode] = useState(false); // Toggle state
    const [toolHistory, setToolHistory] = useState([]); // Track all tool calls in conversation
    const [showToolHistory, setShowToolHistory] = useState(false); // Toggle tool history panel

    const persistChat = async (msgs, chatId = null) => {
        try {
            const body = {
                chat_id: chatId,
                messages: msgs,
                title: msgs.length > 0 ? (msgs[0].content || "Novo Chat").slice(0, 40) : "Conversa"
            };
            const r = await fetch(`${MEMORY_SERVER}/chats`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            const d = await r.json();
            if (d.success && d.chat) {
                if (!chatId) setCurrentChatId(d.chat.id);
                loadChats(); // Refresh sidebar
            }
        } catch (e) {
            console.error("Failed to persist chat", e);
        }
    };

    const regenerateResponse = async (messageIndex) => {
        // Find the last user message before this assistant message
        let lastUserMsgIndex = -1;
        for (let i = messageIndex - 1; i >= 0; i--) {
            if (messages[i].role === "user") {
                lastUserMsgIndex = i;
                break;
            }
        }

        if (lastUserMsgIndex === -1) return;

        // Remove all messages from the user message onwards (we'll re-add the user message)
        const newMessages = messages.slice(0, lastUserMsgIndex);
        const userMessage = messages[lastUserMsgIndex];

        setMessages(newMessages);

        // Re-send the user message
        setInput(userMessage.content.split("\n\n--- Documentos anexados ---")[0]); // Remove doc context from input

        // Wait a tick for state to update, then send
        setTimeout(() => {
            sendMessage(userMessage.content.split("\n\n--- Documentos anexados ---")[0]);
        }, 100);
    };

    const sendMessage = async (overrideInput = null) => {
        // Prevent race conditions / double submits synchronously
        if (isStreamingRef.current) return;

        const text = (overrideInput || input).trim();
        // Allow sending if there are attachments even if text is empty
        if (!text && attachments.length === 0 && documentAttachments.length === 0) return;

        isStreamingRef.current = true; // Lock immediately
        setIsStreaming(true); // Update UI state
        setToolStatus(null); // Reset status
        setActiveTool(null); // Reset active tool
        setStreamThought(null); // Reset thought

        // If coming from home, switch view first
        if (view === "HOME") {
            setView("CHAT");
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

        const next = [...messages, newMessage];
        setMessages(next);
        setInput("");
        setAttachments([]); // Clear attachments immediately
        setDocumentAttachments([]); // Clear document attachments
        setStreamBuffer("");

        // Persist immediately after user message to ensure it's there even if stream fails
        persistChat(next, currentChatId);

        try {
            const response = await fetch(`${MEMORY_SERVER}/agent/stream`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    messages: next,
                    agent_mode: true,
                    deep_thinking: isThinkingMode
                }),
            });
            const reader = response.body.getReader();
            const decoder = new TextDecoder();

            let fullText = "";
            let currentThought = null;

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

                        // Handle Tool Calls (Visual Feedback & Logic)
                        if (data.tool_call) {
                            const toolName = data.tool_call.name;
                            console.log("[TOOL_CALL RECEIVED]", toolName, data.tool_call.args);

                            // Special Handling for 'think' tool
                            if (toolName === "think") {
                                const thoughtText = data.tool_call.args.detailed_thought;
                                currentThought = thoughtText;
                                setStreamThought(thoughtText);
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
                                setToolHistory(prev => [...prev, {
                                    ...toolInfo,
                                    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                }]);
                            }
                        }

                        // Tool Results
                        if (data.tool_result) {
                            // We inject a visual "System Message" for the tool result
                            let toolContent = null;
                            const result = data.tool_result;

                            if (result.success) {
                                // Verify context (how to associate with current tool call? We'll assume sequential for now or basic heuristic)
                                // For simplicity in this stream, we just append a "Tool Block" to the message list locally if we want persistent cards
                                // BUT, standard chat flow might just use it for context.
                                // User wants "Cards" showing content.

                                // We'll treat tool results as a special 'tool-card' message role or append to previous?
                                // Easier: Append a distinct message object { role: 'tool-card', content: ..., type: ... }

                                if (result.content && (result.content.includes("TITULO:") || result.content.length > 50)) {
                                    setMessages(prev => {
                                        const updated = [...prev, {
                                            role: "tool-card",
                                            content: result.content,
                                            type: result.content.includes("TITULO:") ? "search" : "read"
                                        }];
                                        // Auto-persist tool card as well? 
                                        // Maybe better to wait for the final response, but tool results are important.
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
                            fullText += data.content;
                            setStreamBuffer(prev => prev + data.content);
                        }

                        if (data.done) {
                            const finalAssistantMsg = {
                                role: "assistant",
                                content: fullText,
                                thought: data.thought || currentThought, // Usa o consolidado do backend se disponível
                                timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                            };

                            setMessages(prev => {
                                const finalMessages = [...prev, finalAssistantMsg];
                                // CRITICAL SYNC: Save the whole history including Luna's response
                                // We use a small delay or ref-based sync to ensure we have the absolute latest state
                                // Actually, we can just use the local 'finalMessages' array.
                                persistChat(finalMessages, currentChatId);
                                return finalMessages;
                            });

                            setStreamBuffer("");
                            setStreamThought(null);
                            setToolStatus(null); // Clear status
                            setActiveTool(null); // Clear active tool
                            activeToolRef.current = null; // Clear ref too

                            isStreamingRef.current = false;
                            setIsStreaming(false);

                            loadChats();
                        }
                    } catch { }
                }
            }
        } catch (e) {
            setMessages(prev => [...prev, { role: "assistant", content: `Erro: ${e.message}` }]);
            setToolStatus({ message: "Erro na conexão", type: 'error' });
            setTimeout(() => setToolStatus(null), 3000);

            isStreamingRef.current = false;
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
        <div className="flex h-screen w-screen text-gray-100 overflow-hidden relative">
            {/* Native Title Bar Drag Area */}
            <div className="absolute top-0 left-0 w-full h-8 app-region-drag z-50 hover:bg-white/5 transition-colors" />

            {/* Sidebar (Overlay/Slide) */}
            <div className={`fixed inset-y-0 left-0 z-40 w-[280px] bg-[#0d1117]/95 backdrop-blur-xl border-r border-white/10 transform transition-transform duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
                <div className="p-4 pt-12 flex flex-col h-full">
                    <button onClick={startNewChat} className="flex items-center gap-3 px-4 py-3 bg-blue-600 hover:bg-blue-500 rounded-xl transition-all shadow-lg shadow-blue-900/20 mb-6">
                        <Plus size={18} />
                        <span className="font-medium">Nova Conversa</span>
                    </button>

                    <div className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 px-2">Recentes</div>
                    <div className="flex-1 overflow-y-auto space-y-1 pr-2">
                        {chats.map(c => (
                            <div key={c.id} className="relative group">
                                <div
                                    role="button"
                                    onClick={() => { loadChat(c.id); setSidebarOpen(false); }}
                                    className={`w-full text-left px-3 py-3 rounded-lg hover:bg-white/5 transition-colors flex items-center justify-between group cursor-pointer ${currentChatId === c.id ? 'bg-white/10' : ''}`}
                                >
                                    <div className="flex items-center gap-3 truncate pr-8">
                                        <MessageSquare size={16} className={`shrink-0 ${currentChatId === c.id ? 'text-blue-400' : 'text-gray-400 group-hover:text-blue-400'}`} />
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
                                            onClick={(e) => { renameChat(e, c.id, c.title); setActiveMenu(null); }}
                                            className="w-full text-left px-4 py-2 hover:bg-white/5 text-gray-300 hover:text-white flex items-center gap-2"
                                        >
                                            <PenTool size={12} /> Renomear
                                        </button>
                                        <button
                                            onClick={(e) => { deleteChat(e, c.id); setActiveMenu(null); }}
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
                ref={fileInputRef}
                onChange={handleFileSelect}
                className="hidden"
                multiple
                accept="image/*,.pdf,.txt,application/pdf,text/plain"
            />

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full relative z-10">
                {/* Header */}
                <header className="absolute top-0 left-0 w-full p-4 flex items-center justify-between z-20 pointer-events-none">
                    <div className="flex items-center gap-4 pointer-events-auto pt-2 pl-2">
                        <button onClick={() => setSidebarOpen(true)} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <Menu size={24} className="text-gray-300" />
                        </button>
                        <div className="flex items-center gap-2 opacity-80" onClick={() => { setView("HOME"); setMessages([]); }} role="button">
                            <Bot size={24} className="text-violet-500" />
                            <span className="font-semibold text-lg tracking-tight">Luna</span>
                        </div>
                    </div>
                    <div className="pointer-events-auto pt-2 pr-2 flex items-center gap-2">
                        {/* Tool History Toggle (only in CHAT view with history) */}
                        {view === "CHAT" && toolHistory.length > 0 && (
                            <button
                                onClick={() => setShowToolHistory(!showToolHistory)}
                                className={`p-2 hover:bg-white/10 rounded-lg transition-colors relative ${showToolHistory ? 'bg-white/10' : ''}`}
                                title="Histórico de Ferramentas"
                            >
                                <History size={18} className="text-cyan-400" />
                                <span className="absolute -top-1 -right-1 bg-cyan-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
                                    {toolHistory.length}
                                </span>
                            </button>
                        )}

                        {/* Observer Toggle */}
                        <div
                            className={`p-2 bg-blue-500/10 rounded-lg transition-colors group relative`}
                            title={pcContext ? `Observando: ${pcContext.app}` : "Modo Observador Ativo"}
                        >
                            <Eye size={18} className="text-blue-400 animate-pulse" />
                            {pcContext && (
                                <div className="absolute top-full right-0 mt-2 whitespace-nowrap bg-black/80 backdrop-blur-md px-2 py-1 rounded text-[10px] text-blue-200 opacity-0 group-hover:opacity-100 transition-opacity border border-blue-500/20 pointer-events-none">
                                    {pcContext.app} - {pcContext.title.slice(0, 20)}...
                                </div>
                            )}
                        </div>

                        <button
                            onClick={toggleTheme}
                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            title={theme === "dark" ? "Modo Claro" : "Modo Escuro"}
                        >
                            {theme === "dark" ? <Sun size={18} className="text-yellow-400" /> : <Moon size={18} className="text-blue-400" />}
                        </button>

                        {/* Status Badge */}
                        <div className="flex items-center gap-2">
                            {pcObserverEnabled && (
                                <div className="bg-blue-500/10 backdrop-blur-md px-3 py-1.5 rounded-full text-[10px] font-bold border border-blue-500/20 flex items-center gap-1.5 text-blue-400 uppercase tracking-tighter shadow-lg shadow-blue-500/5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></div>
                                    Observando PC
                                </div>
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
                    </div>
                </header>

                {/* Tool History Panel */}
                {showToolHistory && toolHistory.length > 0 && (
                    <div className="absolute top-16 right-4 z-30 w-80 max-h-64 overflow-y-auto glass-panel rounded-xl p-3 shadow-xl animate-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center justify-between mb-2 pb-2 border-b border-white/10">
                            <h3 className="text-sm font-semibold flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                                <History size={14} className="text-cyan-400" />
                                Ferramentas Usadas
                            </h3>
                            <button onClick={() => setShowToolHistory(false)} className="p-1 hover:bg-white/10 rounded">
                                <X size={14} />
                            </button>
                        </div>
                        <div className="space-y-2">
                            {toolHistory.map((tool, idx) => (
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
                {view === "HOME" && (
                    <div className="flex-1 flex flex-col items-center justify-center p-6 animate-in fade-in zoom-in-95 duration-500">
                        <div className="max-w-2xl w-full flex flex-col items-center gap-8">
                            <h1 className="text-4xl md:text-5xl font-semibold text-center leading-tight" style={{ color: 'var(--text-primary)' }}>
                                <span className="block text-2xl mb-2 font-normal" style={{ color: 'var(--text-secondary)' }}>{getGreeting()}</span>
                                Como posso ajudar você hoje?
                            </h1>

                            {/* Input Bar (Home) */}
                            <div className="w-full relative glass-bar rounded-3xl p-1 shadow-2xl shadow-blue-900/10 transition-all focus-within:ring-2 focus-within:ring-blue-500/50 flex flex-col">
                                {/* Attachment Previews */}
                                {(attachments.length > 0 || documentAttachments.length > 0) && (
                                    <div className="flex gap-2 p-4 pb-0 overflow-x-auto pb-2">
                                        {/* Image attachments */}
                                        {attachments.map((img, idx) => (
                                            <div key={`img-${idx}`} className="relative group shrink-0">
                                                <img src={img} alt="attachment" className="h-16 w-16 object-cover rounded-lg border border-white/20" />
                                                <button
                                                    onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                                    className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                        {/* Document attachments */}
                                        {documentAttachments.map((doc, idx) => (
                                            <div key={`doc-${idx}`} className="relative group shrink-0 flex items-center gap-2 px-3 py-2 bg-blue-500/20 border border-blue-500/30 rounded-lg">
                                                <FileText size={16} className="text-blue-400" />
                                                <span className="text-sm text-blue-300 max-w-[100px] truncate">{doc.filename}</span>
                                                <button
                                                    onClick={() => setDocumentAttachments(prev => prev.filter((_, i) => i !== idx))}
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
                                    onPaste={handlePaste}
                                    placeholder="Pergunte qualquer coisa..."
                                    className="w-full bg-transparent border-0 px-6 py-4 text-lg focus:ring-0 resize-none outline-none custom-scrollbar"
                                    style={{ color: 'var(--text-primary)' }}
                                    rows={1}
                                />
                                <div className="flex items-center justify-between px-4 pb-2">
                                    <div className="flex gap-2 text-gray-400">
                                        <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-white/10 rounded-lg transition-colors text-blue-400" title="Anexar arquivo (imagem, PDF, TXT)"><Upload size={20} /></button>
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
                                        disabled={!input.trim() && attachments.length === 0}
                                        className={`p-3 rounded-xl transition-all ${(input.trim() || attachments.length > 0) ? "bg-white text-black hover:scale-105" : "bg-white/10 text-gray-500"}`}
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
                {view === "CHAT" && (
                    <div className="flex-1 flex flex-col h-full animate-in slide-in-from-bottom-10 duration-500">
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pt-20 pb-32">
                            <div className="max-w-3xl mx-auto space-y-6">
                                {messages.map((m, i) => {
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
                                                className={`max-w-[85%] rounded-2xl px-5 py-4 text-base leading-relaxed shadow-lg whitespace-pre-wrap ${m.role === "user" ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white rounded-tr-sm border border-white/20" : "glass-panel rounded-tl-sm"}`}
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
                                                            <div className="text-xs text-gray-400 font-mono bg-[#0d1117] p-3 rounded-lg opacity-90">
                                                                <Markdown content={m.thought} />
                                                            </div>
                                                        </div>
                                                    </details>
                                                )}

                                                {m.role === "assistant" ? <Markdown content={m.content || "..."} /> : m.content}

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
                                                                setMessages(prev => prev.map((msg, idx) =>
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
                                {attachments.length > 0 && (
                                    <div className="flex gap-2 px-4 pt-2 overflow-x-auto">
                                        {attachments.map((img, idx) => (
                                            <div key={idx} className="relative group shrink-0">
                                                <img src={img} alt="attachment" className="h-16 w-16 object-cover rounded-lg border border-white/20" />
                                                <button
                                                    onClick={() => setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                                    className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={12} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                <div className="flex items-end gap-2 px-2 pb-1">
                                    <button onClick={() => fileInputRef.current?.click()} className="p-2 mb-1 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-blue-400"><ImageIcon size={20} /></button>
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
                                        onPaste={handlePaste}
                                        placeholder="Responda..."
                                        className="flex-1 bg-transparent border-0 text-white placeholder-gray-400 focus:ring-0 resize-none outline-none custom-scrollbar py-3"
                                        rows={1}
                                        style={{ minHeight: "24px", maxHeight: "160px" }}
                                    />
                                    <button
                                        onClick={() => sendMessage()}
                                        disabled={!input.trim() && attachments.length === 0}
                                        className={`p-3 rounded-full transition-all mb-1 ${(input.trim() || attachments.length > 0) ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-white/5 text-gray-500"}`}
                                    >
                                        <Send size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>

                    </div>
                )}


            </main>
        </div >
    );
}

export default App;
