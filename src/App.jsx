import React from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { AuthProvider } from '@/contexts/AuthContext';
import { NavigationProvider } from '@/contexts/NavigationContext';
import { ProtectedRoute, PublicRoute, TermsRoute } from '@/components/auth/RouteGuard';
import LanguageSelector from '@/components/ui/LanguageSelector';
import UpdateNotification from '@/components/UpdateNotification';

// Import direto - páginas são pequenas, não precisam de lazy loading
import LoginPage from '@/modules/Auth/pages/LoginPage';
import RegisterPage from '@/modules/Auth/pages/RegisterPage';
import ForgotPasswordPage from '@/modules/Auth/pages/ForgotPasswordPage';
import AppContainer from '@/components/layout/AppContainer';
import TermsOfServicePage from '@/modules/Auth/pages/TermsOfServicePage';

const AnimatedRoutes = () => {
    const location = useLocation();

    return (
        <div className="bg-slate-950 min-h-screen">
            {/* Remover Suspense e AnimatePresence mode='wait' - causa delays */}
            <Routes location={location} key={location.pathname}>
                        {/* Rotas Públicas (Apenas para deslogados) */}
                        <Route path="/" element={
                            <PublicRoute>
                                <LoginPage />
                            </PublicRoute>
                        } />
                        <Route path="/register" element={
                            <PublicRoute>
                                <RegisterPage />
                            </PublicRoute>
                        } />
                        <Route path="/forgot-password" element={
                            <PublicRoute>
                                <ForgotPasswordPage />
                            </PublicRoute>
                        } />

                        {/* Rota Principal da Aplicação (pós-login) */}
                        <Route path="/app" element={
                            <ProtectedRoute>
                                <NavigationProvider>
                                    <AppContainer />
                                </NavigationProvider>
                            </ProtectedRoute>
                        } />

                        {/* Rota legada - redireciona para /app */}
                        <Route path="/dashboard" element={<Navigate to="/app" replace />} />

                        {/* Rota de Termos de Uso */}
                        <Route path="/terms" element={
                            <TermsRoute>
                                <TermsOfServicePage />
                            </TermsRoute>
                        } />

                        {/* Fallback */}
                        <Route path="*" element={<Navigate to="/" replace />} />
                    </Routes>
        </div>
    );
};

function App() {
    return (
        <AuthProvider>
            <Router>
                <LanguageSelector />
                <AnimatedRoutes />
                <UpdateNotification />
            </Router>
        </AuthProvider>
    )
}

export default App
