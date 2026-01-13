import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Bell, X, AlertCircle, CheckCircle2, Info, Loader2 } from "lucide-react";
import { API_CONFIG } from "../../config/api";

export default function NotificationsPanel({ userId = "local" }) {
    const [notifications, setNotifications] = useState([]);
    const [count, setCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    const loadNotifications = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/business/notifications?user_id=${userId}`);
            if (response.ok) {
                const data = await response.json();
                setNotifications(data.notifications || []);
                setCount(data.count || 0);
            }
        } catch (error) {
            console.error("[NOTIFICATIONS] Erro ao carregar notificações:", error);
        } finally {
            setIsLoading(false);
        }
    };

    const loadCount = async () => {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/business/notifications/count?user_id=${userId}`);
            if (response.ok) {
                const data = await response.json();
                setCount(data.total || 0);
            }
        } catch (error) {
            console.error("[NOTIFICATIONS] Erro ao carregar contagem:", error);
        }
    };

    useEffect(() => {
        loadCount();
        // Carrega notificações completas quando painel abre
        if (isOpen) {
            loadNotifications();
        }
    }, [isOpen, userId]);

    // Atualiza contagem a cada 30 segundos
    useEffect(() => {
        const interval = setInterval(() => {
            loadCount();
        }, 30000);
        return () => clearInterval(interval);
    }, [userId]);

    const getPriorityIcon = (priority) => {
        switch (priority) {
            case "critical":
                return <AlertCircle size={16} className="text-red-400" />;
            case "warning":
                return <AlertCircle size={16} className="text-yellow-400" />;
            default:
                return <Info size={16} className="text-blue-400" />;
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case "critical":
                return "bg-red-500/10 border-red-500/30 text-red-400";
            case "warning":
                return "bg-yellow-500/10 border-yellow-500/30 text-yellow-400";
            default:
                return "bg-blue-500/10 border-blue-500/30 text-blue-400";
        }
    };

    const formatDate = (timestamp) => {
        if (!timestamp) return "";
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diff = now - date;
            const minutes = Math.floor(diff / 60000);
            const hours = Math.floor(diff / 3600000);
            const days = Math.floor(diff / 86400000);

            if (minutes < 1) return "Agora";
            if (minutes < 60) return `${minutes}min atrás`;
            if (hours < 24) return `${hours}h atrás`;
            if (days < 7) return `${days}d atrás`;
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
        } catch {
            return "";
        }
    };

    return (
        <div className="relative" style={{ zIndex: 10000 }}>
            {/* Notification Bell Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2.5 rounded-xl transition-all duration-200 hover:bg-white/10 hover:scale-105 active:scale-95"
                style={{
                    background: isOpen ? 'rgba(139, 92, 246, 0.1)' : 'var(--bg-tertiary)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)'
                }}
                title="Notificações"
            >
                <Bell size={18} />
                {count > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1.5 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                        {count > 99 ? '99+' : count}
                    </span>
                )}
            </button>

            {/* Notifications Panel - Using Portal to render above everything */}
            {isOpen && createPortal(
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0"
                        style={{ zIndex: 9998 }}
                        onClick={() => setIsOpen(false)}
                    />
                    {/* Panel */}
                    <div 
                        className="fixed right-4 top-20 w-96 max-h-[600px] rounded-xl border-2 shadow-2xl overflow-hidden"
                        style={{
                            background: 'var(--bg-primary)',
                            borderColor: 'var(--border-color)',
                            zIndex: 9999
                        }}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b" style={{ borderColor: 'var(--border-color)' }}>
                            <div className="flex items-center gap-2">
                                <Bell size={18} className="text-purple-400" />
                                <h3 className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                    Notificações
                                </h3>
                                {count > 0 && (
                                    <span className="px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold">
                                        {count}
                                    </span>
                                )}
                            </div>
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                <X size={16} />
                            </button>
                        </div>

                    {/* Content */}
                    <div className="overflow-y-auto max-h-[500px] custom-scrollbar">
                        {isLoading ? (
                            <div className="flex items-center justify-center p-8">
                                <Loader2 size={24} className="animate-spin text-purple-400" />
                            </div>
                        ) : notifications.length === 0 ? (
                            <div className="flex flex-col items-center justify-center p-8 text-center">
                                <CheckCircle2 size={48} className="text-green-400 mb-3 opacity-50" />
                                <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                    Nenhuma notificação
                                </p>
                                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                                    Você está em dia!
                                </p>
                            </div>
                        ) : (
                            <div className="p-2">
                                {notifications.map((notification, index) => (
                                    <div
                                        key={notification.id || index}
                                        className={`mb-2 p-3 rounded-lg border transition-all duration-200 hover:scale-[1.02] ${getPriorityColor(notification.priority)}`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className="mt-0.5">
                                                {getPriorityIcon(notification.priority)}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-start justify-between gap-2 mb-1">
                                                    <h4 className="font-semibold text-sm">
                                                        {notification.title}
                                                    </h4>
                                                    {notification.timestamp && (
                                                        <span className="text-xs opacity-70 whitespace-nowrap">
                                                            {formatDate(notification.timestamp)}
                                                        </span>
                                                    )}
                                                </div>
                                                <p className="text-xs opacity-90 leading-relaxed">
                                                    {notification.message}
                                                </p>
                                                {notification.data && (
                                                    <div className="mt-2 pt-2 border-t border-current/20">
                                                        {notification.data.days_overdue !== undefined && (
                                                            <span className="text-xs font-medium">
                                                                {notification.data.days_overdue} dia(s) em atraso
                                                            </span>
                                                        )}
                                                        {notification.data.days_until !== undefined && (
                                                            <span className="text-xs font-medium">
                                                                Vence em {notification.data.days_until} dia(s)
                                                            </span>
                                                        )}
                                                        {notification.data.current_balance !== undefined && (
                                                            <span className="text-xs font-medium">
                                                                Saldo: R$ {notification.data.current_balance.toFixed(2)}
                                                            </span>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Footer */}
                    {notifications.length > 0 && (
                        <div className="p-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                            <button
                                onClick={loadNotifications}
                                className="w-full py-2 px-4 rounded-lg text-sm font-medium transition-all duration-200 hover:bg-white/5"
                                style={{
                                    background: 'var(--bg-secondary)',
                                    color: 'var(--text-primary)',
                                    border: '1px solid var(--border-color)'
                                }}
                            >
                                Atualizar
                            </button>
                        </div>
                    )}
                    </div>
                </>,
                document.body
            )}
        </div>
    );
}
