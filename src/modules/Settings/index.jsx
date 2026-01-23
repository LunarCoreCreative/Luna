import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { motion } from 'framer-motion';
import {
    User,
    Mail,
    Shield,
    Moon,
    Globe,
    Save,
    AlertCircle,
    CheckCircle2,
    Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { updateUserProfile } from '@/lib/firebase';

const SettingsModule = () => {
    const { t } = useTranslation();
    const { user, profile } = useAuth();
    const [name, setName] = useState(profile?.name || '');
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState(null);

    useEffect(() => {
        if (profile?.name) {
            setName(profile.name);
        }
    }, [profile]);

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        setMessage(null);

        const success = await updateUserProfile(user.uid, { name });

        if (success) {
            setMessage({ type: 'success', text: t('settings.profile.update_success') });
        } else {
            setMessage({ type: 'error', text: t('settings.profile.update_error') });
        }

        setIsSaving(false);
        setTimeout(() => setMessage(null), 3000);
    };

    return (
        <div className="h-full flex flex-col bg-slate-950 overflow-y-auto custom-scrollbar">
            <div className="max-w-4xl mx-auto w-full p-6 md:p-12">
                <header className="mb-10">
                    <h1 className="text-3xl font-bold text-white mb-2">{t('settings.title')}</h1>
                    <p className="text-slate-400">{t('settings.subtitle')}</p>
                </header>

                <div className="space-y-8">
                    {/* Seção de Perfil */}
                    <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 md:p-8">
                        <div className="flex items-center gap-3 mb-6">
                            <User className="text-violet-500" size={24} />
                            <h2 className="text-xl font-bold text-white">{t('settings.profile.title')}</h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="flex flex-col items-center md:items-start gap-4">
                                <div className="relative">
                                    <div className="w-24 h-24 rounded-3xl bg-violet-600 flex items-center justify-center text-white text-3xl font-bold shadow-2xl shadow-violet-500/20">
                                        {name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
                                    </div>
                                    <div className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400">
                                        <User size={16} />
                                    </div>
                                </div>
                                <div className="text-center md:text-left">
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-1">{t('settings.profile.user_id')}</p>
                                    <p className="text-[10px] font-mono text-slate-600 bg-slate-950 px-2 py-1 rounded-md">{user?.uid}</p>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                                        {t('settings.profile.full_name')}
                                    </label>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 transition-colors group-focus-within:text-violet-500" size={18} />
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder={t('settings.profile.name_placeholder')}
                                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-slate-100 placeholder-slate-700 focus:outline-none focus:border-violet-500/50 focus:ring-4 focus:ring-violet-500/5 transition-all"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2 ml-1">
                                        {t('settings.profile.email')}
                                    </label>
                                    <div className="relative group opacity-60">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600" size={18} />
                                        <input
                                            type="email"
                                            value={user?.email || ''}
                                            readOnly
                                            className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-3.5 pl-12 pr-4 text-slate-400 cursor-not-allowed"
                                        />
                                    </div>
                                    <p className="text-[10px] text-slate-600 mt-2 ml-1">{t('settings.profile.email_readonly')}</p>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Seção de Preferências (Placeholder) */}
                    <section className="bg-slate-900/50 border border-slate-800 rounded-3xl p-6 md:p-8 opacity-50 grayscale pointer-events-none">
                        <div className="flex items-center gap-3 mb-6">
                            <Shield className="text-emerald-500" size={24} />
                            <h2 className="text-xl font-bold text-white">{t('settings.preferences.title')}</h2>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800">
                                <div className="flex items-center gap-3">
                                    <Moon size={20} className="text-slate-400" />
                                    <div>
                                        <p className="text-sm font-bold text-slate-200">{t('settings.preferences.dark_theme')}</p>
                                        <p className="text-xs text-slate-500 italic">{t('settings.preferences.dark_theme_coming_soon')}</p>
                                    </div>
                                </div>
                                <div className="w-10 h-6 bg-slate-800 rounded-full" />
                            </div>
                            <div className="flex items-center justify-between p-4 bg-slate-950 rounded-2xl border border-slate-800">
                                <div className="flex items-center gap-3">
                                    <Globe size={20} className="text-slate-400" />
                                    <div>
                                        <p className="text-sm font-bold text-slate-200">{t('settings.preferences.language')}</p>
                                        <p className="text-xs text-slate-500 italic">{t('settings.preferences.language_portuguese')}</p>
                                    </div>
                                </div>
                                <div className="w-10 h-6 bg-slate-800 rounded-full" />
                            </div>
                        </div>
                    </section>


                    {/* Rodapé de Ações */}
                    <div className="flex flex-col md:flex-row items-center justify-between gap-6 pt-6">
                        <div className="flex items-center gap-2 h-10">
                            {message && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium ${message.type === 'success'
                                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                            : 'bg-red-500/10 text-red-400 border border-red-500/20'
                                        }`}
                                >
                                    {message.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                                    {message.text}
                                </motion.div>
                            )}
                        </div>

                        <button
                            onClick={handleSave}
                            disabled={isSaving || name === (profile?.name || '')}
                            className="w-full md:w-auto flex items-center justify-center gap-2 px-8 py-3.5 bg-violet-600 hover:bg-violet-500 disabled:bg-slate-800 disabled:text-slate-500 text-white font-bold rounded-2xl transition-all shadow-xl shadow-violet-600/20 active:scale-95 group"
                        >
                            {isSaving ? (
                                <Loader2 className="animate-spin" size={20} />
                            ) : (
                                <Save size={20} className="group-hover:scale-110 transition-transform" />
                            )}
                            {t('settings.profile.save_changes')}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SettingsModule;
