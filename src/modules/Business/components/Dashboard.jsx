import React, { useEffect } from 'react';
import { useBusiness } from '@/hooks/useBusiness';
import { useTranslation } from 'react-i18next';
import {
    TrendingUp,
    TrendingDown,
    DollarSign,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    Bell,
    AlertTriangle,
    Receipt
} from 'lucide-react';
import { motion } from 'framer-motion';

const StatCard = ({ title, value, icon: Icon, type, delay }) => {
    const { t } = useTranslation();
    const isPositive = type === 'income';
    const isNegative = type === 'expense';

    // Formatação de moeda
    const formattedValue = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.3 }}
            className={`p-6 rounded-2xl border border-white/5 bg-gradient-to-br ${type === 'balance' ? 'from-violet-500/10 to-fuchsia-500/10 border-violet-500/20' :
                type === 'income' ? 'from-emerald-500/10 to-teal-500/10 border-emerald-500/20' :
                    'from-rose-500/10 to-orange-500/10 border-rose-500/20'
                }`}
        >
            <div className="flex items-center justify-between mb-4">
                <div className={`p-3 rounded-xl ${type === 'balance' ? 'bg-violet-500/20 text-violet-300' :
                    type === 'income' ? 'bg-emerald-500/20 text-emerald-300' :
                        'bg-rose-500/20 text-rose-300'
                    }`}>
                    <Icon size={24} />
                </div>
                {type !== 'balance' && (
                    <div className={`flex items-center text-xs font-bold px-2 py-1 rounded-full ${isPositive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                        {isPositive ? <ArrowUpRight size={12} className="mr-1" /> : <ArrowDownRight size={12} className="mr-1" />}
                        {isPositive ? t('business.dashboard.entry') : t('business.dashboard.exit')}
                    </div>
                )}
            </div>

            <p className="text-slate-400 text-sm font-medium mb-1">{title}</p>
            <h3 className="text-2xl font-bold text-white tracking-tight">{formattedValue}</h3>
        </motion.div>
    );
};

const BusinessDashboard = () => {
    const { t } = useTranslation();
    const {
        summary, fetchSummary,
        notifications, fetchNotifications,
        billsSummary, fetchBillsSummary,
        currentPeriod, setCurrentPeriod,
        availablePeriods, fetchPeriods
    } = useBusiness();
    const unreadAlerts = notifications.filter(n => !n.read);

    useEffect(() => {
        fetchPeriods();
        fetchSummary();
        fetchNotifications();
        fetchBillsSummary();
    }, [fetchSummary, fetchNotifications, fetchBillsSummary, fetchPeriods]);

    const handlePeriodChange = (period) => {
        setCurrentPeriod(period);
        fetchSummary(period);
    };

    const formatPeriodLabel = (period) => {
        if (!period) return '';
        const [year, month] = period.split('-');
        const monthNames = [
            t('business.dashboard.months.jan'),
            t('business.dashboard.months.feb'),
            t('business.dashboard.months.mar'),
            t('business.dashboard.months.apr'),
            t('business.dashboard.months.may'),
            t('business.dashboard.months.jun'),
            t('business.dashboard.months.jul'),
            t('business.dashboard.months.aug'),
            t('business.dashboard.months.sep'),
            t('business.dashboard.months.oct'),
            t('business.dashboard.months.nov'),
            t('business.dashboard.months.dec')
        ];
        return `${monthNames[parseInt(month) - 1]} ${year}`;
    };

    return (
        <div className="h-full overflow-y-auto p-4 space-y-6">
            {/* Period Selector */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-white">{t('business.dashboard.title')}</h2>
                <div className="flex items-center gap-2">
                    <span className="text-sm text-slate-500">{t('business.dashboard.period')}</span>
                    <select
                        value={currentPeriod}
                        onChange={(e) => handlePeriodChange(e.target.value)}
                        className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50 focus:bg-white/15"
                        style={{ color: '#ffffff' }}
                    >
                        {availablePeriods.length > 0 ? (
                            availablePeriods.map(p => (
                                <option key={p} value={p} className="bg-obsidian text-white">{formatPeriodLabel(p)}</option>
                            ))
                        ) : (
                            <option value={currentPeriod} className="bg-obsidian text-white">{formatPeriodLabel(currentPeriod)}</option>
                        )}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <StatCard
                    title={t('business.dashboard.balance')}
                    value={summary.balance}
                    icon={Wallet}
                    type="balance"
                    delay={0}
                />
                <StatCard
                    title={`${t('business.dashboard.income')} (${formatPeriodLabel(currentPeriod)})`}
                    value={summary.income}
                    icon={TrendingUp}
                    type="income"
                    delay={0.1}
                />
                <StatCard
                    title={`${t('business.dashboard.expenses')} (${formatPeriodLabel(currentPeriod)})`}
                    value={summary.expenses}
                    icon={TrendingDown}
                    type="expense"
                    delay={0.2}
                />
            </div>

            {/* Alertas e Gráfico */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-obsidian-light border border-white/5 rounded-2xl p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Bell size={20} className="text-violet-400" />
                            {t('business.dashboard.recent_alerts')}
                        </h3>
                        {unreadAlerts.length > 0 && (
                            <span className="text-xs text-violet-400 bg-violet-400/10 px-2 py-1 rounded-full font-bold">
                                {t('business.dashboard.new_alerts', { count: unreadAlerts.length })}
                            </span>
                        )}
                    </div>

                    {unreadAlerts.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-8 text-slate-500">
                            <Bell size={32} className="opacity-20 mb-2" />
                            <p className="text-sm italic">{t('business.dashboard.all_under_control')}</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {unreadAlerts.slice(0, 3).map((notif) => (
                                <div
                                    key={notif.id}
                                    className={`p-3 rounded-xl border ${notif.priority === 'critical' ? 'bg-red-500/5 border-red-500/20' :
                                        'bg-amber-500/5 border-amber-500/20'
                                        } flex gap-3`}
                                >
                                    <div className="mt-1">
                                        <AlertTriangle size={16} className={notif.priority === 'critical' ? 'text-red-400' : 'text-amber-400'} />
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-medium text-slate-200">{notif.title}</h4>
                                        <p className="text-xs text-slate-500 mt-1 line-clamp-1">{notif.message}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-obsidian-light border border-white/5 rounded-2xl p-6"
                >
                    <div className="flex items-center justify-between mb-6">
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Receipt size={20} className="text-emerald-400" />
                            {t('business.dashboard.bills_to_pay')}
                        </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-4 h-full">
                        <div className="flex flex-col">
                            <span className="text-xs text-slate-500">{t('business.dashboard.pending')}</span>
                            <span className="text-xl font-bold text-white mt-1">{billsSummary.pending_count}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-xs text-slate-500">{t('business.dashboard.total_value')}</span>
                            <span className="text-xl font-bold text-emerald-400 mt-1">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(billsSummary.total_pending_value)}
                            </span>
                        </div>
                        {billsSummary.overdue_count > 0 && (
                            <div className="col-span-2 mt-4 p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-3">
                                <AlertTriangle size={18} className="text-rose-400" />
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-rose-400 uppercase">{t('business.dashboard.attention')}</span>
                                    <span className="text-xs text-rose-300">{t('business.dashboard.overdue_bills', { count: billsSummary.overdue_count })}</span>
                                </div>
                            </div>
                        )}
                        {billsSummary.pending_count === 0 && (
                            <div className="col-span-2 flex flex-col items-center justify-center py-4 text-slate-500">
                                <Receipt size={24} className="opacity-20 mb-2" />
                                <p className="text-xs italic">{t('business.dashboard.no_pending_bills')}</p>
                            </div>
                        )}
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default BusinessDashboard;
