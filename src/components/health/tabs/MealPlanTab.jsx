import React, { useState, useEffect } from "react";
import {
    Plus,
    Loader2,
    Clock,
    Edit2,
    Trash2,
    ChevronDown,
    ChevronUp,
    Play,
    AlertCircle,
    CheckCircle2,
    X,
    Search
} from "lucide-react";
import { API_CONFIG } from "../../../config/api";

// Ícones por tipo de refeição
const MEAL_TYPE_ICONS = {
    breakfast: "🍳",
    morning_snack: "🍎",
    lunch: "🥗",
    afternoon_snack: "🍌",
    pre_workout: "💪",
    post_workout: "🥤",
    dinner: "🍽️",
    supper: "🌙",
    snack: "🥜"
};

const MEAL_TYPE_NAMES = {
    breakfast: "Café da Manhã",
    morning_snack: "Lanche da Manhã",
    lunch: "Almoço",
    afternoon_snack: "Lanche da Tarde",
    pre_workout: "Pré-Treino",
    post_workout: "Pós-Treino",
    dinner: "Jantar",
    supper: "Ceia",
    snack: "Lanche"
};

export function MealPlanTab({ userId = "local", onRefresh, onUseMeal }) {
    const [presets, setPresets] = useState([]);
    const [evaluatorPresets, setEvaluatorPresets] = useState([]);
    const [ownPresets, setOwnPresets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    
    // Modal de criação/edição
    const [showModal, setShowModal] = useState(false);
    const [editingPreset, setEditingPreset] = useState(null);
    const [formData, setFormData] = useState({
        name: "",
        meal_type: "breakfast",
        suggested_time: "",
        notes: "",
        foods: []
    });
    const [isSaving, setIsSaving] = useState(false);
    
    // Busca de alimentos
    const [foodSearch, setFoodSearch] = useState("");
    const [foodResults, setFoodResults] = useState([]);
    const [isSearching, setIsSearching] = useState(false);

    // Expandir seções
    const [expandEvaluator, setExpandEvaluator] = useState(true);
    const [expandOwn, setExpandOwn] = useState(true);

    useEffect(() => {
        loadPresets();
    }, [userId]);

    const loadPresets = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/health/meal-presets?user_id=${userId}`);
            const data = await response.json();
            
            if (data.success) {
                setPresets(data.presets || []);
                setEvaluatorPresets(data.evaluator_presets || []);
                setOwnPresets(data.own_presets || []);
            } else {
                setError(data.detail || "Erro ao carregar plano alimentar");
            }
        } catch (err) {
            console.error("Erro ao carregar presets:", err);
            setError("Erro ao conectar com o servidor");
        } finally {
            setIsLoading(false);
        }
    };

    const searchFoods = async (query) => {
        if (!query || query.length < 2) {
            setFoodResults([]);
            return;
        }
        
        setIsSearching(true);
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/health/foods/search?q=${encodeURIComponent(query)}&limit=10`);
            const data = await response.json();
            
            if (data.success) {
                setFoodResults(data.foods || []);
            }
        } catch (err) {
            console.error("Erro ao buscar alimentos:", err);
        } finally {
            setIsSearching(false);
        }
    };

    const addFoodToPreset = (food) => {
        const newFood = {
            food_name: food.name || food.food_name,
            quantity: 100,
            unit: "g",
            calories: food.calories || 0,
            protein: food.protein || 0,
            carbs: food.carbs || 0,
            fats: food.fats || 0
        };
        
        setFormData(prev => ({
            ...prev,
            foods: [...prev.foods, newFood]
        }));
        setFoodSearch("");
        setFoodResults([]);
    };

    const removeFoodFromPreset = (index) => {
        setFormData(prev => ({
            ...prev,
            foods: prev.foods.filter((_, i) => i !== index)
        }));
    };

    const updateFoodQuantity = (index, quantity) => {
        setFormData(prev => ({
            ...prev,
            foods: prev.foods.map((f, i) => {
                if (i === index) {
                    const ratio = quantity / 100;
                    return {
                        ...f,
                        quantity,
                        // Recalcula macros baseado na quantidade
                        calories: Math.round((f.calories / (f.quantity / 100)) * ratio),
                        protein: Math.round(((f.protein / (f.quantity / 100)) * ratio) * 10) / 10,
                        carbs: Math.round(((f.carbs / (f.quantity / 100)) * ratio) * 10) / 10,
                        fats: Math.round(((f.fats / (f.quantity / 100)) * ratio) * 10) / 10
                    };
                }
                return f;
            })
        }));
    };

    const calculateTotals = () => {
        return formData.foods.reduce((acc, f) => ({
            calories: acc.calories + (f.calories || 0),
            protein: acc.protein + (f.protein || 0),
            carbs: acc.carbs + (f.carbs || 0),
            fats: acc.fats + (f.fats || 0)
        }), { calories: 0, protein: 0, carbs: 0, fats: 0 });
    };

    const handleSavePreset = async () => {
        if (!formData.name.trim()) {
            setError("Nome é obrigatório");
            return;
        }
        
        if (formData.foods.length === 0) {
            setError("Adicione pelo menos um alimento");
            return;
        }
        
        setIsSaving(true);
        setError(null);
        
        try {
            const url = editingPreset 
                ? `${API_CONFIG.BASE_URL}/health/meal-presets/${editingPreset.id}`
                : `${API_CONFIG.BASE_URL}/health/meal-presets`;
            
            const method = editingPreset ? "PUT" : "POST";
            
            const response = await fetch(url, {
                method,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...formData,
                    user_id: userId
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                setSuccess(editingPreset ? "Preset atualizado!" : "Preset criado!");
                setShowModal(false);
                setEditingPreset(null);
                resetForm();
                loadPresets();
                setTimeout(() => setSuccess(null), 3000);
            } else {
                setError(data.detail || "Erro ao salvar");
            }
        } catch (err) {
            console.error("Erro ao salvar preset:", err);
            setError("Erro ao conectar com o servidor");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDeletePreset = async (presetId) => {
        if (!confirm("Tem certeza que deseja excluir este preset?")) return;
        
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/health/meal-presets/${presetId}?user_id=${userId}`, {
                method: "DELETE"
            });
            
            const data = await response.json();
            
            if (data.success) {
                setSuccess("Preset excluído!");
                loadPresets();
                setTimeout(() => setSuccess(null), 3000);
            } else {
                setError(data.detail || "Erro ao excluir");
            }
        } catch (err) {
            console.error("Erro ao excluir preset:", err);
            setError("Erro ao conectar com o servidor");
        }
    };

    const handleEditPreset = (preset) => {
        setEditingPreset(preset);
        setFormData({
            name: preset.name,
            meal_type: preset.meal_type,
            suggested_time: preset.suggested_time || "",
            notes: preset.notes || "",
            foods: preset.foods || []
        });
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({
            name: "",
            meal_type: "breakfast",
            suggested_time: "",
            notes: "",
            foods: []
        });
    };

    const PresetCard = ({ preset, isEvaluator = false }) => (
        <div 
            className="p-4 rounded-xl border transition-all hover:border-green-500/30"
            style={{ 
                background: 'var(--bg-tertiary)',
                borderColor: 'var(--border-color)'
            }}
        >
            <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1 min-w-0">
                    <span className="text-3xl">{MEAL_TYPE_ICONS[preset.meal_type] || "🍽️"}</span>
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                                {preset.name}
                            </h4>
                            <span 
                                className="px-2 py-0.5 text-xs rounded-full"
                                style={{ 
                                    background: isEvaluator ? 'rgba(59, 130, 246, 0.2)' : 'rgba(74, 222, 128, 0.2)',
                                    color: isEvaluator ? '#60a5fa' : '#4ade80'
                                }}
                            >
                                {MEAL_TYPE_NAMES[preset.meal_type]}
                            </span>
                        </div>
                        
                        <div className="flex items-center gap-4 mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                            <span>🔥 {preset.total_calories} kcal</span>
                            <span>P: {preset.total_protein}g</span>
                            <span>C: {preset.total_carbs}g</span>
                            <span>G: {preset.total_fats}g</span>
                        </div>
                        
                        {preset.suggested_time && (
                            <div className="flex items-center gap-1 mt-1 text-xs" style={{ color: 'var(--text-muted)' }}>
                                <Clock size={12} />
                                <span>{preset.suggested_time}</span>
                            </div>
                        )}
                        
                        {preset.foods && preset.foods.length > 0 && (
                            <div className="mt-2 space-y-1">
                                {preset.foods.slice(0, 4).map((f, idx) => (
                                    <div key={idx} className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
                                        <span className="w-1 h-1 rounded-full bg-green-400/50"></span>
                                        <span style={{ color: 'var(--text-secondary)' }}>{f.food_name}</span>
                                        <span className="text-green-400/70 font-medium">{f.quantity || 100}g</span>
                                    </div>
                                ))}
                                {preset.foods.length > 4 && (
                                    <p className="text-xs pl-3" style={{ color: 'var(--text-muted)' }}>
                                        +{preset.foods.length - 4} mais...
                                    </p>
                                )}
                            </div>
                        )}
                        
                        {isEvaluator && (
                            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                                📋 Criado pelo avaliador
                            </p>
                        )}
                    </div>
                </div>
                
                <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                        onClick={() => onUseMeal && onUseMeal(preset)}
                        className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors"
                        title="Usar hoje"
                    >
                        <Play size={16} />
                    </button>
                    {!isEvaluator && (
                        <>
                            <button
                                onClick={() => handleEditPreset(preset)}
                                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                                style={{ color: 'var(--text-secondary)' }}
                                title="Editar"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button
                                onClick={() => handleDeletePreset(preset.id)}
                                className="p-2 rounded-lg hover:bg-red-500/20 text-red-400 transition-colors"
                                title="Excluir"
                            >
                                <Trash2 size={16} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center">
                    <Loader2 size={48} className="animate-spin text-green-400 mx-auto mb-4" />
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Carregando plano alimentar...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        🍽️ Plano Alimentar
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                        Crie e gerencie seus presets de refeições
                    </p>
                </div>
                <button
                    onClick={() => {
                        resetForm();
                        setEditingPreset(null);
                        setShowModal(true);
                    }}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white rounded-xl transition-all"
                >
                    <Plus size={18} />
                    <span>Novo Preset</span>
                </button>
            </div>

            {/* Mensagens */}
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

            {/* Presets do Avaliador */}
            {evaluatorPresets.length > 0 && (
                <div className="rounded-xl border" style={{ borderColor: 'var(--border-color)' }}>
                    <button
                        onClick={() => setExpandEvaluator(!expandEvaluator)}
                        className="w-full px-4 py-3 flex items-center justify-between"
                        style={{ background: 'var(--bg-secondary)' }}
                    >
                        <div className="flex items-center gap-2">
                            <span className="text-blue-400">📋</span>
                            <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                                Presets do Avaliador ({evaluatorPresets.length})
                            </span>
                        </div>
                        {expandEvaluator ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                    
                    {expandEvaluator && (
                        <div className="p-4 space-y-3">
                            {evaluatorPresets.map(preset => (
                                <PresetCard key={preset.id} preset={preset} isEvaluator={true} />
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Meus Presets */}
            <div className="rounded-xl border" style={{ borderColor: 'var(--border-color)' }}>
                <button
                    onClick={() => setExpandOwn(!expandOwn)}
                    className="w-full px-4 py-3 flex items-center justify-between"
                    style={{ background: 'var(--bg-secondary)' }}
                >
                    <div className="flex items-center gap-2">
                        <span className="text-green-400">🍽️</span>
                        <span className="font-medium" style={{ color: 'var(--text-primary)' }}>
                            Meus Presets ({ownPresets.length})
                        </span>
                    </div>
                    {expandOwn ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>
                
                {expandOwn && (
                    <div className="p-4 space-y-3">
                        {ownPresets.length === 0 ? (
                            <div className="text-center py-8">
                                <p style={{ color: 'var(--text-muted)' }}>
                                    Nenhum preset criado ainda
                                </p>
                                <button
                                    onClick={() => {
                                        resetForm();
                                        setEditingPreset(null);
                                        setShowModal(true);
                                    }}
                                    className="mt-4 px-4 py-2 text-sm text-green-400 hover:text-green-300 transition-colors"
                                >
                                    + Criar primeiro preset
                                </button>
                            </div>
                        ) : (
                            ownPresets.map(preset => (
                                <PresetCard key={preset.id} preset={preset} isEvaluator={false} />
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* Modal de Criação/Edição */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    <div 
                        className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border shadow-2xl"
                        style={{ 
                            background: 'var(--bg-primary)',
                            borderColor: 'var(--border-color)'
                        }}
                    >
                        <div className="sticky top-0 z-10 px-6 py-4 border-b flex items-center justify-between" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                            <h3 className="text-lg font-semibold" style={{ color: 'var(--text-primary)' }}>
                                {editingPreset ? "Editar Preset" : "Novo Preset"}
                            </h3>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setEditingPreset(null);
                                    resetForm();
                                }}
                                className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            >
                                <X size={20} style={{ color: 'var(--text-secondary)' }} />
                            </button>
                        </div>
                        
                        <div className="p-6 space-y-6">
                            {/* Nome */}
                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                                    Nome do Preset *
                                </label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:border-green-500/50"
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--text-primary)'
                                    }}
                                    placeholder="Ex: Café da manhã com ovos"
                                />
                            </div>

                            {/* Tipo e Horário */}
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                                        Tipo de Refeição
                                    </label>
                                    <select
                                        value={formData.meal_type}
                                        onChange={(e) => setFormData({ ...formData, meal_type: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:border-green-500/50"
                                        style={{
                                            background: 'var(--bg-tertiary)',
                                            borderColor: 'var(--border-color)',
                                            color: 'var(--text-primary)'
                                        }}
                                    >
                                        {Object.entries(MEAL_TYPE_NAMES).map(([key, name]) => (
                                            <option key={key} value={key}>
                                                {MEAL_TYPE_ICONS[key]} {name}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                                        Horário Sugerido
                                    </label>
                                    <input
                                        type="time"
                                        value={formData.suggested_time}
                                        onChange={(e) => setFormData({ ...formData, suggested_time: e.target.value })}
                                        className="w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:border-green-500/50"
                                        style={{
                                            background: 'var(--bg-tertiary)',
                                            borderColor: 'var(--border-color)',
                                            color: 'var(--text-primary)'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Busca de Alimentos */}
                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                                    Adicionar Alimentos
                                </label>
                                <div className="relative">
                                    <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'var(--text-muted)' }} />
                                    <input
                                        type="text"
                                        value={foodSearch}
                                        onChange={(e) => {
                                            setFoodSearch(e.target.value);
                                            searchFoods(e.target.value);
                                        }}
                                        className="w-full pl-10 pr-4 py-3 rounded-xl border transition-all focus:outline-none focus:border-green-500/50"
                                        style={{
                                            background: 'var(--bg-tertiary)',
                                            borderColor: 'var(--border-color)',
                                            color: 'var(--text-primary)'
                                        }}
                                        placeholder="Buscar alimento..."
                                    />
                                    {isSearching && (
                                        <Loader2 size={18} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-green-400" />
                                    )}
                                </div>
                                
                                {/* Resultados da busca */}
                                {foodResults.length > 0 && (
                                    <div 
                                        className="mt-2 rounded-xl border max-h-48 overflow-y-auto"
                                        style={{ 
                                            background: 'var(--bg-secondary)',
                                            borderColor: 'var(--border-color)'
                                        }}
                                    >
                                        {foodResults.map((food, index) => (
                                            <button
                                                key={index}
                                                onClick={() => addFoodToPreset(food)}
                                                className="w-full px-4 py-2 text-left hover:bg-green-500/10 transition-colors flex justify-between items-center"
                                            >
                                                <span style={{ color: 'var(--text-primary)' }}>{food.name || food.food_name}</span>
                                                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{food.calories} kcal/100g</span>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Lista de Alimentos Adicionados */}
                            {formData.foods.length > 0 && (
                                <div>
                                    <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                                        Alimentos no Preset ({formData.foods.length})
                                    </label>
                                    <div className="space-y-2">
                                        {formData.foods.map((food, index) => (
                                            <div 
                                                key={index}
                                                className="flex items-center gap-3 p-3 rounded-lg"
                                                style={{ background: 'var(--bg-tertiary)' }}
                                            >
                                                <div className="flex-1 min-w-0">
                                                    <p className="font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                                                        {food.food_name}
                                                    </p>
                                                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                                                        {food.calories} kcal • P: {food.protein}g • C: {food.carbs}g • G: {food.fats}g
                                                    </p>
                                                </div>
                                                <input
                                                    type="number"
                                                    value={food.quantity}
                                                    onChange={(e) => updateFoodQuantity(index, parseFloat(e.target.value) || 0)}
                                                    className="w-20 px-2 py-1 rounded text-center text-sm"
                                                    style={{
                                                        background: 'var(--bg-secondary)',
                                                        color: 'var(--text-primary)',
                                                        border: '1px solid var(--border-color)'
                                                    }}
                                                />
                                                <span className="text-sm" style={{ color: 'var(--text-muted)' }}>g</span>
                                                <button
                                                    onClick={() => removeFoodFromPreset(index)}
                                                    className="p-1 text-red-400 hover:text-red-300 transition-colors"
                                                >
                                                    <X size={16} />
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    {/* Totais */}
                                    <div 
                                        className="mt-3 p-3 rounded-lg"
                                        style={{ background: 'var(--bg-secondary)' }}
                                    >
                                        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                            Totais: 
                                            <span className="ml-2 text-green-400">{calculateTotals().calories} kcal</span>
                                            <span className="ml-3">P: {calculateTotals().protein.toFixed(1)}g</span>
                                            <span className="ml-2">C: {calculateTotals().carbs.toFixed(1)}g</span>
                                            <span className="ml-2">G: {calculateTotals().fats.toFixed(1)}g</span>
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Notas */}
                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                                    Observações
                                </label>
                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full px-4 py-3 rounded-xl border transition-all focus:outline-none focus:border-green-500/50 resize-none"
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--text-primary)'
                                    }}
                                    rows={3}
                                    placeholder="Dicas, substituições permitidas, etc."
                                />
                            </div>
                        </div>

                        {/* Footer */}
                        <div className="sticky bottom-0 px-6 py-4 border-t flex justify-end gap-3" style={{ background: 'var(--bg-primary)', borderColor: 'var(--border-color)' }}>
                            <button
                                onClick={() => {
                                    setShowModal(false);
                                    setEditingPreset(null);
                                    resetForm();
                                }}
                                className="px-4 py-2 rounded-xl border transition-colors hover:bg-white/5"
                                style={{
                                    borderColor: 'var(--border-color)',
                                    color: 'var(--text-secondary)'
                                }}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSavePreset}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white rounded-xl transition-all disabled:opacity-50"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        <span>Salvando...</span>
                                    </>
                                ) : (
                                    <span>Salvar Preset</span>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
