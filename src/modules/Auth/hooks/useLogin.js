import { useState } from 'react';
import { loginWithEmail, loginWithGoogle, sendVerificationEmail, logout } from '@/lib/firebase';
import { getAuthErrorKey } from '@/lib/authErrors';

export const useLogin = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [needsVerification, setNeedsVerification] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [resendSuccess, setResendSuccess] = useState(false);
    const [unverifiedUser, setUnverifiedUser] = useState(null);

    // Estados de Segurança - Rate Limiting
    const [attempts, setAttempts] = useState(0);
    const [lockUntil, setLockUntil] = useState(null);

    const handleEmailLogin = async (email, password) => {
        // Sanitização básica
        const cleanEmail = email.trim();
        const cleanPassword = password.trim();

        // Verificar Bloqueio
        if (lockUntil && Date.now() < lockUntil) {
            const secondsLeft = Math.ceil((lockUntil - Date.now()) / 1000);
            setError(`Muitas tentativas. Tente novamente em ${secondsLeft} segundos.`);
            return false;
        }

        setIsLoading(true);
        setError(null);
        setNeedsVerification(false);
        setResendSuccess(false);

        const result = await loginWithEmail(cleanEmail, cleanPassword);

        if (!result.success) {
            const newAttempts = attempts + 1;
            setAttempts(newAttempts);

            if (newAttempts >= 5) {
                const cooldown = Date.now() + 30000; // 30 segundos
                setLockUntil(cooldown);
                setAttempts(0);
                setError(result.error);
            }

            setIsLoading(false);
            return false;
        }

        // Resetar tentativas em caso de sucesso
        setAttempts(0);
        setLockUntil(null);

        // Bloqueia login se o e-mail não estiver verificado
        if (!result.user.emailVerified) {
            setNeedsVerification(true);
            setUnverifiedUser(result.user);
            setError('auth_not_verified');
            await logout();
            setIsLoading(false);
            return false;
        }

        setIsLoading(false);
        return true;
    };

    const handleResendVerification = async () => {
        if (!unverifiedUser) return;

        setResendLoading(true);
        const result = await sendVerificationEmail(unverifiedUser);
        setResendLoading(false);

        if (result.success) {
            setResendSuccess(true);
        } else {
            setError('Erro ao reenviar: ' + result.error);
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError(null);
        setNeedsVerification(false);

        const result = await loginWithGoogle();
        setIsLoading(false);

        if (!result.success) {
            setError(getAuthErrorKey(result.error));
            return false;
        }
        return true;
    };

    return {
        handleEmailLogin,
        handleGoogleLogin,
        handleResendVerification,
        isLoading,
        error,
        needsVerification,
        resendLoading,
        resendSuccess,
        isLocked: lockUntil && Date.now() < lockUntil,
        secondsLeft: lockUntil ? Math.ceil((lockUntil - Date.now()) / 1000) : 0
    };
};
