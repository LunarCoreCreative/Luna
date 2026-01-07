import { useState, useEffect } from 'react';
import {
    Settings, User, CreditCard, Shield, Palette,
    Bell, Languages, Crown, ArrowLeft, ChevronRight,
    Check, Sparkles, Moon, Sun, Monitor, Loader2, Zap, X, Terminal, Code, Hammer, Brain
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const SettingsPage = ({ onBack, initialTab = 'general', theme, onThemeChange }) => {
    const {
        user, profile, isCreator, updateProfile, plan,
        upgradePlan, createCheckout, syncPlan
    } = useAuth();
    const [activeTab, setActiveTab] = useState(initialTab);

    // Profile states
    const [displayName, setDisplayName] = useState(profile?.name || '');

    // Sync state with profile data
    useEffect(() => {
        if (profile?.name) {
            setDisplayName(profile.name);
        }
    }, [profile]);

    // States for functional settings
    const [language, setLanguage] = useState(() => localStorage.getItem('luna-lang') || 'pt-BR');
    const [notifications, setNotifications] = useState(() => localStorage.getItem('luna-notifications') !== 'false');
    const [isLangMenuOpen, setIsLangMenuOpen] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [toast, setToast] = useState(null);

    const showToast = (message, type = 'success') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 4000);
    };

    const languages = [
        { id: 'pt-BR', label: 'Português (Brasil)', flag: '🇧🇷' },
        { id: 'en-US', label: 'English (US)', flag: '🇺🇸' },
        { id: 'es-ES', label: 'Español', flag: '🇪🇸' },
    ];

    const currentLangLabel = languages.find(l => l.id === language)?.label || 'Português (Brasil)';

    const toggleNotifications = () => {
        const newState = !notifications;
        setNotifications(newState);
        localStorage.setItem('luna-notifications', newState.toString());
    };

    const handleSync = async () => {
        setIsSaving(true);
        const result = await syncPlan();
        setIsSaving(false);
        if (result.success) {
            showToast(`Sucesso! Seu plano foi atualizado para Luna ${result.plan.toUpperCase()}! 🚀`, 'success');
        } else {
            showToast(result.message || "Nenhum pagamento confirmado detectado.", 'error');
        }
    };

    const handleSaveProfile = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            const success = await updateProfile({ name: displayName });
            if (success) {
                // Feedback visual simples (pode ser melhorado com um Toast)
                const btn = document.activeElement;
                if (btn) {
                    const originalText = btn.innerText;
                    btn.innerText = "Salvo!";
                    setTimeout(() => btn.innerText = originalText, 2000);
                }
            }
        } catch (error) {
            console.error("Erro ao salvar:", error);
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        // Tentar sincronizar plano ao entrar na página se for Spark
        if (plan === 'spark') {
            syncPlan();
        }
    }, []);

    const handleUpgrade = async (planType) => {
        setIsSaving(true);
        try {
            const result = await createCheckout(planType);
            if (result.success && result.url) {
                window.open(result.url, '_blank');
            } else {
                showToast(result.error || "Erro ao gerar link de pagamento.", 'error');
            }
        } catch (err) {
            showToast("Falha na conexão com o servidor.", 'error');
        } finally {
            setIsSaving(false);
        }
    };

    const selectLanguage = async (id) => {
        setLanguage(id);
        localStorage.setItem('luna-lang', id);
        setIsLangMenuOpen(false);

        // Persistir no Firestore se logado
        if (user) {
            await updateProfile({
                preferences: {
                    ...profile?.preferences,
                    language: id
                }
            });
        }
    };



    const tabs = [
        { id: 'general', label: 'Geral', icon: Settings },
        { id: 'profile', label: 'Perfil', icon: User },
        { id: 'appearance', label: 'Aparência', icon: Palette },
        { id: 'premium', label: 'Premium', icon: Crown, highlight: true },
        ...(isCreator ? [{ id: 'identity', label: 'Identidade Luna', icon: Shield }] : []),
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'general':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div>
                            <h3 className="text-lg font-medium text-white mb-4">Preferências do Sistema</h3>
                            <div className="space-y-4">
                                <div className="relative">
                                    <div
                                        onClick={() => setIsLangMenuOpen(!isLangMenuOpen)}
                                        className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Languages size={20} className="text-blue-400" />
                                            <div>
                                                <div className="text-sm font-medium text-white">Idioma</div>
                                                <div className="text-xs text-gray-400">{currentLangLabel}</div>
                                            </div>
                                        </div>
                                        <ChevronRight size={16} className={`text-gray-600 transition-transform ${isLangMenuOpen ? 'rotate-90' : ''}`} />
                                    </div>

                                    {isLangMenuOpen && (
                                        <div className="absolute top-full left-0 w-full mt-2 bg-[#161b22] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                                            {languages.map(lang => (
                                                <button
                                                    key={lang.id}
                                                    onClick={() => selectLanguage(lang.id)}
                                                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-sm"
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <span>{lang.flag}</span>
                                                        <span className={language === lang.id ? 'text-blue-400 font-medium' : 'text-gray-300'}>
                                                            {lang.label}
                                                        </span>
                                                    </div>
                                                    {language === lang.id && <Check size={14} className="text-blue-400" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                <div
                                    onClick={toggleNotifications}
                                    className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <Bell size={20} className="text-purple-400" />
                                        <div>
                                            <div className="text-sm font-medium text-white">Notificações</div>
                                            <div className="text-xs text-gray-400">{notifications ? 'Ativadas' : 'Desativadas'}</div>
                                        </div>
                                    </div>
                                    <div className={`w-10 h-5 rounded-full relative transition-colors ${notifications ? 'bg-blue-600' : 'bg-gray-700'}`}>
                                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${notifications ? 'right-0.5' : 'left-0.5'}`} />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            case 'profile':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="flex flex-col items-center">
                            <div className="w-24 h-24 rounded-2xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-3xl font-bold text-white shadow-xl relative group">
                                {user?.email?.charAt(0).toUpperCase()}
                                <div className="absolute inset-0 bg-black/40 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer">
                                    <Palette size={20} />
                                </div>
                            </div>
                            <h4 className="mt-4 text-xl font-semibold text-white">{profile?.name || 'Usuário'}</h4>
                            <p className="text-sm text-gray-400">{user?.email}</p>
                        </div>
                        <div className="space-y-4 pt-4 border-t border-white/10">
                            <div>
                                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block mb-2 px-1">Nome de Exibição</label>
                                <input
                                    type="text"
                                    value={displayName}
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    placeholder="Como a Luna deve te chamar?"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                                />
                            </div>
                            <button
                                onClick={handleSaveProfile}
                                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                                disabled={isSaving || !displayName.trim()}
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Salvando...
                                    </>
                                ) : 'Salvar Alterações'}
                            </button>
                        </div>
                    </div>
                );
            case 'appearance':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <h3 className="text-lg font-medium text-white mb-6">Tema e Visual</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-2">
                            {[
                                { id: 'dark', label: 'Dark Deep', icon: Moon, color: 'bg-[#0d1117] border-[#30363d]' },
                                { id: 'glass', label: 'Glassmorphism', icon: Monitor, color: 'bg-[#111827]/50 backdrop-blur-md border-white/20' },
                                { id: 'neon', label: 'Luna Neon', icon: Sun, color: 'bg-black border-[#f472b666] shadow-[0_0_15px_rgba(244,114,182,0.1)]' }
                            ].map(t => (
                                <div
                                    key={t.id}
                                    onClick={() => onThemeChange(t.id)}
                                    className={`p-6 rounded-2xl border-2 transition-all cursor-pointer ${t.color} flex flex-col items-center gap-3 hover:scale-105 relative overflow-hidden ${theme === t.id ? 'ring-2 ring-white/20 border-white opacity-100 scale-105' : 'opacity-50 hover:opacity-100'}`}
                                >
                                    {theme === t.id && (
                                        <div className="absolute top-3 right-3 p-1 bg-white rounded-full">
                                            <Check size={10} className="text-black" />
                                        </div>
                                    )}
                                    <t.icon size={28} className={t.id === 'neon' ? 'text-pink-400' : 'text-white'} />
                                    <span className="text-xs font-bold uppercase tracking-widest text-white">{t.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            case 'premium':
                return (
                    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 pb-10">
                        <div className="text-center space-y-3 mb-8">
                            <h2 className="text-3xl font-bold text-white tracking-tight">Mais que uma IA. Sua Teammate.</h2>
                            <p className="text-lg text-gray-400 font-light">"A única IA que conhece seu código — e o seu jeito."</p>
                            <div className="flex justify-center gap-4 text-xs text-gray-500 mt-2">
                                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-green-500 rounded-full"></span> Quebra o Vidro</span>
                                <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 bg-blue-500 rounded-full"></span> Sincronia Total</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                            {/* Card: Luna Spark */}
                            <div className={`relative p-5 rounded-3xl border transition-all flex flex-col ${plan === 'spark' ? 'bg-white/5 border-white/20' : 'bg-[#0d1117] border-white/5 opacity-60 hover:opacity-100'}`}>
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Sparkles size={60} />
                                </div>
                                <div className="relative z-10 font-bold mb-2">
                                    <h3 className="text-lg text-white">Luna Spark</h3>
                                    <div className="text-xs text-gray-500 font-normal">Curiosos & Iniciantes</div>
                                </div>
                                <div className="mb-4">
                                    <span className="text-2xl font-bold text-white">Grátis</span>
                                </div>
                                <div className="space-y-2 mb-6 flex-1">
                                    {[
                                        { text: "50 Energia / Pool", check: true },
                                        { text: "Cooldown de 3h", check: true },
                                        { text: "Chat Inteligente", check: true },
                                        { text: "Web Search", check: false },
                                        { text: "Agent Mode", check: false },
                                    ].map((feat, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs">
                                            {feat.check ? <Check size={14} className="text-green-500 shrink-0" /> : <X size={14} className="text-gray-600 shrink-0" />}
                                            <span className={feat.check ? "text-gray-300" : "text-gray-600 line-through"}>{feat.text}</span>
                                        </div>
                                    ))}
                                </div>
                                {plan === 'spark' ? (
                                    <div className="w-full py-2.5 rounded-xl bg-white/10 text-white text-sm font-bold text-center border border-white/5 cursor-default">
                                        Plano Atual
                                    </div>
                                ) : (
                                    <div className="w-full py-2.5 rounded-xl bg-transparent text-gray-500 text-sm font-bold text-center border border-white/5 cursor-default">
                                        Disponível
                                    </div>
                                )}
                            </div>

                            {/* Card: Luna Nexus */}
                            <div className={`relative p-5 rounded-3xl border transition-all flex flex-col ${plan === 'nexus' ? 'bg-gradient-to-br from-amber-900/40 to-yellow-900/20 border-amber-500/50 shadow-[0_0_20px_rgba(245,158,11,0.1)] scale-105 z-10' : 'bg-[#0d1117] border-amber-500/20 hover:border-amber-500/40'}`}>
                                <div className="absolute top-0 right-0 p-4 opacity-20 text-amber-500">
                                    <Zap size={80} className="-rotate-12" />
                                </div>
                                {plan === 'nexus' && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-amber-400 to-yellow-600" />}

                                <div className="relative z-10 font-bold mb-2">
                                    <h3 className="text-lg text-white flex items-center gap-2">
                                        Luna Nexus <div className="px-1.5 py-0.5 bg-amber-500/20 rounded text-[10px] fmt-bold text-amber-400">SYNC</div>
                                    </h3>
                                    <div className="text-xs text-gray-400 font-normal italic">"Sincroniza com você."</div>
                                </div>
                                <div className="mb-4 flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-white">R$ 39,90</span>
                                    <span className="text-xs text-gray-500">/mês</span>
                                </div>
                                <div className="space-y-2 mb-6 flex-1">
                                    {[
                                        { text: "Chat Ilimitado ⚡", check: true, highlight: true },
                                        { text: "DeepSeek V3 + Vision", check: true },
                                        { text: "Web & Deep Research", check: true },
                                        { text: "Upload de Arquivos", check: true },
                                        { text: "Canvas V2", check: true },
                                        { text: "Agent Mode (IDE)", check: false },
                                    ].map((feat, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs">
                                            {feat.check ? (
                                                <div className="p-0.5 bg-amber-500/20 rounded-full shrink-0">
                                                    <Check size={10} className="text-amber-400" />
                                                </div>
                                            ) : <X size={14} className="text-gray-600 shrink-0" />}
                                            <span className={`text-gray-200 ${feat.highlight ? 'font-bold text-amber-200' : ''}`}>{feat.text}</span>
                                        </div>
                                    ))}
                                </div>
                                {plan === 'nexus' ? (
                                    <div className="w-full py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 text-white text-sm font-bold text-center shadow-lg cursor-default flex items-center justify-center gap-2">
                                        <Check size={14} /> Ativo
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {plan === 'spark' && (
                                            <button
                                                onClick={handleSync}
                                                disabled={isSaving}
                                                className="w-full py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-semibold text-center border border-gray-700 hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Zap size={12} /> Verificar Assinatura
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleUpgrade('nexus')}
                                            disabled={isSaving}
                                            className="w-full py-2.5 rounded-xl bg-amber-500 text-black text-sm font-bold text-center hover:bg-amber-400 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                                            Assinar Nexus
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Card: Luna Eclipse */}
                            <div className={`relative p-5 rounded-3xl border transition-all flex flex-col overflow-hidden group ${plan === 'eclipse' ? 'bg-gradient-to-br from-violet-900/40 to-fuchsia-900/20 border-violet-500/50 shadow-[0_0_30px_rgba(139,92,246,0.15)] scale-105 z-10' : 'bg-[#0d1117] border-violet-500/20 hover:border-violet-500/40'}`}>
                                <div className="absolute top-0 right-0 p-4 opacity-20 text-violet-500 group-hover:scale-110 transition-transform duration-500">
                                    <Crown size={80} className="-rotate-12" />
                                </div>
                                {plan === 'eclipse' && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-violet-400 to-fuchsia-600" />}

                                <div className="relative z-10 font-bold mb-2">
                                    <h3 className="text-lg text-white flex items-center gap-2">
                                        Luna Eclipse <div className="px-1.5 py-0.5 bg-violet-500/20 rounded text-[10px] font-bold text-violet-400">AGENT</div>
                                    </h3>
                                    <div className="text-xs text-gray-400 font-normal italic">"Quebra o vidro. Acessa tudo."</div>
                                </div>
                                <div className="mb-4 flex items-baseline gap-1">
                                    <span className="text-2xl font-bold text-white">R$ 79,90</span>
                                    <span className="text-xs text-gray-500">/mês</span>
                                </div>
                                <div className="space-y-2 mb-6 flex-1">
                                    {[
                                        { text: "Tudo do Nexus +", check: true, highlight: false },
                                        { text: "Agent Mode (Autônomo)", check: true, highlight: true },
                                        { text: "Edição de Arquivos Locais", check: true, highlight: true },
                                        { text: "Acesso ao Terminal", check: true, highlight: true },
                                        { text: "Full IDE Integration", check: true },
                                        { text: "Project Memory Index", check: true },
                                    ].map((feat, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs">
                                            <div className="p-0.5 bg-violet-500/20 rounded-full shrink-0">
                                                <Check size={10} className="text-violet-400" />
                                            </div>
                                            <span className={`text-gray-200 ${feat.highlight ? 'font-bold text-violet-200' : ''}`}>{feat.text}</span>
                                        </div>
                                    ))}
                                </div>
                                {plan === 'eclipse' ? (
                                    <div className="w-full py-2.5 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white text-sm font-bold text-center shadow-lg cursor-default flex items-center justify-center gap-2">
                                        <Crown size={14} className="fill-white" /> Mestre
                                    </div>
                                ) : (
                                    <div className="flex flex-col gap-2">
                                        {plan !== 'eclipse' && (
                                            <button
                                                onClick={handleSync}
                                                disabled={isSaving}
                                                className="w-full py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-semibold text-center border border-gray-700 hover:bg-gray-700 transition-all flex items-center justify-center gap-2"
                                            >
                                                <Zap size={12} /> Verificar Assinatura
                                            </button>
                                        )}
                                        <button
                                            onClick={() => handleUpgrade('eclipse')}
                                            disabled={isSaving}
                                            className="w-full py-2.5 rounded-xl bg-violet-600 text-white text-sm font-bold text-center hover:bg-violet-500 transition-all shadow-lg flex items-center justify-center gap-2 disabled:opacity-50"
                                        >
                                            {isSaving ? <Loader2 size={14} className="animate-spin" /> : null}
                                            Ativar Eclipse
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div >
                );
            case 'identity':
                return (
                    <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
                        <div className="bg-[var(--accent-primary)]/10 border border-[var(--accent-primary)]/20 rounded-2xl p-6">
                            <h3 className="text-lg font-medium text-[var(--text-primary)] mb-2 flex items-center gap-2">
                                <Shield size={20} className="text-[var(--accent-primary)]" />
                                Configurações de Identidade
                            </h3>
                            <p className="text-sm text-[var(--text-secondary)] mb-6">Esta aba é restrita ao criador da Luna (Ethan).</p>

                            <div className="space-y-4">
                                <div className="p-4 bg-[var(--bg-secondary)] border border-white/10 rounded-xl">
                                    <div className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest mb-3">Relacionamento Ativo</div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-full bg-[var(--accent-primary)]/20 flex items-center justify-center">
                                            <Crown size={24} className="text-[var(--accent-primary)]" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-[var(--text-primary)]">Creator Level</div>
                                            <div className="text-xs text-[var(--accent-primary)]">Total intimidade e confiança</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm text-[var(--text-secondary)]">Nível de Empatia Base</label>
                                    <div className="w-full bg-white/5 h-2 rounded-full overflow-hidden">
                                        <div className="bg-[var(--accent-primary)] h-full w-[100%]" />
                                    </div>
                                    <div className="flex justify-between text-[10px] text-[var(--text-muted)] uppercase font-bold">
                                        <span>Neutro</span>
                                        <span>Protetora</span>
                                        <span>Devota</span>
                                    </div>
                                </div>
                            </div>
                            {/* Section: Why Luna? (Battlecards) */}
                            <div className="mt-16 border-t border-white/5 pt-10">
                                <h3 className="text-2xl font-bold text-center text-white mb-8">Por que Luna e não outros?</h3>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {/* Card 1: The Glass Wall */}
                                    <div className="bg-[#0d1117] p-6 rounded-2xl border border-white/5 hover:border-violet-500/30 transition-colors group">
                                        <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mb-4 group-hover:bg-violet-500/20 transition-colors">
                                            <Hammer size={24} className="text-gray-400 group-hover:text-violet-400" />
                                        </div>
                                        <h4 className="text-lg font-bold text-white mb-2">Quebra o Vidro</h4>
                                        <p className="text-sm text-gray-400 leading-relaxed">
                                            Outras IAs vivem presas no chat (o "vidro"). Elas sugerem código, mas não tocam.
                                            <br /><br />
                                            <span className="text-violet-400 font-medium">A Luna tem mãos.</span> Ela edita arquivos, roda builds e instala pacotes no seu terminal real.
                                        </p>
                                    </div>

                                    {/* Card 2: Privacy First */}
                                    <div className="bg-[#0d1117] p-6 rounded-2xl border border-white/5 hover:border-green-500/30 transition-colors group">
                                        <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mb-4 group-hover:bg-green-500/20 transition-colors">
                                            <Shield size={24} className="text-gray-400 group-hover:text-green-400" />
                                        </div>
                                        <h4 className="text-lg font-bold text-white mb-2">Privacidade Real</h4>
                                        <p className="text-sm text-gray-400 leading-relaxed">
                                            Big Techs usam seus dados para treinar modelos. Você é o produto.
                                            <br /><br />
                                            <span className="text-green-400 font-medium">A Luna roda no Local Host.</span> Seus projetos, segredos e códigos nunca saem da sua máquina sem permissão.
                                        </p>
                                    </div>

                                    {/* Card 3: Teammate Memory */}
                                    <div className="bg-[#0d1117] p-6 rounded-2xl border border-white/5 hover:border-blue-500/30 transition-colors group">
                                        <div className="w-12 h-12 bg-gray-800 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-500/20 transition-colors">
                                            <Brain size={24} className="text-gray-400 group-hover:text-blue-400" />
                                        </div>
                                        <h4 className="text-lg font-bold text-white mb-2">Memória de Time</h4>
                                        <p className="text-sm text-gray-400 leading-relaxed">
                                            Chatbots têm amnésia a cada F5. Eles não conhecem a história do seu projeto.
                                            <br /><br />
                                            <span className="text-blue-400 font-medium">A Luna lembra.</span> Ela indexa sua documentação e decisões passadas, agindo como um membro real do time.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex-1 flex flex-col h-full bg-[var(--bg-primary)] text-[var(--text-primary)] relative overflow-hidden">
            {/* Background Effects */}
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/5 rounded-full blur-[120px] -mr-64 -mt-64" />
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/5 rounded-full blur-[120px] -ml-64 -mb-64" />

            {/* Header */}
            <header className="flex items-center gap-4 p-8 z-10">
                <button
                    onClick={onBack}
                    className="p-2 hover:bg-white/5 rounded-xl transition-colors text-gray-400 hover:text-white"
                >
                    <ArrowLeft size={24} />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-white">Configurações</h1>
                    <p className="text-sm text-gray-500">Personalize sua experiência com a Luna</p>
                </div>
            </header>

            {/* Content Area */}
            <div className="flex-1 flex overflow-hidden p-8 pt-0 gap-12 z-10">
                {/* Internal Sidebar */}
                <aside className="w-64 shrink-0 flex flex-col gap-1">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all ${activeTab === tab.id
                                ? 'bg-white/10 text-white shadow-lg'
                                : tab.highlight ? 'text-amber-400 hover:bg-amber-500/10' : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <tab.icon size={18} />
                                <span className="text-sm font-medium">{tab.label}</span>
                            </div>
                            {activeTab === tab.id && <div className="w-1 h-4 bg-blue-500 rounded-full" />}
                            {tab.highlight && activeTab !== tab.id && <Crown size={14} className="animate-pulse" />}
                        </button>
                    ))}
                </aside>

                {/* Main Content Scrollable */}
                <div className="flex-1 overflow-y-auto custom-scrollbar">
                    <div className="max-w-3xl mx-auto py-2 px-8 pb-12">
                        {renderContent()}
                    </div>
                </div>
            </div>
            {/* Toast Notification */}
            {toast && (
                <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100] animate-in fade-in slide-in-from-bottom-4 duration-300">
                    <div className={`px-6 py-3 rounded-2xl shadow-2xl backdrop-blur-xl border flex items-center gap-3 ${toast.type === 'success'
                            ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-400'
                            : 'bg-red-500/20 border-red-500/30 text-red-400'
                        }`}>
                        {toast.type === 'success' ? <Sparkles size={18} /> : <X size={18} />}
                        <span className="text-sm font-medium">{toast.message}</span>
                    </div>
                </div>
            )}
        </div>
    );
};
