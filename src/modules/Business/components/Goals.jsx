import React, { useState, useEffect } from 'react';
import { useBusiness } from '@/hooks/useBusiness';
import {
    Plus,
    Trophy,
    Trash2,
    Calendar,
    Target,
    CheckCircle2,
    X,
    Pencil,
    TrendingUp,
    Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- MODAL DE META ---
const GoalModal = ({ isOpen, onClose, onSave, initialData = null }) => {
    const [formData, setFormData] = useState({
        title: '',
        target_amount: '',
        target_date: '',
        goal_type: 'savings',
        description: ''
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                title: '',
                target_amount: '',
                target_date: '',
                goal_type: 'savings',
                description: ''
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...formData,
            target_amount: parseFloat(formData.target_amount)
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
                        {initialData ? 'Editar Meta' : 'Nova Meta Financeira'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Título da Meta</label>
                        <input
                            type="text"
                            required
                            value={formData.title}
                            onChange={e => setFormData({ ...formData, title: e.target.value })}
                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                            placeholder="Ex: Reserva de Emergência, Compra de Carro..."
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Valor Objetivo (R$)</label>
                            <input
                                type="number"
                                required
                                min="1"
                                step="0.01"
                                value={formData.target_amount}
                                onChange={e => setFormData({ ...formData, target_amount: e.target.value })}
                                className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                                placeholder="0,00"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-slate-400 mb-1">Data Alvo (Opcional)</label>
                            <input
                                type="date"
                                value={formData.target_date}
                                onChange={e => setFormData({ ...formData, target_date: e.target.value })}
                                className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">Tipo de Objetivo</label>
                        <div className="grid grid-cols-2 gap-2">
                            {[
                                { id: 'savings', label: 'Poupança', icon: TrendingUp },
                                { id: 'income_increase', label: 'Aumento Renda', icon: Target },
                                { id: 'expense_reduction', label: 'Redução Gastos', icon: CheckCircle2 },
                                { id: 'other', label: 'Outro', icon: Clock }
                            ].map(type => (
                                <button
                                    key={type.id}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, goal_type: type.id })}
                                    className={`flex items-center gap-2 p-3 rounded-xl border text-sm transition-all ${formData.goal_type === type.id
                                            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                                            : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                                        }`}
                                >
                                    <type.icon size={16} />
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-1">Descrição</label>
                        <textarea
                            value={formData.description}
                            onChange={e => setFormData({ ...formData, description: e.target.value })}
                            className="w-full bg-white/5 border border-white/5 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:border-emerald-500/50 h-24 resize-none"
                            placeholder="Notas sobre como atingir este objetivo..."
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-3 rounded-xl mt-6 transition-colors shadow-lg shadow-emerald-600/20"
                    >
                        {initialData ? 'Atualizar Meta' : 'Criar Meta'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

const Goals = () => {
    const { goals, fetchGoals, addGoal, updateGoal, deleteGoal } = useBusiness();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);

    useEffect(() => {
        fetchGoals();
    }, [fetchGoals]);

    const handleSave = async (data) => {
        if (data.id) {
            await updateGoal(data.id, data);
        } else {
            await addGoal(data);
        }
        setEditingGoal(null);
    };

    const GoalCard = ({ goal }) => {
        const isCompleted = goal.percentage >= 100;

        return (
            <motion.div
                layout
                className={`group relative overflow-hidden bg-white/5 border ${isCompleted ? 'border-emerald-500/30' : 'border-white/5'} rounded-3xl p-6 hover:border-white/10 transition-all`}
            >
                {/* Decorative glow */}
                <div className={`absolute -right-10 -top-10 w-40 h-40 blur-[100px] opacity-10 ${isCompleted ? 'bg-emerald-500' : 'bg-blue-500'}`} />

                <div className="flex justify-between items-start mb-6 relative z-10">
                    <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${isCompleted ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-blue-500/10 border-blue-500/20 text-blue-300'}`}>
                            {isCompleted ? <Trophy size={24} /> : <Target size={24} />}
                        </div>
                        <div>
                            <h4 className="text-white text-lg font-bold flex items-center gap-2">
                                {goal.title}
                                {isCompleted && <CheckCircle2 size={16} className="text-emerald-400" />}
                            </h4>
                            <div className="flex items-center gap-2 text-xs text-slate-400 truncate max-w-[200px]">
                                {goal.goal_type === 'savings' ? 'Poupança' : goal.goal_type}
                            </div>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => { setEditingGoal(goal); setIsModalOpen(true); }}
                            className="p-1.5 text-slate-500 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <Pencil size={14} />
                        </button>
                        <button
                            onClick={() => window.confirm('Remover meta?') && deleteGoal(goal.id)}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                </div>

                <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-end">
                        <div className="space-y-1">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Progresso Atual</span>
                            <div className="text-2xl font-black text-white">
                                R$ {goal.current_amount.toLocaleString('pt-BR')}
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Objetivo</span>
                            <div className="text-lg font-bold text-slate-400">
                                R$ {goal.target_amount.toLocaleString('pt-BR')}
                            </div>
                        </div>
                    </div>

                    <div className="h-3 w-full bg-white/5 rounded-full overflow-hidden p-0.5 border border-white/5">
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${goal.percentage}%` }}
                            className={`h-full rounded-full transition-all duration-1000 ${isCompleted ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-gradient-to-r from-blue-600 to-emerald-500'}`}
                        />
                    </div>

                    <div className="flex justify-between items-center text-[11px] font-bold">
                        <div className={`px-2 py-1 rounded-lg ${isCompleted ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-slate-400'}`}>
                            {goal.percentage}% ATINGIDO
                        </div>

                        {goal.target_date && !isCompleted && (
                            <div className="flex items-center gap-1.5 text-amber-400">
                                <Clock size={12} />
                                {goal.days_left !== null ? `${goal.days_left} dias restantes` : goal.target_date}
                            </div>
                        )}

                        {isCompleted && (
                            <div className="flex items-center gap-1.5 text-emerald-400">
                                <Trophy size={12} /> OBJETIVO ATINGIDO
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        );
    };

    return (
        <div className="h-full flex flex-col p-4 bg-obsidian">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-xl font-bold text-white">Metas e Projetos</h2>
                    <p className="text-sm text-slate-400">Visualize seu progresso de investimentos e poupança</p>
                </div>

                <button
                    onClick={() => { setEditingGoal(null); setIsModalOpen(true); }}
                    className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold transition-all shadow-lg shadow-emerald-600/20"
                >
                    <Plus size={20} />
                    <span>Nova Meta</span>
                </button>
            </div>

            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
                {goals.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 border border-dashed border-white/5 rounded-[40px] bg-white/[0.01]">
                        <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center mb-6">
                            <Trophy size={40} className="opacity-20" />
                        </div>
                        <h3 className="text-white font-bold mb-2">Sem metas no horizonte?</h3>
                        <p className="max-w-[280px] text-center text-sm opacity-60">
                            Crie seu primeiro objetivo financeiro para acompanhar seu progresso de forma visual.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-20">
                        {goals.map(goal => (
                            <GoalCard key={goal.id} goal={goal} />
                        ))}
                    </div>
                )}
            </div>

            <GoalModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                initialData={editingGoal}
            />
        </div>
    );
};

export default Goals;
