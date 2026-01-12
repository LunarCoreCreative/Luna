import React, { useState, useEffect, useCallback } from "react";
import { 
    Copy, 
    RefreshCw, 
    Users, 
    Loader2, 
    CheckCircle,
    Eye,
    Trash2,
    User,
    Share2,
    TrendingUp,
    GraduationCap,
    AlertCircle
} from "lucide-react";
import { API_CONFIG } from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import { useModalContext } from "../../contexts/ModalContext";

/**
 * EvaluatorDashboard - Dashboard integrado para avaliadores
 * Mostra código e lista de alunos vinculados
 */
export const EvaluatorDashboard = ({ 
    evaluatorProfile, 
    onSelectStudent, 
    selectedStudentId,
    onClose,
    onSwitchToStudent
}) => {
    const { user } = useAuth();
    const userId = user?.uid || "local";
    const { showAlert, showConfirm } = useModalContext();
    
    const [loading, setLoading] = useState(true);
    const [students, setStudents] = useState([]);
    const [studentsInfo, setStudentsInfo] = useState({}); // Informações dos alunos (nome, email)
    const [studentDetails, setStudentDetails] = useState({});
    const [generatingCode, setGeneratingCode] = useState(false);
    const [copied, setCopied] = useState(false);
    const [profile, setProfile] = useState(evaluatorProfile);
    const [loadingCode, setLoadingCode] = useState(false);
    const [showCodePanel, setShowCodePanel] = useState(true);
    const [stats, setStats] = useState(null);
    const [loadingStats, setLoadingStats] = useState(false);

    useEffect(() => {
        const loadProfile = async () => {
            const currentProfile = profile || evaluatorProfile;
            if (currentProfile && currentProfile.type === "evaluator" && !currentProfile.evaluator_code) {
                setLoadingCode(true);
                try {
                    const response = await fetch(`${API_CONFIG.BASE_URL}/health/profile?user_id=${userId}`);
                    const data = await response.json();
                    if (data.success && data.profile) {
                        setProfile(data.profile);
                    }
                } catch (err) {
                    console.error("Erro ao carregar perfil:", err);
                } finally {
                    setLoadingCode(false);
                }
            }
        };
        loadProfile();
    }, [userId]);

    useEffect(() => {
        if (evaluatorProfile) {
            setProfile(evaluatorProfile);
        }
    }, [evaluatorProfile]);

    useEffect(() => {
        const currentProfile = profile || evaluatorProfile;
        if (currentProfile && userId) {
            loadStudents();
        }
    }, [profile?.type, evaluatorProfile?.type, userId]); // Otimizado: só recarrega se tipo mudar

    const loadStudents = async () => {
        try {
            setLoading(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}/health/profile/students?user_id=${userId}`);
            const data = await response.json();
            
            if (data.success) {
                setStudents(data.students || []);
                
                // Mapear informações dos alunos (nome, email)
                const infoMap = {};
                if (data.students_info && Array.isArray(data.students_info)) {
                    data.students_info.forEach((info) => {
                        infoMap[info.id] = {
                            name: info.name || null,
                            email: info.email || null
                        };
                    });
                }
                setStudentsInfo(infoMap);
                
                // Não carregar detalhes completos na listagem - apenas quando necessário
                // Isso acelera muito o carregamento inicial
            }
        } catch (err) {
            console.error("Erro ao carregar alunos:", err);
            showAlert("error", "Erro ao carregar lista de alunos");
        } finally {
            setLoading(false);
        }
    };

    // Carregar detalhes de um aluno específico sob demanda (quando clicar em "Ver")
    const loadStudentDetails = async (studentId) => {
        if (studentDetails[studentId]) {
            return; // Já carregado
        }
        
        try {
            // Carregar em paralelo
            const [summaryRes, profileRes] = await Promise.all([
                fetch(`${API_CONFIG.BASE_URL}/health/summary?user_id=${userId}&view_as=${studentId}`),
                fetch(`${API_CONFIG.BASE_URL}/health/profile?user_id=${studentId}`)
            ]);
            
            const [summaryData, profileData] = await Promise.all([
                summaryRes.json(),
                profileRes.json()
            ]);
            
            setStudentDetails(prev => ({
                ...prev,
                [studentId]: {
                    summary: summaryData.success ? summaryData.summary : null,
                    profile: profileData.success ? profileData.profile : null
                }
            }));
        } catch (err) {
            console.error(`Erro ao carregar detalhes do aluno ${studentId}:`, err);
        }
    };

    const loadStats = useCallback(async () => {
        if (!userId || students.length === 0) {
            setStats(null);
            return;
        }
        
        try {
            setLoadingStats(true);
            console.log("[EvaluatorDashboard] Buscando estatísticas para", students.length, "alunos...");
            const response = await fetch(`${API_CONFIG.BASE_URL}/health/profile/students/stats?user_id=${userId}&period_days=30`);
            const data = await response.json();
            
            console.log("[EvaluatorDashboard] Resposta de estatísticas:", data);
            if (data.success && data.stats) {
                setStats(data.stats);
                console.log("[EvaluatorDashboard] ✅ Estatísticas carregadas:", data.stats);
            } else {
                console.error("[EvaluatorDashboard] ❌ Erro na resposta:", data);
                setStats(null);
            }
        } catch (error) {
            console.error("[EvaluatorDashboard] ❌ Erro ao carregar estatísticas:", error);
            setStats(null);
        } finally {
            setLoadingStats(false);
        }
    }, [userId, students.length]);

    useEffect(() => {
        // Debounce: só carregar estatísticas após um pequeno delay para evitar múltiplas chamadas
        if (students.length > 0 && userId) {
            const timer = setTimeout(() => {
                console.log("[EvaluatorDashboard] Carregando estatísticas para", students.length, "alunos");
                loadStats();
            }, 300); // 300ms de delay
            
            return () => clearTimeout(timer);
        } else {
            setStats(null);
        }
    }, [students.length, userId, loadStats]);

    const handleCopyCode = async () => {
        const code = profile?.evaluator_code || evaluatorProfile?.evaluator_code;
        if (!code) {
            showAlert("error", "Código não disponível");
            return;
        }
        
        try {
            await navigator.clipboard.writeText(code);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            showAlert("error", "Erro ao copiar código");
        }
    };

    const handleGenerateNewCode = async () => {
        const confirmed = await showConfirm(
            "Gerar novo código?",
            "Isso invalidará o código atual. Deseja continuar?"
        );
        
        if (!confirmed) return;
        
        try {
            setGeneratingCode(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}/health/profile`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type: "evaluator", user_id: userId })
            });
            
            const data = await response.json();
            
            if (data.success) {
                const profileRes = await fetch(`${API_CONFIG.BASE_URL}/health/profile?user_id=${userId}`);
                const profileData = await profileRes.json();
                if (profileData.success && profileData.profile) {
                    setProfile(profileData.profile);
                }
            } else {
                showAlert("error", data.detail || "Erro ao gerar código");
            }
        } catch (err) {
            showAlert("error", "Erro ao gerar código");
        } finally {
            setGeneratingCode(false);
        }
    };

    const handleViewStudent = async (studentId) => {
        // Carregar detalhes sob demanda quando clicar em "Ver"
        await loadStudentDetails(studentId);
        if (onSelectStudent) {
            onSelectStudent(studentId);
        }
    };

    const handleUnlinkStudent = async (studentId) => {
        const confirmed = await showConfirm(
            "Desvincular aluno?",
            "Tem certeza que deseja remover a vinculação?"
        );
        
        if (!confirmed) return;
        
        try {
            const response = await fetch(
                `${API_CONFIG.BASE_URL}/health/profile/link?user_id=${studentId}&evaluator_id=${userId}`,
                { method: "DELETE" }
            );
            
            const data = await response.json();
            
            if (data.success) {
                loadStudents();
            } else {
                showAlert("error", data.detail || "Erro ao desvincular");
            }
        } catch (err) {
            showAlert("error", "Erro ao desvincular aluno");
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--text-secondary)]" />
            </div>
        );
    }

    const evaluatorCode = profile?.evaluator_code || evaluatorProfile?.evaluator_code;

    return (
        <div className="h-full flex flex-col">
            {/* Código do Avaliador - Card no topo */}
            {showCodePanel && (
                <div className="mb-6 p-5 rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/10 via-purple-500/5 to-transparent">
                    <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center">
                                <GraduationCap className="w-5 h-5 text-violet-400" />
                            </div>
                            <div>
                                <div className="text-sm font-semibold text-[var(--text-primary)]">
                                    Seu Código de Avaliador
                                </div>
                                <div className="text-xs text-[var(--text-secondary)]">
                                    Compartilhe com seus alunos
                                </div>
                            </div>
                        </div>
                        <button
                            onClick={() => setShowCodePanel(false)}
                            className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] transition-colors"
                            title="Ocultar código"
                        >
                            <Share2 className="w-4 h-4 text-[var(--text-muted)]" />
                        </button>
                    </div>
                    
                    {evaluatorCode ? (
                        <div className="flex items-center gap-3">
                            <div className="flex-1 p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                                <div className="text-xs text-[var(--text-muted)] mb-2">Código único</div>
                                <div className="font-mono text-2xl font-bold text-violet-300 tracking-wider select-all">
                                    {evaluatorCode}
                                </div>
                            </div>
                            <div className="flex flex-col gap-2">
                                <button
                                    onClick={handleCopyCode}
                                    className={`px-4 py-3 rounded-xl transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 text-sm font-medium ${
                                        copied 
                                            ? 'bg-violet-500 text-white border border-violet-400' 
                                            : 'bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:border-violet-500/50 text-[var(--text-primary)]'
                                    }`}
                                    title="Copiar código"
                                >
                                    {copied ? (
                                        <>
                                            <CheckCircle className="w-4 h-4" />
                                            <span>Copiado</span>
                                        </>
                                    ) : (
                                        <>
                                            <Copy className="w-4 h-4" />
                                            <span>Copiar</span>
                                        </>
                                    )}
                                </button>
                                <button
                                    onClick={handleGenerateNewCode}
                                    disabled={generatingCode}
                                    className="px-4 py-3 rounded-xl transition-all hover:scale-105 active:scale-95 disabled:opacity-50 bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:border-purple-500/50 text-[var(--text-primary)]"
                                    title="Gerar novo código"
                                >
                                    {generatingCode ? (
                                        <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                                    ) : (
                                        <RefreshCw className="w-4 h-4" />
                                    )}
                                </button>
                            </div>
                        </div>
                    ) : loadingCode ? (
                        <div className="flex items-center justify-center py-8">
                            <Loader2 className="w-5 h-5 animate-spin text-[var(--text-secondary)]" />
                        </div>
                    ) : (
                        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                            <div className="text-sm text-red-400">Código não disponível</div>
                        </div>
                    )}
                </div>
            )}

            {/* Botão para mostrar código se estiver oculto */}
            {!showCodePanel && (
                <button
                    onClick={() => setShowCodePanel(true)}
                    className="mb-6 px-4 py-2 text-sm font-medium rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:border-violet-500/50 transition-colors flex items-center gap-2 text-[var(--text-primary)]"
                >
                    <Share2 className="w-4 h-4" />
                    Mostrar código
                </button>
            )}

            {/* Estatísticas Agregadas (P6.2) */}
            {loadingStats && students.length > 0 && (
                <div className="mb-6 p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-transparent">
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
                    </div>
                </div>
            )}
            {stats && students.length > 0 && !loadingStats && (
                <div className="mb-6 p-5 rounded-2xl border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-green-500/5 to-transparent">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                            <TrendingUp className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                            <div className="text-sm font-semibold text-[var(--text-primary)]">
                                Estatísticas Agregadas (30 dias)
                            </div>
                            <div className="text-xs text-[var(--text-secondary)]">
                                Visão geral de todos os alunos
                            </div>
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                            <div className="text-xs text-[var(--text-muted)] mb-1">Total de Alunos</div>
                            <div className="text-2xl font-bold text-[var(--text-primary)]">
                                {stats.total_students}
                            </div>
                            <div className="text-xs text-emerald-400 mt-1">
                                {stats.active_students} ativos
                            </div>
                        </div>
                        
                        <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                            <div className="text-xs text-[var(--text-muted)] mb-1">Média de Calorias</div>
                            <div className="text-2xl font-bold text-[var(--text-primary)]">
                                {stats.avg_calories.toFixed(0)}
                            </div>
                            <div className="text-xs text-[var(--text-secondary)] mt-1">kcal/dia</div>
                        </div>
                        
                        <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                            <div className="text-xs text-[var(--text-muted)] mb-1">Média de Proteínas</div>
                            <div className="text-2xl font-bold text-[var(--text-primary)]">
                                {stats.avg_protein.toFixed(1)}
                            </div>
                            <div className="text-xs text-[var(--text-secondary)] mt-1">g/dia</div>
                        </div>
                        
                        <div className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                            <div className="text-xs text-[var(--text-muted)] mb-1">Aderência Média</div>
                            <div className="text-2xl font-bold text-[var(--text-primary)]">
                                {(stats.avg_adherence_rate * 100).toFixed(0)}%
                            </div>
                            <div className="text-xs text-[var(--text-secondary)] mt-1">às metas</div>
                        </div>
                    </div>
                    
                    {/* Alertas de alunos sem atividade (P6.3) */}
                    {stats.students_without_activity && stats.students_without_activity.length > 0 && (
                        <div className="mt-4 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30">
                            <div className="flex items-center gap-2 mb-2">
                                <AlertCircle className="w-4 h-4 text-amber-400" />
                                <div className="text-sm font-semibold text-amber-300">
                                    Alunos sem atividade (30 dias)
                                </div>
                            </div>
                            <div className="text-xs text-[var(--text-secondary)] space-y-1">
                                {stats.students_without_activity.map((student, idx) => (
                                    <div key={idx} className="flex items-center gap-2">
                                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                        <span>{student.name || `Aluno ${student.id.substring(0, 8)}...`}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
            {!stats && !loadingStats && students.length > 0 && (
                <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10">
                    <div className="text-sm text-amber-300">
                        ⚠️ Carregando estatísticas... Se não aparecerem, verifique o console do navegador (F12).
                    </div>
                </div>
            )}

            {/* Lista de Alunos */}
            <div className="flex-1">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/20 border border-blue-500/30 flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-400" />
                        </div>
                        <div>
                            <div className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
                                Alunos Vinculados
                                {students.length > 0 && (
                                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                                        {students.length}
                                    </span>
                                )}
                            </div>
                            <div className="text-xs text-[var(--text-secondary)]">
                                {students.length === 0 
                                    ? "Nenhum aluno vinculado ainda" 
                                    : `${students.length} ${students.length === 1 ? 'aluno vinculado' : 'alunos vinculados'}`}
                            </div>
                        </div>
                    </div>
                    {students.length > 0 && (
                        <button
                            onClick={loadStudents}
                            className="px-3 py-2 text-xs font-medium rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:border-blue-500/50 transition-colors flex items-center gap-2 text-[var(--text-primary)]"
                            title="Atualizar lista"
                        >
                            <RefreshCw className="w-4 h-4" />
                            Atualizar
                        </button>
                    )}
                </div>

                {students.length === 0 ? (
                    <div className="p-12 rounded-2xl border-2 border-dashed border-[var(--border-color)] bg-[var(--bg-secondary)] text-center">
                        <div className="w-16 h-16 rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex items-center justify-center mx-auto mb-4">
                            <Users className="w-8 h-8 text-[var(--text-muted)]" />
                        </div>
                        <div className="text-lg font-semibold text-[var(--text-primary)] mb-2">
                            Nenhum aluno vinculado
                        </div>
                        <div className="text-sm text-[var(--text-secondary)] max-w-md mx-auto">
                            Compartilhe seu código acima com seus alunos para que eles possam se vincular
                        </div>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {students.map((studentId) => {
                            const info = studentsInfo[studentId] || {};
                            const details = studentDetails[studentId];
                            const summary = details?.summary;
                            // Usar nome, ou email (sem @domain), ou "Aluno" como fallback
                            let studentName = info.name;
                            if (!studentName || studentName.trim() === "") {
                                if (info.email) {
                                    studentName = info.email.split("@")[0]; // Parte antes do @
                                } else {
                                    studentName = "Aluno";
                                }
                            }
                            const isSelected = selectedStudentId === studentId;
                            
                            return (
                                <div
                                    key={studentId}
                                    className={`group p-4 rounded-xl border transition-all ${
                                        isSelected 
                                            ? 'border-blue-500/50 bg-blue-500/10' 
                                            : 'border-[var(--border-color)] hover:border-blue-500/30 hover:bg-[var(--bg-secondary)]'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-3 flex-1 min-w-0">
                                            <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 border ${
                                                isSelected 
                                                    ? 'border-blue-500/50 bg-blue-500/20' 
                                                    : 'border-[var(--border-color)] bg-[var(--bg-tertiary)]'
                                            }`}>
                                                <User className={`w-5 h-5 ${
                                                    isSelected ? 'text-blue-400' : 'text-[var(--text-secondary)]'
                                                }`} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-sm font-semibold text-[var(--text-primary)]">
                                                        {studentName}
                                                    </span>
                                                    {isSelected && (
                                                        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-500 text-white">
                                                            Visualizando
                                                        </span>
                                                    )}
                                                </div>
                                                {info.email ? (
                                                    <div className="text-xs text-[var(--text-muted)] truncate">
                                                        {info.email}
                                                    </div>
                                                ) : (
                                                    <div className="text-xs font-mono text-[var(--text-muted)] truncate">
                                                        {studentId.substring(0, 16)}...
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 flex-shrink-0">
                                            <button
                                                onClick={() => handleViewStudent(studentId)}
                                                className={`px-4 py-2 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5 ${
                                                    isSelected 
                                                        ? 'bg-blue-500 text-white' 
                                                        : 'bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:border-blue-500/50 text-[var(--text-primary)]'
                                                }`}
                                            >
                                                <Eye className="w-3.5 h-3.5" />
                                                {isSelected ? "Ativo" : "Ver"}
                                            </button>
                                            <button
                                                onClick={() => handleUnlinkStudent(studentId)}
                                                className="p-2 rounded-lg hover:bg-red-500/10 transition-colors"
                                                title="Desvincular"
                                            >
                                                <Trash2 className="w-4 h-4 text-[var(--text-secondary)] hover:text-red-400" />
                                            </button>
                                        </div>
                                    </div>
                                    
                                    {/* Métricas quando selecionado */}
                                    {summary && isSelected && (
                                        <div className="mt-4 pt-4 border-t border-[var(--border-color)] grid grid-cols-4 gap-2">
                                            {[
                                                { label: "Cal", value: summary.total_calories?.toFixed(0) || 0 },
                                                { label: "Prot", value: summary.total_protein?.toFixed(1) || 0 },
                                                { label: "Carb", value: summary.total_carbs?.toFixed(1) || 0 },
                                                { label: "Gord", value: summary.total_fats?.toFixed(1) || 0 }
                                            ].map((metric, idx) => (
                                                <div key={idx} className="text-center p-2 rounded-lg bg-[var(--bg-tertiary)]">
                                                    <div className="text-sm font-bold text-[var(--text-primary)]">
                                                        {metric.value}
                                                    </div>
                                                    <div className="text-[10px] text-[var(--text-muted)] mt-0.5">
                                                        {metric.label}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
};
