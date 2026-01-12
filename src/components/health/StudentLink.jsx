import { useState, useEffect } from "react";
import { 
    Link2, 
    X, 
    Loader2, 
    CheckCircle,
    AlertCircle,
    User,
    Unlink
} from "lucide-react";
import { API_CONFIG } from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import { useModalContext } from "../../contexts/ModalContext";

/**
 * StudentLink - Componente minimalista para vinculação de aluno ao avaliador
 * Permite inserir código do avaliador e gerenciar vinculação
 */
export const StudentLink = ({ onClose, onLinked }) => {
    const { user } = useAuth();
    const userId = user?.uid || "local";
    const { showAlert, showConfirm } = useModalContext();
    
    const [code, setCode] = useState("");
    const [linking, setLinking] = useState(false);
    const [loading, setLoading] = useState(true);
    const [evaluator, setEvaluator] = useState(null);
    const [unlinking, setUnlinking] = useState(false);
    const [userProfile, setUserProfile] = useState(null); // Perfil do usuário atual

    useEffect(() => {
        loadEvaluator();
        loadUserProfile();
    }, [userId]);

    const loadUserProfile = async () => {
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/health/profile?user_id=${userId}`);
            const data = await response.json();
            if (data.success && data.profile) {
                setUserProfile(data.profile);
            }
        } catch (err) {
            console.error("Erro ao carregar perfil do usuário:", err);
        }
    };

    const loadEvaluator = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}/health/profile/evaluator?user_id=${userId}`);
            const data = await response.json();
            
            if (data.success) {
                setEvaluator(data.evaluator || null);
            }
        } catch (err) {
            console.error("Erro ao carregar avaliador:", err);
        } finally {
            setLoading(false);
        }
    };

    const handleLink = async () => {
        if (!code.trim()) {
            showAlert("error", "Por favor, insira um código");
            return;
        }

        // Verificar se o usuário está tentando usar o próprio código de avaliador
        if (userProfile?.type === "evaluator" && userProfile?.evaluator_code === code.trim()) {
            showAlert("error", "Você não pode se vincular ao seu próprio código de avaliador. Use um perfil de aluno para vincular-se a outro avaliador.");
            return;
        }

        try {
            setLinking(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}/health/profile/link`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    code: code.trim(),
                    user_id: userId
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                setCode("");
                await loadEvaluator();
                if (onLinked) {
                    onLinked(data.evaluator);
                }
            } else {
                showAlert("error", data.detail || "Erro ao vincular");
            }
        } catch (err) {
            console.error("Erro ao vincular:", err);
            showAlert("error", "Erro ao vincular. Tente novamente.");
        } finally {
            setLinking(false);
        }
    };

    const handleUnlink = async () => {
        const confirmed = await showConfirm(
            "Desvincular?",
            "Tem certeza que deseja remover a vinculação com seu avaliador?"
        );
        
        if (!confirmed) return;
        
        try {
            setUnlinking(true);
            const response = await fetch(
                `${API_CONFIG.BASE_URL}/health/profile/link?user_id=${userId}`,
                { method: "DELETE" }
            );
            
            const data = await response.json();
            
            if (data.success) {
                setEvaluator(null);
                if (onLinked) {
                    onLinked(null);
                }
            } else {
                showAlert("error", data.detail || "Erro ao desvincular");
            }
        } catch (err) {
            console.error("Erro ao desvincular:", err);
            showAlert("error", "Erro ao desvincular");
        } finally {
            setUnlinking(false);
        }
    };

    const handleKeyPress = (e) => {
        if (e.key === "Enter" && !linking) {
            handleLink();
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[200px]">
                <Loader2 className="w-5 h-5 animate-spin text-[var(--text-secondary)]" />
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Conteúdo */}
            <div className="p-6">
                {evaluator ? (
                    /* Avaliador Vinculado */
                    <div className="max-w-lg">
                        <div className="p-4 rounded-lg border border-green-500/30 bg-green-500/10 mb-4">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="w-10 h-10 rounded-lg bg-green-500/20 border border-green-500/30 flex items-center justify-center flex-shrink-0">
                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="text-sm font-semibold text-[var(--text-primary)] mb-1">
                                        Vinculado
                                    </div>
                                    <div className="text-xs text-[var(--text-secondary)]">
                                        Você está vinculado a um avaliador
                                    </div>
                                </div>
                            </div>
                            {evaluator.code && (
                                <div className="mt-3 pt-3 border-t border-green-500/20">
                                    <div className="text-xs text-[var(--text-muted)] mb-1">Código do avaliador</div>
                                    <div className="font-mono text-sm font-bold text-[var(--text-primary)]">
                                        {evaluator.code}
                                    </div>
                                </div>
                            )}
                        </div>
                        <button
                            onClick={handleUnlink}
                            disabled={unlinking}
                            className="w-full px-4 py-2.5 text-sm font-medium rounded-lg bg-red-500/10 border border-red-500/30 hover:border-red-500/50 text-red-400 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {unlinking ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Desvinculando...</span>
                                </>
                            ) : (
                                <>
                                    <Unlink className="w-4 h-4" />
                                    <span>Desvincular</span>
                                </>
                            )}
                        </button>
                    </div>
                ) : (
                    /* Formulário de Vinculação */
                    <div className="max-w-lg">
                        <div className="mb-6">
                            <div className="text-xl font-bold text-[var(--text-primary)] mb-2 flex items-center gap-2">
                                <Link2 className="w-5 h-5 text-blue-400" />
                                Vincular Avaliador
                            </div>
                            <div className="text-sm text-[var(--text-secondary)] mb-6">
                                Peça o código único ao seu avaliador para se vincular
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                                    onKeyPress={handleKeyPress}
                                    placeholder="Ex: EVAL-ABC123"
                                    className="flex-1 px-3 py-2 text-sm rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] focus:border-blue-500/50 focus:outline-none text-[var(--text-primary)] placeholder-[var(--text-muted)] font-mono"
                                    disabled={linking}
                                    autoFocus
                                />
                                <button
                                    onClick={handleLink}
                                    disabled={linking || !code.trim()}
                                    className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-500 text-white hover:bg-blue-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 flex-shrink-0"
                                >
                                    {linking ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            <span>Vincular...</span>
                                        </>
                                    ) : (
                                        <>
                                            <Link2 className="w-4 h-4" />
                                            <span>Vincular</span>
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>

                        {/* Dica */}
                        <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                            <div className="flex items-start gap-2">
                                <AlertCircle className="w-4 h-4 text-[var(--text-muted)] flex-shrink-0 mt-0.5" />
                                <div className="text-xs text-[var(--text-secondary)] leading-relaxed">
                                    O código é fornecido pelo seu avaliador. Entre em contato com ele para obter o código de vinculação.
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
