import React, { memo } from 'react';
import {
    Globe,
    FileText,
    History,
    PanelRight,
    RotateCcw,
    Star,
    PenTool
} from "lucide-react";
import { Markdown } from "../markdown/Markdown";
import { parseThought, cleanContent } from "../../utils/messageUtils";

export const MessageItem = memo(({
    message,
    index,
    isLast,
    onRegenerate,
    onFavorite,
    onOpenArtifact,
    onContinueArtifact,
    isStreaming
}) => {
    // Tool Card Parsing
    if (message.role === "tool-card") {
        return (
            <div className="flex justify-start w-full my-2 pl-4">
                <div className="glass-panel border-l-4 border-blue-500/50 rounded-r-xl p-4 max-w-[80%] bg-blue-900/5 hover:bg-blue-900/10 transition-colors text-sm text-gray-300">
                    <div className="flex items-center gap-2 mb-2 text-blue-400 font-medium">
                        {message.type === 'search' ? <Globe size={14} /> : <FileText size={14} />}
                        <span>{message.type === 'search' ? 'Resultados da Pesquisa' : 'Conteúdo da Página'}</span>
                    </div>
                    <div className="max-h-40 overflow-y-auto custom-scrollbar opacity-90 leading-relaxed whitespace-pre-wrap font-mono text-xs">
                        {message.content.length > 500 ? message.content.slice(0, 500) + "..." : message.content}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"} message-enter`}>
            <div
                className={`max-w-[85%] rounded-2xl px-5 py-4 text-base leading-relaxed shadow-lg ${message.role === "user" ? "bg-[var(--user-bubble)] text-white rounded-tr-sm border border-white/20 whitespace-pre-wrap" : "glass-panel rounded-tl-sm"}`}
                style={{ color: message.role === "user" ? 'white' : 'var(--text-primary)' }}
            >
                {/* Render images if user sent them */}
                {message.role === "user" && message.images && message.images.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                        {message.images.map((img, idx) => (
                            <img key={idx} src={img} className="max-h-48 rounded-lg border border-white/10" alt="uploaded" />
                        ))}
                    </div>
                )}

                {/* Reasoning Block (Using 'thought' property from tool call) */}
                {message.thought && (
                    <details className="mb-4 group" open={false}>
                        <summary className="cursor-pointer list-none flex items-center gap-2 text-xs font-semibold text-gray-400 hover:text-blue-300 transition-colors select-none mb-2">
                            <div className="p-1 bg-white/5 rounded-md group-open:bg-blue-500/20 transition-colors">
                                <div className="w-3.5 h-3.5 rounded-full flex items-center justify-center border border-current opacity-70">
                                    <div className="w-1 h-1 rounded-full bg-current" />
                                </div>
                            </div>
                            <span>Processo de Pensamento</span>
                        </summary>
                        <div className="pl-2 border-l-2 border-white/10 ml-1.5 my-2">
                            <div className="text-sm text-[var(--text-secondary)] font-mono bg-[var(--bg-secondary)] p-3 rounded-lg opacity-90 whitespace-pre-wrap border border-white/5">
                                {parseThought(message.thought)}
                            </div>
                        </div>
                    </details>
                )}

                {/* Message Content */}
                {message.role === "assistant" ? (
                    message.content === "✨ *Artefato gerado no Canvas* →" ? (
                        <button
                            onClick={() => onOpenArtifact && onOpenArtifact(message.artifact)}
                            className="flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-xl text-violet-300 hover:bg-violet-500/20 transition-all group"
                        >
                            <div className="p-2 bg-violet-500/20 rounded-lg group-hover:scale-110 transition-transform">
                                <PanelRight size={18} />
                            </div>
                            <div className="flex flex-col items-start text-sm">
                                <span className="font-semibold">Artefato gerado no Canvas</span>
                                <span className="text-xs opacity-70">Clique para abrir e visualizar</span>
                            </div>
                        </button>
                    ) : message.content && message.content.includes("[!RESUMO]") ? (
                        <div className="glass-panel rounded-2xl rounded-tl-sm p-4 shadow-lg">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-violet-600/20 text-violet-200 text-xs tracking-wide">Resumo</span>
                                    {isLast && isStreaming && (
                                        <div className="h-1 w-12 bg-violet-500/20 rounded overflow-hidden">
                                            <div className="h-1 w-1/2 bg-violet-400 animate-pulse" />
                                        </div>
                                    )}
                                </div>
                                {message.artifact && (
                                    <span className="text-xs opacity-60">{message.artifact.language || message.artifact.type}</span>
                                )}
                            </div>
                            <div className="space-y-3">
                                <Markdown content={cleanContent(message.content) || "..."} />
                            </div>
                            <div className="flex items-center gap-2 mt-3">
                                <button
                                    onClick={() => onOpenArtifact && onOpenArtifact(message.artifact)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-violet-500/20 hover:bg-violet-500/30 border border-violet-500/30 text-violet-200 text-xs transition-colors"
                                    aria-label="Abrir Canvas"
                                >
                                    <PanelRight size={14} />
                                    Abrir Canvas
                                </button>
                                <button
                                    onClick={onContinueArtifact}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 text-blue-200 text-xs transition-colors"
                                    aria-label="Continuar escrita"
                                >
                                    <PenTool size={14} />
                                    Continuar escrita
                                </button>
                            </div>
                        </div>
                    ) : (
                        <Markdown content={cleanContent(message.content) || "..."} />
                    )
                ) : (
                    <Markdown content={cleanContent(message.content) || "..."} />
                )}

                {/* Timestamp */}
                {message.timestamp && (
                    <div className={`text-[10px] mt-2 opacity-40 flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                        {message.timestamp}
                    </div>
                )}

                {/* Action buttons for assistant messages */}
                {message.role === "assistant" && (
                    <div className="flex items-center gap-2 mt-3 pt-2 border-t border-white/5">
                        <button
                            onClick={() => onRegenerate && onRegenerate(index)}
                            className="flex items-center gap-1.5 px-2 py-1 text-xs rounded-md hover:bg-white/10 transition-colors"
                            style={{ color: 'var(--text-secondary)' }}
                            title="Regenerar resposta"
                        >
                            <RotateCcw size={12} />
                            Regenerar
                        </button>
                        <button
                            onClick={() => onFavorite && onFavorite(index)}
                            className={`flex items-center gap-1.5 px-2 py-1 text-xs rounded-md hover:bg-white/10 transition-colors ${message.isFavorite ? 'text-yellow-400' : ''}`}
                            style={{ color: message.isFavorite ? undefined : 'var(--text-secondary)' }}
                            title={message.isFavorite ? "Remover dos favoritos" : "Adicionar aos favoritos"}
                        >
                            <Star size={12} fill={message.isFavorite ? "currentColor" : "none"} />
                            {message.isFavorite ? "Favoritada" : "Favoritar"}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison for better performance
    // Só re-renderiza se:
    // 1. O conteúdo da mensagem mudou
    // 2. O status de favorito mudou
    // 3. O índice mudou (raro)
    // 4. Se é a última mensagem e o estado de streaming mudou (para a animação do resumo)
    // 5. As imagens mudaram
    const m1 = prevProps.message;
    const m2 = nextProps.message;

    // Comparação simples de objetos e primitivos
    if (prevProps.index !== nextProps.index) return false;
    if (prevProps.isLast !== nextProps.isLast) return false;
    if (prevProps.isStreaming !== nextProps.isStreaming && nextProps.isLast) return false; // Só importa se for a última

    if (m1.content !== m2.content) return false;
    if (m1.role !== m2.role) return false;
    if (m1.type !== m2.type) return false;
    if (m1.isFavorite !== m2.isFavorite) return false;
    if (m1.timestamp !== m2.timestamp) return false;
    if (m1.thought !== m2.thought) return false;

    // Arrays de imagens
    if (JSON.stringify(m1.images) !== JSON.stringify(m2.images)) return false;

    // Artefatos
    if (JSON.stringify(m1.artifact) !== JSON.stringify(m2.artifact)) return false;

    return true; // Props iguais, não renderizar
});

MessageItem.displayName = 'MessageItem';
