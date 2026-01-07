import { Bot } from "lucide-react";

/**
 * TypingIndicator - Indicador de digitação animado
 */
export const TypingIndicator = () => (
    <div className="flex items-center gap-3 px-4 py-3 glass-panel rounded-2xl rounded-tl-sm max-w-[220px] message-enter border border-white/5">
        <Bot size={18} className="text-violet-400" />
        <div className="flex items-center gap-2">
            <span className="text-xs font-medium text-gray-400">Luna está pensando</span>
            <div className="flex items-center gap-1">
                <div className="typing-dot w-1.5 h-1.5" />
                <div className="typing-dot w-1.5 h-1.5" />
                <div className="typing-dot w-1.5 h-1.5" />
            </div>
        </div>
    </div>
);
