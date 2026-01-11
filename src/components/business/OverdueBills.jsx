import React, { useState, useEffect } from 'react';
import { X, Plus, AlertCircle, Check, Trash2, Edit3, Calendar, DollarSign, Clock } from 'lucide-react';
import { API_CONFIG } from '../../config/api';
import { useModalContext } from '../../contexts/ModalContext';

export default function OverdueBills({ isOpen, onClose, userId, onLoadData, tags }) {
    const { showAlert, showConfirm } = useModalContext();
    const [bills, setBills] = useState([]);
    const [summary, setSummary] = useState({ pending_count: 0, pending_total: 0, overdue_count: 0, overdue_total: 0 });
    const [newBill, setNewBill] = useState({
        description: "",
        value: "",
        due_date: new Date().toISOString().split('T')[0],
        category: "geral",
        notes: ""
    });
    const [loading, setLoading] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editData, setEditData] = useState({});
    const [filter, setFilter] = useState("all"); // all, pending, paid

    useEffect(() => {
        if (isOpen) {
            loadBills();
            loadSummary();
        }
    }, [isOpen, filter]);

    // Adicionar dependências do useEffect (eslint)
    // eslint-disable-next-line react-hooks/exhaustive-deps

    const loadBills = async () => {
        setLoading(true);
        try {
            const statusParam = filter !== "all" ? `&status=${filter}` : "";
            const res = await fetch(`${API_CONFIG.BASE_URL}/business/overdue-bills?user_id=${userId}${statusParam}`, {
                cache: 'no-store'
            });

            // Check if response is HTML (frontend fallback)
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("text/html")) {
                throw new Error("Recebido HTML em vez de JSON. Verifique se o Backend está rodando na porta correta.");
            }

            const data = await res.json();
            setBills(data.bills || []);
        } catch (e) {
            console.error("Error loading overdue bills:", e);
            setBills([]);
        } finally {
            setLoading(false);
        }
    };

    const loadSummary = async () => {
        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/business/overdue-bills/summary?user_id=${userId}`, {
                cache: 'no-store'
            });

            // Check if response is HTML (frontend fallback)
            const contentType = res.headers.get("content-type");
            if (contentType && contentType.includes("text/html")) {
                throw new Error("Recebido HTML em vez de JSON. Verifique se o Backend está rodando na porta correta.");
            }

            const data = await res.json();
            setSummary(data);
        } catch (e) {
            console.error("Error loading summary:", e);
            setSummary({ pending_count: 0, pending_total: 0, overdue_count: 0, overdue_total: 0 });
        }
    };

    const handleAdd = async () => {
        if (!newBill.description.trim() || !newBill.value || !newBill.due_date) return;

        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/business/overdue-bills`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...newBill,
                    value: parseFloat(newBill.value),
                    user_id: userId
                })
            });

            if (res.ok) {
                setNewBill({
                    description: "",
                    value: "",
                    due_date: new Date().toISOString().split('T')[0],
                    category: "geral",
                    notes: ""
                });
                loadBills();
                loadSummary();
            } else {
                const data = await res.json();
                await showAlert("Erro ao salvar: " + (data.detail || "Erro desconhecido"), "Erro");
            }
        } catch (e) {
            console.error("Error adding bill:", e);
            await showAlert("Erro de conexão ao salvar conta.", "Erro");
        }
    };

    const handlePay = async (billId) => {
        const confirmed = await showConfirm("Marcar esta conta como paga? Uma transação de saída será criada automaticamente.", "Confirmar Pagamento");
        if (!confirmed) return;

        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/business/overdue-bills/${billId}/pay?user_id=${userId}`, {
                method: "POST"
            });

            if (res.ok) {
                loadBills();
                loadSummary();
                if (onLoadData) onLoadData(); // Refresh transactions
            }
        } catch (e) {
            console.error("Error paying bill:", e);
            await showAlert("Erro ao marcar conta como paga.", "Erro");
        }
    };

    const handleDelete = async (billId) => {
        const confirmed = await showConfirm("Tem certeza que deseja excluir esta conta?", "Confirmar Exclusão");
        if (!confirmed) return;

        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/business/overdue-bills/${billId}?user_id=${userId}`, {
                method: "DELETE"
            });

            if (res.ok) {
                loadBills();
                loadSummary();
            }
        } catch (e) {
            console.error("Error deleting bill:", e);
        }
    };

    const handleStartEdit = (bill) => {
        setEditingId(bill.id);
        setEditData({
            description: bill.description,
            value: bill.value.toString(),
            due_date: bill.due_date ? bill.due_date.split('T')[0] : new Date().toISOString().split('T')[0],
            category: bill.category,
            notes: bill.notes || ""
        });
    };

    const handleSaveEdit = async (billId) => {
        if (!editData.description?.trim() || !editData.value || !editData.due_date) return;

        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/business/overdue-bills/${billId}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    ...editData,
                    value: parseFloat(editData.value),
                    user_id: userId
                })
            });

            if (res.ok) {
                setEditingId(null);
                setEditData({});
                loadBills();
                loadSummary();
            }
        } catch (e) {
            console.error("Error updating bill:", e);
        }
    };

    const formatDate = (dateStr) => {
        if (!dateStr) return "-";
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
    };

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const getDaysOverdue = (dueDate) => {
        if (!dueDate) return 0;
        const today = new Date();
        const due = new Date(dueDate);
        const diff = Math.floor((today - due) / (1000 * 60 * 60 * 24));
        return Math.max(0, diff);
    };

    const getTagStyle = (tagId) => {
        if (!tags || tags.length === 0) {
            return { id: tagId || "geral", label: tagId || "Geral", color: "#6b7280" };
        }
        const found = tags.find(t => t.id === tagId);
        if (found) return found;
        return { id: tagId || "geral", label: tagId || "Geral", color: "#6b7280" };
    };

    if (!isOpen) return null;

    const filteredBills = bills.filter(bill => {
        if (filter === "all") return true;
        return bill.status === filter;
    });

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 max-h-[90vh] flex flex-col"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border-color)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-red-500/10">
                            <AlertCircle size={20} className="text-red-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Contas em Atraso</h2>
                            {summary.pending_count > 0 && (
                                <p className="text-xs text-gray-400">
                                    {summary.pending_count} pendente(s) • {summary.overdue_count} vencida(s) • Total: {formatCurrency(summary.pending_total)}
                                </p>
                            )}
                        </div>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Filters */}
                <div className="px-6 py-3 border-b border-gray-800 flex items-center gap-2">
                    {[
                        { id: "all", label: "Todas" },
                        { id: "pending", label: "Pendentes" },
                        { id: "paid", label: "Pagas" }
                    ].map(f => (
                        <button
                            key={f.id}
                            onClick={() => setFilter(f.id)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                                filter === f.id
                                    ? "bg-purple-600 text-white"
                                    : "bg-white/5 text-gray-400 hover:bg-white/10"
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {loading ? (
                        <div className="text-center text-gray-500 py-8">Carregando...</div>
                    ) : filteredBills.length === 0 ? (
                        <div className="text-center text-gray-500 py-8 text-sm">
                            Nenhuma conta {filter !== "all" ? (filter === "pending" ? "pendente" : "paga") : ""} encontrada.
                        </div>
                    ) : (
                        filteredBills.map(bill => {
                            const isEditing = editingId === bill.id;
                            const daysOverdue = bill.days_overdue || getDaysOverdue(bill.due_date);
                            const isOverdue = daysOverdue > 0 && bill.status === "pending";
                            const tag = getTagStyle(bill.category);

                            if (isEditing) {
                                return (
                                    <div
                                        key={bill.id}
                                        className="p-4 rounded-lg border border-purple-500/30 bg-purple-500/5"
                                    >
                                        <div className="grid grid-cols-2 gap-3 mb-3">
                                            <input
                                                type="text"
                                                placeholder="Descrição"
                                                value={editData.description || ""}
                                                onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50"
                                            />
                                            <input
                                                type="number"
                                                placeholder="Valor"
                                                value={editData.value || ""}
                                                onChange={(e) => setEditData({ ...editData, value: e.target.value })}
                                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50"
                                            />
                                            <input
                                                type="date"
                                                value={editData.due_date || ""}
                                                onChange={(e) => setEditData({ ...editData, due_date: e.target.value })}
                                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50"
                                            />
                                            <select
                                                value={editData.category || "geral"}
                                                onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                                                className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50"
                                            >
                                                {tags && tags.map(t => (
                                                    <option key={t.id} value={t.id} className="text-black">
                                                        {t.label}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="flex items-center justify-end gap-2">
                                            <button
                                                onClick={() => handleSaveEdit(bill.id)}
                                                className="px-3 py-1.5 bg-green-600 hover:bg-green-500 text-white rounded-lg text-xs font-medium transition-colors"
                                            >
                                                Salvar
                                            </button>
                                            <button
                                                onClick={() => { setEditingId(null); setEditData({}); }}
                                                className="px-3 py-1.5 bg-gray-600 hover:bg-gray-500 text-white rounded-lg text-xs font-medium transition-colors"
                                            >
                                                Cancelar
                                            </button>
                                        </div>
                                    </div>
                                );
                            }

                            return (
                                <div
                                    key={bill.id}
                                    className={`p-4 rounded-lg border ${
                                        isOverdue
                                            ? "border-red-500/30 bg-red-500/5"
                                            : bill.status === "paid"
                                            ? "border-green-500/30 bg-green-500/5 opacity-60"
                                            : "border-white/5 bg-white/5"
                                    }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-2">
                                                <h3 className="font-medium text-white">{bill.description}</h3>
                                                {isOverdue && (
                                                    <span className="px-2 py-0.5 bg-red-500/20 text-red-400 rounded text-xs font-medium">
                                                        {daysOverdue} dia(s) em atraso
                                                    </span>
                                                )}
                                                {bill.status === "paid" && (
                                                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 rounded text-xs font-medium">
                                                        Paga
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-gray-400">
                                                <div className="flex items-center gap-1">
                                                    <DollarSign size={14} />
                                                    <span className="font-semibold text-white">{formatCurrency(bill.value)}</span>
                                                </div>
                                                <div className="flex items-center gap-1">
                                                    <Calendar size={14} />
                                                    <span>Vencimento: {formatDate(bill.due_date)}</span>
                                                </div>
                                                <div
                                                    className="px-2 py-0.5 rounded text-xs"
                                                    style={{
                                                        background: `${tag.color}22`,
                                                        color: tag.color,
                                                        border: `1px solid ${tag.color}44`
                                                    }}
                                                >
                                                    {tag.label}
                                                </div>
                                            </div>
                                            {bill.notes && (
                                                <p className="text-xs text-gray-500 mt-2">{bill.notes}</p>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-2 ml-4">
                                            {bill.status === "pending" && (
                                                <button
                                                    onClick={() => handlePay(bill.id)}
                                                    className="p-2 bg-green-600/20 hover:bg-green-600/30 text-green-400 rounded-lg transition-colors"
                                                    title="Marcar como paga"
                                                >
                                                    <Check size={16} />
                                                </button>
                                            )}
                                            {bill.status === "pending" && (
                                                <button
                                                    onClick={() => handleStartEdit(bill)}
                                                    className="p-2 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 rounded-lg transition-colors"
                                                    title="Editar"
                                                >
                                                    <Edit3 size={16} />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => handleDelete(bill.id)}
                                                className="p-2 bg-red-600/20 hover:bg-red-600/30 text-red-400 rounded-lg transition-colors"
                                                title="Excluir"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Add New Section */}
                <div className="px-6 py-4 border-t border-gray-800 bg-gray-900/50">
                    <h3 className="text-xs uppercase font-bold text-gray-500 mb-3">Nova Conta</h3>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                        <input
                            type="text"
                            placeholder="Descrição (ex: Conta de luz)"
                            value={newBill.description}
                            onChange={(e) => setNewBill({ ...newBill, description: e.target.value })}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50"
                        />
                        <input
                            type="number"
                            placeholder="Valor"
                            value={newBill.value}
                            onChange={(e) => setNewBill({ ...newBill, value: e.target.value })}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50"
                        />
                        <input
                            type="date"
                            value={newBill.due_date}
                            onChange={(e) => setNewBill({ ...newBill, due_date: e.target.value })}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50"
                        />
                        <select
                            value={newBill.category}
                            onChange={(e) => setNewBill({ ...newBill, category: e.target.value })}
                            className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50"
                        >
                            {tags && tags.map(tag => (
                                <option key={tag.id} value={tag.id} className="text-black">
                                    {tag.label}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <input
                            type="text"
                            placeholder="Observações (opcional)"
                            value={newBill.notes}
                            onChange={(e) => setNewBill({ ...newBill, notes: e.target.value })}
                            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white outline-none focus:border-purple-500/50"
                        />
                        <button
                            onClick={handleAdd}
                            disabled={!newBill.description.trim() || !newBill.value || !newBill.due_date}
                            className="bg-purple-600 hover:bg-purple-500 text-white rounded-lg px-4 py-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Plus size={16} />
                            Adicionar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
