import React, { useState, useEffect } from 'react';
import { X, Plus, Calendar, Trash2, Check, ArrowRight, DollarSign } from 'lucide-react';
import { API_CONFIG } from '../../config/api';

export default function RecurringModal({ isOpen, onClose, userId, onLoadData, tags }) {
    const [items, setItems] = useState([]);
    const [newItem, setNewItem] = useState({ title: "", value: "", type: "expense", day: "5", category: "fixo" });
    const [loading, setLoading] = useState(false);
    const [generating, setGenerating] = useState(false);

    useEffect(() => {
        if (isOpen) loadItems();
    }, [isOpen]);

    const loadItems = async () => {
        setLoading(true);
        console.log("Loading recurring items from:", `${API_CONFIG.BASE_URL}/business/recurring-items?user_id=${userId}`);
        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/business/recurring-items?user_id=${userId}`, {
                cache: 'no-store'
            });

            // Check if response is HTML (frontend fallback)
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("text/html")) {
                throw new Error("Recebido HTML em vez de JSON. Verifique se o Backend está rodando na porta correta.");
            }

            const data = await res.json();
            setItems(data.items || []);
        } catch (e) {
            console.error("Error loading recurring items:", e);
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async () => {
        console.log("Attempting to add recurring item:", newItem);
        if (!newItem.title || !newItem.value) {
            console.warn("Validation failed: Title or Value missing");
            return;
        }

        try {
            const payload = {
                title: newItem.title,
                value: parseFloat(newItem.value.toString().replace(',', '.')), // Fix comma decimal
                type: newItem.type,
                day_of_month: parseInt(newItem.day),
                category: newItem.category, // Include category
                user_id: userId
            };
            console.log("Payload:", payload);

            const res = await fetch(`${API_CONFIG.BASE_URL}/business/recurring-items`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });

            const data = await res.json();
            console.log("Response:", res.status, data);

            if (res.ok) {
                setNewItem({ title: "", value: "", type: "expense", day: "5", category: "fixo" });
                loadItems();
            } else {
                alert("Erro ao salvar: " + (data.detail || "Erro desconhecido"));
            }
        } catch (e) {
            console.error("Error adding recurring:", e);
            alert("Erro de conexão ao salvar item fixo.");
        }
    };

    const handleDelete = async (id) => {
        try {
            await fetch(`${API_CONFIG.BASE_URL}/business/recurring-items/${id}?user_id=${userId}`, {
                method: "DELETE"
            });
            loadItems();
        } catch (e) {
            console.error("Error deleting recurring:", e);
        }
    };

    const handleGenerate = async () => {
        setGenerating(true);
        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/business/recurring-items/process?user_id=${userId}`, {
                method: "POST"
            });
            const data = await res.json();
            if (data.success) {
                if (data.generated_count > 0) {
                    onLoadData(); // Refresh main list
                    onClose();
                }
            }
        } catch (e) {
            console.error("Error generating recurring:", e);
        } finally {
            setGenerating(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="w-full max-w-lg rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                    <h2 className="text-lg font-bold text-white flex items-center gap-2">
                        <Calendar size={18} className="text-purple-400" />
                        Itens Fixos (Mensal)
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">

                    {/* List */}
                    <div className="space-y-3 max-h-60 overflow-y-auto custom-scrollbar">
                        {loading ? (
                            <div className="text-center text-gray-500 py-4">Carregando...</div>
                        ) : items.length === 0 ? (
                            <div className="text-center text-gray-500 py-4 text-sm">Nenhum item fixo cadastrado.</div>
                        ) : (
                            items.map(item => (
                                <div
                                    key={item.id}
                                    className="flex items-center justify-between p-3 rounded-lg border border-white/5"
                                    style={{ background: 'var(--bg-secondary)' }}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className={`w-8 h-8 rounded-full flex items-center justify-center border ${item.type === 'income' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                                                }`}
                                        >
                                            <DollarSign size={14} />
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm text-gray-200">{item.title}</div>
                                            <div className="text-xs text-gray-500">Dia {item.day_of_month}</div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <span className={`text-sm font-semibold ${item.type === 'income' ? 'text-green-400' : 'text-red-400'}`}>
                                            {item.type === 'income' ? '+' : '-'}{item.value.toFixed(2)}
                                        </span>
                                        <button
                                            onClick={() => handleDelete(item.id)}
                                            className="text-gray-500 hover:text-red-400 transition-colors p-1"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    {/* Add New Section */}
                    <div className="pt-4 border-t border-gray-800">
                        <h3 className="text-xs uppercase font-bold text-gray-500 mb-3">Novo Item Fixo</h3>

                        <div className="flex gap-2 mb-2">
                            <input
                                type="text" placeholder="Nome (Ex: Aluguel)"
                                value={newItem.title}
                                onChange={e => setNewItem({ ...newItem, title: e.target.value })}
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50"
                            />
                            <select
                                value={newItem.type}
                                onChange={e => setNewItem({ ...newItem, type: e.target.value })}
                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50"
                            >
                                <option value="expense" className="text-black">Saída</option>
                                <option value="income" className="text-black">Entrada</option>
                            </select>
                        </div>

                        {/* Category Select */}
                        <div className="flex gap-2 mb-2">
                            <select
                                value={newItem.category}
                                onChange={e => setNewItem({ ...newItem, category: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50"
                            >
                                <option value="fixo" className="text-black">Geral (Fixo)</option>
                                {tags && tags.map(tag => (
                                    <option key={tag.id} value={tag.id} className="text-black">
                                        {tag.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="flex gap-2">
                            <input
                                type="number" placeholder="Valor"
                                value={newItem.value}
                                onChange={e => setNewItem({ ...newItem, value: e.target.value })}
                                className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50"
                            />
                            <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                                <span className="text-xs text-gray-500">Dia</span>
                                <input
                                    type="number" min="1" max="31"
                                    value={newItem.day}
                                    onChange={e => setNewItem({ ...newItem, day: e.target.value })}
                                    className="w-10 bg-transparent text-sm text-white outline-none text-center"
                                />
                            </div>
                            <button
                                onClick={handleAdd}
                                className="bg-purple-600 hover:bg-purple-500 text-white rounded-lg px-4 py-2 transition-colors flex items-center justify-center"
                            >
                                <Plus size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-4 flex justify-end">
                        <button
                            onClick={handleGenerate}
                            disabled={items.length === 0 || generating}
                            className={`
                                flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all
                                ${items.length === 0 ? 'opacity-50 cursor-not-allowed bg-gray-700 text-gray-400' : 'bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-900/20'}
                            `}
                        >
                            {generating ? (
                                <span className="animate-pulse">Gerando...</span>
                            ) : (
                                <>
                                    <Check size={16} />
                                    Gerar Itens no Mês Atual
                                </>
                            )}
                        </button>
                    </div>

                </div>
            </div>
        </div>
    );
}
