import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageWrapper from '@/components/ui/PageWrapper';
import { useAuth } from '@/contexts/AuthContext';
import { acceptTermsOfService } from '@/lib/firebase';
import { FileText, CheckCircle2, Shield } from 'lucide-react';

const TermsOfServicePage = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();
    const { user, profile } = useAuth();
    const [isLoading, setIsLoading] = useState(false);
    const [hasScrolledToEnd, setHasScrolledToEnd] = useState(false);

    const handleAccept = async () => {
        if (!user) return;
        setIsLoading(true);
        const result = await acceptTermsOfService(user.uid);
        setIsLoading(false);
        if (result.success) {
            navigate('/app', { replace: true });
        }
    };

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        if (scrollHeight - scrollTop <= clientHeight + 50) {
            setHasScrolledToEnd(true);
        }
    };

    return (
        <PageWrapper className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-2xl bg-slate-900/50 border border-slate-800 rounded-3xl backdrop-blur-xl overflow-hidden"
            >
                {/* Header */}
                <div className="p-8 border-b border-slate-800 text-center">
                    <div className="w-16 h-16 bg-indigo-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <FileText size={28} className="text-indigo-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">
                        {t('auth.terms.title')}
                    </h1>
                    <p className="text-slate-400 text-sm">
                        {t('auth.terms.subtitle')}
                    </p>
                </div>

                {/* Terms Content */}
                <div
                    onScroll={handleScroll}
                    className="p-8 max-h-[50vh] overflow-y-auto text-slate-300 text-sm leading-relaxed space-y-4 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900"
                >
                    <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Shield size={18} className="text-indigo-400" />
                        {t('auth.terms.section1_title')}
                    </h2>
                    <p>{t('auth.terms.section1_text')}</p>

                    <h2 className="text-lg font-semibold text-white pt-4">{t('auth.terms.section2_title')}</h2>
                    <p>{t('auth.terms.section2_text')}</p>

                    <h2 className="text-lg font-semibold text-white pt-4">{t('auth.terms.section3_title')}</h2>
                    <p>{t('auth.terms.section3_text')}</p>

                    <h2 className="text-lg font-semibold text-white pt-4">{t('auth.terms.section4_title')}</h2>
                    <p>{t('auth.terms.section4_text')}</p>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-800 bg-slate-950/50">
                    <p className="text-slate-500 text-xs text-center mb-6">
                        {t('auth.terms.scroll_hint')}
                    </p>
                    <button
                        onClick={handleAccept}
                        disabled={isLoading || !hasScrolledToEnd}
                        className={`w-full py-4 rounded-full font-bold tracking-wide uppercase text-sm transition-all flex items-center justify-center gap-2 ${hasScrolledToEnd
                            ? 'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-500 hover:to-blue-500 shadow-xl shadow-indigo-500/20'
                            : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                            } disabled:opacity-50`}
                    >
                        {isLoading ? (
                            <>
                                <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                </svg>
                                <span>{t('common.wait')}</span>
                            </>
                        ) : (
                            <>
                                <CheckCircle2 size={18} />
                                <span>{t('auth.terms.accept_button')}</span>
                            </>
                        )}
                    </button>
                </div>
            </motion.div>
        </PageWrapper>
    );
};

export default TermsOfServicePage;
