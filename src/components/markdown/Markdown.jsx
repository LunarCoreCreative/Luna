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
    
    // 0. Remover listas duplicadas após tabelas markdown (problema no modo business)
    // Remove listas de transações em formato bruto que aparecem após tabelas markdown
    // Padrão detectado: linhas com pipes duplos (||) que são listas brutas de transações
    const hasTable = /\|.*\|.*\|/.test(content); // Detecta se há tabela markdown
    
    if (hasTable) {
        const lines = content.split('\n');
        const cleanedLines = [];
        let inTable = false;
        let tableStartIndex = -1;
        let tableEndIndex = -1;
        
        // Primeira passagem: identificar onde começa e termina a tabela
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Detecta início de tabela (linha com pipes e separador ou header)
            if (line.match(/^\|.*\|/) && (line.includes('----') || line.match(/^\|[\s\w]+\|/))) {
                if (tableStartIndex === -1) {
                    tableStartIndex = i;
                    inTable = true;
                }
            }
            
            // Detecta fim da tabela (linha vazia ou texto sem pipes após tabela)
            if (inTable && line.match(/^\|.*\|/)) {
                tableEndIndex = i;
            } else if (inTable && !line.match(/^\|.*\|/) && line.trim() !== '') {
                // Fim da tabela quando encontramos texto sem pipes
                inTable = false;
            }
        }
        
        // Segunda passagem: limpar o conteúdo
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            
            // Mantém todas as linhas da tabela
            if (i >= tableStartIndex && i <= tableEndIndex && tableStartIndex !== -1) {
                cleanedLines.push(line);
                continue;
            }
            
            // Remove linhas com pipes duplos (||) - formato bruto de transações
            // Padrão: qualquer coisa | qualquer coisa || ID | tipo | valor | ...
            if (line.includes('||')) {
                continue;
            }
            
            // Remove linhas que começam com categoria | subcategoria | data || (formato bruto)
            // Exemplo: "Uber | uber | 12/01/2026 || 6d76679a | ..."
            if (line.match(/^[A-Za-zÀ-ÿ\s]+\s*\|\s*[A-Za-zÀ-ÿ\s]+\s*\|\s*\d{2}\/\d{2}\/\d{4}\s*\|\|/)) {
                continue;
            }
            
            // Remove linhas que começam com categoria | subcategoria || (formato bruto sem data)
            if (line.match(/^[A-Za-zÀ-ÿ\s]+\s*\|\s*[A-Za-zÀ-ÿ\s]+\s*\|\|/)) {
                continue;
            }
            
            // Remove linhas de transação simples após tabelas (formato: Entrada | R$ ... | ...)
            if (i > tableEndIndex && tableEndIndex !== -1 && line.match(/^(Entrada|Saída)\s*\|\s*R\$\s*[0-9,.]+\s*\|/)) {
                continue;
            }
            
            // Remove linhas que são apenas IDs hexadecimais seguidos de pipes (parte do formato bruto)
            if (line.match(/^[a-f0-9]{8}\s*\|\s*[^\n]*\|\|/)) {
                continue;
            }
            
            // Remove linhas que contêm múltiplos pipes e parecem ser listas brutas
            // Padrão: múltiplos pipes separados por espaços (mais de 3 pipes na linha)
            const pipeCount = (line.match(/\|/g) || []).length;
            if (pipeCount > 3 && line.includes('||')) {
                continue;
            }
            
            cleanedLines.push(line);
        }
        
        content = cleanedLines.join('\n');
    }
    
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
