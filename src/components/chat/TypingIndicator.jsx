import { Bot } from "lucide-react";

/**
 * TypingIndicator - Indicador de digitação animado
 */
export const TypingIndicator = () => (
    <div className="flex items-center gap-3 px-5 py-4 glass-panel rounded-2xl rounded-tl-sm max-w-[200px] message-enter">
        <Bot size={18} className="text-violet-400" />
        <div className="flex items-center gap-1.5">
            <div className="typing-dot" />
            <div className="typing-dot" />
            <div className="typing-dot" />
        </div>
    </div>
);
