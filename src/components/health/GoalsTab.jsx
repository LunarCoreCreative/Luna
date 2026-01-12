import React, { useState, useEffect } from "react";
import {
    Target,
    Save,
    Sparkles,
    TrendingUp,
    TrendingDown,
    Minus,
    Loader2,
    AlertCircle,
    CheckCircle2
} from "lucide-react";
import { API_CONFIG } from "../../config/api";

export function GoalsTab({ userId = "local", viewAsStudentId = null, onUpdate }) {
    const [goals, setGoals] = useState({
        daily_calories: "",
        daily_protein: "",
        daily_carbs: "",
        daily_fats: "",
        current_weight: "",
        target_weight: ""
    });
    
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [isSuggesting, setIsSuggesting] = useState(false);
    const [showSuggestionForm, setShowSuggestionForm] = useState(false);
    const [suggestionData, setSuggestionData] = useState({
        weight: "",
        height: "",
        age: "",
        gender: "male",
        goal: "maintain",
        activity_level: "moderate"
    });
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);

    // Carregar metas atuais
    useEffect(() => {
        loadGoals();
    }, [userId, viewAsStudentId]);

    const loadGoals = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const viewAsParam = viewAsStudentId ? `&view_as=${viewAsStudentId}` : '';
            const response = await fetch(`${API_CONFIG.BASE_URL}/health/goals?user_id=${userId}${viewAsParam}`);
            const data = await response.json();
            
            if (data.success && data.goals) {
                setGoals({
                    daily_calories: data.goals.daily_calories || "",
                    daily_protein: data.goals.daily_protein || "",
                    daily_carbs: data.goals.daily_carbs || "",
                    daily_fats: data.goals.daily_fats || "",
                    current_weight: data.goals.current_weight || "",
                    target_weight: data.goals.target_weight || ""
                });
            }
        } catch (err) {
            console.error("Erro ao carregar metas:", err);
            setError("Erro ao carregar metas");
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        setError(null);
        setSuccess(null);
        
        try {
            const goalsToSave = {
                daily_calories: goals.daily_calories ? parseFloat(goals.daily_calories) : null,
                daily_protein: goals.daily_protein ? parseFloat(goals.daily_protein) : null,
                daily_carbs: goals.daily_carbs ? parseFloat(goals.daily_carbs) : null,
                daily_fats: goals.daily_fats ? parseFloat(goals.daily_fats) : null,
                current_weight: goals.current_weight ? parseFloat(goals.current_weight) : null,
                target_weight: goals.target_weight ? parseFloat(goals.target_weight) : null
            };
            
            const viewAsParam = viewAsStudentId ? `&view_as=${viewAsStudentId}` : '';
            const response = await fetch(`${API_CONFIG.BASE_URL}/health/goals?user_id=${userId}${viewAsParam}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(goalsToSave)
            });
            
            const data = await response.json();
            
            if (data.success) {
                setSuccess("Metas salvas com sucesso! 🎉");
                if (onUpdate) {
                    onUpdate();
                }
                setTimeout(() => setSuccess(null), 3000);
            } else {
                setError(data.error || "Erro ao salvar metas");
            }
        } catch (err) {
            console.error("Erro ao salvar metas:", err);
            setError("Erro ao conectar com o servidor");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSuggestGoals = async () => {
        if (!suggestionData.weight || !suggestionData.height || !suggestionData.age) {
            setError("Preencha peso, altura e idade para obter sugestões");
            return;
        }
        
        setIsSuggesting(true);
        setError(null);
        
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/health/suggest_goals`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    weight: parseFloat(suggestionData.weight),
                    height: parseFloat(suggestionData.height),
                    age: parseInt(suggestionData.age),
                    gender: suggestionData.gender,
                    goal: suggestionData.goal,
                    activity_level: suggestionData.activity_level,
                    // Passa peso alvo se existir para detectar recomposição implícita
                    target_weight: goals.target_weight ? parseFloat(goals.target_weight) : null
                })
            });
            
            const data = await response.json();
            
            if (data.success && data.suggested_goals) {
                const suggested = data.suggested_goals;
                setGoals({
                    daily_calories: suggested.daily_calories || "",
                    daily_protein: suggested.daily_protein || "",
                    daily_carbs: suggested.daily_carbs || "",
                    daily_fats: suggested.daily_fats || "",
                    current_weight: suggestionData.weight,
                    target_weight: goals.target_weight || ""
                });
                setShowSuggestionForm(false);
                setSuccess("Metas sugeridas aplicadas! Revise e salve quando estiver pronto. ✨");
                setTimeout(() => setSuccess(null), 5000);
            } else {
                setError(data.error || "Erro ao obter sugestões");
            }
        } catch (err) {
            console.error("Erro ao obter sugestões:", err);
            setError("Erro ao conectar com o servidor");
        } finally {
            setIsSuggesting(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center">
                    <Loader2 size={48} className="animate-spin text-green-400 mx-auto mb-4" />
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Carregando metas...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <Target size={20} className="text-green-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                            Metas Nutricionais
                        </h2>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Configure suas metas diárias de calorias e macros
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowSuggestionForm(!showSuggestionForm)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 border border-green-500/30 hover:border-green-500/50 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95"
                >
                    <Sparkles size={18} className="text-green-400" />
                    <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                        Usar sugestão da Luna
                    </span>
                </button>
            </div>

            {/* Mensagens de feedback */}
            {error && (
                <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl flex items-center gap-3">
                    <AlertCircle size={20} className="text-red-400" />
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}
            
            {success && (
                <div className="p-4 bg-green-500/20 border border-green-500/30 rounded-xl flex items-center gap-3">
                    <CheckCircle2 size={20} className="text-green-400" />
                    <p className="text-sm text-green-400">{success}</p>
                </div>
            )}

            {/* Formulário de sugestão */}
            {showSuggestionForm && (
                <div className="p-6 bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-teal-500/10 rounded-2xl border border-green-500/20">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                        Obter Sugestões Personalizadas
                    </h3>
                    <div className="grid grid-cols-2 gap-4 mb-4">
                        <div>
                            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                                Peso (kg)
                            </label>
                            <input
                                type="number"
                                value={suggestionData.weight}
                                onChange={(e) => setSuggestionData({ ...suggestionData, weight: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border transition-all focus:outline-none focus:border-green-500/50"
                                style={{
                                    background: 'var(--bg-tertiary)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--text-primary)'
                                }}
                                placeholder="Ex: 70"
                            />
                        </div>
                        <div>
                            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                                Altura (cm)
                            </label>
                            <input
                                type="number"
                                value={suggestionData.height}
                                onChange={(e) => setSuggestionData({ ...suggestionData, height: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border transition-all focus:outline-none focus:border-green-500/50"
                                style={{
                                    background: 'var(--bg-tertiary)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--text-primary)'
                                }}
                                placeholder="Ex: 175"
                            />
                        </div>
                        <div>
                            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                                Idade
                            </label>
                            <input
                                type="number"
                                value={suggestionData.age}
                                onChange={(e) => setSuggestionData({ ...suggestionData, age: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border transition-all focus:outline-none focus:border-green-500/50"
                                style={{
                                    background: 'var(--bg-tertiary)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--text-primary)'
                                }}
                                placeholder="Ex: 30"
                            />
                        </div>
                        <div>
                            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                                Gênero
                            </label>
                            <select
                                value={suggestionData.gender}
                                onChange={(e) => setSuggestionData({ ...suggestionData, gender: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border transition-all focus:outline-none focus:border-green-500/50"
                                style={{
                                    background: 'var(--bg-tertiary)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                <option value="male">Masculino</option>
                                <option value="female">Feminino</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                                Objetivo
                            </label>
                            <select
                                value={suggestionData.goal}
                                onChange={(e) => setSuggestionData({ ...suggestionData, goal: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border transition-all focus:outline-none focus:border-green-500/50"
                                style={{
                                    background: 'var(--bg-tertiary)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                <option value="lose">Emagrecer (perder peso)</option>
                                <option value="maintain">Manter peso</option>
                                <option value="gain">Ganhar massa (aumentar peso)</option>
                                <option value="recomposition">Recomposição corporal (trocar gordura por músculo)</option>
                            </select>
                            {suggestionData.goal === "recomposition" && (
                                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                    💡 Ideal para quem treina e quer manter o peso, mas trocar gordura por músculo.
                                </p>
                            )}
                        </div>
                        <div>
                            <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>
                                Nível de atividade
                            </label>
                            <select
                                value={suggestionData.activity_level}
                                onChange={(e) => setSuggestionData({ ...suggestionData, activity_level: e.target.value })}
                                className="w-full px-3 py-2 rounded-lg border transition-all focus:outline-none focus:border-green-500/50"
                                style={{
                                    background: 'var(--bg-tertiary)',
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                <option value="sedentary">Sedentário</option>
                                <option value="light">Leve (1-3x/semana)</option>
                                <option value="moderate">Moderado (3-5x/semana)</option>
                                <option value="active">Ativo (6-7x/semana)</option>
                                <option value="very_active">Muito ativo</option>
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={handleSuggestGoals}
                            disabled={isSuggesting}
                            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white rounded-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSuggesting ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    <span>Calculando...</span>
                                </>
                            ) : (
                                <>
                                    <Sparkles size={18} />
                                    <span>Obter Sugestões</span>
                                </>
                            )}
                        </button>
                        <button
                            onClick={() => setShowSuggestionForm(false)}
                            className="px-4 py-2 rounded-xl border transition-colors hover:bg-white/10"
                            style={{
                                borderColor: 'var(--border-color)',
                                color: 'var(--text-secondary)'
                            }}
                        >
                            Cancelar
                        </button>
                    </div>
                </div>
            )}

            {/* Formulário de Metas */}
            <div className="bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-teal-500/10 rounded-2xl p-6 border border-green-500/20">
                <h3 className="text-lg font-semibold mb-6" style={{ color: 'var(--text-primary)' }}>
                    Configurar Metas
                </h3>
                
                <div className="space-y-6">
                    {/* Calorias */}
                    <div>
                        <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                            <div className="flex items-center gap-2">
                                <TrendingUp size={16} />
                                Calorias Diárias (kcal)
                            </div>
                        </label>
                        <input
                            type="number"
                            value={goals.daily_calories}
                            onChange={(e) => setGoals({ ...goals, daily_calories: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border-2 transition-all focus:outline-none focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20"
                            style={{
                                background: 'var(--bg-tertiary)',
                                borderColor: 'var(--border-color)',
                                color: 'var(--text-primary)'
                            }}
                            placeholder="Ex: 2000"
                        />
                    </div>

                    {/* Macros */}
                    <div>
                        <label className="block text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
                            Macros Diários (gramas)
                        </label>
                        <div className="grid grid-cols-3 gap-4">
                            <div>
                                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                                    Proteína (g)
                                </label>
                                <input
                                    type="number"
                                    value={goals.daily_protein}
                                    onChange={(e) => setGoals({ ...goals, daily_protein: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border transition-all focus:outline-none focus:border-green-500/50"
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--text-primary)'
                                    }}
                                    placeholder="Ex: 80"
                                />
                            </div>
                            <div>
                                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                                    Carboidratos (g)
                                </label>
                                <input
                                    type="number"
                                    value={goals.daily_carbs}
                                    onChange={(e) => setGoals({ ...goals, daily_carbs: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border transition-all focus:outline-none focus:border-green-500/50"
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--text-primary)'
                                    }}
                                    placeholder="Ex: 250"
                                />
                            </div>
                            <div>
                                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                                    Gorduras (g)
                                </label>
                                <input
                                    type="number"
                                    value={goals.daily_fats}
                                    onChange={(e) => setGoals({ ...goals, daily_fats: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border transition-all focus:outline-none focus:border-green-500/50"
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--text-primary)'
                                    }}
                                    placeholder="Ex: 65"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Peso */}
                    <div>
                        <label className="block text-sm font-medium mb-4" style={{ color: 'var(--text-primary)' }}>
                            Peso
                        </label>
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                                    Peso Atual (kg)
                                </label>
                                <input
                                    type="number"
                                    value={goals.current_weight}
                                    onChange={(e) => setGoals({ ...goals, current_weight: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border transition-all focus:outline-none focus:border-green-500/50"
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--text-primary)'
                                    }}
                                    placeholder="Ex: 70"
                                />
                            </div>
                            <div>
                                <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>
                                    Peso Alvo (kg)
                                </label>
                                <input
                                    type="number"
                                    value={goals.target_weight}
                                    onChange={(e) => setGoals({ ...goals, target_weight: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border transition-all focus:outline-none focus:border-green-500/50"
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--text-primary)'
                                    }}
                                    placeholder="Ex: 65"
                                />
                            </div>
                        </div>
                        {goals.current_weight && goals.target_weight && (
                            <div className="mt-3 p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                                <div className="flex items-center gap-2">
                                    {parseFloat(goals.target_weight) < parseFloat(goals.current_weight) ? (
                                        <TrendingDown size={16} className="text-green-400" />
                                    ) : parseFloat(goals.target_weight) > parseFloat(goals.current_weight) ? (
                                        <TrendingUp size={16} className="text-blue-400" />
                                    ) : (
                                        <Minus size={16} className="text-gray-400" />
                                    )}
                                    <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        Diferença: {Math.abs(parseFloat(goals.target_weight) - parseFloat(goals.current_weight)).toFixed(1)} kg
                                        {parseFloat(goals.target_weight) < parseFloat(goals.current_weight) ? " a perder" : 
                                         parseFloat(goals.target_weight) > parseFloat(goals.current_weight) ? " a ganhar" : 
                                         " (manter peso)"}
                                    </span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Botão Salvar */}
                <div className="mt-6 flex justify-end">
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white rounded-xl transition-all duration-300 shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 hover:scale-105 active:scale-95 font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isSaving ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                <span>Salvando...</span>
                            </>
                        ) : (
                            <>
                                <Save size={18} />
                                <span>Salvar Metas</span>
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
