/**
 * IDEView Component
 * -----------------
 * Interface IDE estilo Cursor com 3 painéis:
 * - Sidebar: FileExplorer
 * - Main: Editor de código com tabs
 * - Bottom: Chat do agente + Terminal
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import CodeEditor from './CodeEditor';
import {
    FolderOpen,
    LogOut,
    Send,
    Terminal as TerminalIcon,
    Code2,
    Play,
    Square,
    Check,
    X,
    Loader2,
    AlertTriangle,
    Folder,
    File,
    ChevronRight,
    ChevronDown,
    Bot,
    MessageSquare,
    PanelLeftClose,
    PanelLeft,
    Sparkles,
    Settings,
    FileCode,
    History,
    Plus,
    Trash2,
    Paperclip,
    XCircle
} from 'lucide-react';
import useCodeAgent from '../../hooks/useCodeAgent';
import { Markdown } from '../markdown/Markdown';
import FileExplorer from './FileExplorer';

import IDETerminal from './Terminal';
import { ChatInput } from '../chat/ChatInput';
import ProgressTimeline from './ProgressTimeline';

const API_URL = "http://localhost:8001";

// =============================================================================
// WORKSPACE SELECTOR (Initial Screen)
// =============================================================================

// =============================================================================
// WORKSPACE SELECTOR (VS Code Style)
// =============================================================================

function WorkspaceSelector({ onSelect }) {
    const [recents, setRecents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Carregar recentes ao iniciar
    useEffect(() => {
        try {
            const saved = localStorage.getItem('luna_recent_projects');
            if (saved) {
                setRecents(JSON.parse(saved));
            }
        } catch (e) {
            console.error("Erro ao ler recentes", e);
        }
    }, []);

    const addToRecents = (path) => {
        const name = path.split('\\').pop().split('/').pop();
        const newProject = { path, name, lastOpened: new Date().toLocaleDateString() };

        const updated = [newProject, ...recents.filter(p => p.path !== path)].slice(0, 5);
        setRecents(updated);
        localStorage.setItem('luna_recent_projects', JSON.stringify(updated));
    };

    const handleSelect = async (path) => {
        setLoading(true);
        setError('');

        const result = await onSelect(path);
        if (result.success) {
            addToRecents(path);
        } else {
            setError(result.error || 'Erro ao abrir projeto');
        }
        setLoading(false);
    };

    const handleNativePick = async () => {
        setLoading(true);
        try {
            const res = await fetch(`${API_URL}/system/pick-folder`, { method: 'POST' });
            const data = await res.json();

            if (data.success && data.path) {
                await handleSelect(data.path);
            } else if (data.error) {
                if (data.error !== "Nenhuma pasta selecionada") {
                    setError(data.error);
                }
            }
        } catch (e) {
            setError("Falha ao comunicar com o servidor.");
        }
        setLoading(false);
    };

    const [isCreating, setIsCreating] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [parentPath, setParentPath] = useState('');

    const startCreateProject = async () => {
        setLoading(true);
        try {
            // 1. Escolher pasta pai
            const res = await fetch(`${API_URL}/system/pick-folder`, { method: 'POST' });
            const data = await res.json();

            if (data.success && data.path) {
                setParentPath(data.path);
                setIsCreating(true); // Abre modal de nome
            }
        } catch (e) {
            setError("Falha ao abrir seletor.");
        }
        setLoading(false);
    };

    const confirmCreateProject = async (e) => {
        e.preventDefault();
        if (!newProjectName.trim()) return;

        setLoading(true);
        try {
            // Se windows, usar backslash
            const sep = parentPath.includes('\\') ? '\\' : '/';
            const fullPath = `${parentPath}${sep}${newProjectName.trim()}`;

            const res = await fetch(`${API_URL}/system/create-folder`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: fullPath })
            });
            const data = await res.json();

            if (data.success) {
                await handleSelect(fullPath);
                setIsCreating(false);
            } else {
                setError(data.error || "Erro ao criar pasta");
            }
        } catch (e) {
            setError("Erro de rede ao criar projeto.");
        }
        setLoading(false);
    };

    return (
        <div className="h-full bg-[#0d0e14] flex items-center justify-center p-8 relative">

            {/* Modal de Criação */}
            {isCreating && (
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
                    <div className="bg-[#161b22] border border-white/10 p-6 rounded-2xl w-full max-w-md shadow-2xl">
                        <div className="flex items-center gap-3 mb-4 text-violet-400">
                            <Plus size={24} />
                            <h3 className="text-xl font-bold text-white">Novo Projeto</h3>
                        </div>
                        <p className="text-gray-400 text-sm mb-4">
                            Criar nova pasta em: <br />
                            <span className="font-mono text-xs text-gray-500">{parentPath}</span>
                        </p>
                        <form onSubmit={confirmCreateProject} className="space-y-4">
                            <input
                                autoFocus
                                type="text"
                                placeholder="Nome do Projeto (ex: meu-app)"
                                value={newProjectName}
                                onChange={e => setNewProjectName(e.target.value)}
                                className="w-full bg-[#0d0e14] border border-white/10 rounded-xl p-3 text-white focus:outline-none focus:border-violet-500/50 transition-colors"
                            />
                            <div className="flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsCreating(false)}
                                    className="flex-1 py-2 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={!newProjectName.trim()}
                                    className="flex-1 py-2 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Criar Projeto
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <div className="w-full max-w-4xl bg-[#161b22] border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex h-[500px]">

                {/* Coluna Esquerda: Recentes */}
                <div className="w-1/2 border-r border-white/10 p-8 flex flex-col bg-[#0d0e14]/50">
                    <h2 className="text-xl font-light text-gray-400 mb-6">Recentes</h2>
                    <div className="flex-1 overflow-y-auto space-y-2 custom-scrollbar">
                        {recents.length === 0 ? (
                            <p className="text-sm text-gray-600 italic">Nenhum projeto recente.</p>
                        ) : (
                            recents.map((proj, i) => (
                                <button
                                    key={i}
                                    onClick={() => handleSelect(proj.path)}
                                    disabled={loading}
                                    className="w-full text-left p-3 rounded-lg hover:bg-white/5 group transition-colors"
                                >
                                    <div className="text-blue-400 font-medium group-hover:text-blue-300 transition-colors">
                                        {proj.name}
                                    </div>
                                    <div className="text-[11px] text-gray-600 truncate mt-0.5 font-mono">
                                        {proj.path}
                                    </div>
                                </button>
                            ))
                        )}
                    </div>
                </div>

                {/* Coluna Direita: Ações */}
                <div className="w-1/2 p-8 flex flex-col items-center justify-center relative">
                    <div className="mb-8 flex flex-col items-center">
                        <div className="w-24 h-24 bg-gradient-to-br from-violet-600/20 to-blue-600/20 rounded-3xl flex items-center justify-center mb-6 border border-white/5 shadow-inner">
                            <Sparkles size={48} className="text-violet-400" />
                        </div>
                        <h1 className="text-3xl font-bold text-white tracking-tight">Luna IDE</h1>
                        <p className="text-gray-500 mt-2 text-sm">v2.1 Code Agent</p>
                    </div>

                    <div className="space-y-4 w-full max-w-xs">
                        <button
                            onClick={handleNativePick}
                            disabled={loading}
                            className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-medium flex items-center justify-center gap-3 transition-all shadow-lg shadow-blue-900/20 hover:scale-[1.02]"
                        >
                            {loading ? <Loader2 size={20} className="animate-spin" /> : <FolderOpen size={20} />}
                            Abrir Pasta...
                        </button>

                        <button
                            onClick={startCreateProject}
                            disabled={loading}
                            className="w-full py-4 bg-[#21262d] hover:bg-[#30363d] text-white rounded-xl font-medium flex items-center justify-center gap-3 transition-all border border-white/5 hover:border-white/10"
                        >
                            <Plus size={20} className="text-gray-400" />
                            Criar Novo Projeto
                        </button>
                    </div>

                    {error && (
                        <div className="absolute bottom-4 left-4 right-4 bg-red-500/10 text-red-400 text-xs p-3 rounded-lg text-center border border-red-500/20">
                            {error}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// APPROVAL MODAL
// =============================================================================

function ApprovalModal({ approval, onApprove, onReject }) {
    if (!approval) return null;

    const isPlan = approval.type === 'implementation_plan';

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-[#1a1b26] border border-white/10 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/10 flex items-start gap-4 shrink-0">
                    <div className={`p-3 rounded-xl ${isPlan ? 'bg-violet-500/20' : 'bg-yellow-500/20'}`}>
                        {isPlan ? (
                            <Sparkles size={24} className="text-violet-400" />
                        ) : (
                            <AlertTriangle size={24} className="text-yellow-400" />
                        )}
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">
                            {isPlan ? 'Revisar Plano de Implementação' : 'Confirmar Execução de Comando'}
                        </h3>
                        <p className="text-gray-400 text-sm mt-1">{approval.reason}</p>
                    </div>
                    <button
                        onClick={onReject}
                        className="ml-auto p-2 hover:bg-white/5 rounded-lg text-gray-500 hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-[#0d0e14]/50 custom-scrollbar">
                    {isPlan ? (
                        <Markdown content={approval.content} />
                    ) : (
                        <div className="bg-[#0d0e14] rounded-xl p-4 font-mono text-sm border border-white/5">
                            <code className="text-green-400">{approval.command || approval.args?.command}</code>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-white/10 flex gap-3 shrink-0">
                    <button
                        onClick={onReject}
                        className="flex-1 py-3 px-4 bg-white/5 hover:bg-white/10 rounded-xl text-white flex items-center justify-center gap-2 transition-colors font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={onApprove}
                        className={`flex-1 py-3 px-4 rounded-xl text-white flex items-center justify-center gap-2 transition-colors font-medium ${isPlan ? 'bg-violet-600 hover:bg-violet-500' : 'bg-green-600 hover:bg-green-500'
                            }`}
                    >
                        <Check size={18} />
                        {isPlan ? 'Aprovar e Começar' : 'Executar Agora'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// TOOL CALL BADGE
// =============================================================================

function ToolBadge({ name, isActive, success }) {
    const LABELS = {
        'get_repo_map': '🔍 Analisando Estrutura',
        'read_file': '📂 Lendo Arquivo',
        'list_directory': '📂 Listando Pasta',
        'web_search': '🌐 Pesquisando',
        'read_url': '🔗 Lendo Página',
        'run_command': '💻 Executando',
        'create_artifact': '📝 Criando',
        'edit_artifact': '✏️ Editando',
        'manage_artifact': '🧠 Memória',
        'add_knowledge': '🧠 Aprendendo',
        'think': '🤔 Pensando',
        'find_symbol': '🔎 Buscando',
        'replace_block': '✏️ Editando Código'
    };

    const label = LABELS[name] || name;

    return (
        <span className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wider border transition-all ${isActive
            ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
            : success === false
                ? 'bg-red-500/10 text-red-400 border-red-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}>
            {isActive && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />}
            {!isActive && (success === false ? <X size={10} /> : <Check size={10} />)}
            {label}
        </span>
    );
}

// =============================================================================
// DIFF VIEW COMPONENT
// =============================================================================

function DiffView({ diff }) {
    if (!diff) return null;

    const lines = diff.split('\n');
    return (
        <div className="font-mono text-[11px] leading-tight space-y-0.5 mt-2 rounded-lg overflow-hidden border border-white/5 bg-[#0d0e14]">
            {lines.map((line, i) => {
                let className = "px-2 py-0.5 ";
                if (line.startsWith('+')) className += "bg-emerald-500/20 text-emerald-300";
                else if (line.startsWith('-')) className += "bg-red-500/20 text-red-300";
                else if (line.startsWith('@@')) className += "bg-blue-500/10 text-blue-400/50 italic";
                else className += "text-gray-500";

                return (
                    <div key={i} className={className + " whitespace-pre"}>
                        {line}
                    </div>
                );
            })}
        </div>
    );
}

// =============================================================================
// FILE TAB
// =============================================================================

function FileTab({ file, isActive, onSelect, onClose }) {
    const ext = file.name.split('.').pop();

    return (
        <button
            onClick={() => onSelect(file)}
            className={`flex items-center gap-2 px-3 py-2 text-sm border-r border-white/5 transition-colors group ${isActive ? 'bg-[#1e1e2e] text-white' : 'bg-transparent text-gray-400 hover:bg-white/5'
                }`}
        >
            <FileCode size={14} className="text-blue-400" />
            <span className="max-w-[120px] truncate">{file.name}</span>
            <button
                onClick={(e) => { e.stopPropagation(); onClose(file); }}
                className="p-0.5 hover:bg-white/10 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <X size={12} />
            </button>
        </button>
    );
}

// =============================================================================
// CHAT MESSAGE (IDE Mode)
// =============================================================================

function ChatMessage({ message }) {
    const isUser = message.role === 'user';

    return (
        <div className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${isUser ? 'bg-blue-500/20' : 'bg-violet-500/20'
                }`}>
                {isUser ? (
                    <span className="text-xs font-bold text-blue-400">U</span>
                ) : (
                    <Bot size={14} className="text-violet-400" />
                )}
            </div>

            <div className={`max-w-[90%] min-w-0 break-words ${isUser
                ? 'bg-blue-600/20 border-blue-500/30'
                : 'bg-[#1a1b26] border-white/10'
                } border rounded-xl px-3 py-2 overflow-hidden shadow-lg`}>

                {/* Ferramentas e Resultados */}
                {message.toolCalls && message.toolCalls.length > 0 && (
                    <div className="space-y-3 mb-3">
                        {message.toolCalls.map((tc, idx) => (
                            <div key={idx} className="flex flex-col gap-1.5">
                                <div className="flex items-center gap-2">
                                    <ToolBadge
                                        name={tc.name}
                                        isActive={!tc.result}
                                        success={tc.result?.success}
                                    />
                                    {tc.result && (
                                        <span className="text-[10px] text-gray-500 font-mono truncate max-w-[150px]">
                                            {tc.args?.path || tc.args?.command || tc.name}
                                        </span>
                                    )}
                                </div>

                                {tc.result && (
                                    <div className="ml-1 pl-2 border-l border-white/10">
                                        {tc.result.diff ? (
                                            <DiffView diff={tc.result.diff} />
                                        ) : (
                                            <details className="group">
                                                <summary className="cursor-pointer text-[10px] text-gray-500 hover:text-blue-400 transition-colors list-none flex items-center gap-1">
                                                    <ChevronRight size={10} className="group-open:rotate-90 transition-transform" />
                                                    <span>{tc.result.success ? "Ver resultado" : "Ver erro"}</span>
                                                </summary>
                                                <div className="mt-2 text-[11px] font-mono text-gray-400 whitespace-pre-wrap break-all p-2 bg-black/30 rounded-lg max-h-48 overflow-y-auto custom-scrollbar">
                                                    {tc.result.output || tc.result.content || (tc.result.success ? "Ok." : tc.result.error || "Erro.")}
                                                </div>
                                            </details>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                {/* Imagens (se houver) */}
                {message.images && message.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                        {message.images.map((img, i) => (
                            <div
                                key={i}
                                className="relative group cursor-pointer overflow-hidden rounded-lg border border-white/10 hover:border-blue-500/50 transition-colors"
                                onClick={() => window.open(img, '_blank')}
                            >
                                <img
                                    src={img}
                                    alt={`upload-${i}`}
                                    className="h-24 w-auto object-cover hover:scale-105 transition-transform duration-300"
                                />
                            </div>
                        ))}
                    </div>
                )}

                {message.content && (
                    <Markdown content={message.content} />
                )}

                <div className="text-[9px] text-gray-600 mt-2 flex justify-between items-center">
                    <span>{message.timestamp}</span>
                </div>
            </div>
        </div>
    );
}

// =============================================================================
// BRAIN VIEWER (Artifacts Sidebar)
// =============================================================================

function BrainViewer({ workspace, onClose }) {
    const [artifacts, setArtifacts] = useState([]);
    const [activeArtifact, setActiveArtifact] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchArtifacts = useCallback(async () => {
        setLoading(true);
        try {
            // Tenta ler os 3 tipos principais de artefatos
            const types = ['implementation_plan', 'task', 'walkthrough'];
            const loaded = [];

            for (const type of types) {
                const res = await fetch(`${API_URL}/code-agent/read-file`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ path: `.brain/${type}.md` })
                });
                const data = await res.json();
                if (data.success) {
                    loaded.push({ type, content: data.content, name: type.replace('_', ' ') });
                }
            }
            setArtifacts(loaded);
            if (loaded.length > 0 && !activeArtifact) {
                setActiveArtifact(loaded[0]);
            }
        } catch (e) {
            console.error('[Brain] Error loading artifacts:', e);
        }
        setLoading(false);
    }, [activeArtifact]);

    useEffect(() => {
        fetchArtifacts();
    }, []);

    const getIcon = (type) => {
        switch (type) {
            case 'implementation_plan': return <Sparkles size={14} className="text-violet-400" />;
            case 'task': return <Check size={14} className="text-emerald-400" />;
            case 'walkthrough': return <FileCode size={14} className="text-blue-400" />;
            default: return <File size={14} />;
        }
    };

    return (
        <div className="absolute inset-0 bg-[#0d1117] z-30 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="h-10 flex items-center px-4 border-b border-white/10 bg-[#161b22] shrink-0">
                <Bot size={16} className="text-violet-400 mr-2" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Luna Brain</span>
                <div className="ml-auto flex items-center gap-1">
                    <button onClick={fetchArtifacts} className="p-1 hover:bg-white/10 rounded" title="Recarregar">
                        <Loader2 size={14} className={`text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                    <button onClick={onClose} className="p-1 hover:bg-white/10 rounded" title="Fechar">
                        <X size={16} className="text-gray-500" />
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="flex-1 flex items-center justify-center">
                    <Loader2 size={24} className="text-violet-500 animate-spin" />
                </div>
            ) : artifacts.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-gray-500">
                    <Bot size={40} className="mb-4 opacity-20" />
                    <p className="text-sm">Nenhum artefato de planejamento encontrado ainda.</p>
                </div>
            ) : (
                <div className="flex-1 flex flex-col overflow-hidden">
                    <div className="flex border-b border-white/5 bg-[#0d1117] shrink-0 p-1 gap-1">
                        {artifacts.map(art => (
                            <button
                                key={art.type}
                                onClick={() => setActiveArtifact(art)}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-1 rounded-lg text-[10px] font-bold uppercase transition-all ${activeArtifact?.type === art.type ? 'bg-violet-500/20 text-violet-400' : 'text-gray-500 hover:bg-white/5'}`}
                            >
                                {getIcon(art.type)}
                                <span className="truncate">{art.name}</span>
                            </button>
                        ))}
                    </div>

                    <div className="flex-1 overflow-y-auto p-4 prose prose-invert prose-sm max-w-none custom-scrollbar">
                        {activeArtifact && <Markdown content={activeArtifact.content} />}
                    </div>
                </div>
            )}
        </div>
    );
}

// =============================================================================
// HISTORY SIDEBAR
// =============================================================================

function HistorySidebar({ chats, activeId, onSelect, onDelete, onClose }) {
    return (
        <div className="absolute inset-0 bg-[#0d1117] z-40 flex flex-col animate-in slide-in-from-right duration-300">
            <div className="h-10 flex items-center px-4 border-b border-white/10 bg-[#161b22] shrink-0">
                <History size={16} className="text-violet-400 mr-2" />
                <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Histórico de Chats</span>
                <button onClick={onClose} className="ml-auto p-1 hover:bg-white/10 rounded">
                    <X size={16} className="text-gray-500" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
                {chats.length === 0 ? (
                    <div className="py-8 text-center text-gray-600 text-sm">
                        Nenhum chat salvo ainda.
                    </div>
                ) : (
                    chats.map(chat => (
                        <div
                            key={chat.id}
                            className={`group flex items-center gap-2 p-3 rounded-xl transition-all cursor-pointer border ${activeId === chat.id
                                ? 'bg-violet-500/10 border-violet-500/30 text-violet-400'
                                : 'bg-[#161b22]/50 border-white/5 text-gray-400 hover:bg-white/5 hover:border-white/10'
                                }`}
                            onClick={() => onSelect(chat.id)}
                        >
                            <MessageSquare size={14} className="shrink-0" />
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-medium truncate">{chat.title || 'Chat Sem Título'}</p>
                                <p className="text-[10px] opacity-40 mt-0.5">{chat.date}</p>
                            </div>
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onDelete(chat.id);
                                }}
                                className="p-1.5 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400 rounded-lg transition-all"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}

// =============================================================================
// MAIN IDE VIEW
// =============================================================================

export default function IDEView({ onClose }) {
    const codeAgent = useCodeAgent();
    const [input, setInput] = useState(''); // Mantido apenas para compatibilidade se necessário, mas ChatInput usa interno
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [refreshFilesCounter, setRefreshFilesCounter] = useState(0);
    const [terminalOpen, setTerminalOpen] = useState(false);
    const [terminalOutput, setTerminalOutput] = useState([]);
    const [terminalRunning, setTerminalRunning] = useState(false);
    const [historyOpen, setHistoryOpen] = useState(false);
    const [brainOpen, setBrainOpen] = useState(false);
    const [isThinkingMode, setIsThinkingMode] = useState(false);

    // Arquivos abertos
    const [openFiles, setOpenFiles] = useState([]);
    const [activeFile, setActiveFile] = useState(null);
    const [fileContent, setFileContent] = useState('');
    const [fileLanguage, setFileLanguage] = useState('plaintext');

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const fileInputRef = useRef(null);
    const [attachments, setAttachments] = useState([]);

    // Hook de anexos para o ChatInput
    const attachmentsHook = {
        attachments,
        setAttachments,
        fileInputRef,
        handlePaste: async (e) => {
            const items = e.clipboardData.items;
            const newImages = [];

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    e.preventDefault();
                    const blob = items[i].getAsFile();
                    const reader = new FileReader();
                    await new Promise((resolve) => {
                        reader.onload = (e) => {
                            newImages.push(e.target.result);
                            resolve();
                        };
                        reader.readAsDataURL(blob);
                    });
                }
            }
            if (newImages.length > 0) {
                setAttachments(prev => [...prev, ...newImages]);
            }
        }
    };

    // Auto scroll
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [codeAgent.messages, codeAgent.streamBuffer]);

    // Conectar ao montar e buscar chats
    useEffect(() => {
        if (codeAgent.isConfigured && !codeAgent.isConnected) {
            codeAgent.connect();
        }
        if (codeAgent.isConfigured) {
            codeAgent.fetchChats();
        }
    }, [codeAgent.isConfigured]);

    // Mapeamento de extensões para linguagens Monaco
    const getLanguage = (filename) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        const langMap = {
            js: 'javascript', jsx: 'javascript', ts: 'typescript', tsx: 'typescript',
            py: 'python', html: 'html', css: 'css', scss: 'scss',
            json: 'json', md: 'markdown', yaml: 'yaml', yml: 'yaml',
            sql: 'sql', sh: 'shell', bash: 'shell', ps1: 'powershell',
        };
        return langMap[ext] || 'plaintext';
    };

    // Abrir arquivo no editor
    const handleFileSelect = async (file) => {
        if (file.is_dir) return;

        try {
            const res = await fetch(`${API_URL}/code-agent/read-file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: file.path })
            });
            const data = await res.json();

            if (data.success) {
                // Adiciona às tabs se não estiver já
                if (!openFiles.find(f => f.path === file.path)) {
                    setOpenFiles(prev => [...prev, file]);
                }
                setActiveFile(file);
                setFileContent(data.content);
                setFileLanguage(getLanguage(file.name));
            }
        } catch (e) {
            console.error('[IDE] Error loading file:', e);
        }
    };

    // Fechar tab
    const handleCloseTab = (file) => {
        setOpenFiles(prev => prev.filter(f => f.path !== file.path));
        if (activeFile?.path === file.path) {
            const remaining = openFiles.filter(f => f.path !== file.path);
            setActiveFile(remaining[remaining.length - 1] || null);
            setFileContent('');
        }
    };

    // Selecionar tab (carrega conteúdo do arquivo)
    const handleTabSelect = async (file) => {
        if (activeFile?.path === file.path) return; // Já está ativa

        try {
            const res = await fetch(`${API_URL}/code-agent/read-file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: file.path })
            });
            const data = await res.json();

            if (data.success) {
                setActiveFile(file);
                setFileContent(data.content);
                setFileLanguage(getLanguage(file.name));
            }
        } catch (e) {
            console.error('[IDE] Error loading file from tab:', e);
        }
    };

    // Enviar mensagem
    // Enviar mensagem
    const handleSend = async (text, images = []) => {
        if ((!text?.trim() && images.length === 0) || codeAgent.isStreaming) return;

        // Se text for evento (onClick), usar input state
        const content = typeof text === 'string' ? text : ""; // ChatInput gerencia state agora

        codeAgent.sendMessage(content, images);
        setAttachments([]); // Limpa anexos após envio
    };

    // Executar comando no terminal
    const handleTerminalCommand = async (command) => {
        setTerminalOutput(prev => [...prev, { text: command, type: 'input' }]);
        setTerminalRunning(true);

        try {
            const res = await fetch(`${API_URL}/code-agent/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command })
            });
            const data = await res.json();

            if (data.success) {
                setTerminalOutput(prev => [...prev, { text: data.output || '(sem saída)', type: 'output' }]);
            } else {
                setTerminalOutput(prev => [...prev, { text: data.error || data.output || 'Erro', type: 'error' }]);
            }
        } catch (e) {
            setTerminalOutput(prev => [...prev, { text: `Erro: ${e.message}`, type: 'error' }]);
        }

        setTerminalRunning(false);
    };

    // Trigger refresh when agent finishes streaming
    useEffect(() => {
        if (!codeAgent.isStreaming && codeAgent.messages.length > 0) {
            setRefreshFilesCounter(prev => prev + 1);
        }
    }, [codeAgent.isStreaming]);

    // Se não configurado, mostra seletor
    if (!codeAgent.isConfigured) {
        return <WorkspaceSelector onSelect={codeAgent.setWorkspacePath} />;
    }

    return (
        <div className="h-full bg-[#0d0e14] flex flex-col">
            {/* Main Layout */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar - FileExplorer */}
                <div
                    className={`shrink-0 flex flex-col relative transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-10'}`}
                >
                    {/* Mini toolbar */}
                    <div className="h-9 bg-[#161b22] border-b border-white/10 flex items-center justify-between px-2 shrink-0 gap-1 relative z-[60]" style={{ WebkitAppRegion: "drag" }}>
                        <button
                            onClick={() => setSidebarOpen(!sidebarOpen)}
                            className="p-1.5 hover:bg-white/10 rounded transition-colors"
                            title={sidebarOpen ? 'Minimizar' : 'Expandir'}
                            style={{ WebkitAppRegion: "no-drag" }}
                        >
                            {sidebarOpen ? <PanelLeftClose size={14} className="text-gray-400" /> : <PanelLeft size={14} className="text-gray-400" />}
                        </button>

                        <div className="flex items-center gap-1" style={{ WebkitAppRegion: "no-drag" }}>
                            {sidebarOpen && (
                                <button
                                    onClick={() => setTerminalOpen(!terminalOpen)}
                                    className={`p-1.5 hover:bg-white/10 rounded transition-colors ${terminalOpen ? 'bg-white/10 text-violet-400' : 'text-gray-400'}`}
                                    title={terminalOpen ? 'Fechar Terminal' : 'Abrir Terminal'}
                                >
                                    <TerminalIcon size={14} />
                                </button>
                            )}

                            <button
                                onClick={onClose}
                                className="p-1.5 hover:bg-red-500/10 hover:text-red-400 text-gray-400 rounded transition-colors"
                                title="Sair do Modo IDE"
                            >
                                <LogOut size={14} />
                            </button>
                        </div>
                    </div>

                    {/* File Explorer */}
                    {sidebarOpen && (
                        <div className="flex-1 overflow-hidden">
                            <FileExplorer
                                workspace={codeAgent.workspace}
                                onFileSelect={handleFileSelect}
                                selectedFile={activeFile}
                                refreshKey={refreshFilesCounter}
                            />
                        </div>
                    )}

                    {/* Sidebar Resize Handle REMOVED */}
                </div>

                {/* Center - Editor */}
                <div className="flex-1 w-0 flex flex-col min-w-0 border-l border-white/10">
                    {/* Tabs */}
                    {openFiles.length > 0 && (
                        <div className="h-9 bg-[#0d1117] border-b border-white/10 flex items-center overflow-x-auto shrink-0 relative z-[60]" style={{ WebkitAppRegion: "drag" }}>
                            {openFiles.map((file) => (
                                <div key={file.path} className="shrink-0 flex" style={{ WebkitAppRegion: "no-drag" }}>
                                    <FileTab
                                        key={file.path}
                                        file={file}
                                        isActive={activeFile?.path === file.path}
                                        onSelect={handleTabSelect}
                                        onClose={handleCloseTab}
                                    />
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Editor */}
                    <div className="flex-1 overflow-hidden relative">
                        {activeFile ? (
                            <CodeEditor
                                language={fileLanguage}
                                value={fileContent}
                                onChange={(value) => setFileContent(value || '')}
                            />
                        ) : (
                            <div className="h-full flex items-center justify-center text-gray-500">
                                <div className="text-center">
                                    <FileCode size={48} className="mx-auto mb-4 text-gray-600" />
                                    <p>Selecione um arquivo para editar</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Right - Chat Panel */}
                <div
                    className="shrink-0 border-l border-white/10 flex flex-col bg-[#0d1117] relative group w-[550px] z-50"
                >

                    {/* Chat Header */}
                    <div className="relative h-9 flex items-center px-3 border-b border-white/10 bg-[#161b22] z-[60]" style={{ WebkitAppRegion: "drag" }}>
                        <MessageSquare size={14} className="text-violet-400 mr-2" />
                        <span className="text-sm font-medium text-gray-300">Chat</span>

                        <div className="ml-auto flex items-center gap-1" style={{ WebkitAppRegion: "no-drag" }}>
                            {codeAgent.isStreaming ? (
                                <div className="flex items-center gap-1 text-[10px] text-blue-400 mr-2">
                                    <Loader2 size={10} className="animate-spin" />
                                    <span>{codeAgent.status?.message || 'PENSANDO...'}</span>
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={() => {
                                            codeAgent.newChat();
                                            setHistoryOpen(false);
                                        }}
                                        className="p-1.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                                        title="Novo Chat"
                                    >
                                        <Plus size={14} />
                                    </button>
                                    <button
                                        onClick={() => setBrainOpen(!brainOpen)}
                                        className={`p-1.5 hover:bg-white/10 rounded transition-colors ${brainOpen ? 'text-violet-400 bg-white/5' : 'text-gray-400'}`}
                                        title="Luna's Brain (Planos & Tasks)"
                                    >
                                        <Bot size={14} />
                                    </button>
                                    <button
                                        onClick={() => {
                                            codeAgent.fetchChats();
                                            setHistoryOpen(!historyOpen);
                                            setBrainOpen(false);
                                        }}
                                        className={`p-1.5 hover:bg-white/10 rounded transition-colors ${historyOpen ? 'text-violet-400 bg-white/5' : 'text-gray-400'}`}
                                        title="Histórico"
                                    >
                                        <History size={14} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Chat Content relative for Sidebar */}
                    <div className="flex-1 relative flex flex-col overflow-hidden">
                        {/* Brain / Artifacts Overlay */}
                        {brainOpen && (
                            <BrainViewer
                                workspace={codeAgent.workspace}
                                onClose={() => setBrainOpen(false)}
                            />
                        )}

                        {/* History Overlay */}
                        {historyOpen && (
                            <HistorySidebar
                                chats={codeAgent.chats}
                                activeId={codeAgent.activeChatId}
                                onSelect={(id) => {
                                    codeAgent.loadChat(id);
                                    setHistoryOpen(false);
                                }}
                                onDelete={(id) => {
                                    codeAgent.deleteChat(id);
                                }}
                                onClose={() => setHistoryOpen(false)}
                            />
                        )}

                        {/* Messages */}
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {codeAgent.messages.length === 0 && !codeAgent.streamBuffer ? (
                                <div className="text-center text-gray-500 py-8 text-sm">
                                    <Bot size={32} className="mx-auto mb-3 text-gray-600" />
                                    <p>Olá! Como posso ajudar?</p>
                                </div>
                            ) : (
                                codeAgent.messages.map((msg, idx) => (
                                    <ChatMessage key={idx} message={msg} />
                                ))
                            )}

                            {/* Streaming */}
                            {(codeAgent.streamBuffer || codeAgent.toolCalls.length > 0 || (codeAgent.isStreaming && !codeAgent.streamBuffer)) && (
                                <div className="flex gap-3 animate-in fade-in duration-300">
                                    <div className="w-7 h-7 rounded-lg bg-violet-500/20 flex items-center justify-center shrink-0">
                                        <Bot size={14} className="text-violet-400" />
                                    </div>
                                    <div className="flex-1 bg-[#1a1b26] border border-white/10 rounded-xl px-3 py-2 min-w-0 overflow-hidden break-words">
                                        {/* Progress Timeline - Substitui badges dispersos */}
                                        {codeAgent.progressSteps?.length > 0 && (
                                            <ProgressTimeline
                                                steps={codeAgent.progressSteps}
                                                isStreaming={codeAgent.isStreaming}
                                            />
                                        )}
                                        {codeAgent.streamBuffer ? (
                                            <Markdown content={codeAgent.streamBuffer} />
                                        ) : (
                                            <div className="flex items-center gap-2 text-gray-500 text-xs py-1">
                                                <Loader2 size={12} className="animate-spin" />
                                                <span>{codeAgent.status?.message || 'Processando...'}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div ref={messagesEndRef} />
                        </div>

                        {/* Input Refatorado para ChatInput (Performance) */}
                        <div className="p-4 border-t border-white/10 bg-[#161b22]">
                            <ChatInput
                                ref={inputRef}
                                onSend={(text) => handleSend(text, attachments)}
                                onStop={() => {/* Implementar stop se necessário */ }}
                                isStreaming={codeAgent.isStreaming}
                                attachmentsHook={attachmentsHook}
                                isThinkingMode={isThinkingMode}
                                setIsThinkingMode={setIsThinkingMode}
                                placeholder="Pergunte algo... (Shift+Enter para pular linha)"
                            />

                            {/* Hidden File Input for Attachments (Managed by ChatInput via ref) */}
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                multiple
                                onChange={async (e) => {
                                    const files = Array.from(e.target.files);
                                    const newImages = [];
                                    for (const file of files) {
                                        const reader = new FileReader();
                                        await new Promise((resolve) => {
                                            reader.onload = (e) => {
                                                newImages.push(e.target.result);
                                                resolve();
                                            };
                                            reader.readAsDataURL(file);
                                        });
                                    }
                                    setAttachments(prev => [...prev, ...newImages]);
                                    e.target.value = '';
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>


            {/* Terminal */}
            <IDETerminal
                isOpen={terminalOpen}
                onToggle={() => setTerminalOpen(!terminalOpen)}
                onCommand={handleTerminalCommand}
                output={terminalOutput}
                isRunning={terminalRunning}
                cwd={codeAgent.workspace?.split(/[/\\]/).pop()}
            />

            {/* Approval Modal */}
            <ApprovalModal
                approval={codeAgent.pendingApproval}
                onApprove={() => codeAgent.approveCommand(true)}
                onReject={() => codeAgent.approveCommand(false)}
            />
        </div >
    );
}
