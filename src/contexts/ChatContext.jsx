import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { sendMessageToGroq, createSystemMessage } from '@/services/groq';
import { getMemoryContext, saveMemory } from '@/services/memory';
import { DEFAULT_PERSONA_ID } from '@/services/personas';
import { useAuth } from '@/contexts/AuthContext';
import { saveChatToFirebase, getUserChats, deleteChatFromFirebase } from '@/lib/firebase';

const ChatContext = createContext();

export const useChat = () => {
    const context = useContext(ChatContext);
    if (!context) {
        throw new Error('useChat deve ser usado dentro de um ChatProvider');
    }
    return context;
};

export const ChatProvider = ({ children }) => {
    const { user } = useAuth();
    // Estado para armazenar todas as conversas (metadata)
    const [conversations, setConversations] = useState([]);

    // ID da conversa ativa
    const [currentChatId, setCurrentChatId] = useState(null);

    // Mensagens da conversa atual
    const [messages, setMessages] = useState([]);

    // Configurações do Chat (Global)
    const [chatSettings, setChatSettings] = useState({
        temperature: 0.6, // Ajustado para 0.6 conforme groq.js
        top_p: 0.9,
        model: 'openai/gpt-oss-120b'
    });

    const [isLoading, setIsLoading] = useState(false);
    const [processingStatus, setProcessingStatus] = useState(null); // { type: 'searching', content: 'termo' }

    const storageKey = `luna_chat_history_${user?.uid || 'anonymous'}`;

    const normalizeFirebaseChat = useCallback((chat) => {
        // Firestore pode retornar Timestamp/Date; normalizar para ISO string
        const updatedAt = chat.updated_at?.toDate ? chat.updated_at.toDate() : (chat.updated_at || null);
        const createdAt = chat.created_at?.toDate ? chat.created_at.toDate() : (chat.created_at || null);
        const date = (updatedAt || createdAt || new Date()).toISOString?.() || new Date().toISOString();

        return {
            id: chat.id,
            title: chat.title || 'Nova Conversa',
            date,
            personaId: chat.personaId || DEFAULT_PERSONA_ID,
            messages: Array.isArray(chat.messages) ? chat.messages : [],
            preview: chat.preview || (Array.isArray(chat.messages) && chat.messages.length
                ? String(chat.messages[chat.messages.length - 1]?.content || '').slice(0, 50)
                : undefined),
        };
    }, []);

    // Carregar conversas ao iniciar (Firestore se logado; senão localStorage)
    useEffect(() => {
        let cancelled = false;

        const load = async () => {
            try {
                // Preferir Firestore quando estiver autenticado
                if (user?.uid) {
                    console.log('[Chat] 🔄 Carregando conversas do Firestore para UID:', user.uid);
                    const chats = await getUserChats(user.uid, 100);
                    if (cancelled) return;
                    
                    if (chats && chats.length > 0) {
                        const normalized = chats.map(normalizeFirebaseChat);
                        console.log(`[Chat] ✅ Carregado histórico do Firestore: ${normalized.length} conversas`);
                        setConversations(normalized);
                    } else {
                        console.log('[Chat] ⚠️ Nenhuma conversa encontrada no Firestore, tentando localStorage...');
                        // Tentar localStorage como fallback
                        const stored = localStorage.getItem(storageKey);
                        if (stored) {
                            try {
                                const parsed = JSON.parse(stored);
                                const migrated = parsed.map(c => ({
                                    ...c,
                                    personaId: c.personaId || DEFAULT_PERSONA_ID
                                }));
                                console.log(`[Chat] ✅ Carregado histórico do localStorage: ${migrated.length} conversas`);
                                setConversations(migrated);
                            } catch (e) {
                                console.warn('[Chat] Erro ao parsear localStorage:', e);
                            }
                        }
                    }
                    return;
                }

                // Fallback: localStorage (por usuário/anon)
                console.log('[Chat] 🔄 Usuário não autenticado, carregando do localStorage...');
                const stored = localStorage.getItem(storageKey);
                if (stored) {
                    try {
                        const parsed = JSON.parse(stored);
                        const migrated = parsed.map(c => ({
                            ...c,
                            personaId: c.personaId || DEFAULT_PERSONA_ID
                        }));
                        if (!cancelled) {
                            console.log(`[Chat] ✅ Carregado histórico do localStorage: ${migrated.length} conversas`);
                            setConversations(migrated);
                        }
                    } catch (e) {
                        console.warn('[Chat] Erro ao parsear localStorage:', e);
                    }
                } else if (!cancelled) {
                    console.log('[Chat] Nenhuma conversa encontrada (nem Firestore nem localStorage)');
                    setConversations([]);
                }
            } catch (e) {
                console.error("[Chat] ❌ Erro ao carregar histórico:", e);
                // Em caso de erro, tentar localStorage como último recurso
                try {
                    const stored = localStorage.getItem(storageKey);
                    if (stored) {
                        const parsed = JSON.parse(stored);
                        const migrated = parsed.map(c => ({
                            ...c,
                            personaId: c.personaId || DEFAULT_PERSONA_ID
                        }));
                        setConversations(migrated);
                        console.log('[Chat] ✅ Fallback: Carregado do localStorage após erro');
                    }
                } catch (err) {
                    console.error('[Chat] Erro no fallback localStorage:', err);
                }
            }
        };

        // Carregar em background após o primeiro render
        setTimeout(() => { load(); }, 0);

        return () => { cancelled = true; };
    }, [user?.uid, storageKey, normalizeFirebaseChat]);

    // Salvar conversas no LocalStorage sempre que mudarem
    useEffect(() => {
        // Apenas localStorage aqui; Firestore é salvo por-chat nas ações (send/edit/regenerate/delete)
        try {
            const validConversations = conversations.filter(c => c.messages && c.messages.length > 0);
            localStorage.setItem(storageKey, JSON.stringify(validConversations));
        } catch (e) {
            console.warn('[Chat] Falha ao salvar localStorage:', e);
        }
    }, [conversations, storageKey]);

    // Carregar mensagens quando o ID do chat muda
    useEffect(() => {
        if (currentChatId) {
            const chat = conversations.find(c => c.id === currentChatId);
            if (chat) {
                setMessages(chat.messages || []);
            }
        } else {
            setMessages([]);
        }
    }, [currentChatId, conversations]);

    const activeChat = conversations.find(c => c.id === currentChatId);

    const createNewChat = useCallback((initialPersonaId = DEFAULT_PERSONA_ID) => {
        const newChat = {
            id: uuidv4(),
            title: 'Nova Conversa',
            date: new Date().toISOString(),
            personaId: initialPersonaId,
            messages: []
        };

        setConversations(prev => [newChat, ...prev]);
        setCurrentChatId(newChat.id);
        return newChat.id;
    }, []);

    const deleteChat = useCallback((chatId) => {
        setConversations(prev => prev.filter(c => c.id !== chatId));
        if (currentChatId === chatId) {
            setCurrentChatId(null);
        }

        // Firestore (best-effort)
        if (user?.uid) {
            deleteChatFromFirebase(user.uid, chatId).catch(() => {});
        }
    }, [currentChatId, user?.uid]);

    const sendMessage = useCallback(async (content) => {
        if (!content.trim()) return;

        let chatId = currentChatId;
        let isNewChat = false;
        let cPersonaId = DEFAULT_PERSONA_ID;
        const fallbackTitle = content.slice(0, 30) + (content.length > 30 ? '...' : '');

        // Se não tem chat aberto, cria um novo com a persona padrão (ou salva no estado global de seleção futura)
        if (!chatId) {
            chatId = createNewChat();
            isNewChat = true;
            cPersonaId = DEFAULT_PERSONA_ID;
        } else {
            // Busca persona do chat atual
            const chat = conversations.find(c => c.id === chatId);
            if (chat) cPersonaId = chat.personaId || DEFAULT_PERSONA_ID;
        }

        setIsLoading(true);

        const userMsg = {
            id: Date.now(),
            role: 'user',
            content: content.trim()
        };

        const updatedMessages = [...(isNewChat ? [] : messages), userMsg];
        setMessages(updatedMessages);

        setConversations(prev => prev.map(c => {
            if (c.id === chatId) {
                return {
                    ...c,
                    messages: updatedMessages,
                    title: c.messages.length === 0 ? content.slice(0, 30) + (content.length > 30 ? '...' : '') : c.title,
                    preview: content.slice(0, 50),
                    date: new Date().toISOString()
                };
            }
            return c;
        }));

        try {
            // Buscar memórias relevantes automaticamente
            const userId = user?.uid || 'anonymous';
            const memoryContext = await getMemoryContext(userId, content);

            // Montar system message com contexto de memória e PERSONA
            let systemMessage = createSystemMessage(cPersonaId);
            if (memoryContext) {
                systemMessage.content += `\n\n${memoryContext}`;
                console.log('[Memory] Injetando contexto de memória no prompt');
            }

            const apiMessages = [
                systemMessage,
                ...updatedMessages.map(m => ({ role: m.role, content: m.content }))
            ];

            const aiResponse = await sendMessageToGroq(apiMessages, {
                ...chatSettings,
                userId,
                personaId: cPersonaId
            }, (type, content) => {
                setProcessingStatus(type ? { type, content } : null);
            });

            const aiMsg = {
                id: Date.now() + 1,
                role: 'assistant',
                content: aiResponse.content,
                sources: aiResponse.sources || null, // Fontes das pesquisas realizadas
                searchQuery: aiResponse.searchQuery || null // Query usada na pesquisa
            };

            const finalMessages = [...updatedMessages, aiMsg];
            setMessages(finalMessages);

            // Salvar memórias importantes automaticamente (em background)
            if (userId && userId !== 'anonymous') {
                // Detectar se a conversa contém informações importantes
                const shouldSaveMemory = (userContent, aiContent) => {
                    const importantKeywords = [
                        'meu nome', 'eu sou', 'eu trabalho', 'eu gosto', 'eu prefiro',
                        'minha empresa', 'meu trabalho', 'minha profissão', 'eu faço',
                        'lembre-se', 'não esqueça', 'importante', 'sempre', 'nunca'
                    ];
                    const combined = (userContent + ' ' + aiContent).toLowerCase();
                    return importantKeywords.some(keyword => combined.includes(keyword));
                };

                if (shouldSaveMemory(content, aiResponse.content)) {
                    // Salvar em background sem bloquear
                    setTimeout(async () => {
                        try {
                            // Extrair informação mais relevante
                            const memoryContent = content.length > 200 
                                ? content.slice(0, 200) + '...' 
                                : content;
                            await saveMemory(userId, memoryContent, 'conversation');
                            console.log('[Memory] ✅ Memória importante salva automaticamente');
                        } catch (err) {
                            console.error('[Memory] Erro ao salvar memória automática:', err);
                        }
                    }, 1000);
                }
            }

            setConversations(prev => prev.map(c => {
                if (c.id === chatId) {
                    return {
                        ...c,
                        messages: finalMessages,
                        preview: aiMsg.content.slice(0, 50)
                    };
                }
                return c;
            }));

            // Persistir no Firestore (best-effort)
            if (user?.uid) {
                const existingTitle = conversations.find(c => c.id === chatId)?.title;
                const title = (existingTitle && existingTitle !== 'Nova Conversa') ? existingTitle : fallbackTitle;
                saveChatToFirebase(user.uid, chatId, title, finalMessages).catch(() => {});
            }

        } catch (error) {
            console.error('Erro ao enviar mensagem:', error);
            const errorMsg = {
                id: Date.now() + 1,
                role: 'assistant',
                content: 'Erro ao processar mensagem. Tente novamente.'
            };
            setMessages(prev => [...prev, errorMsg]);
        } finally {
            setIsLoading(false);
        }
    }, [currentChatId, createNewChat, messages, chatSettings, conversations, user?.uid]);

    // Função para editar mensagem do usuário e regenerar resposta
    const editMessage = useCallback(async (messageId, newContent) => {
        const msgIndex = messages.findIndex(m => m.id === messageId);
        if (msgIndex === -1) return;

        // Obter personaId
        const activeChat = conversations.find(c => c.id === currentChatId);
        const cPersonaId = activeChat?.personaId || DEFAULT_PERSONA_ID;

        setIsLoading(true);

        // Cortar histórico até a mensagem editada (inclusive)
        const historyUpToEdit = messages.slice(0, msgIndex + 1);

        // Atualizar conteúdo da mensagem editada
        historyUpToEdit[msgIndex] = { ...historyUpToEdit[msgIndex], content: newContent };

        // Atualizar estado local imediatamente
        setMessages(historyUpToEdit);

        try {
            // Buscar memórias relevantes automaticamente
            const userId = user?.uid || 'anonymous';
            const memoryContext = await getMemoryContext(userId, newContent);

            let systemMessage = createSystemMessage(cPersonaId);
            if (memoryContext) {
                systemMessage.content += `\n\n${memoryContext}`;
            }

            const apiMessages = [
                systemMessage,
                ...historyUpToEdit.map(m => ({ role: m.role, content: m.content }))
            ];

            const aiResponse = await sendMessageToGroq(apiMessages, {
                ...chatSettings, userId,
                personaId: cPersonaId
            });

            const aiMsg = {
                id: Date.now() + 1,
                role: 'assistant',
                content: aiResponse.content,
                sources: aiResponse.sources || null,
                searchQuery: aiResponse.searchQuery || null
            };

            const finalMessages = [...historyUpToEdit, aiMsg];
            setMessages(finalMessages);

            // Atualizar persistência
            setConversations(prev => prev.map(c => {
                if (c.id === currentChatId) {
                    return {
                        ...c,
                        messages: finalMessages,
                        preview: aiMsg.content.slice(0, 50)
                    };
                }
                return c;
            }));

            if (user?.uid) {
                const title = (conversations.find(c => c.id === currentChatId)?.title) || 'Nova Conversa';
                saveChatToFirebase(user.uid, currentChatId, title, finalMessages).catch(() => {});
            }

        } catch (error) {
            console.error('Erro ao editar mensagem:', error);
        } finally {
            setIsLoading(false);
        }
    }, [messages, currentChatId, chatSettings, conversations, user?.uid]);

    // Função para regenerar uma resposta da IA (por ID ou a última)
    const regenerateResponse = useCallback(async (messageId = null) => {
        if (messages.length === 0) return;

        // Obter personaId
        const activeChat = conversations.find(c => c.id === currentChatId);
        const cPersonaId = activeChat?.personaId || DEFAULT_PERSONA_ID;

        let baseHistory;

        if (messageId) {
            // Encontrar a posição da mensagem da IA que queremos regenerar
            const msgIndex = messages.findIndex(m => m.id === messageId);
            if (msgIndex === -1) return;

            // Truncar o histórico até ANTES dessa mensagem
            baseHistory = messages.slice(0, msgIndex);
        } else {
            // Comportamento padrão: regenerar a última
            const lastMsg = messages[messages.length - 1];
            baseHistory = lastMsg.role === 'assistant' ? messages.slice(0, -1) : messages;
        }

        if (baseHistory.length === 0) return;

        setIsLoading(true);
        setMessages(baseHistory); // Remove visualmente as mensagens truncadas

        try {
            // Buscar memórias relevantes baseado na última mensagem do usuário
            const userId = user?.uid || 'anonymous';
            const lastUserMessage = baseHistory.filter(m => m.role === 'user').pop();
            const memoryContext = lastUserMessage ? await getMemoryContext(userId, lastUserMessage.content) : '';

            let systemMessage = createSystemMessage();
            if (memoryContext) {
                systemMessage.content += `\n\n${memoryContext}`;
            }

            const apiMessages = [
                systemMessage,
                ...baseHistory.map(m => ({ role: m.role, content: m.content }))
            ];

            const aiResponse = await sendMessageToGroq(apiMessages, { ...chatSettings, userId }, (type, content) => {
                setProcessingStatus(type ? { type, content } : null);
            });

            const aiMsg = {
                id: Date.now() + 1,
                role: 'assistant',
                content: aiResponse.content,
                sources: aiResponse.sources || null,
                searchQuery: aiResponse.searchQuery || null
            };

            const finalMessages = [...baseHistory, aiMsg];
            setMessages(finalMessages);

            setConversations(prev => prev.map(c => {
                if (c.id === currentChatId) {
                    return {
                        ...c,
                        messages: finalMessages,
                        preview: aiMsg.content.slice(0, 50)
                    };
                }
                return c;
            }));

            if (user?.uid) {
                const title = (conversations.find(c => c.id === currentChatId)?.title) || 'Nova Conversa';
                saveChatToFirebase(user.uid, currentChatId, title, finalMessages).catch(() => {});
            }

        } catch (error) {
            console.error('Erro ao regenerar:', error);
        } finally {
            setIsLoading(false);
            setProcessingStatus(null);
        }
    }, [messages, currentChatId, chatSettings, conversations, user?.uid]);

    return (
        <ChatContext.Provider value={{
            conversations,
            currentChatId, // Fixed typo/duplication check? No, kept original
            setCurrentChatId,
            messages,
            isLoading,
            processingStatus,
            sendMessage,
            editMessage,
            regenerateResponse,
            createNewChat,
            deleteChat,
            activeChat,
            chatSettings,
            setChatSettings
        }}>
            {children}
        </ChatContext.Provider>
    );
};
