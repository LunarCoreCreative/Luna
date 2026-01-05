import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";

/**
 * Markdown - Componente de renderização Markdown com syntax highlighting
 */
export const Markdown = ({ content }) => {
    // Debug log para verificar o conteúdo que chega (visível apenas no console do navegador)
    if (content && content.includes('###')) {
        console.log("[LUNA-MD] Renderizando header detectado:", content.slice(0, 50));
    }

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
                    return <code className="bg-white/10 px-1.5 py-0.5 rounded text-sm font-mono text-cyan-300">{children}</code>;
                },
                // Headers
                h1: ({ children }) => <h1 className="text-2xl font-bold mb-4 mt-6 text-violet-300 border-b border-white/10 pb-2">{children}</h1>,
                h2: ({ children }) => <h2 className="text-xl font-bold mb-3 mt-5 text-violet-300">{children}</h2>,
                h3: ({ children }) => <h3 className="text-lg font-semibold mb-2 mt-4 text-blue-300">{children}</h3>,
                h4: ({ children }) => <h4 className="text-base font-semibold mb-2 mt-3 text-blue-200">{children}</h4>,
                // Text formatting
                p: ({ children }) => <p className="mb-4 last:mb-0 leading-7">{children}</p>,
                strong: ({ children }) => <strong className="font-bold text-white pr-0.5">{children}</strong>,
                em: ({ children }) => <em className="italic text-gray-200 pr-0.5">{children}</em>,
                // Lists
                ul: ({ children }) => <ul className="list-disc pl-5 mb-4 space-y-1">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal pl-5 mb-4 space-y-1">{children}</ol>,
                li: ({ children }) => <li className="leading-7 marker:text-violet-400">{children}</li>,
                // Links
                a: ({ href, children }) => <a href={href} className="text-blue-400 hover:underline" target="_blank" rel="noopener noreferrer">{children}</a>,
                // Blockquote / Alerts
                blockquote: ({ children }) => {
                    const text = String(children);
                    if (text.includes("STATUS") || text.includes("RESUMO") || text.includes("⚡") || text.includes("🔍") || text.includes("📖")) {
                        return (
                            <div className="group px-4 py-3 my-4 rounded-xl border border-violet-500/20 bg-violet-500/10 text-violet-300 text-sm font-medium shadow-sm transition-colors hover:bg-violet-500/15" role="status" aria-live="polite">
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-violet-600/20 text-violet-200 text-xs tracking-wide">Resumo</span>
                                    <span className="opacity-80">{children}</span>
                                </div>
                            </div>
                        );
                    }
                    return <blockquote className="border-l-4 border-violet-500/50 pl-4 my-4 text-gray-300 bg-white/5 py-2 rounded-r transition-colors hover:bg-white/8">{children}</blockquote>;
                },
                // Horizontal Rule
                hr: () => <hr className="my-6 border-white/10" />
            }}
        >
            {content}
        </ReactMarkdown>
    );
};
