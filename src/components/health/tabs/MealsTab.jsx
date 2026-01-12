import { useState, useMemo } from "react";
import { Search, Plus, Edit3, Trash2, Calendar, Apple } from "lucide-react";
import { API_CONFIG } from "../../../config/api";
import { useModalContext } from "../../../contexts/ModalContext";

/**
 * Tab de Refeições - Modularizado
 */
export function MealsTab({ meals, userId, onRefresh, onEdit, onDelete }) {
    const { showAlert, showConfirm } = useModalContext();
    const [searchQuery, setSearchQuery] = useState("");
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});

    const filteredMeals = useMemo(() => {
        if (!searchQuery.trim()) return meals;
        const query = searchQuery.toLowerCase();
        return meals.filter(meal => 
            meal.name?.toLowerCase().includes(query) ||
            meal.food_name?.toLowerCase().includes(query) ||
            meal.notes?.toLowerCase().includes(query)
        );
    }, [meals, searchQuery]);

    const getMealTimeLabel = (mealType) => {
        if (!mealType) return "Sem horário";
        if (mealType.includes(":")) return mealType;
        const labels = {
            breakfast: "Café da Manhã",
            lunch: "Almoço",
            dinner: "Jantar",
            snack: "Lanche"
        };
        return labels[mealType] || mealType;
    };

    const handleEditMeal = async (mealId) => {
        try {
            const mealData = editData[mealId];
            const res = await fetch(`${API_CONFIG.BASE_URL}/health/meals/${mealId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...mealData,
                    user_id: userId
                })
            });
            const data = await res.json();
            if (data.success) {
                setEditingId(null);
                setEditData({});
                onRefresh();
            } else {
                showAlert(data.error || "Erro ao editar refeição", "error");
            }
        } catch (e) {
            console.error("[HEALTH] Error editing meal:", e);
            showAlert("Erro ao editar refeição", "error");
        }
    };

    const handleDeleteMeal = async (mealId) => {
        const confirmed = await showConfirm(
            "Excluir Refeição",
            "Tem certeza que deseja excluir esta refeição?",
            "Excluir",
            "Cancelar"
        );
        if (!confirmed) return;

        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/health/meals/${mealId}`, {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ user_id: userId })
            });
            const data = await res.json();
            if (data.success) {
                onRefresh();
            } else {
                showAlert(data.error || "Erro ao excluir refeição", "error");
            }
        } catch (e) {
            console.error("[HEALTH] Error deleting meal:", e);
            showAlert("Erro ao excluir refeição", "error");
        }
    };

    return (
        <>
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3 flex-1 max-w-md">
                    <div className="relative flex-1 group">
                        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-200" style={{ color: 'var(--text-secondary)' }} />
                        <input
                            type="text"
                            placeholder="Buscar refeições..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-11 pr-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:border-green-500/50 focus:ring-2 focus:ring-green-500/20 focus:shadow-lg focus:shadow-green-500/10"
                            style={{
                                background: 'var(--bg-tertiary)',
                                borderColor: 'var(--border-color)',
                                color: 'var(--text-primary)'
                            }}
                        />
                    </div>
                </div>
                <button
                    onClick={() => onEdit && onEdit()}
                    className="flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-600 hover:from-green-400 hover:via-emerald-400 hover:to-teal-500 text-white rounded-xl transition-all duration-300 shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 hover:scale-105 active:scale-95 font-semibold"
                >
                    <Plus size={20} className="drop-shadow-sm" />
                    Nova Refeição
                </button>
            </div>

            <div className="space-y-3">
                {filteredMeals.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="relative inline-block mb-6">
                            <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full animate-pulse" />
                            <Apple size={64} className="relative mx-auto opacity-60" style={{ color: 'var(--text-secondary)' }} />
                        </div>
                        <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Nenhuma refeição registrada ainda</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Clique em "Nova Refeição" para começar!</p>
                    </div>
                ) : (
                    filteredMeals.map((meal, idx) => (
                        <div
                            key={meal.id}
                            className="group p-5 rounded-2xl border transition-all duration-300 hover:scale-[1.02] hover:shadow-xl"
                            style={{
                                background: 'linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)',
                                borderColor: 'var(--border-color)',
                                animation: `fadeInUp 0.4s ease-out ${idx * 0.05}s both`
                            }}
                        >
                            {editingId === meal.id ? (
                                <div className="space-y-3">
                                    <input
                                        type="text"
                                        value={editData[meal.id]?.name || meal.name}
                                        onChange={(e) => setEditData({
                                            ...editData,
                                            [meal.id]: { ...editData[meal.id], name: e.target.value }
                                        })}
                                        className="w-full px-3 py-2 rounded-lg border"
                                        style={{
                                            background: 'var(--bg-tertiary)',
                                            borderColor: 'var(--border-color)',
                                            color: 'var(--text-primary)'
                                        }}
                                        placeholder="Nome da refeição"
                                    />
                                    <div className="grid grid-cols-4 gap-2">
                                        <div>
                                            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Calorias</label>
                                            <input
                                                type="number"
                                                value={editData[meal.id]?.calories || meal.calories || ""}
                                                onChange={(e) => setEditData({
                                                    ...editData,
                                                    [meal.id]: { ...editData[meal.id], calories: e.target.value }
                                                })}
                                                className="w-full px-3 py-2 rounded-lg border"
                                                style={{
                                                    background: 'var(--bg-tertiary)',
                                                    borderColor: 'var(--border-color)',
                                                    color: 'var(--text-primary)',
                                                    appearance: 'textfield'
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Proteínas (g)</label>
                                            <input
                                                type="number"
                                                value={editData[meal.id]?.protein || meal.protein || ""}
                                                onChange={(e) => setEditData({
                                                    ...editData,
                                                    [meal.id]: { ...editData[meal.id], protein: e.target.value }
                                                })}
                                                className="w-full px-3 py-2 rounded-lg border"
                                                style={{
                                                    background: 'var(--bg-tertiary)',
                                                    borderColor: 'var(--border-color)',
                                                    color: 'var(--text-primary)',
                                                    appearance: 'textfield'
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Carboidratos (g)</label>
                                            <input
                                                type="number"
                                                value={editData[meal.id]?.carbs || meal.carbs || ""}
                                                onChange={(e) => setEditData({
                                                    ...editData,
                                                    [meal.id]: { ...editData[meal.id], carbs: e.target.value }
                                                })}
                                                className="w-full px-3 py-2 rounded-lg border"
                                                style={{
                                                    background: 'var(--bg-tertiary)',
                                                    borderColor: 'var(--border-color)',
                                                    color: 'var(--text-primary)',
                                                    appearance: 'textfield'
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs mb-1" style={{ color: 'var(--text-secondary)' }}>Gorduras (g)</label>
                                            <input
                                                type="number"
                                                value={editData[meal.id]?.fats || meal.fats || ""}
                                                onChange={(e) => setEditData({
                                                    ...editData,
                                                    [meal.id]: { ...editData[meal.id], fats: e.target.value }
                                                })}
                                                className="w-full px-3 py-2 rounded-lg border"
                                                style={{
                                                    background: 'var(--bg-tertiary)',
                                                    borderColor: 'var(--border-color)',
                                                    color: 'var(--text-primary)',
                                                    appearance: 'textfield'
                                                }}
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEditMeal(meal.id)}
                                            className="flex-1 px-4 py-2 bg-green-500 hover:bg-green-400 text-white rounded-lg transition-colors"
                                        >
                                            Salvar
                                        </button>
                                        <button
                                            onClick={() => {
                                                setEditingId(null);
                                                setEditData({});
                                            }}
                                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors"
                                        >
                                            Cancelar
                                        </button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-4 flex-1">
                                        <div className="relative">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center border border-green-500/20">
                                                <span className="text-xl">🍽️</span>
                                            </div>
                                        </div>
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-bold text-lg" style={{ color: 'var(--text-primary)' }}>{meal.name}</h3>
                                                <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
                                                    {getMealTimeLabel(meal.meal_type)}
                                                </span>
                                            </div>
                                            {meal.calories && (
                                                <div className="flex items-center gap-4 text-sm mb-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <div className="w-1.5 h-1.5 rounded-full bg-orange-400" />
                                                        <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{meal.calories.toFixed(0)} kcal</span>
                                                    </div>
                                                    {meal.protein && (
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                                            <span style={{ color: 'var(--text-secondary)' }}>P: {meal.protein.toFixed(1)}g</span>
                                                        </div>
                                                    )}
                                                    {meal.carbs && (
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                                                            <span style={{ color: 'var(--text-secondary)' }}>C: {meal.carbs.toFixed(1)}g</span>
                                                        </div>
                                                    )}
                                                    {meal.fats && (
                                                        <div className="flex items-center gap-1.5">
                                                            <div className="w-1.5 h-1.5 rounded-full bg-yellow-400" />
                                                            <span style={{ color: 'var(--text-secondary)' }}>G: {meal.fats.toFixed(1)}g</span>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                            {meal.notes && (
                                                <p className="text-sm mt-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10" style={{ color: 'var(--text-secondary)' }}>{meal.notes}</p>
                                            )}
                                            <span className="text-xs mt-2 flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                                                <Calendar size={12} />
                                                {new Date(meal.date).toLocaleDateString('pt-BR')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => {
                                                setEditingId(meal.id);
                                                setEditData({ [meal.id]: { ...meal } });
                                            }}
                                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            <Edit3 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteMeal(meal.id)}
                                            className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                            style={{ color: 'var(--text-secondary)' }}
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </>
    );
}
