import { useMemo, useState, useEffect } from "react";
import {
    AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
    ResponsiveContainer, BarChart, Bar, Legend
} from "recharts";
import {
    TrendingUp, TrendingDown, Calendar, AlertTriangle,
    ArrowRight, Repeat, DollarSign, Clock
} from "lucide-react";
import { API_CONFIG } from "../../config/api";

// ============================================================================
// PROJECTIONS TAB - Análise de Fluxo de Caixa Futuro
// ============================================================================

export const ProjectionsTab = ({ transactions, summary, userId = "local" }) => {
    const [recurringItems, setRecurringItems] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [projectionMonths, setProjectionMonths] = useState(3);

    // Load recurring items
    useEffect(() => {
        const loadRecurring = async () => {
            try {
                const res = await fetch(`${API_CONFIG.BASE_URL}/business/recurring-items?user_id=${userId}`);
                if (res.ok) {
                    const data = await res.json();
                    setRecurringItems(data.items || []);
                }
            } catch (e) {
                console.error("Error loading recurring items:", e);
            } finally {
                setIsLoading(false);
            }
        };
        loadRecurring();
    }, [userId]);

    // Calculate monthly fixed totals
    const fixedTotals = useMemo(() => {
        let totalIncome = 0;
        let totalExpense = 0;

        recurringItems.forEach(item => {
            if (item.type === "income") {
                totalIncome += item.value || 0;
            } else {
                totalExpense += item.value || 0;
            }
        });

        return {
            income: totalIncome,
            expense: totalExpense,
            net: totalIncome - totalExpense
        };
    }, [recurringItems]);

    // Generate projection data for next N months
    const projectionData = useMemo(() => {
        const data = [];
        const now = new Date();
        let runningBalance = summary.balance || 0;

        for (let i = 0; i <= projectionMonths; i++) {
            const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
            const monthName = date.toLocaleDateString('pt-BR', { month: 'short', year: '2-digit' });

            if (i === 0) {
                // Current month - use actual balance
                data.push({
                    month: monthName,
                    balance: runningBalance,
                    income: 0,
                    expense: 0,
                    isProjection: false
                });
            } else {
                // Future months - project based on recurring items
                runningBalance += fixedTotals.net;
                data.push({
                    month: monthName,
                    balance: runningBalance,
                    income: fixedTotals.income,
                    expense: fixedTotals.expense,
                    isProjection: true
                });
            }
        }

        return data;
    }, [summary.balance, fixedTotals, projectionMonths]);

    // Upcoming bills (next 30 days)
    const upcomingBills = useMemo(() => {
        const now = new Date();
        const currentDay = now.getDate();

        return recurringItems
            .filter(item => item.type === "expense")
            .map(item => {
                const dueDay = item.due_day || 1;
                let daysUntil = dueDay - currentDay;
                if (daysUntil < 0) daysUntil += 30; // Next month

                return {
                    ...item,
                    daysUntil,
                    isOverdue: daysUntil > 25 // Already passed this month
                };
            })
            .sort((a, b) => a.daysUntil - b.daysUntil)
            .slice(0, 5);
    }, [recurringItems]);

    // Health score (0-100)
    const healthScore = useMemo(() => {
        if (fixedTotals.income === 0 && fixedTotals.expense === 0) return 50;

        const ratio = fixedTotals.expense > 0
            ? fixedTotals.income / fixedTotals.expense
            : 2;

        // Score based on income/expense ratio
        // 2.0+ = 100, 1.5 = 80, 1.0 = 50, 0.5 = 20, 0 = 0
        const score = Math.min(100, Math.max(0, (ratio - 0.5) * 66.67));
        return Math.round(score);
    }, [fixedTotals]);

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload;
            return (
                <div
                    className="rounded-lg px-3 py-2 text-sm"
                    style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-color)'
                    }}
                >
                    <p className="font-medium" style={{ color: 'var(--text-primary)' }}>
                        {label} {data.isProjection ? '(projeção)' : '(atual)'}
                    </p>
                    <p style={{ color: '#8b5cf6' }}>
                        Saldo: {formatCurrency(data.balance)}
                    </p>
                    {data.isProjection && (
                        <>
                            <p className="text-green-400">+ {formatCurrency(data.income)}</p>
                            <p className="text-red-400">- {formatCurrency(data.expense)}</p>
                        </>
                    )}
                </div>
            );
        }
        return null;
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 overflow-auto h-full">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Saldo Projetado */}
                <div
                    className="rounded-xl p-4"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Saldo em {projectionMonths} meses
                        </span>
                        <TrendingUp size={16} className="text-purple-400" />
                    </div>
                    <p className={`text-2xl font-bold ${projectionData[projectionMonths]?.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(projectionData[projectionMonths]?.balance || 0)}
                    </p>
                </div>

                {/* Receitas Fixas */}
                <div
                    className="rounded-xl p-4"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Receitas Fixas/Mês
                        </span>
                        <TrendingUp size={16} className="text-green-400" />
                    </div>
                    <p className="text-2xl font-bold text-green-400">
                        {formatCurrency(fixedTotals.income)}
                    </p>
                </div>

                {/* Despesas Fixas */}
                <div
                    className="rounded-xl p-4"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Despesas Fixas/Mês
                        </span>
                        <TrendingDown size={16} className="text-red-400" />
                    </div>
                    <p className="text-2xl font-bold text-red-400">
                        {formatCurrency(fixedTotals.expense)}
                    </p>
                </div>

                {/* Saúde Financeira */}
                <div
                    className="rounded-xl p-4"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Saúde Financeira
                        </span>
                        <DollarSign size={16} style={{ color: healthScore > 60 ? '#22c55e' : healthScore > 30 ? '#f59e0b' : '#ef4444' }} />
                    </div>
                    <div className="flex items-center gap-2">
                        <p className={`text-2xl font-bold ${healthScore > 60 ? 'text-green-400' : healthScore > 30 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {healthScore}%
                        </p>
                        <div className="flex-1 h-2 rounded-full bg-gray-700">
                            <div
                                className={`h-full rounded-full ${healthScore > 60 ? 'bg-green-500' : healthScore > 30 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${healthScore}%` }}
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Projection Period Selector */}
            <div className="flex items-center gap-2">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Projetar:</span>
                {[3, 6, 12].map(months => (
                    <button
                        key={months}
                        onClick={() => setProjectionMonths(months)}
                        className={`px-3 py-1 rounded-lg text-sm transition-colors ${projectionMonths === months
                                ? 'bg-purple-500/30 text-purple-300 border border-purple-500/50'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10'
                            }`}
                    >
                        {months} meses
                    </button>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Projection Chart */}
                <div
                    className="lg:col-span-2 rounded-xl p-4"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                    <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
                        📈 Projeção de Saldo
                    </h3>
                    <ResponsiveContainer width="100%" height={250}>
                        <AreaChart data={projectionData}>
                            <defs>
                                <linearGradient id="colorProjection" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
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
                                stroke="#8b5cf6"
                                fillOpacity={1}
                                fill="url(#colorProjection)"
                                strokeWidth={2}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>

                {/* Upcoming Bills */}
                <div
                    className="rounded-xl p-4"
                    style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
                >
                    <h3 className="text-sm font-medium mb-4 flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
                        <Clock size={14} />
                        Próximos Vencimentos
                    </h3>
                    {upcomingBills.length > 0 ? (
                        <div className="space-y-3">
                            {upcomingBills.map((bill, i) => (
                                <div
                                    key={i}
                                    className="flex items-center justify-between p-2 rounded-lg"
                                    style={{ background: 'var(--bg-tertiary)' }}
                                >
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${bill.daysUntil <= 3 ? 'bg-red-500' : bill.daysUntil <= 7 ? 'bg-yellow-500' : 'bg-green-500'}`} />
                                        <div>
                                            <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                                {bill.description}
                                            </p>
                                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                {bill.daysUntil === 0 ? 'Hoje' : bill.daysUntil === 1 ? 'Amanhã' : `Em ${bill.daysUntil} dias`}
                                            </p>
                                        </div>
                                    </div>
                                    <span className="text-sm font-medium text-red-400">
                                        {formatCurrency(bill.value)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-32 text-center">
                            <Repeat size={24} style={{ color: 'var(--text-secondary)' }} />
                            <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                                Nenhum gasto fixo cadastrado
                            </p>
                            <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                Adicione na aba "Fixos"
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Fixed Items Summary */}
            <div
                className="rounded-xl p-4"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-color)' }}
            >
                <h3 className="text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
                    📋 Resumo de Fixos Mensais
                </h3>
                {recurringItems.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Receitas Fixas */}
                        <div>
                            <h4 className="text-xs font-medium text-green-400 mb-2 flex items-center gap-1">
                                <TrendingUp size={12} /> Receitas Fixas
                            </h4>
                            <div className="space-y-2">
                                {recurringItems.filter(i => i.type === "income").map((item, i) => (
                                    <div key={i} className="flex justify-between text-sm">
                                        <span style={{ color: 'var(--text-secondary)' }}>{item.description}</span>
                                        <span className="text-green-400">{formatCurrency(item.value)}</span>
                                    </div>
                                ))}
                                {recurringItems.filter(i => i.type === "income").length === 0 && (
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        Nenhuma receita fixa
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Despesas Fixas */}
                        <div>
                            <h4 className="text-xs font-medium text-red-400 mb-2 flex items-center gap-1">
                                <TrendingDown size={12} /> Despesas Fixas
                            </h4>
                            <div className="space-y-2">
                                {recurringItems.filter(i => i.type === "expense").map((item, i) => (
                                    <div key={i} className="flex justify-between text-sm">
                                        <span style={{ color: 'var(--text-secondary)' }}>{item.description}</span>
                                        <span className="text-red-400">{formatCurrency(item.value)}</span>
                                    </div>
                                ))}
                                {recurringItems.filter(i => i.type === "expense").length === 0 && (
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        Nenhuma despesa fixa
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="flex items-center justify-center h-20">
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Cadastre gastos fixos para ver projeções detalhadas
                        </p>
                    </div>
                )}

                {/* Net Summary */}
                {recurringItems.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center">
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            Resultado Mensal Projetado:
                        </span>
                        <span className={`text-lg font-bold ${fixedTotals.net >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {fixedTotals.net >= 0 ? '+' : ''}{formatCurrency(fixedTotals.net)}
                        </span>
                    </div>
                )}
            </div>

            {/* Warning if negative projection */}
            {projectionData[projectionMonths]?.balance < 0 && (
                <div
                    className="rounded-xl p-4 flex items-center gap-3"
                    style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)' }}
                >
                    <AlertTriangle className="text-red-400 flex-shrink-0" size={20} />
                    <div>
                        <p className="text-sm font-medium text-red-400">
                            ⚠️ Atenção: Saldo negativo projetado
                        </p>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            Baseado nos seus gastos fixos, seu saldo pode ficar negativo em {projectionMonths} meses.
                            Considere reduzir despesas ou aumentar receitas.
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProjectionsTab;
