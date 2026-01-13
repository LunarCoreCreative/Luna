import { useState, useEffect, useCallback, useRef } from "react";
import { API_CONFIG } from "../config/api";
import { useModalContext } from "../contexts/ModalContext";

/**
 * Função helper para fazer fetch com retry automático em caso de erro de rede
 */
async function fetchWithRetry(url, options = {}, maxRetries = 2) {
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        try {
            const response = await fetch(url, options);
            // Se a resposta não for ok, não tenta novar (erros do servidor não devem ser retentados)
            if (!response.ok && response.status >= 500 && attempt < maxRetries) {
                // Erros 5xx podem ser retentados
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Backoff exponencial simples
                continue;
            }
            return response;
        } catch (error) {
            // Erros de rede (fetch failed, timeout, etc) devem ser retentados
            if (attempt < maxRetries && (
                error.name === 'TypeError' || // Network error
                error.message?.includes('fetch') ||
                error.message?.includes('network') ||
                error.message?.includes('Failed to fetch')
            )) {
                await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1))); // Backoff exponencial simples
                continue;
            }
            throw error;
        }
    }
}

/**
 * Hook customizado para gerenciar dados do Health Mode
 * Centraliza toda a lógica de estado e requisições
 */
export function useHealthData(userId) {
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
            const response = await fetchWithRetry(`${API_CONFIG.BASE_URL}/health/profile?user_id=${userId}`);
            const data = await response.json();
            
            if (data.success && data.profile) {
                setHealthProfile(data.profile);
            } else {
                // Criar perfil padrão se não existir
                const createResponse = await fetchWithRetry(`${API_CONFIG.BASE_URL}/health/profile`, {
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
            const isNetworkError = err.name === 'TypeError' || err.message?.includes('fetch') || err.message?.includes('network');
            const errorMessage = isNetworkError
                ? "Erro de conexão. Verifique sua internet e tente novamente."
                : "Erro ao carregar perfil de saúde. Por favor, tente novamente mais tarde.";
            showAlert(errorMessage, "error");
        } finally {
            setLoadingProfile(false);
        }
    }, [userId, showAlert]);

    // Carregar dados principais - OTIMIZADO: carrega em paralelo
    const loadData = useCallback(async () => {
        setIsLoading(true);
        try {
            // Carregar meals e summary em PARALELO (Promise.all)
            const [mealsRes, summaryRes] = await Promise.all([
                fetchWithRetry(`${API_CONFIG.BASE_URL}/health/meals?user_id=${userId}&limit=50`),
                fetchWithRetry(`${API_CONFIG.BASE_URL}/health/summary?user_id=${userId}`)
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
            
            // Verificar se algum request falhou
            if (!mealsData.success || !summaryData.success) {
                const errors = [];
                if (!mealsData.success) errors.push("refeições");
                if (!summaryData.success) errors.push("resumo nutricional");
                showAlert(`Não foi possível carregar ${errors.join(" e ")}. Por favor, tente novamente.`, "error");
            }
        } catch (e) {
            console.error("[HEALTH] Error loading data:", e);
            const isNetworkError = e.name === 'TypeError' || e.message?.includes('fetch') || e.message?.includes('network');
            const errorMessage = isNetworkError
                ? "Erro de conexão. Verifique sua internet e tente novamente."
                : "Erro ao carregar dados. Por favor, tente novamente mais tarde.";
            showAlert(errorMessage, "error");
        } finally {
            setIsLoading(false);
        }
    }, [userId, showAlert]);

    // Carregar metas
    const loadGoals = useCallback(async () => {
        try {
            const res = await fetch(`${API_CONFIG.BASE_URL}/health/goals?user_id=${userId}`);
            const data = await res.json();
            if (data.success) {
                setGoals(data.goals || {});
            } else {
                console.warn("[HEALTH] Goals request não teve sucesso:", data);
                // Não mostra alert para goals pois podem não existir ainda (é normal)
            }
        } catch (e) {
            console.error("[HEALTH] Error loading goals:", e);
            // Goals não são críticos, então apenas logamos o erro
            // O usuário ainda pode usar a aplicação sem goals
        }
    }, [userId]);

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

            const response = await fetch(
                `${API_CONFIG.BASE_URL}/health/history?user_id=${userId}&start=${start}&end=${end}`
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
    }, [userId, historyPeriod]);

    // Carregar pesos históricos
    const loadWeightsData = useCallback(async () => {
        // Não carregar se não tiver userId válido
        if (!userId) return;
        
        try {
            const response = await fetch(
                `${API_CONFIG.BASE_URL}/health/weights?user_id=${userId}&limit=100`
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
    }, [userId]);

    // Pré-carregar histórico em segundo plano - só depois dos dados principais
    // Usar useRef para evitar loops infinitos
    const historyLoadedRef = useRef(false);
    const lastUserIdRef = useRef(null);
    
    useEffect(() => {
        // Resetar flag se userId mudou
        if (lastUserIdRef.current !== userId) {
            historyLoadedRef.current = false;
            lastUserIdRef.current = userId;
        }
        
        // Só carregar histórico se:
        // 1. userId existe
        // 2. healthProfile existe (perfil carregado)
        // 3. Não está carregando dados principais (para não competir)
        // 4. Ainda não carregou histórico para este userId
        if (!userId || !healthProfile || isLoading || historyLoadedRef.current) return;
        
        // Carregar histórico assim que dados principais terminarem (sem delay artificial)
        // O histórico é carregado em background e não bloqueia a UI
        loadHistoryData();
        loadWeightsData();
        historyLoadedRef.current = true;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userId, healthProfile, isLoading]); // Removido loadHistoryData, loadWeightsData e historyPeriod das deps
    
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
        setRefreshTrigger,
        
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
