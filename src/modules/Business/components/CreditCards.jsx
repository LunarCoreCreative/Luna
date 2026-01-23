import React, { useState, useEffect } from 'react';
import { useBusiness } from '@/hooks/useBusiness';
import {
    Plus,
    CreditCard as CardIcon,
    Trash2,
    Calendar,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    CheckCircle2,
    X,
    Pencil,
    Wifi,
    Building2,
    Info
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- MODAL DE CARTÃO ---
const CreditCardModal = ({ isOpen, onClose, onSave, initialData = null }) => {
    const [formData, setFormData] = useState({
        name: '',
        limit: '',
        due_day: 10,
        brand: 'other',
        color: '#8B5CF6',
        last_four: '',
        notes: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                name: '',
                limit: '',
                due_day: 10,
                brand: 'other',
                color: '#8B5CF6',
                last_four: '',
                notes: ''
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...formData,
            limit: parseFloat(formData.limit)
        });
        onClose();
    };

    const brands = [
        { id: 'visa', label: 'Visa' },
        { id: 'mastercard', label: 'Mastercard' },
        { id: 'elo', label: 'Elo' },
        { id: 'amex', label: 'Amex' },
        { id: 'other', label: 'Outro' }
    ];

    const colors = ['#8B5CF6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#1f2937', '#ec4899'];

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
                        {initialData ? 'Editar Cartão' : 'Novo Cartão de Crédito'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="col-span-2">
                            <label className="block text-xs font-medium text-slate-300 mb-1">Nome do Cartão / Banco</label>
                            <input
                                type="text"
                                required
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/15"
                                placeholder="Ex: Nubank, Inter, Black..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">Limite Total (R$)</label>
                            <input
                                type="number"
                                required
                                min="0"
                                step="0.01"
                                value={formData.limit}
                                onChange={e => setFormData({ ...formData, limit: e.target.value })}
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
                                placeholder="10"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">Bandeira</label>
                            <select
                                value={formData.brand}
                                onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-violet-500/50 focus:bg-white/15 text-sm"
                                style={{ color: '#ffffff' }}
                            >
                                {brands.map(b => <option key={b.id} value={b.id} className="bg-obsidian text-white">{b.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-1">Últimos 4 Dígitos</label>
                            <input
                                type="text"
                                maxLength="4"
                                value={formData.last_four}
                                onChange={e => setFormData({ ...formData, last_four: e.target.value })}
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/15"
                                placeholder="1234"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-2">Cor do Cartão</label>
                        <div className="flex gap-2">
                            {colors.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, color: c })}
                                    className={`w-8 h-8 rounded-full border-2 transition-all ${formData.color === c ? 'border-white scale-125' : 'border-transparent opacity-60'}`}
                                    style={{ backgroundColor: c }}
                                />
                            ))}
                        </div>
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-3 rounded-xl mt-6 transition-colors shadow-lg shadow-violet-600/20"
                    >
                        {initialData ? 'Atualizar Cartão' : 'Salvar Cartão'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

// --- VISUAL CARD COMPONENT ---
const VirtualCard = ({ card, onEdit, onDelete }) => {
    return (
        <motion.div
            layout
            className="relative h-48 w-full md:w-80 rounded-[24px] p-6 text-white shadow-2xl overflow-hidden group border border-white/5 cursor-pointer"
            style={{
                background: `linear-gradient(135deg, ${card.color}, ${card.color}dd)`,
            }}
        >
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent pointer-events-none" />

            {/* Pattern */}
            <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />

            <div className="relative z-10 h-full flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-8 bg-black/20 rounded-lg backdrop-blur-md flex items-center justify-center">
                            <Wifi size={16} className="rotate-90 opacity-40" />
                        </div>
                        <span className="font-black italic text-lg tracking-tight uppercase">{card.name}</span>
                    </div>
                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => onEdit(card)} className="p-1.5 hover:bg-white/20 rounded-lg"><Pencil size={14} /></button>
                        <button onClick={() => onDelete(card.id)} className="p-1.5 hover:bg-rose-500/20 rounded-lg text-rose-100"><Trash2 size={14} /></button>
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase">Limite Disponível</span>
                    <span className="text-xl font-mono font-black">
                        R$ {card.available_limit?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </span>
                </div>

                <div className="flex justify-between items-end">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase">Fatura Atual</span>
                        <span className="text-sm font-bold">R$ {card.current_bill?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] font-bold text-white/60 tracking-widest uppercase block mb-1">Bandeira</span>
                        <div className="text-xs font-black uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-md backdrop-blur-sm">
                            {card.brand}
                        </div>
                    </div>
                </div>
            </div>

            {/* Chip Decor */}
            <div className="absolute right-6 top-1/2 -translate-y-1/2 w-12 h-10 bg-gradient-to-br from-yellow-300 to-yellow-600 rounded-md opacity-20 border border-yellow-200/50" />
        </motion.div>
    );
};

const CreditCards = () => {
    const { cards, fetchCards, addCard, updateCard, deleteCard } = useBusiness();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCard, setEditingCard] = useState(null);

    useEffect(() => {
        fetchCards();
    }, [fetchCards]);

    const handleSave = async (data) => {
        if (data.id) {
            await updateCard(data.id, data);
        } else {
            await addCard(data);
        }
        setEditingCard(null);
    };

    const handleDelete = async (id) => {
        if (window.confirm('Tem certeza que deseja remover este cartão? Transações vinculadas não serão removidas, mas perderão o vínculo.')) {
            await deleteCard(id);
        }
    };

    return (
        <div className="h-full flex flex-col p-4 bg-obsidian">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-xl font-bold text-white">Meus Cartões</h2>
                    <p className="text-sm text-slate-400">Gerencie limites e faturas de seus cartões de crédito</p>
                </div>

                <button
                    onClick={() => { setEditingCard(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium transition-all shadow-lg shadow-violet-600/20"
                >
                    <Plus size={18} />
                    <span>Novo Cartão</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
                {cards.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                        <CardIcon size={48} className="mb-4 opacity-20" />
                        <p>Nenhum cartão cadastrado</p>
                    </div>
                ) : (
                    <div className="flex flex-wrap gap-8 pb-20 justify-center md:justify-start">
                        {cards.map(card => (
                            <div key={card.id} className="flex flex-col gap-4">
                                <VirtualCard
                                    card={card}
                                    onEdit={(c) => { setEditingCard(c); setIsModalOpen(true); }}
                                    onDelete={handleDelete}
                                />
                                {/* Bottom Info Bar */}
                                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex justify-between items-center w-full md:w-80">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-slate-400">
                                            <Calendar size={16} />
                                        </div>
                                        <div>
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Vencimento</p>
                                            <p className="text-white text-xs font-bold leading-none">Dia {card.due_day}</p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Faltam</p>
                                        <p className={`text-xs font-bold leading-none ${card.days_until_due <= 5 ? 'text-rose-400' : 'text-emerald-400'}`}>
                                            {card.days_until_due} dias
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <CreditCardModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                initialData={editingCard}
            />
        </div>
    );
};

export default CreditCards;
