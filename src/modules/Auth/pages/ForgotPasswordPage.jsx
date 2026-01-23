import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Input } from '@/components/ui/Input';
import PageWrapper from '@/components/ui/PageWrapper';
import { useForgotPassword } from '../hooks/useForgotPassword';
import { useDebounce } from '@/hooks/useDebounce';
import { getAuthErrorKey } from '@/lib/authErrors';
import { Mail, ArrowLeft, CheckCircle2 } from 'lucide-react';

const ForgotPasswordPage = () => {
    const { handleResetPassword, isLoading, error, success } = useForgotPassword();
    const { t } = useTranslation();
    const [email, setEmail] = useState('');
    const [emailError, setEmailError] = useState(null);
    const [liveError, setLiveError] = useState(null);

    // Validação de E-mail Debounced
    const debouncedEmail = useDebounce(email, 500);

    useEffect(() => {
        if (debouncedEmail) {
            const isValid = /\S+@\S+\.\S+/.test(debouncedEmail);
            setLiveError(isValid ? null : t('auth.errors.invalid_email'));
        } else {
            setLiveError(null);
        }
    }, [debouncedEmail, t]);

    const validate = () => {
        if (!email) {
            setEmailError(t('auth.errors.required_email'));
            return false;
        } else if (!/\S+@\S+\.\S+/.test(email)) {
            setEmailError(t('auth.errors.invalid_email'));
            return false;
        }
        return true;
    };

    const onSubmit = async (e) => {
        e.preventDefault();
        if (validate()) {
            await handleResetPassword(email);
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
                            transition={{ duration: 6 + i, repeat: Infinity }}
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
                    className="w-full max-w-sm text-center lg:text-left relative z-10 flex flex-col items-center lg:items-start"
                >
                    <motion.div variants={{ hidden: { opacity: 0, x: -10 }, visible: { opacity: 1, x: 0 } }}>
                        <Link
                            to="/"
                            aria-label={t('auth.forgot_password.back_to_login')}
                            className="inline-flex items-center gap-2 text-slate-500 hover:text-indigo-400 transition-colors mb-8 group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg px-2 py-1"
                        >
                            <ArrowLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                            <span className="text-sm font-medium">{t('auth.forgot_password.back_to_login')}</span>
                        </Link>
                    </motion.div>

                    <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }} className="mb-10">
                        <h1 className="text-3xl font-bold text-white mb-2 text-left">{t('auth.forgot_password.title')}</h1>
                        <p className="text-slate-400 text-sm text-left">{t('auth.forgot_password.subtitle')}</p>
                    </motion.div>

                    {success ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            role="status"
                            aria-live="polite"
                            className="bg-emerald-500/10 border border-emerald-500/20 p-8 rounded-2xl flex flex-col items-center gap-4"
                        >
                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center text-emerald-400 mb-2" aria-hidden="true">
                                <CheckCircle2 size={32} />
                            </div>
                            <h3 className="text-white font-bold text-xl uppercase tracking-wider">{t('auth.forgot_password.success_title')}</h3>
                            <p className="text-emerald-300/80 text-sm italic">{t('auth.forgot_password.success_message', { email: email })}</p>
                            <Link to="/" className="mt-4 w-full py-3 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition-all text-center focus-visible:ring-2 focus-visible:ring-emerald-400 outline-none">
                                {t('auth.forgot_password.back_to_login')}
                            </Link>
                        </motion.div>
                    ) : (
                        <form onSubmit={onSubmit} className="flex flex-col gap-6">
                            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                                <Input
                                    label={t('auth.forgot_password.email_label')}
                                    type="email"
                                    placeholder="seu@email.com"
                                    icon={Mail}
                                    value={email}
                                    onChange={(e) => {
                                        setEmail(e.target.value);
                                        if (emailError) setEmailError(null);
                                    }}
                                    error={emailError || liveError}
                                    success={email && !liveError && !emailError}
                                    disabled={isLoading}
                                />
                            </motion.div>

                            {/* Erro Firebase */}
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    role="alert"
                                    className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-300 text-sm flex items-start gap-3"
                                >
                                    <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-red-500 mt-1.5 shrink-0" />
                                    {t(getAuthErrorKey(error))}
                                </motion.div>
                            )}

                            <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full py-4 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 text-white font-bold tracking-wide uppercase text-sm hover:from-indigo-500 hover:to-blue-500 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-indigo-500/20 mt-2 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 outline-none"
                                >
                                    {isLoading ? (
                                        <div role="status" className="flex items-center justify-center gap-2">
                                            <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" aria-hidden="true">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                            </svg>
                                            <span className="sr-only">{t('auth.forgot_password.loading_button')}</span>
                                            <span aria-hidden="true">{t('auth.forgot_password.loading_button')}</span>
                                        </div>
                                    ) : t('auth.forgot_password.submit_button')}
                                </button>
                            </motion.div>
                        </form>
                    )}
                </motion.div>
            </div>

            {/* Lado Direito - Branding (Lunar) */}
            <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-indigo-900 via-slate-900 to-slate-950 relative overflow-hidden flex-col justify-center items-center p-16">
                <div className="absolute inset-0 overflow-hidden">
                    <motion.div
                        animate={{ opacity: [0.2, 0.6, 0.2] }}
                        transition={{ duration: 5, repeat: Infinity }}
                        className="absolute top-[20%] left-[20%] w-1 h-1 bg-white/60 rounded-full"
                    />
                    <motion.div
                        animate={{ opacity: [0.3, 0.8, 0.3] }}
                        transition={{ duration: 7, repeat: Infinity }}
                        className="absolute top-[60%] left-[80%] w-1.5 h-1.5 bg-white/40 rounded-full"
                    />
                </div>

                <div className="relative z-10 text-center max-w-md">
                    <motion.h2
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="text-4xl font-bold text-white mb-3"
                    >
                        Não se preocupe,
                        <br />
                        <span className="text-indigo-300">Nós te ajudamos</span>
                    </motion.h2>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.3 }}
                        className="text-slate-400 text-lg"
                    >
                        Mantenha o acesso à sua jornada com a Luna
                    </motion.p>

                    <div className="mt-12 flex justify-center">
                        <div className="relative">
                            <motion.div
                                animate={{ scale: [1, 1.1, 1], opacity: [0.1, 0.2, 0.1] }}
                                transition={{ duration: 8, repeat: Infinity }}
                                className="absolute inset-0 w-40 h-40 bg-indigo-400/10 rounded-full blur-2xl"
                            />
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", stiffness: 60, damping: 20, delay: 0.2 }}
                                whileHover={{ scale: 1.05 }}
                                className="relative w-40 h-40 rounded-full bg-gradient-to-br from-slate-300/40 via-slate-200/20 to-slate-400/10 border border-white/5 cursor-pointer"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
};

export default ForgotPasswordPage;
