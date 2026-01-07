import React from 'react';
import { Minus, Square, X, Maximize2 } from 'lucide-react';

export const TitleBar = () => {
    const handleMinimize = () => {
        window.electron?.windowControls?.minimize();
    };

    const handleMaximize = () => {
        window.electron?.windowControls?.maximize();
    };

    const handleClose = () => {
        window.electron?.windowControls?.close();
    };

    return (
        <div className="h-8 w-full bg-[#0d1117] flex items-center justify-between select-none border-b border-white/5 app-region-drag z-[9999]">
            {/* Logo/Title Area */}
            <div className="flex items-center gap-2 px-3">
                <div className="w-4 h-4 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center">
                    <div className="w-1.5 h-1.5 rounded-full bg-white shadow-sm animate-pulse" />
                </div>
                <span className="text-[11px] font-bold tracking-widest text-gray-400 uppercase">Luna AI</span>
            </div>

            {/* Window Controls */}
            <div className="flex items-center h-full app-region-no-drag">
                <button
                    onClick={handleMinimize}
                    className="h-full px-4 hover:bg-white/5 text-gray-400 hover:text-white transition-colors flex items-center justify-center"
                    title="Minimizar"
                >
                    <Minus size={14} />
                </button>
                <button
                    onClick={handleMaximize}
                    className="h-full px-4 hover:bg-white/5 text-gray-400 hover:text-white transition-colors flex items-center justify-center"
                    title="Maximizar"
                >
                    <Maximize2 size={12} />
                </button>
                <button
                    onClick={handleClose}
                    className="h-full px-4 hover:bg-red-500/80 text-gray-400 hover:text-white transition-colors flex items-center justify-center"
                    title="Fechar"
                >
                    <X size={14} />
                </button>
            </div>
        </div>
    );
};
