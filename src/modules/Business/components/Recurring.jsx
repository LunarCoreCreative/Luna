import React, { useState, useEffect } from 'react';
import { useBusiness } from '@/hooks/useBusiness';
import {
    Plus,
    RefreshCw,
    Trash2,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    X,
    MoreVertical,
    CreditCard as CreditCardIcon,
    Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- MODAL DE ITEM RECORRENTE ---
const RecurringModal = ({ isOpen, onClose, onSave, initialData = null, tags = [], cards = [] }) => {
    const [formData, setFormData] = useState({
        description: '',
        value: '',
        type: 'expense',
        category: 'fixo',
        due_day: 1,
        active: true,
        auto_pay: false,
        credit_card_id: null
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                credit_card_id: initialData.credit_card_id || null
            });
        } else {
            setFormData({
                description: '',
                value: '',
                type: 'expense',
                category: 'fixo',
                due_day: 1,
                active: true,
                auto_pay: false,
                credit_card_id: null
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...formData,
            value: parseFloat(formData.value),
            due_day: parseInt(formData.due_day)
        });
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-obsidian border border-white/10 rounded-2xl w-full max-w-md p-6 relative z-10 shadow-2xl"
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">
                        {initialData ? 'Editar Recorrência' : 'Nova Recorrência'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Tipo */}
                    <div className="flex bg-white/5 p-1 rounded-xl">
                        {['income', 'expense'].map(type => (
                            <button
                                key={type}
                                type="button"
                                onClick={() => setFormData({ ...formData, type, credit_card_id: type === 'income' ? null : formData.credit_card_id })}
                                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${formData.type === type
                                    ? (type === 'income' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-rose-500/20 text-rose-300')
                                    : 'text-slate-400 hover:text-white'
                                    }`}
                            >
                                {type === 'income' ? 'Entrada' : 'Saída'}
                            </button>
                        ))}
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Descrição</label>
                        <input
                            type="text"
                            required
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/15"
                            placeholder="Ex: Aluguel, Netflix..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">Valor (R$)</label>
                            <input
                                type="number"
                                required
                                min="0.01"
                                step="0.01"
                                value={formData.value}
                                onChange={e => setFormData({ ...formData, value: e.target.value })}
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/15"
                                placeholder="0,00"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">Dia do Vencimento</label>
                            <input
                                type="number"
                                required
                                min="1"
                                max="31"
                                value={formData.due_day}
                                onChange={e => setFormData({ ...formData, due_day: e.target.value })}
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/15"
                                placeholder="1-31"
                            />
                        </div>
                    </div>

                    {/* Credit Card Selection (only for expenses) */}
                    {formData.type === 'expense' && cards.length > 0 && (
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-2">Forma de Pagamento (Opcional)</label>
                            <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 scrollbar-thin">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, credit_card_id: null })}
                                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${!formData.credit_card_id
                                        ? 'bg-white/10 border-white/20 text-white'
                                        : 'bg-transparent border-white/5 text-slate-500'
                                        }`}
                                >
                                    DINHEIRO / DÉBITO
                                </button>
                                {cards.map(card => (
                                    <button
                                        key={card.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, credit_card_id: card.id })}
                                        className={`px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all flex items-center gap-2 ${formData.credit_card_id === card.id
                                            ? 'border-emerald-500/30'
                                            : 'border-white/5 opacity-60 hover:opacity-100'
                                            }`}
                                        style={{
                                            backgroundColor: formData.credit_card_id === card.id ? `${card.color}33` : 'transparent',
                                            color: formData.credit_card_id === card.id ? card.color : '#64748b',
                                            borderColor: formData.credit_card_id === card.id ? card.color : undefined
                                        }}
                                    >
                                        <CreditCardIcon size={12} />
                                        {card.name.toUpperCase()}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-2">Categoria</label>
                        <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1 scrollbar-thin scrollbar-thumb-white/10">
                            {tags.map(tag => (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, category: tag.id })}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${formData.category === tag.id
                                        ? 'border-white/20 scale-105 shadow-lg shadow-black/20'
                                        : 'border-white/5 opacity-60 hover:opacity-100 hover:border-white/10'
                                        }`}
                                    style={{
                                        backgroundColor: formData.category === tag.id ? `${tag.color}33` : 'transparent',
                                        color: tag.color,
                                        borderColor: formData.category === tag.id ? tag.color : undefined
                                    }}
                                >
                                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                                    {tag.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl">
                        <input
                            type="checkbox"
                            id="auto_pay"
                            checked={formData.auto_pay}
                            onChange={e => setFormData({ ...formData, auto_pay: e.target.checked })}
                            className="w-4 h-4 rounded border-white/10 bg-white/5 text-violet-600 focus:ring-violet-500"
                        />
                        <label htmlFor="auto_pay" className="text-sm text-slate-300 cursor-pointer">
                            Gerar automaticamente (Auto-Pay)
                        </label>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-3 rounded-xl mt-6 transition-colors shadow-lg shadow-violet-600/20"
                    >
                        {initialData ? 'Atualizar' : 'Salvar'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

const Recurring = () => {
    const {
        recurring, fetchRecurring,
        addRecurring, updateRecurring, deleteRecurring,
        tags, fetchTags,
        cards, fetchCards,
        processRecurring
    } = useBusiness();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    useEffect(() => {
        fetchRecurring();
        fetchTags();
        fetchCards();
    }, [fetchRecurring, fetchTags, fetchCards]);

    const handleSave = async (data) => {
        if (data.id) {
            await updateRecurring(data.id, data);
        } else {
            await addRecurring(data);
        }
        // Refresh tags after save to ensure new tags appear
        await fetchTags();
        setEditingItem(null);
    };

    const handleProcess = async () => {
        setIsProcessing(true);
        const res = await processRecurring();
        setIsProcessing(false);
        if (res?.generated_count > 0) {
            alert(`${res.generated_count} transações geradas com sucesso!`);
        } else {
            alert('Nenhuma transação pendente para gerar no momento.');
        }
    };

    const cardMap = React.useMemo(() => {
        const map = {};
        cards.forEach(c => map[c.id] = c);
        return map;
    }, [cards]);

    return (
        <div className="h-full flex flex-col p-4 bg-obsidian">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white">Itens Recorrentes</h2>
                    <p className="text-sm text-slate-400">Assinaturas e contas fixas mensais</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleProcess}
                        disabled={isProcessing}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-white font-medium transition-all"
                    >
                        <RefreshCw size={18} className={isProcessing ? 'animate-spin' : ''} />
                        <span>Processar Agora</span>
                    </button>
                    <button
                        onClick={() => { setEditingItem(null); setIsModalOpen(true); }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium transition-all shadow-lg shadow-violet-600/20"
                    >
                        <Plus size={18} />
                        <span>Novo</span>
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 overflow-y-auto pb-20 scrollbar-thin">
                {recurring.length === 0 ? (
                    <div className="col-span-full flex flex-col items-center justify-center py-20 text-slate-500">
                        <Calendar size={48} className="mb-4 opacity-50" />
                        <p>Nenhum item recorrente configurado</p>
                    </div>
                ) : (
                    recurring.map(item => {
                        const card = item.credit_card_id ? cardMap[item.credit_card_id] : null;
                        return (
                            <motion.div
                                key={item.id}
                                layout
                                className="bg-white/5 border border-white/5 rounded-2xl p-4 hover:border-violet-500/30 transition-all group relative"
                            >
                                <div className="flex justify-between items-start mb-3">
                                    <div className={`p-2 rounded-xl ${item.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                        {item.type === 'income' ? <ArrowUpRight size={20} /> : <ArrowDownRight size={20} />}
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => { setEditingItem(item); setIsModalOpen(true); }}
                                            className="p-1.5 text-slate-500 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all font-bold text-xs"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={() => window.confirm('Excluir?') && deleteRecurring(item.id)}
                                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <h4 className="text-white font-bold truncate pr-16">{item.description}</h4>
                                <div className="space-y-1.5 mb-4 mt-1">
                                    <p className="text-slate-400 text-[10px] flex items-center gap-1 font-bold uppercase tracking-wider">
                                        <Calendar size={10} /> Dia {item.due_day} de cada mês
                                    </p>
                                    {card && (
                                        <p className="text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 opacity-70" style={{ color: card.color }}>
                                            <CreditCardIcon size={10} /> {card.name}
                                        </p>
                                    )}
                                </div>

                                <div className="flex items-end justify-between mt-auto">
                                    <div>
                                        <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider">Valor Mensal</span>
                                        <div className={`text-lg font-black ${item.type === 'income' ? 'text-emerald-400' : 'text-white'}`}>
                                            R$ {item.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>

                                    {item.last_generated === new Date().toISOString().slice(0, 7) ? (
                                        <div className="bg-emerald-500/10 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1">
                                            GERADO
                                        </div>
                                    ) : (
                                        <div className="bg-white/5 text-slate-500 text-[10px] font-bold px-2 py-1 rounded-full">
                                            PENDENTE
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        );
                    })
                )}
            </div>

            <RecurringModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                initialData={editingItem}
                tags={tags}
                cards={cards}
            />
        </div>
    );
};

export default Recurring;
