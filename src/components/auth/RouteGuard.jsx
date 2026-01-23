import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

/**
 * Protege rotas que exigem autenticação.
 * Redireciona para o Login se não estiver logado.
 * Redireciona para os Termos se não tiverem sido aceitos.
 */
export const ProtectedRoute = ({ children }) => {
    const { user, profile } = useAuth();
    const location = useLocation();

    // Não bloquear - se não tem user ainda, mostrar conteúdo e redirecionar depois
    if (!user) {
        return <Navigate to="/" replace />;
    }

    // Se o usuário não aceitou os termos e não está na página de termos
    if (profile && !profile.termsAcceptedAt && location.pathname !== '/terms') {
        return <Navigate to="/terms" replace />;
    }

    return children;
};

/**
 * Rota específica para Termos de Uso.
 * Requer autenticação mas NÃO verifica termos.
 */
export const TermsRoute = ({ children }) => {
    const { user, profile } = useAuth();

    if (!user) {
        return <Navigate to="/" replace />;
    }

    // Se já aceitou os termos, vai direto pro app
    if (profile && profile.termsAcceptedAt) {
        return <Navigate to="/app" replace />;
    }

    return children;
};

/**
 * Protege rotas que APENAS usuários deslogados podem ver (ex: Login, Cadastro).
 * Redireciona para a Home/Dashboard se já estiver logado.
 */
export const PublicRoute = ({ children }) => {
    const { user, profile } = useAuth();

    if (user) {
        // Se logado mas não aceitou termos, vai para termos
        if (profile && !profile.termsAcceptedAt) {
            return <Navigate to="/terms" replace />;
        }
        return <Navigate to="/app" replace />;
    }

    return children;
};
