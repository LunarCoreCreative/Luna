import React, { useState, useEffect } from "react";
import {
    Plus,
    Edit3,
    Trash2,
    Coffee,
    UtensilsCrossed,
    Sunset,
    Cookie,
    Target,
    TrendingUp,
    Loader2,
    Calendar,
    MessageCircle,
    Sparkles,
    ClipboardList,
    Play,
    X
} from "lucide-react";
import { API_CONFIG } from "../../config/api";

// Ícones para tipos de refeição
const mealTypeIcons = {
    breakfast: Coffee,
    lunch: UtensilsCrossed,
    dinner: Sunset,
    snack: Cookie
};

const mealTypeLabels = {
    breakfast: "Café da manhã",
    lunch: "Almoço",
    dinner: "Jantar",
    snack: "Lanche"
};

export function TodayTab({ userId = "local", viewAsStudentId = null, onAddMeal, onEditMeal, onDeleteMeal, onUpdate, onOpenChat, onUseFromPlan }) {
    const [overview, setOverview] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    
    // Modal para usar preset do plano
    const [showPlanModal, setShowPlanModal] = useState(false);
    const [presets, setPresets] = useState([]);
    const [presetsLoading, setPresetsLoading] = useState(false);

    // Carregar dados do dia
    const loadTodayData = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const viewAsParam = viewAsStudentId ? `&view_as=${viewAsStudentId}` : '';
            const response = await fetch(
                `${API_CONFIG.BASE_URL}/health/daily_overview?user_id=${userId}&date=${selectedDate}&meals_limit=20${viewAsParam}`
            );
            const data = await response.json();
            
            if (data.success) {
                setOverview(data.overview);
            } else {
                setError("Erro ao carregar dados do dia");
            }
        } catch (err) {
            console.error("Erro ao carregar daily overview:", err);
            setError("Erro ao conectar com o servidor");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadTodayData();
    }, [userId, selectedDate, viewAsStudentId]);

    // Recarregar quando onUpdate mudar (trigger de refresh)
    useEffect(() => {
        if (onUpdate !== undefined && onUpdate !== null) {
            loadTodayData();
        }
    }, [onUpdate, userId, selectedDate, viewAsStudentId]);

    // Carregar presets quando abrir modal
    const loadPresets = async () => {
        setPresetsLoading(true);
        try {
            const viewAsParam = viewAsStudentId ? `&view_as=${viewAsStudentId}` : '';
            const response = await fetch(`${API_CONFIG.BASE_URL}/health/meal-presets?user_id=${userId}${viewAsParam}`);
            const data = await response.json();
            
            if (data.success) {
                setPresets(data.presets || []);
            }
        } catch (err) {
            console.error("Erro ao carregar presets:", err);
        } finally {
            setPresetsLoading(false);
        }
    };

    const handleOpenPlanModal = () => {
        setShowPlanModal(true);
        loadPresets();
    };

    const handleUsePreset = (preset) => {
        if (onUseFromPlan) {
            onUseFromPlan(preset);
        }
        setShowPlanModal(false);
    };

    // Calcular porcentagem para barras de progresso
    const getPercentage = (current, goal) => {
        if (!goal || goal === 0) return 0;
        return Math.min((current / goal) * 100, 100);
    };

    // Formatar número
    const formatNumber = (num) => {
        if (num === null || num === undefined) return "0";
        return Number(num).toFixed(1);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center">
                    <Loader2 size={48} className="animate-spin text-green-400 mx-auto mb-4" />
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Carregando dados do dia...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center">
                    <p className="text-red-400 mb-2">{error}</p>
                    <button
                        onClick={loadTodayData}
                        className="px-4 py-2 bg-green-500 hover:bg-green-400 text-white rounded-lg transition-colors"
                    >
                        Tentar novamente
                    </button>
                </div>
            </div>
        );
    }

    const summary = overview?.summary || {};
    const meals = overview?.recent_meals || [];
    const goals = summary.goals || {};

    const totalCalories = summary.total_calories || 0;
    const totalProtein = summary.total_protein || 0;
    const totalCarbs = summary.total_carbs || 0;
    const totalFats = summary.total_fats || 0;

    const goalCalories = goals.daily_calories || 0;
    const goalProtein = goals.daily_protein || 0;
    const goalCarbs = goals.daily_carbs || 0;
    const goalFats = goals.daily_fats || 0;

    const remainingCalories = summary.remaining_calories || 0;
    const remainingProtein = summary.remaining_protein || 0;
    const remainingCarbs = summary.remaining_carbs || 0;
    const remainingFats = summary.remaining_fats || 0;

    // Verificar se é hoje
    const today = new Date().toISOString().split('T')[0];
    const isToday = selectedDate === today;

    return (
        <div className="space-y-6">
            {/* Seletor de Data */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <Calendar size={20} style={{ color: 'var(--text-secondary)' }} />
                    <input
                        type="date"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        className="px-4 py-2 rounded-lg border transition-all focus:outline-none focus:border-green-500/50"
                        style={{
                            background: 'var(--bg-tertiary)',
                            borderColor: 'var(--border-color)',
                            color: 'var(--text-primary)'
                        }}
                    />
                    {isToday && (
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-sm font-medium">
                            Hoje
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleOpenPlanModal}
                        className="flex items-center gap-2 px-4 py-2.5 border rounded-xl transition-all duration-300 hover:bg-green-500/10 font-medium"
                        style={{ 
                            borderColor: 'rgba(74, 222, 128, 0.3)',
                            color: 'var(--text-primary)'
                        }}
                    >
                        <ClipboardList size={18} className="text-green-400" />
                        Usar do Plano
                    </button>
                    <button
                        onClick={onAddMeal}
                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white rounded-xl transition-all duration-300 shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 hover:scale-105 active:scale-95 font-semibold"
                    >
                        <Plus size={18} />
                        Adicionar
                    </button>
                </div>
            </div>

            {/* Sessão: Resumo do Dia */}
            <div className="bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-teal-500/10 rounded-2xl p-6 border border-green-500/20">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                            <Target size={20} className="text-green-400" />
                        </div>
                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                            Resumo do Dia
                        </h2>
                    </div>
                </div>

                <div className="space-y-5">
                    {/* Calorias */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                                <TrendingUp size={16} style={{ color: 'var(--text-secondary)' }} />
                                <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                    Calorias
                                </span>
                            </div>
                            <span className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>
                                {formatNumber(totalCalories)} / {formatNumber(goalCalories)} kcal
                            </span>
                        </div>
                        <div className="w-full h-3 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-gradient-to-r from-green-500 to-emerald-500 transition-all duration-500 rounded-full shadow-lg shadow-green-500/30"
                                style={{ width: `${getPercentage(totalCalories, goalCalories)}%` }}
                            />
                        </div>
                        {goalCalories > 0 && (
                            <div className="flex items-center justify-between mt-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                <span>Restante: {formatNumber(remainingCalories)} kcal</span>
                                <span>{getPercentage(totalCalories, goalCalories).toFixed(0)}%</span>
                            </div>
                        )}
                    </div>

                    {/* Macros */}
                    <div className="grid grid-cols-3 gap-4">
                        {/* Proteína */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                                    Proteína
                                </span>
                                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                                    {formatNumber(totalProtein)}g
                                </span>
                            </div>
                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500 rounded-full"
                                    style={{ width: `${getPercentage(totalProtein, goalProtein)}%` }}
                                />
                            </div>
                            {goalProtein > 0 && (
                                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                                    {formatNumber(remainingProtein)}g restante
                                </div>
                            )}
                        </div>

                        {/* Carboidratos */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                                    Carboidratos
                                </span>
                                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                                    {formatNumber(totalCarbs)}g
                                </span>
                            </div>
                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500 rounded-full"
                                    style={{ width: `${getPercentage(totalCarbs, goalCarbs)}%` }}
                                />
                            </div>
                            {goalCarbs > 0 && (
                                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                                    {formatNumber(remainingCarbs)}g restante
                                </div>
                            )}
                        </div>

                        {/* Gorduras */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                                    Gorduras
                                </span>
                                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
                                    {formatNumber(totalFats)}g
                                </span>
                            </div>
                            <div className="w-full h-2 bg-white/5 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-500 rounded-full"
                                    style={{ width: `${getPercentage(totalFats, goalFats)}%` }}
                                />
                            </div>
                            {goalFats > 0 && (
                                <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                                    {formatNumber(remainingFats)}g restante
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Botões "Perguntar para Luna" */}
                {onOpenChat && (
                    <div className="mt-6 pt-6 border-t border-green-500/20">
                        <div className="flex flex-wrap gap-3">
                            <button
                                onClick={() => onOpenChat("Como posso melhorar minha alimentação hoje?")}
                                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 border border-green-500/30 hover:border-green-500/50 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 group"
                            >
                                <MessageCircle size={18} className="text-green-400 group-hover:scale-110 transition-transform" />
                                <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                    Perguntar para Luna
                                </span>
                            </button>
                            <button
                                onClick={() => onOpenChat("Quais alimentos devo comer para atingir minhas metas?")}
                                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 border border-green-500/30 hover:border-green-500/50 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 group"
                            >
                                <Sparkles size={18} className="text-green-400 group-hover:scale-110 transition-transform" />
                                <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                    Sugestões de alimentos
                                </span>
                            </button>
                            <button
                                onClick={() => onOpenChat("Me dê dicas nutricionais para hoje")}
                                className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 border border-green-500/30 hover:border-green-500/50 rounded-xl transition-all duration-300 hover:scale-105 active:scale-95 group"
                            >
                                <TrendingUp size={18} className="text-green-400 group-hover:scale-110 transition-transform" />
                                <span className="font-medium text-sm" style={{ color: 'var(--text-primary)' }}>
                                    Dicas para hoje
                                </span>
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Lista de Refeições do Dia */}
            <div>
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                        Refeições ({meals.length})
                    </h3>
                </div>

                {meals.length === 0 ? (
                    <div className="text-center py-12 rounded-2xl border border-dashed" style={{ borderColor: 'var(--border-color)' }}>
                        <div className="relative inline-block mb-4">
                            <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full animate-pulse" />
                            <UtensilsCrossed size={48} className="relative mx-auto opacity-60" style={{ color: 'var(--text-secondary)' }} />
                        </div>
                        <p className="text-base font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                            Nenhuma refeição registrada
                        </p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Clique em "Adicionar Refeição" para começar!
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {meals.map((meal) => {
                            const MealIcon = mealTypeIcons[meal.meal_type] || UtensilsCrossed;
                            const mealLabel = mealTypeLabels[meal.meal_type] || meal.meal_type;

                            return (
                                <div
                                    key={meal.id}
                                    className="group p-5 rounded-2xl border transition-all duration-300 hover:scale-[1.01] hover:shadow-xl"
                                    style={{
                                        background: 'linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)',
                                        borderColor: 'var(--border-color)'
                                    }}
                                >
                                    <div className="flex items-start justify-between gap-4">
                                        {/* Ícone e Tipo */}
                                        <div className="flex items-start gap-4 flex-1">
                                            <div className="w-12 h-12 rounded-xl bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                                <MealIcon size={24} className="text-green-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-medium px-2 py-1 rounded-full bg-green-500/20 text-green-400">
                                                        {mealLabel}
                                                    </span>
                                                    {meal.time && (
                                                        <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                            {meal.time}
                                                        </span>
                                                    )}
                                                </div>
                                                <h4 className="font-semibold text-lg mb-2" style={{ color: 'var(--text-primary)' }}>
                                                    {meal.name || meal.food_name || "Refeição sem nome"}
                                                </h4>
                                                
                                                {/* Macros */}
                                                {(meal.calories || meal.protein || meal.carbs || meal.fats) && (
                                                    <div className="flex flex-wrap items-center gap-4 text-sm">
                                                        {meal.calories && (
                                                            <div>
                                                                <span className="font-semibold text-green-400">
                                                                    {formatNumber(meal.calories)} kcal
                                                                </span>
                                                            </div>
                                                        )}
                                                        {meal.protein && (
                                                            <div>
                                                                <span style={{ color: 'var(--text-secondary)' }}>P: </span>
                                                                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                                                    {formatNumber(meal.protein)}g
                                                                </span>
                                                            </div>
                                                        )}
                                                        {meal.carbs && (
                                                            <div>
                                                                <span style={{ color: 'var(--text-secondary)' }}>C: </span>
                                                                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                                                    {formatNumber(meal.carbs)}g
                                                                </span>
                                                            </div>
                                                        )}
                                                        {meal.fats && (
                                                            <div>
                                                                <span style={{ color: 'var(--text-secondary)' }}>G: </span>
                                                                <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                                                    {formatNumber(meal.fats)}g
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                                
                                                {/* Notas */}
                                                {meal.notes && (
                                                    <p className="text-sm mt-2" style={{ color: 'var(--text-secondary)' }}>
                                                        {meal.notes}
                                                    </p>
                                                )}
                                            </div>
                                        </div>

                                        {/* Ações */}
                                        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => onEditMeal && onEditMeal(meal)}
                                                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                                style={{ color: 'var(--text-secondary)' }}
                                                title="Editar"
                                            >
                                                <Edit3 size={18} />
                                            </button>
                                            <button
                                                onClick={() => onDeleteMeal && onDeleteMeal(meal)}
                                                className="p-2 rounded-lg hover:bg-red-500/20 hover:text-red-400 transition-colors"
                                                style={{ color: 'var(--text-secondary)' }}
                                                title="Apagar"
                                            >
                                                <Trash2 size={18} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Modal: Usar do Plano */}
            {showPlanModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div 
                        className="w-full max-w-lg max-h-[70vh] overflow-y-auto rounded-2xl border shadow-2xl"
                        style={{ 
                            background: 'var(--bg-primary)',
                            borderColor: 'var(--border-color)'
                        }}
                    >
                        <div className="sticky top-0 z-10 px-6 py-4 border-b flex items-center justify-between" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                            <div className="flex items-center gap-3">
                                <ClipboardList size={24} className="text-green-400" />
                                <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                                    Usar do Plano Alimentar
                                </h3>
                            </div>
                            <button
                                onClick={() => setShowPlanModal(false)}
                                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X size={20} style={{ color: 'var(--text-secondary)' }} />
                            </button>
                        </div>
                        
                        <div className="p-4 space-y-3">
                            {presetsLoading ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 size={32} className="animate-spin text-green-400" />
                                </div>
                            ) : presets.length === 0 ? (
                                <div className="text-center py-8">
                                    <ClipboardList size={40} className="mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                                    <p style={{ color: 'var(--text-secondary)' }}>
                                        Nenhum preset disponível
                                    </p>
                                    <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
                                        Crie presets na aba "Plano Alimentar"
                                    </p>
                                </div>
                            ) : (
                                presets.map(preset => (
                                    <button
                                        key={preset.id}
                                        onClick={() => handleUsePreset(preset)}
                                        className="w-full p-4 rounded-xl border text-left transition-all hover:border-green-500/50 hover:bg-green-500/10"
                                        style={{ 
                                            background: 'var(--bg-tertiary)',
                                            borderColor: 'var(--border-color)'
                                        }}
                                    >
                                        <div className="flex items-center gap-3">
                                            <span className="text-2xl">
                                                {preset.meal_type === "breakfast" ? "🍳" :
                                                 preset.meal_type === "lunch" ? "🥗" :
                                                 preset.meal_type === "dinner" ? "🍽️" :
                                                 preset.meal_type === "snack" ? "🥜" :
                                                 preset.meal_type === "pre_workout" ? "💪" :
                                                 preset.meal_type === "post_workout" ? "🥤" : "🍴"}
                                            </span>
                                            <div className="flex-1 min-w-0">
                                                <h4 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                                    {preset.name}
                                                </h4>
                                                <div className="flex items-center gap-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                                    <span className="text-green-400">{preset.total_calories} kcal</span>
                                                    <span>P: {preset.total_protein}g</span>
                                                    <span>C: {preset.total_carbs}g</span>
                                                    <span>G: {preset.total_fats}g</span>
                                                </div>
                                                {preset.created_by_evaluator && (
                                                    <span className="text-xs text-blue-400">📋 Do avaliador</span>
                                                )}
                                            </div>
                                            <Play size={20} className="text-green-400 flex-shrink-0" />
                                        </div>
                                    </button>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
