import React from "react";
import {
    TrendingUp,
    TrendingDown,
    Calendar,
    Target,
    Award,
    Loader2,
    BarChart3,
    Activity
} from "lucide-react";

export function HistoryTab({
    isLoading,
    historyData,
    weightsData,
    selectedPeriod,
    onChangePeriod,
    error
}) {

    // Calcular estatísticas
    const calculateStats = () => {
        if (historyData.length === 0) {
            return {
                avgCalories: 0,
                avgProtein: 0,
                avgCarbs: 0,
                avgFats: 0,
                daysWithProteinGoal: 0,
                daysWithCaloriesGoal: 0,
                totalDays: 0
            };
        }

        const totalCalories = historyData.reduce((sum, day) => sum + (day.total_calories || 0), 0);
        const totalProtein = historyData.reduce((sum, day) => sum + (day.total_protein || 0), 0);
        const totalCarbs = historyData.reduce((sum, day) => sum + (day.total_carbs || 0), 0);
        const totalFats = historyData.reduce((sum, day) => sum + (day.total_fats || 0), 0);
        
        const daysWithProteinGoal = historyData.filter(day => {
            const goal = day.goals?.daily_protein || 0;
            return goal > 0 && (day.total_protein || 0) >= goal;
        }).length;
        
        const daysWithCaloriesGoal = historyData.filter(day => {
            const goal = day.goals?.daily_calories || 0;
            return goal > 0 && (day.total_calories || 0) >= goal;
        }).length;

        return {
            avgCalories: totalCalories / historyData.length,
            avgProtein: totalProtein / historyData.length,
            avgCarbs: totalCarbs / historyData.length,
            avgFats: totalFats / historyData.length,
            daysWithProteinGoal,
            daysWithCaloriesGoal,
            totalDays: historyData.length
        };
    };

    const stats = calculateStats();

    // Preparar dados para gráficos simples (usando barras CSS)
    const prepareCaloriesChartData = () => {
        return historyData.slice().reverse().map(day => ({
            date: day.date,
            calories: day.total_calories || 0,
            goal: day.goals?.daily_calories || 0
        }));
    };

    const prepareWeightChartData = () => {
        return weightsData.map(entry => ({
            date: entry.date,
            weight: entry.weight
        })).sort((a, b) => a.date.localeCompare(b.date));
    };

    const caloriesData = prepareCaloriesChartData();
    const weightData = prepareWeightChartData();

    // Formatar data para exibição
    const formatDate = (dateStr) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full min-h-[400px]">
                <div className="text-center">
                    <Loader2 size={48} className="animate-spin text-green-400 mx-auto mb-4" />
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>Carregando histórico...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center">
                        <BarChart3 size={20} className="text-green-400" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
                            Histórico
                        </h2>
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Acompanhe sua evolução ao longo do tempo
                        </p>
                    </div>
                </div>
                <div className="flex gap-2">
                    {[7, 30, 90].map((days) => (
                        <button
                            key={days}
                            onClick={() => onChangePeriod?.(days)}
                            className={`px-4 py-2 rounded-xl transition-all duration-300 font-semibold text-sm ${
                                selectedPeriod === days
                                    ? "bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-lg shadow-green-500/25"
                                    : "bg-white/5 hover:bg-white/10 border border-white/10"
                            }`}
                            style={{
                                color: selectedPeriod === days ? 'white' : 'var(--text-secondary)'
                            }}
                        >
                            {days} dias
                        </button>
                    ))}
                </div>
            </div>

            {error && (
                <div className="p-4 bg-red-500/20 border border-red-500/30 rounded-xl">
                    <p className="text-sm text-red-400">{error}</p>
                </div>
            )}

            {/* Estatísticas */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center gap-2 mb-2">
                        <TrendingUp size={16} className="text-orange-400" />
                        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Média Calorias</span>
                    </div>
                    <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {stats.avgCalories.toFixed(0)}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>kcal/dia</div>
                </div>
                
                <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center gap-2 mb-2">
                        <Target size={16} className="text-blue-400" />
                        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Média Proteína</span>
                    </div>
                    <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {stats.avgProtein.toFixed(1)}g
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>por dia</div>
                </div>
                
                <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center gap-2 mb-2">
                        <Award size={16} className="text-green-400" />
                        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Meta Proteína</span>
                    </div>
                    <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {stats.daysWithProteinGoal}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                        de {stats.totalDays} dias
                    </div>
                </div>
                
                <div className="p-4 rounded-xl border" style={{ background: 'var(--bg-secondary)', borderColor: 'var(--border-color)' }}>
                    <div className="flex items-center gap-2 mb-2">
                        <Award size={16} className="text-orange-400" />
                        <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Meta Calorias</span>
                    </div>
                    <div className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
                        {stats.daysWithCaloriesGoal}
                    </div>
                    <div className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                        de {stats.totalDays} dias
                    </div>
                </div>
            </div>

            {/* Gráfico de Calorias */}
            <div className="bg-gradient-to-br from-green-500/10 via-emerald-500/5 to-teal-500/10 rounded-2xl p-6 border border-green-500/20">
                <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                    Calorias por Dia
                </h3>
                
                {caloriesData.length === 0 ? (
                    <div className="text-center py-8">
                        <Calendar size={48} className="mx-auto mb-3 opacity-50" style={{ color: 'var(--text-secondary)' }} />
                        <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                            Nenhum dado disponível para o período selecionado
                        </p>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {caloriesData.map((day, index) => {
                            const percentage = day.goal > 0 ? Math.min(100, (day.calories / day.goal) * 100) : 0;
                            return (
                                <div key={index} className="space-y-1">
                                    <div className="flex items-center justify-between text-sm">
                                        <span style={{ color: 'var(--text-secondary)' }}>{formatDate(day.date)}</span>
                                        <div className="flex items-center gap-3">
                                            <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>
                                                {day.calories.toFixed(0)} kcal
                                            </span>
                                            {day.goal > 0 && (
                                                <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                                                    / {day.goal.toFixed(0)}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="relative w-full h-6 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                                        <div
                                            className={`h-full rounded-full transition-all duration-500 ${
                                                percentage >= 100
                                                    ? "bg-gradient-to-r from-green-400 to-emerald-500"
                                                    : percentage >= 80
                                                    ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                                                    : "bg-gradient-to-r from-orange-400 to-red-500"
                                            }`}
                                            style={{ width: `${Math.min(100, percentage)}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Gráfico de Peso */}
            {weightData.length > 0 && (
                <div className="bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 rounded-2xl p-6 border border-blue-500/20">
                    <h3 className="text-lg font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                        Evolução do Peso
                    </h3>
                    
                    <div className="space-y-3">
                        {weightData.map((entry, index) => {
                            const prevWeight = index > 0 ? weightData[index - 1].weight : null;
                            const diff = prevWeight ? entry.weight - prevWeight : null;
                            
                            return (
                                <div key={index} className="flex items-center justify-between p-3 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                                    <div className="flex items-center gap-3">
                                        <Calendar size={16} style={{ color: 'var(--text-secondary)' }} />
                                        <span className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
                                            {formatDate(entry.date)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        {diff !== null && (
                                            <div className="flex items-center gap-1">
                                                {diff > 0 ? (
                                                    <TrendingUp size={16} className="text-red-400" />
                                                ) : diff < 0 ? (
                                                    <TrendingDown size={16} className="text-green-400" />
                                                ) : null}
                                                <span className={`text-xs font-semibold ${diff > 0 ? 'text-red-400' : diff < 0 ? 'text-green-400' : ''}`}>
                                                    {diff > 0 ? '+' : ''}{diff.toFixed(1)} kg
                                                </span>
                                            </div>
                                        )}
                                        <span className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                                            {entry.weight.toFixed(1)} kg
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {weightData.length === 0 && (
                <div className="bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 rounded-2xl p-6 border border-blue-500/20 text-center">
                    <Activity size={48} className="mx-auto mb-3 opacity-50" style={{ color: 'var(--text-secondary)' }} />
                    <p className="text-sm mb-2" style={{ color: 'var(--text-secondary)' }}>
                        Nenhum registro de peso encontrado
                    </p>
                    <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                        Registre seu peso na aba "Metas" para ver sua evolução aqui
                    </p>
                </div>
            )}
        </div>
    );
}
