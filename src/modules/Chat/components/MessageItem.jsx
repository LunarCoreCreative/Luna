import React, { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, User, Copy, Check, Terminal, Edit2, RotateCw, X } from 'lucide-react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { useChat } from '@/contexts/ChatContext';
import SourcesCard from './SourcesCard';

const MessageItem = memo(({ message, profile }) => {
    const isUser = message.role === 'user';
    const { editMessage, regenerateResponse } = useChat();

    // Estados locais
    const [isHovering, setIsHovering] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(message.content);
    const [copied, setCopied] = useState(false);

    // Handlers
    const handleCopy = () => {
        navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleEditSubmit = () => {
        if (editContent.trim() !== message.content) {
            editMessage(message.id, editContent);
        }
        setIsEditing(false);
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={`group relative flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            {/* AI Avatar */}
            {!isUser && (
                <div className="shrink-0 w-9 h-9 rounded-xl bg-gradient-to-br from-violet-600 to-fuchsia-600 flex items-center justify-center shadow-lg shadow-violet-500/20 mt-1">
                    <Bot size={18} className="text-white" />
                </div>
            )}

            {/* Message Bubble & Content */}
            <div className={`relative max-w-[90%] sm:max-w-[75%] transition-all ${isEditing ? 'w-full max-w-[90%]' : ''}`}>

                {/* Sources Card for AI messages with search results */}
                {!isUser && message.sources && message.sources.length > 0 && (
                    <SourcesCard sources={message.sources} query={message.searchQuery} />
                )}

                {isEditing ? (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-obsidian border border-violet-500/50 rounded-2xl p-4 shadow-xl"
                    >
                        <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            className="w-full bg-transparent text-slate-200 text-sm focus:outline-none resize-none scrollbar-hide mb-3"
                            rows={Math.min(editContent.split('\n').length + 1, 10)}
                            autoFocus
                        />
                        <div className="flex justify-end gap-2">
                            <button
                                onClick={() => setIsEditing(false)}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleEditSubmit}
                                className="px-3 py-1.5 rounded-lg text-xs font-bold text-white bg-violet-600 hover:bg-violet-500 transition-colors shadow-lg shadow-violet-500/20"
                            >
                                Salvar e Enviar
                            </button>
                        </div>
                    </motion.div>
                ) : (
                    <div className={`px-5 py-3.5 rounded-2xl text-[15px] leading-7 shadow-sm ${isUser
                        ? 'bg-gradient-to-br from-violet-600 to-fuchsia-600 text-white rounded-br-sm shadow-violet-500/10'
                        : 'bg-obsidian-light text-slate-200 rounded-bl-sm border border-white/5 shadow-black/20'
                        }`}>
                        {isUser ? (
                            <div className="whitespace-pre-wrap font-sans">{message.content}</div>
                        ) : (
                            <div className="prose prose-invert prose-p:leading-relaxed prose-pre:p-0 prose-pre:bg-transparent max-w-none">
                                <ReactMarkdown
                                    remarkPlugins={[remarkGfm]}
                                    components={{
                                        p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                        a: ({ node, ...props }) => <a className="text-violet-400 hover:text-violet-300 underline underline-offset-2 transition-colors" target="_blank" rel="noopener noreferrer" {...props} />,
                                        ul: ({ node, ...props }) => <ul className="list-disc list-inside mb-4 space-y-1 ml-1" {...props} />,
                                        ol: ({ node, ...props }) => <ol className="list-decimal list-inside mb-4 space-y-1 ml-1" {...props} />,
                                        li: ({ node, ...props }) => <li className="text-slate-300" {...props} />,
                                        blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-violet-500/50 pl-4 py-1 my-4 bg-violet-500/5 rounded-r-lg italic text-slate-400" {...props} />,
                                        code: ({ node, inline, className, children, ...props }) => {
                                            const match = /language-(\w+)/.exec(className || '');
                                            const language = match ? match[1] : '';
                                            const codeContent = String(children).replace(/\n$/, '');

                                            if (!inline && match) {
                                                return (
                                                    <CodeBlock language={language} code={codeContent} {...props} />
                                                );
                                            }

                                            return (
                                                <code className="px-1.5 py-0.5 rounded-md bg-white/10 text-violet-200 font-mono text-[0.9em] border border-white/5" {...props}>
                                                    {children}
                                                </code>
                                            );
                                        },
                                        table: ({ node, ...props }) => <div className="overflow-x-auto my-4 rounded-lg border border-white/10"><table className="w-full text-left border-collapse text-sm" {...props} /></div>,
                                        th: ({ node, ...props }) => <th className="bg-white/5 p-3 font-semibold text-slate-200 border-b border-white/10" {...props} />,
                                        td: ({ node, ...props }) => <td className="p-3 border-b border-white/5 text-slate-400" {...props} />,
                                        hr: ({ node, ...props }) => <hr className="my-6 border-white/10" {...props} />,
                                    }}
                                >
                                    {message.content}
                                </ReactMarkdown>
                            </div>
                        )}
                    </div>
                )}

                {/* Actions Menu (Visible on Hover) */}
                {!isEditing && (
                    <div className={`absolute top-full pt-2 flex items-center gap-1 transition-all duration-200 z-10 ${isUser ? 'right-0' : 'left-0'} ${isHovering ? 'opacity-100 translate-y-0' : 'opacity-0 -translate-y-2 pointer-events-none'}`}>
                        <div className="flex items-center gap-1 p-1 rounded-lg bg-obsidian-light/90 border border-white/10 backdrop-blur-md shadow-lg">
                            <button
                                onClick={handleCopy}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                                title="Copiar texto"
                            >
                                {copied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                            </button>

                            {isUser ? (
                                <button
                                    onClick={() => setIsEditing(true)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-white/10 transition-colors"
                                    title="Editar mensagem"
                                >
                                    <Edit2 size={14} />
                                </button>
                            ) : (
                                <button
                                    onClick={() => regenerateResponse(message.id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-violet-400 hover:bg-white/10 transition-colors"
                                    title="Regenerar resposta"
                                >
                                    <RotateCw size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* User Avatar */}
            {isUser && (
                <div className="shrink-0 w-9 h-9 rounded-xl overflow-hidden ring-2 ring-violet-500/20 mt-1">
                    <img
                        src={`https://ui-avatars.com/api/?name=${profile?.name || 'User'}&background=7c3aed&color=fff`}
                        alt="User"
                        className="w-full h-full object-cover"
                    />
                </div>
            )}
        </motion.div>
    );
});

const CodeBlock = memo(({ language, code }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative my-4 rounded-xl overflow-hidden bg-[#1e1e1e] border border-white/10 shadow-lg group">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-white/5 border-b border-white/5 select-none">
                <div className="flex items-center gap-2">
                    <Terminal size={13} className="text-violet-400" />
                    <span className="text-xs text-slate-400 font-mono font-bold uppercase tracking-wider">{language || 'text'}</span>
                </div>
                <button
                    onClick={handleCopy}
                    className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-medium uppercase tracking-wider text-slate-400 hover:text-white hover:bg-white/10 transition-all border border-transparent hover:border-white/10 active:scale-95"
                >
                    {copied ? (
                        <>
                            <Check size={12} className="text-emerald-400" />
                            <span className="text-emerald-400">Copied</span>
                        </>
                    ) : (
                        <>
                            <Copy size={12} />
                            <span>Copy</span>
                        </>
                    )}
                </button>
            </div>

            {/* Highlighter */}
            <div className="scrollbar-thin scrollbar-thumb-white/10 hover:scrollbar-thumb-white/20">
                <SyntaxHighlighter
                    language={language}
                    style={vscDarkPlus}
                    customStyle={{
                        margin: 0,
                        padding: '1.25rem',
                        background: 'transparent',
                        fontSize: '14px',
                        lineHeight: '1.5',
                        fontFamily: "'JetBrains Mono', 'Fira Code', Consolas, monospace",
                    }}
                    wrapLines={true}
                    showLineNumbers={true}
                    lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', color: '#6e7681', textAlign: 'right' }}
                >
                    {code}
                </SyntaxHighlighter>
            </div>
        </div>
    );
});

export default MessageItem;
