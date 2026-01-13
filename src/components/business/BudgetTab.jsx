import { useState, useEffect } from "react";
import { Plus, Trash2, Edit3, DollarSign, TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Calendar } from "lucide-react";
import { API_CONFIG } from "../../config/api";

export default function BudgetTab({ userId = "local", selectedPeriod, onLoadData }) {
    const [budgets, setBudgets] = useState([]);
    const [summary, setSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        category: "",
        amount: "",
        budget_type: "expense"
    });
    const [availableCategories, setAvailableCategories] = useState([]);

    const loadBudgets = async () => {
        setIsLoading(true);
        try {
            const period = selectedPeriod || new Date().toISOString().slice(0, 7); // YYYY-MM
            const [budgetsRes, summaryRes, tagsRes] = await Promise.all([
                fetch(`${API_CONFIG.BASE_URL}/business/budget?user_id=${userId}&period=${period}`),
                fetch(`${API_CONFIG.BASE_URL}/business/budget/summary?user_id=${userId}&period=${period}`),
                fetch(`${API_CONFIG.BASE_URL}/business/tags?user_id=${userId}`)
            ]);

            if (budgetsRes.ok) {
                const budgetsData = await budgetsRes.json();
                setBudgets(budgetsData.budgets || []);
            }

            if (summaryRes.ok) {
                const summaryData = await summaryRes.json();
                setSummary(summaryData);
            }

            if (tagsRes.ok) {
                const tagsData = await tagsRes.json();
                const categories = tagsData.tags?.map(tag => tag.label) || [];
                setAvailableCategories(categories);
            }
        } catch (error) {
            console.error("[BUDGET] Erro ao carregar orçamento:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadBudgets();
    }, [userId, selectedPeriod]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const period = selectedPeriod || new Date().toISOString().slice(0, 7);
            const payload = {
                category: formData.category.trim(),
                amount: parseFloat(formData.amount),
                period: period,
                budget_type: formData.budget_type,
                user_id: userId
            };

            let response;
            if (editingId) {
                response = await fetch(`${API_CONFIG.BASE_URL}/business/budget/${editingId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
            } else {
                response = await fetch(`${API_CONFIG.BASE_URL}/business/budget`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
            }

            if (response.ok) {
                await loadBudgets();
                resetForm();
                if (onLoadData) onLoadData();
            } else {
                const error = await response.json();
                alert(`Erro: ${error.detail || "Erro ao salvar orçamento"}`);
            }
        } catch (error) {
            console.error("[BUDGET] Erro ao salvar orçamento:", error);
            alert("Erro ao salvar orçamento. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (budgetId) => {
        if (!window.confirm("Deseja realmente excluir este orçamento?")) return;

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/business/budget/${budgetId}?user_id=${userId}`, {
                method: "DELETE"
            });

            if (response.ok) {
                await loadBudgets();
                if (onLoadData) onLoadData();
            }
        } catch (error) {
            console.error("[BUDGET] Erro ao excluir orçamento:", error);
            alert("Erro ao excluir orçamento. Tente novamente.");
        }
    };

    const handleEdit = (budget) => {
        setEditingId(budget.id);
        setFormData({
            category: budget.category,
            amount: budget.amount.toString(),
            budget_type: budget.type
        });
        setShowAddForm(true);
    };

    const resetForm = () => {
        setFormData({
            category: "",
            amount: "",
            budget_type: "expense"
        });
        setEditingId(null);
        setShowAddForm(false);
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatPeriod = (period) => {
        if (!period) return "";
        try {
            const [year, month] = period.split("-");
            const monthNames = [
                "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
            ];
            return `${monthNames[parseInt(month) - 1]} ${year}`;
        } catch {
            return period;
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case "exceeded":
                return "text-red-400";
            case "warning":
                return "text-yellow-400";
            default:
                return "text-green-400";
        }
    };

    const getStatusBg = (status) => {
        switch (status) {
            case "exceeded":
                return "bg-red-500/10 border-red-500/30";
            case "warning":
                return "bg-yellow-500/10 border-yellow-500/30";
            default:
                return "bg-green-500/10 border-green-500/30";
        }
    };

    const currentPeriod = selectedPeriod || new Date().toISOString().slice(0, 7);

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-violet-500 bg-clip-text text-transparent">
                            Orçamento
                        </h2>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                            {formatPeriod(currentPeriod)} - Controle seus gastos por categoria
                        </p>
                    </div>
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold transition-all duration-200 hover:scale-105 active:scale-95"
                        style={{
                            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)',
                            border: '2px solid rgba(139, 92, 246, 0.3)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <Plus size={18} />
                        {editingId ? "Cancelar Edição" : "Novo Orçamento"}
                    </button>
                </div>

                {/* Summary Cards */}
                {summary && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                            <div className="text-sm flex items-center gap-2 mb-1" style={{ color: 'var(--text-secondary)' }}>
                                <DollarSign size={14} />
                                Total Orçado
                            </div>
                            <div className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                                {formatCurrency(summary.expense_budgets?.budgeted || 0)}
                            </div>
                        </div>
                        <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                            <div className="text-sm flex items-center gap-2 mb-1" style={{ color: 'var(--text-secondary)' }}>
                                <TrendingDown size={14} />
                                Gasto Real
                            </div>
                            <div className="text-2xl font-bold mt-1 text-red-400">
                                {formatCurrency(summary.expense_budgets?.actual || 0)}
                            </div>
                        </div>
                        <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                            <div className="text-sm flex items-center gap-2 mb-1" style={{ color: 'var(--text-secondary)' }}>
                                <TrendingUp size={14} />
                                Restante
                            </div>
                            <div className={`text-2xl font-bold mt-1 ${(summary.expense_budgets?.remaining || 0) < 0 ? 'text-red-400' : 'text-green-400'}`}>
                                {formatCurrency(summary.expense_budgets?.remaining || 0)}
                            </div>
                        </div>
                        <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                            <div className="text-sm flex items-center gap-2 mb-1" style={{ color: 'var(--text-secondary)' }}>
                                <AlertCircle size={14} />
                                Alertas
                            </div>
                            <div className="text-2xl font-bold mt-1 text-yellow-400">
                                {summary.alerts?.exceeded || 0} excedidos
                            </div>
                            <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                                {summary.alerts?.warning || 0} em alerta
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add/Edit Form */}
            {showAddForm && (
                <div className="p-6 border-b" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                                    Categoria *
                                </label>
                                <select
                                    required
                                    value={formData.category}
                                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:border-purple-500/50"
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--text-primary)'
                                    }}
                                >
                                    <option value="">Selecione uma categoria</option>
                                    {availableCategories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                                    Valor Orçado (R$) *
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0.01"
                                    step="0.01"
                                    value={formData.amount}
                                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:border-purple-500/50"
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--text-primary)'
                                    }}
                                    placeholder="1000.00"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                                    Tipo *
                                </label>
                                <select
                                    required
                                    value={formData.budget_type}
                                    onChange={(e) => setFormData({ ...formData, budget_type: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:border-purple-500/50"
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--text-primary)'
                                    }}
                                >
                                    <option value="expense">Despesa</option>
                                    <option value="income">Receita</option>
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex-1 px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)',
                                    border: '2px solid rgba(139, 92, 246, 0.3)',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                {isLoading ? "Salvando..." : editingId ? "Atualizar Orçamento" : "Criar Orçamento"}
                            </button>
                            <button
                                type="button"
                                onClick={resetForm}
                                className="px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:bg-white/5"
                                style={{
                                    background: 'var(--bg-tertiary)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                Cancelar
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Budgets List */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {isLoading && budgets.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
                            <p style={{ color: 'var(--text-secondary)' }}>Carregando orçamentos...</p>
                        </div>
                    </div>
                ) : budgets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <DollarSign size={64} className="text-purple-400/50 mb-4" />
                        <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                            Nenhum orçamento definido
                        </h3>
                        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                            Crie orçamentos por categoria para controlar seus gastos mensais
                        </p>
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105"
                            style={{
                                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)',
                                border: '2px solid rgba(139, 92, 246, 0.3)',
                                color: 'var(--text-primary)'
                            }}
                        >
                            <Plus size={18} className="inline mr-2" />
                            Criar Primeiro Orçamento
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {budgets.map((budget) => {
                            const actual = budget.actual || {};
                            const percentage = actual.percentage || 0;
                            const status = actual.status || "ok";

                            return (
                                <div
                                    key={budget.id}
                                    className={`p-5 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] ${getStatusBg(status)}`}
                                >
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <DollarSign size={18} className={getStatusColor(status)} />
                                                <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                                                    {budget.category}
                                                </h3>
                                                {status === "exceeded" && (
                                                    <AlertCircle size={18} className="text-red-400" />
                                                )}
                                                {status === "warning" && (
                                                    <AlertCircle size={18} className="text-yellow-400" />
                                                )}
                                                {status === "ok" && (
                                                    <CheckCircle2 size={18} className="text-green-400" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                <span className={`px-2 py-0.5 rounded-full ${
                                                    budget.type === "expense" 
                                                        ? "bg-red-500/20 text-red-400" 
                                                        : "bg-green-500/20 text-green-400"
                                                } text-xs font-medium`}>
                                                    {budget.type === "expense" ? "Despesa" : "Receita"}
                                                </span>
                                                <Calendar size={12} />
                                                <span>{formatPeriod(budget.period)}</span>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEdit(budget)}
                                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                                style={{ color: 'var(--text-secondary)' }}
                                                title="Editar"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(budget.id)}
                                                className="p-2 hover:bg-red-500/20 rounded-lg transition-colors text-red-400"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Progress Bar */}
                                    <div className="mb-3">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                                Utilizado
                                            </span>
                                            <span className={`text-sm font-bold ${getStatusColor(status)}`}>
                                                {percentage.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                                            <div
                                                className={`h-full transition-all duration-500 ${
                                                    status === "exceeded"
                                                        ? "bg-gradient-to-r from-red-500 to-rose-600"
                                                        : status === "warning"
                                                        ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                                                        : "bg-gradient-to-r from-green-500 to-emerald-600"
                                                }`}
                                                style={{ width: `${Math.min(percentage, 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Orçado</div>
                                            <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                                                {formatCurrency(budget.amount)}
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Gasto</div>
                                            <div className={`text-lg font-bold ${status === "exceeded" ? "text-red-400" : status === "warning" ? "text-yellow-400" : "text-green-400"}`}>
                                                {formatCurrency(actual.amount || 0)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Remaining */}
                                    <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                                        <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                            {actual.remaining >= 0 ? "Restante" : "Excedido"}
                                        </span>
                                        <span className={`text-sm font-bold ${actual.remaining >= 0 ? "text-green-400" : "text-red-400"}`}>
                                            {formatCurrency(Math.abs(actual.remaining || budget.amount))}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
