import { useState, useEffect, useCallback, useRef } from "react";
import { API_CONFIG } from "../config/api";
import { useModalContext } from "../contexts/ModalContext";

/**
 * Hook customizado para gerenciar dados do Health Mode
 * Centraliza toda a lógica de estado e requisições
 */
export function useHealthData(userId, viewAsStudentId = null) {
    const { showAlert } = useModalContext();
    
    // Estados principais
    const [meals, setMeals] = useState([]);
    const [summary, setSummary] = useState({
        total_calories: 0,
        total_protein: 0,
        total_carbs: 0,
        total_fats: 0,
        meals_count: 0,
        remaining_calories: 0,
        goals: {}
    });
    const [goals, setGoals] = useState({});
    const [foods, setFoods] = useState([]);
    const [healthProfile, setHealthProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [loadingProfile, setLoadingProfile] = useState(true);
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    // Histórico (pré-carregado em segundo plano)
    const [historyData, setHistoryData] = useState([]);
    const [weightsData, setWeightsData] = useState([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyError, setHistoryError] = useState(null);
    const [historyPeriod, setHistoryPeriod] = useState(7); // 7, 30, 90 dias

    // Carregar perfil de saúde
    const loadHealthProfile = useCallback(async () => {
        try {
            setLoadingProfile(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}/health/profile?user_id=${userId}`);
            const data = await response.json();
            
            if (data.success && data.profile) {
                setHealthProfile(data.profile);
            } else {
                // Criar perfil padrão se não existir
                const createResponse = await fetch(`${API_CONFIG.BASE_URL}/health/profile`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        type: "student",
                        user_id: userId
                    })
                });
                const createData = await createResponse.json();
                if (createData.success) {
                    setHealthProfile(createData.profile);
                }
            }
        } catch (err) {
            console.error("[HEALTH] Erro ao carregar perfil:", err);
        } finally {
            setLoadingProfile(false);
        }
    }, [userId]);

    // Carregar dados principais - OTIMIZADO: carrega em paralelo
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            const viewAsParam = viewAsStudentId ? `&view_as=${viewAsStudentId}` : '';
            
            // Carregar meals e summary em PARALELO (Promise.all)
            const [mealsRes, summaryRes] = await Promise.all([
                fetch(`${API_CONFIG.BASE_URL}/health/meals?user_id=${userId}${viewAsParam}&limit=50`),
                fetch(`${API_CONFIG.BASE_URL}/health/summary?user_id=${userId}${viewAsParam}`)
            ]);
            
            const [mealsData, summaryData] = await Promise.all([
                mealsRes.json(),
                summaryRes.json()
            ]);
            
            if (mealsData.success) {
                setMeals(mealsData.meals || []);
            }
            
            if (summaryData.success) {
                setSummary(summaryData.summary || {});
            }
        } catch (e) {
            console.error("[HEALTH] Error loading data:", e);
            showAlert("Erro ao carregar dados", "error");
        } finally {
            setIsLoading(false);
        }
    }, [userId, viewAsStudentId, showAlert]);

    // Carregar metas
    const loadGoals = useCallback(async () => {
        try {
            const viewAsParam = viewAsStudentId ? `&view_as=${viewAsStudentId}` : '';
            const res = await fetch(`${API_CONFIG.BASE_URL}/health/goals?user_id=${userId}${viewAsParam}`);
            const data = await res.json();
            if (data.success) {
                setGoals(data.goals || {});
            }
        } catch (e) {
            console.error("[HEALTH] Error loading goals:", e);
        }
    }, [userId, viewAsStudentId]);

    // Carregar histórico (calorias/macros) - usado pelo HistoryTab
    const loadHistoryData = useCallback(async () => {
        // Não carregar se não tiver userId válido
        if (!userId) return;
        
        try {
            setHistoryLoading(true);
            setHistoryError(null);

            const today = new Date();
            const startDate = new Date(today);
            startDate.setDate(startDate.getDate() - historyPeriod);

            const start = startDate.toISOString().split("T")[0];
            const end = today.toISOString().split("T")[0];

            // Usar view_as como parâmetro (não substituir userId)
            const viewAsParam = viewAsStudentId ? `&view_as=${viewAsStudentId}` : '';

            const response = await fetch(
                `${API_CONFIG.BASE_URL}/health/history?user_id=${userId}&start=${start}&end=${end}${viewAsParam}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();

            if (data.success) {
                setHistoryData(data.summaries || []);
            } else {
                setHistoryError(data.error || "Erro ao carregar histórico");
            }
        } catch (err) {
            console.error("[HEALTH] Erro ao carregar histórico:", err);
            setHistoryError("Erro ao carregar histórico");
        } finally {
            setHistoryLoading(false);
        }
    }, [userId, viewAsStudentId, historyPeriod]);

    // Carregar pesos históricos
    const loadWeightsData = useCallback(async () => {
        // Não carregar se não tiver userId válido
        if (!userId) return;
        
        try {
            // Usar view_as como parâmetro (não substituir userId)
            const viewAsParam = viewAsStudentId ? `&view_as=${viewAsStudentId}` : '';
            const response = await fetch(
                `${API_CONFIG.BASE_URL}/health/weights?user_id=${userId}&limit=100${viewAsParam}`
            );
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            
            const data = await response.json();

            if (data.success) {
                setWeightsData(data.weights || []);
            }
        } catch (err) {
            console.error("[HEALTH] Erro ao carregar pesos:", err);
        }
    }, [userId, viewAsStudentId]);

    // Pré-carregar histórico em segundo plano - ADIADO: só depois dos dados principais
    // Usar useRef para evitar loops infinitos
    const historyLoadedRef = useRef(false);
    const lastUserIdRef = useRef(null);
    const lastViewAsRef = useRef(null);
    
    useEffect(() => {
        // Resetar flag se userId ou viewAsStudentId mudou
        if (lastUserIdRef.current !== userId || lastViewAsRef.current !== viewAsStudentId) {
            historyLoadedRef.current = false;
            lastUserIdRef.current = userId;
            lastViewAsRef.current = viewAsStudentId;
        }
        
        // Só carregar histórico se:
        // 1. userId existe
        // 2. healthProfile existe (perfil carregado)
        // 3. Não está carregando dados principais (para não competir)
        // 4. Ainda não carregou histórico para esta combinação de userId/viewAsStudentId
        if (!userId || !healthProfile || isLoading || historyLoadedRef.current) return;
        
        // Adiar carregamento de histórico para não bloquear carregamento inicial
        const timer = setTimeout(() => {
            loadHistoryData();
            loadWeightsData();
            historyLoadedRef.current = true;
        }, 1500); // 1.5 segundos de delay para garantir que dados principais terminaram
        
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, viewAsStudentId, healthProfile, isLoading]); // Removido loadHistoryData, loadWeightsData e historyPeriod das deps
    
    // Carregar histórico quando historyPeriod mudar (se já tiver carregado antes)
    useEffect(() => {
        if (!userId || !healthProfile || !historyLoadedRef.current) return;
        
        // Se o período mudou, recarregar histórico
        const timer = setTimeout(() => {
            loadHistoryData();
        }, 500);
        
        return () => clearTimeout(timer);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [historyPeriod]); // Não incluir loadHistoryData nas deps para evitar loops

    // Carregar alimentos
    const loadFoods = useCallback(async () => {
        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/health/foods/search?query=&limit=100`);
            const data = await res.json();
            if (data.success) {
                setFoods(data.foods || []);
            }
        } catch (e) {
            console.error("[HEALTH] Error loading foods:", e);
        }
    }, []);

    // Buscar alimentos
    const searchFoods = useCallback(async (query) => {
        if (!query || query.length < 1) {
            loadFoods();
            return;
        }

        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/health/foods/search?query=${encodeURIComponent(query)}&limit=50`);
            const data = await res.json();
            if (data.success) {
                setFoods(data.foods || []);
            }
        } catch (e) {
            console.error("[HEALTH] Error searching foods:", e);
        }
    }, [loadFoods]);

    // Atualizar tudo
    const refresh = useCallback(() => {
        loadData();
        loadGoals();
        setRefreshTrigger(prev => prev + 1);
    }, [loadData, loadGoals]);

    // Não carregar automaticamente - deixar o componente controlar

    return {
        // Estados
        meals,
        summary,
        goals,
        foods,
        healthProfile,
        isLoading,
        loadingProfile,
        refreshTrigger,
        historyData,
        weightsData,
        historyLoading,
        historyError,
        historyPeriod,
        
        // Setters
        setMeals,
        setSummary,
        setGoals,
        setFoods,
        setHealthProfile,
        setHistoryPeriod,
        
        // Funções
        loadData,
        loadGoals,
        loadFoods,
        searchFoods,
        loadHealthProfile,
        loadHistoryData,
        loadWeightsData,
        refresh
    };
}
