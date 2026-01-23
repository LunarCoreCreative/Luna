import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Brain, Trash2, Search, RefreshCw, Plus, X,
    Heart, Lightbulb, MessageSquare, Tag,
    ChevronDown, ChevronUp, Calendar, Sparkles, Pencil, Filter
} from 'lucide-react';
import { listMemories, deleteMemory, searchMemories, saveMemory, updateMemory } from '@/services/memory';
import { useAuth } from '@/contexts/AuthContext';

// Modal para criar/editar memória
const MemoryModal = ({ isOpen, onClose, onSave, initialData = null }) => {
    const { t } = useTranslation();
    const [formData, setFormData] = useState({
        content: '',
        type: 'conversation'
    });

    useEffect(() => {
        if (initialData) {
            setFormData({
                content: initialData.content || '',
                type: initialData.type || 'conversation'
            });
        } else {
            setFormData({
                content: '',
                type: 'conversation'
            });
        }
    }, [initialData, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.content.trim()) return;
        await onSave(formData);
        onClose();
    };

    const types = [
        { id: 'conversation', label: 'Conversa', icon: MessageSquare, color: 'text-slate-400' },
        { id: 'preference', label: 'Preferência', icon: Heart, color: 'text-pink-400' },
        { id: 'fact', label: 'Fato', icon: Lightbulb, color: 'text-yellow-400' },
        { id: 'instruction', label: 'Instrução', icon: Tag, color: 'text-blue-400' }
    ];

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
                        {initialData ? 'Editar Memória' : 'Nova Memória'}
                    </h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-lg text-slate-400">
                        <X size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-2">Tipo de Memória</label>
                        <div className="grid grid-cols-2 gap-2">
                            {types.map(type => {
                                const Icon = type.icon;
                                return (
                                    <button
                                        key={type.id}
                                        type="button"
                                        onClick={() => setFormData({ ...formData, type: type.id })}
                                        className={`flex items-center gap-2 p-3 rounded-xl border text-sm transition-all ${
                                            formData.type === type.id
                                                ? 'bg-violet-500/10 border-violet-500/30 text-violet-300'
                                                : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                                        }`}
                                    >
                                        <Icon size={16} className={formData.type === type.id ? 'text-violet-400' : type.color} />
                                        {type.label}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs font-medium text-slate-300 mb-1">Conteúdo</label>
                        <textarea
                            required
                            value={formData.content}
                            onChange={e => setFormData({ ...formData, content: e.target.value })}
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-2.5 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/15 h-32 resize-none"
                            placeholder="O que você quer que a Luna lembre?"
                        />
                    </div>

                    <button
                        type="submit"
                        className="w-full bg-violet-600 hover:bg-violet-700 text-white font-medium py-3 rounded-xl mt-6 transition-colors shadow-lg shadow-violet-600/20"
                    >
                        {initialData ? 'Atualizar Memória' : 'Salvar Memória'}
                    </button>
                </form>
            </motion.div>
        </div>
    );
};

const MemoryManager = () => {
    const { t, i18n } = useTranslation();
    const { user } = useAuth();
    const [memories, setMemories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [expandedId, setExpandedId] = useState(null);
    const [deleting, setDeleting] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMemory, setEditingMemory] = useState(null);
    const [filterType, setFilterType] = useState('all');
    const [isSearching, setIsSearching] = useState(false);

    // Get user ID from auth
    const userId = user?.uid;
    
    // Não carregar se não houver usuário
    useEffect(() => {
        if (!userId) {
            console.log('[Memory] Usuário não autenticado, aguardando...');
            setLoading(false);
        }
    }, [userId]);

    // Carregar memórias iniciais
    const loadMemories = useCallback(async () => {
        setLoading(true);
        try {
            const result = await listMemories(userId, 200);
            setMemories(result.memories || []);
        } catch (error) {
            console.error('[Memory] Erro ao carregar memórias:', error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    useEffect(() => {
        if (userId && userId !== 'anonymous') {
            loadMemories();
        } else {
            setMemories([]);
            setLoading(false);
        }
    }, [loadMemories, userId]);

    // Buscar memórias
    const handleSearch = async () => {
        if (!userId) {
            console.warn('[Memory] Usuário não autenticado, não é possível buscar');
            return;
        }
        if (!searchQuery.trim()) {
            setSearchResults(null);
            setIsSearching(false);
            return;
        }
        setIsSearching(true);
        setLoading(true);
        try {
            const result = await searchMemories(userId, searchQuery, 20);
            setSearchResults(result.results || []);
        } catch (error) {
            console.error('[Memory] Erro na busca:', error);
            setSearchResults([]);
        } finally {
            setLoading(false);
            setIsSearching(false);
        }
    };

    // Salvar memória
    const handleSave = async (data) => {
        if (!userId) {
            console.warn('[Memory] Usuário não autenticado, não é possível salvar');
            alert('Por favor, faça login para salvar memórias');
            return;
        }
        try {
            if (editingMemory) {
                const result = await updateMemory(userId, editingMemory.id, data.content, data.type);
                if (result.success) {
                    await loadMemories();
                }
            } else {
                const result = await saveMemory(userId, data.content, data.type);
                if (result.success || result.memory_id) {
                    await loadMemories();
                }
            }
            setEditingMemory(null);
        } catch (error) {
            console.error('[Memory] Erro ao salvar:', error);
            alert('Erro ao salvar memória. Verifique o console para mais detalhes.');
        }
    };

    // Deletar memória
    const handleDelete = async (memoryId) => {
        if (!userId) {
            console.warn('[Memory] Usuário não autenticado, não é possível deletar');
            return;
        }
        if (!window.confirm('Tem certeza que deseja deletar esta memória?')) return;

        setDeleting(memoryId);
        try {
            await deleteMemory(userId, memoryId);
            setMemories(prev => prev.filter(m => m.id !== memoryId));
            if (searchResults) {
                setSearchResults(prev => prev?.filter(m => m.id !== memoryId));
            }
        } catch (error) {
            console.error('[Memory] Erro ao deletar:', error);
        } finally {
            setDeleting(null);
        }
    };

    // Ícone por tipo de memória
    const getTypeIcon = (type) => {
        switch (type) {
            case 'preference': return <Heart size={14} className="text-pink-400" />;
            case 'fact': return <Lightbulb size={14} className="text-yellow-400" />;
            case 'instruction': return <Tag size={14} className="text-blue-400" />;
            default: return <MessageSquare size={14} className="text-slate-400" />;
        }
    };

    // Label por tipo
    const getTypeLabel = (type) => {
        switch (type) {
            case 'preference': return 'Preferência';
            case 'fact': return 'Fato';
            case 'instruction': return 'Instrução';
            default: return 'Conversa';
        }
    };

    // Filtrar memórias por tipo
    const filteredMemories = filterType === 'all' 
        ? memories 
        : memories.filter(m => m.type === filterType);

    // Dados a exibir (busca ou lista completa)
    const displayData = searchResults !== null ? searchResults : filteredMemories;

    return (
        <div className="flex flex-col h-full bg-obsidian">
            {/* Header */}
            <div className="p-6 border-b border-white/10">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center">
                            <Brain size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold text-white">Memórias da Luna</h1>
                            <p className="text-sm text-slate-400">
                                {memories.length} {memories.length === 1 ? 'memória armazenada' : 'memórias armazenadas'}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => { setEditingMemory(null); setIsModalOpen(true); }}
                        className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl transition-colors shadow-lg shadow-violet-600/20"
                    >
                        <Plus size={16} />
                        <span>Nova Memória</span>
                    </button>
                </div>

                {/* Filtros e Busca */}
                <div className="space-y-3">
                    {/* Filtros por tipo */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                        <Filter size={14} className="text-slate-500 shrink-0" />
                        <button
                            onClick={() => setFilterType('all')}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all shrink-0 ${
                                filterType === 'all'
                                    ? 'bg-violet-500/10 border-violet-500/30 text-violet-300'
                                    : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                            }`}
                        >
                            Todas
                        </button>
                        {['conversation', 'preference', 'fact', 'instruction'].map(type => (
                            <button
                                key={type}
                                onClick={() => setFilterType(type)}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all shrink-0 flex items-center gap-1.5 ${
                                    filterType === type
                                        ? 'bg-violet-500/10 border-violet-500/30 text-violet-300'
                                        : 'bg-white/5 border-white/5 text-slate-400 hover:text-white'
                                }`}
                            >
                                {getTypeIcon(type)}
                                {getTypeLabel(type)}
                            </button>
                        ))}
                    </div>

                    {/* Barra de busca */}
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                placeholder="Buscar nas memórias..."
                                className="w-full pl-10 pr-4 py-2.5 bg-white/10 border border-white/20 rounded-xl text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 focus:bg-white/15 transition-colors"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={isSearching}
                            className="px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl transition-colors disabled:opacity-50"
                        >
                            {isSearching ? (
                                <RefreshCw size={16} className="animate-spin" />
                            ) : (
                                <Search size={16} />
                            )}
                        </button>
                        {(searchQuery || searchResults !== null) && (
                            <button
                                onClick={() => { 
                                    setSearchResults(null); 
                                    setSearchQuery(''); 
                                    loadMemories(); 
                                }}
                                className="px-4 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl transition-colors"
                                title="Limpar busca"
                            >
                                <RefreshCw size={16} />
                            </button>
                        )}
                    </div>

                    {searchResults !== null && (
                        <p className="text-sm text-violet-400 flex items-center gap-1">
                            <Sparkles size={14} />
                            {searchResults.length} {searchResults.length === 1 ? 'resultado encontrado' : 'resultados encontrados'} para "{searchQuery}"
                        </p>
                    )}
                </div>
            </div>

            {/* Lista de memórias */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {loading ? (
                    <div className="flex items-center justify-center h-40">
                        <RefreshCw size={24} className="text-violet-400 animate-spin" />
                    </div>
                ) : !userId ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                        <Brain size={48} className="mb-4 opacity-30" />
                        <p className="text-white font-medium mb-1">
                            Faça login para acessar suas memórias
                        </p>
                        <p className="text-sm text-slate-500">
                            As memórias são salvas por usuário autenticado
                        </p>
                    </div>
                ) : displayData.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-40 text-slate-500">
                        <Brain size={48} className="mb-4 opacity-30" />
                        <p className="text-white font-medium mb-1">
                            {searchResults !== null ? 'Nenhuma memória encontrada' : 'Nenhuma memória encontrada'}
                        </p>
                        <p className="text-sm text-slate-500">
                            {searchResults !== null 
                                ? 'Tente uma busca diferente' 
                                : 'Crie sua primeira memória para que a Luna se lembre de você'}
                        </p>
                    </div>
                ) : (
                    <AnimatePresence>
                        {displayData.map((memory) => (
                            <motion.div
                                key={memory.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="bg-white/5 border border-white/10 rounded-xl overflow-hidden hover:border-violet-500/30 transition-colors group"
                            >
                                {/* Header da memória */}
                                <div
                                    className="flex items-center gap-3 p-4 cursor-pointer"
                                    onClick={() => setExpandedId(expandedId === memory.id ? null : memory.id)}
                                >
                                    <div className="shrink-0 w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center border border-white/10">
                                        {getTypeIcon(memory.type)}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm text-white line-clamp-2">
                                            {memory.content}
                                        </p>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className="text-xs text-slate-500 capitalize px-2 py-0.5 rounded-full bg-white/5">
                                                {getTypeLabel(memory.type)}
                                            </span>
                                            {memory.similarity && (
                                                <span className="text-xs text-violet-400 px-2 py-0.5 rounded-full bg-violet-500/10">
                                                    {Math.round(memory.similarity * 100)}% relevante
                                                </span>
                                            )}
                                            {memory.created_at && (
                                                <span className="text-xs text-slate-600 flex items-center gap-1">
                                                    <Calendar size={10} />
                                                    {new Date(memory.created_at).toLocaleDateString('pt-BR', { 
                                                        day: '2-digit', 
                                                        month: 'short',
                                                        year: 'numeric'
                                                    })}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="shrink-0 flex items-center gap-2">
                                        <button
                                            onClick={(e) => { 
                                                e.stopPropagation(); 
                                                setEditingMemory(memory); 
                                                setIsModalOpen(true); 
                                            }}
                                            className="p-2 text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="Editar"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleDelete(memory.id); }}
                                            disabled={deleting === memory.id}
                                            className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors disabled:opacity-50 opacity-0 group-hover:opacity-100"
                                            title="Deletar"
                                        >
                                            {deleting === memory.id ? (
                                                <RefreshCw size={14} className="animate-spin" />
                                            ) : (
                                                <Trash2 size={14} />
                                            )}
                                        </button>
                                        {expandedId === memory.id ? (
                                            <ChevronUp size={16} className="text-slate-500" />
                                        ) : (
                                            <ChevronDown size={16} className="text-slate-500" />
                                        )}
                                    </div>
                                </div>

                                {/* Conteúdo expandido */}
                                <AnimatePresence>
                                    {expandedId === memory.id && (
                                        <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            className="border-t border-white/5"
                                        >
                                            <div className="p-4 space-y-3">
                                                <div className="bg-white/5 rounded-lg p-4 border border-white/5">
                                                    <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">
                                                        {memory.content}
                                                    </p>
                                                </div>
                                                {memory.metadata && Object.keys(memory.metadata).length > 0 && (
                                                    <div className="text-xs text-slate-500">
                                                        <strong>Metadata:</strong> {JSON.stringify(memory.metadata, null, 2)}
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                )}
            </div>

            <MemoryModal
                isOpen={isModalOpen}
                onClose={() => { setIsModalOpen(false); setEditingMemory(null); }}
                onSave={handleSave}
                initialData={editingMemory}
            />
        </div>
    );
};

export default MemoryManager;
