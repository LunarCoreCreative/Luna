import React, { useState, useRef, useEffect } from "react";
import { X, History, Globe, FileText, CheckCircle2, User } from "lucide-react";
import { MessageList } from "../chat/MessageList";
import { ChatInput } from "../chat/ChatInput";
import { useChat } from "../../hooks/useChat";
import { useAttachments } from "../../hooks/useAttachments";
import { useAuth } from "../../contexts/AuthContext";
import { API_CONFIG } from "../../config/api";
import { parseThought } from "../../utils/messageUtils";

export function HealthChat({ isOpen, onClose, userId: propUserId, viewAsStudentId = null, studentName = null, onUpdate, initialMessage = null }) {
    // Hooks
    const chat = useChat();
    const attachmentsHook = useAttachments();
    const { user, profile } = useAuth();
    
    // Obter userId do AuthContext se disponível, senão usar prop ou "local"
    const userId = user?.uid || propUserId || "local";
    
    // Estado para armazenar nome do aluno (se não fornecido via prop)
    const [studentDisplayName, setStudentDisplayName] = useState(studentName);

    // Buscar nome do aluno se viewAsStudentId estiver presente e nome não fornecido
    useEffect(() => {
        if (viewAsStudentId && !studentDisplayName) {
            const fetchStudentName = async () => {
                try {
                    // Tentar buscar da lista de alunos do avaliador
                    const response = await fetch(`${API_CONFIG.BASE_URL}/health/profile/students?user_id=${userId}`);
                    const data = await response.json();
                    
                    if (data.success && data.students_info) {
                        const studentInfo = data.students_info.find(s => s.id === viewAsStudentId);
                        if (studentInfo?.name) {
                            setStudentDisplayName(studentInfo.name);
                            return;
                        }
                    }
                    
                    // Fallback: usar ID truncado
                    setStudentDisplayName(viewAsStudentId.substring(0, 16) + "...");
                } catch (error) {
                    console.error("[HealthChat] Erro ao buscar nome do aluno:", error);
                    setStudentDisplayName("Aluno");
                }
            };
            
            fetchStudentName();
        } else if (!viewAsStudentId) {
            setStudentDisplayName(null);
        }
    }, [viewAsStudentId, userId, studentDisplayName]);

    // Atualizar nome quando prop mudar
    useEffect(() => {
        if (studentName) {
            setStudentDisplayName(studentName);
        }
    }, [studentName]);

    // State
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamBuffer, setStreamBuffer] = useState("");
    const [streamThought, setStreamThought] = useState(null);
    const [activeTool, setActiveTool] = useState(null);
    const [toolStatus, setToolStatus] = useState(null);
    const [isThinkingMode, setIsThinkingMode] = useState(false);

    // Refs
    const wsRef = useRef(null);
    const chatInputRef = useRef(null);
    const activeToolRef = useRef(null);
    const initializedRef = useRef(false);
    const lastViewAsStudentIdRef = useRef(null);

    // Initialize chat on mount or when viewAsStudentId changes
    useEffect(() => {
        // Reset initialization if viewAsStudentId changed
        if (viewAsStudentId !== lastViewAsStudentIdRef.current) {
            initializedRef.current = false;
            lastViewAsStudentIdRef.current = viewAsStudentId;
        }
        
        if (isOpen && userId && !initializedRef.current) {
            initializedRef.current = true;
            const loadHealthChat = async () => {
                try {
                    const query = userId ? `?user_id=${userId}` : "";
                    const r = await fetch(`${API_CONFIG.BASE_URL}/chats${query}`);
                    const d = await r.json();

                    if (d.success) {
                        // Find ALL Health Chats AND SORT by update time
                        const healthChats = d.chats
                            .filter(c => c.title === "Luna Health")
                            .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

                        if (healthChats.length > 0) {
                            const primaryChat = healthChats[0];
                            console.log("[HealthChat] Loading primary chat:", primaryChat.id);
                            await chat.loadChat(primaryChat.id);

                            if (healthChats.length > 1) {
                                console.warn(`[HealthChat] Found ${healthChats.length} duplicates. Using recent: ${primaryChat.id}`);
                            }
                        } else {
                            console.log("[HealthChat] No existing chat, starting new.");
                            chat.startNewChat();
                            
                            // Mensagem inicial diferente para avaliadores visualizando alunos
                            let initialMessage;
                            if (viewAsStudentId && studentDisplayName) {
                                initialMessage = {
                                    role: "assistant",
                                    content: `Olá! 👋 Sou a Luna Health, sua assistente nutricional.\n\nVejo que você está analisando os dados nutricionais de **${studentDisplayName}**. 📊\n\nPosso te ajudar a:\n- Analisar o progresso nutricional do aluno\n- Revisar refeições e padrões alimentares\n- Avaliar o cumprimento das metas nutricionais\n- Sugerir melhorias e orientações personalizadas\n- Gerar relatórios e insights sobre a alimentação\n\nO que você gostaria de saber sobre ${studentDisplayName}? Posso começar mostrando um resumo do progresso atual ou você tem alguma área específica que quer avaliar? 🎯`,
                                    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                };
                            } else {
                                // Mensagem inicial padrão para alunos
                                initialMessage = {
                                    role: "assistant",
                                    content: `Olá! Sou a Luna Health, sua nutricionista inteligente. 🥗\n\nEstou aqui para te ajudar a alcançar seus objetivos nutricionais!\n\nPara começar, preciso conhecer você melhor. Posso fazer algumas perguntas rápidas para calcular suas metas nutricionais personalizadas?\n\n💡 **Dica**: Você pode ver seu diário alimentar completo na aba **"Hoje"** (ícone de calendário 📅) aqui ao lado, e configurar suas metas na aba **"Metas"** (ícone de alvo 🎯).\n\nVamos começar? 😊`,
                                    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                                };
                            }
                            
                            chat.setMessages([initialMessage]);
                        }
                    }
                } catch (e) {
                    console.error("Error loading health chat:", e);
                    initializedRef.current = false;
                }
            };
            loadHealthChat();
        }
    }, [isOpen, userId, viewAsStudentId, studentDisplayName]);
    
    // Enviar mensagem inicial quando fornecida
    const lastInitialMessageRef = useRef(null);
    useEffect(() => {
        if (initialMessage && initialMessage !== lastInitialMessageRef.current) {
            lastInitialMessageRef.current = initialMessage;
            // Aguardar um pouco para garantir que o chat está pronto
            const timer = setTimeout(() => {
                if (chat.messages.length > 0 && !isStreaming) {
                    sendMessage(initialMessage);
                }
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [initialMessage]);
    
    // WebSocket Logic
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
                console.log("[HealthChat] WebSocket connected");

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
                        health_mode: true, // Health Mode flag
                        canvas_mode: false,
                        user_id: userId,
                        user_name: profile?.name || "Usuário",
                        view_as_student_id: viewAsStudentId || null // Para avaliadores visualizarem alunos
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
                            if (toolName === "add_meal") toolInfo.message = "Registrando refeição...";
                            if (toolName === "get_nutrition_summary") toolInfo.message = "Calculando resumo nutricional...";
                            if (toolName === "update_goals") toolInfo.message = "Atualizando metas...";

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

                        // Limpar tags de tool calls
                        filteredContent = filteredContent.replace(/<\s*\|\s*tool_calls?_(begin|end)\s*\|\s*>/gi, "");
                        filteredContent = filteredContent.replace(/<\s*\|\s*tool_sep\s*\|\s*>/gi, "");
                        filteredContent = filteredContent.replace(/<\s*\|\s*tool_call_(begin|end)\s*\|\s*>/gi, "");
                        filteredContent = filteredContent.replace(/<\s*\|\s*tool_[\s\S]*?\|\s*>/gi, "");
                        filteredContent = filteredContent.replace(/<\|.*?\|>/g, '');
                        
                        // Limpar nomes de tools entre colchetes [tool_name]
                        filteredContent = filteredContent.replace(/\[(?:list_all_students|get_student_data|compare_students|get_student_summary|generate_student_report|add_meal|get_nutrition_summary|update_goals|create_meal_preset|edit_meal_preset|delete_meal_preset|list_meal_presets|list_meal_types|create_meal_plan|get_food_nutrition|search_food)\]/gi, "");

                        if (filteredContent.trim()) {
                            fullText += filteredContent;
                        }
                    }

                    if (data.done) {
                        streamCompleted = true;

                        let finalText = fullText;
                        finalText = finalText.replace(/<\s*\|\s*tool_calls?_(begin|end)\s*\|\s*>/gi, "")
                            .replace(/<\s*\|\s*tool_sep\s*\|\s*>/gi, "")
                            .replace(/<\s*\|\s*tool_call_(begin|end)\s*\|\s*>/gi, "")
                            .replace(/<\s*\|\s*tool_[\s\S]*?\|\s*>/gi, "")
                            .replace(/<\|.*?\|>/g, '')
                            // Limpar nomes de tools entre colchetes [tool_name]
                            .replace(/\[(?:list_all_students|get_student_data|compare_students|get_student_summary|generate_student_report|add_meal|get_nutrition_summary|update_goals|create_meal_preset|edit_meal_preset|delete_meal_preset|list_meal_presets|list_meal_types|create_meal_plan|get_food_nutrition|search_food)\]/gi, "");

                        if (finalText.trim()) {
                            const finalMsg = {
                                role: "assistant",
                                content: finalText,
                                thought: data.thought || currentThought,
                                timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                            };
                            chat.setMessages(prev => {
                                const newMsgs = [...prev, finalMsg];
                                chat.persistChat(newMsgs, activeChatId, "Luna Health");
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
                console.error("[HealthChat] WS Error", e);
                try { ws.close(); } catch { }
                reject(e);
            };

            ws.onclose = (e) => {
                console.log("[HealthChat] WS Closed", e.code, e.reason);
                if (!streamCompleted) {
                    setIsStreaming(false);
                }
            };
        });
    };

    const sendMessage = async (textInput = null) => {
        if (isStreaming) return;

        let text = (typeof textInput === 'string' ? textInput : "").trim();

        if (!text && attachmentsHook.attachments.length === 0) return;

        const newMessage = {
            role: "user",
            content: text || "Analise estas imagens:",
            images: attachmentsHook.attachments,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        };

        const next = [...chat.messages, newMessage];
        chat.setMessages(next);

        setIsStreaming(true);
        setStreamBuffer("");
        setStreamThought(null);
        setActiveTool(null);

        const activeChatId = chat.currentChatId;
        const newId = await chat.persistChat(next, activeChatId, "Luna Health");
        const finalChatId = newId || activeChatId;

        attachmentsHook.clearAttachments();

        try {
            await streamAgentViaWS(next, isThinkingMode, finalChatId);
        } catch (e) {
            console.error("[HealthChat] Send error:", e);
            chat.setMessages(prev => [...prev, { role: "assistant", content: `Erro: ${e.message}` }]);
            setIsStreaming(false);
        }
    };

    const stopGeneration = () => {
        if (wsRef.current) {
            wsRef.current.close();
        }
        setIsStreaming(false);
    };

    // Render directly (no modal overlay) - parent handles layout
    return (
        <div className="h-full flex flex-col">
            {/* Banner quando visualizando dados de aluno */}
            {viewAsStudentId && (
                <div className="px-4 py-2 bg-blue-500/20 border-b border-blue-500/30 flex items-center gap-2">
                    <User className="w-4 h-4 text-blue-400 flex-shrink-0" />
                    <span className="text-sm text-blue-300">
                        Analisando dados de <span className="font-semibold text-blue-200">{studentDisplayName || "Aluno"}</span>
                    </span>
                </div>
            )}
            
            {/* Header */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                        <span className="text-white text-xl">🥗</span>
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Luna Health</h2>
                        <span className="font-medium text-sm text-green-400">
                            {viewAsStudentId ? "Análise do aluno" : "Sua nutricionista"}
                        </span>
                    </div>
                </div>
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
                    onRegenerate={() => { }}
                    onFavorite={() => { }}
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
                    isThinkingMode={false}
                    setIsThinkingMode={() => { }}
                    isCanvasMode={false}
                    setIsCanvasMode={() => { }}
                    hideToggles={true}
                    compact={true}
                />
            </div>
        </div>
    );
}
