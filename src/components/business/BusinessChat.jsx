import React, { useState, useRef, useEffect } from "react";
import { X, History, Globe, FileText, CheckCircle2 } from "lucide-react";
import { MessageList } from "../chat/MessageList";
import { ChatInput } from "../chat/ChatInput";
import { useChat } from "../../hooks/useChat";
import { useAttachments } from "../../hooks/useAttachments";
import { useAuth } from "../../contexts/AuthContext";
import { API_CONFIG } from "../../config/api";
import { parseThought } from "../../utils/messageUtils";

export function BusinessChat({ isOpen, onClose, userId = "local", onUpdate }) {
    // Hooks
    const chat = useChat();
    const attachmentsHook = useAttachments();
    const { user, profile } = useAuth();

    // State
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamBuffer, setStreamBuffer] = useState("");
    const [streamThought, setStreamThought] = useState(null);
    const [activeTool, setActiveTool] = useState(null);
    const [toolStatus, setToolStatus] = useState(null);
    const [isThinkingMode, setIsThinkingMode] = useState(false); // Default off for business for speed? Or user pref.

    // Refs
    const wsRef = useRef(null);
    const chatInputRef = useRef(null);
    const activeToolRef = useRef(null);
    const initializedRef = useRef(false);

    // Initialize chat on mount
    useEffect(() => {
        if (isOpen && userId && !initializedRef.current) {
            initializedRef.current = true;
            const loadBusinessChat = async () => {
                try {
                    const query = userId ? `?user_id=${userId}` : "";
                    const r = await fetch(`${API_CONFIG.BASE_URL}/chats${query}`);
                    const d = await r.json();

                    if (d.success) {
                        // Find ALL Business Chats AND SORT by update time (created_at fallback)
                        const businessChats = d.chats
                            .filter(c => c.title === "Consultor Business")
                            .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

                        if (businessChats.length > 0) {
                            const primaryChat = businessChats[0];
                            console.log("[BusinessChat] Loading primary chat:", primaryChat.id);
                            await chat.loadChat(primaryChat.id);

                            // Dedup Clean (Optional: could delete others, but risky. Just warn for now)
                            if (businessChats.length > 1) {
                                console.warn(`[BusinessChat] Found ${businessChats.length} duplicates. Using recent: ${primaryChat.id}`);
                            }
                        } else {
                            console.log("[BusinessChat] No existing chat, starting new.");
                            chat.startNewChat();
                            chat.setMessages([{
                                role: "assistant", // Using assistant role for greeting
                                content: `Olá, ${profile?.name?.split(' ')[0] || "Trader"}! Como posso ajudar com a gestão hoje?`,
                                timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                            }]);
                        }
                    }
                } catch (e) {
                    console.error("Error loading business chat:", e);
                    initializedRef.current = false; // Reset on failure to allow retry if component remains valid
                }
            };
            loadBusinessChat();
        }
    }, [isOpen, userId]);

    // WebSocket Logic (Simplified adaptation from App.jsx)
    const streamAgentViaWS = (next, thinkingMode, activeChatId) => {
        return new Promise((resolve, reject) => {
            let ws;
            let fullText = "";
            let currentThought = null;
            let streamCompleted = false;

            try {
                ws = new WebSocket(API_CONFIG.WS_AGENT);
                wsRef.current = ws;
            } catch (e) {
                reject(e);
                return;
            }

            ws.onopen = () => {
                console.log("[BusinessChat] WebSocket connected");

                // Format messages
                const formattedMessages = next.map(m => ({
                    role: m.role,
                    content: m.content,
                    images: m.images || []
                }));

                ws.send(JSON.stringify({
                    type: "start",
                    request: {
                        messages: formattedMessages,
                        agent_mode: true,
                        deep_thinking: false,
                        active_artifact_id: null,
                        business_mode: true,
                        canvas_mode: false,
                        user_id: userId || "local",
                        user_name: profile?.name || "Usuário"
                    }
                }));
            };

            ws.onmessage = (evt) => {
                try {
                    const data = JSON.parse(evt.data);

                    if (data.status) setToolStatus({ message: data.status, type: 'info' });
                    if (data.phase === "thinking") setToolStatus({ message: "Pensando...", type: 'info' });

                    if (data.thinking) {
                        currentThought = (currentThought || "") + data.thinking;
                        setStreamThought(currentThought);
                    }

                    if (data.tool_call) {
                        const toolName = data.tool_call.name;
                        if (toolName === "think") {
                            const thoughtArg = data.tool_call.args.detailed_thought;
                            const cleanThought = parseThought(thoughtArg);
                            currentThought = cleanThought;
                            setStreamThought(cleanThought);
                        } else {
                            let toolInfo = { name: toolName, message: "Executando...", args: data.tool_call.args };
                            if (toolName === "add_transaction") toolInfo.message = "Registrando transação...";
                            if (toolName === "get_balance") toolInfo.message = "Verificando saldo...";

                            setActiveTool(toolInfo);
                            activeToolRef.current = toolInfo;
                        }
                    }

                    if (data.tool_result) {
                        if (onUpdate && data.tool_result.success) {
                            onUpdate();
                        }
                        setActiveTool(null);
                        activeToolRef.current = null;
                    }

                    if (data.content) {
                        if (activeToolRef.current) { setActiveTool(null); activeToolRef.current = null; }

                        let filteredContent = data.content;

                        // Robust Regex for Tool Call Tokens (handles spaces AND NEWLINES)
                        // Using [\s\S]*? approach or just explicit \s including newlines
                        let cleaned = filteredContent.replace(/<\s*\|\s*tool_calls?_(begin|end)\s*\|\s*>/gi, "");
                        cleaned = cleaned.replace(/<\s*\|\s*tool_sep\s*\|\s*>/gi, "");
                        cleaned = cleaned.replace(/<\s*\|\s*tool_call_(begin|end)\s*\|\s*>/gi, "");

                        // Catch tokens interrupted by newlines (e.g. < | tool_call_begin |\n >)
                        cleaned = cleaned.replace(/<\s*\|\s*tool_[\s\S]*?\|\s*>/gi, "");

                        // Fallback for residual pipes
                        cleaned = cleaned.replace(/<\|.*?\|>/g, '');

                        // Clean visual noise of empty tokens
                        // filteredContent = cleaned; // Use regex cleaned version for Buffer?
                        // Actually streamBuffer uses cleanContent in MessageList? 
                        // MessageList streamBuffer was removed. 
                        // So we just accumulate fullText.

                        // NOTE: We should accumulate the RAW content for fullText (so markdown isn't broken by partial chunks) 
                        // BUT since we saw persistent leaks, we should validly filter the chunk.
                        // However, validly filtering chunks is hard if a token is split.
                        // Since streamBuffer is gone, `fullText` is only used for FINAL persistence.
                        // We can clean `fullText` at the END.

                        if (filteredContent) {
                            fullText += filteredContent;
                            // setStreamBuffer -> REMOVED
                        }
                    }

                    if (data.done) {
                        streamCompleted = true;

                        // clean final text before saving
                        // Reuse cleanContent or applying regex here
                        let finalText = fullText;
                        finalText = finalText.replace(/<\s*\|\s*tool_calls?_(begin|end)\s*\|\s*>/gi, "")
                            .replace(/<\s*\|\s*tool_sep\s*\|\s*>/gi, "")
                            .replace(/<\s*\|\s*tool_call_(begin|end)\s*\|\s*>/gi, "")
                            .replace(/<\s*\|\s*tool_[\s\S]*?\|\s*>/gi, "")
                            .replace(/<\|.*?\|>/g, '');

                        if (finalText.trim()) {
                            const finalMsg = {
                                role: "assistant",
                                content: finalText,
                                thought: data.thought || currentThought,
                                timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                            };
                            chat.setMessages(prev => {
                                const newMsgs = [...prev, finalMsg];
                                // CRITICAL FIX: Use activeChatId (passed as arg) instead of stale chat.currentChatId
                                chat.persistChat(newMsgs, activeChatId, "Consultor Business");
                                return newMsgs;
                            });
                        }

                        setStreamBuffer("");
                        setStreamThought(null);
                        setToolStatus(null);
                        setActiveTool(null);
                        setIsStreaming(false);
                        ws.close();
                        resolve(true);
                    }
                } catch (e) {
                    console.error("WS Parse error", e);
                }
            };

            ws.onerror = (e) => {
                console.error("[BusinessChat] WS Error", e);
                try { ws.close(); } catch { }
                reject(e);
            };

            ws.onclose = (e) => {
                console.log("[BusinessChat] WS Closed", e.code, e.reason);
                if (!streamCompleted) {
                    setIsStreaming(false);
                }
            };
        });
    };

    const sendMessage = async (textInput = null) => {
        if (isStreaming) return;

        let text = (typeof textInput === 'string' ? textInput : "").trim();
        // If coming from ChatInput ref, might need logic, but simpler to rely on onSend(text)

        if (!text && attachmentsHook.attachments.length === 0) return;

        // Add User Message
        const userMsg = {
            role: "user",
            content: text,
            images: attachmentsHook.attachments, // Base64
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        };

        const newMessages = [...chat.messages, userMsg];
        chat.setMessages(newMessages);

        // Persist immediately to ensure ID creation if new
        // CRITICAL: Capture the returned ID
        let chatId = chat.currentChatId;
        const persistedId = await chat.persistChat(newMessages, chatId, "Consultor Business");

        if (persistedId) {
            chatId = persistedId;
            if (chatId !== chat.currentChatId) {
                chat.setCurrentChatId(chatId);
            }
        }

        // Clear inputs
        attachmentsHook.clearAttachments();

        // Start Stream
        setIsStreaming(true);
        try {
            // Pass chatId explicitly to closure
            await streamAgentViaWS(newMessages, isThinkingMode, chatId);
        } catch (e) {
            console.error(e);
            setIsStreaming(false);
            chat.setMessages(prev => [...prev, { role: "assistant", content: "Erro ao conectar com o servidor." }]);
        }
    };

    const stopGeneration = () => {
        if (wsRef.current) wsRef.current.close();
        setIsStreaming(false);
    };

    return (
        <div className="flex flex-col h-full bg-black/20 border-l border-white/5 relative">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-white/5">
                <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                    <span className="font-medium text-sm text-emerald-400">Luna Advisor</span>
                </div>
                {/* Close is handled by parent layout mostly, but we can put close sidebar here if toggleable */}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-hidden relative flex flex-col">
                <MessageList
                    messages={chat.messages}
                    isStreaming={isStreaming}
                    streamBuffer={streamBuffer}
                    streamThought={streamThought}
                    activeTool={activeTool}
                    toolStatus={toolStatus}
                    onRegenerate={() => { }} // TODO
                    onFavorite={() => { }} // TODO
                    // Adapter for artifacts to just log for now or support simple viewing
                    onOpenArtifact={() => { }}
                />
            </div>

            {/* Input */}
            <div className="p-4 pt-2">
                <ChatInput
                    ref={chatInputRef}
                    onSend={sendMessage}
                    isStreaming={isStreaming}
                    onStop={stopGeneration}
                    attachmentsHook={attachmentsHook}
                    // Business Chat: No think mode or canvas mode
                    isThinkingMode={false}
                    setIsThinkingMode={() => { }}
                    isCanvasMode={false}
                    setIsCanvasMode={() => { }}
                    hideToggles={true}
                    compact={true} // Add compact prop if available or style locally
                />
            </div>
        </div>
    );
}
