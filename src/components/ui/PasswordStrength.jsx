import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

const PasswordStrength = ({ password }) => {
    const { t } = useTranslation();
    const calculateStrength = (pass) => {
        if (!pass) return 0;
        let strength = 0;
        if (pass.length >= 6) strength += 1;
        if (pass.length >= 10) strength += 1;
        if (/[A-Z]/.test(pass)) strength += 1;
        if (/[0-9]/.test(pass)) strength += 1;
        if (/[^A-Za-z0-9]/.test(pass)) strength += 1;
        return strength;
    };

    const strength = calculateStrength(password);

    const getLabel = () => {
        if (!password) return '';
        if (strength <= 2) return t('auth.register.strength_weak');
        if (strength <= 4) return t('auth.register.strength_medium');
        return t('auth.register.strength_strong');
    };

    const getColor = () => {
        if (strength <= 2) return 'bg-red-500';
        if (strength <= 4) return 'bg-amber-500';
        return 'bg-emerald-500';
    };

    return (
        <div className="mt-2 px-1">
            <div className="flex justify-between items-center mb-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{t('auth.register.password_strength')}</span>
                <span className={`text-[10px] font-bold uppercase tracking-wider ${strength <= 2 ? 'text-red-400' : strength <= 4 ? 'text-amber-400' : 'text-emerald-400'}`}>
                    {getLabel()}
                </span>
            </div>
            <div className="flex gap-1.5 h-1">
                {[1, 2, 3, 4, 5].map((step) => (
                    <motion.div
                        key={step}
                        initial={false}
                        animate={{
                            backgroundColor: step <= strength ? 'var(--tw-bg-opacity)' : 'rgba(30, 41, 59, 0.5)',
                            opacity: step <= strength ? 1 : 0.3
                        }}
                        className={`flex-1 rounded-full transition-colors duration-500 ${step <= strength ? getColor() : 'bg-slate-800'}`}
                    />
                ))}
            </div>
        </div>
    );
};

export default PasswordStrength;
