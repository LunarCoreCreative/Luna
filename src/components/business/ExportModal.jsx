import { useState } from "react";
import { Download, FileText, FileSpreadsheet, FileJson, Loader2, X, CheckCircle2, AlertCircle } from "lucide-react";
import { API_CONFIG } from "../../config/api";

export default function ExportModal({ isOpen, onClose, userId = "local", selectedPeriod }) {
    const [isExporting, setIsExporting] = useState(false);
    const [exportType, setExportType] = useState(null);
    const [message, setMessage] = useState({ type: "", text: "" });

    const handleExport = async (type) => {
        setIsExporting(true);
        setExportType(type);
        setMessage({ type: "", text: "" });

        try {
            const period = selectedPeriod || new Date().toISOString().slice(0, 7);
            const periodParam = period ? `&period=${period}` : '';
            
            let response;
            let filename;
            let mimeType;

            switch (type) {
                case "csv":
                    response = await fetch(`${API_CONFIG.BASE_URL}/business/export/csv?user_id=${userId}${periodParam}`);
                    filename = `transacoes_${period || 'all'}_${new Date().toISOString().split('T')[0]}.csv`;
                    mimeType = "text/csv";
                    break;
                case "excel":
                    response = await fetch(`${API_CONFIG.BASE_URL}/business/export/excel?user_id=${userId}${periodParam}`);
                    filename = `transacoes_${period || 'all'}_${new Date().toISOString().split('T')[0]}.json`;
                    mimeType = "application/json";
                    break;
                case "report":
                    response = await fetch(`${API_CONFIG.BASE_URL}/business/export/report?user_id=${userId}${periodParam}`);
                    filename = `relatorio_completo_${period || 'all'}_${new Date().toISOString().split('T')[0]}.json`;
                    mimeType = "application/json";
                    break;
                default:
                    throw new Error("Tipo de exportação inválido");
            }

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.detail || "Erro ao exportar");
            }

            if (type === "csv") {
                // CSV vem como texto
                const text = await response.text();
                const blob = new Blob([text], { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            } else {
                // JSON vem como objeto
                const data = await response.json();
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: mimeType });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = filename;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }

            setMessage({ 
                type: "success", 
                text: `Exportação ${type.toUpperCase()} concluída com sucesso! Arquivo baixado.` 
            });

            // Fecha modal após 2 segundos
            setTimeout(() => {
                onClose();
                setMessage({ type: "", text: "" });
            }, 2000);
        } catch (error) {
            console.error("[EXPORT] Erro ao exportar:", error);
            setMessage({ type: "error", text: error.message || "Erro ao exportar. Tente novamente." });
        } finally {
            setIsExporting(false);
            setExportType(null);
        }
    };

    if (!isOpen) return null;

    const formatPeriod = (period) => {
        if (!period) return "Todos os períodos";
        try {
            const [year, month] = period.split("-");
            const monthNames = [
                "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
                "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
            ];
            return `${monthNames[parseInt(month) - 1]} ${year}`;
        } catch {
            return period;
        }
    };

    const currentPeriod = selectedPeriod || new Date().toISOString().slice(0, 7);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="relative w-full max-w-2xl mx-4 bg-[var(--bg-primary)] rounded-2xl border-2 shadow-2xl animate-in zoom-in duration-200"
                style={{ borderColor: 'var(--border-color)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-violet-500 bg-clip-text text-transparent">
                        Exportar Dados
                    </h2>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="mb-6 p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Exportando dados de: <strong style={{ color: 'var(--text-primary)' }}>{formatPeriod(currentPeriod)}</strong>
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* CSV Export */}
                        <button
                            onClick={() => handleExport("csv")}
                            disabled={isExporting}
                            className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                background: 'var(--bg-secondary)',
                                borderColor: 'var(--border-color)',
                                color: 'var(--text-primary)'
                            }}
                        >
                            {isExporting && exportType === "csv" ? (
                                <Loader2 size={32} className="animate-spin text-purple-400" />
                            ) : (
                                <FileText size={32} className="text-purple-400" />
                            )}
                            <div className="text-center">
                                <h3 className="font-semibold mb-1">CSV</h3>
                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    Planilha compatível com Excel
                                </p>
                            </div>
                        </button>

                        {/* Excel/JSON Export */}
                        <button
                            onClick={() => handleExport("excel")}
                            disabled={isExporting}
                            className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                background: 'var(--bg-secondary)',
                                borderColor: 'var(--border-color)',
                                color: 'var(--text-primary)'
                            }}
                        >
                            {isExporting && exportType === "excel" ? (
                                <Loader2 size={32} className="animate-spin text-purple-400" />
                            ) : (
                                <FileSpreadsheet size={32} className="text-purple-400" />
                            )}
                            <div className="text-center">
                                <h3 className="font-semibold mb-1">Excel</h3>
                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    JSON formatado para Excel
                                </p>
                            </div>
                        </button>

                        {/* Full Report Export */}
                        <button
                            onClick={() => handleExport("report")}
                            disabled={isExporting}
                            className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{
                                background: 'var(--bg-secondary)',
                                borderColor: 'var(--border-color)',
                                color: 'var(--text-primary)'
                            }}
                        >
                            {isExporting && exportType === "report" ? (
                                <Loader2 size={32} className="animate-spin text-purple-400" />
                            ) : (
                                <FileJson size={32} className="text-purple-400" />
                            )}
                            <div className="text-center">
                                <h3 className="font-semibold mb-1">Relatório</h3>
                                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                    Relatório completo em JSON
                                </p>
                            </div>
                        </button>
                    </div>

                    {/* Message */}
                    {message.text && (
                        <div 
                            className={`mt-6 p-4 rounded-xl flex items-start gap-3 ${
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

                    {/* Info */}
                    <div className="mt-6 p-4 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
                        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                            <strong>Dica:</strong> Os arquivos CSV podem ser abertos diretamente no Excel. 
                            Os arquivos JSON podem ser importados em outras ferramentas ou usados como backup.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}
