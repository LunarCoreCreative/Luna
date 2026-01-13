import { useState, useRef, useEffect } from "react";
import {
    X,
    Calendar,
    BarChart3,
    History,
    Target,
    Bell,
    Apple,
    User,
    Users,
    Link2,
    Loader2,
    GraduationCap
} from "lucide-react";
import { API_CONFIG } from "../../config/api";
import { useModalContext } from "../../contexts/ModalContext";
import { useAuth } from "../../contexts/AuthContext";
import { useHealthData } from "../../hooks/useHealthData";
import { LoadingFeedback } from "../LoadingFeedback";
import { HealthChat } from "./HealthChat";
import { EvaluatorChat } from "./EvaluatorChat";
import { TodayTab } from "./TodayTab";
import { GoalsTab } from "./GoalsTab";
import { HistoryTab } from "./HistoryTab";
import { RemindersTab } from "./RemindersTab";
import { ProfileSelector } from "./ProfileSelector";
import { EvaluatorDashboard } from "./EvaluatorDashboard";
import { StudentLink } from "./StudentLink";
import { StudentSearch } from "./StudentSearch";
import { NotificationPanel } from "./NotificationPanel";
import { MealsTab } from "./tabs/MealsTab";
import { SummaryTab } from "./tabs/SummaryTab";
import { FoodsTab } from "./tabs/FoodsTab";
import { MealPlanTab } from "./tabs/MealPlanTab";

// ============================================================================
// HEALTH MODE - Luna Health (Nutrição)
// ============================================================================

export const HealthMode = ({ isOpen, onClose, userId: propUserId }) => {
    // Obter userId do AuthContext se disponível, senão usar prop ou "local"
    const { user } = useAuth();
    const userId = user?.uid || propUserId || "local";
    
    const { showAlert, showConfirm } = useModalContext();
    const [activeTab, setActiveTab] = useState("today");
    const [chatMessageToSend, setChatMessageToSend] = useState(null);
    const [showAddMeal, setShowAddMeal] = useState(false);
    const [viewAsStudentId, setViewAsStudentId] = useState(null);
    const [showProfileSelector, setShowProfileSelector] = useState(false);
    const [evaluatorStudents, setEvaluatorStudents] = useState([]);
    const [evaluatorStudentsInfo, setEvaluatorStudentsInfo] = useState({});
    const [loadingStudents, setLoadingStudents] = useState(false);
    
    // Usar hook customizado para gerenciar dados
    const healthData = useHealthData(userId, viewAsStudentId);
    const { 
        meals,
        summary,
        goals,
        foods,
        healthProfile,
        isLoading,
        loadingProfile,
        historyData,
        weightsData,
        historyLoading,
        historyError,
        historyPeriod,
        setHealthProfile,
        setHistoryPeriod,
        loadData,
        loadGoals,
        loadFoods,
        searchFoods: searchFoodsInDatabase,
        loadHealthProfile,
        loadHistoryData,
        loadWeightsData,
        refresh,
        setRefreshTrigger
    } = healthData;
    
    // Função para atualizar todos os dados (usada pelo HealthChat)
    const handleHealthUpdate = () => {
        refresh();
        setRefreshTrigger(prev => prev + 1);
    };
    
    // Função para abrir o chat com uma mensagem pré-definida
    const handleOpenChat = (message) => {
        setChatMessageToSend(message);
        // Limpar após um tempo para permitir reenvio
        setTimeout(() => setChatMessageToSend(null), 1000);
    };

    // Form state for new/edit meal
    const [formData, setFormData] = useState({
        name: "",
        food_name: "",
        grams: "",
        portion_type: "fatia", // Tipo de porção padrão
        portion_quantity: "1", // Quantidade de porções
        usePortion: false, // Alternar entre gramas e porções
        time: new Date().toTimeString().slice(0, 5), // HH:MM format
        calories: "",
        protein: "",
        carbs: "",
        fats: "",
        notes: "",
        date: new Date().toISOString().split('T')[0]
    });

    // Food search state
    const [foodSearchQuery, setFoodSearchQuery] = useState("");
    const [foodSearchResults, setFoodSearchResults] = useState([]);
    const [showFoodResults, setShowFoodResults] = useState(false);
    const [selectedFood, setSelectedFood] = useState(null);

    // Carregar perfil e dados quando abrir - OTIMIZADO: carrega goals em paralelo
    useEffect(() => {
        if (isOpen) {
            loadHealthProfile();
        }
    }, [isOpen, userId, loadHealthProfile]);

    useEffect(() => {
        if (isOpen && healthProfile) {
            // Carregar dados principais e goals em paralelo (como BusinessMode faz)
            Promise.all([
                loadData(),
                loadGoals()
            ]).then(() => {
                // Depois que dados principais carregaram, carregar extras se necessário
                if (activeTab === "foods" && foods.length === 0) {
                loadFoods();
            }
                // Se for avaliador, carregar lista de alunos em background (não bloqueia)
                if (healthProfile.type === "evaluator") {
                    loadEvaluatorStudents();
                }
            });
        }
    }, [isOpen, activeTab, healthProfile, viewAsStudentId, foods.length, loadData, loadGoals, loadFoods]);

    const handleProfileSelected = (profile) => {
        setHealthProfile(profile);
        setShowProfileSelector(false);
        refresh();
        if (profile.type === "evaluator") {
            loadEvaluatorStudents();
        }
    };

    const loadEvaluatorStudents = async () => {
        if (healthProfile?.type !== "evaluator") return;
        
        try {
            setLoadingStudents(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}/health/profile/students?user_id=${userId}`);
            const data = await response.json();
            
            if (data.success) {
                setEvaluatorStudents(data.students || []);
                
                // Mapear informações dos alunos para o dropdown
                const studentsInfoMap = {};
                if (data.students_info && Array.isArray(data.students_info)) {
                    data.students_info.forEach((info) => {
                        studentsInfoMap[info.id] = {
                            name: info.name,
                            email: info.email
                        };
                    });
                }
                // Armazenar no estado se necessário (pode ser usado no dropdown)
                setEvaluatorStudentsInfo(studentsInfoMap);
            }
        } catch (err) {
            console.error("Erro ao carregar alunos:", err);
        } finally {
            setLoadingStudents(false);
        }
    };

    // Para avaliadores: ao selecionar aluno no search, mostra os dados dele nas tabs
    // O chat continua sendo EvaluatorChat (não muda)
    const handleStudentSearchSelect = (studentId) => {
        if (studentId) {
            setViewAsStudentId(studentId);
            // Muda para a tab "Hoje" para mostrar os dados do aluno
            setActiveTab("today");
            // Recarrega os dados para o aluno selecionado
            loadData();
            loadGoals();
        } else {
            // Se null, volta para os dados do avaliador
            setViewAsStudentId(null);
            loadData();
            loadGoals();
        }
    };

    const handleOpenProfileSelector = () => {
        setShowProfileSelector(true);
    };

    // Funções de UI que não estão no hook
    const handleAddFood = async () => {
        // Esta função será movida para FoodsTab
    };

    // Search foods (for meal form)
    const searchFoods = async (query) => {
        if (!query || query.length < 2) {
            setFoodSearchResults([]);
            setShowFoodResults(false);
            return;
        }

        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/health/foods/search?query=${encodeURIComponent(query)}&limit=10`);
            const data = await res.json();
            if (data.success) {
                setFoodSearchResults(data.foods || []);
                setShowFoodResults(true);
            }
        } catch (e) {
            console.error("[HEALTH] Error searching foods:", e);
        }
    };

    // Handle food selection
    const handleFoodSelect = async (food) => {
        setSelectedFood(food);
        setFoodSearchQuery(food.name);
        setFormData(prev => ({ ...prev, food_name: food.name }));
        setShowFoodResults(false);
        
        // Se já tem quantidade definida, calcular nutrição
        if (formData.usePortion && formData.portion_quantity && parseFloat(formData.portion_quantity) > 0) {
            await calculateNutrition(
                food.name,
                null,
                formData.portion_type,
                parseFloat(formData.portion_quantity)
            );
        } else if (!formData.usePortion && formData.grams && parseFloat(formData.grams) > 0) {
            await calculateNutrition(food.name, parseFloat(formData.grams));
        }
    };

    // Calculate nutrition based on food and grams or portion
    const calculateNutrition = async (foodName, grams = null, portionType = null, portionQuantity = null) => {
        if (!foodName) {
            return;
        }

        try {
            let url = `${API_CONFIG.BASE_URL}/health/foods/calculate?food_name=${encodeURIComponent(foodName)}`;
            
            if (portionType && portionQuantity) {
                // Usar porções
                url += `&portion_type=${encodeURIComponent(portionType)}&portion_quantity=${portionQuantity}`;
            } else if (grams && grams > 0) {
                // Usar gramas
                url += `&grams=${grams}`;
            } else {
                return; // Sem quantidade válida
            }

            const res = await fetch(url);
            const data = await res.json();
            if (data.success && data.nutrition) {
                setFormData(prev => ({
                    ...prev,
                    calories: data.nutrition.calories.toFixed(1),
                    protein: data.nutrition.protein.toFixed(1),
                    carbs: data.nutrition.carbs.toFixed(1),
                    fats: data.nutrition.fats.toFixed(1)
                }));
            }
        } catch (e) {
            console.error("[HEALTH] Error calculating nutrition:", e);
        }
    };

    const handleAddMeal = async () => {
        if (!formData.food_name.trim()) {
            showAlert("Selecione um alimento", "error");
            return;
        }
        
        // Validar quantidade (gramas ou porções)
        if (formData.usePortion) {
            if (!formData.portion_quantity || parseFloat(formData.portion_quantity) <= 0) {
                showAlert("Informe a quantidade de porções", "error");
                return;
            }
        } else {
            if (!formData.grams || parseFloat(formData.grams) <= 0) {
                showAlert("Informe a quantidade em gramas", "error");
                return;
            }
        }

        try {
            // Determinar nome da refeição
            let mealName = formData.name;
            if (!mealName) {
                if (formData.usePortion) {
                    mealName = `${formData.food_name} (${formData.portion_quantity} ${formData.portion_type}${parseFloat(formData.portion_quantity) > 1 ? 's' : ''})`;
                } else {
                    mealName = `${formData.food_name} (${formData.grams}g)`;
                }
            }

            // Determinar notas
            let notes = formData.notes;
            if (!notes) {
                if (formData.usePortion) {
                    notes = `Alimento: ${formData.food_name}, Quantidade: ${formData.portion_quantity} ${formData.portion_type}${parseFloat(formData.portion_quantity) > 1 ? 's' : ''}`;
                } else {
                    notes = `Alimento: ${formData.food_name}, Quantidade: ${formData.grams}g`;
                }
            }

            const requestBody = {
                name: mealName,
                meal_type: formData.time, // Store time as meal_type for now (backwards compatibility)
                calories: formData.calories ? parseFloat(formData.calories) : null,
                protein: formData.protein ? parseFloat(formData.protein) : null,
                carbs: formData.carbs ? parseFloat(formData.carbs) : null,
                fats: formData.fats ? parseFloat(formData.fats) : null,
                notes: notes,
                date: formData.date,
                user_id: userId
            };

            // Adicionar parâmetros de porção ou gramas
            if (formData.usePortion) {
                requestBody.portion_type = formData.portion_type;
                requestBody.portion_quantity = parseFloat(formData.portion_quantity);
            } else {
                requestBody.grams = parseFloat(formData.grams);
            }

            const res = await fetch(`${API_CONFIG.BASE_URL}/health/meals`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(requestBody)
            });

            const data = await res.json();
            if (data.success) {
                loadData();
                setRefreshTrigger(prev => prev + 1); // Trigger refresh for TodayTab
                setShowAddMeal(false);
                setFormData({
                    name: "",
                    food_name: "",
                    grams: "",
                    portion_type: "fatia",
                    portion_quantity: "1",
                    usePortion: false,
                    time: new Date().toTimeString().slice(0, 5),
                    calories: "",
                    protein: "",
                    carbs: "",
                    fats: "",
                    notes: "",
                    date: new Date().toISOString().split('T')[0]
                });
                setSelectedFood(null);
                setFoodSearchQuery("");
                setShowFoodResults(false);
                setSelectedFood(null);
                setFoodSearchQuery("");
                setFoodSearchResults([]);
                setShowFoodResults(false);
            } else {
                showAlert(data.error || "Erro ao registrar refeição", "error");
            }
        } catch (e) {
            console.error("[HEALTH] Error adding meal:", e);
            showAlert("Erro ao registrar refeição", "error");
        }
    };



    if (!isOpen) return null;

    // Mostrar ProfileSelector se não tiver perfil e não estiver carregando
    if (showProfileSelector && !loadingProfile) {
        return (
            <div className="fixed inset-0 z-[100] bg-[var(--bg-primary)] flex items-center justify-center" style={{ width: '100vw', height: '100vh' }}>
                <div className="w-full h-full overflow-y-auto">
                    <div className="absolute top-4 right-4">
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <X className="w-5 h-5 text-gray-600" />
                        </button>
                    </div>
                    <ProfileSelector 
                        onProfileSelected={handleProfileSelected}
                        onClose={onClose}
                    />
                </div>
            </div>
        );
    }

    // Mostrar loading enquanto carrega perfil
    if (loadingProfile) {
        return (
            <div className="fixed inset-0 z-[100] bg-[var(--bg-primary)] flex items-center justify-center" style={{ width: '100vw', height: '100vh' }}>
                <div className="flex flex-col items-center">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500 mb-4" />
                    <p className="text-gray-600">Carregando perfil...</p>
                </div>
            </div>
        );
    }



    return (
        <div className="fixed inset-0 z-[100] bg-[var(--bg-primary)] flex" style={{ width: '100vw', height: '100vh' }}>
            <div className="w-full h-full flex overflow-hidden relative">
                {/* Background Gradient */}
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-emerald-500/3 to-transparent pointer-events-none" />
                
                {/* Main Content */}
                <div className="flex-1 flex flex-col overflow-hidden relative z-10">
                    {/* Header */}
                    <header className="relative p-6 border-b border-[var(--border-color)]/50 flex items-center justify-between backdrop-blur-xl bg-[var(--bg-primary)]/80 z-10">
                        <div className="flex items-center gap-4">
                            <div className="relative">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-green-500/20 transform transition-transform hover:scale-105">
                                    <Apple size={28} className="text-white drop-shadow-sm" />
                                </div>
                                <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-400 rounded-full animate-pulse border-2 border-[var(--bg-primary)]" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                                    Luna Health
                                </h1>
                                <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                                    {healthProfile?.type === "evaluator" 
                                        ? (viewAsStudentId && evaluatorStudentsInfo[viewAsStudentId]?.name
                                            ? `Visualizando: ${evaluatorStudentsInfo[viewAsStudentId].name}`
                                            : "Análise profissional de pacientes")
                                        : "Sua nutricionista inteligente"}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {/* Badge de perfil */}
                            {healthProfile && (
                                <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10">
                                    {healthProfile.type === "student" ? (
                                        <User size={16} className="text-blue-400" />
                                    ) : (
                                        <GraduationCap size={16} className="text-purple-400" />
                                    )}
                                    <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                        {healthProfile.type === "student" ? "Aluno" : "Avaliador"}
                                    </span>
                                </div>
                            )}
                            {/* Search de Alunos (apenas para avaliadores) - para consulta rápida no chat profissional */}
                            {healthProfile?.type === "evaluator" && (
                                <div className="w-64">
                                    <StudentSearch
                                        userId={userId}
                                        students={evaluatorStudents}
                                        studentsInfo={evaluatorStudentsInfo}
                                        onStudentSelect={handleStudentSearchSelect}
                                        placeholder="Buscar aluno por nome..."
                                    />
                                </div>
                            )}
                            {/* Botão para trocar perfil */}
                            <button
                                onClick={handleOpenProfileSelector}
                                className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 group"
                                style={{ color: 'var(--text-secondary)' }}
                                title="Trocar perfil"
                            >
                                <User size={20} className="group-hover:scale-110 transition-transform duration-200" />
                            </button>
                            {/* Botão fechar */}
                            <button
                                onClick={onClose}
                                className="p-2.5 hover:bg-white/10 rounded-xl transition-all duration-200 hover:scale-110 active:scale-95 group"
                                style={{ color: 'var(--text-secondary)' }}
                            >
                                <X size={22} className="group-hover:rotate-90 transition-transform duration-200" />
                            </button>
                        </div>
                    </header>

                    {/* Tabs */}
                    <div className="relative flex border-b border-[var(--border-color)]/50 px-6 bg-[var(--bg-primary)]/50 backdrop-blur-sm">
                                                        <button
                                                            onClick={() => setActiveTab("today")}
                                                            className="px-5 py-3.5 font-semibold transition-all duration-300 relative group"
                                                            style={{
                                                                color: activeTab === "today" ? '#4ade80' : 'var(--text-secondary)'
                                                            }}
                                                        >
                                                            <span className="relative z-10 flex items-center gap-2">
                                                                <Calendar size={16} />
                                                                Hoje
                                                            </span>
                                                            {activeTab === "today" && (
                                                                <>
                                                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-t-full shadow-lg shadow-green-500/30" />
                                                                    <div className="absolute inset-0 bg-green-500/5 rounded-t-xl" />
                                                                </>
                                                            )}
                                                            {activeTab !== "today" && (
                                                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/5 rounded-t-xl transition-opacity duration-200" />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => setActiveTab("meal_plan")}
                                                            className="px-5 py-3.5 font-semibold transition-all duration-300 relative group"
                                                            style={{
                                                                color: activeTab === "meal_plan" ? '#4ade80' : 'var(--text-secondary)'
                                                            }}
                                                        >
                                                            <span className="relative z-10 flex items-center gap-2">
                                                                🍽️ Plano Alimentar
                                                            </span>
                                                            {activeTab === "meal_plan" && (
                                                                <>
                                                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-t-full shadow-lg shadow-green-500/30" />
                                                                    <div className="absolute inset-0 bg-green-500/5 rounded-t-xl" />
                                                                </>
                                                            )}
                                                            {activeTab !== "meal_plan" && (
                                                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/5 rounded-t-xl transition-opacity duration-200" />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => setActiveTab("summary")}
                                                            className="px-5 py-3.5 font-semibold transition-all duration-300 relative group"
                                                            style={{
                                                                color: activeTab === "summary" ? '#4ade80' : 'var(--text-secondary)'
                                                            }}
                                                        >
                                                            <span className="relative z-10 flex items-center gap-2">
                                                                <BarChart3 size={16} />
                                                                Resumo
                                                            </span>
                                                            {activeTab === "summary" && (
                                                                <>
                                                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-t-full shadow-lg shadow-green-500/30" />
                                                                    <div className="absolute inset-0 bg-green-500/5 rounded-t-xl" />
                                                                </>
                                                            )}
                                                            {activeTab !== "summary" && (
                                                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/5 rounded-t-xl transition-opacity duration-200" />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => setActiveTab("history")}
                                                            className="px-5 py-3.5 font-semibold transition-all duration-300 relative group"
                                                            style={{
                                                                color: activeTab === "history" ? '#4ade80' : 'var(--text-secondary)'
                                                            }}
                                                        >
                                                            <span className="relative z-10 flex items-center gap-2">
                                                                <History size={16} />
                                                                Histórico
                                                            </span>
                                                            {activeTab === "history" && (
                                                                <>
                                                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-t-full shadow-lg shadow-green-500/30" />
                                                                    <div className="absolute inset-0 bg-green-500/5 rounded-t-xl" />
                                                                </>
                                                            )}
                                                            {activeTab !== "history" && (
                                                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/5 rounded-t-xl transition-opacity duration-200" />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => setActiveTab("goals")}
                                                            className="px-5 py-3.5 font-semibold transition-all duration-300 relative group"
                                                            style={{
                                                                color: activeTab === "goals" ? '#4ade80' : 'var(--text-secondary)'
                                                            }}
                                                        >
                                                            <span className="relative z-10 flex items-center gap-2">
                                                                <Target size={16} />
                                                                Metas
                                                            </span>
                                                            {activeTab === "goals" && (
                                                                <>
                                                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-t-full shadow-lg shadow-green-500/30" />
                                                                    <div className="absolute inset-0 bg-green-500/5 rounded-t-xl" />
                                                                </>
                                                            )}
                                                            {activeTab !== "goals" && (
                                                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/5 rounded-t-xl transition-opacity duration-200" />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => setActiveTab("reminders")}
                                                            className="px-5 py-3.5 font-semibold transition-all duration-300 relative group"
                                                            style={{
                                                                color: activeTab === "reminders" ? '#4ade80' : 'var(--text-secondary)'
                                                            }}
                                                        >
                                                            <span className="relative z-10 flex items-center gap-2">
                                                                <Bell size={16} />
                                                                Lembretes
                                                            </span>
                                                            {activeTab === "reminders" && (
                                                                <>
                                                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-t-full shadow-lg shadow-green-500/30" />
                                                                    <div className="absolute inset-0 bg-green-500/5 rounded-t-xl" />
                                                                </>
                                                            )}
                                                            {activeTab !== "reminders" && (
                                                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/5 rounded-t-xl transition-opacity duration-200" />
                                                            )}
                                                        </button>
                                                        <button
                                                            onClick={() => {
                                                                setActiveTab("foods");
                                                                if (foods.length === 0) {
                                                                    loadFoods();
                                                                }
                                                            }}
                                                            className="px-5 py-3.5 font-semibold transition-all duration-300 relative group"
                                                            style={{
                                                                color: activeTab === "foods" ? '#4ade80' : 'var(--text-secondary)'
                                                            }}
                                                        >
                                                            <span className="relative z-10 flex items-center gap-2">
                                                                <Apple size={16} />
                                                                Alimentos
                                                            </span>
                                                            {activeTab === "foods" && (
                                                                <>
                                                                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-t-full shadow-lg shadow-green-500/30" />
                                                                    <div className="absolute inset-0 bg-green-500/5 rounded-t-xl" />
                                                                </>
                                                            )}
                                                            {activeTab !== "foods" && (
                                                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/5 rounded-t-xl transition-opacity duration-200" />
                                                            )}
                                                        </button>
                                                        {/* Aba de Vinculação (apenas para alunos) */}
                                                        {healthProfile?.type === "student" && (
                                                            <button
                                                                onClick={() => setActiveTab("link")}
                                                                className="px-5 py-3.5 font-semibold transition-all duration-300 relative group"
                                                                style={{
                                                                    color: activeTab === "link" ? '#4ade80' : 'var(--text-secondary)'
                                                                }}
                                                            >
                                                                <span className="relative z-10 flex items-center gap-2">
                                                                    <Link2 size={16} />
                                                                    Avaliador
                                                                </span>
                                                                {activeTab === "link" && (
                                                                    <>
                                                                        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-t-full shadow-lg shadow-green-500/30" />
                                                                        <div className="absolute inset-0 bg-green-500/5 rounded-t-xl" />
                                                                    </>
                                                                )}
                                                                {activeTab !== "link" && (
                                                                    <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/5 rounded-t-xl transition-opacity duration-200" />
                                                                )}
                                                            </button>
                                                        )}
                                                        {/* Aba Dashboard (apenas para avaliadores) */}
                                                        {healthProfile?.type === "evaluator" && !viewAsStudentId && (
                                                            <>
                                                                <button
                                                                    onClick={() => setActiveTab("dashboard")}
                                                                    className="px-5 py-3.5 font-semibold transition-all duration-300 relative group"
                                                                    style={{
                                                                        color: activeTab === "dashboard" ? '#4ade80' : 'var(--text-secondary)'
                                                                    }}
                                                                >
                                                                    <span className="relative z-10 flex items-center gap-2">
                                                                        <Users size={16} />
                                                                        Alunos
                                                                    </span>
                                                                    {activeTab === "dashboard" && (
                                                                        <>
                                                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-green-400 to-emerald-500 rounded-t-full shadow-lg shadow-green-500/30" />
                                                                            <div className="absolute inset-0 bg-green-500/5 rounded-t-xl" />
                                                                        </>
                                                                    )}
                                                                    {activeTab !== "dashboard" && activeTab !== "notifications" && (
                                                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/5 rounded-t-xl transition-opacity duration-200" />
                                                                    )}
                                                                </button>
                                                                <button
                                                                    onClick={() => setActiveTab("notifications")}
                                                                    className="px-5 py-3.5 font-semibold transition-all duration-300 relative group"
                                                                    style={{
                                                                        color: activeTab === "notifications" ? '#a855f7' : 'var(--text-secondary)'
                                                                    }}
                                                                >
                                                                    <span className="relative z-10 flex items-center gap-2">
                                                                        <Bell size={16} />
                                                                        Notificações
                                                                    </span>
                                                                    {activeTab === "notifications" && (
                                                                        <>
                                                                            <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-purple-400 to-purple-500 rounded-t-full shadow-lg shadow-purple-500/30" />
                                                                            <div className="absolute inset-0 bg-purple-500/5 rounded-t-xl" />
                                                                        </>
                                                                    )}
                                                                    {activeTab !== "notifications" && activeTab !== "dashboard" && (
                                                                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/5 rounded-t-xl transition-opacity duration-200" />
                                                                    )}
                                                                </button>
                                                            </>
                                                        )}
                    </div>

                    {/* Content */}
                    <main className="flex-1 overflow-y-auto p-6 relative">
                        {isLoading ? (
                            <div className="flex items-center justify-center h-full">
                                <LoadingFeedback 
                                    message="Carregando dados" 
                                    subMessage="Preparando informações de saúde"
                                    type="loading"
                                    size="large"
                                />
                            </div>
                        ) : activeTab === "today" ? (
                            <TodayTab
                                userId={userId}
                                viewAsStudentId={viewAsStudentId}
                                onAddMeal={() => {
                                    setShowAddMeal(true);
                                    setFormData(prev => ({ ...prev, date: new Date().toISOString().split('T')[0] }));
                                }}
                                onEditMeal={(meal) => {
                                    setActiveTab("meal_plan");
                                }}
                                onDeleteMeal={async (meal) => {
                                    if (!meal?.id) {
                                        console.error("[HealthMode] Meal sem ID para deletar");
                                        return;
                                    }
                                    
                                    // Confirmar exclusão
                                    if (!window.confirm(`Tem certeza que deseja excluir a refeição "${meal.name || 'esta refeição'}"?`)) {
                                        return;
                                    }
                                    
                                    try {
                                        const targetUserId = viewAsStudentId || userId;
                                        const response = await fetch(
                                            `${API_CONFIG.BASE_URL}/health/meals/${meal.id}?user_id=${targetUserId}`,
                                            { method: "DELETE" }
                                        );
                                        
                                        if (response.ok) {
                                            console.log("[HealthMode] Refeição deletada com sucesso");
                                            handleHealthUpdate();
                                        } else {
                                            const errorData = await response.json();
                                            console.error("[HealthMode] Erro ao deletar:", errorData);
                                            alert(errorData.detail || "Erro ao deletar refeição");
                                        }
                                    } catch (err) {
                                        console.error("[HealthMode] Erro ao deletar refeição:", err);
                                        alert("Erro ao conectar com o servidor");
                                    }
                                }}
                                onUpdate={0}
                                onOpenChat={handleOpenChat}
                                onUseFromPlan={(preset) => {
                                    // Preenche o formulário com dados do preset e abre o modal de adicionar
                                    setFormData({
                                        name: preset.name,
                                        food_name: preset.name,
                                        meal_type: preset.meal_type,
                                        calories: preset.total_calories || "",
                                        protein: preset.total_protein || "",
                                        carbs: preset.total_carbs || "",
                                        fats: preset.total_fats || "",
                                        grams: "100",
                                        portion_type: "porção",
                                        portion_quantity: "1",
                                        usePortion: false,
                                        notes: `📋 Do plano: ${preset.name}`,
                                        date: new Date().toISOString().split('T')[0],
                                        time: ""
                                    });
                                    setShowAddMeal(true);
                                }}
                            />
                        ) : activeTab === "meal_plan" ? (
                                <MealPlanTab
                                    userId={userId}
                                    viewAsStudentId={viewAsStudentId}
                                    onRefresh={handleHealthUpdate}
                                    onUseMeal={(preset) => {
                                        // Preenche o formulário com dados do preset
                                        setFormData({
                                            name: preset.name,
                                            food_name: preset.name,
                                            meal_type: preset.meal_type,
                                            calories: preset.total_calories || "",
                                            protein: preset.total_protein || "",
                                            carbs: preset.total_carbs || "",
                                            fats: preset.total_fats || "",
                                            grams: "100",
                                            portion_type: "porção",
                                            portion_quantity: "1",
                                            usePortion: false,
                                            notes: `📋 Do plano: ${preset.name}`,
                                            date: new Date().toISOString().split('T')[0],
                                            time: ""
                                        });
                                        setShowAddMeal(true);
                                    }}
                                />
                        ) : activeTab === "summary" ? (
                                <SummaryTab summary={summary} />
                        ) : activeTab === "goals" ? (
                            <GoalsTab
                                userId={userId}
                                viewAsStudentId={viewAsStudentId}
                                onUpdate={() => {
                                    loadData();
                                    loadGoals();
                                    setRefreshTrigger(prev => prev + 1);
                                }}
                            />
                        ) : activeTab === "history" ? (
                            <HistoryTab
                                isLoading={historyLoading}
                                historyData={historyData}
                                weightsData={weightsData}
                                selectedPeriod={historyPeriod}
                                onChangePeriod={(days) => {
                                    setHistoryPeriod(days);
                                    // Recarrega histórico para o novo período em background
                                    loadHistoryData();
                                    loadWeightsData();
                                }}
                                error={historyError}
                            />
                        ) : activeTab === "reminders" ? (
                            <RemindersTab />
                        ) : activeTab === "link" && healthProfile?.type === "student" ? (
                            <div className="max-w-2xl mx-auto">
                                <StudentLink
                                    onClose={null}
                                    onLinked={(evaluator) => {
                                        loadHealthProfile();
                                                }}
                                            />
                                        </div>
                        ) : activeTab === "notifications" && healthProfile?.type === "evaluator" ? (
                            <div className="h-full">
                                <NotificationPanel
                                    userId={userId}
                                    onClose={null}
                                />
                            </div>
                        ) : activeTab === "dashboard" && healthProfile?.type === "evaluator" ? (
                            <div className="h-full">
                                <EvaluatorDashboard
                                    evaluatorProfile={healthProfile}
                                    onSelectStudent={(studentId) => {
                                        // Não muda mais o chat - o avaliador sempre fica no chat profissional
                                        // O dashboard pode mostrar informações, mas o chat não muda
                                        console.log("[HealthMode] Aluno selecionado no dashboard (apenas referência):", studentId);
                                    }}
                                    selectedStudentId={null}
                                    onClose={null}
                                    onSwitchToStudent={async () => {
                                        try {
                                            const response = await fetch(`${API_CONFIG.BASE_URL}/health/profile`, {
                                                method: "POST",
                                                headers: {
                                                    "Content-Type": "application/json",
                                                },
                                                body: JSON.stringify({
                                                    type: "student",
                                                    user_id: userId
                                                })
                                            });
                                            
                                            const data = await response.json();
                                            if (data.success) {
                                                setHealthProfile(data.profile);
                                                setViewAsStudentId(null);
                                                setActiveTab("today");
                                                loadData();
                                                loadGoals();
                                            }
                                        } catch (e) {
                                            console.error("Erro ao trocar para perfil de aluno:", e);
                                        }
                                    }}
                                                    />
                                                </div>
                        ) : activeTab === "foods" ? (
                                <FoodsTab
                                    foods={foods}
                                    onRefresh={() => {
                                        loadFoods();
                                        handleHealthUpdate();
                                    }}
                                    onLoadFoods={loadFoods}
                                />
                        ) : null}
                    </main>
                </div>

                {/* Add Meal Modal - Global (aparece em qualquer aba) */}
                {showAddMeal && (
                    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={(e) => {
                        if (e.target === e.currentTarget) {
                            setShowAddMeal(false);
                            setShowFoodResults(false);
                        }
                    }}>
                        <div className="w-full max-w-md rounded-2xl p-6 border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }} onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>Nova Refeição</h2>
                                <button
                                    onClick={() => {
                                        setShowAddMeal(false);
                                        setShowFoodResults(false);
                                    }}
                                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                                    style={{ color: 'var(--text-secondary)' }}
                                >
                                    <X size={18} />
                                </button>
                            </div>
                            <div className="space-y-4">
                                {/* Food Search */}
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={foodSearchQuery}
                                        onChange={(e) => {
                                            const query = e.target.value;
                                            setFoodSearchQuery(query);
                                            setFormData({ ...formData, food_name: query });
                                            searchFoods(query);
                                        }}
                                        onFocus={() => {
                                            if (foodSearchResults.length > 0) {
                                                setShowFoodResults(true);
                                            }
                                        }}
                                        className="w-full px-3 py-2 rounded-lg border"
                                        style={{
                                            background: 'var(--bg-tertiary)',
                                            borderColor: 'var(--border-color)',
                                            color: 'var(--text-primary)'
                                        }}
                                        placeholder="Buscar alimento..."
                                    />
                                    {showFoodResults && foodSearchResults.length > 0 && (
                                        <div className="absolute z-10 w-full mt-1 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                            {foodSearchResults.map((food, idx) => (
                                                <button
                                                    key={idx}
                                                    type="button"
                                                    onClick={() => handleFoodSelect(food)}
                                                    className="w-full text-left px-4 py-2 hover:bg-white/5 transition-colors"
                                                    style={{ color: 'var(--text-primary)' }}
                                                >
                                                    <div className="font-medium">{food.name}</div>
                                                    <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                        {food.calories} kcal / 100g • P: {food.protein}g • C: {food.carbs}g • G: {food.fats}g
                                                    </div>
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Toggle entre Gramas e Porções */}
                                <div className="flex items-center gap-2 mb-2">
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, usePortion: false })}
                                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                                            !formData.usePortion
                                                ? "bg-green-500 text-white"
                                                : "bg-white/10 text-white/60 hover:bg-white/20"
                                        }`}
                                    >
                                        Gramas
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setFormData({ ...formData, usePortion: true })}
                                        className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
                                            formData.usePortion
                                                ? "bg-green-500 text-white"
                                                : "bg-white/10 text-white/60 hover:bg-white/20"
                                        }`}
                                    >
                                        Porções
                                    </button>
                                </div>

                                {/* Input de quantidade - Gramas ou Porções */}
                                {!formData.usePortion ? (
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={formData.grams}
                                            onChange={async (e) => {
                                                const grams = e.target.value;
                                                setFormData({ ...formData, grams, food_name: selectedFood?.name || formData.food_name });
                                                if ((selectedFood || formData.food_name) && grams && parseFloat(grams) > 0) {
                                                    await calculateNutrition(selectedFood?.name || formData.food_name, parseFloat(grams));
                                                }
                                            }}
                                            className="w-full px-3 py-2 rounded-lg border"
                                            style={{
                                                background: 'var(--bg-tertiary)',
                                                borderColor: 'var(--border-color)',
                                                color: 'var(--text-primary)',
                                                appearance: 'textfield'
                                            }}
                                            placeholder="Quantidade em gramas"
                                        />
                                        <style>{`
                                            input[type="number"]::-webkit-inner-spin-button,
                                            input[type="number"]::-webkit-outer-spin-button {
                                                -webkit-appearance: none;
                                                margin: 0;
                                            }
                                            input[type="number"] {
                                                -moz-appearance: textfield;
                                            }
                                        `}</style>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                        <select
                                            value={formData.portion_type}
                                            onChange={async (e) => {
                                                const portionType = e.target.value;
                                                setFormData({ ...formData, portion_type: portionType });
                                                if ((selectedFood || formData.food_name) && formData.portion_quantity && parseFloat(formData.portion_quantity) > 0) {
                                                    await calculateNutrition(
                                                        selectedFood?.name || formData.food_name,
                                                        null,
                                                        portionType,
                                                        parseFloat(formData.portion_quantity)
                                                    );
                                                }
                                            }}
                                            className="flex-1 px-3 py-2 rounded-lg border"
                                            style={{
                                                background: 'var(--bg-tertiary)',
                                                borderColor: 'var(--border-color)',
                                                color: 'var(--text-primary)'
                                            }}
                                        >
                                            <option value="fatia">Fatia</option>
                                            <option value="fatias">Fatiass</option>
                                            <option value="xícara">Xícara</option>
                                            <option value="xícaras">Xícaras</option>
                                            <option value="colher de sopa">Colher de Sopa</option>
                                            <option value="colheres de sopa">Colheres de Sopa</option>
                                            <option value="colher de chá">Colher de Chá</option>
                                            <option value="colheres de chá">Colheres de Chá</option>
                                            <option value="copo">Copo</option>
                                            <option value="copos">Copos</option>
                                            <option value="prato">Prato</option>
                                            <option value="pratos">Pratos</option>
                                            <option value="unidade">Unidade</option>
                                            <option value="unidades">Unidades</option>
                                            <option value="porção">Porção</option>
                                            <option value="porções">Porções</option>
                                        </select>
                                        <input
                                            type="number"
                                            value={formData.portion_quantity}
                                            onChange={async (e) => {
                                                const quantity = e.target.value;
                                                setFormData({ ...formData, portion_quantity: quantity });
                                                if ((selectedFood || formData.food_name) && quantity && parseFloat(quantity) > 0) {
                                                    await calculateNutrition(
                                                        selectedFood?.name || formData.food_name,
                                                        null,
                                                        formData.portion_type,
                                                        parseFloat(quantity)
                                                    );
                                                }
                                            }}
                                            className="w-24 px-3 py-2 rounded-lg border"
                                            style={{
                                                background: 'var(--bg-tertiary)',
                                                borderColor: 'var(--border-color)',
                                                color: 'var(--text-primary)',
                                                appearance: 'textfield'
                                            }}
                                            placeholder="Qtd"
                                            min="0.1"
                                            step="0.1"
                                        />
                                    </div>
                                )}

                                {/* Time picker */}
                                <div>
                                    <label className="block text-sm mb-1" style={{ color: 'var(--text-secondary)' }}>Horário</label>
                                    <input
                                        type="time"
                                        value={formData.time}
                                        onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                                        className="w-full px-3 py-2 rounded-lg border"
                                        style={{
                                            background: 'var(--bg-tertiary)',
                                            borderColor: 'var(--border-color)',
                                            color: 'var(--text-primary)'
                                        }}
                                    />
                                </div>

                                {/* Calculated nutrition (read-only) */}
                                {(formData.calories || formData.protein || formData.carbs || formData.fats) && (
                                    <div className="grid grid-cols-4 gap-2 p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                                        <div>
                                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Calorias</div>
                                            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                {formData.calories || "0"}
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Proteínas</div>
                                            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                {formData.protein || "0"}g
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Carboidratos</div>
                                            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                {formData.carbs || "0"}g
                                            </div>
                                        </div>
                                        <div>
                                            <div className="text-xs" style={{ color: 'var(--text-secondary)' }}>Gorduras</div>
                                            <div className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                {formData.fats || "0"}g
                                            </div>
                                        </div>
                                    </div>
                                )}

                                <textarea
                                    value={formData.notes}
                                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                    className="w-full px-3 py-2 rounded-lg border"
                                    style={{
                                        background: 'var(--bg-tertiary)',
                                        borderColor: 'var(--border-color)',
                                        color: 'var(--text-primary)'
                                    }}
                                    placeholder="Observações (opcional)"
                                    rows={2}
                                />
                                <button
                                    onClick={handleAddMeal}
                                    disabled={
                                        !formData.food_name.trim() || 
                                        (!formData.usePortion && (!formData.grams || parseFloat(formData.grams) <= 0)) ||
                                        (formData.usePortion && (!formData.portion_quantity || parseFloat(formData.portion_quantity) <= 0))
                                    }
                                    className="w-full py-2 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-lg transition-all disabled:opacity-50"
                                >
                                    Registrar Refeição
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Chat Sidebar */}
                <div className="w-[500px] border-l border-[var(--border-color)] bg-[var(--bg-secondary)] flex flex-col z-20 shadow-xl h-full">
                    {/* Avaliadores sempre usam EvaluatorChat (chat profissional) */}
                    {/* Alunos usam HealthChat normal */}
                    {healthProfile?.type === "evaluator" ? (
                        <EvaluatorChat 
                            isOpen={true} 
                            onClose={() => {}} 
                            userId={userId} 
                            onUpdate={handleHealthUpdate}
                            initialMessage={chatMessageToSend}
                        />
                    ) : (
                    <HealthChat 
                        isOpen={true} 
                        onClose={() => {}} 
                        userId={userId} 
                            viewAsStudentId={null}
                            studentName={null}
                        onUpdate={handleHealthUpdate}
                        initialMessage={chatMessageToSend}
                    />
                    )}
                </div>
            </div>
        </div>
    );
};

// Add CSS animations
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(20px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
if (!document.head.querySelector('style[data-health-animations]')) {
    style.setAttribute('data-health-animations', 'true');
    document.head.appendChild(style);
}

export default HealthMode;
