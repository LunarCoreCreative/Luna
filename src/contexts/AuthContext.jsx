/**
 * Luna Auth Context
 * =================
 * Gerencia o estado de autenticação em toda a aplicação.
 */

import { createContext, useContext, useState, useEffect } from 'react';
import { auth, onAuthChange, getUserProfile, updateUserProfile, logout as firebaseLogout } from '../firebase';
import { API_CONFIG } from '../config/api';

// =============================================================================
// CONTEXTO
// =============================================================================

const AuthContext = createContext(null);

// =============================================================================
// PROVIDER
// =============================================================================

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isCreator, setIsCreator] = useState(false);
    
    // Health Profile State
    const [healthProfile, setHealthProfile] = useState(null);
    const [loadingHealthProfile, setLoadingHealthProfile] = useState(false);

    // NEW: Sistema de Energia & Planos
    const [plan, setPlan] = useState('spark'); // 'spark' | 'nexus' | 'eclipse'
    const [energy, setEnergy] = useState({
        current: 50,
        max: 50,
        nextRefill: null // Timestamp em ms para recarga (apenas se zerar)
    });

    // UID do criador - IMUTÁVEL
    const CREATOR_UID = "aKp1czWVMqWQdJ9nAIcIKgxKNu92";

    // =========================================================================
    // ENERGY SYSTEM LOGIC (COOLDOWN MODE)
    // =========================================================================

    const checkCooldown = () => {
        const stored = localStorage.getItem('luna_energy_local');
        let localData = stored ? JSON.parse(stored) : { current: 50, max: 50, nextRefill: null };
        const now = Date.now();

        // Se estava zerado e o tempo de refill passou
        if (localData.current <= 0 && localData.nextRefill && now >= localData.nextRefill) {
            localData = { current: 50, max: 50, nextRefill: null };
            console.log("[ENERGY] Cooldown acabou! Energia recarregada.");
        }
        // Se ainda está no periodo de espera
        else if (localData.current <= 0 && localData.nextRefill) {
            console.log("[ENERGY] Ainda em cooldown. Faltam:", (localData.nextRefill - now) / 1000 / 60, "minutos");
        }

        setEnergy(localData);
        localStorage.setItem('luna_energy_local', JSON.stringify(localData));
    };

    // =========================================================================
    // HEALTH PROFILE FUNCTIONS
    // =========================================================================

    const loadHealthProfile = async (userId) => {
        if (!userId) return;
        
        try {
            setLoadingHealthProfile(true);
            const response = await fetch(`${API_CONFIG.BASE_URL}/health/profile?user_id=${userId}`);
            const data = await response.json();
            
            if (data.success && data.profile) {
                setHealthProfile(data.profile);
            } else {
                setHealthProfile(null);
            }
        } catch (error) {
            console.error("[AUTH] Erro ao carregar perfil de saúde:", error);
            setHealthProfile(null);
        } finally {
            setLoadingHealthProfile(false);
        }
    };

    useEffect(() => {
        const unsubscribe = onAuthChange(async (firebaseUser) => {
            if (firebaseUser) {
                setUser(firebaseUser);

                // ===== LOG DO UID - COPIE ESTE VALOR! =====
                console.log("========================================");
                console.log("[AUTH] UID:", firebaseUser.uid);
                console.log("[AUTH] Email:", firebaseUser.email);
                console.log("========================================");

                // Buscar perfil do Firestore
                const userProfile = await getUserProfile(firebaseUser.uid);
                setProfile(userProfile);

                // Carregar ou Inicializar Plano/Energia do perfil
                if (userProfile?.plan) setPlan(userProfile.plan);


                // Se for plano pago, energia visualmente infinita
                if (['nexus', 'eclipse'].includes(userProfile?.plan)) {
                    setEnergy({ current: 9999, max: 9999, nextRefill: null });
                } else {
                    // Lógica de Cooldown para Spark (Check Inicial)
                    checkCooldown();
                }

                // Verificar se é o criador
                setIsCreator(CREATOR_UID ? firebaseUser.uid === CREATOR_UID : false);

                // Se for criador, auto-upgrade para Eclipse (Tier Máximo para testes)
                if ((CREATOR_UID ? firebaseUser.uid === CREATOR_UID : false) && userProfile?.plan !== 'eclipse') {
                    setPlan('eclipse');
                    updateUserProfile(firebaseUser.uid, { plan: 'eclipse' });
                }

                console.log("[AUTH] Usuário autenticado:", firebaseUser.email);

                // ===== CARREGAR PERFIL DE SAÚDE =====
                await loadHealthProfile(firebaseUser.uid);

                // ===== LUNA LINK: Conectar ao servidor cloud =====
                // Só funciona em ambiente Electron (app desktop)
                if (typeof window !== 'undefined' && window.electron?.lunaLink) {
                    try {
                        const idToken = await firebaseUser.getIdToken();
                        window.electron.lunaLink.connect(idToken);
                        console.log("[AUTH] Luna Link connection requested.");
                    } catch (e) {
                        console.warn("[AUTH] Could not connect Luna Link:", e.message);
                    }
                }
            } else {
                setUser(null);
                setProfile(null);
                setHealthProfile(null);
                setIsCreator(false);
                // Reset para defaults anônimos se necessário, ou manter estado local
                setPlan('spark');
                checkCooldown(); // Verifica cooldown do usuário anônimo

                // Disconnect Luna Link when logged out
                if (typeof window !== 'undefined' && window.electron?.lunaLink) {
                    window.electron.lunaLink.disconnect();
                }
            }
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const updateHealthProfile = async (type) => {
        if (!user) return { success: false, error: "Usuário não autenticado" };
        
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/health/profile`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ type })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Recarregar perfil atualizado
                await loadHealthProfile(user.uid);
                return { success: true, profile: data.profile };
            } else {
                return { success: false, error: data.error || "Erro ao atualizar perfil" };
            }
        } catch (error) {
            console.error("[AUTH] Erro ao atualizar perfil de saúde:", error);
            return { success: false, error: error.message };
        }
    };

    const linkToEvaluator = async (code) => {
        if (!user) return { success: false, error: "Usuário não autenticado" };
        
        try {
            const response = await fetch(`${API_CONFIG.BASE_URL}/health/profile/link`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ code, user_id: user.uid })
            });
            
            const data = await response.json();
            
            if (data.success) {
                // Recarregar perfil atualizado
                await loadHealthProfile(user.uid);
                return { success: true, evaluator: data.evaluator };
            } else {
                return { success: false, error: data.error || "Erro ao vincular ao avaliador" };
            }
        } catch (error) {
            console.error("[AUTH] Erro ao vincular ao avaliador:", error);
            return { success: false, error: error.message };
        }
    };

    const logout = async () => {
        try {
            await firebaseLogout();
            setUser(null);
            setProfile(null);
            setHealthProfile(null);
            setIsCreator(false);
            setPlan('spark');
            localStorage.removeItem('luna_energy_local'); // Limpa cache local ao sair
        } catch (error) {
            console.error("[AUTH] Erro no logout:", error);
        }
    };

    const updateProfile = async (updates) => {
        if (!user) return false;
        const success = await updateUserProfile(user.uid, updates);
        if (success) {
            // Atualizar estado local do perfil
            setProfile(prev => ({ ...prev, ...updates }));
            return true;
        }
        return false;
    };

    // =========================================================================
    // ENERGY SYSTEM LOGIC
    // =========================================================================

    const consumeEnergy = (cost) => {
        if (plan === 'nexus' || plan === 'eclipse') return true; // Infinito

        // Verificar cooldown
        checkCooldown(); // Atualiza estado antes de checar

        if (energy.current >= cost) {
            let newCurrent = energy.current - cost;
            let nextRefill = energy.nextRefill;

            // Se zerou, ativa cooldown de 3 horas
            if (newCurrent <= 0) {
                newCurrent = 0;
                // 3 horas = 3 * 60 * 60 * 1000 ms = 10800000 ms
                nextRefill = Date.now() + 10800000;
                console.log("[ENERGY] Energia esgotada! Iniciando cooldown de 3h.");
            }

            const newState = { ...energy, current: newCurrent, nextRefill };
            setEnergy(newState);
            localStorage.setItem('luna_energy_local', JSON.stringify(newState));
            return true;
        }

        return false;
    };

    const upgradePlan = async (newPlan = 'nexus') => {
        setPlan(newPlan);
        setEnergy({ current: 9999, max: 9999, nextRefill: null });
        if (user) {
            await updateUserProfile(user.uid, { plan: newPlan });
        }
        return true;
    };

    const createCheckout = async (planType) => {
        if (!user) return { error: "Usuário não autenticado" };

        try {
            // Pegar o token de ID do Firebase para autenticar no backend
            const token = await user.getIdToken();

            const response = await fetch("http://localhost:8001/payments/create-checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ token, plan_type: planType })
            });

            const data = await response.json();
            return data;
        } catch (error) {
            console.error("[AUTH] Erro ao criar checkout:", error);
            return { error: error.message };
        }
    };

    const syncPlan = async () => {
        if (!user) return { success: false, error: "Usuário não autenticado" };

        try {
            const token = await user.getIdToken();
            const response = await fetch(`http://localhost:8001/payments/sync?token=${token}`);
            const data = await response.json();

            if (data.success && data.plan) {
                setPlan(data.plan);
                // Forçar recarga de energia se for premium
                if (['nexus', 'eclipse'].includes(data.plan)) {
                    setEnergy({ current: 9999, max: 9999, nextRefill: null });
                }
            }
            return data;
        } catch (error) {
            console.error("[AUTH] Erro ao sincronizar plano:", error);
            return { success: false, error: error.message };
        }
    };

    const value = {
        user,
        profile,
        loading,
        isCreator,
        isAuthenticated: !!user,
        logout,
        updateProfile,
        // Energy & Plans
        plan,
        energy,
        consumeEnergy,
        upgradePlan,
        createCheckout,
        syncPlan,
        // Health Profile
        healthProfile,
        loadingHealthProfile,
        loadHealthProfile,
        updateHealthProfile,
        linkToEvaluator
    };

    return (
        <AuthContext.Provider value={value}>
            {children}
        </AuthContext.Provider>
    );
};

// =============================================================================
// HOOK
// =============================================================================

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth deve ser usado dentro de AuthProvider');
    }
    return context;
};

export default AuthContext;
