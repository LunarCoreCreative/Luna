import { useState, useEffect } from "react";
import { Search, Plus, Apple, X } from "lucide-react";
import { API_CONFIG } from "../../../config/api";
import { useModalContext } from "../../../contexts/ModalContext";

/**
 * Tab de Alimentos - Modularizado
 */
export function FoodsTab({ foods: initialFoods, onRefresh, onLoadFoods }) {
    const { showAlert } = useModalContext();
    const [foods, setFoods] = useState(initialFoods || []);
    const [searchQuery, setSearchQuery] = useState("");
    const [showAddFood, setShowAddFood] = useState(false);
    const [newFood, setNewFood] = useState({
        name: "",
        calories: "",
        protein: "",
        carbs: "",
        fats: ""
    });

    useEffect(() => {
        if (initialFoods) {
            setFoods(initialFoods);
        }
    }, [initialFoods]);

    const searchFoods = async (query) => {
        if (!query || query.length < 1) {
            onLoadFoods?.();
            return;
        }

        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/health/foods/search?query=${encodeURIComponent(query)}&limit=50`);
            const data = await res.json();
            if (data.success) {
                setFoods(data.foods || []);
            }
        } catch (e) {
            console.error("[HEALTH] Error searching foods:", e);
        }
    };

    const handleAddFood = async () => {
        if (!newFood.name.trim()) {
            showAlert("Nome do alimento é obrigatório", "error");
            return;
        }

        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/health/foods/add`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    food_name: newFood.name,
                    calories: parseFloat(newFood.calories) || 0,
                    protein: parseFloat(newFood.protein) || 0,
                    carbs: parseFloat(newFood.carbs) || 0,
                    fats: parseFloat(newFood.fats) || 0
                })
            });

            const data = await res.json();
            if (data.success) {
                setNewFood({ name: "", calories: "", protein: "", carbs: "", fats: "" });
                setShowAddFood(false);
                onRefresh?.();
            } else {
                showAlert(data.error || "Erro ao adicionar alimento", "error");
            }
        } catch (e) {
            console.error("[HEALTH] Error adding food:", e);
            showAlert("Erro ao adicionar alimento", "error");
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
                            placeholder="Buscar alimentos..."
                            value={searchQuery}
                            onChange={(e) => {
                                const query = e.target.value;
                                setSearchQuery(query);
                                searchFoods(query);
                            }}
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
                    onClick={() => setShowAddFood(true)}
                    className="flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-green-500 via-emerald-500 to-teal-600 hover:from-green-400 hover:via-emerald-400 hover:to-teal-500 text-white rounded-xl transition-all duration-300 shadow-lg shadow-green-500/25 hover:shadow-xl hover:shadow-green-500/30 hover:scale-105 active:scale-95 font-semibold"
                >
                    <Plus size={20} className="drop-shadow-sm" />
                    Adicionar Alimento
                </button>
            </div>

            <div className="space-y-4">
                {foods.length === 0 ? (
                    <div className="text-center py-16">
                        <div className="relative inline-block mb-6">
                            <div className="absolute inset-0 bg-green-500/20 blur-2xl rounded-full animate-pulse" />
                            <Apple size={64} className="relative mx-auto opacity-60" style={{ color: 'var(--text-secondary)' }} />
                        </div>
                        <p className="text-lg font-semibold mb-2" style={{ color: 'var(--text-primary)' }}>Nenhum alimento encontrado</p>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Clique em "Adicionar Alimento" para começar!</p>
                    </div>
                ) : (
                    foods.map((food, idx) => (
                        <div
                            key={idx}
                            className="group p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-[1.02] hover:shadow-xl overflow-hidden"
                            style={{
                                background: 'linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)',
                                borderColor: 'var(--border-color)',
                                animation: `fadeInUp 0.4s ease-out ${idx * 0.05}s both`
                            }}
                        >
                            <div className="flex items-start justify-between">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center border border-green-500/20">
                                            <Apple size={24} className="text-green-400" />
                                        </div>
                                        <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                            {food.name}
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-4 gap-4">
                                        <div className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/20">
                                            <div className="text-xs font-semibold uppercase tracking-wider mb-1.5 text-orange-400">Calorias</div>
                                            <div className="text-lg font-bold bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                                                {food.calories || 0} kcal
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/20">
                                            <div className="text-xs font-semibold uppercase tracking-wider mb-1.5 text-blue-400">Proteínas</div>
                                            <div className="text-lg font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                                                {food.protein || 0}g
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/20">
                                            <div className="text-xs font-semibold uppercase tracking-wider mb-1.5 text-purple-400">Carboidratos</div>
                                            <div className="text-lg font-bold bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                                                {food.carbs || 0}g
                                            </div>
                                        </div>
                                        <div className="p-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                                            <div className="text-xs font-semibold uppercase tracking-wider mb-1.5 text-yellow-400">Gorduras</div>
                                            <div className="text-lg font-bold bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                                                {food.fats || 0}g
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-xs mt-3 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 inline-block" style={{ color: 'var(--text-secondary)' }}>
                                        Valores por 100g
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {showAddFood && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => {
                    if (e.target === e.currentTarget) {
                        setShowAddFood(false);
                    }
                }}>
                    <div className="w-full max-w-md rounded-2xl p-6 border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Adicionar Alimento</h2>
                            <button
                                onClick={() => setShowAddFood(false)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                <X size={18} />
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Nome do Alimento</label>
                                <input
                                    type="text"
                                    value={newFood.name}
                                    onChange={(e) => setNewFood({ ...newFood, name: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border"
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--text-primary)'
                                    }}
                                    placeholder="Ex: Linguiça, Hambúrguer..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Calorias (por 100g)</label>
                                    <input
                                        type="number"
                                        value={newFood.calories}
                                        onChange={(e) => setNewFood({ ...newFood, calories: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border"
                                        style={{
                                            background: 'var(--bg-tertiary)',
                                            borderColor: 'var(--border-color)',
                                            color: 'var(--text-primary)',
                                            appearance: 'textfield'
                                        }}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Proteínas (g)</label>
                                    <input
                                        type="number"
                                        value={newFood.protein}
                                        onChange={(e) => setNewFood({ ...newFood, protein: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border"
                                        style={{
                                            background: 'var(--bg-tertiary)',
                                            borderColor: 'var(--border-color)',
                                            color: 'var(--text-primary)',
                                            appearance: 'textfield'
                                        }}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Carboidratos (g)</label>
                                    <input
                                        type="number"
                                        value={newFood.carbs}
                                        onChange={(e) => setNewFood({ ...newFood, carbs: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border"
                                        style={{
                                            background: 'var(--bg-tertiary)',
                                            borderColor: 'var(--border-color)',
                                            color: 'var(--text-primary)',
                                            appearance: 'textfield'
                                        }}
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Gorduras (g)</label>
                                    <input
                                        type="number"
                                        value={newFood.fats}
                                        onChange={(e) => setNewFood({ ...newFood, fats: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border"
                                        style={{
                                            background: 'var(--bg-tertiary)',
                                            borderColor: 'var(--border-color)',
                                            color: 'var(--text-primary)',
                                            appearance: 'textfield'
                                        }}
                                        placeholder="0"
                                    />
                                </div>
                            </div>
                            <div className="text-xs p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
                                💡 Dica: Se você não souber os valores, deixe em branco e peça para a Luna pesquisar na internet!
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowAddFood(false)}
                                    className="flex-1 px-4 py-2 rounded-lg border transition-colors"
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--text-primary)'
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleAddFood}
                                    className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-lg transition-all"
                                >
                                    Adicionar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
