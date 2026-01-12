import { useState, useEffect } from "react";
import { User, GraduationCap, Loader2, AlertCircle, CheckCircle } from "lucide-react";
import { API_CONFIG } from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import { useModalContext } from "../../contexts/ModalContext";

/**
 * ProfileSelector - Componente para seleção/troca de perfil de saúde
 * Permite escolher entre perfil de Aluno ou Avaliador
 */
export const ProfileSelector = ({ onProfileSelected, onClose }) => {
    const { user } = useAuth();
    const userId = user?.uid || "local";
    const { showAlert, showConfirm } = useModalContext();
    
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [currentProfile, setCurrentProfile] = useState(null);
    const [selectedType, setSelectedType] = useState(null);
    const [error, setError] = useState(null);

    // Carregar perfil atual
    useEffect(() => {
        loadProfile();
    }, [userId]);

    const loadProfile = async () => {
        try {
            setLoading(true);
            setError(null);
            
            const response = await fetch(`${API_CONFIG.BASE_URL}/health/profile?user_id=${userId}`);
            const data = await response.json();
            
            if (data.success && data.profile) {
                setCurrentProfile(data.profile);
                setSelectedType(data.profile.type);
            } else {
                setCurrentProfile(null);
                setSelectedType(null);
            }
        } catch (err) {
            console.error("Erro ao carregar perfil:", err);
            setError("Erro ao carregar perfil. Tente novamente.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateProfile = async (type) => {
        try {
            setSaving(true);
            setError(null);
            
            const response = await fetch(`${API_CONFIG.BASE_URL}/health/profile`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    type: type,
                    user_id: userId
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Aguardar um pouco para garantir que o backend salvou
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Recarregar perfil para garantir que tem todos os dados (ex: código do avaliador)
                const reloadRes = await fetch(`${API_CONFIG.BASE_URL}/health/profile?user_id=${userId}`);
                const reloadData = await reloadRes.json();
                
                const finalProfile = reloadData.success && reloadData.profile ? reloadData.profile : data.profile;
                
                setCurrentProfile(finalProfile);
                setSelectedType(type);
                
                if (onProfileSelected) {
                    onProfileSelected(finalProfile);
                }
            } else {
                setError(data.detail || "Erro ao criar perfil");
                showAlert("error", data.detail || "Erro ao criar perfil");
            }
        } catch (err) {
            console.error("Erro ao criar perfil:", err);
            setError("Erro ao criar perfil. Tente novamente.");
            showAlert("error", "Erro ao criar perfil. Tente novamente.");
        } finally {
            setSaving(false);
        }
    };

    const handleChangeProfile = async (newType) => {
        const currentTypeName = currentProfile?.type === "student" ? "Aluno" : "Avaliador";
        const newTypeName = newType === "student" ? "Aluno" : "Avaliador";
        
        const confirmed = await showConfirm(
            "Trocar tipo de perfil?",
            `Você está mudando de ${currentTypeName} para ${newTypeName}. Isso pode afetar suas permissões e acesso a dados. Deseja continuar?`
        );
        
        if (!confirmed) return;
        
        try {
            setSaving(true);
            setError(null);
            
            // Primeiro, deletar o perfil atual (se necessário)
            // Nota: A API pode não ter DELETE, então vamos criar um novo
            // Na prática, você pode querer atualizar o perfil existente
            
            const response = await fetch(`${API_CONFIG.BASE_URL}/health/profile`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    type: newType,
                    user_id: userId
                })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Aguardar um pouco para garantir que o backend salvou
                await new Promise(resolve => setTimeout(resolve, 500));
                
                // Recarregar perfil para garantir que tem todos os dados (ex: código do avaliador)
                const reloadRes = await fetch(`${API_CONFIG.BASE_URL}/health/profile?user_id=${userId}`);
                const reloadData = await reloadRes.json();
                
                const finalProfile = reloadData.success && reloadData.profile ? reloadData.profile : data.profile;
                
                setCurrentProfile(finalProfile);
                setSelectedType(newType);
                
                if (onProfileSelected) {
                    onProfileSelected(finalProfile);
                }
            } else {
                setError(data.detail || "Erro ao alterar perfil");
                showAlert("error", data.detail || "Erro ao alterar perfil");
            }
        } catch (err) {
            console.error("Erro ao alterar perfil:", err);
            setError("Erro ao alterar perfil. Tente novamente.");
            showAlert("error", "Erro ao alterar perfil. Tente novamente.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center p-8">
                <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--accent-primary)' }} />
                <span className="ml-2" style={{ color: 'var(--text-secondary)' }}>Carregando perfil...</span>
            </div>
        );
    }

    return (
        <div className="p-8 max-w-4xl mx-auto" style={{ minHeight: '100vh' }}>
            <div className="mb-8">
                <h2 className="text-3xl font-bold mb-3" style={{ color: 'var(--text-primary)' }}>
                    Perfil de Saúde
                </h2>
                <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
                    Escolha o tipo de perfil que melhor descreve seu papel no sistema de saúde.
                </p>
            </div>

            {error && (
                <div 
                    className="mb-6 p-4 rounded-xl flex items-start border"
                    style={{ 
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        borderColor: 'rgba(239, 68, 68, 0.3)'
                    }}
                >
                    <AlertCircle className="w-5 h-5 mr-3 flex-shrink-0 mt-0.5" style={{ color: '#ef4444' }} />
                    <div className="flex-1">
                        <p className="text-sm font-medium" style={{ color: '#fca5a5' }}>{error}</p>
                    </div>
                </div>
            )}

            {currentProfile && (
                <div 
                    className="mb-6 p-4 rounded-xl border backdrop-blur-sm"
                    style={{ 
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-color)'
                    }}
                >
                    <div className="flex items-center">
                        <div 
                            className="p-2 rounded-lg mr-3"
                            style={{ backgroundColor: 'var(--bg-tertiary)' }}
                        >
                            <CheckCircle className="w-5 h-5" style={{ color: 'var(--accent-primary)' }} />
                        </div>
                        <div>
                            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                                Perfil atual: <span className="capitalize font-bold">
                                    {currentProfile.type === "student" ? "Aluno" : "Avaliador"}
                                </span>
                            </p>
                            {currentProfile.evaluator_code && (
                                <p className="text-xs mt-1 font-mono" style={{ color: 'var(--text-secondary)' }}>
                                    Código: <span style={{ color: 'var(--accent-primary)' }}>{currentProfile.evaluator_code}</span>
                                </p>
                            )}
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Opção: Aluno */}
                <div
                    className={`p-7 rounded-xl cursor-pointer transition-all duration-300 border-2 ${
                        saving ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02] hover:shadow-xl"
                    }`}
                    style={{
                        backgroundColor: selectedType === "student" 
                            ? 'rgba(59, 130, 246, 0.2)' 
                            : 'var(--bg-secondary)',
                        borderColor: selectedType === "student" 
                            ? '#60a5fa' 
                            : 'var(--border-color)',
                        borderWidth: selectedType === "student" ? '2px' : '1px',
                        boxShadow: selectedType === "student" 
                            ? '0 8px 32px rgba(59, 130, 246, 0.3), 0 0 0 1px rgba(59, 130, 246, 0.1)' 
                            : '0 2px 8px rgba(0, 0, 0, 0.1)'
                    }}
                    onClick={() => {
                        if (saving) return;
                        if (currentProfile) {
                            if (currentProfile.type !== "student") {
                                handleChangeProfile("student");
                            }
                        } else {
                            handleCreateProfile("student");
                        }
                    }}
                >
                    <div className="flex items-start">
                        <div 
                            className="p-4 rounded-xl mr-4"
                            style={{ 
                                backgroundColor: selectedType === "student" 
                                    ? 'rgba(59, 130, 246, 0.2)' 
                                    : 'var(--bg-tertiary)'
                            }}
                        >
                            <User 
                                className="w-7 h-7" 
                                style={{ 
                                    color: selectedType === "student" 
                                        ? '#60a5fa' 
                                        : 'var(--text-secondary)'
                                }} 
                            />
                        </div>
                        <div className="flex-1">
                            <h3 
                                className="text-2xl font-bold mb-3"
                                style={{ 
                                    color: selectedType === "student" ? '#93c5fd' : 'var(--text-primary)',
                                    textShadow: selectedType === "student" ? '0 0 10px rgba(59, 130, 246, 0.3)' : 'none'
                                }}
                            >
                                Aluno
                            </h3>
                            <p 
                                className="text-base mb-5 leading-relaxed font-medium"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                Para pacientes que desejam acompanhar sua nutrição e saúde.
                            </p>
                            <ul className="space-y-2.5">
                                {[
                                    "Registrar refeições e atividades",
                                    "Acompanhar metas nutricionais",
                                    "Receber orientações personalizadas",
                                    "Vincular-se a um avaliador"
                                ].map((item, idx) => (
                                    <li 
                                        key={idx}
                                        className="text-sm flex items-start"
                                        style={{ color: 'var(--text-primary)' }}
                                    >
                                        <span 
                                            className="mr-3 font-bold text-lg leading-none"
                                            style={{ color: selectedType === "student" ? '#60a5fa' : 'var(--text-muted)' }}
                                        >•</span>
                                        <span className="flex-1">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    {selectedType === "student" && currentProfile && (
                        <div 
                            className="mt-5 pt-4 border-t flex items-center"
                            style={{ borderColor: 'rgba(59, 130, 246, 0.3)' }}
                        >
                            <CheckCircle className="w-4 h-4 mr-2" style={{ color: '#60a5fa' }} />
                            <span className="text-sm font-medium" style={{ color: '#60a5fa' }}>Perfil ativo</span>
                        </div>
                    )}
                </div>

                {/* Opção: Avaliador */}
                <div
                    className={`p-7 rounded-xl cursor-pointer transition-all duration-300 border-2 ${
                        saving ? "opacity-50 cursor-not-allowed" : "hover:scale-[1.02] hover:shadow-xl"
                    }`}
                    style={{
                        backgroundColor: selectedType === "evaluator" 
                            ? 'rgba(139, 92, 246, 0.2)' 
                            : 'var(--bg-secondary)',
                        borderColor: selectedType === "evaluator" 
                            ? '#a78bfa' 
                            : 'var(--border-color)',
                        borderWidth: selectedType === "evaluator" ? '2px' : '1px',
                        boxShadow: selectedType === "evaluator" 
                            ? '0 8px 32px rgba(139, 92, 246, 0.3), 0 0 0 1px rgba(139, 92, 246, 0.1)' 
                            : '0 2px 8px rgba(0, 0, 0, 0.1)'
                    }}
                    onClick={() => {
                        if (saving) return;
                        if (currentProfile) {
                            if (currentProfile.type !== "evaluator") {
                                handleChangeProfile("evaluator");
                            }
                        } else {
                            handleCreateProfile("evaluator");
                        }
                    }}
                >
                    <div className="flex items-start">
                        <div 
                            className="p-4 rounded-xl mr-4"
                            style={{ 
                                backgroundColor: selectedType === "evaluator" 
                                    ? 'rgba(139, 92, 246, 0.2)' 
                                    : 'var(--bg-tertiary)'
                            }}
                        >
                            <GraduationCap 
                                className="w-7 h-7" 
                                style={{ 
                                    color: selectedType === "evaluator" 
                                        ? '#a78bfa' 
                                        : 'var(--text-secondary)'
                                }} 
                            />
                        </div>
                        <div className="flex-1">
                            <h3 
                                className="text-2xl font-bold mb-3"
                                style={{ 
                                    color: selectedType === "evaluator" ? '#c4b5fd' : 'var(--text-primary)',
                                    textShadow: selectedType === "evaluator" ? '0 0 10px rgba(139, 92, 246, 0.3)' : 'none'
                                }}
                            >
                                Avaliador
                            </h3>
                            <p 
                                className="text-base mb-5 leading-relaxed font-medium"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                Para profissionais de saúde que acompanham pacientes.
                            </p>
                            <ul className="space-y-2.5">
                                {[
                                    "Visualizar dados de alunos vinculados",
                                    "Analisar progresso nutricional",
                                    "Fornecer orientações personalizadas",
                                    "Gerenciar múltiplos pacientes"
                                ].map((item, idx) => (
                                    <li 
                                        key={idx}
                                        className="text-sm flex items-start"
                                        style={{ color: 'var(--text-primary)' }}
                                    >
                                        <span 
                                            className="mr-3 font-bold text-lg leading-none"
                                            style={{ color: selectedType === "evaluator" ? '#a78bfa' : 'var(--text-muted)' }}
                                        >•</span>
                                        <span className="flex-1">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>
                    {selectedType === "evaluator" && currentProfile && (
                        <div 
                            className="mt-5 pt-4 border-t flex items-center"
                            style={{ borderColor: 'rgba(139, 92, 246, 0.3)' }}
                        >
                            <CheckCircle className="w-4 h-4 mr-2" style={{ color: '#a78bfa' }} />
                            <span className="text-sm font-medium" style={{ color: '#a78bfa' }}>Perfil ativo</span>
                        </div>
                    )}
                </div>
            </div>

            {saving && (
                <div className="mt-6 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 animate-spin mr-3" style={{ color: 'var(--accent-primary)' }} />
                    <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                        {currentProfile ? "Alterando perfil..." : "Criando perfil..."}
                    </span>
                </div>
            )}

            {onClose && (
                <div className="mt-8 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 text-sm font-medium rounded-lg transition-all duration-200 hover:scale-105 active:scale-95"
                        style={{ 
                            backgroundColor: 'var(--bg-tertiary)',
                            color: 'var(--text-primary)',
                            border: `1px solid var(--border-color)`
                        }}
                    >
                        Fechar
                    </button>
                </div>
            )}
        </div>
    );
};
