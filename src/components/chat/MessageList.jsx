import React, { memo, useEffect, useRef } from 'react';
import {
    Loader2,
    Globe,
    FileText,
    CheckCircle2
} from "lucide-react";
import { Markdown } from "../markdown/Markdown";
import { TypingIndicator } from "./TypingIndicator";
import { MessageItem } from "./MessageItem";

export const MessageList = memo(({
    messages,
    isStreaming,
    streamBuffer,
    streamThought,
    activeTool,
    toolStatus,
    onRegenerate,
    onFavorite,
    onOpenArtifact,
    onContinueArtifact
}) => {
    const messagesEndRef = useRef(null);

    // Auto-scroll logic
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, streamBuffer, streamThought, activeTool]);

    return (
        <div className="flex-1 overflow-y-auto custom-scrollbar p-4 pt-20 pb-32">
            <div className="max-w-3xl mx-auto space-y-6">
                {messages.map((m, i) => (
                    <MessageItem
                        key={i}
                        index={i}
                        message={m}
                        isLast={i === messages.length - 1}
                        isStreaming={isStreaming}
                        onRegenerate={onRegenerate}
                        onFavorite={onFavorite}
                        onOpenArtifact={onOpenArtifact}
                        onContinueArtifact={onContinueArtifact}
                    />
                ))}

                {isStreaming && (
                    <div className="flex flex-col items-start gap-2">
                        {/* Stream Thought (Active) */}
                        {streamThought && (
                            <div className="flex justify-start w-full mb-2 pl-1">
                                <div className="max-w-[85%] rounded-2xl px-5 py-4 glass-panel border border-blue-500/10">
                                    <div className="flex items-center gap-2 text-blue-400 mb-2 text-xs font-semibold uppercase tracking-wider">
                                        <Loader2 size={12} className="animate-spin" />
                                        Pensando...
                                    </div>
                                    <div className="text-xs text-gray-400 font-mono opacity-90">
                                        <Markdown content={streamThought} />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Streaming Content */}
                        {streamBuffer ? (
                            <div className="glass-panel text-gray-100 rounded-2xl rounded-tl-sm px-5 py-4 max-w-[85%] shadow-lg message-enter">
                                <Markdown content={streamBuffer} />
                                <span className="inline-block w-2 h-4 ml-1 bg-blue-400 animate-pulse align-middle" />
                            </div>
                        ) : !activeTool && !streamThought && (
                            /* Typing Indicator - Shows when waiting for Luna to start responding */
                            <TypingIndicator />
                        )}

                        {/* Active Tool Badge - Dedicated persistent badge */}
                        {activeTool && (
                            <div className="flex items-center gap-3 px-4 py-3 bg-gradient-to-r from-blue-600/20 to-violet-600/20 border border-blue-500/30 rounded-2xl text-blue-200 text-sm ml-1 mb-2 shadow-lg shadow-blue-900/20">
                                <div className="relative">
                                    <div className="w-3 h-3 bg-blue-400 rounded-full animate-ping absolute" />
                                    <div className="w-3 h-3 bg-blue-400 rounded-full relative" />
                                </div>
                                <div className="flex items-center gap-2">
                                    {activeTool.icon === "search" && <Globe size={16} className="text-blue-400" />}
                                    {activeTool.icon === "read" && <FileText size={16} className="text-violet-400" />}
                                    {activeTool.icon === "doc" && <FileText size={16} className="text-cyan-400" />}
                                    <span className="font-medium">{activeTool.message}</span>
                                </div>
                            </div>
                        )}

                        {/* General Status Messages (fallback) */}
                        {toolStatus && !activeTool && (
                            <div className="flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full text-blue-300 text-sm animate-pulse ml-1 mb-2">
                                <div className="w-2 h-2 bg-blue-400 rounded-full animate-ping" />
                                {toolStatus.message}
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>
                )}
                {!isStreaming && <div ref={messagesEndRef} />}
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Memoization check
    if (prevProps.messages.length !== nextProps.messages.length) return false; // New message
    if (prevProps.isStreaming !== nextProps.isStreaming) return false;
    if (prevProps.streamBuffer !== nextProps.streamBuffer) return false;
    if (prevProps.streamThought !== nextProps.streamThought) return false;
    if (JSON.stringify(prevProps.activeTool) !== JSON.stringify(nextProps.activeTool)) return false;
    if (JSON.stringify(prevProps.toolStatus) !== JSON.stringify(nextProps.toolStatus)) return false;

    // Deep check only last message if lengths are same (updates to last message)
    const lastIdx = prevProps.messages.length - 1;
    if (lastIdx >= 0) {
        if (prevProps.messages[lastIdx] !== nextProps.messages[lastIdx]) return false;
        // Also check fav/content changes in any message? 
        // MessageItem is memoized, so re-rendering list is relatively cheap as long as list structure is same.
        // But if `messages` array ref changes but content is same, we might re-render List but Items won't re-render.
        // Simple referential equality for messages array might be enough if we rely on MessageItem memo.
        // However, React.memo on List prevents List re-render (scrolling logic re-run).
    }

    // Check strict equality of messages array reference
    return prevProps.messages === nextProps.messages;
});

MessageList.displayName = 'MessageList';
