/**
 * ProgressTimeline - Timeline de Progresso estilo Antigravity
 * Exibe etapas de execução em formato hierárquico com status visual
 */

import { useState, memo } from 'react';
import {
    CheckCircle2,
    Loader2,
    XCircle,
    ChevronDown,
    ChevronRight,
    FileText,
    Terminal,
    Edit3,
    Eye,
    FolderOpen,
    MessageCircle
} from 'lucide-react';

// Componente para cada etapa individual
const ProgressStep = memo(function ProgressStep({ step, number }) {
    const [expanded, setExpanded] = useState(true);

    const statusIcon = {
        pending: <div className="w-4 h-4 rounded-full border-2 border-gray-500" />,
        running: <Loader2 size={16} className="text-blue-400 animate-spin" />,
        done: <CheckCircle2 size={16} className="text-green-400" />,
        error: <XCircle size={16} className="text-red-400" />
    };

    const actionIcon = {
        read: <Eye size={12} className="text-blue-400" />,
        write: <Edit3 size={12} className="text-green-400" />,
        analyze: <Eye size={12} className="text-violet-400" />,
        execute: <Terminal size={12} className="text-yellow-400" />,
        list: <FolderOpen size={12} className="text-cyan-400" />
    };

    // Se for um thought (narração), renderiza de forma diferente
    if (step.type === 'thought') {
        return (
            <div className="border-l-2 border-violet-500/30 pl-3 pb-3 last:pb-0">
                <div className="flex items-start gap-2">
                    <MessageCircle size={14} className="text-violet-400 mt-0.5 shrink-0" />
                    <p className="text-sm text-gray-300 italic leading-relaxed">
                        {step.title}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="border-l-2 border-white/10 pl-3 pb-3 last:pb-0 hover:border-violet-500/50 transition-colors">
            {/* Header da etapa */}
            <div
                className="flex items-center gap-2 cursor-pointer group"
                onClick={() => setExpanded(!expanded)}
            >
                <span className="text-xs text-gray-500 w-4">{number}</span>
                {statusIcon[step.status] || statusIcon.pending}
                <span className={`text-sm flex-1 ${step.status === 'running' ? 'text-blue-300' :
                    step.status === 'error' ? 'text-red-300' : 'text-gray-300'
                    }`}>
                    {step.title}
                </span>
                {step.details?.length > 0 && (
                    <button className="opacity-0 group-hover:opacity-100 transition-opacity">
                        {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    </button>
                )}
            </div>

            {/* Detalhes da etapa */}
            {expanded && step.details?.length > 0 && (
                <div className="mt-1 ml-6 space-y-1">
                    {step.details.map((detail, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                            {detail.type === 'file' && (
                                <>
                                    <FileText size={12} className="text-gray-500" />
                                    <span className="text-gray-400">
                                        {detail.action === 'read' ? 'Analyzed' :
                                            detail.action === 'write' ? 'Edited' : 'Processed'}
                                    </span>
                                    <span className="text-violet-400 font-mono">
                                        {detail.path?.split(/[/\\]/).pop()}
                                    </span>
                                    {detail.lines && (
                                        <span className="text-gray-500">#{detail.lines}</span>
                                    )}
                                </>
                            )}
                            {detail.type === 'edit' && (
                                <>
                                    <Edit3 size={12} className="text-green-400" />
                                    <span className="text-gray-400">Edited</span>
                                    <span className="text-violet-400 font-mono">
                                        {detail.path?.split(/[/\\]/).pop()}
                                    </span>
                                    {(detail.added !== undefined || detail.removed !== undefined) && (
                                        <span className="ml-1">
                                            {detail.added > 0 && (
                                                <span className="text-green-400">+{detail.added}</span>
                                            )}
                                            {detail.removed > 0 && (
                                                <span className="text-red-400 ml-1">-{detail.removed}</span>
                                            )}
                                        </span>
                                    )}
                                </>
                            )}
                            {detail.type === 'command' && (
                                <>
                                    <Terminal size={12} className="text-yellow-400" />
                                    <span className="text-gray-400">Executed</span>
                                    <code className="text-yellow-300 font-mono truncate max-w-[200px]">
                                        {detail.command}
                                    </code>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
});

// Componente principal da Timeline
function ProgressTimeline({ steps = [], isStreaming = false }) {
    const [collapsed, setCollapsed] = useState(false);

    if (steps.length === 0 && !isStreaming) return null;

    return (
        <div className="bg-[#0d1117] border border-white/10 rounded-lg overflow-hidden mb-3">
            {/* Header */}
            <div
                className="flex items-center justify-between px-3 py-2 bg-[#161b22] border-b border-white/10 cursor-pointer"
                onClick={() => setCollapsed(!collapsed)}
            >
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-300">Progress Updates</span>
                    <span className="text-xs text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">
                        {steps.length}
                    </span>
                </div>
                <button className="text-xs text-gray-500 hover:text-gray-300 transition-colors">
                    {collapsed ? 'Expand all' : 'Collapse all'}
                </button>
            </div>

            {/* Steps */}
            {!collapsed && (
                <div className="p-3 space-y-0">
                    {steps.map((step, idx) => (
                        <ProgressStep key={step.id || idx} step={step} number={idx + 1} />
                    ))}

                    {/* Loading indicator when streaming */}
                    {isStreaming && steps.length > 0 && steps[steps.length - 1]?.status === 'running' && (
                        <div className="border-l-2 border-blue-500/50 pl-3 pt-2">
                            <div className="flex items-center gap-2 text-xs text-blue-400">
                                <Loader2 size={12} className="animate-spin" />
                                <span>Processing...</span>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default memo(ProgressTimeline);
export { ProgressStep };
