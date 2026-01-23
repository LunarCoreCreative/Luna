import React, { useState, useEffect, Suspense } from 'react';
import { useNavigation } from '@/contexts/NavigationContext';
import Sidebar from './Sidebar';
import Header from './Header';
import ModuleLoading from '@/components/ui/ModuleLoading';
import { useWindowSize } from '@/hooks/useWindowSize';

// Import direto dos módulos principais - elimina loading screen
// Lazy loading só para módulos realmente pesados
import ChatModule from '@/modules/Chat';
import BusinessModule from '@/modules/Business';
import SettingsModule from '@/modules/Settings';
import { MemoryManager } from '@/modules/Memory/index.jsx';


// Mapeamento de módulos
const MODULE_MAP = {
    chat: ChatModule,
    business: BusinessModule,
    settings: SettingsModule,
    memory: MemoryManager,
};

import { ChatProvider } from '@/contexts/ChatContext';

const AppContainer = () => {
    const { currentModule } = useNavigation();
    const { isMobile, isTablet, isDesktop } = useWindowSize();
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [isSidebarOpen, setIsSidebarOpen] = useState(!isMobile); // Mobile: fechado por padrão

    const ActiveModule = MODULE_MAP[currentModule] || ChatModule;

    // Auto-colapsar sidebar em mobile/tablet
    useEffect(() => {
        if (isMobile || isTablet) {
            setIsSidebarCollapsed(true);
            setIsSidebarOpen(false);
        } else {
            setIsSidebarCollapsed(false);
            setIsSidebarOpen(true);
        }
    }, [isMobile, isTablet]);

    const toggleSidebar = () => {
        if (isMobile || isTablet) {
            setIsSidebarOpen(!isSidebarOpen);
        } else {
            setIsSidebarCollapsed(!isSidebarCollapsed);
        }
    };

    return (
        <ChatProvider>
            <div className="flex h-screen w-full bg-obsidian overflow-hidden font-sans">
                {/* Sidebar - Responsivo */}
                <Sidebar
                    isCollapsed={isSidebarCollapsed}
                    isOpen={isSidebarOpen}
                    isMobile={isMobile}
                    toggleSidebar={toggleSidebar}
                />

                {/* Overlay para mobile quando sidebar está aberta */}
                {(isMobile || isTablet) && isSidebarOpen && (
                    <div
                        className="fixed inset-0 bg-black/50 z-40 lg:hidden"
                        onClick={() => setIsSidebarOpen(false)}
                    />
                )}

                {/* Área Principal */}
                <div className="flex-1 flex flex-col h-full w-full min-w-0 overflow-hidden relative">
                    {/* Header - Responsivo */}
                    <Header 
                        onMenuClick={toggleSidebar}
                        showMenuButton={isMobile || isTablet}
                    />

                    {/* ModuleSlot - DINÂMICO */}
                    <main className="flex-1 min-h-0 min-w-0 overflow-hidden relative z-10">
                        {/* Sem Suspense - módulos já estão importados diretamente */}
                        <ActiveModule />
                    </main>
                </div>
            </div>
        </ChatProvider>
    );
};

export default AppContainer;
