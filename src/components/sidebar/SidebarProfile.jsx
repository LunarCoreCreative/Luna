import { useState } from 'react';
import { User, Settings, LogOut, CreditCard, Shield, Crown, ChevronUp } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

export const SidebarProfile = ({ chat, setSettingsTab }) => {
    const { user, logout, isCreator, profile } = useAuth();
    const [isOpen, setIsOpen] = useState(false);

    const handleNavigate = (tab) => {
        setSettingsTab(tab);
        chat.setView("SETTINGS");
        setIsOpen(false);
    };

    const userInitial = user?.email?.charAt(0).toUpperCase() || 'U';
    const userName = profile?.name || user?.email?.split('@')[0] || 'Usuário';

    return (
        <div className="relative mt-auto pt-4 border-t border-white/10">
            {/* Popover Menu */}
            {isOpen && (
                <div className="absolute bottom-full left-0 w-full mb-2 bg-[var(--bg-secondary)] border border-white/10 rounded-xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200 z-50">
                    <div className="p-2 space-y-1">
                        <button
                            onClick={() => handleNavigate('general')}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors group"
                        >
                            <Settings size={16} className="text-gray-500 group-hover:text-blue-400" />
                            Configurações
                        </button>

                        <button
                            onClick={() => handleNavigate('premium')}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors group"
                        >
                            <CreditCard size={16} className="text-gray-500 group-hover:text-amber-400" />
                            Premium
                        </button>

                        <div className="h-px bg-white/10 my-1" />

                        <button
                            onClick={logout}
                            className="w-full flex items-center gap-3 px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors"
                        >
                            <LogOut size={16} />
                            Sair
                        </button>
                    </div>
                </div>
            )}

            {/* Profile Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center gap-3 p-2 rounded-xl transition-all hover:bg-white/5 group ${isOpen ? 'bg-white/5' : ''}`}
            >
                <div className="relative shrink-0">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold shadow-lg ${isCreator ? 'bg-gradient-to-br from-amber-400 to-orange-600' : 'bg-gradient-to-br from-violet-500 to-purple-600'}`}>
                        {userInitial}
                    </div>
                    {isCreator && (
                        <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 border-2 border-[var(--bg-primary)]">
                            <Crown size={8} className="text-white" />
                        </div>
                    )}
                </div>

                <div className="flex-1 min-w-0 text-left">
                    <div className="text-sm font-medium text-white truncate flex items-center gap-1">
                        {userName}
                        {isCreator && <Shield size={10} className="text-amber-400" />}
                    </div>
                    <div className="text-[10px] text-gray-500 truncate">{user?.email}</div>
                </div>

                <ChevronUp
                    size={16}
                    className={`text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>
        </div>
    );
};
