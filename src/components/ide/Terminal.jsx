/**
 * Terminal Component
 * ------------------
 * Terminal integrado estilo Cursor para o modo IDE.
 */

import React, { useState, useRef, useEffect } from 'react';
import {
    Terminal as TerminalIcon,
    X,
    Plus,
    ChevronUp,
    ChevronDown,
    Maximize2,
    Minimize2,
    Copy,
    Trash2
} from 'lucide-react';

// =============================================================================
// TERMINAL OUTPUT LINE
// =============================================================================

function TerminalLine({ line, type }) {
    const colors = {
        input: 'text-green-400',
        output: 'text-gray-300',
        error: 'text-red-400',
        info: 'text-blue-400',
        success: 'text-green-300',
    };

    return (
        <div className={`font-mono text-sm ${colors[type] || colors.output} whitespace-pre-wrap break-all`}>
            {type === 'input' && <span className="text-violet-400 mr-2">❯</span>}
            {line}
        </div>
    );
}

// =============================================================================
// MAIN TERMINAL COMPONENT
// =============================================================================

export default function IDETerminal({
    isOpen,
    onToggle,
    onCommand,
    output = [],
    isRunning = false,
    cwd = '',
    height = 200,
    onHeightChange,
    onStartResize
}) {
    const [input, setInput] = useState('');
    const [history, setHistory] = useState([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [isMinimized, setIsMinimized] = useState(false);
    const inputRef = useRef(null);
    const outputRef = useRef(null);

    // Auto scroll para o final
    useEffect(() => {
        if (outputRef.current) {
            outputRef.current.scrollTop = outputRef.current.scrollHeight;
        }
    }, [output]);

    // Foco no input quando abre
    useEffect(() => {
        if (isOpen && !isMinimized) {
            inputRef.current?.focus();
        }
    }, [isOpen, isMinimized]);

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim() || isRunning) return;

        // Adiciona ao histórico
        setHistory(prev => [...prev.slice(-50), input]);
        setHistoryIndex(-1);

        // Executa comando
        onCommand?.(input);
        setInput('');
    };

    const handleKeyDown = (e) => {
        // Navegação no histórico
        if (e.key === 'ArrowUp') {
            e.preventDefault();
            if (historyIndex < history.length - 1) {
                const newIndex = historyIndex + 1;
                setHistoryIndex(newIndex);
                setInput(history[history.length - 1 - newIndex]);
            }
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setInput(history[history.length - 1 - newIndex]);
            } else {
                setHistoryIndex(-1);
                setInput('');
            }
        }
    };

    if (!isOpen) {
        return null;
    }

    return (
        <div
            className="border-t border-white/10 bg-[#0d0e14] flex flex-col relative"
            style={{ height: isMinimized ? 40 : height }}
        >
            {/* Resize Handle (Top) */}
            {!isMinimized && (
                <div
                    className="h-2 cursor-row-resize hover:bg-violet-500/50 active:bg-violet-500 transition-colors bg-transparent absolute top-0 left-0 right-0 z-[70]"
                    style={{ WebkitAppRegion: "no-drag", marginTop: -4 }}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        const container = e.target.closest('.fixed, .relative'); // O container do terminal
                        const rect = container?.getBoundingClientRect() || { bottom: window.innerHeight };

                        if (onStartResize) {
                            onStartResize({ containerBottom: rect.bottom });
                        }
                    }}
                />
            )}
            {/* Header */}
            <div className="h-10 flex items-center justify-between px-3 bg-[#161b22] border-b border-white/5 shrink-0">
                <div className="flex items-center gap-2">
                    <TerminalIcon size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-300">Terminal</span>
                    {cwd && (
                        <span className="text-xs text-gray-500 truncate max-w-[200px]">
                            ({cwd})
                        </span>
                    )}
                    {isRunning && (
                        <span className="px-1.5 py-0.5 bg-yellow-500/20 text-yellow-400 text-xs rounded">
                            Executando...
                        </span>
                    )}
                </div>

                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setIsMinimized(!isMinimized)}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors"
                        title={isMinimized ? 'Expandir' : 'Minimizar'}
                    >
                        {isMinimized ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                    </button>
                    <button
                        onClick={onToggle}
                        className="p-1.5 hover:bg-white/10 rounded transition-colors"
                        title="Fechar Terminal"
                    >
                        <X size={14} />
                    </button>
                </div>
            </div>

            {/* Content */}
            {!isMinimized && (
                <>
                    {/* Output */}
                    <div
                        ref={outputRef}
                        className="flex-1 overflow-y-auto p-3 space-y-1 font-mono text-sm"
                    >
                        {output.length === 0 ? (
                            <div className="text-gray-500">
                                Terminal pronto. Digite um comando...
                            </div>
                        ) : (
                            output.map((item, idx) => (
                                <TerminalLine
                                    key={idx}
                                    line={item.text}
                                    type={item.type}
                                />
                            ))
                        )}
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSubmit} className="shrink-0 border-t border-white/5">
                        <div className="flex items-center px-3 py-2 gap-2">
                            <span className="text-violet-400 font-mono">❯</span>
                            <input
                                ref={inputRef}
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={handleKeyDown}
                                placeholder={isRunning ? 'Aguardando...' : 'Digite um comando...'}
                                disabled={isRunning}
                                className="flex-1 bg-transparent text-white font-mono text-sm placeholder-gray-600 focus:outline-none disabled:opacity-50"
                            />
                        </div>
                    </form>
                </>
            )}
        </div>
    );
}
