import { useState, useEffect } from 'react';
import { Download, RefreshCw, X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * UpdateNotification Component
 * Shows update status, download progress, and install button
 * Automatically appears when update is available (triggered by electron-updater)
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
        // Only work in Electron environment
        if (typeof window === 'undefined' || !window.electronAPI?.updater) {
            return;
        }

        const updater = window.electronAPI.updater;

        // Listen for update available
        updater.onUpdateAvailable((data) => {
            console.log('[UpdateNotification] Update available:', data.version);
            setUpdateState({
                status: 'available',
                version: data.version,
                progress: 0,
                error: null
            });
            setIsVisible(true);
        });

        // Listen for download progress
        updater.onUpdateProgress((data) => {
            setUpdateState(prev => ({
                ...prev,
                status: 'downloading',
                progress: data.percent
            }));
        });

        // Listen for download complete
        updater.onUpdateDownloaded((data) => {
            console.log('[UpdateNotification] Update downloaded:', data.version);
            setUpdateState({
                status: 'ready',
                version: data.version,
                progress: 100,
                error: null
            });
        });

        // Listen for errors
        updater.onUpdateError((data) => {
            console.error('[UpdateNotification] Update error:', data.message);
            setUpdateState(prev => ({
                ...prev,
                status: 'error',
                error: data.message
            }));
            setIsVisible(true);
        });

        // Cleanup listeners on unmount (IPC listeners are managed by Electron)
    }, []);

    const handleDownload = () => {
        if (window.electronAPI?.updater) {
            setUpdateState(prev => ({ ...prev, status: 'downloading', progress: 0 }));
            window.electronAPI.updater.downloadUpdate();
        }
    };

    const handleInstall = () => {
        if (window.electronAPI?.updater) {
            window.electronAPI.updater.installUpdate();
        }
    };

    const handleDismiss = () => {
        setIsVisible(false);
    };

    const handleCheckUpdate = () => {
        if (window.electronAPI?.updater) {
            setUpdateState(prev => ({ ...prev, status: 'checking', error: null }));
            window.electronAPI.updater.checkForUpdates();
        }
    };

    // Don't render if not visible or idle
    if (!isVisible || updateState.status === 'idle') {
        return null;
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                className="fixed bottom-4 right-4 z-[9999]"
                style={{ maxWidth: '360px' }}
            >
                <div
                    className="rounded-xl p-4 shadow-2xl border backdrop-blur-md"
                    style={{
                        background: 'rgba(15, 23, 42, 0.95)',
                        borderColor: updateState.status === 'error' 
                            ? 'rgba(239, 68, 68, 0.3)' 
                            : 'rgba(139, 92, 246, 0.3)'
                    }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            {updateState.status === 'checking' && (
                                <Loader2 size={16} className="text-violet-400 animate-spin" />
                            )}
                            {updateState.status === 'available' && (
                                <Download size={16} className="text-violet-400" />
                            )}
                            {updateState.status === 'downloading' && (
                                <RefreshCw size={16} className="text-blue-400 animate-spin" />
                            )}
                            {updateState.status === 'ready' && (
                                <CheckCircle2 size={16} className="text-emerald-400" />
                            )}
                            {updateState.status === 'error' && (
                                <AlertCircle size={16} className="text-red-400" />
                            )}
                            <span className="text-sm font-medium text-white">
                                {updateState.status === 'checking' && 'Verificando atualização...'}
                                {updateState.status === 'available' && 'Atualização Disponível'}
                                {updateState.status === 'downloading' && 'Baixando atualização...'}
                                {updateState.status === 'ready' && 'Pronto para Instalar'}
                                {updateState.status === 'error' && 'Erro na Atualização'}
                            </span>
                        </div>
                        <button
                            onClick={handleDismiss}
                            className="p-1 rounded-lg hover:bg-white/10 transition-colors text-slate-400 hover:text-white"
                        >
                            <X size={14} />
                        </button>
                    </div>

                    {/* Content */}
                    {updateState.version && (
                        <p className="text-xs mb-3 text-slate-300">
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
                            <div className="w-full h-1.5 bg-slate-700 rounded-full overflow-hidden">
                                <motion.div
                                    className="h-full bg-violet-500"
                                    initial={{ width: 0 }}
                                    animate={{ width: `${updateState.progress}%` }}
                                    transition={{ duration: 0.3 }}
                                />
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 text-right">
                                {updateState.progress.toFixed(0)}%
                            </p>
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-2">
                        {updateState.status === 'available' && (
                            <button
                                onClick={handleDownload}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-violet-600 hover:bg-violet-500 text-white"
                            >
                                <Download size={12} />
                                Baixar Agora
                            </button>
                        )}

                        {updateState.status === 'ready' && (
                            <button
                                onClick={handleInstall}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-emerald-600 hover:bg-emerald-500 text-white"
                            >
                                <RefreshCw size={12} />
                                Reiniciar e Atualizar
                            </button>
                        )}

                        {updateState.status === 'error' && (
                            <button
                                onClick={handleCheckUpdate}
                                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors bg-slate-700 hover:bg-slate-600 text-white"
                            >
                                <RefreshCw size={12} />
                                Tentar Novamente
                            </button>
                        )}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};

export default UpdateNotification;
