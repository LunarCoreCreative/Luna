/**
 * FileExplorer Component
 * ----------------------
 * Explorador de arquivos estilo Cursor/VS Code para o modo IDE.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    Folder,
    FolderOpen,
    File,
    FileText,
    FileCode,
    FileJson,
    FileImage,
    ChevronRight,
    ChevronDown,
    RefreshCw,
    Search,
    Plus,
    MoreHorizontal,
    Home
} from 'lucide-react';

// Mapeamento de extensões para ícones e cores
const FILE_ICONS = {
    // JavaScript/TypeScript
    js: { icon: FileCode, color: '#f7df1e' },
    jsx: { icon: FileCode, color: '#61dafb' },
    ts: { icon: FileCode, color: '#3178c6' },
    tsx: { icon: FileCode, color: '#3178c6' },

    // Web
    html: { icon: FileCode, color: '#e34f26' },
    css: { icon: FileCode, color: '#1572b6' },
    scss: { icon: FileCode, color: '#c6538c' },

    // Data
    json: { icon: FileJson, color: '#cbcb41' },
    yaml: { icon: FileText, color: '#cb171e' },
    yml: { icon: FileText, color: '#cb171e' },

    // Python
    py: { icon: FileCode, color: '#3776ab' },

    // Markdown
    md: { icon: FileText, color: '#083fa1' },

    // Images
    png: { icon: FileImage, color: '#8bc34a' },
    jpg: { icon: FileImage, color: '#8bc34a' },
    jpeg: { icon: FileImage, color: '#8bc34a' },
    gif: { icon: FileImage, color: '#8bc34a' },
    svg: { icon: FileImage, color: '#ffb13b' },

    // Default
    default: { icon: File, color: '#6e7681' }
};

function getFileIcon(filename, isDir) {
    if (isDir) return { icon: Folder, color: '#54aeff' };

    const ext = filename.split('.').pop()?.toLowerCase();
    return FILE_ICONS[ext] || FILE_ICONS.default;
}

// =============================================================================
// TREE ITEM COMPONENT
// =============================================================================

function TreeItem({ item, level = 0, onSelect, onExpand, selectedPath, expandedPaths }) {
    const isExpanded = expandedPaths.has(item.path);
    const isSelected = selectedPath === item.path;
    const { icon: IconComponent, color } = getFileIcon(item.name, item.is_dir);

    const handleClick = () => {
        if (item.is_dir) {
            onExpand(item.path);
        } else {
            onSelect(item);
        }
    };

    return (
        <div>
            <button
                onClick={handleClick}
                className={`w-full flex items-center gap-1.5 px-2 py-1 text-sm hover:bg-white/5 transition-colors group ${isSelected ? 'bg-blue-500/20 text-blue-300' : 'text-gray-300'
                    }`}
                style={{ paddingLeft: `${8 + level * 16}px` }}
            >
                {/* Expand Arrow */}
                <span className="w-4 h-4 flex items-center justify-center shrink-0">
                    {item.is_dir && (
                        isExpanded ?
                            <ChevronDown size={14} className="text-gray-500" /> :
                            <ChevronRight size={14} className="text-gray-500" />
                    )}
                </span>

                {/* Icon */}
                {item.is_dir ? (
                    isExpanded ?
                        <FolderOpen size={16} style={{ color }} className="shrink-0" /> :
                        <Folder size={16} style={{ color }} className="shrink-0" />
                ) : (
                    <IconComponent size={16} style={{ color }} className="shrink-0" />
                )}

                {/* Name */}
                <span className="truncate flex-1 text-left">{item.name}</span>

                {/* Size for files */}
                {!item.is_dir && item.size && (
                    <span className="text-xs text-gray-500 opacity-0 group-hover:opacity-100">
                        {item.size > 1024 ? `${(item.size / 1024).toFixed(1)}KB` : `${item.size}B`}
                    </span>
                )}
            </button>

            {/* Children */}
            {item.is_dir && isExpanded && item.children && (
                <div>
                    {item.children.map((child) => (
                        <TreeItem
                            key={child.path}
                            item={child}
                            level={level + 1}
                            onSelect={onSelect}
                            onExpand={onExpand}
                            selectedPath={selectedPath}
                            expandedPaths={expandedPaths}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// MAIN FILE EXPLORER
// =============================================================================

export default function FileExplorer({
    workspace,
    onFileSelect,
    selectedFile,
    onRefresh,
    refreshKey
}) {
    const [tree, setTree] = useState([]);
    const [expandedPaths, setExpandedPaths] = useState(new Set(['.']));
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [error, setError] = useState(null);

    // Carregar diretório
    const loadDirectory = useCallback(async (path = '.') => {
        try {
            const res = await fetch('http://127.0.0.1:8001/code-agent/list-directory', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path })
            });
            const data = await res.json();

            if (data.success) {
                return data.entries
                    .filter(e => !e.name.startsWith('.') || e.name === '.env.example')
                    .sort((a, b) => {
                        // Diretórios primeiro
                        if (a.is_dir && !b.is_dir) return -1;
                        if (!a.is_dir && b.is_dir) return 1;
                        return a.name.localeCompare(b.name);
                    });
            }
            return [];
        } catch (e) {
            console.error('[FileExplorer] Error loading directory:', e);
            return [];
        }
    }, []);

    // Carregar árvore inicial ou quando refreshKey mudar
    useEffect(() => {
        if (workspace) {
            loadRootDirectory();
        }
    }, [workspace, refreshKey]);

    const loadRootDirectory = async () => {
        setLoading(true);
        setError(null);
        try {
            const entries = await loadDirectory('.');
            // Adiciona children vazios para diretórios
            const withChildren = entries.map(e => ({
                ...e,
                children: e.is_dir ? null : undefined
            }));
            setTree(withChildren);
        } catch (e) {
            setError('Erro ao carregar arquivos');
        }
        setLoading(false);
    };

    // Expandir/colapsar diretório
    const handleExpand = async (path) => {
        const newExpanded = new Set(expandedPaths);

        if (newExpanded.has(path)) {
            newExpanded.delete(path);
        } else {
            newExpanded.add(path);

            // Carregar filhos se não estiverem carregados
            const updateChildren = async (items) => {
                return Promise.all(items.map(async (item) => {
                    if (item.path === path && item.is_dir && !item.children) {
                        const children = await loadDirectory(path);
                        return {
                            ...item,
                            children: children.map(c => ({
                                ...c,
                                children: c.is_dir ? null : undefined
                            }))
                        };
                    }
                    if (item.children) {
                        return {
                            ...item,
                            children: await updateChildren(item.children)
                        };
                    }
                    return item;
                }));
            };

            const newTree = await updateChildren(tree);
            setTree(newTree);
        }

        setExpandedPaths(newExpanded);
    };

    // Filtrar por busca
    const filteredTree = searchQuery
        ? tree.filter(item =>
            item.name.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : tree;

    return (
        <div className="h-full flex flex-col bg-[#0d1117] border-r border-white/10">
            {/* Header */}
            <div className="h-10 flex items-center justify-between px-3 border-b border-white/10 shrink-0">
                <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Explorer</span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={loadRootDirectory}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                        title="Atualizar"
                    >
                        <RefreshCw size={14} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {/* Search */}
            <div className="px-2 py-2 border-b border-white/5">
                <div className="relative">
                    <Search size={14} className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Buscar arquivos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-7 pr-2 py-1.5 bg-[#161b22] border border-white/10 rounded text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
                    />
                </div>
            </div>

            {/* Workspace Path */}
            <div className="px-3 py-1.5 bg-[#161b22]/50 border-b border-white/5 flex items-center gap-2">
                <Home size={12} className="text-gray-500" />
                <span className="text-xs text-gray-400 truncate">
                    {workspace?.split(/[/\\]/).pop() || 'Workspace'}
                </span>
            </div>

            {/* Tree */}
            <div className="flex-1 overflow-y-auto py-1">
                {loading && tree.length === 0 ? (
                    <div className="flex items-center justify-center py-8">
                        <RefreshCw size={20} className="animate-spin text-gray-500" />
                    </div>
                ) : error ? (
                    <div className="px-3 py-4 text-center text-red-400 text-sm">
                        {error}
                    </div>
                ) : filteredTree.length === 0 ? (
                    <div className="px-3 py-4 text-center text-gray-500 text-sm">
                        {searchQuery ? 'Nenhum arquivo encontrado' : 'Pasta vazia'}
                    </div>
                ) : (
                    filteredTree.map((item) => (
                        <TreeItem
                            key={item.path}
                            item={item}
                            level={0}
                            onSelect={onFileSelect}
                            onExpand={handleExpand}
                            selectedPath={selectedFile?.path}
                            expandedPaths={expandedPaths}
                        />
                    ))
                )}
            </div>
        </div>
    );
}
