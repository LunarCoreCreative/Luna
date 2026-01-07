import { useState, useRef, useCallback } from "react";
import { BookOpen, Upload, Link, X, Loader, FileText, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { API_CONFIG } from "../config/api";

const MEMORY_SERVER = API_CONFIG.BASE_URL;

/**
 * StudyMode - Componente para ingestão de documentos para análise de estilo
 */
export function StudyMode({ isOpen, onClose }) {
    const [mode, setMode] = useState("upload"); // "upload" | "url"
    const [url, setUrl] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [documents, setDocuments] = useState([]);
    const [showDocuments, setShowDocuments] = useState(false);
    const [dragActive, setDragActive] = useState(false);
    const [result, setResult] = useState(null);
    const fileInputRef = useRef(null);

    // Carrega documentos ao abrir
    const loadDocuments = useCallback(async () => {
        try {
            const res = await fetch(`${MEMORY_SERVER}/api/study/documents`);
            const data = await res.json();
            if (data.success) {
                setDocuments(data.documents || []);
            }
        } catch (e) {
            console.error("Erro ao carregar documentos:", e);
        }
    }, []);

    // Carrega documentos quando abre
    useState(() => {
        if (isOpen) loadDocuments();
    }, [isOpen, loadDocuments]);

    // Upload de arquivo
    const handleFileUpload = async (file) => {
        if (!file) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append("file", file);

            const res = await fetch(`${MEMORY_SERVER}/api/study/ingest/file`, {
                method: "POST",
                body: formData
            });

            const data = await res.json();

            if (data.success) {
                setResult(data.document);
                loadDocuments();
            } else {
                setError(data.detail || "Erro ao processar arquivo");
            }
        } catch (e) {
            setError(`Erro de conexão: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Ingestão de URL
    const handleUrlIngest = async () => {
        if (!url.trim()) return;

        setLoading(true);
        setError(null);
        setResult(null);

        try {
            const res = await fetch(`${MEMORY_SERVER}/api/study/ingest/url`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url: url.trim() })
            });

            const data = await res.json();

            if (data.success) {
                setResult(data.document);
                setUrl("");
                loadDocuments();
            } else {
                setError(data.detail || "Erro ao processar URL");
            }
        } catch (e) {
            setError(`Erro de conexão: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    // Deletar documento
    const handleDelete = async (docId) => {
        try {
            await fetch(`${MEMORY_SERVER}/api/study/documents/${docId}`, {
                method: "DELETE"
            });
            loadDocuments();
        } catch (e) {
            console.error("Erro ao deletar:", e);
        }
    };

    // Drag and Drop
    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFileUpload(e.dataTransfer.files[0]);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="study-mode-overlay">
            <div className="study-mode-modal">
                {/* Header */}
                <div className="study-mode-header">
                    <div className="study-mode-title">
                        <BookOpen size={20} />
                        <span>Modo de Estudo</span>
                    </div>
                    <button className="study-mode-close" onClick={onClose}>
                        <X size={18} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="study-mode-tabs">
                    <button
                        className={`study-tab ${mode === "upload" ? "active" : ""}`}
                        onClick={() => setMode("upload")}
                    >
                        <Upload size={16} />
                        Arquivo
                    </button>
                    <button
                        className={`study-tab ${mode === "url" ? "active" : ""}`}
                        onClick={() => setMode("url")}
                    >
                        <Link size={16} />
                        URL
                    </button>
                </div>

                {/* Content */}
                <div className="study-mode-content">
                    {mode === "upload" ? (
                        <div
                            className={`study-dropzone ${dragActive ? "active" : ""}`}
                            onDragEnter={handleDrag}
                            onDragLeave={handleDrag}
                            onDragOver={handleDrag}
                            onDrop={handleDrop}
                            onClick={() => fileInputRef.current?.click()}
                        >
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".pdf,.txt,.epub"
                                style={{ display: "none" }}
                                onChange={(e) => handleFileUpload(e.target.files[0])}
                            />
                            <Upload size={32} className="dropzone-icon" />
                            <p className="dropzone-text">
                                Arraste um arquivo ou clique para selecionar
                            </p>
                            <p className="dropzone-hint">
                                Suporta: PDF, TXT, EPUB
                            </p>
                        </div>
                    ) : (
                        <div className="study-url-input">
                            <input
                                type="url"
                                placeholder="https://exemplo.com/artigo"
                                value={url}
                                onChange={(e) => setUrl(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && handleUrlIngest()}
                            />
                            <button
                                onClick={handleUrlIngest}
                                disabled={!url.trim() || loading}
                            >
                                Analisar
                            </button>
                        </div>
                    )}

                    {/* Loading */}
                    {loading && (
                        <div className="study-loading">
                            <Loader size={24} className="spinning" />
                            <span>Processando documento...</span>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="study-error">
                            {error}
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div className="study-result">
                            <div className="result-header">✅ Documento processado!</div>
                            <div className="result-info">
                                <strong>{result.title}</strong>
                                <span>{result.word_count?.toLocaleString()} palavras</span>
                                <span>{result.chunk_count} chunks</span>
                            </div>
                            <p className="result-preview">{result.preview}</p>
                        </div>
                    )}
                </div>

                {/* Documents List */}
                <div className="study-documents">
                    <button
                        className="documents-toggle"
                        onClick={() => {
                            setShowDocuments(!showDocuments);
                            if (!showDocuments) loadDocuments();
                        }}
                    >
                        <FileText size={16} />
                        Documentos Estudados ({documents.length})
                        {showDocuments ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>

                    {showDocuments && (
                        <div className="documents-list">
                            {documents.length === 0 ? (
                                <p className="no-documents">Nenhum documento estudado ainda</p>
                            ) : (
                                documents.map(doc => (
                                    <div key={doc.id} className="document-item">
                                        <div className="document-info">
                                            <span className="document-title">{doc.title}</span>
                                            <span className="document-meta">
                                                {doc.word_count?.toLocaleString()} palavras • {doc.chunk_count} chunks
                                            </span>
                                        </div>
                                        <button
                                            className="document-delete"
                                            onClick={() => handleDelete(doc.id)}
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="study-mode-footer">
                    <p>📚 Fase 1: Ingestão de documentos</p>
                    <p>Em breve: Análise estilística e geração com estilo</p>
                </div>
            </div>
        </div>
    );
}

export default StudyMode;
