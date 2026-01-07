import { useState, useCallback, useRef } from "react";
import { API_CONFIG } from "../config/api";
import { useAuth } from "../contexts/AuthContext"; // Import Auth Context

const MEMORY_SERVER = API_CONFIG.BASE_URL;

/**
 * useChat - Hook para gerenciamento de chats e mensagens
 */
export const useChat = () => {
    const { user } = useAuth(); // Get current user
    const [chats, setChats] = useState([]);
    const [currentChatId, setCurrentChatId] = useState(null);
    const [messages, setMessages] = useState([]);
    const [view, setView] = useState("HOME");
    const [toolHistory, setToolHistory] = useState([]);
    const [showToolHistory, setShowToolHistory] = useState(false);

    const isStreamingRef = useRef(false);
    const currentChatIdRef = useRef(null);

    // Sync ref with state
    currentChatIdRef.current = currentChatId;

    const loadChats = useCallback(async () => {
        try {
            // Pass user_id if logged in
            const query = user?.uid ? `?user_id=${user.uid}` : "";
            const r = await fetch(`${MEMORY_SERVER}/chats${query}`);
            const d = await r.json();
            if (d.success) setChats(d.chats);
        } catch (e) {
            console.error("Failed to load chats", e);
        }
    }, [user]); // Add user dependency

    const loadChat = useCallback(async (id) => {
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
                setView("CHAT");
            }
        } catch (e) {
            console.error("Failed to load chat", e);
        }
    }, []);

    const startNewChat = useCallback(() => {
        if (isStreamingRef.current) return;
        setMessages([]);
        setCurrentChatId(null);
        setView("HOME");
        setToolHistory([]);
        setShowToolHistory(false);
    }, []);

    const deleteChat = useCallback(async (e, id) => {
        e.stopPropagation();
        if (!confirm("Tem certeza que deseja excluir esta conversa?")) return;
        try {
            const r = await fetch(`${MEMORY_SERVER}/chats/${id}`, { method: "DELETE" });
            const d = await r.json();
            if (d.success) {
                if (currentChatIdRef.current === id) startNewChat();
                loadChats();
            }
        } catch (e) {
            console.error("Failed to delete chat", e);
        }
    }, [startNewChat, loadChats]);

    const renameChat = useCallback(async (e, id, currentTitle) => {
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
                    title: newTitle,
                    user_id: user?.uid // Ensure ownership is preserved/set
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
    }, [loadChats, user]);

    const persistChat = useCallback(async (msgs, chatId = null, customTitle = null) => {
        try {
            const body = {
                chat_id: chatId,
                messages: msgs,
                title: customTitle || (msgs.length > 0 ? (msgs[0].content || "Novo Chat").slice(0, 40) : "Conversa"),
                user_id: user?.uid // Attach user_id to save request
            };
            const r = await fetch(`${MEMORY_SERVER}/chats`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body)
            });
            const d = await r.json();
            if (d.success && d.chat) {
                if (!chatId) {
                    setCurrentChatId(d.chat.id);
                }
                loadChats();
                return d.chat.id;
            }
        } catch (e) {
            console.error("Failed to persist chat", e);
        }
        return chatId;
    }, [loadChats, user]);

    return {
        // State
        chats,
        currentChatId,
        messages,
        view,
        toolHistory,
        showToolHistory,
        isStreamingRef,

        // Setters
        setMessages,
        setCurrentChatId,
        setView,
        setToolHistory,
        setShowToolHistory,

        // Actions
        loadChats,
        loadChat,
        startNewChat,
        deleteChat,
        renameChat,
        persistChat
    };
};
