import { useState } from 'react';
import { registerWithEmail, sendVerificationEmail, loginWithGoogle } from '@/lib/firebase';

export const useRegister = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [attempts, setAttempts] = useState(0);

    const handleRegister = async (email, password, displayName) => {
        // Sanitização
        const cleanEmail = email.trim();
        const cleanName = displayName.trim();

        if (attempts >= 3) {
            setError('Muitas tentativas de registro. Tente novamente mais tarde.');
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            const result = await registerWithEmail(cleanEmail, password, cleanName);

            if (!result.success) {
                setAttempts(prev => prev + 1);
                setError(result.error);
                setIsLoading(false);
                return false;
            }

            // Enviar e-mail de verificação após criar a conta
            await sendVerificationEmail(result.user);

            setIsLoading(false);
            return true;
        } catch (err) {
            setIsLoading(false);
            setError('unexpected_error');
            return false;
        }
    };

    const handleGoogleLogin = async () => {
        setIsLoading(true);
        setError(null);
        try {
            const result = await loginWithGoogle();
            setIsLoading(false);
            if (!result.success) {
                setError('google_auth_failed');
                return false;
            }
            return true;
        } catch (err) {
            setIsLoading(false);
            setError('google_auth_failed');
            return false;
        }
    };

    return {
        handleRegister,
        handleGoogleLogin,
        isLoading,
        error,
        isLocked: attempts >= 3
    };
};
