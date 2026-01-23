import React, { useState, useCallback, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation, Trans } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import {
    Bot, Paperclip, Mic, SendHorizontal, BrainCircuit,
    Image as ImageIcon, Search, PenLine, Lightbulb,
    Code2, Plane, Zap, Sparkles
} from 'lucide-react';

import { useChat } from '@/contexts/ChatContext';
import MessageItem from './components/MessageItem';

const ChatModule = () => {
    const { t } = useTranslation();
    const { profile, user } = useAuth();

    // Usar contexto global
    const { messages, isLoading, sendMessage, processingStatus } = useChat();
    const [inputValue, setInputValue] = useState('');

    const messagesEndRef = useRef(null);
    const textareaRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages, isLoading]);

    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
        }
    }, [inputValue]);

    const handleSend = useCallback(async () => {
        if (!inputValue.trim() || isLoading) return;

        const content = inputValue;
        setInputValue(''); // Limpa input imediatamente

        await sendMessage(content);
    }, [inputValue, isLoading, sendMessage]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('chat.welcome.morning');
        if (hour < 18) return t('chat.welcome.afternoon');
        return t('chat.welcome.evening');
    };

    const userName = profile?.name || user?.displayName || 'Explorador';
    const hasMessages = messages.length > 0;

    const suggestions = [
        { id: 'write', icon: PenLine, label: t('chat.welcome.suggestions.write'), color: 'text-orange-400', bg: 'bg-orange-400/10' },
        { id: 'explain', icon: Lightbulb, label: t('chat.welcome.suggestions.explain'), color: 'text-amber-400', bg: 'bg-amber-400/10' },
        { id: 'code', icon: Code2, label: t('chat.welcome.suggestions.code'), color: 'text-cyan-400', bg: 'bg-cyan-400/10' },
        { id: 'plan', icon: Plane, label: t('chat.welcome.suggestions.plan'), color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    ];

    const quickActions = [
        { id: 'reasoning', icon: BrainCircuit, label: t('chat.input.action_reasoning'), color: 'text-fuchsia-400' },
        { id: 'image', icon: ImageIcon, label: t('chat.input.action_image'), color: 'text-pink-400' },
        { id: 'research', icon: Search, label: t('chat.input.action_research'), color: 'text-cyan-400' },
    ];

    return (
        <div className="h-full flex flex-col overflow-hidden">
            {/* Messages Area - Isolada para Scroll */}
            <div className="flex-1 min-h-0 relative">
                <div className="absolute inset-0 overflow-y-auto px-4 py-6 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
                    <div className="max-w-3xl mx-auto">
                        {!hasMessages ? (
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="flex flex-col items-center justify-center min-h-[60vh] text-center"
                            >
                                {/* Orb */}
                                <div className="relative mb-10">
                                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-violet-600/30 via-fuchsia-600/30 to-violet-500/30 blur-2xl absolute inset-0 animate-pulse" />
                                    <div className="w-24 h-24 rounded-full bg-obsidian-light/50 backdrop-blur-xl border border-white/10 shadow-[0_0_50px_rgba(139,92,246,0.15)] relative flex items-center justify-center">
                                        <motion.div
                                            animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                                            transition={{ rotate: { repeat: Infinity, duration: 20 }, scale: { repeat: Infinity, duration: 6 } }}
                                            className="w-14 h-14 rounded-full bg-gradient-to-br from-white/15 to-transparent blur-sm"
                                        />
                                    </div>
                                </div>

                                <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
                                    {getGreeting()}{t('chat.welcome.greeting_suffix', { name: userName })}
                                </h2>
                                <p className="text-lg text-slate-400 mb-10">
                                    <Trans i18nKey="chat.welcome.assist_question">
                                        Como a <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">Luna</span> pode ajudar você hoje?
                                    </Trans>
                                </p>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl">
                                    {suggestions.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => setInputValue(item.label)}
                                            className="flex items-center gap-3 p-4 rounded-2xl bg-obsidian-light/60 border border-white/5 hover:border-violet-500/30 hover:bg-obsidian-light/80 transition-all text-left group"
                                        >
                                            <div className={`p-2.5 rounded-xl ${item.bg} ${item.color} group-hover:scale-110 transition-transform`}>
                                                <item.icon size={18} />
                                            </div>
                                            <span className="text-sm text-slate-300 group-hover:text-white transition-colors">{item.label}</span>
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        ) : (
                            <div className="space-y-6">
                                {messages.map((msg) => (
                                    <MessageItem
                                        key={msg.id}
                                        message={msg}
                                        profile={profile}
                                    />
                                ))}
                                {isLoading && (
                                    <motion.div
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className="flex gap-3 justify-start"
                                    >
                                        <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
                                            <Bot size={18} className="text-white animate-pulse" />
                                        </div>

                                        {processingStatus?.type === 'searching' ? (
                                            <div className="bg-obsidian-light text-slate-300 px-4 py-3 rounded-2xl rounded-bl-md border border-violet-500/30 flex items-center gap-3 shadow-[0_0_15px_rgba(139,92,246,0.1)]">
                                                <Search size={16} className="text-violet-400 animate-pulse" />
                                                <span className="text-sm font-medium animate-pulse">
                                                    Pesquisando na web: <span className="text-violet-300">"{processingStatus.content}"</span>...
                                                </span>
                                            </div>
                                        ) : processingStatus?.type === 'reading' ? (
                                            <div className="bg-obsidian-light text-slate-300 px-4 py-3 rounded-2xl rounded-bl-md border border-fuchsia-500/30 flex items-center gap-3 shadow-[0_0_15px_rgba(217,70,239,0.1)]">
                                                <Zap size={16} className="text-fuchsia-400 animate-pulse" />
                                                <span className="text-sm font-medium animate-pulse">
                                                    Lendo página: <span className="text-fuchsia-300 truncate max-w-[200px] inline-block align-bottom">{processingStatus.content}</span>...
                                                </span>
                                            </div>
                                        ) : processingStatus?.type === 'remembering' ? (
                                            <div className="bg-obsidian-light text-slate-300 px-4 py-3 rounded-2xl rounded-bl-md border border-cyan-500/30 flex items-center gap-3 shadow-[0_0_15px_rgba(6,182,212,0.1)]">
                                                <Sparkles size={16} className="text-cyan-400 animate-pulse" />
                                                <span className="text-sm font-medium animate-pulse">
                                                    Lembrando: <span className="text-cyan-300">"{processingStatus.content}"</span>...
                                                </span>
                                            </div>
                                        ) : processingStatus?.type === 'learning' ? (
                                            <div className="bg-obsidian-light text-slate-300 px-4 py-3 rounded-2xl rounded-bl-md border border-emerald-500/30 flex items-center gap-3 shadow-[0_0_15px_rgba(16,185,129,0.1)]">
                                                <Sparkles size={16} className="text-emerald-400 animate-pulse" />
                                                <span className="text-sm font-medium animate-pulse">
                                                    Aprendendo: <span className="text-emerald-300">"{processingStatus.content}"</span>...
                                                </span>
                                            </div>
                                        ) : (
                                            <div className="bg-obsidian-light text-slate-400 px-4 py-3 rounded-2xl rounded-bl-md border border-white/10 flex items-center gap-1">
                                                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                                <span className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></span>
                                            </div>
                                        )}
                                    </motion.div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Input Area */}
            <div className="shrink-0 px-6 pb-6 pt-4 bg-gradient-to-t from-obsidian via-obsidian/98 to-transparent relative z-20">
                <div className="max-w-4xl mx-auto">
                    <div className="group relative bg-obsidian-light/40 border border-white/5 rounded-[28px] p-2 backdrop-blur-3xl focus-within:border-violet-500/40 focus-within:bg-obsidian-light/60 transition-all duration-300 shadow-[0_8px_32px_rgba(0,0,0,0.4)] focus-within:shadow-[0_8px_40px_rgba(139,92,246,0.15)] ring-1 ring-white/[0.03] focus-within:ring-violet-500/10">
                        <div className="flex items-end gap-2 px-2 pt-2">
                            <button className="p-3 rounded-2xl text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-all duration-200 shrink-0 mb-1 group/clip active:scale-90">
                                <Paperclip size={20} className="group-hover/clip:rotate-12 transition-transform" />
                            </button>

                            <textarea
                                ref={textareaRef}
                                rows="1"
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={t('chat.input.placeholder')}
                                className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none text-slate-200 placeholder:text-slate-600 py-3 px-1 resize-none max-h-52 scrollbar-hide text-[15px] leading-relaxed"
                                style={{ outline: 'none', boxShadow: 'none' }}
                            />

                            <div className="flex items-center mb-1 pr-1">
                                <AnimatePresence mode="wait">
                                    {inputValue.trim() ? (
                                        <motion.button
                                            key="send"
                                            initial={{ scale: 0.8, opacity: 0, rotate: -15 }}
                                            animate={{ scale: 1, opacity: 1, rotate: 0 }}
                                            exit={{ scale: 0.8, opacity: 0, rotate: 15 }}
                                            onClick={handleSend}
                                            className="p-3 bg-gradient-to-tr from-violet-600 to-fuchsia-600 rounded-2xl text-white shadow-xl shadow-violet-500/30 hover:shadow-violet-500/60 hover:scale-110 active:scale-90 transition-all shrink-0"
                                        >
                                            <SendHorizontal size={20} />
                                        </motion.button>
                                    ) : (
                                        <motion.button
                                            key="mic"
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            exit={{ scale: 0.8, opacity: 0 }}
                                            className="p-3 bg-obsidian-light hover:bg-white/10 text-slate-400 hover:text-white rounded-2xl transition-all duration-200 shrink-0 group/mic active:scale-90"
                                        >
                                            <Mic size={20} className="group-hover/mic:scale-110 transition-transform" />
                                        </motion.button>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 mt-3 p-2 pt-3 border-t border-white/[0.03]">
                            <div className="flex flex-wrap items-center gap-2">
                                {quickActions.map((action) => (
                                    <button
                                        key={action.id}
                                        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-[11px] font-bold uppercase tracking-wider text-slate-400 hover:text-white hover:bg-violet-500/10 hover:border-violet-500/30 transition-all duration-200 group/btn active:scale-95"
                                    >
                                        <action.icon size={13} className={`${action.color} group-hover/btn:scale-110 transition-transform`} />
                                        {action.label}
                                    </button>
                                ))}
                            </div>

                            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-xl bg-violet-500/10 border border-violet-500/20 group/zap cursor-pointer hover:bg-violet-500/20 transition-all active:scale-95">
                                <Zap size={14} className="text-violet-400 fill-violet-400 animate-pulse" />
                                <span className="text-[11px] font-black text-violet-400 tracking-tighter">1.250</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center justify-center gap-4 mt-5 opacity-40 hover:opacity-100 transition-opacity duration-700 px-10">
                        <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-800 to-transparent" />
                        <p className="text-[10px] text-slate-600 font-bold tracking-[0.2em] uppercase select-none whitespace-nowrap">
                            Luna Intelligent Engine <span className="mx-2 text-violet-500/50">•</span> v4.2.0
                        </p>
                        <div className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-800 to-transparent" />
                    </div>
                </div>
            </div>
        </div >
    );
};

export default ChatModule;
