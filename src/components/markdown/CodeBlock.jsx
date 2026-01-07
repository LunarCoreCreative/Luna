import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

/**
 * CodeBlock - Bloco de código com syntax highlighting e botão de copiar
 */
export const CodeBlock = ({ language, children }) => {
    const [copied, setCopied] = useState(false);
    const code = String(children).replace(/\n$/, "");

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="relative group my-4">
            <button
                onClick={handleCopy}
                className="absolute top-2 right-2 p-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors opacity-0 group-hover:opacity-100"
                title="Copiar código"
            >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} className="text-gray-400" />}
            </button>
            <SyntaxHighlighter
                style={vscDarkPlus}
                language={language || "text"}
                PreTag="div"
                customStyle={{
                    margin: 0,
                    borderRadius: "0.75rem",
                    padding: "1rem",
                    fontSize: "0.85rem",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-color)"
                }}
            >
                {code}
            </SyntaxHighlighter>
        </div>
    );
};
