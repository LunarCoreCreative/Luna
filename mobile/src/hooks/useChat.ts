import { useState, useRef, useCallback } from 'react';
import { Message } from '../types';

const WS_URL = "wss://luna-production-94f2.up.railway.app/ws/agent";

export const useChat = (userName: string) => {
    const [messages, setMessages] = useState<Message[]>([]);
    const [isStreaming, setIsStreaming] = useState(false);
    const [isThinking, setIsThinking] = useState(false);
    const wsRef = useRef<WebSocket | null>(null);

    const sendMessage = useCallback((text: string) => {
        if (!text.trim() || isStreaming) return;

        const timestamp = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        const userMsg: Message = {
            id: Math.random().toString(36).substr(2, 9),
            role: 'user',
            content: text,
            timestamp,
        };

        const assistantMsg: Message = {
            id: Math.random().toString(36).substr(2, 9),
            role: 'assistant',
            content: '',
            timestamp,
            thought: '',
        };

        setMessages(prev => [...prev, userMsg, assistantMsg]);
        setIsStreaming(true);

        const ws = new WebSocket(WS_URL);
        wsRef.current = ws;

        ws.onopen = () => {
            ws.send(JSON.stringify({
                type: 'start',
                request: {
                    messages: [...messages, userMsg],
                    agent_mode: true,
                    deep_thinking: isThinking,
                    user_name: userName,
                }
            }));
        };

        ws.onmessage = (e) => {
            const data = JSON.parse(e.data);
            setMessages(prev => {
                const updated = [...prev];
                const lastIndex = updated.length - 1;
                if (updated[lastIndex].role === 'assistant') {
                    if (data.type === 'content') {
                        updated[lastIndex].content += data.content;
                    } else if (data.type === 'thought') {
                        updated[lastIndex].thought += data.thought;
                    }
                }
                return updated;
            });

            if (data.type === 'done') {
                setIsStreaming(false);
                ws.close();
            }
        };

        ws.onerror = () => {
            setIsStreaming(false);
        };

        ws.onclose = () => {
            setIsStreaming(false);
        };
    }, [messages, isStreaming, isThinking, userName]);

    const stopGeneration = () => {
        wsRef.current?.close();
        setIsStreaming(false);
    };

    return {
        messages,
        isStreaming,
        isThinking,
        setIsThinking,
        sendMessage,
        stopGeneration,
        setMessages,
    };
};
