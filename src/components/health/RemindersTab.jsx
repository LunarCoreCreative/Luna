import { useState, useEffect } from "react";
import { Bell, BellOff, Clock, Droplet, Coffee, UtensilsCrossed, Plus, X } from "lucide-react";

/**
 * RemindersTab - Componente para gerenciar lembretes de refeições e água
 * Usa Notification API do navegador + localStorage
 */
export const RemindersTab = () => {
    const [reminders, setReminders] = useState({
        breakfast: { enabled: false, time: "08:00" },
        lunch: { enabled: false, time: "12:00" },
        dinner: { enabled: false, time: "19:00" },
        customMeals: [], // Array de lembretes personalizados: [{ id, name, time, enabled }]
        water: { enabled: false, times: ["09:00", "11:00", "14:00", "16:00", "18:00"] }
    });
    const [notificationPermission, setNotificationPermission] = useState("default");
    const [waterCount, setWaterCount] = useState(5);
    const [newCustomMealName, setNewCustomMealName] = useState("");
    const [newCustomMealTime, setNewCustomMealTime] = useState("12:00");

    // Carregar lembretes do localStorage ao montar
    useEffect(() => {
        const saved = localStorage.getItem("luna_health_reminders");
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                // Garantir que customMeals existe
                if (!parsed.customMeals || !Array.isArray(parsed.customMeals)) {
                    parsed.customMeals = [];
                }
                setReminders(parsed);
            } catch (e) {
                console.error("Erro ao carregar lembretes:", e);
            }
        }

        // Verificar permissão de notificações
        if ("Notification" in window) {
            setNotificationPermission(Notification.permission);
        }
    }, []);

    // Salvar lembretes no localStorage quando mudarem
    useEffect(() => {
        localStorage.setItem("luna_health_reminders", JSON.stringify(reminders));
    }, [reminders]);

    // Solicitar permissão de notificações
    const requestNotificationPermission = async () => {
        if (!("Notification" in window)) {
            alert("Seu navegador não suporta notificações.");
            return;
        }

        if (Notification.permission === "default") {
            const permission = await Notification.requestPermission();
            setNotificationPermission(permission);
            if (permission !== "granted") {
                alert("Permissão de notificações negada. Você não receberá lembretes.");
            }
        }
    };

    // Configurar lembretes de refeições
    const setupMealReminders = () => {
        if (notificationPermission !== "granted") {
            requestNotificationPermission();
            return;
        }

        // Limpar intervalos anteriores
        if (window.mealReminderIntervals) {
            window.mealReminderIntervals.forEach(clearInterval);
        }
        window.mealReminderIntervals = [];

        const mealNames = {
            breakfast: "Café da manhã",
            lunch: "Almoço",
            dinner: "Jantar"
        };

        // Configurar refeições padrão
        Object.keys(mealNames).forEach(mealKey => {
            const reminder = reminders[mealKey];
            if (reminder && reminder.enabled) {
                const [hours, minutes] = reminder.time.split(":").map(Number);
                const now = new Date();
                const reminderTime = new Date();
                reminderTime.setHours(hours, minutes, 0, 0);

                // Se já passou hoje, agendar para amanhã
                if (reminderTime < now) {
                    reminderTime.setDate(reminderTime.getDate() + 1);
                }

                const msUntilReminder = reminderTime.getTime() - now.getTime();

                // Agendar notificação
                const timeoutId = setTimeout(() => {
                    new Notification(`🍽️ Hora do ${mealNames[mealKey]}!`, {
                        body: `Não esqueça de registrar sua refeição no Luna Health!`,
                        icon: "/favicon.ico",
                        tag: `meal-${mealKey}`,
                        requireInteraction: false
                    });

                    // Configurar intervalo diário
                    const dailyInterval = setInterval(() => {
                        new Notification(`🍽️ Hora do ${mealNames[mealKey]}!`, {
                            body: `Não esqueça de registrar sua refeição no Luna Health!`,
                            icon: "/favicon.ico",
                            tag: `meal-${mealKey}`,
                            requireInteraction: false
                        });
                    }, 24 * 60 * 60 * 1000); // 24 horas

                    window.mealReminderIntervals.push(dailyInterval);
                }, msUntilReminder);

                window.mealReminderIntervals.push(timeoutId);
            }
        });

        // Configurar refeições personalizadas
        if (reminders.customMeals && Array.isArray(reminders.customMeals)) {
            reminders.customMeals.forEach((customMeal) => {
                if (customMeal.enabled) {
                    const [hours, minutes] = customMeal.time.split(":").map(Number);
                    const now = new Date();
                    const reminderTime = new Date();
                    reminderTime.setHours(hours, minutes, 0, 0);

                    // Se já passou hoje, agendar para amanhã
                    if (reminderTime < now) {
                        reminderTime.setDate(reminderTime.getDate() + 1);
                    }

                    const msUntilReminder = reminderTime.getTime() - now.getTime();

                    // Agendar notificação
                    const timeoutId = setTimeout(() => {
                        new Notification(`🍽️ Hora de ${customMeal.name}!`, {
                            body: `Não esqueça de registrar sua refeição no Luna Health!`,
                            icon: "/favicon.ico",
                            tag: `meal-custom-${customMeal.id}`,
                            requireInteraction: false
                        });

                        // Configurar intervalo diário
                        const dailyInterval = setInterval(() => {
                            new Notification(`🍽️ Hora de ${customMeal.name}!`, {
                                body: `Não esqueça de registrar sua refeição no Luna Health!`,
                                icon: "/favicon.ico",
                                tag: `meal-custom-${customMeal.id}`,
                                requireInteraction: false
                            });
                        }, 24 * 60 * 60 * 1000); // 24 horas

                        window.mealReminderIntervals.push(dailyInterval);
                    }, msUntilReminder);

                    window.mealReminderIntervals.push(timeoutId);
                }
            });
        }
    };

    // Configurar lembretes de água
    const setupWaterReminders = () => {
        if (notificationPermission !== "granted") {
            requestNotificationPermission();
            return;
        }

        // Limpar intervalos anteriores
        if (window.waterReminderIntervals) {
            window.waterReminderIntervals.forEach(clearInterval);
        }
        window.waterReminderIntervals = [];

        if (reminders.water.enabled) {
            reminders.water.times.forEach((timeStr, index) => {
                const [hours, minutes] = timeStr.split(":").map(Number);
                const now = new Date();
                const reminderTime = new Date();
                reminderTime.setHours(hours, minutes, 0, 0);

                // Se já passou hoje, agendar para amanhã
                if (reminderTime < now) {
                    reminderTime.setDate(reminderTime.getDate() + 1);
                }

                const msUntilReminder = reminderTime.getTime() - now.getTime();

                // Agendar notificação
                const timeoutId = setTimeout(() => {
                    new Notification("💧 Hora de beber água!", {
                        body: `Lembre-se de se hidratar! Você tem ${waterCount} lembretes de água configurados hoje.`,
                        icon: "/favicon.ico",
                        tag: `water-${index}`,
                        requireInteraction: false
                    });

                    // Configurar intervalo diário
                    const dailyInterval = setInterval(() => {
                        new Notification("💧 Hora de beber água!", {
                            body: `Lembre-se de se hidratar! Você tem ${waterCount} lembretes de água configurados hoje.`,
                            icon: "/favicon.ico",
                            tag: `water-${index}`,
                            requireInteraction: false
                        });
                    }, 24 * 60 * 60 * 1000); // 24 horas

                    window.waterReminderIntervals.push(dailyInterval);
                }, msUntilReminder);

                window.waterReminderIntervals.push(timeoutId);
            });
        }
    };

    // Atualizar lembretes quando mudarem
    useEffect(() => {
        if (notificationPermission === "granted") {
            setupMealReminders();
            setupWaterReminders();
        }
    }, [reminders, notificationPermission, waterCount]);

    const toggleReminder = (type, subType = null) => {
        setReminders(prev => {
            if (subType) {
                return {
                    ...prev,
                    [type]: {
                        ...prev[type],
                        [subType]: !prev[type][subType]
                    }
                };
            } else {
                return {
                    ...prev,
                    [type]: {
                        ...prev[type],
                        enabled: !prev[type].enabled
                    }
                };
            }
        });
    };

    const updateTime = (type, time) => {
        setReminders(prev => ({
            ...prev,
            [type]: {
                ...prev[type],
                time
            }
        }));
    };

    const updateWaterTimes = (index, time) => {
        setReminders(prev => ({
            ...prev,
            water: {
                ...prev.water,
                times: prev.water.times.map((t, i) => i === index ? time : t)
            }
        }));
    };

    const addWaterReminder = () => {
        setReminders(prev => ({
            ...prev,
            water: {
                ...prev.water,
                times: [...prev.water.times, "12:00"]
            }
        }));
        setWaterCount(prev => prev + 1);
    };

    const removeWaterReminder = (index) => {
        setReminders(prev => ({
            ...prev,
            water: {
                ...prev.water,
                times: prev.water.times.filter((_, i) => i !== index)
            }
        }));
        setWaterCount(prev => Math.max(1, prev - 1));
    };

    // Funções para lembretes personalizados de refeições
    const addCustomMeal = () => {
        if (!newCustomMealName.trim()) {
            alert("Por favor, informe um nome para o lembrete.");
            return;
        }

        const newMeal = {
            id: Date.now().toString(),
            name: newCustomMealName.trim(),
            time: newCustomMealTime,
            enabled: false
        };

        setReminders(prev => ({
            ...prev,
            customMeals: [...(prev.customMeals || []), newMeal]
        }));

        setNewCustomMealName("");
        setNewCustomMealTime("12:00");
    };

    const removeCustomMeal = (id) => {
        setReminders(prev => ({
            ...prev,
            customMeals: (prev.customMeals || []).filter(meal => meal.id !== id)
        }));
    };

    const toggleCustomMeal = (id) => {
        setReminders(prev => ({
            ...prev,
            customMeals: (prev.customMeals || []).map(meal =>
                meal.id === id ? { ...meal, enabled: !meal.enabled } : meal
            )
        }));
    };

    const updateCustomMealTime = (id, time) => {
        setReminders(prev => ({
            ...prev,
            customMeals: (prev.customMeals || []).map(meal =>
                meal.id === id ? { ...meal, time } : meal
            )
        }));
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex items-center gap-3 mb-6">
                <Bell className="w-6 h-6 text-green-500" />
                <h2 className="text-2xl font-bold text-white">Lembretes</h2>
            </div>

            {/* Permissão de Notificações */}
            {notificationPermission !== "granted" && (
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-yellow-200 font-medium mb-1">Permissão de Notificações Necessária</p>
                            <p className="text-yellow-300/80 text-sm">Para receber lembretes, você precisa permitir notificações do navegador.</p>
                        </div>
                        <button
                            onClick={requestNotificationPermission}
                            className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-medium transition-colors"
                        >
                            Permitir
                        </button>
                    </div>
                </div>
            )}

            {/* Lembretes de Refeições */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                    <UtensilsCrossed className="w-5 h-5 text-green-400" />
                    Lembretes de Refeições
                </h3>
                <div className="space-y-4">
                    {[
                        { key: "breakfast", label: "Café da manhã", icon: Coffee },
                        { key: "lunch", label: "Almoço", icon: UtensilsCrossed },
                        { key: "dinner", label: "Jantar", icon: UtensilsCrossed }
                    ].map(({ key, label, icon: Icon }) => (
                        <div key={key} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                            <div className="flex items-center gap-3">
                                <Icon className="w-5 h-5 text-green-400" />
                                <span className="text-white font-medium">{label}</span>
                            </div>
                            <div className="flex items-center gap-4">
                                <input
                                    type="time"
                                    value={reminders[key].time}
                                    onChange={(e) => updateTime(key, e.target.value)}
                                    disabled={!reminders[key].enabled}
                                    className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                />
                                <button
                                    onClick={() => toggleReminder(key)}
                                    className={`p-2 rounded-lg transition-colors ${
                                        reminders[key].enabled
                                            ? "bg-green-500 hover:bg-green-600 text-white"
                                            : "bg-white/10 hover:bg-white/20 text-white/60"
                                    }`}
                                >
                                    {reminders[key].enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                                </button>
                            </div>
                        </div>
                    ))}
                    
                    {/* Lembretes Personalizados */}
                    {reminders.customMeals && reminders.customMeals.length > 0 && (
                        <div className="mt-6 pt-6 border-t border-white/10">
                            <h4 className="text-sm font-semibold text-white/80 mb-4">Lembretes Personalizados</h4>
                            <div className="space-y-3">
                                {reminders.customMeals.map((customMeal) => (
                                    <div key={customMeal.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg">
                                        <div className="flex items-center gap-3 flex-1">
                                            <UtensilsCrossed className="w-5 h-5 text-green-400" />
                                            <input
                                                type="text"
                                                value={customMeal.name}
                                                readOnly
                                                className="flex-1 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white"
                                                style={{ color: 'var(--text-primary)' }}
                                            />
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <input
                                                type="time"
                                                value={customMeal.time}
                                                onChange={(e) => updateCustomMealTime(customMeal.id, e.target.value)}
                                                disabled={!customMeal.enabled}
                                                className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                            <button
                                                onClick={() => toggleCustomMeal(customMeal.id)}
                                                className={`p-2 rounded-lg transition-colors ${
                                                    customMeal.enabled
                                                        ? "bg-green-500 hover:bg-green-600 text-white"
                                                        : "bg-white/10 hover:bg-white/20 text-white/60"
                                                }`}
                                            >
                                                {customMeal.enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                                            </button>
                                            <button
                                                onClick={() => removeCustomMeal(customMeal.id)}
                                                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                            >
                                                <X className="w-5 h-5" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Adicionar Lembrete Personalizado */}
                    <div className="mt-4 pt-4 border-t border-white/10">
                        <div className="flex items-center gap-3 p-4 bg-white/5 rounded-lg">
                            <UtensilsCrossed className="w-5 h-5 text-green-400" />
                            <input
                                type="text"
                                value={newCustomMealName}
                                onChange={(e) => setNewCustomMealName(e.target.value)}
                                onKeyPress={(e) => {
                                    if (e.key === 'Enter') {
                                        addCustomMeal();
                                    }
                                }}
                                placeholder="Nome do lembrete (ex: Lanche da tarde)"
                                className="flex-1 px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40"
                                style={{ color: 'var(--text-primary)' }}
                            />
                            <input
                                type="time"
                                value={newCustomMealTime}
                                onChange={(e) => setNewCustomMealTime(e.target.value)}
                                className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white"
                            />
                            <button
                                onClick={addCustomMeal}
                                className="flex items-center gap-2 px-4 py-1.5 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors font-medium"
                            >
                                <Plus size={16} />
                                Adicionar
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Lembretes de Água */}
            <div className="bg-white/5 rounded-xl p-6 border border-white/10">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                        <Droplet className="w-5 h-5 text-blue-400" />
                        Lembretes de Água
                    </h3>
                    <button
                        onClick={() => toggleReminder("water")}
                        className={`p-2 rounded-lg transition-colors ${
                            reminders.water.enabled
                                ? "bg-blue-500 hover:bg-blue-600 text-white"
                                : "bg-white/10 hover:bg-white/20 text-white/60"
                        }`}
                    >
                        {reminders.water.enabled ? <Bell className="w-5 h-5" /> : <BellOff className="w-5 h-5" />}
                    </button>
                </div>
                {reminders.water.enabled && (
                    <div className="space-y-3">
                        {reminders.water.times.map((time, index) => (
                            <div key={index} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg">
                                <Clock className="w-4 h-4 text-blue-400" />
                                <input
                                    type="time"
                                    value={time}
                                    onChange={(e) => updateWaterTimes(index, e.target.value)}
                                    className="px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white flex-1"
                                />
                                {reminders.water.times.length > 1 && (
                                    <button
                                        onClick={() => removeWaterReminder(index)}
                                        className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                    >
                                        ×
                                    </button>
                                )}
                            </div>
                        ))}
                        <button
                            onClick={addWaterReminder}
                            className="w-full py-2 text-blue-400 hover:bg-blue-500/20 rounded-lg border border-blue-500/30 transition-colors font-medium"
                        >
                            + Adicionar Lembrete de Água
                        </button>
                    </div>
                )}
            </div>

            <div className="text-sm text-white/60 text-center">
                💡 Os lembretes são salvos localmente no seu navegador e funcionam mesmo quando você fechar a aba.
            </div>
        </div>
    );
};
