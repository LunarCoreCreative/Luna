/**
 * useCodeAgent Hook
 * -----------------
 * Hook para gerenciar a conexão WebSocket com o Code Agent (modo IDE).
 */

import { useState, useRef, useCallback, useEffect } from 'react';

const WS_URL = "ws://localhost:8001/ws/code-agent";
const API_URL = "http://localhost:8001";

export function useCodeAgent() {
    // Estado do workspace
    const [workspace, setWorkspace] = useState(null);
    const [isConfigured, setIsConfigured] = useState(false);

    // Estado de conexão
    const [isConnected, setIsConnected] = useState(false);
    const [isStreaming, setIsStreaming] = useState(false);

    // Estado do agente
    const [messages, setMessages] = useState([]);
    const [streamBuffer, setStreamBuffer] = useState("");
    const [toolCalls, setToolCalls] = useState([]);
    const [pendingApproval, setPendingApproval] = useState(null);
    const [status, setStatus] = useState(null);
    const [chats, setChats] = useState([]);
    const [activeChatId, setActiveChatId] = useState(null);
    const [progressSteps, setProgressSteps] = useState([]);

    // Refs
    const wsRef = useRef(null);
    const isStreamingRef = useRef(false);
    const activeChatIdRef = useRef(activeChatId);

    // Keep activeChatIdRef in sync
    useEffect(() => {
        activeChatIdRef.current = activeChatId;
    }, [activeChatId]);

    // Verifica workspace e restaura sessão do localStorage
    useEffect(() => {
        restoreSession();
    }, []);

    const restoreSession = async () => {
        // 1. Restaura workspace do localStorage
        const savedWorkspace = localStorage.getItem('luna_ide_workspace');
        const savedChatId = localStorage.getItem('luna_ide_active_chat');

        if (savedWorkspace) {
            try {
                // Verifica se o workspace ainda é válido no backend
                const res = await fetch(`${API_URL}/code-agent/set-workspace`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: savedWorkspace })
                });
                const data = await res.json();
                if (data.success) {
                    setWorkspace(data.workspace);
                    setIsConfigured(true);

                    // 2. Se tinha um chat ativo, tenta carregar
                    if (savedChatId) {
                        const chatRes = await fetch(`${API_URL}/code-agent/chats/load`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ chat_id: savedChatId })
                        });
                        const chatData = await chatRes.json();
                        if (chatData.success && chatData.chat) {
                            setActiveChatId(savedChatId);
                            const chatMessages = chatData.chat.messages || [];
                            setMessages(chatMessages.map(m => ({
                                ...m,
                                timestamp: m.timestamp || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                            })));
                            console.log('[CodeAgent] Sessão restaurada:', savedChatId);
                        }
                    }
                } else {
                    // Workspace inválido, limpa localStorage
                    localStorage.removeItem('luna_ide_workspace');
                    localStorage.removeItem('luna_ide_active_chat');
                }
            } catch (e) {
                console.error('[CodeAgent] Failed to restore session:', e);
            }
        } else {
            // Sem workspace salvo, verifica o backend
            checkWorkspace();
        }
    };

    const checkWorkspace = async () => {
        try {
            const res = await fetch(`${API_URL}/code-agent/workspace`);
            const data = await res.json();
            if (data.success) {
                setWorkspace(data.workspace);
                setIsConfigured(true);
            } else {
                setIsConfigured(false);
            }
        } catch (e) {
            console.error("[CodeAgent] Failed to check workspace:", e);
        }
    };

    const setWorkspacePath = async (path) => {
        try {
            const res = await fetch(`${API_URL}/code-agent/set-workspace`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            });
            const data = await res.json();
            if (data.success) {
                setWorkspace(data.workspace);
                setIsConfigured(true);
                // Salva no localStorage
                localStorage.setItem('luna_ide_workspace', path);
                return { success: true };
            }
            return { success: false, error: data.error };
        } catch (e) {
            return { success: false, error: e.message };
        }
    };

    const leaveWorkspace = () => {
        setWorkspace(null);
        setIsConfigured(false);
        setMessages([]);
        setActiveChatId(null);
        // Limpa localStorage
        localStorage.removeItem('luna_ide_workspace');
        localStorage.removeItem('luna_ide_active_chat');
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
    };

    // Gerenciamento de Chats
    const fetchChats = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/code-agent/chats`);
            const data = await res.json();
            if (data.success) {
                setChats(data.chats);
            }
        } catch (e) {
            console.error("[CodeAgent] Failed to fetch chats:", e);
        }
    }, []);

    const loadChat = useCallback(async (chatId) => {
        try {
            const res = await fetch(`${API_URL}/code-agent/chats/load`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chat_id: chatId })
            });
            const data = await res.json();
            if (data.success) {
                setActiveChatId(chatId);
                const chatMessages = data.chat.messages || [];

                // Filtra mensagens que não devem ser exibidas diretamente:
                // - role: "tool" (resultados de ferramentas em JSON)
                // - role: "assistant" com tool_calls mas sem content (só chamadas de ferramenta)
                const visibleMessages = chatMessages.filter(m => {
                    if (m.role === 'tool') return false; // Oculta resultados de ferramentas
                    if (m.role === 'assistant' && m.tool_calls && !m.content?.trim()) return false;
                    return true;
                });

                setMessages(visibleMessages.map(m => ({
                    ...m,
                    timestamp: m.timestamp || new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                })));
                if (data.chat.workspace) {
                    setWorkspace(data.chat.workspace);
                    setIsConfigured(true);
                }
                return { success: true };
            }
        } catch (e) {
            console.error("[CodeAgent] Failed to load chat:", e);
        }
    }, []);

    const newChat = useCallback(async () => {
        try {
            const res = await fetch(`${API_URL}/code-agent/chats/new`, {
                method: 'POST'
            });
            const data = await res.json();
            if (data.success) {
                setActiveChatId(data.chat_id);
                setMessages([]);
                // Salva no localStorage
                localStorage.setItem('luna_ide_active_chat', data.chat_id);
                // Trigger WebSocket sync if needed
                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    wsRef.current.send(JSON.stringify({ type: 'new-chat' }));
                }
                return { success: true, chatId: data.chat_id };
            }
        } catch (e) {
            console.error("[CodeAgent] Failed to create new chat:", e);
        }
    }, []);

    const deleteChat = useCallback(async (chatId) => {
        try {
            const res = await fetch(`${API_URL}/code-agent/chats/${chatId}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                if (activeChatId === chatId) {
                    setActiveChatId(null);
                    setMessages([]);
                }
                fetchChats();
                return { success: true };
            }
        } catch (e) {
            console.error("[CodeAgent] Failed to delete chat:", e);
        }
    }, [activeChatId, fetchChats]);

    const connect = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) return;

        const ws = new WebSocket(WS_URL);

        ws.onopen = () => {
            console.log("[CodeAgent] WebSocket connected");
            setIsConnected(true);

            // Tenta retomar chat se houver um ID ativo
            if (activeChatIdRef.current) {
                console.log("[CodeAgent] Retomando chat:", activeChatIdRef.current);
                ws.send(JSON.stringify({
                    type: 'resume-chat',
                    chat_id: activeChatIdRef.current
                }));
            }
        };

        ws.onclose = () => {
            console.log("[CodeAgent] WebSocket disconnected");
            setIsConnected(false);
            setIsStreaming(false);
            isStreamingRef.current = false;
        };

        ws.onerror = (e) => {
            console.error("[CodeAgent] WebSocket error:", e);
        };

        ws.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleMessage(data);
            } catch (e) {
                console.error("[CodeAgent] Failed to parse message:", e);
            }
        };

        wsRef.current = ws;
    }, []);

    const disconnect = useCallback(() => {
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
    }, []);

    // Refs para evitar closure stale no handleMessage
    const streamBufferRef = useRef("");
    const toolCallsRef = useRef([]);
    const progressStepsRef = useRef([]);
    const stepCounterRef = useRef(0);

    const handleMessage = (data) => {
        // Start of stream
        if (data.start) {
            streamBufferRef.current = "";
            toolCallsRef.current = [];
            progressStepsRef.current = [];
            stepCounterRef.current = 0;
            setStreamBuffer("");
            setToolCalls([]);
            setProgressSteps([]);
            setStatus(null);
            setIsStreaming(true);
            isStreamingRef.current = true;
        }

        // Status updates
        if (data.status) {
            setStatus({ message: data.status, type: data.type || 'info' });
        }

        // Error handling
        if (data.error) {
            setMessages(prev => [...prev, {
                role: 'system',
                content: `❌ **Erro**: ${data.error}`,
                timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            }]);
            setIsStreaming(false);
            isStreamingRef.current = false;
            setStatus(null);
        }

        // Content streaming (narração aparece no streamBuffer normal)
        if (data.content) {
            streamBufferRef.current += data.content;
            setStreamBuffer(streamBufferRef.current);
        }

        // Tool calls
        if (data.tool_call) {
            toolCallsRef.current = [...toolCallsRef.current, data.tool_call];
            setToolCalls(toolCallsRef.current);
            setStatus({ message: `Executando: ${data.tool_call.name}`, type: 'tool' });

            // Criar progress step para esta tool call
            stepCounterRef.current += 1;
            const toolName = data.tool_call.name;
            const args = data.tool_call.args || {};

            // Determinar título amigável baseado na ferramenta
            const friendlyNames = {
                'read_file': 'Reading file...',
                'write_file': 'Writing file...',
                'replace_block': 'Editing file...',
                'list_directory': 'Listing directory...',
                'execute_command': 'Executing command...',
                'get_repo_map': 'Analyzing project...',
                'find_symbol': 'Finding symbol...',
                'web_search': 'Searching web...',
                'read_url': 'Reading URL...',
                'manage_artifact': 'Managing artifact...'
            };

            const newStep = {
                id: data.tool_call.id || `step_${stepCounterRef.current}`,
                status: 'running',
                title: friendlyNames[toolName] || `Executing ${toolName}...`,
                details: [{
                    type: args.path ? 'file' : args.command ? 'command' : 'file',
                    path: args.path || args.query || args.url,
                    action: toolName.includes('read') || toolName.includes('list') || toolName === 'get_repo_map' ? 'read' : 'write',
                    command: args.command
                }]
            };

            progressStepsRef.current = [...progressStepsRef.current, newStep];
            setProgressSteps([...progressStepsRef.current]);
        }

        // Tool results
        if (data.tool_result) {
            const updated = [...toolCallsRef.current];
            const callId = data.tool_call_id;

            // Busca pelo ID ou fallback para o último se não houver ID (retrocompatibilidade)
            if (callId) {
                const index = updated.findIndex(tc => tc.id === callId);
                if (index !== -1) {
                    updated[index].result = data.tool_result;
                }
            } else if (updated.length > 0) {
                updated[updated.length - 1].result = data.tool_result;
            }

            toolCallsRef.current = updated;
            setToolCalls(updated);

            // Atualizar progress step correspondente
            const stepIndex = progressStepsRef.current.findIndex(s => s.id === callId);
            if (stepIndex !== -1 || progressStepsRef.current.length > 0) {
                const idx = stepIndex !== -1 ? stepIndex : progressStepsRef.current.length - 1;
                const updatedSteps = [...progressStepsRef.current];
                updatedSteps[idx] = {
                    ...updatedSteps[idx],
                    status: data.tool_result?.success !== false ? 'done' : 'error',
                    details: updatedSteps[idx].details.map(d => ({
                        ...d,
                        added: data.tool_result?.diff?.added,
                        removed: data.tool_result?.diff?.removed
                    }))
                };
                progressStepsRef.current = updatedSteps;
                setProgressSteps([...updatedSteps]);
            }
        }

        // Requires approval
        if (data.requires_approval) {
            setPendingApproval(data.requires_approval);
            setIsStreaming(false);
            isStreamingRef.current = false;
        }

        // Approval final result
        if (data.type === 'approval-result') {
            setPendingApproval(null);
            if (data.message) {
                // Adiciona mensagem de sistema sobre a aprovação
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: `✅ ${data.message}`,
                    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                }]);
            }
        }

        // Workspace set confirmation
        if (data.type === 'workspace-set') {
            if (data.success) {
                setWorkspace(data.workspace);
                setIsConfigured(true);
            }
        }

        // Chat started confirmation
        if (data.type === 'chat-started') {
            setActiveChatId(data.chat_id);
            if (data.success) {
                setMessages([]);
            }
        }

        // Approval result
        if (data.type === 'approval-result') {
            setPendingApproval(null);
            if (data.result) {
                const updated = [...toolCallsRef.current];
                if (updated.length > 0) {
                    updated[updated.length - 1].result = data.result;
                }
                toolCallsRef.current = updated;
                setToolCalls(updated);
            }
        }

        // End of stream
        if (data.done) {
            const finalContent = streamBufferRef.current;
            const finalToolCalls = [...toolCallsRef.current];

            if (finalContent || finalToolCalls.length > 0) {
                setMessages(prev => [...prev, {
                    role: 'assistant',
                    content: finalContent,
                    toolCalls: finalToolCalls,
                    timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                }]);
            }

            streamBufferRef.current = "";
            toolCallsRef.current = [];
            setStreamBuffer("");
            setToolCalls([]);
            setStatus(null);
            setIsStreaming(false);
            isStreamingRef.current = false;

            // AUTO-SAVE: Salva o chat após cada resposta completa
            if (activeChatId) {
                localStorage.setItem('luna_ide_active_chat', activeChatId);
            }
        }

        // Error
        if (data.error) {
            setStatus({ message: data.error, type: 'error' });
            setIsStreaming(false);
            isStreamingRef.current = false;
        }
    };

    const sendMessage = useCallback((content, images = []) => {
        if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
            connect();
            // Wait for connection
            setTimeout(() => sendMessage(content, images), 500);
            return;
        }

        if (isStreamingRef.current) return;

        isStreamingRef.current = true;
        setIsStreaming(true);
        setStreamBuffer("");
        setToolCalls([]);

        // Add user message
        setMessages(prev => [...prev, {
            role: 'user',
            content,
            images,
            timestamp: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
        }]);

        wsRef.current.send(JSON.stringify({
            type: 'message',
            content,
            images
        }));
    }, [connect]);

    const approveCommand = useCallback((approved) => {
        if (!wsRef.current || !pendingApproval) return;

        wsRef.current.send(JSON.stringify({
            type: 'approve',
            approved
        }));

        if (!approved) {
            setPendingApproval(null);
        }
    }, [pendingApproval]);

    const clearMessages = useCallback(() => {
        setMessages([]);
        setStreamBuffer("");
        setToolCalls([]);
    }, []);

    return {
        // Workspace
        workspace,
        isConfigured,
        setWorkspacePath,
        checkWorkspace,

        // Connection
        isConnected,
        connect,
        disconnect,

        // State
        messages,
        streamBuffer,
        toolCalls,
        progressSteps,
        isStreaming,
        status,
        chats,
        activeChatId,

        // Approval
        pendingApproval,
        approveCommand,

        // Actions
        sendMessage,
        clearMessages,
        fetchChats,
        loadChat,
        newChat,
        deleteChat,
    };
}

export default useCodeAgent;
