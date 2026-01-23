import React, { createContext, useContext, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(false); // SEMPRE false - nunca bloquear UI
    const { t } = useTranslation();

    useEffect(() => {
        let isMounted = true;

        // Carregar Firebase de forma LAZY para não bloquear o startup
        // Usar requestIdleCallback para não interferir no render inicial
        const initAuth = () => {
            import('@/lib/firebase').then(({ onAuthChange, getUserProfile, auth }) => {
                if (!isMounted) return;

                // Verificar cache local imediatamente (muito rápido)
                if (auth?.currentUser) {
                    console.log('[AuthContext] User found in cache:', auth.currentUser.uid);
                    setUser(auth.currentUser);
                    // Carregar perfil em background (não bloqueia)
                    getUserProfile(auth.currentUser.uid)
                        .then(profile => {
                            if (isMounted) {
                                console.log('[AuthContext] Profile loaded:', profile ? 'Found' : 'Not found');
                                setProfile(profile);
                            }
                        })
                        .catch((err) => {
                            console.error('[AuthContext] Error loading profile:', err);
                        });
                } else {
                    console.log('[AuthContext] No user in cache');
                }

                // Escutar mudanças de auth (não bloqueia render)
                const unsubscribe = onAuthChange(async (firebaseUser) => {
                    if (!isMounted) return;
                    
                    console.log('[AuthContext] Auth state changed:', firebaseUser ? `User: ${firebaseUser.uid}` : 'No user');
                    setUser(firebaseUser);
                    
                    if (firebaseUser) {
                        // Carregar perfil em background
                        getUserProfile(firebaseUser.uid)
                            .then(profile => {
                                if (isMounted) {
                                    console.log('[AuthContext] Profile loaded from Firestore:', profile ? 'Found' : 'Not found');
                                    setProfile(profile);
                                }
                            })
                            .catch((err) => {
                                console.error('[AuthContext] Error loading profile from Firestore:', err);
                            });
                    } else {
                        setProfile(null);
                    }
                });

                return () => {
                    if (unsubscribe) unsubscribe();
                };
            }).catch(err => {
                console.error('[AuthContext] Erro ao carregar Firebase:', err);
            });
        };

        // Usar requestIdleCallback se disponível (melhor performance)
        // Senão, usar setTimeout com delay mínimo
        if (typeof requestIdleCallback !== 'undefined') {
            requestIdleCallback(initAuth, { timeout: 100 });
        } else {
            setTimeout(initAuth, 0);
        }

        return () => {
            isMounted = false;
        };
    }, []);

    const logout = async () => {
        try {
            const { logout: firebaseLogout } = await import('@/lib/firebase');
            const result = await firebaseLogout();
            if (result.success) {
                setUser(null);
                setProfile(null);
            }
            return result;
        } catch (error) {
            console.error('[AuthContext] Erro no logout:', error);
            return { success: false, error: error.message };
        }
    };

    // SEMPRE renderizar children - nunca mostrar loading screen
    return (
        <AuthContext.Provider value={{ user, profile, loading, logout }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
