import React from 'react';
import { motion } from 'framer-motion';

export const Button = ({
    children,
    variant = 'primary',
    className = '',
    isLoading = false,
    ...props
}) => {
    const baseStyles = "px-6 py-3 rounded-xl font-semibold disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors duration-300";

    const variants = {
        primary: "bg-white text-slate-950 hover:bg-slate-200 shadow-lg shadow-white/5",
        secondary: "bg-slate-800 text-white hover:bg-slate-700 border border-slate-700",
        ghost: "bg-transparent text-slate-400 hover:text-white hover:bg-slate-800/50",
        outline: "bg-transparent text-white border border-slate-700 hover:bg-slate-800 hover:border-slate-600",
        danger: "bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20"
    };

    return (
        <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className={`
                ${baseStyles} ${variants[variant]} ${className}
                focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
            `}
            disabled={isLoading || props.disabled}
            aria-busy={isLoading}
            {...props}
        >
            {isLoading ? (
                <div role="status" aria-live="polite" className="flex items-center gap-2">
                    <motion.svg
                        aria-hidden="true"
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                    >
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </motion.svg>
                    <span className="sr-only">Carregando...</span>
                    <span aria-hidden="true" className="opacity-80">Aguarde...</span>
                </div>
            ) : children}
        </motion.button>
    );
};
