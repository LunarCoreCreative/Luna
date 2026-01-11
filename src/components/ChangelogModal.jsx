import { useEffect } from 'react';
import { X, Sparkles, Wrench, Bug, Calendar } from 'lucide-react';

/**
 * Modal que exibe as mudanças da nova versão após atualização
 */
export const ChangelogModal = ({ isOpen, version, changelogData, onClose }) => {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = 'unset';
            };
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !changelogData) return null;

    const { date, features, improvements, bugfixes } = changelogData;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="w-full max-w-2xl max-h-[85vh] rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col"
                style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)'
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-6 py-4 flex-shrink-0"
                    style={{ borderBottom: '1px solid var(--border-color)' }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="p-2 rounded-lg"
                            style={{ background: 'var(--bg-tertiary)' }}
                        >
                            <Sparkles size={24} className="text-violet-400" />
                        </div>
                        <div>
                            <h2
                                className="text-xl font-bold"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                Nova Versão Disponível!
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span
                                    className="text-sm font-semibold px-2 py-0.5 rounded bg-violet-500/20 text-violet-400"
                                >
                                    v{version}
                                </span>
                                {date && (
                                    <div className="flex items-center gap-1 text-xs" style={{ color: 'var(--text-secondary)' }}>
                                        <Calendar size={12} />
                                        <span>{new Date(date).toLocaleDateString('pt-BR')}</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto px-6 py-5 custom-scrollbar">
                    {/* Novas Funcionalidades */}
                    {features && features.length > 0 && (
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles size={18} className="text-violet-400" />
                                <h3
                                    className="text-lg font-semibold"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    ✨ Novas Funcionalidades
                                </h3>
                            </div>
                            <ul className="space-y-2">
                                {features.map((feature, idx) => (
                                    <li
                                        key={idx}
                                        className="flex items-start gap-3 text-sm"
                                        style={{ color: 'var(--text-secondary)' }}
                                    >
                                        <span className="text-violet-400 mt-1">•</span>
                                        <span className="flex-1" dangerouslySetInnerHTML={{ 
                                            __html: feature.replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--text-primary)">$1</strong>')
                                        }} />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Melhorias */}
                    {improvements && improvements.length > 0 && (
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <Wrench size={18} className="text-blue-400" />
                                <h3
                                    className="text-lg font-semibold"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    🔧 Melhorias
                                </h3>
                            </div>
                            <ul className="space-y-2">
                                {improvements.map((improvement, idx) => (
                                    <li
                                        key={idx}
                                        className="flex items-start gap-3 text-sm"
                                        style={{ color: 'var(--text-secondary)' }}
                                    >
                                        <span className="text-blue-400 mt-1">•</span>
                                        <span className="flex-1" dangerouslySetInnerHTML={{ 
                                            __html: improvement.replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--text-primary)">$1</strong>')
                                        }} />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Correções de Bugs */}
                    {bugfixes && bugfixes.length > 0 && (
                        <div className="mb-6">
                            <div className="flex items-center gap-2 mb-3">
                                <Bug size={18} className="text-green-400" />
                                <h3
                                    className="text-lg font-semibold"
                                    style={{ color: 'var(--text-primary)' }}
                                >
                                    🐛 Correções de Bugs
                                </h3>
                            </div>
                            <ul className="space-y-2">
                                {bugfixes.map((bugfix, idx) => (
                                    <li
                                        key={idx}
                                        className="flex items-start gap-3 text-sm"
                                        style={{ color: 'var(--text-secondary)' }}
                                    >
                                        <span className="text-green-400 mt-1">•</span>
                                        <span className="flex-1" dangerouslySetInnerHTML={{ 
                                            __html: bugfix.replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--text-primary)">$1</strong>')
                                        }} />
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Se não houver dados estruturados, mostra o conteúdo bruto */}
                    {(!features || features.length === 0) && 
                     (!improvements || improvements.length === 0) && 
                     (!bugfixes || bugfixes.length === 0) && 
                     changelogData.raw && (
                        <div className="mb-6">
                            <h3
                                className="text-lg font-semibold mb-3"
                                style={{ color: 'var(--text-primary)' }}
                            >
                                O que há de novo
                            </h3>
                            <div
                                className="text-sm whitespace-pre-line"
                                style={{ color: 'var(--text-secondary)' }}
                                dangerouslySetInnerHTML={{
                                    __html: changelogData.raw
                                        .replace(/\*\*(.*?)\*\*/g, '<strong style="color: var(--text-primary)">$1</strong>')
                                        .replace(/\n/g, '<br />')
                                }}
                            />
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div
                    className="px-6 py-4 flex-shrink-0 flex items-center justify-end gap-3"
                    style={{ borderTop: '1px solid var(--border-color)' }}
                >
                    <button
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-lg text-sm font-medium transition-colors bg-violet-600 hover:bg-violet-500 text-white"
                    >
                        Entendi, obrigado!
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ChangelogModal;
