import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation, Trans } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { PenLine, Lightbulb, Code2, Plane } from 'lucide-react';

const WelcomeScreen = () => {
    const { t } = useTranslation();
    const { profile, user } = useAuth();

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('chat.welcome.morning');
        if (hour < 18) return t('chat.welcome.afternoon');
        return t('chat.welcome.evening');
    };

    const userName = profile?.name || user?.displayName || t('auth.dashboard.explorer');

    const suggestions = [
        { id: 'write', icon: PenLine, label: t('chat.welcome.suggestions.write'), color: 'text-orange-400', bg: 'bg-orange-400/10' },
        { id: 'explain', icon: Lightbulb, label: t('chat.welcome.suggestions.explain'), color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
        { id: 'code', icon: Code2, label: t('chat.welcome.suggestions.code'), color: 'text-blue-400', bg: 'bg-blue-400/10' },
        { id: 'plan', icon: Plane, label: t('chat.welcome.suggestions.plan'), color: 'text-green-400', bg: 'bg-green-400/10' },
    ];

    return (
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none overflow-y-auto scrollbar-hide">
            {/* Orb Element (Glassmorphism inspired by reference) */}
            <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1.5, ease: "easeOut" }}
                className="relative mb-12"
            >
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-gradient-to-tr from-blue-500/30 via-indigo-600/30 to-purple-500/30 blur-2xl absolute inset-0 animate-pulse" />
                <div className="w-24 h-24 md:w-32 md:h-32 rounded-full bg-slate-100/5 backdrop-blur-3xl border border-white/10 shadow-[0_0_60px_rgba(79,70,229,0.2)] relative flex items-center justify-center overflow-hidden group">
                    <div className="absolute inset-0 bg-gradient-to-tr from-indigo-500/10 via-transparent to-white/10 opacity-50" />
                    <motion.div
                        animate={{
                            rotate: 360,
                            scale: [1, 1.1, 1]
                        }}
                        transition={{
                            rotate: { repeat: Infinity, duration: 20, ease: "linear" },
                            scale: { repeat: Infinity, duration: 8, ease: "easeInOut" }
                        }}
                        className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-white/20 to-transparent blur-sm"
                    />
                </div>
            </motion.div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8 }}
                className="max-w-3xl"
            >
                <h2 className="text-3xl md:text-5xl font-bold text-white mb-4 tracking-tight">
                    {getGreeting()}{t('chat.welcome.greeting_suffix', { name: userName })}
                </h2>
                <p className="text-lg md:text-2xl text-slate-400 font-medium mb-12">
                    <Trans i18nKey="chat.welcome.assist_question">
                        Como a <span className="text-indigo-500">Luna</span> pode ajudar você hoje?
                    </Trans>
                </p>
            </motion.div>

            {/* Quick Suggestions Cards */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-4xl px-4"
            >
                {suggestions.map((item) => (
                    <motion.button
                        key={item.id}
                        whileHover={{ scale: 1.02, y: -2 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex items-center gap-4 p-4 rounded-2xl bg-slate-900/40 border border-slate-800/80 hover:border-indigo-500/30 hover:bg-slate-800/50 transition-all text-left group"
                    >
                        <div className={`p-3 rounded-xl ${item.bg} ${item.color} group-hover:scale-110 transition-transform`}>
                            <item.icon size={20} />
                        </div>
                        <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">
                            {item.label}
                        </span>
                    </motion.button>
                ))}
            </motion.div>
        </div>
    );
};

export default WelcomeScreen;
