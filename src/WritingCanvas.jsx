import React, { useState, useEffect, useRef } from "react";
import {
    FileText,
    Plus,
    Save,
    History,
    X,
    ChevronLeft,
    ChevronRight,
    Loader2,
    Edit3,
    Trash2,
    Clock
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const MEMORY_SERVER = "http://127.0.0.1:8001";

export default function WritingCanvas({ onClose, lunaEditingDocId }) {
    const [documents, setDocuments] = useState([]);
    const [activeDoc, setActiveDoc] = useState(null);
    const [content, setContent] = useState("");
    const [title, setTitle] = useState("");
    const [isEditing, setIsEditing] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showVersions, setShowVersions] = useState(false);
    const [versions, setVersions] = useState([]);
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [isCreating, setIsCreating] = useState(false);
    const [newTitle, setNewTitle] = useState("");

    const editorRef = useRef(null);
    const saveTimeoutRef = useRef(null);

    // Load documents list
    const loadDocuments = async () => {
        try {
            const res = await fetch(`${MEMORY_SERVER}/documents`);
            const data = await res.json();
            if (data.success) {
                setDocuments(data.documents || []);
            }
        } catch (e) {
            console.error("Failed to load documents", e);
        }
    };

    // Load a specific document
    const loadDocument = async (docId) => {
        try {
            const res = await fetch(`${MEMORY_SERVER}/documents/${docId}`);
            const data = await res.json();
            if (data.success && data.document) {
                setActiveDoc(data.document);
                setContent(data.document.content || "");
                setTitle(data.document.title || "");
                // Set as active document for Luna
                await fetch(`${MEMORY_SERVER}/documents/active/${docId}`, { method: "POST" });
            }
        } catch (e) {
            console.error("Failed to load document", e);
        }
    };

    // Load versions
    const loadVersions = async (docId) => {
        try {
            const res = await fetch(`${MEMORY_SERVER}/documents/${docId}/versions`);
            const data = await res.json();
            if (data.success) {
                setVersions(data.versions || []);
            }
        } catch (e) {
            console.error("Failed to load versions", e);
        }
    };

    // Restore a version
    const restoreVersion = async (idx) => {
        if (!activeDoc) return;
        try {
            const res = await fetch(`${MEMORY_SERVER}/documents/${activeDoc.id}/versions/${idx}`);
            const data = await res.json();
            if (data.success && data.version) {
                setContent(data.version.content || "");
                setShowVersions(false);
                // Auto-save after restore
                await saveDocument(data.version.content);
            }
        } catch (e) {
            console.error("Failed to restore version", e);
        }
    };

    // Save document
    const saveDocument = async (overrideContent = null) => {
        if (!activeDoc) return;
        setIsSaving(true);
        try {
            await fetch(`${MEMORY_SERVER}/documents/${activeDoc.id}`, {
                method: "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    title: title,
                    content: overrideContent !== null ? overrideContent : content
                })
            });
            loadDocuments();
        } catch (e) {
            console.error("Failed to save document", e);
        } finally {
            setIsSaving(false);
        }
    };

    // Create new document
    const createDocument = async () => {
        if (!newTitle.trim()) return;
        try {
            const res = await fetch(`${MEMORY_SERVER}/documents`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ title: newTitle.trim(), content: "" })
            });
            const data = await res.json();
            if (data.success && data.document) {
                loadDocuments();
                loadDocument(data.document.id);
                setIsCreating(false);
                setNewTitle("");
            }
        } catch (e) {
            console.error("Failed to create document", e);
        }
    };

    // Delete document
    const deleteDocument = async (docId) => {
        if (!confirm("Tem certeza que deseja excluir este documento?")) return;
        try {
            await fetch(`${MEMORY_SERVER}/documents/${docId}`, { method: "DELETE" });
            loadDocuments();
            if (activeDoc?.id === docId) {
                setActiveDoc(null);
                setContent("");
                setTitle("");
            }
        } catch (e) {
            console.error("Failed to delete document", e);
        }
    };

    // Auto-save with debounce
    useEffect(() => {
        if (!activeDoc) return;
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            saveDocument();
        }, 2000);
        return () => {
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        };
    }, [content, title]);

    // Initial load
    useEffect(() => {
        loadDocuments();
    }, []);

    // Poll for Luna edits
    useEffect(() => {
        if (!activeDoc) return;
        const interval = setInterval(async () => {
            try {
                const res = await fetch(`${MEMORY_SERVER}/documents/${activeDoc.id}`);
                const data = await res.json();
                if (data.success && data.document) {
                    // Only update if content changed externally (Luna editing)
                    if (data.document.content !== content && data.document.updated_at !== activeDoc.updated_at) {
                        setContent(data.document.content || "");
                        setActiveDoc(data.document);
                    }
                }
            } catch { }
        }, 3000);
        return () => clearInterval(interval);
    }, [activeDoc, content]);

    const isLunaEditing = activeDoc && lunaEditingDocId === activeDoc.id;

    return (
        <div className="writing-canvas">
            {/* Sidebar */}
            <div className={`canvas-sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
                <div className="sidebar-header">
                    <h3>📚 Documentos</h3>
                    <button
                        onClick={() => setSidebarOpen(false)}
                        className="sidebar-toggle"
                        title="Fechar sidebar"
                    >
                        <ChevronLeft size={16} />
                    </button>
                </div>

                <button
                    onClick={() => setIsCreating(true)}
                    className="new-doc-btn"
                >
                    <Plus size={16} /> Novo Documento
                </button>

                {isCreating && (
                    <div className="new-doc-form">
                        <input
                            type="text"
                            placeholder="Título do documento..."
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && createDocument()}
                            autoFocus
                        />
                        <div className="new-doc-actions">
                            <button onClick={createDocument} className="btn-primary">Criar</button>
                            <button onClick={() => { setIsCreating(false); setNewTitle(""); }} className="btn-ghost">Cancelar</button>
                        </div>
                    </div>
                )}

                <div className="doc-list">
                    {documents.map(doc => (
                        <div
                            key={doc.id}
                            className={`doc-item ${activeDoc?.id === doc.id ? 'active' : ''}`}
                            onClick={() => loadDocument(doc.id)}
                        >
                            <FileText size={14} />
                            <span className="doc-title">{doc.title}</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); deleteDocument(doc.id); }}
                                className="doc-delete"
                                title="Excluir"
                            >
                                <Trash2 size={12} />
                            </button>
                        </div>
                    ))}
                    {documents.length === 0 && (
                        <p className="no-docs">Nenhum documento ainda. Crie um novo!</p>
                    )}
                </div>
            </div>

            {/* Toggle sidebar button */}
            {!sidebarOpen && (
                <button
                    onClick={() => setSidebarOpen(true)}
                    className="sidebar-show-btn"
                    title="Mostrar sidebar"
                >
                    <ChevronRight size={16} />
                </button>
            )}

            {/* Main content */}
            <div className="canvas-main">
                {/* Header */}
                <div className="canvas-header">
                    {activeDoc ? (
                        <>
                            <input
                                type="text"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="doc-title-input"
                                placeholder="Título do documento"
                            />
                            <div className="header-actions">
                                {isSaving && <span className="saving-indicator"><Loader2 size={14} className="spin" /> Salvando...</span>}
                                {isLunaEditing && <span className="luna-editing">✨ Luna está escrevendo...</span>}
                                <button
                                    onClick={() => setIsEditing(!isEditing)}
                                    className={`mode-toggle ${isEditing ? 'editing' : 'preview'}`}
                                    title={isEditing ? "Ver preview" : "Editar"}
                                >
                                    <Edit3 size={14} /> {isEditing ? "Editar" : "Preview"}
                                </button>
                                <button
                                    onClick={() => { loadVersions(activeDoc.id); setShowVersions(!showVersions); }}
                                    className="versions-btn"
                                    title="Histórico de versões"
                                >
                                    <History size={14} /> Versões
                                </button>
                            </div>
                        </>
                    ) : (
                        <span className="no-doc-selected">Selecione ou crie um documento</span>
                    )}
                    <button onClick={onClose} className="close-btn" title="Fechar Canvas">
                        <X size={18} />
                    </button>
                </div>

                {/* Editor/Preview */}
                <div className="canvas-content">
                    {activeDoc ? (
                        isEditing ? (
                            <textarea
                                ref={editorRef}
                                value={content}
                                onChange={(e) => setContent(e.target.value)}
                                className="content-editor"
                                placeholder="Comece a escrever ou peça para a Luna..."
                            />
                        ) : (
                            <div className="content-preview markdown-body">
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {content || "*Documento vazio*"}
                                </ReactMarkdown>
                            </div>
                        )
                    ) : (
                        <div className="empty-state">
                            <FileText size={48} />
                            <h3>Canvas de Escrita</h3>
                            <p>Selecione um documento na barra lateral ou crie um novo para começar.</p>
                            <p className="tip">💡 Dica: Peça para a Luna escrever no canvas!</p>
                        </div>
                    )}
                </div>

                {/* Versions panel */}
                {showVersions && activeDoc && (
                    <div className="versions-panel">
                        <div className="versions-header">
                            <h4><Clock size={14} /> Histórico de Versões</h4>
                            <button onClick={() => setShowVersions(false)}><X size={14} /></button>
                        </div>
                        <div className="versions-list">
                            {versions.length > 0 ? versions.map((v, idx) => (
                                <div key={idx} className="version-item">
                                    <span className="version-time">{new Date(v.timestamp).toLocaleString('pt-BR')}</span>
                                    <span className="version-preview">{v.content_preview}</span>
                                    <button onClick={() => restoreVersion(idx)} className="restore-btn">Restaurar</button>
                                </div>
                            )) : (
                                <p className="no-versions">Nenhuma versão anterior salva.</p>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
