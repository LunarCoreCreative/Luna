import { TrendingUp, Target, BarChart3, Circle } from "lucide-react";

/**
 * Tab de Resumo - Modularizado
 */
export function SummaryTab({ summary }) {
    return (
        <div className="space-y-8">
            <div className="grid grid-cols-4 gap-5">
                <div className="group relative p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-2xl overflow-hidden" 
                     style={{ 
                         background: 'linear-gradient(135deg, rgba(251, 146, 60, 0.1) 0%, rgba(251, 146, 60, 0.05) 100%)',
                         borderColor: 'rgba(251, 146, 60, 0.2)'
                     }}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center shadow-lg shadow-orange-500/20">
                                <TrendingUp size={20} className="text-white" />
                            </div>
                            <div className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Calorias</div>
                        </div>
                        <div className="text-4xl font-bold mb-1 bg-gradient-to-r from-orange-400 to-orange-600 bg-clip-text text-transparent">
                            {summary.total_calories.toFixed(0)}
                        </div>
                        {summary.goals?.daily_calories && (
                            <div className="text-xs font-medium mt-2" style={{ color: 'var(--text-secondary)' }}>
                                de {summary.goals.daily_calories.toFixed(0)} kcal
                            </div>
                        )}
                    </div>
                </div>
                <div className="group relative p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-2xl overflow-hidden" 
                     style={{ 
                         background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(59, 130, 246, 0.05) 100%)',
                         borderColor: 'rgba(59, 130, 246, 0.2)'
                     }}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
                                <Target size={20} className="text-white" />
                            </div>
                            <div className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Proteínas</div>
                        </div>
                        <div className="text-4xl font-bold mb-1 bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                            {summary.total_protein.toFixed(1)}g
                        </div>
                        {summary.goals?.daily_protein && (
                            <div className="text-xs font-medium mt-2" style={{ color: 'var(--text-secondary)' }}>
                                de {summary.goals.daily_protein.toFixed(1)}g
                            </div>
                        )}
                    </div>
                </div>
                <div className="group relative p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-2xl overflow-hidden" 
                     style={{ 
                         background: 'linear-gradient(135deg, rgba(168, 85, 247, 0.1) 0%, rgba(168, 85, 247, 0.05) 100%)',
                         borderColor: 'rgba(168, 85, 247, 0.2)'
                     }}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center shadow-lg shadow-purple-500/20">
                                <BarChart3 size={20} className="text-white" />
                            </div>
                            <div className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Carboidratos</div>
                        </div>
                        <div className="text-4xl font-bold mb-1 bg-gradient-to-r from-purple-400 to-purple-600 bg-clip-text text-transparent">
                            {summary.total_carbs.toFixed(1)}g
                        </div>
                        {summary.goals?.daily_carbs && (
                            <div className="text-xs font-medium mt-2" style={{ color: 'var(--text-secondary)' }}>
                                de {summary.goals.daily_carbs.toFixed(1)}g
                            </div>
                        )}
                    </div>
                </div>
                <div className="group relative p-6 rounded-2xl border-2 transition-all duration-300 hover:scale-105 hover:shadow-2xl overflow-hidden" 
                     style={{ 
                         background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.1) 0%, rgba(234, 179, 8, 0.05) 100%)',
                         borderColor: 'rgba(234, 179, 8, 0.2)'
                     }}>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-yellow-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10">
                        <div className="flex items-center gap-2 mb-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center shadow-lg shadow-yellow-500/20">
                                <Circle size={20} className="text-white" />
                            </div>
                            <div className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Gorduras</div>
                        </div>
                        <div className="text-4xl font-bold mb-1 bg-gradient-to-r from-yellow-400 to-yellow-600 bg-clip-text text-transparent">
                            {summary.total_fats.toFixed(1)}g
                        </div>
                        {summary.goals?.daily_fats && (
                            <div className="text-xs font-medium mt-2" style={{ color: 'var(--text-secondary)' }}>
                                de {summary.goals.daily_fats.toFixed(1)}g
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="relative p-8 rounded-2xl border-2 overflow-hidden backdrop-blur-xl" 
                 style={{ 
                     background: 'linear-gradient(135deg, var(--bg-tertiary) 0%, var(--bg-secondary) 100%)',
                     borderColor: 'var(--border-color)'
                 }}>
                <div className="absolute top-0 right-0 w-64 h-64 bg-green-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center shadow-lg shadow-green-500/20">
                            <BarChart3 size={24} className="text-white" />
                        </div>
                        <h3 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Resumo do Dia</h3>
                    </div>
                    <div className="space-y-5">
                        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Refeições registradas</span>
                                <span className="text-2xl font-bold bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">{summary.meals_count}</span>
                            </div>
                        </div>
                        {summary.goals?.daily_calories && (
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10">
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-sm font-semibold uppercase tracking-wider" style={{ color: 'var(--text-secondary)' }}>Calorias restantes</span>
                                    <span className="text-xl font-bold" style={{
                                        color: summary.remaining_calories >= 0 ? '#4ade80' : '#f87171'
                                    }}>
                                        {summary.remaining_calories.toFixed(0)} kcal
                                    </span>
                                </div>
                                <div className="relative w-full h-3 bg-white/10 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 rounded-full ${
                                            summary.remaining_calories >= 0 
                                                ? "bg-gradient-to-r from-green-400 to-emerald-500" 
                                                : "bg-gradient-to-r from-red-400 to-red-500"
                                        } shadow-lg`}
                                        style={{
                                            width: `${Math.min(100, Math.max(0, (summary.total_calories / (summary.goals.daily_calories || 1)) * 100))}%`
                                        }}
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
