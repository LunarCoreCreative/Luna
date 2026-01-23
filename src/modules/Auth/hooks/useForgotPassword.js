import { useState } from 'react';
import { sendPasswordReset } from '@/lib/firebase';

export const useForgotPassword = () => {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(false);

    const handleResetPassword = async (email) => {
        setIsLoading(true);
        setError(null);
        setSuccess(false);

        try {
            const result = await sendPasswordReset(email);
            setIsLoading(false);

            if (result.success) {
                setSuccess(true);
                return true;
            } else {
                setError(result.error);
                return false;
            }
        } catch (err) {
            setIsLoading(false);
            setError('unexpected_error');
            return false;
        }
    };

    return {
        handleResetPassword,
        isLoading,
        error,
        success
    };
};
