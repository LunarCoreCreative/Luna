import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import PageWrapper from '@/components/ui/PageWrapper';
import PasswordStrength from '@/components/ui/PasswordStrength';
import { useRegister } from '../hooks/useRegister';
import { useDebounce } from '@/hooks/useDebounce';
import { getAuthErrorKey } from '@/lib/authErrors';
import { User, Mail, Lock, Eye, EyeOff, ClipboardCheck } from 'lucide-react';

const RegisterPage = () => {
    const navigate = useNavigate();
    const { handleRegister, handleGoogleLogin, isLoading, error: firebaseError, isLocked } = useRegister();
    const { t } = useTranslation();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    const [showPassword, setShowPassword] = useState(false);
    const [errors, setErrors] = useState({});
    const [liveErrors, setLiveErrors] = useState({});

    // Validação de E-mail Debounced
    const debouncedEmail = useDebounce(email, 500);

    useEffect(() => {
        if (debouncedEmail) {
            const isValid = /\S+@\S+\.\S+/.test(debouncedEmail);
            setLiveErrors(prev => ({
                ...prev,
                email: isValid ? null : t('auth.errors.invalid_email')
            }));
        } else {
            setLiveErrors(prev => ({ ...prev, email: null }));
        }
    }, [debouncedEmail]);

    // Validação de Senha Live
    useEffect(() => {
        if (confirmPassword && password !== confirmPassword) {
            setLiveErrors(prev => ({ ...prev, confirmPassword: t('auth.errors.mismatch_password') }));
        } else {
            setLiveErrors(prev => ({ ...prev, confirmPassword: null }));
        }
    }, [password, confirmPassword, t]);

    const validate = () => {
        const newErrors = {};
        if (!name.trim()) newErrors.name = t('auth.errors.required_name');

        if (!email) {
            newErrors.email = t('auth.errors.required_email');
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            newErrors.email = t('auth.errors.invalid_email');
        }

        if (!password) {
            newErrors.password = t('auth.errors.required_password');
        } else if (password.length < 6) {
            newErrors.password = t('auth.errors.short_password');
        }

        if (password !== confirmPassword) {
            newErrors.confirmPassword = t('auth.errors.mismatch_password');
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (isLocked) return;
        if (validate()) {
            const success = await handleRegister(email, password, name);
            if (success) {
                navigate('/');
            }
        }
    };

    return (
        <PageWrapper className="min-h-screen flex text-slate-200">
            {/* Lado Esquerdo - Formulário (Escuro Lunar) */}
            <div className="w-full lg:w-1/2 bg-slate-950 flex flex-col justify-center items-center p-6 sm:p-10 lg:p-16 relative overflow-hidden">
                {/* Estrelas sutis para Mobile/Tablet */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none lg:hidden">
                    {[1, 2, 3].map((i) => (
                        <motion.div
                            key={i}
                            animate={{ opacity: [0.1, 0.4, 0.1] }}
                            transition={{ duration: 5 + i, repeat: Infinity }}
                            className="absolute bg-white/20 rounded-full w-[1px] h-[1px]"
                            style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                            }}
                        />
                    ))}
                </div>

                <motion.div
                    initial="hidden"
                    animate="visible"
                    variants={{
                        hidden: { opacity: 0 },
                        visible: {
                            opacity: 1,
                            transition: {
                                staggerChildren: 0.1
                            }
                        }
                    }}
                    className="w-full max-w-sm relative z-10"
                >
                    {/* Logo/Icon Mobile */}
                    <motion.div
                        variants={{ hidden: { opacity: 0, scale: 0.8 }, visible: { opacity: 1, scale: 1 } }}
                        className="lg:hidden flex justify-center mb-8"
                    >
                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500/20 to-blue-500/20 flex items-center justify-center border border-indigo-500/30">
                            <div className="w-6 h-6 rounded-full bg-slate-200 shadow-[0_0_15px_rgba(255,255,255,0.5)]" />
                        </div>
                    </motion.div>

                    {/* Título */}
                    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="mb-8">
                        <h1 className="text-2xl sm:text-3xl font-bold text-white mb-2 text-center lg:text-left">{t('auth.register.title')}</h1>
                        <p className="text-slate-400 text-sm text-center lg:text-left">{t('auth.register.subtitle')}</p>
                    </motion.div>

                    {/* Formulário */}
                    <form onSubmit={onSubmit} className="flex flex-col gap-6">
                        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                            <Input
                                label={t('auth.register.name_label')}
                                placeholder="Seu nome"
                                icon={User}
                                value={name}
                                onChange={(e) => {
                                    setName(e.target.value);
                                    if (errors.name) setErrors(prev => ({ ...prev, name: null }));
                                }}
                                error={errors.name}
                                success={name.trim().length > 3}
                                disabled={isLoading || isLocked}
                            />
                        </motion.div>

                        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                            <Input
                                label={t('auth.register.email_label')}
                                type="email"
                                placeholder="seu@email.com"
                                icon={Mail}
                                value={email}
                                onChange={(e) => {
                                    setEmail(e.target.value);
                                    if (errors.email) setErrors(prev => ({ ...prev, email: null }));
                                }}
                                error={errors.email || liveErrors.email}
                                success={email && !liveErrors.email && !errors.email}
                                disabled={isLoading || isLocked}
                            />
                        </motion.div>

                        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="relative group">
                            <Input
                                label={t('auth.register.password_label')}
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                icon={Lock}
                                value={password}
                                onChange={(e) => {
                                    setPassword(e.target.value);
                                    if (errors.password) setErrors(prev => ({ ...prev, password: null }));
                                }}
                                error={errors.password}
                                success={password.length >= 6}
                                disabled={isLoading || isLocked}
                                className="pr-10"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-[38px] text-slate-500 hover:text-slate-300 transition-colors z-10"
                                aria-label={showPassword ? t('auth.login.hide_password') : t('auth.login.show_password')}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                            <PasswordStrength password={password} />
                        </motion.div>

                        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="relative group">
                            <Input
                                label={t('auth.register.confirm_password_label')}
                                type={showPassword ? 'text' : 'password'}
                                placeholder="••••••••"
                                icon={ClipboardCheck}
                                value={confirmPassword}
                                onChange={(e) => {
                                    setConfirmPassword(e.target.value);
                                    if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: null }));
                                }}
                                error={errors.confirmPassword || liveErrors.confirmPassword}
                                success={confirmPassword && password === confirmPassword}
                                disabled={isLoading || isLocked}
                                className="pr-10"
                                focus-visible:ring-2 focus-visible:ring-indigo-500
                            />
                        </motion.div>

                        {/* Erro Firebase e Bloqueio */}
                        {(firebaseError || isLocked) && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                role="alert"
                                className={`p-4 rounded-xl text-sm flex items-start gap-3 ${isLocked ? 'bg-red-500/20 border border-red-500/40 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.1)]' : 'bg-red-500/10 border border-red-500/20 text-red-300'}`}
                            >
                                <span aria-hidden="true" className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 animate-pulse ${isLocked ? 'bg-red-500' : 'bg-red-500'}`} />
                                <div className="flex flex-col gap-1">
                                    <span className="font-bold uppercase text-[10px] tracking-widest opacity-70">
                                        {isLocked ? t('auth.login.security_locked') : t('auth.login.security_error')}
                                    </span>
                                    <span>{isLocked ? t('auth.register.too_many_attempts') : t(getAuthErrorKey(firebaseError))}</span>
                                </div>
                            </motion.div>
                        )}

                        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                            <button
                                type="submit"
                                disabled={isLoading || isLocked}
                                className={`w-full py-4 rounded-full bg-gradient-to-r ${isLocked ? 'from-slate-800 to-slate-900 grayscale' : 'from-indigo-600 to-blue-600'} text-white font-bold tracking-wide uppercase text-sm hover:from-indigo-500 hover:to-blue-500 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-indigo-500/20 mt-2`}
                            >
                                {isLoading ? (
                                    <div className="flex items-center justify-center gap-2">
                                        <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span>{t('auth.register.loading_button')}</span>
                                    </div>
                                ) : t('auth.register.submit_button')}
                            </button>
                        </motion.div>
                    </form>

                    {/* Divisor Visual */}
                    <motion.div
                        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
                        className="relative my-8"
                        aria-hidden="true"
                    >
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-800"></div>
                        </div>
                        <div className="relative flex justify-center text-xs uppercase">
                            <span className="bg-slate-950 px-4 text-slate-500 font-medium">{t('auth.login.or_continue_with')}</span>
                        </div>
                    </motion.div>

                    {/* Login Social - Apenas Google */}
                    <motion.div
                        variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0 } }}
                        className="grid grid-cols-1 gap-4"
                    >
                        <button
                            type="button"
                            onClick={handleGoogleLogin}
                            disabled={isLoading}
                            aria-label={t('auth.login.google_button')}
                            className="flex items-center justify-center gap-3 w-full py-3.5 px-4 rounded-full bg-slate-900 border border-slate-800 hover:bg-slate-800 hover:border-slate-700 transition-all text-white font-medium group active:scale-[0.98] disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-indigo-500 outline-none"
                        >
                            <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" style={{ fill: "#4285F4" }} />
                                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-1.01.68-2.31 1.05-3.71 1.05-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" style={{ fill: "#34A853" }} />
                                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" style={{ fill: "#FBBC05" }} />
                                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-5.38z" style={{ fill: "#EA4335" }} />
                            </svg>
                            <span>{t('auth.login.google_button')}</span>
                        </button>
                    </motion.div>

                    {/* Voltar para Login */}
                    <motion.div
                        variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}
                        className="mt-12 flex items-center justify-center gap-3"
                    >
                        <span className="text-slate-500 text-sm">{t('auth.register.has_account')}</span>
                        <Link to="/" className="text-sm text-white font-medium hover:text-indigo-300 transition-colors border border-slate-800 px-6 py-2 rounded-full hover:bg-slate-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                            {t('auth.register.login_link')}
                        </Link>
                    </motion.div>
                </motion.div>
            </div>

            {/* Lado Direito - Branding (Lunar) */}
            <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 relative overflow-hidden flex-col justify-center items-center p-16">
                <div className="absolute inset-0 overflow-hidden">
                    {[1, 2, 3, 4, 5].map((i) => (
                        <motion.div
                            key={i}
                            animate={{ opacity: [0.1, 0.6, 0.1], scale: [1, 1.2, 1] }}
                            transition={{ duration: 4 + i, repeat: Infinity, ease: "easeInOut" }}
                            className="absolute bg-white/40 rounded-full"
                            style={{
                                top: `${Math.random() * 100}%`,
                                left: `${Math.random() * 100}%`,
                                width: '2px',
                                height: '2px',
                            }}
                        />
                    ))}
                </div>

                <div className="relative z-10 text-center max-w-md">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-bold text-white mb-3"
                    >
                        Uma nova luz para
                        <br />
                        <span className="text-indigo-300">Seus Projetos</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-slate-400 text-lg"
                    >
                        Mantenha tudo organizado de forma inteligente
                    </motion.p>

                    <div className="mt-12 flex justify-center">
                        <div className="relative">
                            <motion.div
                                animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
                                transition={{ duration: 6, repeat: Infinity }}
                                className="absolute inset-0 w-40 h-40 bg-indigo-400/10 rounded-full blur-2xl"
                            />
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 60, damping: 20, delay: 0.2 }}
                                whileHover={{ scale: 1.05 }}
                                className="relative w-40 h-40 rounded-full bg-gradient-to-br from-slate-300 via-slate-200 to-slate-400 shadow-2xl opacity-90 cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
};

export default RegisterPage;
