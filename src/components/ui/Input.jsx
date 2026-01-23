import React, { useId } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2 } from 'lucide-react';

export const Input = ({
    label,
    error,
    success,
    icon: Icon,
    className = '',
    id,
    ...props
}) => {
    const generatedId = useId();
    const inputId = id || generatedId;
    const errorId = `${inputId}-error`;

    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && (
                <motion.label
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    htmlFor={inputId}
                    className="text-sm font-medium text-slate-400 ml-1 cursor-pointer"
                >
                    {label}
                </motion.label>
            )}
            <motion.div
                className="relative group"
                animate={error ? { x: [-2, 2, -2, 2, 0] } : {}}
                transition={{ duration: 0.4 }}
            >
                {Icon && (
                    <div
                        aria-hidden="true"
                        className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors duration-300 
                        ${error ? 'text-red-400' : success ? 'text-emerald-400' : 'text-slate-500 group-focus-within:text-indigo-400'}`}
                    >
                        <Icon size={20} />
                    </div>
                )}
                <input
                    id={inputId}
                    aria-invalid={!!error}
                    aria-describedby={error ? errorId : undefined}
                    aria-disabled={props.disabled}
                    className={`
                        w-full bg-slate-900/50 text-white placeholder-slate-600
                        border rounded-xl px-4 py-3.5
                        ${Icon ? 'pl-11' : ''}
                        ${success ? 'pr-11' : ''}
                        ${error
                            ? 'border-red-500 ring-1 ring-red-500/20'
                            : success
                                ? 'border-emerald-500/50 ring-1 ring-emerald-500/10'
                                : 'border-slate-800 focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/50'}
                        focus:outline-none focus:bg-slate-900
                        transition-all duration-300
                        disabled:opacity-50 disabled:bg-slate-950
                        focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950
                    `}
                    {...props}
                />
                {success && !error && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-emerald-500"
                        aria-hidden="true"
                    >
                        <CheckCircle2 size={18} />
                    </motion.div>
                )}
            </motion.div>
            <AnimatePresence>
                {error && (
                    <motion.span
                        id={errorId}
                        role="alert"
                        aria-live="polite"
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="text-xs text-red-500/80 ml-1 mt-0.5 font-medium"
                    >
                        {error}
                    </motion.span>
                )}
            </AnimatePresence>
        </div>
    );
};
