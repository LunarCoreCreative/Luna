import React, { useState } from 'react';
import {
    LayoutDashboard,
    ArrowRightLeft,
    CalendarClock,
    Target,
    Trophy,
    CreditCard,
    MessageSquareMore,
    Bell,
    Receipt,
    BarChart3,
    Wallet
} from 'lucide-react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { useWindowSize } from '@/hooks/useWindowSize';

// Import direto - componentes pequenos não precisam de lazy loading
// Isso elimina o "flick" ao trocar de abas
import BusinessDashboard from './components/Dashboard';
import Transactions from './components/Transactions';
import Recurring from './components/Recurring';
import Budget from './components/Budget';
import Goals from './components/Goals';
import CreditCards from './components/CreditCards';
import Notifications from './components/Notifications';
import Bills from './components/Bills';
import Analytics from './components/Analytics';
import Assistant from './components/Assistant';
import PiggyBanks from './components/PiggyBanks';

import { useBusiness } from '../../hooks/useBusiness';


const BusinessModule = () => {
    const { t } = useTranslation();
    const { isMobile, isTablet, width } = useWindowSize();
    const {
        notifications,
        fetchNotifications,
        markNotificationRead,
        clearNotifications
    } = useBusiness();

    const [activeTab, setActiveTab] = useState('dashboard');

    const unreadCount = notifications.filter(n => !n.read).length;
    
    // Detectar se a tela é menor que Full HD (1920px)
    const isSmallScreen = isTablet || width < 1920;

    const tabs = [
        { id: 'dashboard', label: t('business.tabs.dashboard'), icon: LayoutDashboard },
        { id: 'transactions', label: t('business.tabs.transactions'), icon: ArrowRightLeft },
        { id: 'recurring', label: t('business.tabs.recurring'), icon: CalendarClock },
        { id: 'budget', label: t('business.tabs.budget'), icon: Target },
        { id: 'goals', label: t('business.tabs.goals'), icon: Trophy },
        { id: 'piggy-banks', label: 'Caixinhas', icon: Wallet },
        { id: 'cards', label: t('business.tabs.cards'), icon: CreditCard },
        { id: 'bills', label: t('business.tabs.bills'), icon: Receipt },
        { id: 'analytics', label: t('business.tabs.analytics'), icon: BarChart3 },
        { id: 'notifications', label: t('business.tabs.notifications'), icon: Bell, badge: unreadCount },
        { id: 'assistant', label: t('business.tabs.assistant'), icon: MessageSquareMore },
    ];

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <BusinessDashboard />;
            case 'transactions': return <Transactions />;
            case 'recurring': return <Recurring />;
            case 'budget': return <Budget />;
            case 'goals': return <Goals />;
            case 'piggy-banks': return <PiggyBanks />;
            case 'cards': return <CreditCards />;
            case 'bills': return <Bills />;
            case 'analytics': return <Analytics />;
            case 'notifications':
                return (
                    <Notifications
                        notifications={notifications}
                        fetchNotifications={fetchNotifications}
                        markNotificationRead={markNotificationRead}
                        clearNotifications={clearNotifications}
                    />
                );
            case 'assistant': return <Assistant />;
            default: return <BusinessDashboard />;
        }
    };

    return (
        <div className="flex flex-col h-full bg-obsidian min-w-0">
            {/* Module Navigation Header - Sticky para não fazer overlay */}
            {/* z-30 para ficar abaixo do Header (z-50) mas acima do conteúdo */}
            <div className="sticky top-0 z-30 bg-obsidian-light/95 backdrop-blur-sm border-b border-white/5">
                {/* Container com scroll horizontal para resoluções menores */}
                <div className="relative w-full min-w-0">
                    <div 
                        className="business-nav-scroll flex items-center gap-1 p-1.5 md:p-2 overflow-x-auto overflow-y-hidden scroll-smooth"
                        style={{
                            WebkitOverflowScrolling: 'touch'
                        }}
                    >
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            const isActive = activeTab === tab.id;
                            // Em mobile, mostrar apenas ícone; em tablet/desktop, mostrar ícone + texto
                            // Em resoluções menores que Full HD, também reduzir o texto
                            const showLabel = !isMobile;
                            
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center gap-1.5 md:gap-2 px-2 md:px-3 lg:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition-all whitespace-nowrap shrink-0
                                        ${isActive
                                            ? 'bg-violet-500/10 text-violet-300 border border-violet-500/20'
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                        }`}
                                    title={isMobile || isSmallScreen ? tab.label : undefined} // Tooltip em mobile e telas menores
                                >
                                    <div className="relative shrink-0">
                                        <Icon size={isMobile ? 14 : 16} />
                                        {tab.badge > 0 && (
                                            <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-red-500 rounded-full border border-obsidian" />
                                        )}
                                    </div>
                                    {showLabel && (
                                        <span className={`${isSmallScreen && !isMobile ? 'hidden lg:inline' : 'hidden sm:inline'}`}>
                                            {tab.label}
                                        </span>
                                    )}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative p-2 md:p-4 min-h-0">
                {/* Remover AnimatePresence mode='wait' - causa delay desnecessário */}
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15 }} // Animação mais rápida
                    className="h-full w-full"
                >
                    {renderContent()}
                </motion.div>
            </div>
        </div>
    );
};

export default BusinessModule;
