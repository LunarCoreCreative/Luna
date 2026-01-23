import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    Plus,
    Moon,
    Wallet,
    Menu,
    X
} from 'lucide-react';
import { useChat } from '@/contexts/ChatContext';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useWindowSize } from '@/hooks/useWindowSize';
import { auth } from '@/lib/firebase';

const Header = ({ onMenuClick, showMenuButton = false }) => {
    const { isMobile, isTablet } = useWindowSize();
    const { t, i18n } = useTranslation();
    const { createNewChat, currentChatId, conversations } = useChat();
    const { profile } = useAuth();
    const { currentModule } = useNavigation();
    
    // Business module - fetch summary for balance
    const isBusinessModule = currentModule === 'business';
    const [balance, setBalance] = useState(null);

    // Encontrar chat atual para título
    const currentChat = conversations.find(c => c.id === currentChatId);

    // Fetch summary when in business module
    useEffect(() => {
        if (isBusinessModule) {
            const fetchBalance = async () => {
                try {
                    const uid = auth.currentUser?.uid || 'local';
                    const url = `http://localhost:3001/api/business/summary?uid=${uid}`;
                    const res = await fetch(url);
                    if (res.ok) {
                        const data = await res.json();
                        setBalance(data.balance || 0);
                    }
                } catch (err) {
                    console.error('Error fetching balance:', err);
                }
            };
            
            fetchBalance();
            // Refresh every 15 seconds
            const interval = setInterval(fetchBalance, 15000);
            
            // Refresh when window gains focus (user comes back to app)
            const handleFocus = () => fetchBalance();
            window.addEventListener('focus', handleFocus);
            
            return () => {
                clearInterval(interval);
                window.removeEventListener('focus', handleFocus);
            };
        } else {
            setBalance(null);
        }
    }, [isBusinessModule]);

    const handleNewChat = () => {
        createNewChat(); // Cria novo chat padrão
    };

    const toggleLanguage = () => {
        const newLang = i18n.language === 'pt' ? 'en' : 'pt';
        i18n.changeLanguage(newLang);
    };

    // Título dinâmico baseado no módulo
    const getModuleTitle = () => {
        switch (currentModule) {
            case 'business': return t('chat.header.titles.business');
            case 'health': return t('chat.header.titles.health');
            case 'chat': return t('chat.header.titles.chat');
            default: return t('chat.header.titles.default');
        }
    };

    return (
        <header className="h-14 md:h-16 border-b border-white/5 bg-obsidian/95 backdrop-blur-xl flex items-center justify-between px-3 md:px-4 sticky top-0 z-50">
            {/* Left Section: Menu Button + Context Title */}
            <div className="flex items-center gap-2 md:gap-4">
                {/* Menu Button (Mobile/Tablet) */}
                {showMenuButton && (
                    <button
                        onClick={onMenuClick}
                        className="p-2 rounded-lg hover:bg-white/5 transition-colors lg:hidden"
                        aria-label="Toggle menu"
                    >
                        <Menu size={20} className="text-slate-300" />
                    </button>
                )}

                {/* Context Title */}
                <div className="flex items-center gap-2 md:gap-3">
                    <div className="w-7 h-7 md:w-8 md:h-8 rounded-lg bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
                        <Moon className="text-white" size={14} />
                    </div>
                    <h2 className="text-base md:text-lg font-bold text-white tracking-tight truncate">
                        {getModuleTitle()}
                    </h2>
                </div>

                {currentChat && currentModule === 'chat' && !isMobile && (
                    <>
                        <div className="h-4 w-[1px] bg-white/10 mx-1 md:mx-2 hidden sm:block" />
                        <span className="text-xs md:text-sm text-slate-400 max-w-[150px] md:max-w-[200px] truncate hidden sm:block">
                            {currentChat.title}
                        </span>
                    </>
                )}

                {isBusinessModule && balance !== null && !isMobile && (
                    <>
                        <div className="h-4 w-[1px] bg-white/10 mx-1 md:mx-2 hidden md:block" />
                        <div className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-white/5 border border-white/10 hidden md:flex">
                            <Wallet size={12} className="text-emerald-400 shrink-0" />
                            <div className="flex flex-col min-w-0">
                                <span className="text-[9px] md:text-[10px] text-slate-500 uppercase tracking-wider font-bold leading-none">
                                    Saldo
                                </span>
                                <span className={`text-xs md:text-sm font-bold leading-none truncate ${balance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                            </div>
                        </div>
                    </>
                )}
            </div>

            {/* Right Section: Actions */}
            <div className="flex items-center gap-1.5 md:gap-2">
                <button
                    onClick={toggleLanguage}
                    className="px-2 md:px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-400 transition-all border border-white/5 shrink-0"
                >
                    {i18n.language === 'pt' ? 'PT' : 'EN'}
                </button>

                <div className="h-6 w-[1px] bg-white/10 mx-1 md:mx-2 hidden sm:block" />

                {currentModule === 'chat' && (
                    <button
                        onClick={handleNewChat}
                        className="flex items-center gap-1.5 md:gap-2 px-2 md:px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs md:text-sm font-medium transition-all shadow-lg shadow-violet-600/20"
                    >
                        <Plus size={14} className="md:w-4 md:h-4" />
                        <span className="hidden sm:inline">{t('chat.header.new_chat')}</span>
                    </button>
                )}

                {currentModule === 'settings' && (
                    <div className="text-xs md:text-sm text-slate-400 hidden sm:block">
                        {t('chat.header.account_settings')}
                    </div>
                )}
            </div>
        </header>
    );
};

export default Header;
