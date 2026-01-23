import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useBusiness } from '@/hooks/useBusiness';
import {
    Plus,
    Search,
    Filter,
    ArrowUpRight,
    ArrowDownRight,
    MoreVertical,
    Calendar,
    Tag,
    X,
    Check,
    Pencil,
    Trash2,
    CreditCard as CreditCardIcon,
    Download,
    Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- MODAL DE NOVA/EDITAR TRANSAÇÃO ---
const TransactionModal = ({ isOpen, onClose, onSave, initialData = null, tags = [], cards = [] }) => {
    const { t } = useTranslation();
    const { categorizeTransaction } = useBusiness();
    const [isCategorizing, setIsCategorizing] = useState(false);
    const [formData, setFormData] = useState({
        description: '',
        value: '',
        type: 'expense',
        category: 'geral',
        date: new Date().toISOString().split('T')[0],
        credit_card_id: null
    });

    // Load initial data when editing
    useEffect(() => {
        if (initialData) {
            setFormData({
                ...initialData,
                date: initialData.date || new Date().toISOString().split('T')[0],
                credit_card_id: initialData.credit_card_id || null
            });
        } else {
            // Reset for new
            setFormData({
                description: '',
                value: '',
                type: 'expense',
                category: 'geral',
                date: new Date().toISOString().split('T')[0],
                credit_card_id: null
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleMagicCategorize = async () => {
        if (!formData.description) return;
        setIsCategorizing(true);
        try {
            const result = await categorizeTransaction(formData.description, formData.type);
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
            id: initialData?.id, // Keep ID if editing
            value: parseFloat(formData.value)
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
                        {initialData ? t('business.transactions.edit_transaction') : t('business.transactions.new_transaction')}
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
                                {type === 'income' ? t('business.transactions.entry') : t('business.transactions.exit')}
                            </button>
                        ))}
                    </div>

                    {/* Descrição */}
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">{t('business.transactions.description')}</label>
                        <div className="relative">
                            <input
                                type="text"
                                required
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 pr-12 text-white focus:outline-none focus:border-violet-500/50"
                                placeholder={t('business.transactions.description_placeholder')}
                            />
                            {formData.description && (
                                <button
                                    type="button"
                                    onClick={handleMagicCategorize}
                                    disabled={isCategorizing}
                                    className={`absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg transition-all ${isCategorizing ? 'text-violet-400 animate-pulse' : 'text-slate-500 hover:text-violet-400 hover:bg-violet-400/10'
                                        }`}
                                    title={t('business.transactions.smart_categorization')}
                                >
                                    <Sparkles size={16} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Valor e Data */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">{t('business.transactions.value')}</label>
                            <input
                                type="number"
                                required
                                min="0.01"
                                step="0.01"
                                value={formData.value}
                                onChange={e => setFormData({ ...formData, value: e.target.value })}
                                className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-violet-500/50"
                                placeholder="0,00"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">{t('business.transactions.date')}</label>
                            <input
                                type="date"
                                required
                                value={formData.date}
                                onChange={e => setFormData({ ...formData, date: e.target.value })}
                                className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-violet-500/50"
                            />
                        </div>
                    </div>

                    {/* Credit Card Selection (only for expenses) */}
                    {formData.type === 'expense' && cards.length > 0 && (
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-2">Forma de Pagamento (Opcional)</label>
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

                    {/* Tags / Categorias */}
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">{t('business.transactions.category')}</label>
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
                        <input
                            type="text"
                            value={formData.category}
                            onChange={e => setFormData({ ...formData, category: e.target.value })}
                            className="mt-3 w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-violet-500/50"
                            placeholder="Ou digite uma nova categoria..."
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-3 rounded-xl mt-6 transition-colors shadow-lg shadow-violet-600/20"
                    >
                        {initialData ? t('business.transactions.save') : t('business.transactions.save')}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

// --- ACTION MENU ---
const ActionMenu = ({ onEdit, onDelete }) => {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="p-1.5 text-slate-500 hover:text-white rounded-lg transition-colors"
                title="Opções"
            >
                <MoreVertical size={16} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="absolute right-0 top-8 w-32 bg-obsidian border border-white/10 rounded-xl shadow-xl z-50 overflow-hidden"
                    >
                        <button
                            onClick={() => { onEdit(); setIsOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-white/5 hover:text-white text-left"
                        >
                            <Pencil size={14} /> Editar
                        </button>
                        <button
                            onClick={() => { onDelete(); setIsOpen(false); }}
                            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-400 hover:bg-rose-500/10 text-left border-t border-white/5"
                        >
                            <Trash2 size={14} /> Excluir
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// --- LISTA DE TRANSAÇÕES ---
const Transactions = () => {
    const { t } = useTranslation();
    const {
        transactions, fetchTransactions,
        tags, fetchTags, syncTags,
        cards, fetchCards,
        addTransaction, deleteTransaction, updateTransaction,
        exportToCSV
    } = useBusiness();

    // State
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTx, setEditingTx] = useState(null);
    const [filterType, setFilterType] = useState('all');
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        fetchTransactions({ type: filterType });
        fetchTags();
        fetchCards();
    }, [fetchTransactions, fetchTags, fetchCards, filterType]);

    // Lookup table for tag colors
    const tagMap = React.useMemo(() => {
        const map = {};
        tags.forEach(t => map[t.id] = t);
        return map;
    }, [tags]);

    const cardMap = React.useMemo(() => {
        const map = {};
        cards.forEach(c => map[c.id] = c);
        return map;
    }, [cards]);

    // Handlers
    const handleSync = async () => {
        setIsSyncing(true);
        try {
            await syncTags();
        } finally {
            setTimeout(() => setIsSyncing(false), 1000);
        }
    };
    const handleSave = async (data) => {
        if (data.id) {
            await updateTransaction(data.id, data);
        } else {
            await addTransaction(data);
        }
        // Refresh tags after save to ensure new tags appear
        await fetchTags();
        setEditingTx(null); // Clear editing state
    };

    const handleEditClick = (tx) => {
        setEditingTx(tx);
        setIsModalOpen(true);
    };

    const handleDeleteClick = async (id) => {
        if (window.confirm('Tem certeza que deseja excluir esta transação?')) {
            await deleteTransaction(id);
        }
    };

    const createNew = () => {
        setEditingTx(null);
        setIsModalOpen(true);
    };

    return (
        <div className="h-full flex flex-col p-4 bg-obsidian text-slate-200">
            {/* Header / Actions */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white">{t('business.transactions.title')}</h2>
                    <p className="text-sm text-slate-400">Gerencie todas as suas entradas e saídas</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className={`p-2 hover:bg-white/5 rounded-xl transition-all ${isSyncing ? 'text-violet-400' : 'text-slate-400 hover:text-white'}`}
                        title="Sincronizar Tags"
                    >
                        <motion.div
                            animate={isSyncing ? { rotate: 360 } : {}}
                            transition={isSyncing ? { repeat: Infinity, duration: 1, ease: "linear" } : {}}
                        >
                            <Tag size={20} />
                        </motion.div>
                    </button>
                    <button
                        onClick={exportToCSV}
                        className="p-2 hover:bg-white/5 rounded-xl text-slate-400 hover:text-white transition-all"
                        title="Exportar CSV"
                    >
                        <Download size={20} />
                    </button>
                    <button
                        onClick={createNew}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium transition-all shadow-lg shadow-violet-600/20"
                    >
                        <Plus size={18} />
                        <span>{t('business.transactions.new_transaction')}</span>
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-2 mb-4 overflow-x-auto pb-2 scrollbar-none">
                {['all', 'income', 'expense'].map(type => (
                    <button
                        key={type}
                        onClick={() => setFilterType(type)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all shrink-0 ${filterType === type
                            ? 'bg-white/10 border-white/10 text-white'
                            : 'bg-transparent border-white/5 text-slate-400 hover:bg-white/5'
                            }`}
                    >
                        {type === 'all' ? t('business.transactions.all') : type === 'income' ? t('business.transactions.income') : t('business.transactions.expense')}
                    </button>
                ))}
            </div>

            {/* Table Header */}
            <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-bold text-slate-500 uppercase tracking-wider border-b border-white/5">
                <div className="col-span-1 text-center">Tag</div>
                <div className="col-span-5 md:col-span-4">{t('business.transactions.description')}</div>
                <div className="col-span-3">{t('business.transactions.value')}</div>
                <div className="col-span-3 hidden md:block">{t('business.transactions.date')} / {t('business.transactions.category')}</div>
                <div className="col-span-1"></div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-white/10">
                {transactions.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-500">
                        <Filter size={48} className="mb-4 opacity-50" />
                        <p>{t('business.transactions.no_transactions')}</p>
                    </div>
                ) : (
                    <div className="space-y-1 mt-2 pb-20">
                        {transactions.map((tx, idx) => {
                            const tag = tagMap[tx.category];
                            const card = tx.credit_card_id ? cardMap[tx.credit_card_id] : null;
                            return (
                                <motion.div
                                    key={tx.id || idx}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="grid grid-cols-12 gap-4 px-4 py-3 items-center rounded-xl hover:bg-white/5 transition-colors group relative border border-transparent hover:border-white/5"
                                >
                                    <div className="col-span-1 flex justify-center">
                                        <div
                                            className="w-2.5 h-2.5 rounded-full shadow-sm"
                                            style={{
                                                backgroundColor: tag?.color || '#334155',
                                                boxShadow: `0 0 10px ${tag?.color || '#334155'}44`
                                            }}
                                            title={tag?.label || tx.category}
                                        />
                                    </div>
                                    <div className="col-span-5 md:col-span-4 flex items-center gap-3 overflow-hidden">
                                        <div className={`p-1.5 rounded-lg ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                                            {tx.type === 'income' ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                                        </div>
                                        <div className="flex flex-col truncate">
                                            <span className="text-sm text-slate-200 font-medium truncate">{tx.description}</span>
                                            {card && (
                                                <div className="flex items-center gap-1 text-[9px] font-bold uppercase tracking-wider opacity-60" style={{ color: card.color }}>
                                                    <CreditCardIcon size={10} /> {card.name}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                    <div className={`col-span-3 text-sm font-bold ${tx.type === 'income' ? 'text-emerald-400' : 'text-slate-200'}`}>
                                        {tx.type === 'expense' && '- '}
                                        R$ {tx.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                    </div>
                                    <div className="col-span-3 hidden md:flex flex-col">
                                        <span className="text-xs text-slate-500 font-mono">{tx.date}</span>
                                        {tx.category && (
                                            <span
                                                className="text-[10px] font-bold uppercase tracking-wider mt-0.5 truncate"
                                                style={{ color: tag?.color || '#64748b' }}
                                            >
                                                {tag?.label || tx.category}
                                            </span>
                                        )}
                                    </div>
                                    <div className="col-span-1 flex justify-end">
                                        <ActionMenu
                                            onEdit={() => handleEditClick(tx)}
                                            onDelete={() => handleDeleteClick(tx.id)}
                                        />
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            <TransactionModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                initialData={editingTx}
                tags={tags}
                cards={cards} // Pass cards to modal
            />
        </div >
    );
};

export default Transactions;
