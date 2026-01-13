import { useState } from "react";
import { Download, Upload, CheckCircle2, AlertCircle, Loader2, X } from "lucide-react";
import { API_CONFIG } from "../../config/api";

export default function BackupModal({ isOpen, onClose, userId = "local" }) {
    const [activeTab, setActiveTab] = useState("export"); // "export" | "import"
    const [isLoading, setIsLoading] = useState(false);
    const [message, setMessage] = useState({ type: "", text: "" });
    const [importFile, setImportFile] = useState(null);

    const handleExport = async () => {
        setIsLoading(true);
        setMessage({ type: "", text: "" });
        
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/business/backup/export?user_id=${userId}`);
            
            if (!response.ok) {
                throw new Error("Erro ao exportar backup");
            }
            
            const data = await response.json();
            
            // Cria arquivo JSON para download
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `luna_backup_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            setMessage({ 
                type: "success", 
                text: `Backup exportado com sucesso! ${data.metadata?.transactions_count || 0} transações, ${data.metadata?.clients_count || 0} clientes.` 
            });
        } catch (error) {
            console.error("[BACKUP] Erro ao exportar:", error);
            setMessage({ type: "error", text: "Erro ao exportar backup. Tente novamente." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (file) {
            if (file.type !== "application/json" && !file.name.endsWith(".json")) {
                setMessage({ type: "error", text: "Por favor, selecione um arquivo JSON válido." });
                return;
            }
            setImportFile(file);
            setMessage({ type: "", text: "" });
        }
    };

    const handleValidate = async () => {
        if (!importFile) {
            setMessage({ type: "error", text: "Por favor, selecione um arquivo primeiro." });
            return;
        }

        setIsLoading(true);
        setMessage({ type: "", text: "" });

        try {
            const text = await importFile.text();
            const backupData = JSON.parse(text);

            const response = await fetch(`${API_CONFIG.BASE_URL}/business/backup/validate`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ backup_data: backupData })
            });

            const result = await response.json();

            if (result.valid) {
                setMessage({ 
                    type: "success", 
                    text: `Backup válido! ${result.metadata?.transactions_count || 0} transações, ${result.metadata?.clients_count || 0} clientes.` 
                });
            } else {
                setMessage({ type: "error", text: `Backup inválido: ${result.error}` });
            }
        } catch (error) {
            console.error("[BACKUP] Erro ao validar:", error);
            setMessage({ type: "error", text: "Erro ao validar backup. Verifique se o arquivo é válido." });
        } finally {
            setIsLoading(false);
        }
    };

    const handleImport = async (merge = false) => {
        if (!importFile) {
            setMessage({ type: "error", text: "Por favor, selecione um arquivo primeiro." });
            return;
        }

        if (!window.confirm(
            merge 
                ? "Deseja mesclar os dados do backup com os dados existentes? Dados duplicados serão mantidos."
                : "ATENÇÃO: Isso substituirá TODOS os seus dados atuais. Deseja continuar?"
        )) {
            return;
        }

        setIsLoading(true);
        setMessage({ type: "", text: "" });

        try {
            const text = await importFile.text();
            const backupData = JSON.parse(text);

            const response = await fetch(`${API_CONFIG.BASE_URL}/business/backup/import?user_id=${userId}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ 
                    backup_data: backupData,
                    merge: merge
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || "Erro ao importar backup");
            }

            const result = await response.json();

            setMessage({ 
                type: "success", 
                text: `Backup importado com sucesso! ${result.imported?.transactions || 0} transações, ${result.imported?.clients || 0} clientes.` 
            });

            // Limpa arquivo após importação bem-sucedida
            setImportFile(null);
            const fileInput = document.getElementById("backup-file-input");
            if (fileInput) fileInput.value = "";

            // Recarrega dados após 1 segundo
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            console.error("[BACKUP] Erro ao importar:", error);
            setMessage({ type: "error", text: error.message || "Erro ao importar backup. Verifique se o arquivo é válido." });
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="relative w-full max-w-2xl mx-4 bg-[var(--bg-primary)] rounded-2xl border-2 shadow-2xl animate-in zoom-in duration-200"
                style={{ borderColor: 'var(--border-color)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-violet-500 bg-clip-text text-transparent">
                        Backup e Restauração
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <button
                        onClick={() => { setActiveTab("export"); setMessage({ type: "", text: "" }); }}
                        className={`flex-1 px-6 py-4 font-semibold transition-all duration-200 relative ${
                            activeTab === "export" ? "text-purple-400" : "text-[var(--text-secondary)]"
                        }`}
                    >
                        Exportar
                        {activeTab === "export" && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400" />
                        )}
                    </button>
                    <button
                        onClick={() => { setActiveTab("import"); setMessage({ type: "", text: "" }); }}
                        className={`flex-1 px-6 py-4 font-semibold transition-all duration-200 relative ${
                            activeTab === "import" ? "text-purple-400" : "text-[var(--text-secondary)]"
                        }`}
                    >
                        Importar
                        {activeTab === "import" && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-purple-400" />
                        )}
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {activeTab === "export" ? (
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                                <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                    Exporte todos os seus dados financeiros em formato JSON. Isso inclui transações, clientes, 
                                    itens recorrentes, contas em atraso e tags.
                                </p>
                            </div>

                            <button
                                onClick={handleExport}
                                disabled={isLoading}
                                className="w-full flex items-center justify-center gap-3 px-6 py-4 rounded-xl font-semibold transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)',
                                    border: '2px solid rgba(139, 92, 246, 0.3)',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Exportando...
                                    </>
                                ) : (
                                    <>
                                        <Download size={20} />
                                        Exportar Backup
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                                <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                                    Importe um backup para restaurar seus dados. Você pode escolher entre:
                                </p>
                                <ul className="text-sm space-y-1 ml-4" style={{ color: 'var(--text-secondary)' }}>
                                    <li>• <strong>Substituir:</strong> Remove todos os dados atuais e importa o backup</li>
                                    <li>• <strong>Mesclar:</strong> Combina dados do backup com os existentes</li>
                                </ul>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                                    Selecionar Arquivo de Backup
                                </label>
                                <input
                                    id="backup-file-input"
                                    type="file"
                                    accept=".json"
                                    onChange={handleFileSelect}
                                    className="w-full px-4 py-3 rounded-xl border-2 transition-all duration-200 focus:outline-none focus:border-purple-500/50"
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--text-primary)'
                                    }}
                                />
                                {importFile && (
                                    <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        Arquivo selecionado: {importFile.name}
                                    </p>
                                )}
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={handleValidate}
                                    disabled={!importFile || isLoading}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 hover:bg-white/5 disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        border: '1px solid var(--border-color)',
                                        color: 'var(--text-primary)'
                                    }}
                                >
                                    <CheckCircle2 size={18} />
                                    Validar
                                </button>
                                <button
                                    onClick={() => handleImport(false)}
                                    disabled={!importFile || isLoading}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed bg-red-500/20 border-2 border-red-500/30 text-red-400"
                                >
                                    <Upload size={18} />
                                    Substituir
                                </button>
                                <button
                                    onClick={() => handleImport(true)}
                                    disabled={!importFile || isLoading}
                                    className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-medium transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                    style={{
                                        background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)',
                                        border: '2px solid rgba(139, 92, 246, 0.3)',
                                        color: 'var(--text-primary)'
                                    }}
                                >
                                    <Upload size={18} />
                                    Mesclar
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Message */}
                    {message.text && (
                        <div 
                            className={`mt-4 p-4 rounded-xl flex items-start gap-3 ${
                                message.type === "success" 
                                    ? "bg-green-500/10 border border-green-500/30" 
                                    : "bg-red-500/10 border border-red-500/30"
                            }`}
                        >
                            {message.type === "success" ? (
                                <CheckCircle2 size={20} className="text-green-400 mt-0.5" />
                            ) : (
                                <AlertCircle size={20} className="text-red-400 mt-0.5" />
                            )}
                            <p className={`text-sm flex-1 ${message.type === "success" ? "text-green-400" : "text-red-400"}`}>
                                {message.text}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
