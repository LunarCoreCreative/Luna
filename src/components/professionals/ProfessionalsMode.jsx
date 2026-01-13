import { useState, useEffect, lazy, Suspense } from "react";
import {
    X,
    LayoutDashboard,
    Users,
    BarChart3,
    MessageCircle,
    GitCompare,
    FileText,
    Settings,
    Loader2,
    User,
    Sparkles
} from "lucide-react";
import { API_CONFIG } from "../../config/api";
import { useAuth } from "../../contexts/AuthContext";
import { LoadingFeedback } from "../LoadingFeedback";

// Lazy loading para componentes de tabs
const DashboardTab = lazy(() => import("./tabs/DashboardTab").then(module => ({ default: module.DashboardTab })));
const AlunosTab = lazy(() => import("./tabs/AlunosTab").then(module => ({ default: module.AlunosTab })));
const AnaliseTab = lazy(() => import("./tabs/AnaliseTab").then(module => ({ default: module.AnaliseTab })));
const ChatTab = lazy(() => import("./tabs/ChatTab").then(module => ({ default: module.ChatTab })));
const ComparacaoTab = lazy(() => import("./tabs/ComparacaoTab").then(module => ({ default: module.ComparacaoTab })));
const RelatoriosTab = lazy(() => import("./tabs/RelatoriosTab").then(module => ({ default: module.RelatoriosTab })));
const ConfiguracoesTab = lazy(() => import("./tabs/ConfiguracoesTab").then(module => ({ default: module.ConfiguracoesTab })));

// ============================================================================
// PROFESSIONALS MODE - Luna Health para Profissionais
// ============================================================================

export const ProfessionalsMode = ({ isOpen, onClose, userId: propUserId }) => {
    // Obter userId do AuthContext se disponível, senão usar prop ou "local"
    const { user } = useAuth();
    const finalUserId = user?.uid || propUserId || "local";
    
    const [activeTab, setActiveTab] = useState("dashboard");
    const [students, setStudents] = useState([]);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Carregar dados iniciais
    useEffect(() => {
        if (isOpen) {
            loadData();
        }
    }, [isOpen, finalUserId]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);
            
            // Carregar lista de alunos
            const studentsRes = await fetch(
                `${API_CONFIG.BASE_URL}/health/profile/students?user_id=${finalUserId}`
            );
            const studentsData = await studentsRes.json();
            if (studentsData.success) {
                setStudents(studentsData.students_info || studentsData.students || []);
            } else {
                console.error("Erro ao carregar alunos:", studentsData);
            }

            // Carregar estatísticas
            const statsRes = await fetch(
                `${API_CONFIG.BASE_URL}/health/profile/students/stats?user_id=${finalUserId}&period_days=30`
            );
            const statsData = await statsRes.json();
            if (statsData.success) {
                setStats(statsData.stats);
            } else {
                console.error("Erro ao carregar estatísticas:", statsData);
            }
        } catch (err) {
            console.error("Erro ao carregar dados:", err);
            setError("Erro ao conectar com o servidor");
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = () => {
        loadData();
    };

    const tabs = [
        { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
        { id: "alunos", label: "Meus Alunos", icon: Users },
        { id: "analise", label: "Análise Individual", icon: BarChart3 },
        { id: "chat", label: "Chat", icon: MessageCircle },
        { id: "comparacao", label: "Comparação", icon: GitCompare },
        { id: "relatorios", label: "Relatórios", icon: FileText },
        { id: "configuracoes", label: "Configurações", icon: Settings }
    ];

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-[var(--bg-primary)] flex" style={{ width: '100vw', height: '100vh' }}>
            <div className="w-full h-full flex overflow-hidden relative">
                {/* Background Gradient - Roxo/Índigo para diferenciar do HealthMode */}
                <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-indigo-500/3 to-transparent pointer-events-none" />
                
                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-hidden relative z-10">
                    {/* Header */}
                    <header className="relative p-4 md:p-6 border-b border-[var(--border-color)]/50 flex items-center justify-between backdrop-blur-xl bg-[var(--bg-primary)]/80 z-10">
                        <div className="flex items-center gap-2 md:gap-4">
                            <div className="relative">
                                <div className="w-10 h-10 md:w-14 md:h-14 rounded-xl md:rounded-2xl bg-gradient-to-br from-purple-400 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20 transform transition-transform hover:scale-105">
                                    <Sparkles size={20} className="md:w-7 md:h-7 text-white drop-shadow-sm" />
                                </div>
                                <div className="absolute -top-1 -right-1 w-3 h-3 md:w-4 md:h-4 bg-purple-400 rounded-full animate-pulse border-2 border-[var(--bg-primary)]" />
                            </div>
                            <div>
                                <h1 className="text-xl md:text-3xl font-bold bg-gradient-to-r from-purple-400 to-indigo-500 bg-clip-text text-transparent">
                                    Luna Health - Profissionais
                                </h1>
                                <p className="text-xs md:text-sm font-medium mt-0.5 hidden sm:block" style={{ color: 'var(--text-secondary)' }}>
                                    Gestão profissional de pacientes
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Badge de perfil */}
                            <div className="hidden sm:flex items-center gap-2 px-2 md:px-3 py-1 md:py-1.5 rounded-lg bg-white/5 border border-white/10">
                                <User size={14} className="md:w-4 md:h-4 text-purple-400" />
                                <span className="text-xs md:text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                    Avaliador
                                </span>
                            </div>
                            {/* Botão fechar */}
                            <button
                                onClick={onClose}
                                aria-label="Fechar Luna Health Profissionais"
                                className="p-2 md:p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 group min-w-[44px] min-h-[44px] flex items-center justify-center"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                <X size={18} className="md:w-[22px] md:h-[22px] group-hover:rotate-90 transition-transform duration-200" />
                            </button>
                        </div>
                    </header>

                    {/* Tabs */}
                    <div className="relative flex border-b border-[var(--border-color)]/50 px-2 md:px-6 bg-[var(--bg-primary)]/50 backdrop-blur-sm overflow-x-auto scrollbar-hide">
                        {tabs.map(tab => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className="px-3 md:px-5 py-2.5 md:py-3.5 text-sm md:text-base font-semibold transition-all duration-300 relative group whitespace-nowrap flex-shrink-0"
                                    style={{
                                        color: activeTab === tab.id ? '#a855f7' : 'var(--text-secondary)'
                                    }}
                                >
                                    <span className="relative z-10 flex items-center gap-2">
                                        <Icon size={16} />
                                        {tab.label}
                                    </span>
                                    {activeTab === tab.id && (
                                        <>
                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 to-indigo-500 rounded-t-full shadow-lg shadow-purple-500/30" />
                                            <div className="absolute inset-0 bg-purple-500/5 rounded-t-xl" />
                                        </>
                                    )}
                                    {activeTab !== tab.id && (
                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/5 rounded-t-xl transition-opacity duration-200" />
                                    )}
                                </button>
                            );
                        })}
                    </div>

                    {/* Content */}
                    <main className="flex-1 overflow-y-auto p-4 md:p-6 relative">
                        {loading ? (
                            <div className="flex items-center justify-center h-full">
                                <LoadingFeedback 
                                    message="Carregando dados profissionais" 
                                    subMessage="Preparando informações dos seus alunos"
                                    type="loading"
                                    size="large"
                                />
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center h-full p-6">
                                <div className="text-red-400 mb-4 text-lg">⚠️ {error}</div>
                                <button
                                    onClick={loadData}
                                    className="px-6 py-3 bg-purple-500/20 text-purple-300 rounded-lg hover:bg-purple-500/30 transition-colors"
                                >
                                    Tentar novamente
                                </button>
                            </div>
                        ) : activeTab === "dashboard" ? (
                            <Suspense fallback={<LoadingFeedback message="Carregando dashboard..." type="loading" size="default" />}>
                                <DashboardTab 
                                    userId={finalUserId}
                                    students={students}
                                    stats={stats}
                                    onRefresh={handleRefresh}
                                />
                            </Suspense>
                        ) : activeTab === "alunos" ? (
                            <Suspense fallback={<LoadingFeedback message="Carregando alunos..." type="loading" size="default" />}>
                                <AlunosTab 
                                    userId={finalUserId}
                                    students={students}
                                    onRefresh={handleRefresh}
                                />
                            </Suspense>
                        ) : activeTab === "analise" ? (
                            <Suspense fallback={<LoadingFeedback message="Carregando análise..." type="loading" size="default" />}>
                                <AnaliseTab 
                                    userId={finalUserId}
                                    students={students}
                                />
                            </Suspense>
                        ) : activeTab === "chat" ? (
                            <Suspense fallback={<LoadingFeedback message="Carregando chat..." type="loading" size="default" />}>
                                <ChatTab 
                                    userId={finalUserId}
                                    students={students}
                                />
                            </Suspense>
                        ) : activeTab === "comparacao" ? (
                            <Suspense fallback={<LoadingFeedback message="Carregando comparação..." type="loading" size="default" />}>
                                <ComparacaoTab 
                                    userId={finalUserId}
                                    students={students}
                                />
                            </Suspense>
                        ) : activeTab === "relatorios" ? (
                            <Suspense fallback={<LoadingFeedback message="Carregando relatórios..." type="loading" size="default" />}>
                                <RelatoriosTab 
                                    userId={finalUserId}
                                    students={students}
                                />
                            </Suspense>
                        ) : activeTab === "configuracoes" ? (
                            <Suspense fallback={<LoadingFeedback message="Carregando configurações..." type="loading" size="default" />}>
                                <ConfiguracoesTab 
                                    userId={finalUserId}
                                />
                            </Suspense>
                        ) : null}
                    </main>
                </div>
            </div>
        </div>
    );
};
