import { useEffect, useCallback } from "react";
import { X, AlertCircle, HelpCircle } from "lucide-react";

/**
 * Modal personalizado que usa os temas do app
 * Suporta: alert, confirm e prompt
 */
export const Modal = ({ isOpen, type, title, message, defaultValue, onConfirm, onCancel, onInput }) => {
    useEffect(() => {
        if (isOpen) {
            // Previne scroll do body quando modal está aberto
            document.body.style.overflow = 'hidden';
            return () => {
                document.body.style.overflow = 'unset';
            };
        }
    }, [isOpen]);

    const handleConfirm = useCallback(() => {
        if (type === 'prompt' && onInput) {
            const input = document.getElementById('modal-prompt-input');
            const value = input ? input.value : (defaultValue || '');
            onInput(value || defaultValue || null);
        } else if (onConfirm) {
            onConfirm();
        }
    }, [type, onInput, onConfirm, defaultValue]);

    const handleCancel = useCallback(() => {
        if (type === 'prompt' && onInput) {
            onInput(null);
        } else if (onCancel) {
            onCancel();
        }
    }, [type, onInput, onCancel]);

    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                handleCancel();
            } else if (e.key === 'Enter' && type === 'alert') {
                handleConfirm();
            } else if (e.key === 'Enter' && type === 'confirm' && !e.shiftKey) {
                handleConfirm();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, type, handleConfirm, handleCancel]);

    if (!isOpen) return null;

    // Ícone baseado no tipo
    const getIcon = () => {
        switch (type) {
            case 'alert':
                return <AlertCircle size={24} className="text-blue-400" />;
            case 'confirm':
                return <HelpCircle size={24} className="text-amber-400" />;
            case 'prompt':
                return <HelpCircle size={24} className="text-violet-400" />;
            default:
                return <AlertCircle size={24} className="text-blue-400" />;
        }
    };

    // Cor do botão confirmar
    const getConfirmButtonStyle = () => {
        switch (type) {
            case 'alert':
                return 'bg-blue-600 hover:bg-blue-500 text-white';
            case 'confirm':
                return 'bg-blue-600 hover:bg-blue-500 text-white';
            case 'prompt':
                return 'bg-violet-600 hover:bg-violet-500 text-white';
            default:
                return 'bg-blue-600 hover:bg-blue-500 text-white';
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
            <div
                className="w-full max-w-md rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
                style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)'
                }}
            >
                {/* Header */}
                <div
                    className="flex items-center justify-between px-6 py-4"
                    style={{ borderBottom: '1px solid var(--border-color)' }}
                >
                    <div className="flex items-center gap-3">
                        <div
                            className="p-2 rounded-lg"
                            style={{ background: 'var(--bg-tertiary)' }}
                        >
                            {getIcon()}
                        </div>
                        <h2
                            className="text-lg font-bold"
                            style={{ color: 'var(--text-primary)' }}
                        >
                            {title || 'Luna'}
                        </h2>
                    </div>
                    {type === 'alert' && (
                        <button
                            onClick={handleConfirm}
                            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
                            style={{ color: 'var(--text-secondary)' }}
                        >
                            <X size={18} />
                        </button>
                    )}
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                    <p
                        className="text-sm leading-relaxed mb-4"
                        style={{ color: 'var(--text-primary)' }}
                    >
                        {message}
                    </p>

                    {/* Input para prompt */}
                    {type === 'prompt' && (
                        <input
                            id="modal-prompt-input"
                            type="text"
                            defaultValue={defaultValue || ''}
                            autoFocus
                            className="w-full rounded-lg px-4 py-2.5 text-sm outline-none transition-colors mb-4"
                            style={{
                                background: 'var(--bg-tertiary)',
                                border: '1px solid var(--border-color)',
                                color: 'var(--text-primary)'
                            }}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleConfirm();
                                } else if (e.key === 'Escape') {
                                    e.preventDefault();
                                    handleCancel();
                                }
                            }}
                            placeholder="Digite aqui..."
                        />
                    )}

                    {/* Buttons */}
                    <div className="flex items-center justify-end gap-3">
                        {(type === 'confirm' || type === 'prompt') && (
                            <button
                                onClick={handleCancel}
                                className="px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                                style={{
                                    background: 'var(--bg-tertiary)',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid var(--border-color)'
                                }}
                            >
                                Cancelar
                            </button>
                        )}
                        <button
                            onClick={handleConfirm}
                            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${getConfirmButtonStyle()}`}
                        >
                            {type === 'alert' ? 'OK' : type === 'confirm' ? 'OK' : 'Confirmar'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
