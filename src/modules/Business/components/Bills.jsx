import React, { useState, useEffect } from 'react';
import { useBusiness } from '@/hooks/useBusiness';
import {
    Plus,
    Search,
    Filter,
    Calendar,
    Receipt,
    AlertCircle,
    CheckCircle2,
    Trash2,
    Pencil,
    Sparkles,
    Clock,
    DollarSign,
    MoreHorizontal,
    CreditCard as CardIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BillModal = ({ isOpen, onClose, onSave, initialData = null, tags = [], cards = [] }) => {
    const { categorizeTransaction } = useBusiness();
    const [isCategorizing, setIsCategorizing] = useState(false);
    const [formData, setFormData] = useState({
        description: '',
        value: '',
        due_date: new Date().toISOString().split('T')[0],
        category: 'geral',
        notes: '',
        status: 'pending'
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                description: '',
                value: '',
                due_date: new Date().toISOString().split('T')[0],
                category: 'geral',
                notes: '',
                status: 'pending'
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleMagicCategorize = async () => {
        if (!formData.description) return;
        setIsCategorizing(true);
        try {
            const result = await categorizeTransaction(formData.description, 'expense');
            if (result && result.category) {
                setFormData(prev => ({ ...prev, category: result.category }));
            }
        } finally {
            setIsCategorizing(false);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...formData,
            value: parseFloat(formData.value)
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-obsidian/80 backdrop-blur-sm">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md bg-obsidian-light border border-white/10 rounded-3xl overflow-hidden shadow-2xl"
            >
                <div className="p-6 border-b border-white/5">
                    <h3 className="text-xl font-bold text-white">
                        {initialData ? 'Editar Conta' : 'Nova Conta a Pagar'}
                    </h3>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Descrição */}
                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Descrição</label>
                        <div className="relative">
                            <input
                                type="text"
                                required
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 pr-12 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/15"
                                placeholder="Ex: Aluguel, Internet..."
                            />
                            {formData.description && (
                                <button
                                    type="button"
                                    onClick={handleMagicCategorize}
                                    disabled={isCategorizing}
                                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${isCategorizing ? 'text-violet-400 animate-pulse' : 'text-slate-500 hover:text-violet-400'
                                        }`}
                                >
                                    <Sparkles size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        {/* Valor */}
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">Valor</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                value={formData.value}
                                onChange={e => setFormData({ ...formData, value: e.target.value })}
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/15"
                                placeholder="0,00"
                            />
                        </div>
                        {/* Vencimento */}
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">Vencimento</label>
                            <input
                                type="date"
                                required
                                value={formData.due_date}
                                onChange={e => setFormData({ ...formData, due_date: e.target.value })}
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-violet-500/50 focus:bg-white/15 text-sm"
                            />
                        </div>
                    </div>

                    {/* Categoria */}
                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Categoria/Tag</label>
                        <select
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-violet-500/50 focus:bg-white/15 appearance-none"
                            style={{ color: '#ffffff' }}
                        >
                            <option value="geral" className="bg-obsidian text-white">Geral</option>
                            <option value="casa" className="bg-obsidian text-white">Casa</option>
                            <option value="alimentação" className="bg-obsidian text-white">Alimentação</option>
                            <option value="transporte" className="bg-obsidian text-white">Transporte</option>
                            <option value="lazer" className="bg-obsidian text-white">Lazer</option>
                            <option value="saúde" className="bg-obsidian text-white">Saúde</option>
                            <option value="educação" className="bg-obsidian text-white">Educação</option>
                            <option value="assinatura" className="bg-obsidian text-white">Assinatura</option>
                            <option value="financeiro" className="bg-obsidian text-white">Financeiro</option>
                            {tags.map(tag => (
                                <option key={tag.name} value={tag.name} className="bg-obsidian text-white">{tag.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Notas */}
                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Observações (opcional)</label>
                        <textarea
                            value={formData.notes || ''}
                            onChange={e => setFormData({ ...formData, notes: e.target.value })}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/15 h-20 resize-none"
                            placeholder="Notas adicionais..."
                        />
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 px-4 py-2.5 rounded-xl border border-white/10 text-white font-medium hover:bg-white/5 transition-all text-sm"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 text-white font-medium hover:bg-violet-500 transition-all text-sm"
                        >
                            {initialData ? 'Atualizar' : 'Salvar Conta'}
                        </button>
                    </div>
                </form>
            </motion.div>
        </div>
    );
};

const Bills = () => {
    const {
        bills, fetchBills,
        billsSummary, fetchBillsSummary,
        addBill, updateBill, deleteBill, payBill,
        cards, fetchCards,
        tags, fetchTags
    } = useBusiness();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBill, setEditingBill] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    useEffect(() => {
        fetchBills();
        fetchBillsSummary();
        fetchCards();
        fetchTags();
    }, [fetchBills, fetchBillsSummary, fetchCards, fetchTags]);

    const handleSave = async (data) => {
        if (editingBill) {
            await updateBill(editingBill.id, data);
        } else {
            await addBill(data);
        }
        // Refresh tags after save to ensure new tags appear
        await fetchTags();
        setEditingBill(null);
        setIsModalOpen(false);
    };

    const handleEdit = (bill) => {
        setEditingBill(bill);
        setIsModalOpen(true);
    };

    const handlePay = async (billId) => {
        // Por enquanto paga diretamente, futuramente podemos abrir um modal para escolher o cartão
        if (window.confirm('Marcar esta conta como paga? Isso criará uma transação de saída.')) {
            await payBill(billId);
        }
    };

    const filteredBills = bills.filter(b => {
        const matchesSearch = b.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            b.category.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' ? true : b.status === filterStatus;
        return matchesSearch && matchesStatus;
    }).sort((a, b) => new Date(a.due_date) - new Date(b.due_date));

    const isOverdue = (date) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const due = new Date(date);
        return due < today;
    };

    return (
        <div className="h-full flex flex-col space-y-6 overflow-hidden">
            {/* Header com Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-obsidian-light p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3 text-slate-400 mb-2">
                        <Receipt size={18} />
                        <span className="text-sm">Total Pendentes</span>
                    </div>
                    <div className="text-xl font-bold text-white">
                        {billsSummary.pending_count} contas
                    </div>
                </div>

                <div className="bg-obsidian-light p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3 text-violet-400 mb-2">
                        <DollarSign size={18} />
                        <span className="text-sm">Valor Pendente</span>
                    </div>
                    <div className="text-xl font-bold text-white">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(billsSummary.total_pending_value)}
                    </div>
                </div>

                <div className="bg-obsidian-light p-4 rounded-2xl border border-white/5 border-rose-500/20">
                    <div className="flex items-center gap-3 text-rose-400 mb-2">
                        <AlertCircle size={18} />
                        <span className="text-sm">Contas em Atraso</span>
                    </div>
                    <div className="text-xl font-bold text-rose-400">
                        {billsSummary.overdue_count}
                    </div>
                </div>

                <div className="bg-obsidian-light p-4 rounded-2xl border border-white/5">
                    <div className="flex items-center gap-3 text-emerald-400 mb-2">
                        <CheckCircle2 size={18} />
                        <span className="text-sm">Valor em Atraso</span>
                    </div>
                    <div className="text-xl font-bold text-white">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(billsSummary.overdue_value)}
                    </div>
                </div>
            </div>

            {/* Ações e Filtros */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-obsidian-light p-3 rounded-2xl border border-white/5">
                <div className="flex items-center gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar contas..."
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        value={filterStatus}
                        onChange={e => setFilterStatus(e.target.value)}
                        className="bg-white/10 border border-white/20 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-violet-500/50 focus:bg-white/15 outline-none"
                        style={{ color: '#ffffff' }}
                    >
                        <option value="all" className="bg-obsidian text-white">Todas</option>
                        <option value="pending" className="bg-obsidian text-white">Pendentes</option>
                        <option value="paid" className="bg-obsidian text-white">Pagas</option>
                    </select>
                </div>

                <button
                    onClick={() => { setEditingBill(null); setIsModalOpen(true); }}
                    className="w-full md:w-auto flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-500 p-2 px-6 rounded-xl text-white font-medium transition-all shadow-lg shadow-violet-600/20"
                >
                    <Plus size={18} />
                    <span>Nova Conta</span>
                </button>
            </div>

            {/* Tabela de Contas */}
            <div className="flex-1 overflow-y-auto min-h-0 bg-obsidian-light rounded-3xl border border-white/5">
                {filteredBills.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                        <Receipt size={48} className="opacity-20" />
                        <p>Nenhuma conta encontrada</p>
                    </div>
                ) : (
                    <div className="p-2 space-y-2">
                        {filteredBills.map((bill, index) => {
                            const overdue = bill.status === 'pending' && isOverdue(bill.due_date);
                            const paid = bill.status === 'paid';

                            return (
                                <motion.div
                                    key={bill.id}
                                    initial={{ opacity: 0, x: -20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.05 }}
                                    className="group flex flex-col md:flex-row items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all hover:bg-white/[0.07]"
                                >
                                    <div className="flex items-center gap-4 w-full md:w-auto">
                                        <div className={`p-3 rounded-xl ${paid ? 'bg-emerald-500/20 text-emerald-400' :
                                                overdue ? 'bg-rose-500/20 text-rose-400' : 'bg-violet-500/20 text-violet-400'
                                            }`}>
                                            <Receipt size={20} />
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-white font-medium">{bill.description}</span>
                                            <div className="flex items-center gap-2 mt-0.5">
                                                <span className="text-xs text-slate-500 capitalize">{bill.category}</span>
                                                <span className="text-[10px] text-slate-600">•</span>
                                                <div className="flex items-center gap-1 text-xs text-slate-500">
                                                    <Calendar size={12} />
                                                    <span>{new Date(bill.due_date).toLocaleDateString()}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end mt-4 md:mt-0 pt-4 md:pt-0 border-t md:border-t-0 border-white/5">
                                        <div className="text-right">
                                            <div className={`text-base font-bold ${paid ? 'text-emerald-400' : 'text-white'}`}>
                                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(bill.value)}
                                            </div>
                                            <div className="flex items-center gap-1.5 justify-end mt-1">
                                                {paid ? (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                                                        <CheckCircle2 size={10} /> Pago
                                                    </span>
                                                ) : overdue ? (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-rose-400 uppercase tracking-wider">
                                                        <AlertCircle size={10} /> Atrasado
                                                    </span>
                                                ) : (
                                                    <span className="flex items-center gap-1 text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                                                        <Clock size={10} /> Pendente
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            {!paid && (
                                                <button
                                                    onClick={() => handlePay(bill.id)}
                                                    className="px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600 hover:text-white rounded-xl text-xs font-bold transition-all border border-emerald-500/20"
                                                >
                                                    PAGAR
                                                </button>
                                            )}
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(bill)}
                                                    className="p-2 hover:bg-white/10 rounded-lg text-slate-400 hover:text-white transition-all"
                                                >
                                                    <Pencil size={16} />
                                                </button>
                                                <button
                                                    onClick={() => { if (window.confirm('Excluir esta conta?')) deleteBill(bill.id); }}
                                                    className="p-2 hover:bg-rose-500/20 rounded-lg text-slate-500 hover:text-rose-400 transition-all"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            <BillModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingBill(null); }}
                onSave={handleSave}
                initialData={editingBill}
                tags={tags}
                cards={cards}
            />
        </div>
    );
};

export default Bills;
