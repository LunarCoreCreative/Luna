import { useMemo } from "react";
import {
    PieChart, Pie, Cell, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, Tooltip, Legend,
    LineChart, Line, CartesianGrid, Area, AreaChart
} from "recharts";
import { TrendingUp, TrendingDown, DollarSign, Calendar, Tag, ArrowUpRight, ArrowDownRight } from "lucide-react";

// ============================================================================
// ANALYTICS TAB - Gráficos e Métricas
// ============================================================================

const CHART_COLORS = [
    "#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#a855f7",
    "#ec4899", "#14b8a6", "#8b5cf6", "#f97316", "#06b6d4"
];

export const AnalyticsTab = ({ transactions, tags, summary }) => {

    // Dados por categoria (para pizza)
    const categoryData = useMemo(() => {
        const byCategory = {};
        transactions.forEach(tx => {
            const cat = tx.category || "outro";
            if (!byCategory[cat]) byCategory[cat] = { income: 0, expense: 0 };
            if (tx.type === "income") byCategory[cat].income += tx.value;
            else byCategory[cat].expense += tx.value;
        });

        return Object.entries(byCategory).map(([id, data]) => {
            const tag = tags.find(t => t.id === id) || { label: id, color: "#6b7280" };
            return {
                name: tag.label,
                value: data.income + data.expense,
                income: data.income,
                expense: data.expense,
                color: tag.color
            };
        }).sort((a, b) => b.value - a.value);
    }, [transactions, tags]);

    // Dados mensais (para barras)
    const monthlyData = useMemo(() => {
        const byMonth = {};
        const now = new Date();

        // Inicializar últimos 6 meses
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const monthName = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
            byMonth[key] = { month: monthName.charAt(0).toUpperCase() + monthName.slice(1), income: 0, expense: 0 };
        }

        transactions.forEach(tx => {
            if (!tx.date) return;
            const d = new Date(tx.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (byMonth[key]) {
                if (tx.type === "income") byMonth[key].income += tx.value;
                else byMonth[key].expense += tx.value;
            }
        });

        return Object.values(byMonth);
    }, [transactions]);

    // Evolução do saldo (linha)
    const balanceEvolution = useMemo(() => {
        if (transactions.length === 0) return [];

        const sorted = [...transactions].sort((a, b) =>
            new Date(a.date) - new Date(b.date)
        );

        let balance = 0;
        const data = sorted.map(tx => {
            balance += tx.type === "income" ? tx.value : -tx.value;
            return {
                date: new Date(tx.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
                balance
            };
        });

        // Limitar a últimos 20 pontos
        return data.slice(-20);
    }, [transactions]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div
                    className="rounded-lg px-3 py-2 text-sm"
                    style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)'
                    }}
                >
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{label}</p>
                    {payload.map((p, i) => (
                        <p key={i} style={{ color: p.color }}>
                            {p.name}: {formatCurrency(p.value)}
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="p-6 space-y-6 overflow-auto h-full">
            {/* Quick Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div
                    className="rounded-xl p-4"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Saldo Total</span>
                        <DollarSign size={16} style={{ color: 'var(--accent-primary)' }} />
                    </div>
                    <p className="text-2xl font-bold" style={{ color: 'var(--accent-primary)' }}>
                        {formatCurrency(summary.balance)}
                    </p>
                </div>

                <div
                    className="rounded-xl p-4"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Entradas</span>
                        <ArrowUpRight size={16} className="text-green-400" />
                    </div>
                    <p className="text-2xl font-bold text-green-400">
                        {formatCurrency(summary.income)}
                    </p>
                </div>

                <div
                    className="rounded-xl p-4"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total Saídas</span>
                        <ArrowDownRight size={16} className="text-red-400" />
                    </div>
                    <p className="text-2xl font-bold text-red-400">
                        {formatCurrency(summary.expenses)}
                    </p>
                </div>

                <div
                    className="rounded-xl p-4"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Nº Transações</span>
                        <Calendar size={16} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                    <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {transactions.length}
                    </p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Pie Chart - Por Categoria */}
                <div
                    className="rounded-xl p-4"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                    <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
                        Distribuição por Categoria
                    </h3>
                    {categoryData.length > 0 ? (
                        <div className="flex items-center">
                            <ResponsiveContainer width="60%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={categoryData}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={80}
                                        innerRadius={50}
                                    >
                                        {categoryData.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex-1 space-y-2">
                                {categoryData.slice(0, 5).map((cat, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ background: cat.color }}
                                        />
                                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                            {cat.name}
                                        </span>
                                        <span className="text-xs font-medium ml-auto" style={{ color: 'var(--text-primary)' }}>
                                            {formatCurrency(cat.value)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="h-[200px] flex items-center justify-center">
                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                Sem dados para exibir
                            </p>
                        </div>
                    )}
                </div>

                {/* Bar Chart - Mensal */}
                <div
                    className="rounded-xl p-4"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                    <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
                        Movimentação Mensal
                    </h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={monthlyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis
                                dataKey="month"
                                tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                                axisLine={{ stroke: 'var(--border-color)' }}
                            />
                            <YAxis
                                tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                                axisLine={{ stroke: 'var(--border-color)' }}
                                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend />
                            <Bar dataKey="income" name="Entradas" fill="#22c55e" radius={[4, 4, 0, 0]} />
                            <Bar dataKey="expense" name="Saídas" fill="#ef4444" radius={[4, 4, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Line Chart - Evolução do Saldo */}
            <div
                className="rounded-xl p-4"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            >
                <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
                    Evolução do Saldo
                </h3>
                {balanceEvolution.length > 0 ? (
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={balanceEvolution}>
                            <defs>
                                <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
                            <XAxis
                                dataKey="date"
                                tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                                axisLine={{ stroke: 'var(--border-color)' }}
                            />
                            <YAxis
                                tick={{ fill: 'var(--text-secondary)', fontSize: 12 }}
                                axisLine={{ stroke: 'var(--border-color)' }}
                                tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Area
                                type="monotone"
                                dataKey="balance"
                                name="Saldo"
                                stroke="#8b5cf6"
                                fillOpacity={1}
                                fill="url(#colorBalance)"
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="h-[200px] flex items-center justify-center">
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Adicione transações para ver a evolução
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AnalyticsTab;
