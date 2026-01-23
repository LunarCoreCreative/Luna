import React, { useEffect } from 'react';
import { useBusiness } from '@/hooks/useBusiness';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    PieChart, Pie, Cell, Legend
} from 'recharts';
import {
    TrendingUp, TrendingDown, DollarSign, PiggyBank, Calendar,
    ArrowUpRight, ArrowDownRight, Activity, Target, Wallet
} from 'lucide-react';
import { motion } from 'framer-motion';

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#6366f1', '#84cc16'];

const MetricCard = ({ title, value, icon: Icon, color, delay = 0 }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay }}
        className={`p-4 rounded-2xl border border-white/5 bg-gradient-to-br ${color}`}
    >
        <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-white/10">
                <Icon size={16} className="text-white/80" />
            </div>
            <span className="text-xs text-slate-400 font-medium">{title}</span>
        </div>
        <div className="text-xl font-bold text-white">{value}</div>
    </motion.div>
);

const Analytics = () => {
    const { analytics, fetchAnalytics, summary } = useBusiness();

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    const { cashflow, categories, projections, metrics } = analytics;

    const formatCurrency = (value) => new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(value);

    return (
        <div className="h-full overflow-y-auto p-4 space-y-6">
            {/* Key Metrics Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <MetricCard
                    title="Média Diária"
                    value={formatCurrency(metrics.avg_daily_spending)}
                    icon={Activity}
                    color="from-violet-500/10 to-fuchsia-500/10 border-violet-500/20"
                    delay={0}
                />
                <MetricCard
                    title="Taxa de Poupança"
                    value={`${metrics.savings_rate}%`}
                    icon={PiggyBank}
                    color={metrics.savings_rate >= 0 ? "from-emerald-500/10 to-teal-500/10 border-emerald-500/20" : "from-rose-500/10 to-orange-500/10 border-rose-500/20"}
                    delay={0.1}
                />
                <MetricCard
                    title="Maior Gasto"
                    value={metrics.top_category}
                    icon={Target}
                    color="from-amber-500/10 to-orange-500/10 border-amber-500/20"
                    delay={0.2}
                />
                <MetricCard
                    title="Transações"
                    value={metrics.transaction_count}
                    icon={Calendar}
                    color="from-cyan-500/10 to-blue-500/10 border-cyan-500/20"
                    delay={0.3}
                />
            </div>

            {/* Cash Flow Chart */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="bg-obsidian-light border border-white/5 rounded-3xl p-6"
            >
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <TrendingUp size={20} className="text-violet-400" />
                    Fluxo de Caixa (Últimos 6 Meses)
                </h3>
                <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={cashflow} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                                </linearGradient>
                                <linearGradient id="expenseGrad" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                            <XAxis dataKey="month" stroke="#666" fontSize={12} />
                            <YAxis stroke="#666" fontSize={12} tickFormatter={(v) => `R$${v / 1000}k`} />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333', borderRadius: '12px' }}
                                labelStyle={{ color: '#fff' }}
                                formatter={(value) => [formatCurrency(value), '']}
                            />
                            <Area type="monotone" dataKey="income" stroke="#10b981" fillOpacity={1} fill="url(#incomeGrad)" name="Receitas" />
                            <Area type="monotone" dataKey="expense" stroke="#ef4444" fillOpacity={1} fill="url(#expenseGrad)" name="Despesas" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* Bottom Row: Categories + Projections */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Category Breakdown */}
                <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="bg-obsidian-light border border-white/5 rounded-3xl p-6"
                >
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <DollarSign size={20} className="text-emerald-400" />
                        Gastos por Categoria
                    </h3>
                    {categories.length === 0 ? (
                        <div className="h-48 flex items-center justify-center text-slate-500">
                            <p>Sem dados de gastos este mês</p>
                        </div>
                    ) : (
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={categories.slice(0, 6)}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={40}
                                        outerRadius={70}
                                        paddingAngle={3}
                                        dataKey="value"
                                        nameKey="category"
                                    >
                                        {categories.slice(0, 6).map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid #333', borderRadius: '12px' }}
                                        formatter={(value) => [formatCurrency(value), '']}
                                    />
                                    <Legend
                                        layout="vertical"
                                        align="right"
                                        verticalAlign="middle"
                                        wrapperStyle={{ fontSize: '12px' }}
                                        formatter={(value) => <span className="text-slate-300 capitalize">{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </motion.div>

                {/* Projections */}
                <motion.div
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="bg-obsidian-light border border-white/5 rounded-3xl p-6"
                >
                    <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Wallet size={20} className="text-cyan-400" />
                        Projeção para o Próximo Mês
                    </h3>
                    <div className="space-y-4">
                        <div className="flex justify-between items-center p-3 bg-white/5 rounded-xl">
                            <span className="text-slate-400">Saldo Atual</span>
                            <span className="text-white font-bold">{formatCurrency(projections.current_balance)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                            <div className="flex items-center gap-2">
                                <ArrowUpRight size={16} className="text-emerald-400" />
                                <span className="text-emerald-300">Receitas Recorrentes</span>
                            </div>
                            <span className="text-emerald-400 font-bold">+{formatCurrency(projections.projected_income)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-rose-500/10 rounded-xl border border-rose-500/20">
                            <div className="flex items-center gap-2">
                                <ArrowDownRight size={16} className="text-rose-400" />
                                <span className="text-rose-300">Despesas Recorrentes</span>
                            </div>
                            <span className="text-rose-400 font-bold">-{formatCurrency(projections.projected_expense)}</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-amber-500/10 rounded-xl border border-amber-500/20">
                            <div className="flex items-center gap-2">
                                <TrendingDown size={16} className="text-amber-400" />
                                <span className="text-amber-300">Contas a Pagar</span>
                            </div>
                            <span className="text-amber-400 font-bold">-{formatCurrency(projections.pending_bills)}</span>
                        </div>
                        <div className={`flex justify-between items-center p-4 rounded-xl border-2 ${projections.trend === 'up'
                            ? 'bg-emerald-500/20 border-emerald-500/40'
                            : 'bg-rose-500/20 border-rose-500/40'
                            }`}>
                            <span className="text-white font-medium">Saldo Projetado</span>
                            <span className={`text-2xl font-bold ${projections.trend === 'up' ? 'text-emerald-400' : 'text-rose-400'
                                }`}>
                                {formatCurrency(projections.projected_balance)}
                            </span>
                        </div>
                    </div>
                </motion.div>
            </div>
        </div>
    );
};

export default Analytics;
