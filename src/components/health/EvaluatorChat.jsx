import React, { useState, useRef, useEffect } from "react";
import { Users, FileText, BarChart3, ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import { MessageList } from "../chat/MessageList";
import { ChatInput } from "../chat/ChatInput";
import { useChat } from "../../hooks/useChat";
import { useAttachments } from "../../hooks/useAttachments";
import { useAuth } from "../../contexts/AuthContext";
import { API_CONFIG } from "../../config/api";
import { parseThought } from "../../utils/messageUtils";

export function EvaluatorChat({ isOpen, onClose, userId: propUserId, onUpdate, initialMessage = null }) {
    // Hooks
    const chat = useChat();
    const attachmentsHook = useAttachments();
    const { user, profile } = useAuth();
    
    // Obter userId do AuthContext se disponível, senão usar prop ou "local"
    const userId = user?.uid || propUserId || "local";
    
    // State
    const [isStreaming, setIsStreaming] = useState(false);
    const [streamBuffer, setStreamBuffer] = useState("");
    const [streamThought, setStreamThought] = useState(null);
    const [activeTool, setActiveTool] = useState(null);
    const [toolStatus, setToolStatus] = useState(null);
    const [isThinkingMode, setIsThinkingMode] = useState(false);
    const [studentsList, setStudentsList] = useState([]);
    const [showStudentsList, setShowStudentsList] = useState(false);

    // Refs
    const wsRef = useRef(null);
    const chatInputRef = useRef(null);
    const activeToolRef = useRef(null);
    const initializedRef = useRef(false);

    // Carregar lista de alunos vinculados
    useEffect(() => {
        const loadStudents = async () => {
            try {
                const response = await fetch(`${API_CONFIG.BASE_URL}/health/profile/students?user_id=${userId}`);
                const data = await response.json();
                
                if (data.success && data.students_info) {
                    setStudentsList(data.students_info);
                }
            } catch (error) {
                console.error("[EvaluatorChat] Erro ao carregar alunos:", error);
            }
        };
        
        if (isOpen && userId) {
            loadStudents();
        }
    }, [isOpen, userId]);

    // Initialize chat on mount
    useEffect(() => {
        if (isOpen && userId && !initializedRef.current) {
            initializedRef.current = true;
            const loadEvaluatorChat = async () => {
                try {
                    const query = userId ? `?user_id=${userId}` : "";
                    const r = await fetch(`${API_CONFIG.BASE_URL}/chats${query}`);
                    const d = await r.json();

                    if (d.success) {
                        // Find ALL Evaluator Health Chats AND SORT by update time
                        const evaluatorChats = d.chats
                            .filter(c => c.title === "Luna Health - Modo Avaliador")
                            .sort((a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at));

                        if (evaluatorChats.length > 0) {
                            const primaryChat = evaluatorChats[0];
                            console.log("[EvaluatorChat] Loading primary chat:", primaryChat.id);
                            await chat.loadChat(primaryChat.id);

                            if (evaluatorChats.length > 1) {
                                console.warn(`[EvaluatorChat] Found ${evaluatorChats.length} duplicates. Using recent: ${primaryChat.id}`);
                            }
                        } else {
                            console.log("[EvaluatorChat] No existing chat, starting new.");
                            chat.startNewChat();
                            
                            // Mensagem inicial para avaliadores
                            const initialMsg = {
                                role: "assistant",
                                content: `Olá! 👋 Sou a Luna Health, sua assistente nutricional especializada em análise profissional.\n\nEstou aqui para te ajudar a acompanhar e analisar os dados nutricionais dos seus pacientes/alunos de forma eficiente e baseada em dados.\n\n**O que posso fazer por você:**\n- 📊 Analisar dados de qualquer aluno vinculado (basta mencionar o nome)\n- 📈 Comparar progresso entre múltiplos alunos\n- 📋 Gerar relatórios profissionais completos\n- 🔍 Identificar padrões e tendências nutricionais\n- 💡 Fornecer insights e recomendações baseadas em evidências\n\n**Como usar:**\n- Mencione o nome de um aluno e eu busco os dados automaticamente\n- Use comandos como "mostre os dados do [nome]", "compare [aluno1] e [aluno2]", "gere relatório de [nome]"\n- Ou peça para listar todos os alunos vinculados\n\n${studentsList.length > 0 ? `**Alunos vinculados:** ${studentsList.map(s => s.name || s.id.substring(0, 8)).join(", ")}` : "Você ainda não tem alunos vinculados. Compartilhe seu código de avaliador para que alunos se vinculem."}\n\nComo posso te ajudar hoje? 🎯`,
                                timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                            };
                            
                            chat.setMessages([initialMsg]);
                        }
                    }
                } catch (e) {
                    console.error("Error loading evaluator chat:", e);
                    initializedRef.current = false;
                }
            };
            loadEvaluatorChat();
        }
    }, [isOpen, userId, studentsList.length]);
    
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
                console.log("[EvaluatorChat] WebSocket connected");

                const formattedMessages = next.map(m => ({
                    role: m.role,
                    content: m.content,
                    images: m.images || []
                }));

                // IMPORTANTE: Não enviar view_as_student_id para modo avaliador
                // O backend detectará que é avaliador e usará o prompt de avaliador
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
                        user_name: profile?.name || "Avaliador",
                        view_as_student_id: null // NÃO enviar - modo avaliador padrão
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
                            
                            // Mensagens específicas para ferramentas de avaliador
                            if (toolName === "get_student_data") toolInfo.message = "Buscando dados do aluno...";
                            if (toolName === "list_all_students") toolInfo.message = "Listando alunos vinculados...";
                            if (toolName === "compare_students") toolInfo.message = "Comparando dados dos alunos...";
                            if (toolName === "get_student_summary") toolInfo.message = "Gerando resumo do aluno...";
                            if (toolName === "generate_student_report") toolInfo.message = "Gerando relatório profissional...";
                            
                            // Ferramentas padrão de health
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
                                chat.persistChat(newMsgs, activeChatId, "Luna Health - Modo Avaliador");
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
                console.error("[EvaluatorChat] WS Error", e);
                try { ws.close(); } catch { }
                reject(e);
            };

            ws.onclose = (e) => {
                console.log("[EvaluatorChat] WS Closed", e.code, e.reason);
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
        const newId = await chat.persistChat(next, activeChatId, "Luna Health - Modo Avaliador");
        const finalChatId = newId || activeChatId;

        attachmentsHook.clearAttachments();

        try {
            await streamAgentViaWS(next, isThinkingMode, finalChatId);
        } catch (e) {
            console.error("[EvaluatorChat] Send error:", e);
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
            {/* Banner de modo avaliador melhorado */}
            <div className="px-4 py-2.5 bg-gradient-to-r from-purple-500/20 via-indigo-500/20 to-purple-500/20 border-b border-purple-500/30 flex items-center justify-between">
                <div className="flex items-center gap-2 flex-1">
                    <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center flex-shrink-0">
                        <Sparkles className="w-4 h-4 text-purple-300" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <span className="text-sm font-semibold text-purple-200 block truncate">
                            Modo Avaliador - Análise Profissional
                        </span>
                        <span className="text-xs text-purple-300/80 block truncate">
                            Ferramentas especializadas para análise nutricional de pacientes
                        </span>
                    </div>
                </div>
                {studentsList.length > 0 && (
                    <button
                        onClick={() => setShowStudentsList(!showStudentsList)}
                        className="ml-2 px-2 py-1 rounded-md bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 flex items-center gap-1.5 text-xs text-purple-200 transition-colors flex-shrink-0"
                        title="Ver lista de alunos"
                    >
                        <Users className="w-3.5 h-3.5" />
                        <span className="font-medium">{studentsList.length}</span>
                        {showStudentsList ? (
                            <ChevronUp className="w-3 h-3" />
                        ) : (
                            <ChevronDown className="w-3 h-3" />
                        )}
                    </button>
                )}
            </div>
            
            {/* Lista de alunos colapsável */}
            {showStudentsList && studentsList.length > 0 && (
                <div className="px-4 py-2 bg-purple-500/10 border-b border-purple-500/20 max-h-48 overflow-y-auto">
                    <div className="text-xs font-semibold text-purple-300 mb-2 flex items-center gap-1">
                        <Users className="w-3.5 h-3.5" />
                        Alunos Vinculados ({studentsList.length})
                    </div>
                    <div className="space-y-1.5">
                        {studentsList.map((student) => (
                            <div
                                key={student.id}
                                className="px-2.5 py-1.5 rounded-md bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 transition-colors"
                            >
                                <div className="text-sm font-medium text-purple-200 truncate">
                                    {student.name || "Aluno"}
                                </div>
                                {student.email && (
                                    <div className="text-xs text-purple-300/70 truncate mt-0.5">
                                        {student.email}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="mt-2 pt-2 border-t border-purple-500/20">
                        <p className="text-xs text-purple-300/80">
                            💡 Mencione o nome de um aluno no chat para analisar seus dados automaticamente
                        </p>
                    </div>
                </div>
            )}
            
            {/* Header diferenciado */}
            <div className="p-4 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-purple-500/5 to-transparent">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-purple-500/30">
                        <Users className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                            Luna Health
                            <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-300 rounded-full border border-purple-500/30">
                                Avaliador
                            </span>
                        </h2>
                        <span className="font-medium text-sm text-purple-400 flex items-center gap-1.5 mt-0.5">
                            <BarChart3 className="w-3.5 h-3.5" />
                            Análise profissional de pacientes
                        </span>
                    </div>
                </div>
                {studentsList.length > 0 && !showStudentsList && (
                    <div className="text-xs text-white/60 flex items-center gap-1.5 px-2 py-1 rounded-md bg-purple-500/10 border border-purple-500/20">
                        <BarChart3 className="w-3 h-3 text-purple-400" />
                        <span className="font-medium text-purple-300">{studentsList.length}</span>
                        <span className="text-purple-400/70">aluno{studentsList.length !== 1 ? 's' : ''}</span>
                    </div>
                )}
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
