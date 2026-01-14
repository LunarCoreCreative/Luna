/**
 * useChat Hook
 * ============
 * Hook para gerenciar comunicação com o agente via HTTP (sem streaming)
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { API_CONFIG } from '../config/api';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../services/api';
import { cleanContent } from '../utils/messageUtils';

export const useChat = (chatId) => {
  const { user, profile } = useAuth();
  const [messages, setMessages] = useState([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState(null);
  const isMountedRef = useRef(true);
  const saveChatMessagesRef = useRef(null);

  // Carrega histórico de mensagens quando chatId é fornecido
  const loadChatHistory = useCallback(async () => {
    if (!chatId || !user?.uid) {
      return;
    }

    setIsLoadingHistory(true);
    setError(null);

    try {
      const response = await api.get(`/chats/${chatId}?user_id=${user.uid}`);
      
      if (response.success && response.chat) {
        const chatMessages = response.chat.messages || [];
        
        // Converte mensagens do formato do backend para o formato do app
        const formattedMessages = chatMessages.map((msg, index) => ({
          id: msg.id || `${msg.role}-${index}-${msg.timestamp || Date.now()}`,
          role: msg.role || 'user',
          content: msg.content || '',
          timestamp: msg.timestamp || new Date().toISOString(),
        }));

        setMessages(formattedMessages);
      }
    } catch (error) {
      console.warn('[CHAT] Erro ao carregar histórico:', error);
      // Não define erro aqui, apenas loga - permite usar o chat mesmo sem histórico
    } finally {
      setIsLoadingHistory(false);
    }
  }, [chatId, user?.uid]);

  // Carrega histórico quando chatId muda
  useEffect(() => {
    if (chatId) {
      loadChatHistory();
    } else {
      // Se não tem chatId, limpa mensagens (novo chat)
      setMessages([]);
    }
  }, [chatId, loadChatHistory]);

  // Limpa recursos quando o componente desmonta
  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  // Salva mensagens no backend
  const saveChatMessages = useCallback(async (messagesToSave) => {
    if (!user?.uid || !messagesToSave || messagesToSave.length === 0) {
      return null;
    }

    try {
      const messagesData = messagesToSave.map(msg => ({
        role: msg.role,
        content: msg.content,
        timestamp: msg.timestamp || new Date().toISOString(),
      }));

      // Tenta criar ou atualizar chat
      if (chatId) {
        try {
          // Tenta atualizar chat existente
          await api.put(`/chats/${chatId}`, {
            messages: messagesData,
            user_id: user.uid,
          });
          console.log('[CHAT] Mensagens salvas no chat:', chatId);
          return chatId;
        } catch (putError) {
          // Se PUT falhar (405 ou outro erro), tenta POST
          console.warn('[CHAT] PUT falhou, tentando POST:', putError);
          try {
            const response = await api.post('/chats', {
              messages: messagesData,
              user_id: user.uid,
              chat_id: chatId, // Inclui chatId no POST
            });
            if (response.success && response.chat?.id) {
              console.log('[CHAT] Chat atualizado via POST:', response.chat.id);
              return response.chat.id;
            }
          } catch (postError) {
            console.error('[CHAT] Erro ao salvar via POST também:', postError);
            throw postError;
          }
        }
      } else {
        // Cria novo chat
        const response = await api.post('/chats', {
          messages: messagesData,
          user_id: user.uid,
        });
        
        if (response.success && response.chat?.id) {
          console.log('[CHAT] Novo chat criado:', response.chat.id);
          return response.chat.id;
        }
        return null;
      }
    } catch (error) {
      console.error('[CHAT] Erro ao salvar mensagens:', error);
      return null;
    }
  }, [chatId, user?.uid]);

  // Atualiza ref para a função de salvar
  useEffect(() => {
    saveChatMessagesRef.current = saveChatMessages;
  }, [saveChatMessages]);

  // Envia mensagem via HTTP (sem streaming)
  const sendMessage = useCallback(async (content, options = {}) => {
    if (isSending) {
      return false; // Evita múltiplos envios simultâneos
    }

    setIsSending(true);
    setError(null);

    try {
      // Adiciona mensagem do usuário à lista
      const userMessage = {
        id: Date.now().toString(),
        role: 'user',
        content,
        timestamp: new Date().toISOString(),
      };

      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);

      // Salva mensagem do usuário imediatamente
      if (saveChatMessagesRef.current) {
        saveChatMessagesRef.current(updatedMessages).catch(err => {
          console.warn('[CHAT] Erro ao salvar mensagem do usuário:', err);
        });
      }

      // Prepara histórico de mensagens para o backend
      const messageHistory = updatedMessages.map((msg) => ({
        role: msg.role,
        content: msg.content || '', // Garante que content nunca seja undefined
      }));

      // DEBUG: Log do que está sendo enviado
      if (__DEV__) {
        console.log('[CHAT-MOBILE] Enviando requisição:', {
          messageCount: messageHistory.length,
          lastMessage: messageHistory[messageHistory.length - 1],
          params: {
            agent_mode: true,
            canvas_mode: false,
            deep_thinking: options.deepThinking || false,
            business_mode: options.businessMode || false,
            health_mode: options.healthMode || false,
          }
        });
      }

      // Envia requisição HTTP POST para o endpoint /agent/message
      // IMPORTANTE: Envia exatamente os mesmos parâmetros que o desktop para garantir comportamento idêntico
      const response = await api.post('/agent/message', {
        messages: messageHistory,
        agent_mode: true,
        canvas_mode: false, // Explícito: mobile não usa Canvas
        deep_thinking: options.deepThinking || false,
        business_mode: options.businessMode || false,
        health_mode: options.healthMode || false,
        active_artifact_id: options.activeArtifactId || null,
        user_id: user?.uid || null,
        user_name: profile?.name || user?.displayName || 'Usuário',
        chat_id: chatId || null,
      });

      // DEBUG: Log da resposta recebida
      if (__DEV__) {
        console.log('[CHAT-MOBILE] Resposta recebida:', {
          success: response?.success,
          messageLength: response?.message?.length,
          messagePreview: response?.message?.substring(0, 200),
          hasError: !!response?.error,
        });
      }

      // Verifica se a resposta contém uma mensagem do assistente
      if (response && response.success && response.message) {
        // DEBUG: Log antes e depois do cleanContent
        if (__DEV__) {
          console.log('[CHAT-MOBILE] Antes do cleanContent:', response.message.substring(0, 200));
        }
        
        // Aplica limpeza de conteúdo (igual ao desktop)
        const cleanedMessage = cleanContent(response.message);
        
        // DEBUG: Log depois do cleanContent
        if (__DEV__) {
          console.log('[CHAT-MOBILE] Depois do cleanContent:', cleanedMessage.substring(0, 200));
        }
        
        const assistantMessage = {
          id: Date.now().toString(),
          role: 'assistant',
          content: cleanedMessage,
          timestamp: new Date().toISOString(),
        };

        const finalMessages = [...updatedMessages, assistantMessage];
        setMessages(finalMessages);

        // Salva mensagens completas no backend
        if (saveChatMessagesRef.current) {
          saveChatMessagesRef.current(finalMessages).catch(err => {
            console.warn('[CHAT] Erro ao salvar mensagens completas:', err);
          });
        }

        return true;
      } else {
        throw new Error('Resposta inválida do servidor');
      }
    } catch (error) {
      console.error('[CHAT] Erro ao enviar mensagem:', error);
      setError(error.message || 'Erro ao enviar mensagem');
      return false;
    } finally {
      setIsSending(false);
    }
  }, [messages, user, profile, chatId, isSending]);

  // Limpa mensagens
  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isLoadingHistory,
    isSending, // Renomeado de isStreaming para isSending
    error,
    sendMessage,
    clearMessages,
    loadChatHistory,
  };
};

export default useChat;
