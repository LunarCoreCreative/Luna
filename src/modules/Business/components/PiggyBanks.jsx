import React, { useState, useEffect } from 'react';
import { useBusiness } from '@/hooks/useBusiness';
import {
    Plus,
    PiggyBank,
    Trash2,
    Calendar,
    Target,
    CheckCircle2,
    X,
    Pencil,
    TrendingUp,
    Clock,
    ArrowDown,
    ArrowUp,
    Wallet,
    Trophy
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- MODAL DE CAIXINHA ---
const PiggyBankModal = ({ isOpen, onClose, onSave, initialData = null, goals = [] }) => {
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        target_amount: '',
        color: '#8B5CF6',
        icon: '💰',
        goal_id: null
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                name: initialData.name || '',
                description: initialData.description || '',
                target_amount: initialData.target_amount || '',
                color: initialData.color || '#8B5CF6',
                icon: initialData.icon || '💰',
                goal_id: initialData.goal_id || null
            });
        } else {
            setFormData({
                name: '',
                description: '',
                target_amount: '',
                color: '#8B5CF6',
                icon: '💰',
                goal_id: null
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...formData,
            target_amount: formData.target_amount ? parseFloat(formData.target_amount) : null,
            goal_id: formData.goal_id || null
        });
        onClose();
    };

    const colorOptions = [
        '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#6366F1', '#14B8A6'
    ];

    const iconOptions = ['💰', '🏠', '🚗', '✈️', '🎓', '💍', '📱', '💻', '🎮', '🎯', '🎨', '🏖️'];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-obsidian border border-white/10 rounded-2xl w-full max-w-md p-6 relative z-10 shadow-2xl max-h-[90vh] overflow-y-auto"
            >
                <div className="flex justify-between items-center mb-6">
                    <h3 className="text-xl font-bold text-white">
                        {initialData ? 'Editar Caixinha' : 'Nova Caixinha'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Nome da Caixinha</label>
                        <input
                            type="text"
                            required
                            value={formData.name}
                            onChange={e => setFormData({ ...formData, name: e.target.value })}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:bg-white/15"
                            placeholder="Ex: Reserva de Emergência, Férias..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-2">Ícone</label>
                        <div className="flex flex-wrap gap-2">
                            {iconOptions.map(icon => (
                                <button
                                    key={icon}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, icon })}
                                    className={`text-2xl p-2 rounded-lg border transition-all ${formData.icon === icon
                                        ? 'bg-emerald-500/20 border-emerald-500/30 scale-110'
                                        : 'bg-white/5 border-white/5 hover:border-white/10'
                                        }`}
                                >
                                    {icon}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-2">Cor</label>
                        <div className="flex flex-wrap gap-2">
                            {colorOptions.map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, color })}
                                    className={`w-10 h-10 rounded-lg border-2 transition-all ${formData.color === color
                                        ? 'border-white scale-110'
                                        : 'border-white/20 hover:border-white/40'
                                        }`}
                                    style={{ backgroundColor: color }}
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Meta (Opcional)</label>
                        <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.target_amount}
                            onChange={e => setFormData({ ...formData, target_amount: e.target.value })}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:bg-white/15"
                            placeholder="0,00"
                        />
                    </div>

                    {goals.length > 0 && (
                        <div>
                            <label className="block text-xs font-medium text-slate-300 mb-2">Vincular a uma Meta (Opcional)</label>
                            <select
                                value={formData.goal_id || ''}
                                onChange={e => setFormData({ ...formData, goal_id: e.target.value || null })}
                                className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50 focus:bg-white/15"
                                style={{
                                    color: '#ffffff'
                                }}
                            >
                                <option value="" className="bg-obsidian text-white">Nenhuma meta</option>
                                {goals.map(goal => (
                                    <option key={goal.id} value={goal.id} className="bg-obsidian text-white">{goal.title}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Descrição</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:bg-white/15 h-24 resize-none"
                            placeholder="Notas sobre esta caixinha..."
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl mt-6 transition-colors shadow-lg shadow-emerald-600/20"
                    >
                        {initialData ? 'Atualizar Caixinha' : 'Criar Caixinha'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

// --- MODAL DE DEPÓSITO/RETIRADA ---
const TransactionModal = ({ isOpen, onClose, onSave, piggyBank, type = 'deposit' }) => {
    const [amount, setAmount] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        if (isOpen) {
            setAmount('');
            setDescription('');
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!amount || parseFloat(amount) <= 0) return;
        onSave(parseFloat(amount), description || undefined);
        onClose();
    };

    const maxAmount = type === 'withdrawal' ? piggyBank?.current_amount || 0 : null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-obsidian border border-white/10 rounded-2xl w-full max-w-md p-6 relative z-10 shadow-2xl"
            >
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-white">
                            {type === 'deposit' ? 'Guardar Dinheiro' : 'Retirar Dinheiro'}
                        </h3>
                        {type === 'deposit' && (
                            <p className="text-xs text-slate-400 mt-1">
                                O valor será retirado do seu saldo geral
                            </p>
                        )}
                        {type === 'withdrawal' && (
                            <p className="text-xs text-slate-400 mt-1">
                                O valor será adicionado ao seu saldo geral
                            </p>
                        )}
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Valor (R$)</label>
                        <input
                            type="number"
                            required
                            min="0.01"
                            step="0.01"
                            max={maxAmount || undefined}
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:bg-white/15"
                            placeholder="0,00"
                        />
                        {type === 'withdrawal' && maxAmount !== null && (
                            <p className="text-xs text-slate-400 mt-1">
                                Disponível: R$ {maxAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </p>
                        )}
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Descrição (Opcional)</label>
                        <input
                            type="text"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/50 focus:bg-white/15"
                            placeholder={type === 'deposit' ? 'Ex: Guardei do salário' : 'Ex: Retirei para pagar conta'}
                        />
                    </div>

                    <button
                        type="submit"
                        className={`w-full font-medium py-3 rounded-xl mt-6 transition-colors shadow-lg ${
                            type === 'deposit'
                                ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/20'
                                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-rose-600/20'
                        }`}
                    >
                        {type === 'deposit' ? 'Guardar' : 'Retirar'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

const PiggyBanks = () => {
    const {
        piggyBanks,
        piggyBanksSummary,
        goals,
        fetchPiggyBanks,
        fetchGoals,
        fetchSummary,
        addPiggyBank,
        updatePiggyBank,
        deletePiggyBank,
        depositToPiggyBank,
        withdrawFromPiggyBank
    } = useBusiness();

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [editingPiggyBank, setEditingPiggyBank] = useState(null);
    const [selectedPiggyBank, setSelectedPiggyBank] = useState(null);
    const [transactionType, setTransactionType] = useState('deposit');

    useEffect(() => {
        fetchPiggyBanks();
        fetchGoals();
    }, [fetchPiggyBanks, fetchGoals]);

    const handleSave = async (data) => {
        if (data.id) {
            await updatePiggyBank(data.id, data);
        } else {
            await addPiggyBank(data);
        }
        setEditingPiggyBank(null);
    };

    const handleTransaction = async (amount, description) => {
        if (transactionType === 'deposit') {
            await depositToPiggyBank(selectedPiggyBank.id, amount, description);
        } else {
            await withdrawFromPiggyBank(selectedPiggyBank.id, amount, description);
        }
        setSelectedPiggyBank(null);
        // Refresh summary to update balance
        await fetchSummary();
    };

    const PiggyBankCard = ({ piggyBank }) => {
        const isCompleted = piggyBank.is_completed;
        const percentage = piggyBank.percentage || 0;

        return (
            <motion.div
                layout
                className={`group relative overflow-hidden bg-white/5 border ${isCompleted ? 'border-emerald-500/30' : 'border-white/5'} rounded-3xl p-6 hover:border-white/10 transition-all`}
            >
                {/* Decorative glow */}
                <div
                    className={`absolute -right-10 -top-10 w-40 h-40 blur-[100px] opacity-10`}
                    style={{ backgroundColor: piggyBank.color }}
                />

                <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div
                            className="w-16 h-16 rounded-2xl flex items-center justify-center border text-3xl"
                            style={{
                                backgroundColor: `${piggyBank.color}33`,
                                borderColor: `${piggyBank.color}66`
                            }}
                        >
                            {piggyBank.icon || '💰'}
                        </div>
                        <div>
                            <h4 className="text-white text-lg font-bold flex items-center gap-2">
                                {piggyBank.name}
                                {isCompleted && <CheckCircle2 size={16} className="text-emerald-400" />}
                            </h4>
                            {piggyBank.description && (
                                <p className="text-xs text-slate-400 mt-1">{piggyBank.description}</p>
                            )}
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => {
                                setSelectedPiggyBank(piggyBank);
                                setTransactionType('deposit');
                                setIsTransactionModalOpen(true);
                            }}
                            className="p-2 text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                            title="Guardar"
                        >
                            <ArrowUp size={16} />
                        </button>
                        {piggyBank.current_amount > 0 && (
                            <button
                                onClick={() => {
                                    setSelectedPiggyBank(piggyBank);
                                    setTransactionType('withdrawal');
                                    setIsTransactionModalOpen(true);
                                }}
                                className="p-2 text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                                title="Retirar"
                            >
                                <ArrowDown size={16} />
                            </button>
                        )}
                        <button
                            onClick={() => {
                                setEditingPiggyBank(piggyBank);
                                setIsModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <Pencil size={14} />
                        </button>
                        <button
                            onClick={() => window.confirm('Remover caixinha?') && deletePiggyBank(piggyBank.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>

                <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Guardado</span>
                            <div className="text-2xl font-black text-white">
                                R$ {piggyBank.current_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        {piggyBank.target_amount && (
                            <div className="text-right">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Meta</span>
                                <div className="text-lg font-bold text-slate-400">
                                    R$ {piggyBank.target_amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                </div>
                            </div>
                        )}
                    </div>

                    {piggyBank.target_amount && (
                        <>
                            <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                                <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${percentage}%` }}
                                    className={`h-full rounded-full transition-all duration-1000`}
                                    style={{
                                        backgroundColor: isCompleted ? '#10B981' : piggyBank.color,
                                        boxShadow: isCompleted ? '0 0 10px rgba(16,185,129,0.5)' : `0 0 10px ${piggyBank.color}44`
                                    }}
                                />
                            </div>

                            <div className="flex justify-between items-center text-[11px] font-bold">
                                <div className={`px-2 py-1 rounded-lg ${isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-400'}`}>
                                    {percentage.toFixed(1)}% ATINGIDO
                                </div>
                                {isCompleted && (
                                    <div className="flex items-center gap-1.5 text-emerald-400">
                                        <Trophy size={12} /> META ATINGIDA
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            </motion.div>
        );
    };

    return (
        <div className="h-full flex flex-col p-4 bg-obsidian">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-xl font-bold text-white">Caixinhas</h2>
                    <p className="text-sm text-slate-400">
                        Guarde dinheiro separadamente para seus objetivos
                        {piggyBanksSummary.total_saved > 0 && (
                            <span className="ml-2 text-emerald-400 font-bold">
                                • Total guardado: R$ {piggyBanksSummary.total_saved.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                        )}
                    </p>
                </div>

                <button
                    onClick={() => {
                        setEditingPiggyBank(null);
                        setIsModalOpen(true);
                    }}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-lg shadow-emerald-600/20"
                >
                    <Plus size={20} />
                    <span>Nova Caixinha</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
                {piggyBanks.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 border border-dashed border-white/5 rounded-[40px] bg-white/[0.01]">
                        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
                            <PiggyBank size={40} className="opacity-20" />
                        </div>
                        <h3 className="text-white font-bold mb-2">Nenhuma caixinha criada</h3>
                        <p className="max-w-[280px] text-center text-sm opacity-60">
                            Crie sua primeira caixinha para guardar dinheiro separadamente, como no Nubank!
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                        {piggyBanks.map(piggyBank => (
                            <PiggyBankCard key={piggyBank.id} piggyBank={piggyBank} />
                        ))}
                    </div>
                )}
            </div>

            <PiggyBankModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                initialData={editingPiggyBank}
                goals={goals}
            />

            <TransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => {
                    setIsTransactionModalOpen(false);
                    setSelectedPiggyBank(null);
                }}
                onSave={handleTransaction}
                piggyBank={selectedPiggyBank}
                type={transactionType}
            />
        </div>
    );
};

export default PiggyBanks;
