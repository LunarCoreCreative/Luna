import React, { useState, useEffect } from 'react';
import { useBusiness } from '@/hooks/useBusiness';
import {
    Plus,
    Target,
    Trash2,
    Calendar,
    ChevronLeft,
    ChevronRight,
    AlertTriangle,
    CheckCircle2,
    X,
    Pencil
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// --- MODAL DE ORÇAMENTO ---
const BudgetModal = ({ isOpen, onClose, onSave, initialData = null, tags = [], period }) => {
    const [formData, setFormData] = useState({
        category: 'geral',
        amount: '',
        type: 'expense',
        period: period
    });

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({
                category: tags[0]?.id || 'geral',
                amount: '',
                type: 'expense',
                period: period
            });
        }
    }, [initialData, isOpen, period, tags]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({
            ...formData,
            amount: parseFloat(formData.amount)
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
                        {initialData ? 'Editar Orçamento' : 'Novo Orçamento'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-2">Categoria</label>
                        <div className="flex flex-wrap gap-2 max-h-40 overflow-y-auto p-1 scrollbar-thin">
                            {tags.map(tag => (
                                <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, category: tag.id })}
                                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all flex items-center gap-1.5 ${formData.category === tag.id
                                        ? 'border-white/20 scale-105 shadow-lg'
                                        : 'border-white/5 opacity-60 hover:opacity-100'
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

                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Limite Mensal (R$)</label>
                        <input
                            type="number"
                            required
                            min="0.01"
                            step="0.01"
                            value={formData.amount}
                            onChange={e => setFormData({ ...formData, amount: e.target.value })}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/15"
                            placeholder="0,00"
                        />
                    </div>

                    <div className="p-4 bg-violet-500/5 border border-violet-500/10 rounded-xl text-xs text-violet-300">
                        Este orçamento será aplicado ao período de <strong>{formData.period}</strong>.
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-3 rounded-xl mt-6 transition-colors shadow-lg shadow-violet-600/20"
                    >
                        {initialData ? 'Atualizar Orçamento' : 'Salvar Orçamento'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

const Budget = () => {
    const {
        budgets, fetchBudgets, addBudget, updateBudget, deleteBudget,
        tags, fetchTags
    } = useBusiness();

    const [currentPeriod, setCurrentPeriod] = useState(() => new Date().toISOString().slice(0, 7));
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingBudget, setEditingBudget] = useState(null);

    useEffect(() => {
        fetchBudgets(currentPeriod);
        fetchTags();
    }, [fetchBudgets, fetchTags, currentPeriod]);

    const handleSave = async (data) => {
        if (data.id) {
            await updateBudget(data.id, data);
        } else {
            await addBudget(data);
        }
        setEditingBudget(null);
    };

    const changePeriod = (dir) => {
        const [year, month] = currentPeriod.split('-').map(Number);
        const date = new Date(year, month - 1 + dir, 1);
        setCurrentPeriod(date.toISOString().slice(0, 7));
    };

    const StatusBadge = ({ status }) => {
        switch (status) {
            case 'exceeded': return (
                <div className="flex items-center gap-1 text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    <AlertTriangle size={10} /> EXCEDIDO
                </div>
            );
            case 'warning': return (
                <div className="flex items-center gap-1 text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    <AlertTriangle size={10} /> ATENÇÃO
                </div>
            );
            default: return (
                <div className="flex items-center gap-1 text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    <CheckCircle2 size={10} /> NO ALVO
                </div>
            );
        }
    };

    return (
        <div className="h-full flex flex-col p-4 bg-obsidian text-slate-200">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
                <div>
                    <h2 className="text-xl font-bold text-white">Planejamento Orçamentário</h2>
                    <p className="text-sm text-slate-400">Defina metas de gastos por categoria</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center bg-white/5 rounded-xl p-1 border border-white/5">
                        <button onClick={() => changePeriod(-1)} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all">
                            <ChevronLeft size={18} />
                        </button>
                        <span className="px-4 text-sm font-bold text-white font-mono">{currentPeriod}</span>
                        <button onClick={() => changePeriod(1)} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-all">
                            <ChevronRight size={18} />
                        </button>
                    </div>

                    <button
                        onClick={() => { setEditingBudget(null); setIsModalOpen(true); }}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-medium transition-all shadow-lg shadow-violet-600/20"
                    >
                        <Plus size={18} />
                        <span className="hidden sm:inline">Definir Meta</span>
                    </button>
                </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto pr-2 scrollbar-thin">
                {budgets.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-slate-500 border border-dashed border-white/5 rounded-3xl">
                        <Target size={48} className="mb-4 opacity-50" />
                        <p>Nenhum orçamento definido para este período</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
                        {budgets.map(b => {
                            const tag = tags.find(t => t.id === b.category);
                            const color = tag?.color || '#8b5cf6';
                            return (
                                <motion.div
                                    key={b.id}
                                    layout
                                    className="bg-white/5 border border-white/5 rounded-2xl p-5 hover:border-white/10 transition-all group relative overflow-hidden"
                                >
                                    {/* Background glow based on color */}
                                    <div
                                        className="absolute top-0 right-0 w-32 h-32 blur-[80px] -mr-10 -mt-10 opacity-10"
                                        style={{ backgroundColor: color }}
                                    />

                                    <div className="flex justify-between items-start mb-4 relative z-10">
                                        <div className="flex items-center gap-3">
                                            <div
                                                className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/10"
                                                style={{ backgroundColor: `${color}15`, color: color }}
                                            >
                                                <Target size={20} />
                                            </div>
                                            <div>
                                                <h4 className="text-white font-bold">{tag?.label || b.category}</h4>
                                                <StatusBadge status={b.status} />
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => { setEditingBudget(b); setIsModalOpen(true); }}
                                                className="p-1.5 text-slate-500 hover:text-white rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Pencil size={14} />
                                            </button>
                                            <button
                                                onClick={() => window.confirm('Remover orçamento?') && deleteBudget(b.id)}
                                                className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 size={14} />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-3 relative z-10">
                                        <div className="flex justify-between text-xs font-medium">
                                            <span className="text-slate-400">Progresso</span>
                                            <span className="text-slate-200">
                                                R$ {b.actual?.toLocaleString('pt-BR')} / R$ {b.amount.toLocaleString('pt-BR')}
                                            </span>
                                        </div>

                                        <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                                            <motion.div
                                                initial={{ width: 0 }}
                                                animate={{ width: `${Math.min(b.percentage, 100)}%` }}
                                                className={`h-full transition-all duration-1000 ${b.status === 'exceeded' ? 'bg-rose-500' :
                                                        b.status === 'warning' ? 'bg-amber-500' : 'bg-violet-500'
                                                    }`}
                                                style={b.status === 'ok' ? { backgroundColor: color } : {}}
                                            />
                                        </div>

                                        <div className="flex justify-between items-end">
                                            <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                                                {b.percentage}% UTILIZADO
                                            </div>
                                            <div className="text-right">
                                                <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">Restante</div>
                                                <div className={`text-sm font-black ${b.remaining > 0 ? 'text-white' : 'text-rose-400'}`}>
                                                    R$ {b.remaining.toLocaleString('pt-BR')}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                )}
            </div>

            <BudgetModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                initialData={editingBudget}
                tags={tags}
                period={currentPeriod}
            />
        </div>
    );
};

export default Budget;
