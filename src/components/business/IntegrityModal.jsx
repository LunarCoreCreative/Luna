import { useState } from "react";
import { Shield, CheckCircle2, AlertCircle, X, Loader2, RefreshCw, AlertTriangle } from "lucide-react";
import { API_CONFIG } from "../../config/api";

export default function IntegrityModal({ isOpen, onClose, userId = "local" }) {
    const [isVerifying, setIsVerifying] = useState(false);
    const [result, setResult] = useState(null);

    const handleVerify = async () => {
        setIsVerifying(true);
        setResult(null);

        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/business/integrity/verify?user_id=${userId}`);
            
            if (!response.ok) {
                throw new Error("Erro ao verificar integridade");
            }

            const data = await response.json();
            setResult(data);
        } catch (error) {
            console.error("[INTEGRITY] Erro ao verificar:", error);
            setResult({
                valid: false,
                issues: [{ message: "Erro ao verificar integridade. Tente novamente." }],
                warnings: []
            });
        } finally {
            setIsVerifying(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div 
                className="relative w-full max-w-4xl mx-4 bg-[var(--bg-primary)] rounded-2xl border-2 shadow-2xl animate-in zoom-in duration-200 max-h-[90vh] flex flex-col"
                style={{ borderColor: 'var(--border-color)' }}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-purple-500/10">
                            <Shield size={24} className="text-purple-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-400 to-violet-500 bg-clip-text text-transparent">
                                Verificação de Integridade
                            </h2>
                            <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
                                Verifica consistência e integridade dos dados
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                    {!result ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <Shield size={64} className="text-purple-400/50 mb-4" />
                            <h3 className="text-xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
                                Verificar Integridade dos Dados
                            </h3>
                            <p className="text-sm mb-6 max-w-md" style={{ color: 'var(--text-secondary)' }}>
                                Esta verificação analisa todos os seus dados para detectar inconsistências, 
                                transações órfãs e problemas de integridade.
                            </p>
                            <button
                                onClick={handleVerify}
                                disabled={isVerifying}
                                className="flex items-center gap-2 px-6 py-3 rounded-xl font-semibold transition-all duration-200 hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed"
                                style={{
                                    background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)',
                                    border: '2px solid rgba(139, 92, 246, 0.3)',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                {isVerifying ? (
                                    <>
                                        <Loader2 size={20} className="animate-spin" />
                                        Verificando...
                                    </>
                                ) : (
                                    <>
                                        <Shield size={20} />
                                        Iniciar Verificação
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {/* Summary */}
                            <div className={`p-6 rounded-xl border-2 ${
                                result.valid 
                                    ? "bg-green-500/10 border-green-500/30" 
                                    : "bg-red-500/10 border-red-500/30"
                            }`}>
                                <div className="flex items-center gap-3 mb-4">
                                    {result.valid ? (
                                        <CheckCircle2 size={32} className="text-green-400" />
                                    ) : (
                                        <AlertCircle size={32} className="text-red-400" />
                                    )}
                                    <div>
                                        <h3 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                                            {result.valid ? "Integridade OK" : "Problemas Encontrados"}
                                        </h3>
                                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                            {result.issues_count || 0} problemas • {result.warnings_count || 0} avisos
                                        </p>
                                    </div>
                                </div>

                                {/* Stats */}
                                {result.stats && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                                        {Object.entries(result.stats).map(([key, value]) => (
                                            <div key={key} className="p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                                                <div className="text-xs uppercase mb-1" style={{ color: 'var(--text-secondary)' }}>
                                                    {key.replace('_', ' ')}
                                                </div>
                                                <div className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                                                    {typeof value === 'object' ? value.total || 0 : value}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Issues */}
                            {result.issues && result.issues.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertCircle size={20} className="text-red-400" />
                                        <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                                            Problemas Críticos ({result.issues.length})
                                        </h3>
                                    </div>
                                    <div className="space-y-2">
                                        {result.issues.map((issue, index) => (
                                            <div
                                                key={index}
                                                className="p-4 rounded-lg border-2 bg-red-500/10 border-red-500/30"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <AlertCircle size={18} className="text-red-400 mt-0.5" />
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-sm font-semibold text-red-400">
                                                                {issue.type || "Erro"}
                                                            </span>
                                                            {issue.entity && (
                                                                <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-300">
                                                                    {issue.entity}
                                                                </span>
                                                            )}
                                                            {issue.entity_id && (
                                                                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                                    ID: {issue.entity_id}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-red-300">
                                                            {issue.message}
                                                        </p>
                                                        {issue.field && (
                                                            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                                                                Campo: {issue.field}
                                                            </p>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Warnings */}
                            {result.warnings && result.warnings.length > 0 && (
                                <div>
                                    <div className="flex items-center gap-2 mb-3">
                                        <AlertTriangle size={20} className="text-yellow-400" />
                                        <h3 className="font-semibold text-lg" style={{ color: 'var(--text-primary)' }}>
                                            Avisos ({result.warnings.length})
                                        </h3>
                                    </div>
                                    <div className="space-y-2">
                                        {result.warnings.map((warning, index) => (
                                            <div
                                                key={index}
                                                className="p-4 rounded-lg border-2 bg-yellow-500/10 border-yellow-500/30"
                                            >
                                                <div className="flex items-start gap-3">
                                                    <AlertTriangle size={18} className="text-yellow-400 mt-0.5" />
                                                    <div className="flex-1">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-sm font-semibold text-yellow-400">
                                                                {warning.type || "Aviso"}
                                                            </span>
                                                            {warning.entity && (
                                                                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-500/20 text-yellow-300">
                                                                    {warning.entity}
                                                                </span>
                                                            )}
                                                        </div>
                                                        <p className="text-sm text-yellow-300">
                                                            {warning.message}
                                                        </p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* All Clear */}
                            {result.valid && (!result.issues || result.issues.length === 0) && (!result.warnings || result.warnings.length === 0) && (
                                <div className="flex flex-col items-center justify-center py-8 text-center">
                                    <CheckCircle2 size={64} className="text-green-400 mb-4" />
                                    <h3 className="text-xl font-bold mb-2 text-green-400">
                                        Tudo Certo!
                                    </h3>
                                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                                        Nenhum problema de integridade foi encontrado. Seus dados estão consistentes.
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t" style={{ borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center justify-between">
                        {result && (
                            <button
                                onClick={handleVerify}
                                disabled={isVerifying}
                                className="flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all duration-200 hover:bg-white/5 disabled:opacity-50"
                                style={{
                                    background: 'var(--bg-secondary)',
                                    border: '1px solid var(--border-color)',
                                    color: 'var(--text-primary)'
                                }}
                            >
                                <RefreshCw size={16} />
                                Verificar Novamente
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="px-6 py-2 rounded-lg font-semibold transition-all duration-200 hover:scale-105"
                            style={{
                                background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2) 0%, rgba(139, 92, 246, 0.1) 100%)',
                                border: '2px solid rgba(139, 92, 246, 0.3)',
                                color: 'var(--text-primary)'
                            }}
                        >
                            Fechar
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
