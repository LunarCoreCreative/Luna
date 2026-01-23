import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Bell,
    AlertCircle,
    AlertTriangle,
    Info,
    CheckCircle2,
    Trash2,
    ExternalLink,
    PieChart,
    CreditCard,
    Wallet,
    Repeat,
    X
} from 'lucide-react';

const Notifications = ({ notifications, fetchNotifications, markNotificationRead, clearNotifications }) => {
    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    const getIcon = (type, priority) => {
        const props = { size: 20 };

        switch (type) {
            case 'budget_limit': return <PieChart {...props} className="text-amber-500" />;
            case 'overdue_bill': return <AlertCircle {...props} className="text-red-500" />;
            case 'card_due': return <CreditCard {...props} className="text-amber-400" />;
            case 'low_balance': return <Wallet {...props} className="text-red-400" />;
            case 'recurring_pending': return <Repeat {...props} className="text-blue-400" />;
            default: return <Info {...props} className="text-blue-400" />;
        }
    };

    const getPriorityColor = (priority) => {
        switch (priority) {
            case 'critical': return 'border-red-500/50 bg-red-500/10';
            case 'warning': return 'border-amber-500/50 bg-amber-500/10';
            case 'info': return 'border-blue-500/50 bg-blue-500/10';
            default: return 'border-slate-700 bg-slate-800/50';
        }
    };

    if (notifications.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                <div className="p-4 bg-slate-800/50 rounded-full mb-4">
                    <Bell size={48} className="opacity-20" />
                </div>
                <p className="text-lg font-medium">Nenhuma notificação por enquanto</p>
                <p className="text-sm opacity-60">Tudo em ordem com suas finanças!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between mb-2">
                <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Bell size={20} className="text-violet-400" />
                    Alertas Inteligentes
                    <span className="ml-2 px-2 py-0.5 bg-violet-500/20 text-violet-300 text-xs rounded-full">
                        {notifications.length}
                    </span>
                </h3>
                <button
                    onClick={clearNotifications}
                    className="text-xs text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors"
                >
                    <Trash2 size={14} />
                    Limpar Tudo
                </button>
            </div>

            <div className="grid gap-3">
                <AnimatePresence mode="popLayout">
                    {notifications.map((notif) => (
                        <motion.div
                            key={notif.id}
                            layout
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className={`p-4 rounded-xl border ${getPriorityColor(notif.priority)} backdrop-blur-md relative overflow-hidden group transition-all hover:bg-opacity-20`}
                        >
                            <div className="flex gap-4">
                                <div className="mt-1">
                                    {getIcon(notif.type, notif.priority)}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-start justify-between gap-2">
                                        <h4 className="font-semibold text-white text-sm sm:text-base truncate">
                                            {notif.title}
                                        </h4>
                                        <span className="text-[10px] text-slate-500 whitespace-nowrap mt-1">
                                            {new Date(notif.date).toLocaleDateString('pt-BR')}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-300 mt-1 leading-relaxed">
                                        {notif.message}
                                    </p>

                                    <div className="flex items-center gap-3 mt-3">
                                        {!notif.read && (
                                            <button
                                                onClick={() => markNotificationRead(notif.id)}
                                                className="text-xs font-medium text-violet-400 hover:text-violet-300 flex items-center gap-1 transition-colors"
                                            >
                                                <CheckCircle2 size={14} />
                                                Marcar como lida
                                            </button>
                                        )}
                                        {notif.link && (
                                            <a
                                                href={notif.link}
                                                className="text-xs font-medium text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
                                            >
                                                <ExternalLink size={14} />
                                                Ver detalhes
                                            </a>
                                        )}
                                    </div>
                                </div>

                                <button
                                    onClick={() => markNotificationRead(notif.id)}
                                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-white transition-opacity"
                                >
                                    <X size={14} />
                                </button>
                            </div>

                            {/* Visual Indicator of Priority */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${notif.priority === 'critical' ? 'bg-red-500' :
                                    notif.priority === 'warning' ? 'bg-amber-500' : 'bg-blue-500'
                                }`} />
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
};

export default Notifications;
