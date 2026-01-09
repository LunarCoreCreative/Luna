import { useState, useEffect } from 'react';
import { Download, RefreshCw, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

/**
 * UpdateNotification Component
 * Shows update status, download progress, and install button
 */
export const UpdateNotification = () => {
    const [updateState, setUpdateState] = useState({
        status: 'idle', // idle, checking, available, downloading, ready, error
        version: null,
        progress: 0,
        error: null
    });
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (!window.electron?.updater) return;

        const updater = window.electron.updater;

        updater.onUpdateAvailable((data) => {
            setUpdateState({
                status: 'available',
                version: data.version,
                progress: 0,
                error: null
            });
            setIsVisible(true);
        });

        updater.onUpdateProgress((data) => {
            setUpdateState(prev => ({
                ...prev,
                status: 'downloading',
                progress: data.percent
            }));
        });

        updater.onUpdateDownloaded((data) => {
            setUpdateState({
                status: 'ready',
                version: data.version,
                progress: 100,
                error: null
            });
        });

        updater.onUpdateError((data) => {
            setUpdateState(prev => ({
                ...prev,
                status: 'error',
                error: data.message
            }));
        });

        // Cleanup is not needed for IPC listeners in this case
    }, []);

    const handleDownload = () => {
        if (window.electron?.updater) {
            setUpdateState(prev => ({ ...prev, status: 'downloading', progress: 0 }));
            window.electron.updater.downloadUpdate();
        }
    };

    const handleInstall = () => {
        if (window.electron?.updater) {
            window.electron.updater.installUpdate();
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
    };

    const handleCheckUpdate = () => {
        if (window.electron?.updater) {
            setUpdateState(prev => ({ ...prev, status: 'checking' }));
            window.electron.updater.checkForUpdates();
        }
    };

    if (!isVisible || updateState.status === 'idle') {
        return null;
    }

    return (
        <div
            className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-bottom-4 fade-in duration-300"
            style={{ maxWidth: '320px' }}
        >
            <div
                className="rounded-xl p-4 shadow-2xl border backdrop-blur-md"
                style={{
                    background: 'var(--bg-secondary)',
                    borderColor: updateState.status === 'error' ? 'rgba(239, 68, 68, 0.3)' : 'rgba(139, 92, 246, 0.3)'
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        {updateState.status === 'checking' && (
                            <Loader2 size={16} className="text-purple-400 animate-spin" />
                        )}
                        {updateState.status === 'available' && (
                            <Download size={16} className="text-purple-400" />
                        )}
                        {updateState.status === 'downloading' && (
                            <RefreshCw size={16} className="text-blue-400 animate-spin" />
                        )}
                        {updateState.status === 'ready' && (
                            <CheckCircle2 size={16} className="text-green-400" />
                        )}
                        {updateState.status === 'error' && (
                            <AlertCircle size={16} className="text-red-400" />
                        )}
                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                            {updateState.status === 'checking' && 'Verificando...'}
                            {updateState.status === 'available' && 'Atualização Disponível'}
                            {updateState.status === 'downloading' && 'Baixando...'}
                            {updateState.status === 'ready' && 'Pronto para Instalar'}
                            {updateState.status === 'error' && 'Erro na Atualização'}
                        </span>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="p-1 rounded-lg hover:bg-white/10 transition-colors"
                        style={{ color: 'var(--text-secondary)' }}
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Content */}
                {updateState.version && (
                    <p className="text-xs mb-3" style={{ color: 'var(--text-secondary)' }}>
                        Versão {updateState.version} está disponível!
                    </p>
                )}

                {updateState.error && (
                    <p className="text-xs text-red-400 mb-3">
                        {updateState.error}
                    </p>
                )}

                {/* Progress Bar */}
                {updateState.status === 'downloading' && (
                    <div className="mb-3">
                        <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-purple-500 transition-all duration-300"
                                style={{ width: `${updateState.progress}%` }}
                            />
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 text-right">
                            {updateState.progress.toFixed(0)}%
                        </p>
                    </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                    {updateState.status === 'available' && (
                        <button
                            onClick={handleDownload}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-purple-500 hover:bg-purple-600 text-white"
                        >
                            <Download size={12} />
                            Baixar Agora
                        </button>
                    )}

                    {updateState.status === 'ready' && (
                        <button
                            onClick={handleInstall}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-green-500 hover:bg-green-600 text-white"
                        >
                            <RefreshCw size={12} />
                            Reiniciar e Atualizar
                        </button>
                    )}

                    {updateState.status === 'error' && (
                        <button
                            onClick={handleCheckUpdate}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-gray-600 hover:bg-gray-500 text-white"
                        >
                            <RefreshCw size={12} />
                            Tentar Novamente
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UpdateNotification;
