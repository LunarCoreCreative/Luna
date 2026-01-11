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

// preprocessContent: Ajustes estruturais mínimos antes de renderizar
// Foca apenas em correções que o backend pode ter perdido ou que são específicas do frontend
// A maioria das correções de Markdown é feita no backend via fix_markdown()
const preprocessContent = (raw) => {
    if (!raw) return "";

    let content = raw;

    // Correções estruturais mínimas (apenas casos edge que podem ter passado)
    
    // 1. Headers colados: "text### Header" -> "text\n\n### Header"
    // (Backend já faz isso, mas garantimos aqui também)
    content = content.replace(/([^\n])(#{1,6}\s)/g, "$1\n\n$2");
    
    // 2. Colons colados com headers: "que:###" -> "que:\n\n###"
    content = content.replace(/:(#{1,6}\s)/g, ":\n\n$1");
    
    // 3. Listas coladas: "text- Item" -> "text\n\n- Item" (apenas se não tiver quebra)
    // Cuidado para não quebrar listas já formatadas corretamente
    content = content.replace(/([^\n\-])(\n?\s*-\s+[A-ZÁÉÍÓÚÇ][^\n])/g, (match, before, list) => {
        // Se já tem quebra antes da lista, não faz nada
        if (list.startsWith('\n')) return match;
        return before + '\n\n' + list.trim();
    });
    
    // 4. Blocos de negrito colados: "**A****B**" -> "**A**\n\n**B**"
    // (Apenas se não tiver espaço entre eles)
    content = content.replace(/(\*\*[^*]+?\*\*)(\*\*[^*]+?\*\*)/g, "$1\n\n$2");
    
    // 5. Normalizar quebras de linha excessivas (máximo 2)
    content = content.replace(/\n{3,}/g, "\n\n");
    
    // 6. Remover espaços em branco no final das linhas
    content = content.replace(/[ \t]+$/gm, "");

    return content.trim();
};
