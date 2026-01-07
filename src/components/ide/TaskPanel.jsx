/**
 * TaskPanel Component
 * -------------------
 * Visual task/checklist panel for Luna's brain files.
 * Displays hierarchical task lists from markdown files.
 */

import React, { useState, useEffect } from 'react';
import {
    X,
    CheckSquare,
    Square,
    MinusSquare,
    ChevronRight,
    ChevronDown,
    FileText,
    Brain,
    ListTodo,
    ClipboardList,
    BookOpen,
    RefreshCw
} from 'lucide-react';

const API_URL = "http://localhost:8001";

// =============================================================================
// TASK PARSER - Converts markdown to task structure
// =============================================================================

function parseTaskLine(line) {
    // Match: - [ ] task, - [x] task, - [/] task (with indentation)
    const match = line.match(/^(\s*)[-*]\s*\[([ xX/])\]\s*(.+)$/);
    if (!match) return null;

    const [, indent, status, text] = match;
    return {
        indent: indent.length,
        status: status === 'x' || status === 'X' ? 'done' : status === '/' ? 'progress' : 'pending',
        text: text.trim()
    };
}

function parseMarkdownTasks(content) {
    if (!content) return { title: 'Tasks', tasks: [] };

    const lines = content.split('\n');
    let title = 'Tasks';
    const tasks = [];
    let currentGroup = null;

    for (const line of lines) {
        // Check for title (# Task: ...)
        const titleMatch = line.match(/^#\s*(?:Task:\s*)?(.+)$/);
        if (titleMatch) {
            title = titleMatch[1].trim();
            continue;
        }

        // Check for section header (## ...)
        const sectionMatch = line.match(/^##\s+(.+)$/);
        if (sectionMatch) {
            if (currentGroup) {
                tasks.push(currentGroup);
            }
            currentGroup = {
                type: 'group',
                title: sectionMatch[1].trim(),
                children: []
            };
            continue;
        }

        // Check for task line
        const task = parseTaskLine(line);
        if (task) {
            const taskObj = {
                type: 'task',
                text: task.text,
                status: task.status,
                indent: task.indent
            };

            if (currentGroup) {
                currentGroup.children.push(taskObj);
            } else {
                tasks.push(taskObj);
            }
        }
    }

    // Add last group
    if (currentGroup) {
        tasks.push(currentGroup);
    }

    return { title, tasks };
}

// =============================================================================
// TASK ITEM COMPONENT
// =============================================================================

function TaskItem({ task, depth = 0 }) {
    const StatusIcon = {
        done: CheckSquare,
        progress: MinusSquare,
        pending: Square
    }[task.status];

    const statusColors = {
        done: 'text-green-400',
        progress: 'text-yellow-400',
        pending: 'text-gray-500'
    };

    const textColors = {
        done: 'text-gray-400 line-through',
        progress: 'text-gray-200',
        pending: 'text-gray-300'
    };

    return (
        <div
            className="flex items-start gap-2 py-1"
            style={{ paddingLeft: `${depth * 16 + 8}px` }}
        >
            <StatusIcon size={16} className={`shrink-0 mt-0.5 ${statusColors[task.status]}`} />
            <span className={`text-sm ${textColors[task.status]}`}>
                {task.text}
            </span>
        </div>
    );
}

// =============================================================================
// TASK GROUP COMPONENT
// =============================================================================

function TaskGroup({ group, defaultOpen = true }) {
    const [isOpen, setIsOpen] = useState(defaultOpen);

    // Calculate completion stats
    const total = group.children.filter(c => c.type === 'task').length;
    const done = group.children.filter(c => c.type === 'task' && c.status === 'done').length;
    const allDone = total > 0 && done === total;

    return (
        <div className="mb-2">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 w-full px-2 py-1.5 hover:bg-white/5 rounded transition-colors"
            >
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <span className={`text-sm font-medium ${allDone ? 'text-green-400' : 'text-gray-200'}`}>
                    {group.title}
                </span>
                <span className="text-xs text-gray-500 ml-auto">
                    {done}/{total}
                </span>
            </button>

            {isOpen && (
                <div className="ml-2 border-l border-white/10">
                    {group.children.map((child, idx) => (
                        child.type === 'task' ? (
                            <TaskItem key={idx} task={child} depth={child.indent / 2} />
                        ) : child.type === 'group' ? (
                            <TaskGroup key={idx} group={child} defaultOpen={false} />
                        ) : null
                    ))}
                </div>
            )}
        </div>
    );
}

// =============================================================================
// MAIN TASK PANEL COMPONENT
// =============================================================================

export default function TaskPanel({ isOpen, onClose, workspace }) {
    const [activeTab, setActiveTab] = useState('task');
    const [content, setContent] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const tabs = [
        { id: 'task', label: 'Task', icon: ListTodo },
        { id: 'plan', label: 'Plan', icon: ClipboardList },
        { id: 'walkthrough', label: 'Walk', icon: BookOpen }
    ];

    const fileMap = {
        task: 'task.md',
        plan: 'implementation_plan.md',
        walkthrough: 'walkthrough.md'
    };

    useEffect(() => {
        if (isOpen && workspace) {
            loadBrainFile(fileMap[activeTab]);
        }
    }, [isOpen, activeTab, workspace]);

    const loadBrainFile = async (filename) => {
        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`${API_URL}/code-agent/read-file`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: `.brain/${filename}` })
            });
            const data = await res.json();

            if (data.success) {
                setContent(data.content);
            } else {
                setError(`Arquivo não encontrado: .brain/${filename}`);
                setContent('');
            }
        } catch (e) {
            setError('Erro ao carregar arquivo');
            setContent('');
        }

        setLoading(false);
    };

    if (!isOpen) return null;

    const parsed = parseMarkdownTasks(content);

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="w-[600px] max-h-[80vh] bg-[#0d1117] border border-white/10 rounded-xl shadow-2xl flex flex-col overflow-hidden">
                {/* Header */}
                <div className="h-12 flex items-center justify-between px-4 bg-[#161b22] border-b border-white/10 shrink-0">
                    <div className="flex items-center gap-2">
                        <Brain size={18} className="text-violet-400" />
                        <span className="font-medium text-gray-200">Luna's Brain</span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors"
                    >
                        <X size={16} className="text-gray-400" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-1 px-3 py-2 bg-[#0d1117] border-b border-white/10 shrink-0">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${activeTab === tab.id
                                    ? 'bg-violet-500/20 text-violet-300'
                                    : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                                }`}
                        >
                            <tab.icon size={14} />
                            {tab.label}
                        </button>
                    ))}
                    <button
                        onClick={() => loadBrainFile(fileMap[activeTab])}
                        className="ml-auto p-1.5 hover:bg-white/10 rounded transition-colors"
                        title="Recarregar"
                    >
                        <RefreshCw size={14} className={`text-gray-400 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4">
                    {loading ? (
                        <div className="flex items-center justify-center py-8">
                            <RefreshCw size={24} className="text-violet-400 animate-spin" />
                        </div>
                    ) : error ? (
                        <div className="text-center py-8 text-gray-500">
                            <FileText size={32} className="mx-auto mb-2 opacity-50" />
                            <p className="text-sm">{error}</p>
                            <p className="text-xs mt-1">Luna ainda não criou este arquivo para o projeto atual.</p>
                        </div>
                    ) : (
                        <>
                            {/* Title */}
                            <h2 className="text-lg font-semibold text-violet-300 mb-4">
                                {parsed.title}
                            </h2>

                            {/* Tasks */}
                            {parsed.tasks.length === 0 ? (
                                <p className="text-gray-500 text-sm">Nenhuma tarefa encontrada.</p>
                            ) : (
                                <div>
                                    {parsed.tasks.map((item, idx) => (
                                        item.type === 'group' ? (
                                            <TaskGroup key={idx} group={item} />
                                        ) : item.type === 'task' ? (
                                            <TaskItem key={idx} task={item} />
                                        ) : null
                                    ))}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
