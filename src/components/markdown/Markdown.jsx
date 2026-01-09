import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";

/**
 * Markdown - Componente de renderização Markdown com syntax highlighting
 */
export const Markdown = ({ content }) => {
    return (
        <div className="prose prose-invert prose-sm max-w-none prose-headings:mb-2 prose-headings:mt-4 prose-p:leading-relaxed prose-pre:bg-transparent prose-pre:p-0 prose-blockquote:border-violet-500/50">
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
                        return <code className="bg-white/5 px-1.5 py-0.5 rounded text-sm font-mono text-violet-300 break-words border border-white/5">{children}</code>;
                    },
                    // Better heading styles (Sincronizado com Canvas, mas menor para Chat)
                    h1: ({ children }) => <h1 className="text-xl font-bold mt-5 mb-3 text-white border-b border-white/10 pb-1.5">{children}</h1>,
                    h2: ({ children }) => <h2 className="text-lg font-semibold mt-4 mb-2 text-white">{children}</h2>,
                    h3: ({ children }) => <h3 className="text-base font-semibold mt-3 mb-1 text-gray-200">{children}</h3>,
                    // Text formatting
                    p: ({ children }) => <p className="my-2.5 text-gray-300 leading-relaxed last:mb-0 break-words">{children}</p>,
                    strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                    em: ({ children }) => <em className="italic text-violet-300">{children}</em>,
                    // Lists
                    ul: ({ children }) => <ul className="list-disc pl-5 my-2.5 space-y-1 marker:text-violet-500">{children}</ul>,
                    ol: ({ children }) => <ol className="list-decimal pl-5 my-2.5 space-y-1 marker:text-violet-500">{children}</ol>,
                    li: ({ children }) => <li className="text-gray-300 break-words">{children}</li>,
                    // Links
                    a: ({ href, children }) => <a href={href} className="text-violet-400 hover:underline decoration-violet-500/30" target="_blank" rel="noopener noreferrer">{children}</a>,
                    // Blockquote (Sincronizado com Canvas)
                    blockquote: ({ children }) => <blockquote className="border-l-4 border-violet-500/50 pl-4 my-4 italic text-gray-400 bg-white/5 py-2 rounded-r">{children}</blockquote>,
                    // Table styles
                    table: ({ children }) => <div className="overflow-x-auto my-4 rounded-lg border border-white/10"><table className="w-full text-left border-collapse">{children}</table></div>,
                    th: ({ children }) => <th className="px-3 py-2 text-xs font-semibold text-violet-300 uppercase tracking-wider bg-white/5">{children}</th>,
                    td: ({ children }) => <td className="px-3 py-2 text-sm text-gray-400 border-t border-white/5">{children}</td>
                }}
            >
                {preprocessContent(content)}
            </ReactMarkdown>
        </div>
    );
};

// preprocessContent: Limpa e ajusta o markdown antes de renderizar
// Resolve o problema da Luna "quebrar" negritos e listas por excesso dePauses conversacionais
const preprocessContent = (raw) => {
    if (!raw) return "";

    let content = raw;

    // 1. Force Newline before Headers (###)
    // Matches "text### Header" -> "text\n\n### Header"
    // Negative lookbehind simulation not needed if we check non-newline char
    content = content.replace(/([^\n])(#{1,6}\s)/g, "$1\n\n$2");

    // 2. Fix concatenation of Colon and Header (e.g., "que:###")
    content = content.replace(/:(#{1,6}\s)/g, ":\n\n$1");

    // 3. Fix List Glue (e.g., ":-Item") -> ":\n\n- Item"
    // Also handles "que:- Item" -> "que:\n\n- Item"
    content = content.replace(/(:)\s*(\n)?\s*(-|\*)\s/g, "$1\n\n$3 ");
    content = content.replace(/:-([^\s])/g, ":\n\n- $1");

    // 4. Fix Glued Bold Blocks (e.g., "**A****B**") -> "**A**\n**B**"
    content = content.replace(/\*\*\*\*/g, "**\n\n**");

    // 5. Fix List Number Glue (e.g., "Text1.") -> "Text\n\n1."
    // Matches lowercase letter or punctuation followed immediately by number and dot
    content = content.replace(/([a-z.!?])(\d+\.\s)/g, "$1\n\n$2");

    // 6. Fix "Situacao:Status" -> "Situacao:\n\nStatus" or just space if simple
    // Specific fix for the screenshot "Situação:Positiva" or similar bold glue
    content = content.replace(/(\*\*.*?\*\*:)([^\s])/g, "$1 $2");

    // [SIMPLIFICADO] Removidas regras 7 e 8 que alteravam conteúdo (espaços em negrito/emojis)
    // Regras 1-6 mantidas pois corrigem apenas ESTRUTURA quebrada (headers/listas sem quebra de linha)

    return content.trim();
};
