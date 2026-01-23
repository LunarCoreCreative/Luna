import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import {
    Home,
    History,
    Search,
    MoreVertical,
    Trash2,
    Brain,
    Briefcase,
    LogOut,
    User,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigation } from '@/contexts/NavigationContext';
import { useWindowSize } from '@/hooks/useWindowSize';

import { useChat } from '@/contexts/ChatContext';

const Sidebar = ({ isCollapsed, isOpen = true, isMobile = false, toggleSidebar }) => {
    const { isTablet } = useWindowSize();
    const { t } = useTranslation();
    const { profile, user, logout } = useAuth();
    const { currentModule, navigateTo } = useNavigation();
    const { conversations, currentChatId, setCurrentChatId, deleteChat } = useChat();
    const [showUserMenu, setShowUserMenu] = useState(false);

    const menuItems = [
        { id: 'chat', icon: Home, label: 'Início' },
        { id: 'business', icon: Briefcase, label: 'Gestão' },
        { id: 'memory', icon: Brain, label: 'Memórias' },
    ];

    const handleChatSelect = (chatId) => {
        setCurrentChatId(chatId);
        navigateTo('chat');
    };

    const handleLogout = async () => {
        try {
            await logout();
            setShowUserMenu(false);
        } catch (error) {
            console.error('Logout error:', error);
        }
    };

    // Agrupar conversas por data (simplificado)
    const today = new Date().toDateString();
    const chatsToday = conversations.filter(c => new Date(c.date).toDateString() === today);
    const chatsOlder = conversations.filter(c => new Date(c.date).toDateString() !== today);


    // Larguras responsivas
    const sidebarWidth = isMobile 
        ? (isOpen ? 'w-72' : 'w-0') 
        : (isCollapsed ? 'w-16 md:w-20' : 'w-64 md:w-72');
    
    const sidebarClasses = `
        h-full bg-obsidian-light/60 border-r border-white/5 flex flex-col 
        transition-all duration-300 ease-in-out
        ${sidebarWidth}
        ${(isMobile || isTablet) && !isOpen ? 'hidden' : ''}
        ${(isMobile || isTablet) && isOpen ? 'fixed left-0 top-0 z-50 shadow-2xl' : 'relative'}
    `.trim().replace(/\s+/g, ' ');

    return (
        <div className={sidebarClasses}>
            {/* Brand Logo */}
            <div className={`p-4 md:p-6 flex items-center gap-2 md:gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                <div className="w-9 h-9 md:w-10 md:h-10 bg-gradient-to-br from-violet-600 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
                    <span className="text-white text-base md:text-lg font-bold">L</span>
                </div>
                {!isCollapsed && (
                    <motion.h1
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="text-lg md:text-xl font-bold text-white tracking-tight truncate"
                    >
                        Luna <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-400 to-fuchsia-400">AI</span>
                    </motion.h1>
                )}
            </div>

            {/* Search Bar */}
            <div className="px-3 md:px-4 mb-4 md:mb-6">
                <div className="relative group">
                    <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
                        <Search className="text-slate-500 group-focus-within:text-violet-400 transition-colors" size={16} />
                    </div>
                    <input
                        type="text"
                        placeholder={isCollapsed ? "" : t('chat.sidebar.search_placeholder')}
                        className={`w-full bg-obsidian border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all ${isCollapsed ? 'opacity-0 cursor-default' : 'opacity-100'}`}
                    />
                </div>
            </div>

            {/* Navigation Menu */}
            <nav className="px-2 md:px-3 space-y-1 mb-4 md:mb-8">
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => {
                            if (item.id === 'chat') {
                                setCurrentChatId(null);
                            }
                            navigateTo(item.id);
                        }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all relative group ${currentModule === item.id
                            ? 'text-white bg-violet-500/10'
                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                            }`}
                    >
                        <item.icon size={20} className={currentModule === item.id ? 'text-violet-400' : ''} />
                        {!isCollapsed && (
                            <span className="text-sm font-medium">{item.label}</span>
                        )}
                        {currentModule === item.id && (
                            <motion.div
                                layoutId="active-nav"
                                className="absolute left-0 w-1 h-6 bg-fuchsia-500 rounded-r-full"
                            />
                        )}
                    </button>
                ))}
            </nav>

            {/* Recent History */}
            {!isCollapsed && (
                <div className="flex-1 px-3 md:px-4 overflow-y-auto scrollbar-hide">
                    {/* Botão Novo Chat se não houver chats ou sempre visível? */}

                    <div className="space-y-6">
                        {chatsToday.length > 0 && (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 ml-2">
                                    {t('chat.sidebar.today')}
                                </p>
                                <div className="space-y-1">
                                    {chatsToday.map(chat => (
                                        <div key={chat.id} className="relative group/item">
                                            <button
                                                onClick={() => handleChatSelect(chat.id)}
                                                className={`w-full text-left px-3 py-2 rounded-lg transition-all overflow-hidden text-ellipsis whitespace-nowrap pr-8 ${currentChatId === chat.id ? 'bg-violet-500/10 text-violet-300' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}
                                            >
                                                <span className="text-sm">{chat.title}</span>
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {chatsOlder.length > 0 && (
                            <div>
                                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-3 ml-2">
                                    {t('chat.sidebar.earlier')}
                                </p>
                                <div className="space-y-1">
                                    {chatsOlder.map(chat => (
                                        <div key={chat.id} className="relative group/item">
                                            <button
                                                onClick={() => handleChatSelect(chat.id)}
                                                className={`w-full text-left px-3 py-2 rounded-lg transition-all overflow-hidden text-ellipsis whitespace-nowrap pr-8 ${currentChatId === chat.id ? 'bg-violet-500/10 text-violet-300' : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/30'}`}
                                            >
                                                <span className="text-sm">{chat.title}</span>
                                            </button>
                                            <button
                                                onClick={(e) => { e.stopPropagation(); deleteChat(chat.id); }}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-red-400 opacity-0 group-hover/item:opacity-100 transition-opacity"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {conversations.length === 0 && (
                            <div className="text-center p-4 text-slate-500 text-sm">
                                {t('chat.sidebar.no_recent_conversations')}
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* User Profile Section */}
            <div className="p-3 md:p-4 border-t border-slate-800/50 relative">
                <div
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className={`flex items-center gap-3 p-2 rounded-2xl bg-slate-800/30 hover:bg-slate-800/50 transition-all cursor-pointer group ${isCollapsed ? 'justify-center' : ''}`}
                >
                    <div className="relative">
                        <img
                            src={`https://ui-avatars.com/api/?name=${profile?.name || 'User'}&background=7c3aed&color=fff`}
                            alt="Profile"
                            className="w-10 h-10 rounded-xl"
                        />
                        <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-green-500 border-2 border-slate-900 rounded-full" />
                    </div>

                    {!isCollapsed && (
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-white truncate">{profile?.name || 'User'}</p>
                            <p className="text-[10px] text-slate-500 truncate">{profile?.email || user?.email || ''}</p>
                        </div>
                    )}

                    {!isCollapsed && <MoreVertical size={16} className="text-slate-500" />}
                </div>

                {/* User Dropdown Menu */}
                <AnimatePresence>
                    {showUserMenu && !isCollapsed && (
                        <motion.div
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bottom-full left-4 right-4 mb-2 bg-slate-800 border border-white/10 rounded-xl shadow-xl overflow-hidden z-50"
                        >
                            {user && (
                                <div className="px-4 py-3 border-b border-white/5">
                                    <p className="text-xs text-slate-500">UID: {user.uid?.slice(0, 12)}...</p>
                                </div>
                            )}
                            <button
                                onClick={() => {
                                    navigateTo('settings');
                                    setShowUserMenu(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-slate-300 hover:bg-white/5 transition-colors"
                            >
                                <User size={16} />
                                <span className="text-sm font-medium">{t('chat.sidebar.user_menu.my_profile')}</span>
                            </button>
                            <button
                                onClick={handleLogout}
                                className="w-full flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 transition-colors"
                            >
                                <LogOut size={16} />
                                <span className="text-sm font-medium">{t('chat.sidebar.user_menu.logout')}</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Sidebar;
