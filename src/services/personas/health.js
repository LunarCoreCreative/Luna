/**
 * Persona Nutricionista (Health)
 * Foco: Alimentação, Metas, Saúde
 */

const HEALTH_SYSTEM_PROMPT = `Você é Luna Health, uma nutricionista inteligente e carinhosa integrada ao sistema de saúde da Luna.

SUA MISSÃO:
Ajudar o usuário a ter uma alimentação saudável e balanceada, registrando refeições, acompanhando metas nutricionais e oferecendo orientações personalizadas.

DIRETRIZES DE PERSONALIDADE:
- Seja carinhosa, encorajadora e profissional, como uma nutricionista de confiança.
- Use linguagem natural e acessível.
- Celebre pequenas vitórias e seja positiva sobre progressos.
- Ofereça sugestões práticas e realistas.

FERRAMENTAS DISPONÍVEIS:
- search_food: Busca informações nutricionais.
- add_meal: Registra refeições consumidas. Use SEMPRE que o usuário disser que comeu.
- get_nutrition_summary: Mostra o resumo do dia (calorias, macros). Use proativamente ("como estou indo?").
- update_goals: Define metas nutricionais.
- suggest_goals: Calcula metas baseadas em peso/altura/objetivo.
- create_meal_plan: Cria planos alimentares completos.

REGRAS:
1. Sempre contextualize os números (ex: "45g de proteína, o que é ótimo para seu objetivo").
2. Se o usuário mencionar porções (fatias, xícaras), use os parâmetros portion_type/quantity.
3. Sugira periodicamente revisar as metas.`;

export const healthPersona = {
    id: 'health',
    name: 'Nutricionista',
    description: 'Acompanhamento nutricional e metas de saúde',
    icon: 'Heart', // Lucide icon name
    colors: {
        primary: 'rose',
        gradient: 'from-rose-500 to-pink-600',
        border: 'border-rose-500/30',
        text: 'text-rose-400',
        bg: 'bg-rose-500/10'
    },

    getSystemPrompt: (context = {}) => {
        const now = new Date();
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

        return `${HEALTH_SYSTEM_PROMPT}

[CONTEXTO TEMPORAL]
Data atual: ${now.toLocaleDateString('pt-BR', dateOptions)}.
Hora atual: ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`;
    },

    tools: [
        {
            type: "function",
            function: {
                name: "add_meal",
                description: "Registra uma refeição consumida.",
                parameters: {
                    type: "object",
                    properties: {
                        name: { type: "string", description: "Nome do alimento/refeição" },
                        meal_type: { type: "string", enum: ["breakfast", "lunch", "dinner", "snack"] },
                        portion_type: { type: "string", description: "Unidade (fatia, xícara, unidade)" },
                        portion_quantity: { type: "number", description: "Quantidade da porção" },
                        grams: { type: "number", description: "Quantidade em gramas (opcional)" },
                        date: { type: "string" }
                    },
                    required: ["name"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "search_food",
                description: "Busca informações nutricionais de um alimento.",
                parameters: {
                    type: "object",
                    properties: {
                        query: { type: "string" }
                    },
                    required: ["query"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "get_nutrition_summary",
                description: "Obtém resumo nutricional do dia ou período.",
                parameters: {
                    type: "object",
                    properties: {
                        date: { type: "string" },
                        period: { type: "string", enum: ["day", "week", "month"] }
                    }
                }
            }
        },
        {
            type: "function",
            function: {
                name: "update_goals",
                description: "Atualiza metas nutricionais (calorias, peso, macros).",
                parameters: {
                    type: "object",
                    properties: {
                        calories: { type: "number" },
                        protein: { type: "number" },
                        carbs: { type: "number" },
                        fats: { type: "number" },
                        weight_goal: { type: "number" }
                    }
                }
            }
        },
        {
            type: "function",
            function: {
                name: "suggest_goals",
                description: "Calcula e sugere metas ideais baseadas em dados biométricos.",
                parameters: {
                    type: "object",
                    properties: {
                        weight: { type: "number" },
                        height: { type: "number" },
                        age: { type: "number" },
                        gender: { type: "string", enum: ["male", "female"] },
                        goal: { type: "string", enum: ["lose", "maintain", "gain", "hypertrophy"] },
                        activity_level: { type: "string", enum: ["sedentary", "light", "moderate", "active", "very_active"] }
                    },
                    required: ["weight", "height", "age", "gender", "goal", "activity_level"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "create_meal_plan",
                description: "Cria um plano alimentar com múltiplos presets.",
                parameters: {
                    type: "object",
                    properties: {
                        name: { type: "string" },
                        presets: {
                            type: "array",
                            items: {
                                type: "object",
                                properties: {
                                    name: { type: "string" },
                                    meal_type: { type: "string" },
                                    foods: { type: "array", items: { type: "object" } }
                                }
                            }
                        }
                    },
                    required: ["presets"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "remember",
                description: "Busca memórias sobre saúde ou preferências alimentares.",
                parameters: {
                    type: "object",
                    properties: { query: { type: "string" } },
                    required: ["query"]
                }
            }
        }
    ]
};
