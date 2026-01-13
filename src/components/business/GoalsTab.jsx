import { useState, useEffect } from "react";
import { Plus, Trash2, Edit3, Target, TrendingUp, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import { API_CONFIG } from "../../config/api";

export default function GoalsTab({ userId = "local", onLoadData }) {
    const [goals, setGoals] = useState([]);
    const [summary, setSummary] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [formData, setFormData] = useState({
        title: "",
        target_amount: "",
        target_date: "",
        goal_type: "savings",
        description: ""
    });

    const loadGoals = async () => {
        setIsLoading(true);
        try {
            const [goalsRes, summaryRes] = await Promise.all([
                fetch(`${API_CONFIG.BASE_URL}/business/goals?user_id=${userId}`),
                fetch(`${API_CONFIG.BASE_URL}/business/goals/summary?user_id=${userId}`)
            ]);

            if (goalsRes.ok) {
                const goalsData = await goalsRes.json();
                setGoals(goalsData.goals || []);
            }

            if (summaryRes.ok) {
                const summaryData = await summaryRes.json();
                setSummary(summaryData);
            }
        } catch (error) {
            console.error("[GOALS] Erro ao carregar metas:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadGoals();
    }, [userId]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const payload = {
                title: formData.title.trim(),
                target_amount: parseFloat(formData.target_amount),
                target_date: formData.target_date || null,
                goal_type: formData.goal_type,
                description: formData.description.trim() || null,
                user_id: userId
            };

            let response;
            if (editingId) {
                response = await fetch(`${API_CONFIG.BASE_URL}/business/goals/${editingId}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
            } else {
                response = await fetch(`${API_CONFIG.BASE_URL}/business/goals`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
            }

            if (response.ok) {
                await loadGoals();
                resetForm();
                if (onLoadData) onLoadData();
            } else {
                const error = await response.json();
                alert(`Erro: ${error.detail || "Erro ao salvar meta"}`);
            }
        } catch (error) {
            console.error("[GOALS] Erro ao salvar meta:", error);
            alert("Erro ao salvar meta. Tente novamente.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (goalId) => {
        if (!window.confirm("Deseja realmente excluir esta meta?")) return;

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/business/goals/${goalId}?user_id=${userId}`, {
                method: "DELETE"
            });

            if (response.ok) {
                await loadGoals();
                if (onLoadData) onLoadData();
            }
        } catch (error) {
            console.error("[GOALS] Erro ao excluir meta:", error);
            alert("Erro ao excluir meta. Tente novamente.");
        }
    };

    const handleEdit = (goal) => {
        setEditingId(goal.id);
        setFormData({
            title: goal.title,
            target_amount: goal.target_amount.toString(),
            target_date: goal.target_date ? goal.target_date.split('T')[0] : "",
            goal_type: goal.goal_type,
            description: goal.description || ""
        });
        setShowAddForm(true);
    };

    const resetForm = () => {
        setFormData({
            title: "",
            target_amount: "",
            target_date: "",
            goal_type: "savings",
            description: ""
        });
        setEditingId(null);
        setShowAddForm(false);
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "Sem prazo";
        try {
            const date = new Date(dateStr);
            return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch {
            return dateStr;
        }
    };

    const getGoalTypeLabel = (type) => {
        switch (type) {
            case "savings": return "Economia";
            case "expense_reduction": return "Redução de Despesas";
            case "income_increase": return "Aumento de Receitas";
            default: return type;
        }
    };

    const getGoalTypeColor = (type) => {
        switch (type) {
            case "savings": return "from-green-500 to-emerald-600";
            case "expense_reduction": return "from-red-500 to-rose-600";
            case "income_increase": return "from-blue-500 to-cyan-600";
            default: return "from-purple-500 to-violet-600";
        }
    };

    return (
        <div className="flex-1 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-violet-500 bg-clip-text text-transparent">
                            Metas Financeiras
                        </h2>
                        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                            Defina e acompanhe suas metas financeiras
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
                        {editingId ? "Cancelar Edição" : "Nova Meta"}
                    </button>
                </div>

                {/* Summary Cards */}
                {summary && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Total de Metas</div>
                            <div className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>
                                {summary.total_goals}
                            </div>
                        </div>
                        <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Ativas</div>
                            <div className="text-2xl font-bold mt-1 text-green-400">
                                {summary.active_goals}
                            </div>
                        </div>
                        <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Concluídas</div>
                            <div className="text-2xl font-bold mt-1 text-purple-400">
                                {summary.completed_goals}
                            </div>
                        </div>
                        <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                            <div className="text-sm" style={{ color: 'var(--text-secondary)' }}>Progresso Geral</div>
                            <div className="text-2xl font-bold mt-1 text-blue-400">
                                {summary.overall_progress?.toFixed(1) || 0}%
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Add/Edit Form */}
            {showAddForm && (
                <div className="p-6 border-b" style={{ borderColor: 'var(--border-color)', background: 'var(--bg-secondary)' }}>
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                                    Título da Meta *
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.title}
                                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:border-purple-500/50"
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--text-primary)'
                                    }}
                                    placeholder="Ex: Reserva de emergência"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                                    Valor Alvo (R$) *
                                </label>
                                <input
                                    type="number"
                                    required
                                    min="0.01"
                                    step="0.01"
                                    value={formData.target_amount}
                                    onChange={(e) => setFormData({ ...formData, target_amount: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:border-purple-500/50"
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--text-primary)'
                                    }}
                                    placeholder="1000.00"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                                    Tipo de Meta *
                                </label>
                                <select
                                    required
                                    value={formData.goal_type}
                                    onChange={(e) => setFormData({ ...formData, goal_type: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:border-purple-500/50"
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--text-primary)'
                                    }}
                                >
                                    <option value="savings">Economia</option>
                                    <option value="expense_reduction">Redução de Despesas</option>
                                    <option value="income_increase">Aumento de Receitas</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                                    Data Alvo (opcional)
                                </label>
                                <input
                                    type="date"
                                    value={formData.target_date}
                                    onChange={(e) => setFormData({ ...formData, target_date: e.target.value })}
                                    className="w-full px-4 py-2 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:border-purple-500/50"
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--text-primary)'
                                    }}
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                                Descrição (opcional)
                            </label>
                            <textarea
                                value={formData.description}
                                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                rows={2}
                                className="w-full px-4 py-2 rounded-lg border-2 transition-all duration-200 focus:outline-none focus:border-purple-500/50 resize-none"
                                style={{
                                    background: 'var(--bg-tertiary)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--text-primary)'
                                }}
                                placeholder="Adicione uma descrição para sua meta..."
                            />
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
                                {isLoading ? "Salvando..." : editingId ? "Atualizar Meta" : "Criar Meta"}
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

            {/* Goals List */}
            <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                {isLoading && goals.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <div className="text-center">
                            <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
                            <p style={{ color: 'var(--text-secondary)' }}>Carregando metas...</p>
                        </div>
                    </div>
                ) : goals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                        <Target size={64} className="text-purple-400/50 mb-4" />
                        <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                            Nenhuma meta definida
                        </h3>
                        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
                            Crie sua primeira meta financeira para começar a acompanhar seu progresso
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
                            Criar Primeira Meta
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {goals.map((goal) => {
                            const progress = goal.progress || {};
                            const isCompleted = goal.status === "completed" || progress.is_completed;
                            const percentage = progress.percentage || 0;

                            return (
                                <div
                                    key={goal.id}
                                    className={`p-5 rounded-xl border-2 transition-all duration-200 hover:scale-[1.02] ${
                                        isCompleted
                                            ? "bg-green-500/10 border-green-500/30"
                                            : "bg-[var(--bg-secondary)] border-[var(--border-color)]"
                                    }`}
                                >
                                    {/* Header */}
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-2 mb-1">
                                                <Target size={18} className={`${isCompleted ? "text-green-400" : "text-purple-400"}`} />
                                                <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                                                    {goal.title}
                                                </h3>
                                                {isCompleted && (
                                                    <CheckCircle2 size={18} className="text-green-400" />
                                                )}
                                            </div>
                                            <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                <span className={`px-2 py-0.5 rounded-full bg-gradient-to-r ${getGoalTypeColor(goal.goal_type)} text-white text-xs font-medium`}>
                                                    {getGoalTypeLabel(goal.goal_type)}
                                                </span>
                                                {goal.target_date && (
                                                    <>
                                                        <Calendar size={12} />
                                                        <span>{formatDate(goal.target_date)}</span>
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleEdit(goal)}
                                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                                style={{ color: 'var(--text-secondary)' }}
                                                title="Editar"
                                            >
                                                <Edit3 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDelete(goal.id)}
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
                                                Progresso
                                            </span>
                                            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                                                {percentage.toFixed(1)}%
                                            </span>
                                        </div>
                                        <div className="w-full h-3 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                                            <div
                                                className={`h-full transition-all duration-500 ${
                                                    isCompleted
                                                        ? "bg-gradient-to-r from-green-500 to-emerald-600"
                                                        : percentage >= 80
                                                        ? "bg-gradient-to-r from-yellow-500 to-orange-500"
                                                        : "bg-gradient-to-r from-purple-500 to-violet-600"
                                                }`}
                                                style={{ width: `${Math.min(percentage, 100)}%` }}
                                            />
                                        </div>
                                    </div>

                                    {/* Stats */}
                                    <div className="grid grid-cols-2 gap-3 mb-3">
                                        <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Atual</div>
                                            <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                                                {formatCurrency(progress.current_amount || 0)}
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Alvo</div>
                                            <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                                                {formatCurrency(goal.target_amount)}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Remaining */}
                                    {!isCompleted && (
                                        <div className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                                            <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                Faltam
                                            </span>
                                            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                                                {formatCurrency(progress.amount_remaining || goal.target_amount)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Days Remaining */}
                                    {progress.days_remaining !== null && progress.days_remaining !== undefined && (
                                        <div className="mt-3 flex items-center gap-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                            <AlertCircle size={14} />
                                            <span>
                                                {progress.days_remaining === 0
                                                    ? "Vence hoje!"
                                                    : progress.days_remaining === 1
                                                    ? "Vence amanhã"
                                                    : `${progress.days_remaining} dias restantes`}
                                            </span>
                                        </div>
                                    )}

                                    {/* Description */}
                                    {goal.description && (
                                        <div className="mt-3 pt-3 border-t" style={{ borderColor: 'var(--border-color)' }}>
                                            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                {goal.description}
                                            </p>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
