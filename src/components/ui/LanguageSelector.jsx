import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import { Globe } from 'lucide-react';

const LanguageSelector = () => {
    const { i18n } = useTranslation();
    const [isOpen, setIsOpen] = React.useState(false);

    const languages = [
        { code: 'pt-BR', label: 'Português', flag: '🇧🇷' },
        { code: 'en-US', label: 'English', flag: '🇺🇸' }
    ];

    const currentLanguage = languages.find(lang => lang.code === i18n.language) || languages[0];

    return (
        <div className="fixed bottom-6 right-6 z-[100]">
            <div className="relative">
                <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setIsOpen(!isOpen)}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-full text-slate-300 text-sm font-medium hover:border-slate-700 hover:text-white transition-all shadow-lg opacity-60 hover:opacity-100"
                >
                    <Globe size={16} className="text-indigo-400" />
                    <span>{currentLanguage.flag}</span>
                    <span className="hidden sm:inline uppercase tracking-wider text-[10px]">{currentLanguage.code.split('-')[0]}</span>
                </motion.button>

                <AnimatePresence>
                    {isOpen && (
                        <>
                            {/* Overlay para fechar ao clicar fora */}
                            <div
                                className="fixed inset-0 z-[-1]"
                                onClick={() => setIsOpen(false)}
                            />

                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                className="absolute right-0 bottom-full mb-3 w-40 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden backdrop-blur-2xl"
                            >
                                {languages.map((lang) => (
                                    <button
                                        key={lang.code}
                                        onClick={() => {
                                            i18n.changeLanguage(lang.code);
                                            setIsOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-colors ${i18n.language === lang.code
                                            ? 'bg-indigo-500/10 text-indigo-300 font-bold'
                                            : 'text-slate-400 hover:bg-slate-800 hover:text-slate-200'
                                            }`}
                                    >
                                        <span className="text-base">{lang.flag}</span>
                                        <span>{lang.label}</span>
                                    </button>
                                ))}
                            </motion.div>
                        </>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default LanguageSelector;
