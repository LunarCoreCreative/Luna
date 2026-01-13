import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, History, Globe, FileText, CheckCircle2 } from "lucide-react";
import { MessageList } from "../chat/MessageList";
import { ChatInput } from "../chat/ChatInput";
import { useChat } from "../../hooks/useChat";
import { useAttachments } from "../../hooks/useAttachments";
import { useAuth } from "../../contexts/AuthContext";
import { API_CONFIG } from "../../config/api";
import { parseThought, cleanContent } from "../../utils/messageUtils";

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

                        if (data.content) {
                            // Use centralized cleaning function
                            const cleaned = cleanContent(data.content);
                            
                            if (cleaned) {
                                fullText += cleaned;
                            }
                        }
                    }

                    if (data.done) {
                        streamCompleted = true;

                        // Clean final text before saving using centralized function
                        let finalText = cleanContent(fullText);

                        if (finalText.trim()) {
                            const finalMsg = {
                                role: "assistant",
                                content: finalText,
                                thought: data.thought || currentThought,
                                timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                            };
                            
                            // CRITICAL: Validate activeChatId before persisting
                            if (!activeChatId) {
                                console.error("[BusinessChat] ❌ Erro: activeChatId é null/undefined ao persistir mensagem final");
                                // Try to get from chat.currentChatId as fallback
                                const fallbackId = chat.currentChatId;
                                if (fallbackId) {
                                    console.warn("[BusinessChat] ⚠️ Usando currentChatId como fallback:", fallbackId);
                                    chat.setMessages(prev => {
                                        const newMsgs = [...prev, finalMsg];
                                        chat.persistChat(newMsgs, fallbackId, "Consultor Business");
                                        return newMsgs;
                                    });
                                } else {
                                    console.error("[BusinessChat] ❌ Não foi possível persistir: nenhum chatId disponível");
                                    chat.setMessages(prev => [...prev, finalMsg]);
                                }
                            } else {
                                console.log("[BusinessChat] 💾 Persistindo mensagem final com activeChatId:", activeChatId);
                                chat.setMessages(prev => {
                                    const newMsgs = [...prev, finalMsg];
                                    // CRITICAL FIX: Use activeChatId (passed as arg) instead of stale chat.currentChatId
                                    const persistedId = chat.persistChat(newMsgs, activeChatId, "Consultor Business");
                                    // Update currentChatId if persistChat returned a different ID
                                    if (persistedId && persistedId !== activeChatId) {
                                        console.log("[BusinessChat] 🔄 ID mudou durante persistência:", activeChatId, "→", persistedId);
                                        chat.setCurrentChatId(persistedId);
                                    }
                                    return newMsgs;
                                });
                            }
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
        // CRITICAL: Always use the ID returned by persistChat to avoid stale chatId
        let chatId = chat.currentChatId;
        console.log("[BusinessChat] 📝 Persistindo mensagem, chatId atual:", chatId);
        
        const persistedId = await chat.persistChat(newMessages, chatId, "Consultor Business");
        
        // Always use the ID returned by persistChat (new or existing)
        if (persistedId) {
            chatId = persistedId;
            console.log("[BusinessChat] ✅ Chat persistido com ID:", chatId);
            
            // Update currentChatId if it changed (e.g., new chat created)
            if (chatId !== chat.currentChatId) {
                console.log("[BusinessChat] 🔄 Atualizando currentChatId:", chat.currentChatId, "→", chatId);
                chat.setCurrentChatId(chatId);
            }
        } else {
            // Fallback: use currentChatId if persistChat didn't return ID
            chatId = chat.currentChatId || chatId;
            console.warn("[BusinessChat] ⚠️ persistChat não retornou ID, usando:", chatId);
        }
        
        // Validate chatId before proceeding
        if (!chatId) {
            console.error("[BusinessChat] ❌ Erro: chatId é null/undefined após persistência");
            setIsStreaming(false);
            chat.setMessages(prev => [...prev, { 
                role: "assistant", 
                content: "Erro: Não foi possível identificar o chat. Por favor, tente novamente." 
            }]);
            return;
        }

        // Clear inputs
        attachmentsHook.clearAttachments();

        // Start Stream
        setIsStreaming(true);
        try {
            // Pass chatId explicitly to closure - this is the source of truth
            console.log("[BusinessChat] 🚀 Iniciando stream com chatId:", chatId);
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

    const regenerateResponse = useCallback(async (messageIndex) => {
        if (isStreaming) {
            console.warn("[BusinessChat] Não é possível regenerar durante streaming");
            return;
        }

        // Encontra a última mensagem do usuário antes desta mensagem do assistente
        let lastUserMsgIndex = -1;
        for (let i = messageIndex - 1; i >= 0; i--) {
            if (chat.messages[i].role === "user") {
                lastUserMsgIndex = i;
                break;
            }
        }

        if (lastUserMsgIndex === -1) {
            console.warn("[BusinessChat] Não foi possível encontrar mensagem do usuário para regenerar");
            return;
        }

        // Remove todas as mensagens APÓS a mensagem do usuário (mantém a mensagem do usuário)
        const newMessages = chat.messages.slice(0, lastUserMsgIndex + 1);
        chat.setMessages(newMessages);

        // Persiste o estado atualizado
        const chatId = chat.currentChatId;
        await chat.persistChat(newMessages, chatId, "Consultor Business");

        // Reenvia a última mensagem do usuário
        const lastUserMsg = newMessages[newMessages.length - 1];
        if (lastUserMsg && lastUserMsg.content) {
            console.log("[BusinessChat] Regenerando resposta para:", lastUserMsg.content);
            // Usa setTimeout para garantir que o estado foi atualizado
            setTimeout(() => {
                sendMessage(lastUserMsg.content);
            }, 100);
        }
    }, [chat, isStreaming, sendMessage]);

    const toggleFavorite = useCallback((messageIndex) => {
        chat.setMessages(prev => 
            prev.map((msg, i) => 
                i === messageIndex 
                    ? { ...msg, isFavorite: !msg.isFavorite }
                    : msg
            )
        );

        // Persiste mudança de favorito
        const updatedMessages = chat.messages.map((msg, i) => 
            i === messageIndex 
                ? { ...msg, isFavorite: !msg.isFavorite }
                : msg
        );
        
        const chatId = chat.currentChatId;
        if (chatId) {
            chat.persistChat(updatedMessages, chatId, "Consultor Business");
        }
    }, [chat]);

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
                    onRegenerate={regenerateResponse}
                    onFavorite={toggleFavorite}
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
