import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
    Paperclip,
    Mic,
    SendHorizontal,
    BrainCircuit,
    Image as ImageIcon,
    Search,
    Zap
} from 'lucide-react';

const ChatInput = ({ onSend }) => {
    const { t } = useTranslation();
    const [message, setMessage] = useState('');
    const textareaRef = useRef(null);

    // Auto-resize textarea
    useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = 'auto';
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`;
        }
    }, [message]);

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSend = () => {
        if (message.trim()) {
            if (onSend) {
                onSend(message.trim());
            }
            setMessage('');
        }
    };

    const quickActions = [
        { id: 'reasoning', icon: BrainCircuit, label: t('chat.input.action_reasoning'), color: 'text-purple-400', bg: 'bg-purple-400/10' },
        { id: 'image', icon: ImageIcon, label: t('chat.input.action_image'), color: 'text-pink-400', bg: 'bg-pink-400/10' },
        { id: 'research', icon: Search, label: t('chat.input.action_research'), color: 'text-blue-400', bg: 'bg-blue-400/10' },
    ];

    return (
        <div className="w-full max-w-4xl mx-auto px-6 pb-8 shrink-0">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative bg-slate-900/60 border border-slate-800/80 rounded-[32px] p-4 backdrop-blur-2xl shadow-2xl focus-within:border-indigo-500/50 focus-within:ring-4 focus-within:ring-indigo-500/10 transition-all duration-300 group"
            >
                {/* Input Field Area */}
                <div className="flex items-start gap-4 px-2">
                    <button className="mt-3 p-2 rounded-xl text-slate-500 hover:text-slate-300 hover:bg-slate-800/50 transition-all active:scale-95 shrink-0">
                        <Paperclip size={20} />
                    </button>

                    <textarea
                        ref={textareaRef}
                        rows="1"
                        value={message}
                        onChange={(e) => setMessage(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={t('chat.input.placeholder')}
                        className="w-full bg-transparent border-none focus:ring-0 text-slate-200 placeholder:text-slate-600 py-3 resize-none max-h-60 scrollbar-hide text-lg font-medium leading-relaxed"
                    />

                    <div className="flex items-center gap-2 mt-2 shrink-0">
                        <AnimatePresence mode="wait">
                            {message.trim().length > 0 ? (
                                <motion.button
                                    key="send"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    onClick={handleSend}
                                    className="p-3 bg-gradient-to-tr from-indigo-600 to-blue-600 rounded-2xl text-white shadow-lg shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all active:scale-90"
                                >
                                    <SendHorizontal size={20} />
                                </motion.button>
                            ) : (
                                <motion.button
                                    key="mic"
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.8 }}
                                    className="p-3 bg-slate-800/80 rounded-2xl text-slate-500 hover:text-slate-200 hover:bg-slate-700 transition-all active:scale-90"
                                >
                                    <Mic size={20} />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                {/* Lower Toolbar (Actions & Badge) */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3 px-2 border-t border-slate-800/40 pt-4">
                    <div className="flex flex-wrap items-center gap-2">
                        {quickActions.map((action) => (
                            <button
                                key={action.id}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-800/40 border border-slate-700/50 hover:border-slate-600 transition-all group/btn`}
                            >
                                <action.icon size={14} className={`${action.color} group-hover/btn:scale-110 transition-transform`} />
                                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 group-hover/btn:text-slate-200 transition-colors">
                                    {action.label}
                                </span>
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Token Badge style from reference */}
                        <div className="flex items-center bg-indigo-500/10 border border-indigo-500/20 rounded-xl px-3 py-1.5 gap-2 group/token cursor-default">
                            <Zap size={14} className="text-indigo-400 fill-indigo-400 group-hover/token:animate-pulse" />
                            <span className="text-[11px] font-bold text-indigo-400 tracking-tighter">{t('chat.input.tokens_count')}</span>
                        </div>
                    </div>
                </div>
            </motion.div>

            <p className="mt-4 text-center text-[10px] text-slate-600 font-medium tracking-wide">
                © 2026 Luna AI. IA pode gerar informações incorretas.
            </p>
        </div>
    );
};

export default ChatInput;
