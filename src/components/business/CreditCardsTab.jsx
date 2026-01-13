import { useState, useEffect, useMemo } from "react";
import { Plus, Edit3, Trash2, CreditCard, Loader2, CheckCircle2, AlertCircle, X, DollarSign, Calendar } from "lucide-react";
import { API_CONFIG } from "../../config/api";
import { useModalContext } from "../../contexts/ModalContext";

export default function CreditCardsTab({ userId = "local", onLoadData }) {
    const { showAlert, showConfirm } = useModalContext();
    const [cards, setCards] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showForm, setShowForm] = useState(false);
    const [editingCard, setEditingCard] = useState(null);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [selectedCardForPayment, setSelectedCardForPayment] = useState(null);
    const [paymentAmount, setPaymentAmount] = useState("");
    const [formData, setFormData] = useState({
        name: "",
        limit: "",
        due_day: 10,
        last_four: "",
        brand: "other",
        color: "#8B5CF6",
        notes: ""
    });

    const formatCurrency = (value) => {
        return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
    };

    const loadCards = async () => {
        setIsLoading(true);
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/business/credit-cards?user_id=${userId}`);
            if (response.ok) {
                const data = await response.json();
                setCards(data.credit_cards || []);
            } else {
                showAlert("Erro", "Não foi possível carregar os cartões.");
            }
        } catch (error) {
            console.error("[CREDIT_CARDS] Erro ao carregar cartões:", error);
            showAlert("Erro", "Erro de conexão ao carregar cartões.");
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadCards();
    }, [userId]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleCreateOrUpdateCard = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        const payload = {
            ...formData,
            limit: parseFloat(formData.limit),
            due_day: parseInt(formData.due_day),
            user_id: userId
        };

        if (isNaN(payload.limit) || payload.limit <= 0) {
            showAlert("Erro de Validação", "O limite deve ser um número positivo.");
            setIsLoading(false);
            return;
        }

        try {
            let response;
            if (editingCard) {
                response = await fetch(`${API_CONFIG.BASE_URL}/business/credit-cards/${editingCard.id}`, {
                    method: "PUT",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
            } else {
                response = await fetch(`${API_CONFIG.BASE_URL}/business/credit-cards`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });
            }

            if (response.ok) {
                showAlert("Sucesso", `Cartão ${editingCard ? "atualizado" : "criado"} com sucesso!`);
                setFormData({
                    name: "",
                    limit: "",
                    due_day: 10,
                    last_four: "",
                    brand: "other",
                    color: "#8B5CF6",
                    notes: ""
                });
                setEditingCard(null);
                setShowForm(false);
                loadCards();
                onLoadData();
            } else {
                const errorData = await response.json();
                showAlert("Erro", errorData.detail || `Não foi possível ${editingCard ? "atualizar" : "criar"} o cartão.`);
            }
        } catch (error) {
            console.error("[CREDIT_CARDS] Erro ao salvar cartão:", error);
            showAlert("Erro", "Erro de conexão ao salvar cartão.");
        } finally {
            setIsLoading(false);
        }
    };

    const handleEditClick = (card) => {
        setEditingCard(card);
        setFormData({
            name: card.name,
            limit: card.limit,
            due_day: card.due_day,
            last_four: card.last_four || "",
            brand: card.brand || "other",
            color: card.color || "#8B5CF6",
            notes: card.notes || ""
        });
        setShowForm(true);
    };

    const handleDeleteCard = async (cardId) => {
        if (await showConfirm("Confirmar Exclusão", "Tem certeza que deseja excluir este cartão?")) {
            setIsLoading(true);
            try {
                const response = await fetch(`${API_CONFIG.BASE_URL}/business/credit-cards/${cardId}?user_id=${userId}`, {
                    method: "DELETE"
                });

                if (response.ok) {
                    showAlert("Sucesso", "Cartão excluído com sucesso!");
                    loadCards();
                    onLoadData();
                } else {
                    const errorData = await response.json();
                    showAlert("Erro", errorData.detail || "Não foi possível excluir o cartão.");
                }
            } catch (error) {
                console.error("[CREDIT_CARDS] Erro ao excluir cartão:", error);
                showAlert("Erro", "Erro de conexão ao excluir cartão.");
            } finally {
                setIsLoading(false);
            }
        }
    };

    const handlePayBill = async () => {
        if (!selectedCardForPayment || !paymentAmount) {
            showAlert("Erro", "Por favor, preencha o valor do pagamento.");
            return;
        }

        const amount = parseFloat(paymentAmount);
        if (isNaN(amount) || amount <= 0) {
            showAlert("Erro", "O valor do pagamento deve ser um número positivo.");
            return;
        }

        setIsLoading(true);
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/business/credit-cards/${selectedCardForPayment.id}/pay`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    amount: amount,
                    user_id: userId
                })
            });

            if (response.ok) {
                showAlert("Sucesso", `Fatura de R$ ${formatCurrency(amount)} paga com sucesso!`);
                setShowPaymentModal(false);
                setSelectedCardForPayment(null);
                setPaymentAmount("");
                loadCards();
                onLoadData();
            } else {
                const errorData = await response.json();
                showAlert("Erro", errorData.detail || "Não foi possível pagar a fatura.");
            }
        } catch (error) {
            console.error("[CREDIT_CARDS] Erro ao pagar fatura:", error);
            showAlert("Erro", "Erro de conexão ao pagar fatura.");
        } finally {
            setIsLoading(false);
        }
    };

    const cardsSummary = useMemo(() => {
        const active = cards.filter(c => c.status === "active");
        const totalLimit = active.reduce((sum, c) => sum + (c.limit || 0), 0);
        const totalUsed = active.reduce((sum, c) => sum + (c.used_limit || 0) + (c.current_bill || 0), 0);
        const totalAvailable = totalLimit - totalUsed;
        const totalBills = active.reduce((sum, c) => sum + (c.current_bill || 0), 0);
        const utilization = totalLimit > 0 ? (totalUsed / totalLimit * 100) : 0;
        
        return {
            total: cards.length,
            active: active.length,
            totalLimit,
            totalUsed,
            totalAvailable,
            totalBills,
            utilization
        };
    }, [cards]);

    const getBrandLabel = (brand) => {
        const brands = {
            visa: "Visa",
            mastercard: "Mastercard",
            amex: "American Express",
            elo: "Elo",
            other: "Outro"
        };
        return brands[brand] || brand;
    };

    const getUtilizationColor = (utilization) => {
        if (utilization >= 90) return "text-red-400";
        if (utilization >= 70) return "text-yellow-400";
        return "text-green-400";
    };

    if (isLoading && cards.length === 0 && !showForm) {
        return (
            <div className="flex items-center justify-center h-full text-purple-400">
                <Loader2 size={32} className="animate-spin" />
            </div>
        );
    }

    return (
        <div className="p-6 flex-1 overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>Cartões de Crédito</h2>
                <button
                    onClick={() => { setShowForm(true); setEditingCard(null); setFormData({ name: "", limit: "", due_day: 10, last_four: "", brand: "other", color: "#8B5CF6", notes: "" }); }}
                    className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-600 hover:from-purple-400 hover:via-violet-400 hover:to-indigo-500 text-white rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 hover:scale-105 active:scale-95 font-semibold"
                >
                    <Plus size={20} />
                    Novo Cartão
                </button>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <div className="p-5 rounded-xl border-2" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                    <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Total de Cartões</h3>
                    <p className="text-3xl font-bold text-purple-400">{cardsSummary.total}</p>
                </div>
                <div className="p-5 rounded-xl border-2" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                    <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Limite Total</h3>
                    <p className="text-3xl font-bold text-purple-400">{formatCurrency(cardsSummary.totalLimit)}</p>
                </div>
                <div className="p-5 rounded-xl border-2" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                    <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Limite Disponível</h3>
                    <p className={`text-3xl font-bold ${getUtilizationColor(cardsSummary.utilization)}`}>
                        {formatCurrency(cardsSummary.totalAvailable)}
                    </p>
                </div>
                <div className="p-5 rounded-xl border-2" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                    <h3 className="text-sm font-medium text-[var(--text-secondary)] mb-2">Faturas Pendentes</h3>
                    <p className="text-3xl font-bold text-yellow-400">{formatCurrency(cardsSummary.totalBills)}</p>
                </div>
            </div>

            {showForm && (
                <div className="mb-8 p-6 rounded-xl border-2 animate-in fade-in slide-in-from-top-4 duration-300" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                    <h3 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>
                        {editingCard ? "Editar Cartão" : "Criar Novo Cartão"}
                    </h3>
                    <form onSubmit={handleCreateOrUpdateCard} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Nome do Cartão</label>
                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleInputChange}
                                placeholder="Ex: Nubank, Itaú..."
                                required
                                className="w-full px-3 py-2 rounded-lg border-2 focus:outline-none focus:border-purple-500/50"
                                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Limite</label>
                            <input
                                type="number"
                                name="limit"
                                value={formData.limit}
                                onChange={handleInputChange}
                                placeholder="Ex: 5000.00"
                                step="0.01"
                                required
                                className="w-full px-3 py-2 rounded-lg border-2 focus:outline-none focus:border-purple-500/50"
                                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Dia de Vencimento</label>
                            <input
                                type="number"
                                name="due_day"
                                value={formData.due_day}
                                onChange={handleInputChange}
                                min="1"
                                max="31"
                                required
                                className="w-full px-3 py-2 rounded-lg border-2 focus:outline-none focus:border-purple-500/50"
                                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Últimos 4 Dígitos</label>
                            <input
                                type="text"
                                name="last_four"
                                value={formData.last_four}
                                onChange={handleInputChange}
                                placeholder="Ex: 1234"
                                maxLength="4"
                                className="w-full px-3 py-2 rounded-lg border-2 focus:outline-none focus:border-purple-500/50"
                                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Bandeira</label>
                            <select
                                name="brand"
                                value={formData.brand}
                                onChange={handleInputChange}
                                className="w-full px-3 py-2 rounded-lg border-2 focus:outline-none focus:border-purple-500/50 appearance-none pr-8"
                                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                            >
                                <option value="visa">Visa</option>
                                <option value="mastercard">Mastercard</option>
                                <option value="amex">American Express</option>
                                <option value="elo">Elo</option>
                                <option value="other">Outro</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Cor</label>
                            <input
                                type="color"
                                name="color"
                                value={formData.color}
                                onChange={handleInputChange}
                                className="w-full h-10 rounded-lg border-2 cursor-pointer"
                                style={{ borderColor: 'var(--border-color)' }}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1" style={{ color: 'var(--text-secondary)' }}>Observações (Opcional)</label>
                            <textarea
                                name="notes"
                                value={formData.notes}
                                onChange={handleInputChange}
                                placeholder="Notas adicionais sobre o cartão..."
                                rows="3"
                                className="w-full px-3 py-2 rounded-lg border-2 focus:outline-none focus:border-purple-500/50"
                                style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                            ></textarea>
                        </div>
                        <div className="md:col-span-2 flex justify-end gap-3 mt-4">
                            <button
                                type="button"
                                onClick={() => { setShowForm(false); setEditingCard(null); }}
                                className="px-5 py-2.5 rounded-xl text-sm font-semibold transition-colors hover:bg-white/10"
                                style={{ color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-600 hover:from-purple-400 hover:via-violet-400 hover:to-indigo-500 text-white rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 hover:scale-105 active:scale-95 font-semibold disabled:opacity-50 disabled:scale-100"
                            >
                                {isLoading ? <Loader2 size={20} className="animate-spin" /> : <CheckCircle2 size={20} />}
                                {editingCard ? "Atualizar Cartão" : "Criar Cartão"}
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {cards.length === 0 && !showForm && (
                <div className="flex flex-col items-center justify-center p-12 text-center">
                    <CreditCard size={64} className="text-purple-400 mb-4 opacity-50" />
                    <p className="text-xl font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                        Nenhum cartão de crédito cadastrado.
                    </p>
                    <p className="text-sm mb-6" style={{ color: 'var(--text-secondary)' }}>
                        Comece a gerenciar seus cartões criando o primeiro!
                    </p>
                    <button
                        onClick={() => setShowForm(true)}
                        className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-500 via-violet-500 to-indigo-600 hover:from-purple-400 hover:via-violet-400 hover:to-indigo-500 text-white rounded-xl transition-all duration-300 shadow-lg shadow-purple-500/25 hover:shadow-xl hover:shadow-purple-500/30 hover:scale-105 active:scale-95 font-semibold"
                    >
                        <Plus size={20} />
                        Criar Primeiro Cartão
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {cards.map(card => (
                    <div 
                        key={card.id} 
                        className="p-6 rounded-xl border-2 relative overflow-hidden group transition-all duration-300 hover:shadow-lg hover:shadow-purple-500/10"
                        style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}
                    >
                        <div className="absolute top-0 right-0 w-24 h-24 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-500" style={{ background: `${card.color}20` }} />
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <div className="flex items-center gap-3">
                                <div className="p-2 rounded-lg" style={{ background: `${card.color}20` }}>
                                    <CreditCard size={24} style={{ color: card.color }} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{card.name}</h3>
                                    {card.last_four && (
                                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                            •••• {card.last_four} | {getBrandLabel(card.brand)}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleEditClick(card)}
                                    className="p-2 rounded-full hover:bg-white/10 transition-colors text-[var(--text-secondary)]"
                                    title="Editar Cartão"
                                >
                                    <Edit3 size={16} />
                                </button>
                                <button 
                                    onClick={() => handleDeleteCard(card.id)}
                                    className="p-2 rounded-full hover:bg-red-500/20 transition-colors text-red-400"
                                    title="Excluir Cartão"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>

                        <div className="mb-4 relative z-10">
                            <div className="flex justify-between text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                                <span>Limite: {formatCurrency(card.limit)}</span>
                                <span className={getUtilizationColor((card.used_limit + card.current_bill) / card.limit * 100)}>
                                    {((card.used_limit + card.current_bill) / card.limit * 100).toFixed(1)}% usado
                                </span>
                            </div>
                            <div className="w-full bg-[var(--bg-tertiary)] rounded-full h-2.5">
                                <div 
                                    className="h-2.5 rounded-full transition-all duration-500"
                                    style={{ 
                                        width: `${Math.min(100, ((card.used_limit + card.current_bill) / card.limit * 100))}%`,
                                        background: card.color
                                    }}
                                ></div>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 mb-4 relative z-10">
                            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                                <p className="text-xs text-[var(--text-secondary)] mb-1">Fatura Atual</p>
                                <p className="text-lg font-bold text-yellow-400">{formatCurrency(card.current_bill || 0)}</p>
                            </div>
                            <div className="p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
                                <p className="text-xs text-[var(--text-secondary)] mb-1">Disponível</p>
                                <p className={`text-lg font-bold ${card.available_limit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                    {formatCurrency(card.available_limit || 0)}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center justify-between relative z-10">
                            <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                <Calendar size={14} />
                                <span>Vence dia {card.due_day}</span>
                                {card.days_until_due !== undefined && (
                                    <span className="text-xs">
                                        ({card.days_until_due > 0 ? `em ${card.days_until_due} dias` : 'vencido'})
                                    </span>
                                )}
                            </div>
                            {card.current_bill > 0 && (
                                <button
                                    onClick={() => { setSelectedCardForPayment(card); setPaymentAmount(card.current_bill.toString()); setShowPaymentModal(true); }}
                                    className="px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-105"
                                    style={{
                                        background: `linear-gradient(135deg, ${card.color}40 0%, ${card.color}20 100%)`,
                                        border: `1px solid ${card.color}50`,
                                        color: card.color
                                    }}
                                >
                                    Pagar Fatura
                                </button>
                            )}
                        </div>
                    </div>
                ))}
            </div>

            {/* Payment Modal */}
            {showPaymentModal && selectedCardForPayment && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div 
                        className="relative w-full max-w-md mx-4 bg-[var(--bg-primary)] rounded-2xl border-2 shadow-2xl animate-in zoom-in duration-200"
                        style={{ borderColor: 'var(--border-color)' }}
                    >
                        <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
                            <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                Pagar Fatura - {selectedCardForPayment.name}
                            </h3>
                            <button
                                onClick={() => { setShowPaymentModal(false); setSelectedCardForPayment(null); setPaymentAmount(""); }}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6">
                            <div className="mb-4">
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                                    Valor do Pagamento
                                </label>
                                <input
                                    type="number"
                                    value={paymentAmount}
                                    onChange={(e) => setPaymentAmount(e.target.value)}
                                    placeholder="0.00"
                                    step="0.01"
                                    required
                                    className="w-full px-3 py-2 rounded-lg border-2 focus:outline-none focus:border-purple-500/50"
                                    style={{ background: 'var(--bg-tertiary)', borderColor: 'var(--border-color)', color: 'var(--text-primary)' }}
                                />
                                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                                    Fatura atual: {formatCurrency(selectedCardForPayment.current_bill || 0)}
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => { setShowPaymentModal(false); setSelectedCardForPayment(null); setPaymentAmount(""); }}
                                    className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-colors hover:bg-white/10"
                                    style={{ color: 'var(--text-secondary)', background: 'var(--bg-tertiary)', border: '1px solid var(--border-color)' }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handlePayBill}
                                    disabled={isLoading}
                                    className="flex-1 px-4 py-2 rounded-lg text-sm font-semibold transition-all duration-200 hover:scale-105 disabled:opacity-50"
                                    style={{
                                        background: `linear-gradient(135deg, ${selectedCardForPayment.color}40 0%, ${selectedCardForPayment.color}20 100%)`,
                                        border: `1px solid ${selectedCardForPayment.color}50`,
                                        color: selectedCardForPayment.color
                                    }}
                                >
                                    {isLoading ? <Loader2 size={16} className="animate-spin mx-auto" /> : "Confirmar Pagamento"}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
