import { useMemo, useState, useEffect } from "react";
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
    ResponsiveContainer, PieChart, Pie, Cell
} from "recharts";
import {
    TrendingUp, PiggyBank, Target, Calculator,
    Plus, Percent, DollarSign, Calendar, Sparkles
} from "lucide-react";
import { API_CONFIG } from "../../config/api";

// ============================================================================
// INVESTMENTS TAB - Investimentos e Poupança
// ============================================================================

const INVESTMENT_COLORS = ["#22c55e", "#3b82f6", "#f59e0b", "#8b5cf6", "#ec4899", "#14b8a6"];

export const InvestmentsTab = ({ transactions, summary, userId = "local" }) => {
    const [showSimulator, setShowSimulator] = useState(false);
    const [goals, setGoals] = useState([]);

    // Simulator state
    const [simConfig, setSimConfig] = useState({
        initialValue: 1000,
        monthlyDeposit: 500,
        annualRate: 12, // 12% ao ano
        months: 12
    });

    // Filter investment transactions
    const investments = useMemo(() => {
        return transactions.filter(tx => tx.type === "investment");
    }, [transactions]);

    // Total invested
    const totalInvested = useMemo(() => {
        return investments.reduce((sum, tx) => sum + (tx.value || 0), 0);
    }, [investments]);

    // Investment by category
    const investmentsByCategory = useMemo(() => {
        const byCat = {};
        investments.forEach(tx => {
            const cat = tx.category || "geral";
            if (!byCat[cat]) byCat[cat] = 0;
            byCat[cat] += tx.value || 0;
        });
        return Object.entries(byCat).map(([name, value], i) => ({
            name,
            value,
            color: INVESTMENT_COLORS[i % INVESTMENT_COLORS.length]
        }));
    }, [investments]);

    // Monthly investment evolution
    const monthlyEvolution = useMemo(() => {
        const byMonth = {};
        const now = new Date();

        // Initialize last 6 months
        for (let i = 5; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            const monthName = d.toLocaleDateString('pt-BR', { month: 'short' });
            byMonth[key] = { month: monthName, invested: 0, cumulative: 0 };
        }

        // Sum investments per month
        let cumulative = 0;
        investments.forEach(tx => {
            if (!tx.date) return;
            const d = new Date(tx.date);
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
            if (byMonth[key]) {
                byMonth[key].invested += tx.value || 0;
            }
        });

        // Calculate cumulative
        return Object.values(byMonth).map(item => {
            cumulative += item.invested;
            return { ...item, cumulative };
        });
    }, [investments]);

    // Compound interest simulator
    const simulationData = useMemo(() => {
        const { initialValue, monthlyDeposit, annualRate, months } = simConfig;
        const monthlyRate = annualRate / 100 / 12;

        const data = [];
        let balance = initialValue;
        let totalDeposited = initialValue;

        for (let i = 0; i <= months; i++) {
            const interest = balance * monthlyRate;

            data.push({
                month: i,
                balance: Math.round(balance * 100) / 100,
                deposited: Math.round(totalDeposited * 100) / 100,
                interest: Math.round((balance - totalDeposited) * 100) / 100
            });

            balance = balance + interest + monthlyDeposit;
            totalDeposited += monthlyDeposit;
        }

        return data;
    }, [simConfig]);

    const finalSimulation = simulationData[simulationData.length - 1];
    const totalInterest = finalSimulation ? finalSimulation.balance - finalSimulation.deposited : 0;

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
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        Mês {label}
                    </p>
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
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Total Investido */}
                <div
                    className="rounded-xl p-4"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Total Investido
                        </span>
                        <PiggyBank size={16} className="text-green-400" />
                    </div>
                    <p className="text-2xl font-bold text-green-400">
                        {formatCurrency(totalInvested)}
                    </p>
                </div>

                {/* Patrimônio Líquido */}
                <div
                    className="rounded-xl p-4"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Patrimônio (Saldo + Invest.)
                        </span>
                        <DollarSign size={16} className="text-purple-400" />
                    </div>
                    <p className="text-2xl font-bold text-purple-400">
                        {formatCurrency((summary.balance || 0) + totalInvested)}
                    </p>
                </div>

                {/* Nº Investimentos */}
                <div
                    className="rounded-xl p-4"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Nº de Aportes
                        </span>
                        <TrendingUp size={16} style={{ color: 'var(--text-secondary)' }} />
                    </div>
                    <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {investments.length}
                    </p>
                </div>

                {/* Média por Aporte */}
                <div
                    className="rounded-xl p-4"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Média por Aporte
                        </span>
                        <Calculator size={16} className="text-blue-400" />
                    </div>
                    <p className="text-2xl font-bold text-blue-400">
                        {formatCurrency(investments.length > 0 ? totalInvested / investments.length : 0)}
                    </p>
                </div>
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Evolution Chart */}
                <div
                    className="rounded-xl p-4"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                    <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
                        📈 Evolução dos Investimentos
                    </h3>
                    {monthlyEvolution.some(m => m.invested > 0) ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={monthlyEvolution}>
                                <defs>
                                    <linearGradient id="colorInvest" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
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
                                <Area
                                    type="monotone"
                                    dataKey="cumulative"
                                    name="Total Acumulado"
                                    stroke="#22c55e"
                                    fillOpacity={1}
                                    fill="url(#colorInvest)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="h-[200px] flex flex-col items-center justify-center">
                            <PiggyBank size={32} style={{ color: 'var(--text-secondary)' }} />
                            <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                                Nenhum investimento registrado
                            </p>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                Use tipo "Investimento" ao adicionar transações
                            </p>
                        </div>
                    )}
                </div>

                {/* Distribution Pie */}
                <div
                    className="rounded-xl p-4"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                    <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
                        📊 Distribuição por Categoria
                    </h3>
                    {investmentsByCategory.length > 0 ? (
                        <div className="flex items-center">
                            <ResponsiveContainer width="60%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={investmentsByCategory}
                                        dataKey="value"
                                        nameKey="name"
                                        cx="50%"
                                        cy="50%"
                                        outerRadius={70}
                                        innerRadius={45}
                                    >
                                        {investmentsByCategory.map((entry, i) => (
                                            <Cell key={i} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip content={<CustomTooltip />} />
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="flex-1 space-y-2">
                                {investmentsByCategory.map((cat, i) => (
                                    <div key={i} className="flex items-center gap-2">
                                        <div
                                            className="w-3 h-3 rounded-full"
                                            style={{ background: cat.color }}
                                        />
                                        <span className="text-xs capitalize" style={{ color: 'var(--text-secondary)' }}>
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
            </div>

            {/* Compound Interest Simulator */}
            <div
                className="rounded-xl p-4"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            >
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-medium flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Sparkles size={16} className="text-yellow-400" />
                        Simulador de Juros Compostos
                    </h3>
                    <button
                        onClick={() => setShowSimulator(!showSimulator)}
                        className="text-xs px-3 py-1 rounded-lg transition-colors"
                        style={{
                            background: showSimulator ? 'var(--accent-primary)' : 'var(--bg-tertiary)',
                            color: showSimulator ? 'white' : 'var(--text-secondary)'
                        }}
                    >
                        {showSimulator ? 'Ocultar' : 'Mostrar'}
                    </button>
                </div>

                {showSimulator && (
                    <div className="space-y-4">
                        {/* Inputs */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
                                    Valor Inicial
                                </label>
                                <input
                                    type="number"
                                    value={simConfig.initialValue}
                                    onChange={(e) => setSimConfig({ ...simConfig, initialValue: Number(e.target.value) })}
                                    className="w-full px-3 py-2 rounded-lg text-sm"
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-primary)'
                                    }}
                                />
                            </div>
                            <div>
                                <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
                                    Aporte Mensal
                                </label>
                                <input
                                    type="number"
                                    value={simConfig.monthlyDeposit}
                                    onChange={(e) => setSimConfig({ ...simConfig, monthlyDeposit: Number(e.target.value) })}
                                    className="w-full px-3 py-2 rounded-lg text-sm"
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-primary)'
                                    }}
                                />
                            </div>
                            <div>
                                <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
                                    Taxa Anual (%)
                                </label>
                                <input
                                    type="number"
                                    step="0.1"
                                    value={simConfig.annualRate}
                                    onChange={(e) => setSimConfig({ ...simConfig, annualRate: Number(e.target.value) })}
                                    className="w-full px-3 py-2 rounded-lg text-sm"
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-primary)'
                                    }}
                                />
                            </div>
                            <div>
                                <label className="text-xs block mb-1" style={{ color: 'var(--text-secondary)' }}>
                                    Período (meses)
                                </label>
                                <input
                                    type="number"
                                    value={simConfig.months}
                                    onChange={(e) => setSimConfig({ ...simConfig, months: Number(e.target.value) })}
                                    className="w-full px-3 py-2 rounded-lg text-sm"
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-primary)'
                                    }}
                                />
                            </div>
                        </div>

                        {/* Results */}
                        <div className="grid grid-cols-3 gap-4">
                            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total Depositado</p>
                                <p className="text-lg font-bold text-blue-400">
                                    {formatCurrency(finalSimulation?.deposited || 0)}
                                </p>
                            </div>
                            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Juros Ganhos</p>
                                <p className="text-lg font-bold text-yellow-400">
                                    {formatCurrency(totalInterest)}
                                </p>
                            </div>
                            <div className="p-3 rounded-lg" style={{ background: 'rgba(34, 197, 94, 0.1)' }}>
                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Total Final</p>
                                <p className="text-lg font-bold text-green-400">
                                    {formatCurrency(finalSimulation?.balance || 0)}
                                </p>
                            </div>
                        </div>

                        {/* Chart */}
                        <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={simulationData}>
                                <defs>
                                    <linearGradient id="colorSimBalance" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="colorSimDeposit" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
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
                                <Area
                                    type="monotone"
                                    dataKey="balance"
                                    name="Saldo Total"
                                    stroke="#22c55e"
                                    fillOpacity={1}
                                    fill="url(#colorSimBalance)"
                                />
                                <Area
                                    type="monotone"
                                    dataKey="deposited"
                                    name="Depositado"
                                    stroke="#3b82f6"
                                    fillOpacity={1}
                                    fill="url(#colorSimDeposit)"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* Recent Investments List */}
            <div
                className="rounded-xl p-4"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            >
                <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
                    📋 Últimos Aportes
                </h3>
                {investments.length > 0 ? (
                    <div className="space-y-2">
                        {investments.slice(0, 10).map((tx, i) => (
                            <div
                                key={tx.id || i}
                                className="flex items-center justify-between p-3 rounded-lg"
                                style={{ background: 'var(--bg-tertiary)' }}
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500/20">
                                        <TrendingUp size={14} className="text-green-400" />
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                            {tx.description || "Investimento"}
                                        </p>
                                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                            {tx.category || "geral"} • {tx.date ? new Date(tx.date).toLocaleDateString('pt-BR') : '-'}
                                        </p>
                                    </div>
                                </div>
                                <span className="text-sm font-bold text-green-400">
                                    {formatCurrency(tx.value)}
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-8">
                        <PiggyBank size={32} style={{ color: 'var(--text-secondary)' }} />
                        <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                            Nenhum investimento ainda
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            Adicione transações com tipo "Investimento"
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InvestmentsTab;
