import React, { useState, useRef, useEffect } from 'react';
import { Send, Loader2, Bot, User, RefreshCw, Sparkles, Plus, MessageSquare, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../contexts/AuthContext';
import SourcesCard from '../../Chat/components/SourcesCard';

const STORAGE_KEY = 'luna_business_chats';

/**
 * Business Assistant - Chat dedicado para o módulo de Gestão
 * Usa Luna Gestora com ferramentas financeiras integradas
 * Agora com histórico de conversas na lateral
 */
const Assistant = () => {
    const { t } = useTranslation();
    const { user } = useAuth();

    // Estados para gerenciar múltiplos chats
    const [chats, setChats] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            const parsed = saved ? JSON.parse(saved) : [];
            return parsed.length > 0 ? parsed : [{
                id: Date.now().toString(),
                title: t('business.assistant.new_chat'),
                messages: [],
                createdAt: new Date().toISOString()
            }];
        } catch {
            return [{
                id: Date.now().toString(),
                title: t('business.assistant.new_chat'),
                messages: [],
                createdAt: new Date().toISOString()
            }];
        }
    });
    const [currentChatId, setCurrentChatId] = useState(() => chats[0]?.id);
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState(null);
    const [sidebarOpen, setSidebarOpen] = useState(true);

    const [input, setInput] = useState('');
    const messagesEndRef = useRef(null);

    // Get current chat
    const currentChat = chats.find(c => c.id === currentChatId) || chats[0];
    const messages = currentChat?.messages || [];

    // Persist chats to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
        } catch (e) {
            console.warn('[Business Chat] Failed to save chats:', e);
        }
    }, [chats]);

    // Auto-scroll para última mensagem
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Update messages in current chat
    const updateCurrentChatMessages = (newMessages) => {
        setChats(prev => prev.map(chat =>
            chat.id === currentChatId
                ? { ...chat, messages: newMessages }
                : chat
        ));
    };

    // Generate title from first message
    const generateTitle = (content) => {
        const cleaned = content.replace(/[#*_~`]/g, '').trim();
        return cleaned.length > 30 ? cleaned.slice(0, 30) + '...' : cleaned;
    };

    // Create new chat
    const createNewChat = () => {
        const newChat = {
            id: Date.now().toString(),
            title: t('business.assistant.new_chat'),
            messages: [],
            createdAt: new Date().toISOString()
        };
        setChats(prev => [newChat, ...prev]);
        setCurrentChatId(newChat.id);
    };

    // Delete chat
    const deleteChat = (chatId) => {
        if (chats.length === 1) {
            // Don't delete last chat, just clear it
            setChats([{
                id: Date.now().toString(),
                title: t('business.assistant.new_chat'),
                messages: [],
                createdAt: new Date().toISOString()
            }]);
            setCurrentChatId(Date.now().toString());
        } else {
            setChats(prev => prev.filter(c => c.id !== chatId));
            if (currentChatId === chatId) {
                setCurrentChatId(chats.find(c => c.id !== chatId)?.id);
            }
        }
    };

    // Send message (inline implementation to access chat state)
    const sendMessage = async (content) => {
        if (!content.trim() || isLoading) return;

        const userMessage = { role: 'user', content };
        const newMessages = [...messages, userMessage];
        updateCurrentChatMessages(newMessages);

        // Update title if it's the first message
        if (messages.length === 0) {
            setChats(prev => prev.map(chat =>
                chat.id === currentChatId
                    ? { ...chat, title: generateTitle(content) }
                    : chat
            ));
        }

        setIsLoading(true);
        setStatus(t('business.assistant.thinking'));

        try {
            const { sendBusinessMessage } = await import('../../../hooks/useBusinessChat');
            const result = await sendBusinessMessage(newMessages, user?.uid, setStatus);

            updateCurrentChatMessages([...newMessages, result]);
        } catch (error) {
            console.error('[Business Chat] Error:', error);
            updateCurrentChatMessages([...newMessages, {
                role: 'assistant',
                content: t('business.assistant.error_message', { error: error.message })
            }]);
        } finally {
            setIsLoading(false);
            setStatus(null);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        const userMessage = input.trim();
        setInput('');
        await sendMessage(userMessage);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit(e);
        }
    };

    const quickActions = [
        { label: t('business.assistant.quick_actions.balance'), message: t('business.assistant.quick_actions.balance_message') },
        { label: t('business.assistant.quick_actions.summary'), message: t('business.assistant.quick_actions.summary_message') },
        { label: t('business.assistant.quick_actions.bills'), message: t('business.assistant.quick_actions.bills_message') },
        { label: t('business.assistant.quick_actions.last_transaction'), message: t('business.assistant.quick_actions.last_transaction_message') },
    ];

    return (
        <div className="flex h-full bg-obsidian rounded-xl border border-white/5 overflow-hidden">
            {/* Sidebar */}
            <AnimatePresence mode="wait">
                {sidebarOpen && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 240, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="flex flex-col border-r border-white/5 bg-slate-900/50"
                    >
                        {/* Sidebar Header */}
                        <div className="p-3 border-b border-white/5">
                            <button
                                onClick={createNewChat}
                                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl text-sm font-medium transition-colors"
                            >
                                <Plus size={16} />
                                {t('business.assistant.new_conversation')}
                            </button>
                        </div>

                        {/* Chat List */}
                        <div className="flex-1 overflow-y-auto p-2 space-y-1">
                            {chats.map(chat => (
                                <div
                                    key={chat.id}
                                    onClick={() => setCurrentChatId(chat.id)}
                                    className={`group flex items-center gap-2 p-2.5 rounded-lg cursor-pointer transition-all ${chat.id === currentChatId
                                        ? 'bg-violet-500/20 text-white'
                                        : 'text-slate-400 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <MessageSquare size={14} className="shrink-0" />
                                    <span className="flex-1 text-sm truncate">{chat.title}</span>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            deleteChat(chat.id);
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-500/20 rounded transition-all"
                                    >
                                        <Trash2 size={12} className="text-red-400" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Toggle Sidebar Button */}
            <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-10 p-1.5 bg-slate-800 hover:bg-slate-700 border border-white/10 rounded-lg text-slate-400 hover:text-white transition-all"
                style={{ marginLeft: sidebarOpen ? 240 : 0 }}
            >
                {sidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
            </button>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
                            <Sparkles size={20} className="text-white" />
                        </div>
                        <div>
                            <h3 className="font-semibold text-white">{t('business.assistant.title')}</h3>
                            <p className="text-xs text-slate-400">{t('business.assistant.subtitle')}</p>
                        </div>
                    </div>
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-violet-500/20 to-fuchsia-600/20 flex items-center justify-center mb-4">
                                <Bot size={32} className="text-violet-400" />
                            </div>
                            <h4 className="text-lg font-medium text-white mb-2">{t('business.assistant.greeting')}</h4>
                            <p className="text-sm text-slate-400 max-w-md mb-6">
                                {t('business.assistant.greeting_description')}
                            </p>

                            <div className="flex flex-wrap justify-center gap-2">
                                {quickActions.map((action, i) => (
                                    <button
                                        key={i}
                                        onClick={() => sendMessage(action.message)}
                                        className="px-3 py-2 text-sm bg-white/5 hover:bg-white/10 text-slate-300 rounded-lg border border-white/10 transition-colors"
                                    >
                                        {action.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <>
                            <AnimatePresence>
                                {messages.map((msg, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0 }}
                                        className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : ''}`}
                                    >
                                        {msg.role === 'assistant' && (
                                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center flex-shrink-0">
                                                <Bot size={16} className="text-white" />
                                            </div>
                                        )}
                                        <div className="flex flex-col gap-2 max-w-[80%]">
                                            {msg.role === 'assistant' && msg.sources && msg.sources.length > 0 && (
                                                <SourcesCard sources={msg.sources} query={msg.searchQuery} />
                                            )}
                                            <div
                                                className={`p-3 rounded-2xl ${msg.role === 'user'
                                                    ? 'bg-violet-500/20 text-white rounded-br-md'
                                                    : 'bg-white/5 text-slate-200 rounded-bl-md'
                                                    }`}
                                            >
                                                {msg.role === 'user' ? (
                                                    <p className="whitespace-pre-wrap text-sm">{msg.content}</p>
                                                ) : (
                                                    <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-p:mb-2 prose-strong:text-violet-300">
                                                        <ReactMarkdown
                                                            remarkPlugins={[remarkGfm]}
                                                            components={{
                                                                table: ({ node, ...props }) => (
                                                                    <div className="overflow-x-auto my-4 rounded-lg border border-white/10">
                                                                        <table className="w-full text-left border-collapse text-sm" {...props} />
                                                                    </div>
                                                                ),
                                                                th: ({ node, ...props }) => (
                                                                    <th className="p-3 font-semibold text-violet-300 border-b border-white/10 bg-white/5" {...props} />
                                                                ),
                                                                td: ({ node, ...props }) => (
                                                                    <td className="p-3 border-b border-white/5 text-slate-300" {...props} />
                                                                ),
                                                                a: ({ node, ...props }) => (
                                                                    <a className="text-violet-400 hover:text-violet-300 underline" target="_blank" {...props} />
                                                                ),
                                                            }}
                                                        >
                                                            {msg.content}
                                                        </ReactMarkdown>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        {msg.role === 'user' && (
                                            <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center flex-shrink-0">
                                                <User size={16} className="text-violet-400" />
                                            </div>
                                        )}
                                    </motion.div>
                                ))}
                            </AnimatePresence>

                            {isLoading && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex gap-3"
                                >
                                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
                                        <Bot size={16} className="text-white" />
                                    </div>
                                    <div className="bg-white/5 p-3 rounded-2xl rounded-bl-md">
                                        <div className="flex items-center gap-2 text-sm text-slate-400">
                                            <Loader2 size={14} className="animate-spin" />
                                            <span>{status || t('business.assistant.thinking')}</span>
                                        </div>
                                    </div>
                                </motion.div>
                            )}

                            <div ref={messagesEndRef} />
                        </>
                    )}
                </div>

                {/* Input Area */}
                <form onSubmit={handleSubmit} className="p-4 border-t border-white/5">
                    <div className="flex gap-2 items-end">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={t('business.assistant.input_placeholder')}
                            disabled={isLoading}
                            rows={1}
                            className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-violet-500/50 disabled:opacity-50 transition-colors resize-none min-h-[48px] max-h-[200px] scrollbar-thin"
                            style={{ height: 'auto', overflow: 'hidden' }}
                            onInput={(e) => {
                                e.target.style.height = 'auto';
                                e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px';
                            }}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="px-4 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity h-[48px]"
                        >
                            {isLoading ? (
                                <Loader2 size={20} className="animate-spin" />
                            ) : (
                                <Send size={20} />
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default Assistant;
