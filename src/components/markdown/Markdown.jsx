import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";

/**
 * Markdown - Componente de renderização Markdown com syntax highlighting
 */
export const Markdown = ({ content }) => {
    return (
        <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
                code({ inline, className, children, ...props }) {
                    const match = /language-(\w+)/.exec(className || "");
                    const language = match ? match[1] : "";

                    // Multi-line code block
                    if (!inline && (match || String(children).includes("\n"))) {
                        return <CodeBlock language={language}>{children}</CodeBlock>;
                    }

                    // Inline code
                    return <code className="bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded text-sm font-mono text-[var(--accent-primary)] break-words border border-white/5">{children}</code>;
                },
                // Headers
                h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 text-[var(--text-primary)] border-b border-white/10 pb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5 text-[var(--text-primary)]">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-semibold mb-2 mt-4 text-[var(--accent-primary)]">{children}</h3>,
                h4: ({ children }) => <h4 className="text-base font-semibold mb-2 mt-3 text-[var(--text-secondary)]">{children}</h4>,
                // Text formatting
                p: ({ children }) => <p className="mb-4 last:mb-0 leading-7 break-words overflow-hidden">{children}</p>,
                strong: ({ children }) => <strong className="font-bold text-white pr-0.5">{children}</strong>,
                em: ({ children }) => <em className="italic text-gray-200 pr-0.5">{children}</em>,
                // Lists
                ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="leading-7 marker:text-[var(--accent-primary)] break-words">{children}</li>,
                // Links
                a: ({ href, children }) => <a href={href} className="text-[var(--accent-primary)] hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                // Blockquote / Alerts
                blockquote: ({ children }) => {
                    const text = String(children);
                    if (text.includes("STATUS") || text.includes("RESUMO") || text.includes("⚡") || text.includes("🔍") || text.includes("📖")) {
                        return (
                            <div className="group px-4 py-3 my-4 rounded-xl border border-[var(--accent-primary)]/20 bg-[var(--accent-primary)]/10 text-[var(--accent-primary)] text-sm font-medium shadow-sm transition-colors hover:bg-[var(--accent-primary)]/15" role="status" aria-live="polite">
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-[var(--accent-primary)]/20 text-[var(--text-primary)] text-xs tracking-wide">Resumo</span>
                                    <span className="opacity-80">{children}</span>
                                </div>
                            </div>
                        );
                    }
                    return <blockquote className="border-l-4 border-[var(--accent-primary)]/50 pl-4 my-4 text-[var(--text-secondary)] bg-[var(--bg-tertiary)] py-2 rounded-r transition-colors hover:bg-white/5">{children}</blockquote>;
                },
                // Horizontal Rule
                hr: () => <hr className="my-6 border-white/10" />,
                // Tables
                table: ({ children }) => <div className="overflow-x-auto my-6 rounded-lg border border-white/10"><table className="w-full text-left border-collapse">{children}</table></div>,
                thead: ({ children }) => <thead className="bg-white/5">{children}</thead>,
                tbody: ({ children }) => <tbody className="divide-y divide-white/10">{children}</tbody>,
                tr: ({ children }) => <tr className="hover:bg-white/5 transition-colors">{children}</tr>,
                th: ({ children }) => <th className="px-4 py-3 text-sm font-semibold text-[var(--accent-primary)] uppercase tracking-wider">{children}</th>,
                td: ({ children }) => <td className="px-4 py-3 text-sm text-[var(--text-secondary)] align-top">{children}</td>
            }}
        >
            {preprocessContent(content)}
        </ReactMarkdown>
    );
};

// preprocessContent: Limpa e ajusta o markdown antes de renderizar
// NOTA: Versão simplificada - pós-processamento de tabelas foi removido pois causava efeitos colaterais
const preprocessContent = (raw) => {
    if (!raw) return "";
    return raw;
};
