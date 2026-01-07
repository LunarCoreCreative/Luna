import React, { useState, useRef, useImperativeHandle, forwardRef } from 'react';
import {
    Upload,
    Brain,
    Send,
    XCircle,
    X,
    ImageIcon
} from "lucide-react";

export const ChatInput = forwardRef(({
    onSend,
    onStop,
    isStreaming,
    attachmentsHook,
    isThinkingMode,
    setIsThinkingMode,
    placeholder = "Responda..."
}, ref) => {
    const [input, setInput] = useState("");
    const internalInputRef = useRef(null);

    useImperativeHandle(ref, () => ({
        setValue: (val) => {
            setInput(val);
            if (internalInputRef.current) internalInputRef.current.focus();
        },
        focus: () => internalInputRef.current?.focus()
    }));

    const handleKeyDown = (e) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    const handleSend = () => {
        if ((!input.trim() && attachmentsHook.attachments.length === 0) || isStreaming) return;

        onSend(input);
        setInput(""); // Clear local input

        // Reset height
        if (internalInputRef.current) {
            internalInputRef.current.style.height = 'auto';
        }
    };

    const handleChange = (e) => {
        setInput(e.target.value);
        // Auto-resize
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 160) + 'px';
    };

    return (
        <div className="max-w-3xl mx-auto glass-bar rounded-3xl p-2 pl-2 shadow-2xl flex flex-col gap-2 transition-all focus-within:ring-1 focus-within:ring-white/20">
            {/* Attachment Previews */}
            {attachmentsHook.attachments.length > 0 && (
                <div className="flex gap-2 px-4 pt-2 overflow-x-auto">
                    {attachmentsHook.attachments.map((img, idx) => (
                        <div key={idx} className="relative group shrink-0">
                            <img src={img} alt="attachment" className="h-16 w-16 object-cover rounded-lg border border-white/20" />
                            <button
                                onClick={() => attachmentsHook.setAttachments(prev => prev.filter((_, i) => i !== idx))}
                                className="absolute -top-1 -right-1 bg-red-500 rounded-full p-0.5 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X size={12} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex items-end gap-2 px-2 pb-1">
                <button onClick={() => attachmentsHook.fileInputRef.current?.click()} className="p-2 mb-1 hover:bg-white/10 rounded-full transition-colors text-gray-400 hover:text-blue-400" title="Anexar imagem">
                    <ImageIcon size={20} />
                </button>
                <button
                    onClick={() => setIsThinkingMode(!isThinkingMode)}
                    className={`p-2 mb-1 hover:bg-white/10 rounded-full transition-colors ${isThinkingMode ? "text-violet-400 bg-violet-500/10" : "text-gray-400"}`}
                    title="Ativar Pensamento Profundo"
                >
                    <Brain size={20} className={isThinkingMode ? "animate-pulse" : ""} />
                </button>
                <textarea
                    ref={internalInputRef}
                    value={input}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    onPaste={attachmentsHook.handlePaste}
                    placeholder={placeholder}
                    className="flex-1 bg-transparent border-0 text-white placeholder-gray-400 focus:ring-0 resize-none outline-none custom-scrollbar py-3"
                    rows={1}
                    style={{ minHeight: "24px", maxHeight: "160px" }}
                />
                {isStreaming ? (
                    <button
                        onClick={onStop}
                        className="p-3 rounded-full bg-red-600 text-white hover:bg-red-500 transition-all mb-1"
                        title="Parar geração"
                    >
                        <XCircle size={18} />
                    </button>
                ) : (
                    <button
                        onClick={handleSend}
                        disabled={!input.trim() && attachmentsHook.attachments.length === 0}
                        className={`p-3 rounded-full transition-all mb-1 ${(input.trim() || attachmentsHook.attachments.length > 0) ? "bg-blue-600 text-white hover:bg-blue-500" : "bg-white/5 text-gray-500"}`}
                    >
                        <Send size={18} />
                    </button>
                )}
            </div>
        </div>
    );
});

ChatInput.displayName = 'ChatInput';
