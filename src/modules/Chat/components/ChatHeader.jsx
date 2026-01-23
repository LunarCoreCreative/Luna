import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
    Plus,
    ChevronDown,
    Sparkles,
    Zap,
    Settings,
    User,
    LogOut
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const ChatHeader = () => {
    const { t } = useTranslation();
    const { profile, user, logout } = useAuth();
    const [isModelMenuOpen, setIsModelMenuOpen] = useState(false);
    const [selectedModel, setSelectedModel] = useState('luna_std');

    const models = [
        { id: 'luna_std', name: t('chat.header.model_luna_std'), icon: Zap, color: 'text-blue-400' },
        { id: 'luna_pro', name: t('chat.header.model_luna_pro'), icon: Sparkles, color: 'text-indigo-400' },
    ];

    const currentModel = models.find(m => m.id === selectedModel);

    return (
        <header className="h-20 px-8 flex items-center justify-between z-20 border-b border-white/[0.03] bg-slate-950/20 backdrop-blur-sm shrink-0">
            {/* Model Selector (Top Left) */}
            <div className="relative">
                <button
                    onClick={() => setIsModelMenuOpen(!isModelMenuOpen)}
                    className="flex items-center gap-2.5 px-4 py-2 rounded-2xl bg-slate-900/40 border border-slate-800 hover:border-indigo-500/30 transition-all active:scale-[0.98] group"
                >
                    <div className={`p-1 rounded-lg bg-slate-800 group-hover:bg-slate-700 transition-colors`}>
                        {currentModel && <currentModel.icon size={16} className={currentModel.color} />}
                    </div>
                    <span className="text-sm font-semibold text-slate-200">{currentModel?.name}</span>
                    <ChevronDown
                        size={16}
                        className={`text-slate-500 transition-transform duration-300 ${isModelMenuOpen ? 'rotate-180' : ''}`}
                    />
                </button>

                <AnimatePresence>
                    {isModelMenuOpen && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                className="fixed inset-0 z-30"
                                onClick={() => setIsModelMenuOpen(false)}
                            />
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute top-full left-0 mt-3 w-64 bg-slate-900 border border-slate-800 rounded-2xl p-2 shadow-2xl z-40 backdrop-blur-xl"
                            >
                                {models.map((model) => (
                                    <button
                                        key={model.id}
                                        onClick={() => {
                                            setSelectedModel(model.id);
                                            setIsModelMenuOpen(false);
                                        }}
                                        className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${selectedModel === model.id ? 'bg-indigo-500/10 text-white' : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                                            }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <model.icon size={18} className={model.color} />
                                            <span className="text-sm font-medium">{model.name}</span>
                                        </div>
                                        {selectedModel === model.id && (
                                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                        )}
                                    </button>
                                ))}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>

            {/* Right Actions (New Chat & Profile) */}
            <div className="flex items-center gap-4">
                <button
                    className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-slate-800/80 hover:bg-slate-700 text-white font-bold text-xs uppercase tracking-widest transition-all active:scale-[0.98] border border-slate-700 shadow-xl shadow-slate-900/50"
                >
                    <Plus size={16} />
                    {t('chat.header.new_chat')}
                </button>

                <div className="relative h-10 w-10">
                    <img
                        src={`https://ui-avatars.com/api/?name=${profile?.name || 'User'}&background=4f46e5&color=fff`}
                        alt="User Avatar"
                        className="w-full h-full rounded-2xl object-cover ring-2 ring-indigo-500/20"
                    />
                    <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 border-2 border-slate-950 rounded-full" />
                </div>
            </div>
        </header>
    );
};

export default ChatHeader;
