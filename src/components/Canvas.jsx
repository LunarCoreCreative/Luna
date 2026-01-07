import { useState, useEffect } from "react";
import { X, Copy, Check, Code, FileText, Maximize2, Minimize2, Download, Edit2, Save, XCircle, List, ChevronLeft, ChevronRight, Trash2, GitCompare } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";

/**
 * Canvas Component - Painel lateral para exibir e editar artefatos gerados pela Luna
 */

// ... (LANGUAGE_LABELS e TYPE_ICONS permanecem os mesmos)

// Mapeamento de linguagens para labels amigáveis
const LANGUAGE_LABELS = {
    python: "Python",
    javascript: "JavaScript",
    jsx: "React JSX",
    typescript: "TypeScript",
    tsx: "React TSX",
    html: "HTML",
    css: "CSS",
    json: "JSON",
    sql: "SQL",
    bash: "Bash",
    shell: "Shell",
    yaml: "YAML",
    markdown: "Markdown",
    plaintext: "Texto"
};

// Mapeamento de tipos para ícones
const TYPE_ICONS = {
    code: Code,
    markdown: FileText,
    react: Code,
    html: Code,
    mermaid: FileText,
    svg: FileText
};

export function Canvas({ artifact, artifacts = [], onSelectArtifact, isOpen, onClose, onSave, onDelete }) {
    const [copied, setCopied] = useState(false);
    const [isMaximized, setIsMaximized] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [editedContent, setEditedContent] = useState("");
    const [showSidebar, setShowSidebar] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [showDiff, setShowDiff] = useState(false);

    // Sincroniza o conteúdo quando o artefato muda
    useEffect(() => {
        if (artifact) {
            setEditedContent(artifact.content);
            setShowDiff(false); // Reset diff when artifact changes
        }
    }, [artifact]);

    // Calculate diff between previous and current content
    const getDiffLines = () => {
        if (!artifact?.previous_content || !showDiff) return null;

        const prevLines = artifact.previous_content.split('\n');
        const currLines = artifact.content.split('\n');

        return currLines.map((line, idx) => {
            const prevLine = prevLines[idx];
            if (prevLine === undefined) return { text: line, status: 'added' };
            if (prevLine !== line) return { text: line, status: 'changed' };
            return { text: line, status: 'unchanged' };
        });
    };

    // Se não houver artefato ou não estiver aberto, não renderiza nada
    if (!artifact || !isOpen) return null;

    const { title, type, language } = artifact;
    const Icon = TYPE_ICONS[type] || Code;
    const languageLabel = LANGUAGE_LABELS[language] || language || type;

    // Copiar conteúdo para clipboard
    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(isEditing ? editedContent : artifact.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error("Erro ao copiar:", err);
        }
    };

    const handleSave = () => {
        if (onSave) {
            onSave(editedContent);
        }
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditedContent(artifact.content);
        setIsEditing(false);
    };

    const handleDelete = () => {
        if (onDelete) {
            onDelete(artifact.id);
            setShowDeleteConfirm(false);
        }
    };

    // Download do arquivo
    const handleDownload = () => {
        const extensions = {
            python: ".py",
            javascript: ".js",
            jsx: ".jsx",
            typescript: ".ts",
            tsx: ".tsx",
            html: ".html",
            css: ".css",
            json: ".json",
            markdown: ".md",
            sql: ".sql",
            yaml: ".yaml",
            plaintext: ".txt"
        };

        const ext = extensions[language] || ".txt";
        const filename = `${title.toLowerCase().replace(/\s+/g, "_")}${ext}`;

        const blob = new Blob([isEditing ? editedContent : artifact.content], { type: "text/plain" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
    };

    // Renderiza conteúdo baseado no tipo
    const renderContent = () => {
        if (isEditing) {
            return (
                <textarea
                    className="canvas-editor"
                    value={editedContent}
                    onChange={(e) => setEditedContent(e.target.value)}
                    placeholder="Edite o conteúdo aqui..."
                    autoFocus
                />
            );
        }

        // Show diff view if enabled and previous content exists
        if (showDiff && artifact.previous_content) {
            const diffLines = getDiffLines();
            return (
                <div className="canvas-diff-view">
                    <div className="canvas-diff-legend">
                        <span className="diff-legend-item diff-added">+ Adicionado</span>
                        <span className="diff-legend-item diff-changed">~ Alterado</span>
                    </div>
                    <pre className="canvas-diff-content">
                        {diffLines && diffLines.map((line, idx) => (
                            <div
                                key={idx}
                                className={`diff-line diff-${line.status}`}
                            >
                                <span className="diff-line-number">{idx + 1}</span>
                                <span className="diff-line-text">{line.text || ' '}</span>
                            </div>
                        ))}
                    </pre>
                </div>
            );
        }

        // DETECÇÃO INTELIGENTE DE MARKDOWN
        // Prioridade: 1) language="markdown", 2) type="markdown", 3) padrões de conteúdo
        const isMarkdownByLang = language === "markdown";
        const isMarkdownByType = type === "markdown";
        const isMarkdownByContent = artifact.content && (
            artifact.content.startsWith("# ") ||
            artifact.content.includes("\n## ") ||
            artifact.content.includes("\n### ") ||
            artifact.content.includes("\n- ") ||
            artifact.content.includes("\n* ") ||
            artifact.content.includes("\n> ")
        );

        // Se a linguagem é markdown, SEMPRE renderiza como markdown (ignora type)
        const shouldRenderAsMarkdown = isMarkdownByLang ||
            (isMarkdownByType && type !== "code") ||
            (isMarkdownByContent && type !== "code" && type !== "react" && type !== "html");

        // Renderiza Markdown
        if (shouldRenderAsMarkdown) {
            return (
                <div className="canvas-markdown prose prose-invert max-w-none">
                    <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                            code({ inline, className, children, ...props }) {
                                const match = /language-(\w+)/.exec(className || "");
                                return !inline && match ? (
                                    <SyntaxHighlighter
                                        style={vscDarkPlus}
                                        language={match[1]}
                                        PreTag="div"
                                        {...props}
                                    >
                                        {String(children).replace(/\n$/, "")}
                                    </SyntaxHighlighter>
                                ) : (
                                    <code className={className} {...props}>
                                        {children}
                                    </code>
                                );
                            },
                            // Better heading styles
                            h1: ({ children }) => <h1 className="text-2xl font-bold mt-6 mb-4 text-white border-b border-white/10 pb-2">{children}</h1>,
                            h2: ({ children }) => <h2 className="text-xl font-semibold mt-5 mb-3 text-white">{children}</h2>,
                            h3: ({ children }) => <h3 className="text-lg font-semibold mt-4 mb-2 text-gray-200">{children}</h3>,
                            p: ({ children }) => <p className="my-3 text-gray-300 leading-relaxed">{children}</p>,
                            blockquote: ({ children }) => <blockquote className="border-l-4 border-violet-500 pl-4 my-4 italic text-gray-400">{children}</blockquote>,
                            ul: ({ children }) => <ul className="list-disc pl-6 my-3 space-y-1">{children}</ul>,
                            ol: ({ children }) => <ol className="list-decimal pl-6 my-3 space-y-1">{children}</ol>,
                            li: ({ children }) => <li className="text-gray-300">{children}</li>,
                            hr: () => <hr className="my-6 border-white/10" />,
                            strong: ({ children }) => <strong className="font-bold text-white">{children}</strong>,
                            em: ({ children }) => <em className="italic text-violet-300">{children}</em>,
                        }}
                    >
                        {artifact.content}
                    </ReactMarkdown>
                </div>
            );
        }

        // Renderiza código com syntax highlighting
        switch (type) {
            case "code":
            case "react":
            case "html":
                return (
                    <SyntaxHighlighter
                        language={language || "plaintext"}
                        style={vscDarkPlus}
                        customStyle={{
                            margin: 0,
                            padding: "1rem",
                            borderRadius: "0.5rem",
                            fontSize: "0.875rem",
                            lineHeight: "1.5",
                            background: "var(--color-bg-tertiary, #1e1e1e)"
                        }}
                        showLineNumbers={artifact.content.split("\n").length > 10}
                        wrapLines
                    >
                        {artifact.content}
                    </SyntaxHighlighter>
                );

            case "mermaid":
                return (
                    <div className="canvas-mermaid">
                        <pre className="mermaid-code">{artifact.content}</pre>
                        <p className="mermaid-note">Diagrama Mermaid (preview em breve)</p>
                    </div>
                );

            default:
                // Default: tenta renderizar como texto simples
                return (
                    <pre className="canvas-raw">
                        {artifact.content}
                    </pre>
                );
        }
    };

    return (
        <div className={`canvas-panel ${isMaximized ? "maximized" : ""}`}>
            <div className={`canvas-sidebar ${showSidebar ? "open" : ""}`}>
                <div className="canvas-sidebar-header">
                    <h4>Arquivos</h4>
                </div>
                <div className="canvas-sidebar-list">
                    {artifacts.map((art) => {
                        const ItemIcon = TYPE_ICONS[art.type] || Code;
                        const isActive = art.id === artifact.id;
                        return (
                            <button
                                key={art.id}
                                className={`canvas-sidebar-item ${isActive ? "active" : ""}`}
                                onClick={() => {
                                    if (onSelectArtifact) onSelectArtifact(art);
                                    setIsEditing(false);
                                }}
                            >
                                <ItemIcon size={14} />
                                <span className="canvas-sidebar-item-title">{art.title}</span>
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Header */}
            <div className="canvas-header">
                <div className="canvas-header-left">
                    <button
                        className={`canvas-btn canvas-btn-list ${showSidebar ? "active" : ""}`}
                        onClick={() => setShowSidebar(!showSidebar)}
                        title="Ver lista de arquivos"
                    >
                        <List size={18} />
                    </button>
                    <Icon size={18} className="ml-2" />
                    <h3 className="canvas-title">{title}</h3>
                    <span className="canvas-badge">{languageLabel}</span>
                    {isEditing && <span className="canvas-status-badge">Editando</span>}
                </div>

                <div className="canvas-header-right">
                    {!isEditing ? (
                        <>
                            <button
                                className="canvas-btn"
                                onClick={() => setIsEditing(true)}
                                title="Editar conteúdo"
                            >
                                <Edit2 size={16} />
                            </button>

                            {/* Diff Toggle Button */}
                            {artifact.previous_content && (
                                <button
                                    className={`canvas-btn ${showDiff ? 'canvas-btn-active' : ''}`}
                                    onClick={() => setShowDiff(!showDiff)}
                                    title={showDiff ? "Ocultar alterações" : "Mostrar alterações"}
                                >
                                    <GitCompare size={16} className={showDiff ? 'text-green-400' : ''} />
                                </button>
                            )}

                            <button
                                className="canvas-btn"
                                onClick={handleCopy}
                                title={copied ? "Copiado!" : "Copiar conteúdo"}
                            >
                                {copied ? <Check size={16} /> : <Copy size={16} />}
                            </button>

                            <button
                                className="canvas-btn"
                                onClick={handleDownload}
                                title="Baixar arquivo"
                            >
                                <Download size={16} />
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                className="canvas-btn canvas-btn-save"
                                onClick={handleSave}
                                title="Salvar alterações"
                            >
                                <Save size={16} className="text-green-400" />
                            </button>
                            <button
                                className="canvas-btn"
                                onClick={handleCancel}
                                title="Cancelar"
                            >
                                <XCircle size={16} className="text-red-400" />
                            </button>
                        </>
                    )}

                    <button
                        className="canvas-btn"
                        onClick={() => setIsMaximized(!isMaximized)}
                        title={isMaximized ? "Restaurar" : "Maximizar"}
                    >
                        {isMaximized ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
                    </button>

                    {/* Delete Button */}
                    <button
                        className="canvas-btn canvas-btn-delete"
                        onClick={() => setShowDeleteConfirm(true)}
                        title="Excluir artefato"
                    >
                        <Trash2 size={16} className="text-red-400" />
                    </button>

                    <button
                        className="canvas-btn canvas-btn-close"
                        onClick={onClose}
                        title="Fechar Canvas"
                    >
                        <X size={16} />
                    </button>

                    {/* Delete Confirmation Modal */}
                    {showDeleteConfirm && (
                        <div className="canvas-delete-modal">
                            <div className="canvas-delete-modal-content">
                                <p>Excluir "{artifact.title}"?</p>
                                <div className="canvas-delete-modal-buttons">
                                    <button onClick={() => setShowDeleteConfirm(false)} className="canvas-btn">
                                        Cancelar
                                    </button>
                                    <button onClick={handleDelete} className="canvas-btn canvas-btn-danger">
                                        Excluir
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className="canvas-content">
                {renderContent()}
            </div>

            {/* Footer com info */}
            <div className="canvas-footer">
                <span className="canvas-lines">
                    {(isEditing ? editedContent : artifact.content).split("\n").length} linhas
                </span>
                <span className="canvas-chars">
                    {(isEditing ? editedContent : artifact.content).length} caracteres
                </span>
            </div>
        </div>
    );
}

export default Canvas;
