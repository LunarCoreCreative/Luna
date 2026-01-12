import { useState, useEffect } from "react";
import { Bell, X, Check, CheckCheck, Loader2, Users, AlertCircle } from "lucide-react";
import { API_CONFIG } from "../../config/api";

export function NotificationPanel({ userId, onClose }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [unreadCount, setUnreadCount] = useState(0);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}/health/profile/notifications?user_id=${userId}`);
            const data = await response.json();
            
            if (data.success) {
                setNotifications(data.notifications || []);
                setUnreadCount(data.unread_count || 0);
            }
        } catch (error) {
            console.error("Erro ao carregar notificações:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (userId) {
            loadNotifications();
        }
    }, [userId]);

    const markAsRead = async (notificationId) => {
        try {
            const response = await fetch(
                `${API_CONFIG.BASE_URL}/health/profile/notifications/${notificationId}/read`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user_id: userId })
                }
            );
            const data = await response.json();
            
            if (data.success) {
                setNotifications(prev => 
                    prev.map(n => n.id === notificationId ? { ...n, read: true } : n)
                );
                setUnreadCount(prev => Math.max(0, prev - 1));
            }
        } catch (error) {
            console.error("Erro ao marcar notificação como lida:", error);
        }
    };

    const markAllAsRead = async () => {
        try {
            const response = await fetch(
                `${API_CONFIG.BASE_URL}/health/profile/notifications/read-all`,
                {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ user_id: userId })
                }
            );
            const data = await response.json();
            
            if (data.success) {
                setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                setUnreadCount(0);
            }
        } catch (error) {
            console.error("Erro ao marcar todas como lidas:", error);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return "Agora";
        if (diffMins < 60) return `${diffMins} min atrás`;
        if (diffHours < 24) return `${diffHours}h atrás`;
        if (diffDays < 7) return `${diffDays} dia(s) atrás`;
        return date.toLocaleDateString('pt-BR');
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case "student_linked":
                return <Users className="w-4 h-4 text-blue-400" />;
            default:
                return <Bell className="w-4 h-4 text-purple-400" />;
        }
    };

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
                        <Bell className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <h2 className="text-lg font-semibold text-[var(--text-primary)]">Notificações</h2>
                        {unreadCount > 0 && (
                            <span className="text-xs font-medium text-purple-400">
                                {unreadCount} não lida(s)
                            </span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    {unreadCount > 0 && (
                        <button
                            onClick={markAllAsRead}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/30 text-purple-300 transition-colors flex items-center gap-1.5"
                            title="Marcar todas como lidas"
                        >
                            <CheckCheck className="w-3.5 h-3.5" />
                            Marcar todas
                        </button>
                    )}
                    {onClose && (
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                        >
                            <X className="w-4 h-4 text-[var(--text-muted)]" />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {loading ? (
                    <div className="flex items-center justify-center h-full">
                        <Loader2 className="w-6 h-6 animate-spin text-[var(--text-secondary)]" />
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex items-center justify-center mb-4">
                            <Bell className="w-8 h-8 text-[var(--text-muted)]" />
                        </div>
                        <div className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                            Nenhuma notificação
                        </div>
                        <div className="text-sm text-[var(--text-secondary)]">
                            Você será notificado quando houver novas atividades
                        </div>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {notifications.map((notification) => (
                            <div
                                key={notification.id}
                                className={`p-4 rounded-xl border transition-all ${
                                    notification.read
                                        ? 'border-[var(--border-color)] bg-[var(--bg-secondary)]'
                                        : 'border-purple-500/30 bg-purple-500/10'
                                }`}
                            >
                                <div className="flex items-start gap-3">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                        notification.read
                                            ? 'bg-[var(--bg-tertiary)]'
                                            : 'bg-purple-500/20'
                                    }`}>
                                        {getNotificationIcon(notification.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-start justify-between gap-2 mb-1">
                                            <h3 className={`text-sm font-semibold ${
                                                notification.read
                                                    ? 'text-[var(--text-primary)]'
                                                    : 'text-purple-300'
                                            }`}>
                                                {notification.title}
                                            </h3>
                                            {!notification.read && (
                                                <button
                                                    onClick={() => markAsRead(notification.id)}
                                                    className="p-1 rounded hover:bg-white/10 transition-colors flex-shrink-0"
                                                    title="Marcar como lida"
                                                >
                                                    <Check className="w-3.5 h-3.5 text-purple-400" />
                                                </button>
                                            )}
                                        </div>
                                        <p className="text-sm text-[var(--text-secondary)] mb-2">
                                            {notification.message}
                                        </p>
                                        <div className="text-xs text-[var(--text-muted)]">
                                            {formatDate(notification.created_at)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
