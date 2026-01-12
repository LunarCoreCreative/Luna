import { useState, useEffect, useRef } from "react";

/**
 * Hook para pré-carregar componentes em segundo plano
 * Carrega tudo gradualmente sem bloquear a UI
 */
export function usePreloader() {
    const [loadingProgress, setLoadingProgress] = useState({
        current: "",
        completed: [],
        total: 0,
        loaded: 0
    });
    const [isPreloading, setIsPreloading] = useState(true);
    const preloadQueueRef = useRef([]);
    const loadedRef = useRef(new Set());

    useEffect(() => {
        // Lista de componentes para pré-carregar
        const componentsToPreload = [
            { name: "Canvas", import: () => import("../components/Canvas") },
            { name: "IDE", import: () => import("../components/ide/IDEView") },
            { name: "Luna Health", import: () => import("../components/health") },
            { name: "Health Chat", import: () => import("../components/health/HealthChat") },
            { name: "Today Tab", import: () => import("../components/health/TodayTab") },
            { name: "Goals Tab", import: () => import("../components/health/GoalsTab") },
            { name: "History Tab", import: () => import("../components/health/HistoryTab") },
            { name: "Reminders Tab", import: () => import("../components/health/RemindersTab") },
            { name: "Profile Selector", import: () => import("../components/health/ProfileSelector") },
            { name: "Evaluator Dashboard", import: () => import("../components/health/EvaluatorDashboard") },
            { name: "Student Link", import: () => import("../components/health/StudentLink") },
            { name: "Meals Tab", import: () => import("../components/health/tabs/MealsTab") },
            { name: "Summary Tab", import: () => import("../components/health/tabs/SummaryTab") },
            { name: "Foods Tab", import: () => import("../components/health/tabs/FoodsTab") },
        ];

        setLoadingProgress(prev => ({
            ...prev,
            total: componentsToPreload.length
        }));

        // Função para carregar um componente
        const loadComponent = async (component) => {
            if (loadedRef.current.has(component.name)) {
                return;
            }

            setLoadingProgress(prev => ({
                ...prev,
                current: component.name
            }));

            try {
                await component.import();
                loadedRef.current.add(component.name);
                
                setLoadingProgress(prev => ({
                    ...prev,
                    loaded: prev.loaded + 1,
                    completed: [...prev.completed, component.name],
                    current: ""
                }));
            } catch (error) {
                console.error(`[PRELOADER] Erro ao carregar ${component.name}:`, error);
                setLoadingProgress(prev => ({
                    ...prev,
                    loaded: prev.loaded + 1,
                    current: ""
                }));
            }
        };

        // Função para processar a fila usando requestIdleCallback
        const processQueue = () => {
            if (preloadQueueRef.current.length === 0) {
                setIsPreloading(false);
                return;
            }

            const component = preloadQueueRef.current.shift();
            loadComponent(component).then(() => {
                // Usa requestIdleCallback para não bloquear a UI
                if (typeof window !== 'undefined' && window.requestIdleCallback) {
                    window.requestIdleCallback(processQueue, { timeout: 1000 });
                } else {
                    // Fallback para navegadores sem requestIdleCallback
                    setTimeout(processQueue, 50);
                }
            });
        };

        // Inicia o pré-carregamento após um pequeno delay
        const startPreloading = () => {
            preloadQueueRef.current = [...componentsToPreload];
            
            // Aguarda um pouco para não bloquear o carregamento inicial
            setTimeout(() => {
                if (typeof window !== 'undefined' && window.requestIdleCallback) {
                    window.requestIdleCallback(processQueue, { timeout: 1000 });
                } else {
                    setTimeout(processQueue, 100);
                }
            }, 500);
        };

        startPreloading();
    }, []);

    return {
        loadingProgress,
        isPreloading,
        progress: loadingProgress.total > 0 
            ? Math.round((loadingProgress.loaded / loadingProgress.total) * 100) 
            : 0
    };
}
