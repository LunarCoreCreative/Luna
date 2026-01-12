import { useEffect, useState } from "react";
import { Loader2, Sparkles, Brain, Zap, CheckCircle2, X } from "lucide-react";

/**
 * Componente de feedback de carregamento com mensagens dinâmicas
 * @param {string} message - Mensagem principal
 * @param {string} subMessage - Mensagem secundária (opcional)
 * @param {string} type - Tipo: 'loading' | 'analyzing' | 'processing' | 'success'
 * @param {boolean} showProgress - Mostrar barra de progresso animada
 */
export function LoadingFeedback({ 
    message = "Carregando...", 
    subMessage = null,
    type = "loading",
    showProgress = false,
    size = "default" 
}) {
    const [progress, setProgress] = useState(0);
    const [dots, setDots] = useState("");

    // Animação de pontos
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(prev => {
                if (prev.length >= 3) return "";
                return prev + ".";
            });
        }, 500);
        return () => clearInterval(interval);
    }, []);

    // Animação de progresso
    useEffect(() => {
        if (!showProgress) return;
        
        const interval = setInterval(() => {
            setProgress(prev => {
                if (prev >= 95) return 95; // Para em 95% até completar
                return prev + Math.random() * 10;
            });
        }, 200);
        
        return () => clearInterval(interval);
    }, [showProgress]);

    const iconSize = size === "large" ? 48 : size === "small" ? 24 : 32;
    const textSize = size === "large" ? "text-lg" : size === "small" ? "text-sm" : "text-base";

    const getIcon = () => {
        switch (type) {
            case "analyzing":
                return <Brain size={iconSize} className="text-violet-400 animate-pulse" />;
            case "processing":
                return <Sparkles size={iconSize} className="text-blue-400 animate-spin" />;
            case "success":
                return <CheckCircle2 size={iconSize} className="text-green-400" />;
            default:
                return <Loader2 size={iconSize} className="text-violet-500 animate-spin" />;
        }
    };

    const getGradient = () => {
        switch (type) {
            case "analyzing":
                return "from-violet-500/20 to-purple-500/20 border-violet-500/30";
            case "processing":
                return "from-blue-500/20 to-cyan-500/20 border-blue-500/30";
            case "success":
                return "from-green-500/20 to-emerald-500/20 border-green-500/30";
            default:
                return "from-violet-500/20 to-blue-500/20 border-violet-500/30";
        }
    };

    return (
        <div className={`flex flex-col items-center justify-center gap-4 p-6 rounded-2xl bg-gradient-to-br ${getGradient()} border backdrop-blur-md shadow-xl`}>
            <div className="relative">
                {/* Glow effect */}
                <div className={`absolute inset-0 rounded-full bg-${type === "analyzing" ? "violet" : type === "processing" ? "blue" : "violet"}-500/20 blur-xl animate-pulse`} />
                <div className="relative z-10">
                    {getIcon()}
                </div>
            </div>
            
            <div className="text-center space-y-2">
                <h3 className={`font-semibold ${textSize} text-white flex items-center justify-center gap-2`}>
                    {message}
                    {type !== "success" && <span className="text-violet-400">{dots}</span>}
                </h3>
                {subMessage && (
                    <p className="text-sm text-gray-400 animate-pulse">
                        {subMessage}
                    </p>
                )}
            </div>

            {showProgress && (
                <div className="w-full max-w-xs space-y-2">
                    <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div 
                            className="h-full bg-gradient-to-r from-violet-500 to-blue-500 rounded-full transition-all duration-300 shadow-lg shadow-violet-500/50"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                    <p className="text-xs text-center text-gray-400">
                        {Math.round(progress)}% concluído
                    </p>
                </div>
            )}
        </div>
    );
}

/**
 * Overlay de loading fullscreen
 */
export function LoadingOverlay({ message, subMessage, type = "loading" }) {
    return (
        <div className="fixed inset-0 z-[9999] bg-[var(--bg-primary)]/95 backdrop-blur-sm flex items-center justify-center">
            <LoadingFeedback 
                message={message} 
                subMessage={subMessage}
                type={type}
                size="large"
                showProgress={type === "loading"}
            />
        </div>
    );
}

/**
 * Toast de loading compacto
 */
export function LoadingToast({ message, type = "loading", onClose }) {
    return (
        <div className="fixed bottom-4 right-4 z-50 animate-in slide-in-from-right-5 fade-in duration-300">
            <div className="glass-panel px-4 py-3 rounded-xl border border-violet-500/30 shadow-lg shadow-violet-500/10 flex items-center gap-3 max-w-sm">
                <div className="relative">
                    {type === "analyzing" ? (
                        <Brain size={20} className="text-violet-400 animate-pulse" />
                    ) : (
                        <Loader2 size={20} className="text-violet-400 animate-spin" />
                    )}
                </div>
                <div className="flex-1 min-w-0">
                    <div className="text-sm text-white font-medium">{message}</div>
                </div>
                {onClose && (
                    <button 
                        onClick={onClose}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                    >
                        <X size={14} className="text-gray-400" />
                    </button>
                )}
            </div>
        </div>
    );
}
