import React from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Bot, User, Copy, ThumbsUp, ThumbsDown, RotateCcw } from 'lucide-react';

const MessageBubble = ({ message, isUser }) => {
    const { profile } = useAuth();

    const copyToClipboard = () => {
        navigator.clipboard.writeText(message.content);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`flex gap-4 w-full ${isUser ? 'justify-end' : 'justify-start'}`}
        >
            {/* AI Avatar */}
            {!isUser && (
                <div className="shrink-0 w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Bot size={20} className="text-white" />
                </div>
            )}

            <div className={`flex flex-col max-w-[75%] ${isUser ? 'items-end' : 'items-start'}`}>
                {/* Message Content */}
                <div
                    className={`px-5 py-3 rounded-3xl text-[15px] leading-relaxed ${isUser
                            ? 'bg-indigo-600 text-white rounded-br-lg'
                            : 'bg-slate-800/60 text-slate-200 rounded-bl-lg border border-slate-700/50'
                        }`}
                >
                    {message.content}
                </div>

                {/* Actions (only for AI messages) */}
                {!isUser && (
                    <div className="flex items-center gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                            onClick={copyToClipboard}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-all"
                            title="Copiar"
                        >
                            <Copy size={14} />
                        </button>
                        <button className="p-1.5 rounded-lg text-slate-500 hover:text-green-400 hover:bg-slate-800 transition-all" title="Útil">
                            <ThumbsUp size={14} />
                        </button>
                        <button className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-slate-800 transition-all" title="Não útil">
                            <ThumbsDown size={14} />
                        </button>
                        <button className="p-1.5 rounded-lg text-slate-500 hover:text-indigo-400 hover:bg-slate-800 transition-all" title="Regenerar">
                            <RotateCcw size={14} />
                        </button>
                    </div>
                )}
            </div>

            {/* User Avatar */}
            {isUser && (
                <div className="shrink-0 w-10 h-10 rounded-2xl overflow-hidden ring-2 ring-indigo-500/20">
                    <img
                        src={`https://ui-avatars.com/api/?name=${profile?.name || 'User'}&background=4f46e5&color=fff`}
                        alt="User"
                        className="w-full h-full object-cover"
                    />
                </div>
            )}
        </motion.div>
    );
};

export default MessageBubble;
