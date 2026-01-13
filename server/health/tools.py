"""
Luna Health Tools
-----------------
Agent tools for health/nutrition management via chat.
"""

from typing import Dict, Optional, List

from .storage import (
    add_meal as storage_add_meal,
    update_meal as storage_update_meal,
    delete_meal as storage_delete_meal,
    load_meals,
    get_summary as storage_get_summary,
    get_summaries_by_range,
    get_goals,
    update_goals as storage_update_goals,
    get_weights,
    add_weight,
    delete_weight,
    get_notifications,
    mark_notification_read
)
from .foods import (
    search_foods,
    get_food_nutrition,
    add_food_manually,
    try_find_or_add_food
)
from .profiles import (
    get_health_profile
)
from .meal_presets import (
    get_presets,
    create_preset,
    update_preset,
    delete_preset,
    get_preset_by_id,
    MEAL_TYPES
)

# =============================================================================
# TOOL DEFINITIONS
# =============================================================================

HEALTH_TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "add_meal",
            "description": "Registra uma REFEIÇÃO consumida pelo usuário. Use APENAS quando o usuário mencionar que COMEU uma refeição completa (ex: 'comi linguiça no almoço', 'jantei arroz e feijão'). NÃO use para apenas pesquisar informações nutricionais de alimentos. Para isso, use 'search_food' ou 'add_food'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Nome da refeição ou descrição dos alimentos (ex: 'Café da manhã', 'Arroz, feijão e frango', 'Salada Caesar')"
                    },
                    "meal_type": {
                        "type": "string",
                        "enum": ["breakfast", "lunch", "dinner", "snack"],
                        "description": "Tipo de refeição: 'breakfast' (café da manhã), 'lunch' (almoço), 'dinner' (jantar), 'snack' (lanche)"
                    },
                    "calories": {
                        "type": "number",
                        "description": "Calorias da refeição (opcional)"
                    },
                    "protein": {
                        "type": "number",
                        "description": "Proteínas em gramas (opcional)"
                    },
                    "carbs": {
                        "type": "number",
                        "description": "Carboidratos em gramas (opcional)"
                    },
                    "fats": {
                        "type": "number",
                        "description": "Gorduras em gramas (opcional)"
                    },
                    "notes": {
                        "type": "string",
                        "description": "Observações adicionais sobre a refeição (opcional)"
                    },
                    "date": {
                        "type": "string",
                        "description": "Data da refeição no formato YYYY-MM-DD (opcional, padrão é hoje)"
                    },
                    "grams": {
                        "type": "number",
                        "description": "Quantidade em gramas (opcional, use se souber o peso exato)"
                    },
                    "portion_type": {
                        "type": "string",
                        "description": "Tipo de porção (ex: 'fatia', 'xícara', 'colher de sopa', 'unidade') - opcional, use quando o usuário mencionar porções ao invés de gramas"
                    },
                    "portion_quantity": {
                        "type": "number",
                        "description": "Quantidade de porções (ex: 2 para '2 fatias') - opcional, padrão é 1.0"
                    }
                },
                "required": ["name", "meal_type"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "edit_meal",
            "description": "Edita uma refeição já registrada. Use quando o usuário quiser corrigir informações de uma refeição (nome, tipo, valores nutricionais, etc). Necessita do meal_id da refeição (obtido via list_meals).",
            "parameters": {
                "type": "object",
                "properties": {
                    "meal_id": {
                        "type": "string",
                        "description": "ID da refeição a ser editada"
                    },
                    "name": {
                        "type": "string",
                        "description": "Novo nome/descrição (opcional)"
                    },
                    "meal_type": {
                        "type": "string",
                        "enum": ["breakfast", "lunch", "dinner", "snack"],
                        "description": "Novo tipo de refeição (opcional)"
                    },
                    "calories": {
                        "type": "number",
                        "description": "Novas calorias (opcional)"
                    },
                    "protein": {
                        "type": "number",
                        "description": "Novas proteínas em gramas (opcional)"
                    },
                    "carbs": {
                        "type": "number",
                        "description": "Novos carboidratos em gramas (opcional)"
                    },
                    "fats": {
                        "type": "number",
                        "description": "Novas gorduras em gramas (opcional)"
                    },
                    "notes": {
                        "type": "string",
                        "description": "Novas observações (opcional)"
                    }
                },
                "required": ["meal_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_meal",
            "description": "Remove uma refeição registrada incorretamente.",
            "parameters": {
                "type": "object",
                "properties": {
                    "meal_id": {
                        "type": "string",
                        "description": "ID da refeição a remover"
                    }
                },
                "required": ["meal_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_meals",
            "description": "Lista refeições recentes do usuário. Pode filtrar por data específica ou limitar número de resultados. Use para mostrar histórico de refeições ou obter IDs para edição/remoção.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Número máximo de refeições a retornar (padrão: 10)"
                    },
                    "date": {
                        "type": "string",
                        "description": "Filtrar por data no formato YYYY-MM-DD (opcional)"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_nutrition_summary",
            "description": "Retorna o resumo nutricional do dia (calorias, macros consumidos, metas, etc). Use para análises do dia atual ou de um dia específico.",
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {
                        "type": "string",
                        "description": "Data no formato YYYY-MM-DD (opcional, padrão é hoje)"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_nutrition_history",
            "description": "Retorna resumos nutricionais de múltiplos dias (histórico). Use quando o usuário perguntar sobre progresso de longo prazo, como 'como estou indo?', 'como foi minha semana?', 'estou melhorando?', ou qualquer análise de múltiplos dias. Permite calcular médias, contar dias que atingiu metas, identificar tendências, etc.",
            "parameters": {
                "type": "object",
                "properties": {
                    "start_date": {
                        "type": "string",
                        "description": "Data inicial no formato YYYY-MM-DD (obrigatório)"
                    },
                    "end_date": {
                        "type": "string",
                        "description": "Data final no formato YYYY-MM-DD (obrigatório, inclusiva). Use a data de hoje para análises até hoje."
                    }
                },
                "required": ["start_date", "end_date"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "update_goals",
            "description": "Define ou atualiza metas nutricionais do usuário (calorias diárias, macros, peso, etc).",
            "parameters": {
                "type": "object",
                "properties": {
                    "daily_calories": {
                        "type": "number",
                        "description": "Meta de calorias diárias (opcional)"
                    },
                    "daily_protein": {
                        "type": "number",
                        "description": "Meta de proteínas diárias em gramas (opcional)"
                    },
                    "daily_carbs": {
                        "type": "number",
                        "description": "Meta de carboidratos diários em gramas (opcional)"
                    },
                    "daily_fats": {
                        "type": "number",
                        "description": "Meta de gorduras diárias em gramas (opcional)"
                    },
                    "target_weight": {
                        "type": "number",
                        "description": "Peso alvo em kg (opcional)"
                    },
                    "current_weight": {
                        "type": "number",
                        "description": "Peso atual em kg (opcional)"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_goals",
            "description": "Retorna as metas nutricionais atuais do usuário.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_food",
            "description": "Busca alimentos no banco de dados. Use quando o usuário perguntar sobre informações nutricionais de um alimento específico (ex: 'quantas calorias tem linguiça?', 'informações de frango'). Retorna lista de alimentos que correspondem à busca.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Termo de busca (nome do alimento, ex: 'linguiça', 'frango', 'arroz')"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Número máximo de resultados (padrão: 10)"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_food_nutrition",
            "description": "Obtém informações nutricionais detalhadas de um alimento específico. Se não encontrar no banco de dados, pesquisa automaticamente na internet e adiciona ao banco. Use quando o usuário perguntar sobre valores nutricionais específicos de um alimento.",
            "parameters": {
                "type": "object",
                "properties": {
                    "food_name": {
                        "type": "string",
                        "description": "Nome do alimento (ex: 'linguiça', 'frango grelhado', 'arroz branco')"
                    },
                    "search_online": {
                        "type": "boolean",
                        "description": "Se deve pesquisar na internet se não encontrar no banco (padrão: true)"
                    }
                },
                "required": ["food_name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_food",
            "description": "Adiciona um novo alimento ao banco de dados. Se o alimento não existir e os valores nutricionais não forem fornecidos, pesquisa automaticamente na internet. Use quando o usuário mencionar um alimento que não está no banco ou pedir para adicionar um alimento.",
            "parameters": {
                "type": "object",
                "properties": {
                    "food_name": {
                        "type": "string",
                        "description": "Nome do alimento a adicionar (ex: 'linguiça', 'hambúrguer', 'batata frita')"
                    },
                    "calories": {
                        "type": "number",
                        "description": "Calorias por 100g (opcional - se não fornecido, pesquisa na internet)"
                    },
                    "protein": {
                        "type": "number",
                        "description": "Proteínas em gramas por 100g (opcional)"
                    },
                    "carbs": {
                        "type": "number",
                        "description": "Carboidratos em gramas por 100g (opcional)"
                    },
                    "fats": {
                        "type": "number",
                        "description": "Gorduras em gramas por 100g (opcional)"
                    }
                },
                "required": ["food_name"]
            }
        }
    },
    # =========================================================================
    # MEAL PLAN / PRESETS TOOLS
    # =========================================================================
    {
        "type": "function",
        "function": {
            "name": "list_meal_presets",
            "description": "Lista todos os presets de refeições do plano alimentar do usuário. Use quando o usuário perguntar sobre seu plano alimentar, refeições programadas, ou quiser ver os presets disponíveis.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_meal_preset",
            "description": "Cria um novo preset de refeição no plano alimentar. Use quando o usuário pedir para criar uma refeição planejada ou adicionar algo ao plano alimentar. Exemplo: 'cria um preset de café da manhã com ovos e aveia' ou 'adiciona um lanche pré-treino no meu plano'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Nome descritivo do preset (ex: 'Café da manhã com ovos e aveia', 'Lanche pré-treino energético')"
                    },
                    "meal_type": {
                        "type": "string",
                        "enum": ["breakfast", "morning_snack", "lunch", "afternoon_snack", "pre_workout", "post_workout", "dinner", "supper", "snack"],
                        "description": "Tipo de refeição: breakfast (café da manhã), morning_snack (lanche da manhã), lunch (almoço), afternoon_snack (lanche da tarde), pre_workout (pré-treino), post_workout (pós-treino), dinner (jantar), supper (ceia), snack (lanche genérico)"
                    },
                    "foods": {
                        "type": "array",
                        "description": "Lista de alimentos do preset. Cada item deve ter food_name, quantity (em gramas), e opcionalmente calories, protein, carbs, fats",
                        "items": {
                            "type": "object",
                            "properties": {
                                "food_name": {"type": "string", "description": "Nome do alimento"},
                                "quantity": {"type": "number", "description": "Quantidade em gramas"},
                                "calories": {"type": "number", "description": "Calorias (opcional)"},
                                "protein": {"type": "number", "description": "Proteínas em gramas (opcional)"},
                                "carbs": {"type": "number", "description": "Carboidratos em gramas (opcional)"},
                                "fats": {"type": "number", "description": "Gorduras em gramas (opcional)"}
                            }
                        }
                    },
                    "suggested_time": {
                        "type": "string",
                        "description": "Horário sugerido para a refeição (ex: '07:00', '12:30', '18:00'). Opcional."
                    },
                    "notes": {
                        "type": "string",
                        "description": "Observações adicionais sobre o preset (ex: 'Pode substituir aveia por tapioca'). Opcional."
                    }
                },
                "required": ["name", "meal_type", "foods"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "use_meal_preset",
            "description": "Registra uma refeição baseada em um preset do plano alimentar. Use quando o usuário disser que comeu algo do plano alimentar ou quiser usar um preset. Exemplo: 'usei o preset de café da manhã', 'comi meu lanche do plano'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "preset_id": {
                        "type": "string",
                        "description": "ID do preset a usar (obtido via list_meal_presets)"
                    },
                    "preset_name": {
                        "type": "string",
                        "description": "Nome do preset (alternativa ao ID - o sistema buscará pelo nome)"
                    },
                    "date": {
                        "type": "string",
                        "description": "Data da refeição no formato YYYY-MM-DD (opcional, padrão é hoje)"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "edit_meal_preset",
            "description": "Edita um preset de refeição existente. Use quando o usuário quiser modificar um preset do plano alimentar.",
            "parameters": {
                "type": "object",
                "properties": {
                    "preset_id": {
                        "type": "string",
                        "description": "ID do preset a editar"
                    },
                    "name": {
                        "type": "string",
                        "description": "Novo nome do preset (opcional)"
                    },
                    "meal_type": {
                        "type": "string",
                        "enum": ["breakfast", "morning_snack", "lunch", "afternoon_snack", "pre_workout", "post_workout", "dinner", "supper", "snack"],
                        "description": "Novo tipo de refeição (opcional)"
                    },
                    "foods": {
                        "type": "array",
                        "description": "Nova lista de alimentos (opcional, substitui a lista atual)",
                        "items": {
                            "type": "object",
                            "properties": {
                                "food_name": {"type": "string"},
                                "quantity": {"type": "number"},
                                "calories": {"type": "number"},
                                "protein": {"type": "number"},
                                "carbs": {"type": "number"},
                                "fats": {"type": "number"}
                            }
                        }
                    },
                    "suggested_time": {
                        "type": "string",
                        "description": "Novo horário sugerido (opcional)"
                    },
                    "notes": {
                        "type": "string",
                        "description": "Novas observações (opcional)"
                    }
                },
                "required": ["preset_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_meal_preset",
            "description": "Remove um preset de refeição do plano alimentar. Use quando o usuário quiser excluir um preset.",
            "parameters": {
                "type": "object",
                "properties": {
                    "preset_id": {
                        "type": "string",
                        "description": "ID do preset a remover"
                    }
                },
                "required": ["preset_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_meal_plan",
            "description": "🚨 FERRAMENTA OBRIGATÓRIA: Cria um plano alimentar completo com múltiplos presets e SALVA no banco de dados. Use SEMPRE quando o usuário pedir para 'criar', 'montar', 'implementar' ou 'aplicar' um plano alimentar, dieta ou cardápio. IMPORTANTE: Você DEVE chamar esta ferramenta UMA VEZ com um array 'presets' contendo TODAS as refeições. NUNCA tente chamar tools individuais para cada refeição - isso não existe! Exemplo de uso correto: create_meal_plan(presets=[{name: 'Café da Manhã', meal_type: 'breakfast', foods: [...]}, {name: 'Almoço', meal_type: 'lunch', foods: [...]}]). NUNCA chame tools com nomes de refeições como 'Café da Manhã' ou 'Almoço' - essas não são tools válidas!",
            "parameters": {
                "type": "object",
                "properties": {
                    "presets": {
                        "type": "array",
                        "description": "Lista de presets a criar. Cada preset deve ter name, meal_type, foods, e opcionalmente suggested_time e notes.",
                        "items": {
                            "type": "object",
                            "properties": {
                                "name": {"type": "string", "description": "Nome do preset"},
                                "meal_type": {"type": "string", "description": "Tipo de refeição"},
                                "foods": {
                                    "type": "array",
                                    "items": {
                                        "type": "object",
                                        "properties": {
                                            "food_name": {"type": "string"},
                                            "quantity": {"type": "number"},
                                            "calories": {"type": "number"},
                                            "protein": {"type": "number"},
                                            "carbs": {"type": "number"},
                                            "fats": {"type": "number"}
                                        }
                                    }
                                },
                                "suggested_time": {"type": "string"},
                                "notes": {"type": "string"}
                            }
                        }
                    }
                },
                "required": ["presets"]
            }
        }
    },
    # =========================================================================
    # WEIGHTS TOOLS
    # =========================================================================
    {
        "type": "function",
        "function": {
            "name": "add_weight",
            "description": "Registra o peso do usuário. Use quando o usuário mencionar que pesou-se ou quiser registrar seu peso atual. Se já existir um registro para a data, atualiza o peso.",
            "parameters": {
                "type": "object",
                "properties": {
                    "weight": {
                        "type": "number",
                        "description": "Peso em kg (ex: 70.5)"
                    },
                    "date": {
                        "type": "string",
                        "description": "Data no formato YYYY-MM-DD (opcional, padrão é hoje)"
                    }
                },
                "required": ["weight"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_weights",
            "description": "Lista o histórico de pesos do usuário. Use quando o usuário perguntar sobre seu progresso de peso, histórico de pesagem, ou gráfico de peso.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Número máximo de registros a retornar (opcional, ordenado por data mais recente primeiro)"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_weight",
            "description": "Remove um registro de peso. Use quando o usuário quiser deletar uma pesagem incorreta.",
            "parameters": {
                "type": "object",
                "properties": {
                    "weight_id": {
                        "type": "string",
                        "description": "ID do registro de peso a remover (obtido via get_weights)"
                    }
                },
                "required": ["weight_id"]
            }
        }
    },
    # =========================================================================
    # NOTIFICATIONS TOOLS
    # =========================================================================
    {
        "type": "function",
        "function": {
            "name": "get_notifications",
            "description": "Lista notificações do usuário. Use quando o usuário perguntar sobre notificações, alertas, ou quiser ver notificações não lidas.",
            "parameters": {
                "type": "object",
                "properties": {
                    "unread_only": {
                        "type": "boolean",
                        "description": "Se True, retorna apenas notificações não lidas (opcional, padrão: false)"
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Número máximo de notificações a retornar (opcional)"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "mark_notification_read",
            "description": "Marca uma notificação como lida. Use quando o usuário quiser marcar uma notificação específica como lida.",
            "parameters": {
                "type": "object",
                "properties": {
                    "notification_id": {
                        "type": "string",
                        "description": "ID da notificação a marcar como lida (obtido via get_notifications)"
                    }
                },
                "required": ["notification_id"]
            }
        }
    },
    # =========================================================================
    # GOALS SUGGESTION TOOLS
    # =========================================================================
    {
        "type": "function",
        "function": {
            "name": "suggest_goals",
            "description": "Sugere metas nutricionais baseadas em dados pessoais do usuário (peso, altura, idade, gênero, objetivo). Usa fórmulas científicas (Mifflin-St Jeor para BMR) para calcular calorias e macros ideais. Use quando o usuário pedir para calcular, sugerir ou criar metas nutricionais baseadas em suas informações.",
            "parameters": {
                "type": "object",
                "properties": {
                    "weight": {
                        "type": "number",
                        "description": "Peso atual em kg (obrigatório)"
                    },
                    "height": {
                        "type": "number",
                        "description": "Altura em cm (obrigatório)"
                    },
                    "age": {
                        "type": "integer",
                        "description": "Idade em anos (obrigatório)"
                    },
                    "gender": {
                        "type": "string",
                        "enum": ["male", "female", "m", "f"],
                        "description": "Gênero: 'male' ou 'female' (obrigatório)"
                    },
                    "goal": {
                        "type": "string",
                        "description": "Objetivo: 'lose' (emagrecer), 'maintain' (manter peso), 'gain' (ganhar peso), ou outros objetivos disponíveis (obrigatório)"
                    },
                    "activity_level": {
                        "type": "string",
                        "enum": ["sedentary", "light", "moderate", "active", "very_active"],
                        "description": "Nível de atividade física (opcional, padrão: 'moderate')"
                    },
                    "target_weight": {
                        "type": "number",
                        "description": "Peso alvo em kg (opcional, útil para cálculos mais precisos)"
                    }
                },
                "required": ["weight", "height", "age", "gender", "goal"]
            }
        }
    }
]

def _generate_recommendations(summaries: List[Dict], goals: Dict, adherence_rate: float, 
                             avg_calories: float, avg_protein: float) -> List[str]:
    """Generate professional recommendations based on data."""
    recommendations = []
    
    if not summaries:
        recommendations.append("📋 Nenhum dado disponível para análise. Incentive o aluno a registrar refeições regularmente.")
        return recommendations
    
    # Adherence recommendations
    if adherence_rate < 50:
        recommendations.append("⚠️ **Baixa aderência ao registro**: Apenas {:.1f}% dos dias tiveram refeições registradas. Considere estratégias para aumentar a consistência do registro.".format(adherence_rate))
    elif adherence_rate < 70:
        recommendations.append("📊 **Aderência moderada**: {:.1f}% de aderência. Há espaço para melhorar a consistência do registro.".format(adherence_rate))
    else:
        recommendations.append("✅ **Boa aderência**: {:.1f}% de aderência ao registro. O aluno está sendo consistente.".format(adherence_rate))
    
    # Calories recommendations
    goal_calories = goals.get("daily_calories", 0)
    if goal_calories > 0:
        calories_percentage = (avg_calories / goal_calories * 100) if goal_calories > 0 else 0
        if calories_percentage < 80:
            recommendations.append("📉 **Consumo calórico abaixo da meta**: Média de {:.0f} kcal/dia ({:.1f}% da meta). Avalie se há necessidade de ajustar a meta ou estratégias de aumento de ingestão.".format(avg_calories, calories_percentage))
        elif calories_percentage > 120:
            recommendations.append("📈 **Consumo calórico acima da meta**: Média de {:.0f} kcal/dia ({:.1f}% da meta). Considere revisar estratégias de controle de porções.".format(avg_calories, calories_percentage))
        else:
            recommendations.append("✅ **Consumo calórico adequado**: Média de {:.0f} kcal/dia ({:.1f}% da meta).".format(avg_calories, calories_percentage))
    
    # Protein recommendations
    goal_protein = goals.get("daily_protein", 0)
    if goal_protein > 0:
        protein_percentage = (avg_protein / goal_protein * 100) if goal_protein > 0 else 0
        if protein_percentage < 80:
            recommendations.append("🥩 **Ingestão proteica abaixo da meta**: Média de {:.1f}g/dia ({:.1f}% da meta). Considere estratégias para aumentar fontes proteicas nas refeições.".format(avg_protein, protein_percentage))
        elif protein_percentage > 120:
            recommendations.append("✅ **Ingestão proteica adequada**: Média de {:.1f}g/dia ({:.1f}% da meta).".format(avg_protein, protein_percentage))
        else:
            recommendations.append("📊 **Ingestão proteica próxima da meta**: Média de {:.1f}g/dia ({:.1f}% da meta).".format(avg_protein, protein_percentage))
    
    return recommendations

# =============================================================================
# TOOL EXECUTION
# =============================================================================

async def execute_health_tool(name: str, args: Dict, user_id: str = "local") -> Dict:
    """
    Execute a health tool and return the result.
    
    Args:
        name: Nome da tool
        args: Argumentos da tool
        user_id: ID do usuário alvo
    """
    
    try:
        if name == "add_meal":
            meal_name = args.get("name", "")
            meal_type = args.get("meal_type")
            calories = args.get("calories")
            protein = args.get("protein")
            carbs = args.get("carbs")
            fats = args.get("fats")
            grams = args.get("grams")  # Quantidade em gramas (opcional)
            portion_type = args.get("portion_type")  # Tipo de porção (ex: "fatia", "xícara") (opcional)
            portion_quantity = args.get("portion_quantity", 1.0)  # Quantidade de porções (opcional)
            
            # Se não foram fornecidas informações nutricionais, tenta buscar automaticamente
            auto_searched = False
            clean_name = ""
            if not calories and not protein and not carbs and not fats:
                # Tenta extrair nome do alimento da descrição da refeição
                # Remove palavras comuns de refeições (ex: "comi", "jantei", "almocei", etc)
                import re
                from ..health.foods import parse_portion_string, convert_portion_to_grams, calculate_nutrition
                
                food_keywords = ["comi", "jantei", "almocei", "lanchei", "tomei", "bebi", "café da manhã", "almoço", "jantar", "lanche"]
                clean_name = meal_name.lower()
                for keyword in food_keywords:
                    clean_name = clean_name.replace(keyword, "").strip()
                
                # Remove pontuação e espaços extras
                clean_name = re.sub(r'[^\w\s]', ' ', clean_name)
                clean_name = ' '.join(clean_name.split())
                
                # Tenta parsear porção da string (ex: "2 fatias de pão integral")
                parsed_portion = parse_portion_string(meal_name)
                if parsed_portion:
                    clean_name = parsed_portion.get("food_name", clean_name)
                    portion_type = parsed_portion.get("portion_type")
                    portion_quantity = parsed_portion.get("quantity", 1.0)
                
                if clean_name:
                    # Tenta buscar/adicionar alimento automaticamente
                    try:
                        # Se temos porção, usar calculate_nutrition com porção
                        if portion_type:
                            nutrition = await calculate_nutrition(
                                clean_name, 
                                portion_type=portion_type, 
                                portion_quantity=portion_quantity,
                                search_online=True
                            )
                        elif grams:
                            # Se temos gramas, usar calculate_nutrition com gramas
                            nutrition = await calculate_nutrition(
                                clean_name,
                                grams=grams,
                                search_online=True
                            )
                        else:
                            # Caso contrário, buscar apenas informações nutricionais por 100g
                            nutrition = await try_find_or_add_food(clean_name, search_online=True)
                            if nutrition:
                                # Se não especificou quantidade, assumir 100g
                                multiplier = 1.0
                                nutrition = {
                                    "calories": nutrition.get("calories", 0) * multiplier,
                                    "protein": nutrition.get("protein", 0) * multiplier,
                                    "carbs": nutrition.get("carbs", 0) * multiplier,
                                    "fats": nutrition.get("fats", 0) * multiplier
                                }
                        
                        if nutrition:
                            calories = nutrition.get("calories")
                            protein = nutrition.get("protein")
                            carbs = nutrition.get("carbs")
                            fats = nutrition.get("fats")
                            auto_searched = True
                    except Exception as e:
                        print(f"[HEALTH-TOOLS] Erro ao buscar alimento automaticamente: {e}")
            
            meal = storage_add_meal(
                user_id=user_id,
                name=meal_name,
                meal_type=meal_type,
                calories=calories,
                protein=protein,
                carbs=carbs,
                fats=fats,
                notes=args.get("notes"),
                date=args.get("date")
            )
            
            message = f"✅ Refeição '{meal['name']}' registrada com sucesso!"
            if auto_searched:
                message += f" 🔍 Informações nutricionais de '{clean_name}' foram pesquisadas e adicionadas automaticamente ao banco de dados."
            
            return {
                "success": True,
                "message": message,
                "meal": meal,
                "auto_searched": auto_searched
            }
        
        elif name == "edit_meal":
            meal_id = args.get("meal_id")
            if not meal_id:
                return {
                    "success": False,
                    "error": "É necessário informar o ID da refeição para editá-la. Por favor, verifique o ID da refeição que deseja editar."
                }
            
            meal = storage_update_meal(
                user_id=user_id,
                meal_id=meal_id,
                name=args.get("name"),
                meal_type=args.get("meal_type"),
                calories=args.get("calories"),
                protein=args.get("protein"),
                carbs=args.get("carbs"),
                fats=args.get("fats"),
                notes=args.get("notes")
            )
            
            if meal:
                meal_name = meal.get("name", "a refeição")
                return {
                    "success": True,
                    "message": f"✅ Refeição '{meal_name}' atualizada com sucesso!",
                    "meal": meal
                }
            else:
                return {
                    "success": False,
                    "error": f"❌ Refeição não encontrada. O ID '{meal_id}' não corresponde a nenhuma refeição registrada. Verifique se o ID está correto ou liste suas refeições para encontrar o ID correto."
                }
        
        elif name == "delete_meal":
            meal_id = args.get("meal_id")
            if not meal_id:
                return {
                    "success": False,
                    "error": "É necessário informar o ID da refeição para removê-la. Por favor, verifique o ID da refeição que deseja deletar."
                }
            
            success = storage_delete_meal(user_id, meal_id)
            if success:
                return {
                    "success": True,
                    "message": "✅ Refeição removida com sucesso!"
                }
            else:
                return {
                    "success": False,
                    "error": f"❌ Refeição não encontrada. O ID '{meal_id}' não corresponde a nenhuma refeição registrada. Verifique se o ID está correto ou liste suas refeições para encontrar o ID correto."
                }
        
        elif name == "list_meals":
            limit = args.get("limit", 10)
            date = args.get("date")
            meals = load_meals(user_id, limit=limit, date=date)
            
            if len(meals) == 0:
                date_msg = f" na data {date}" if date else ""
                return {
                    "success": True,
                    "meals": [],
                    "count": 0,
                    "message": f"📋 Nenhuma refeição encontrada{date_msg}. Que tal registrar sua primeira refeição?"
                }
            
            date_msg = f" na data {date}" if date else ""
            return {
                "success": True,
                "meals": meals,
                "count": len(meals),
                "message": f"📋 Encontradas {len(meals)} refeição(ões){date_msg}"
            }
        
        elif name == "get_nutrition_summary":
            date = args.get("date")
            summary = storage_get_summary(user_id, date=date)
            
            meals_count = summary.get("meals_count", 0)
            if meals_count == 0:
                date_msg = f" em {date}" if date else " hoje"
                return {
                    "success": True,
                    "summary": summary,
                    "message": f"📊 Nenhuma refeição registrada{date_msg}. Comece registrando suas refeições para acompanhar seu progresso nutricional!"
                }
            
            date_msg = f" em {date}" if date else " hoje"
            return {
                "success": True,
                "summary": summary,
                "message": f"📊 Resumo nutricional{date_msg}: {meals_count} refeição(ões) registrada(s)"
            }
        
        elif name == "get_nutrition_history":
            start_date = args.get("start_date")
            end_date = args.get("end_date")
            
            if not start_date or not end_date:
                return {
                    "success": False,
                    "error": "❌ start_date e end_date são obrigatórios (formato: YYYY-MM-DD)"
                }
            
            try:
                summaries = get_summaries_by_range(user_id, start_date, end_date)
                
                # Calcular estatísticas
                if len(summaries) > 0:
                    total_calories = sum(s.get("total_calories", 0) for s in summaries)
                    total_protein = sum(s.get("total_protein", 0) for s in summaries)
                    avg_calories = total_calories / len(summaries)
                    avg_protein = total_protein / len(summaries)
                    
                    # Contar dias que atingiu metas
                    days_with_protein_goal = sum(1 for s in summaries 
                                                if s.get("goals", {}).get("daily_protein", 0) > 0 
                                                and s.get("total_protein", 0) >= s.get("goals", {}).get("daily_protein", 0))
                    
                    days_with_calories_goal = sum(1 for s in summaries 
                                                 if s.get("goals", {}).get("daily_calories", 0) > 0 
                                                 and s.get("total_calories", 0) >= s.get("goals", {}).get("daily_calories", 0))
                    
                    return {
                        "success": True,
                        "summaries": summaries,
                        "count": len(summaries),
                        "start_date": start_date,
                        "end_date": end_date,
                        "statistics": {
                            "avg_calories": round(avg_calories, 1),
                            "avg_protein": round(avg_protein, 1),
                            "days_with_protein_goal": days_with_protein_goal,
                            "days_with_calories_goal": days_with_calories_goal,
                            "total_days": len(summaries)
                        },
                        "message": f"📈 Histórico nutricional de {len(summaries)} dias ({start_date} a {end_date}):\n"
                                  f"• Média de calorias: {avg_calories:.0f} kcal/dia\n"
                                  f"• Média de proteína: {avg_protein:.1f} g/dia\n"
                                  f"• Dias que atingiu meta de proteína: {days_with_protein_goal} de {len(summaries)}\n"
                                  f"• Dias que atingiu meta de calorias: {days_with_calories_goal} de {len(summaries)}"
                    }
                else:
                    return {
                        "success": True,
                        "summaries": [],
                        "count": 0,
                        "start_date": start_date,
                        "end_date": end_date,
                        "statistics": {},
                        "message": f"📈 Nenhum dado encontrado para o período de {start_date} a {end_date}"
                    }
            except ValueError as e:
                return {
                    "success": False,
                    "error": f"❌ Erro ao obter histórico: {str(e)}"
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"❌ Erro inesperado ao obter histórico: {str(e)}"
                }
        
        elif name == "update_goals":
            goals = storage_update_goals(
                user_id=user_id,
                daily_calories=args.get("daily_calories"),
                daily_protein=args.get("daily_protein"),
                daily_carbs=args.get("daily_carbs"),
                daily_fats=args.get("daily_fats"),
                target_weight=args.get("target_weight"),
                current_weight=args.get("current_weight")
            )
            return {
                "success": True,
                "message": "Metas atualizadas com sucesso!",
                "goals": goals
            }
        
        elif name == "get_goals":
            goals = get_goals(user_id)
            
            if not goals or len(goals) == 0:
                return {
                    "success": True,
                    "goals": {},
                    "message": "🎯 Você ainda não definiu metas nutricionais. Que tal configurar suas metas para acompanhar melhor seu progresso?"
                }
            
            has_goals = any(goals.get(key) for key in ["daily_calories", "daily_protein", "daily_carbs", "daily_fats"])
            if has_goals:
                return {
                    "success": True,
                    "goals": goals,
                    "message": "🎯 Metas nutricionais carregadas com sucesso!"
                }
            else:
                return {
                    "success": True,
                    "goals": goals,
                    "message": "🎯 Você ainda não definiu metas nutricionais completas. Que tal configurar suas metas para acompanhar melhor seu progresso?"
                }
        
        elif name == "search_food":
            query = args.get("query", "")
            limit = args.get("limit", 10)
            if not query:
                return {
                    "success": False,
                    "error": "Por favor, informe o nome do alimento que deseja buscar. Exemplo: 'frango', 'arroz', 'maçã'."
                }
            
            foods = search_foods(query, limit=limit)
            
            if len(foods) == 0:
                return {
                    "success": True,
                    "foods": [],
                    "count": 0,
                    "message": f"🔍 Nenhum alimento encontrado para '{query}'. Tente usar outro termo de busca ou adicione o alimento manualmente usando 'add_food'."
                }
            
            return {
                "success": True,
                "foods": foods,
                "count": len(foods),
                "message": f"🔍 Encontrados {len(foods)} alimento(s) para '{query}'"
            }
        
        elif name == "get_food_nutrition":
            food_name = args.get("food_name", "")
            search_online = args.get("search_online", True)
            if not food_name:
                return {
                    "success": False,
                    "error": "Por favor, informe o nome do alimento que deseja consultar. Exemplo: 'frango grelhado', 'arroz branco', 'maçã'."
                }
            
            # Note: get_food_nutrition is async, but we're in sync context
            # We'll need to handle this differently
            import asyncio
            try:
                loop = asyncio.get_event_loop()
                if loop.is_running():
                    # If loop is running, we can't use it - try sync approach
                    # For now, just search in database
                    from .foods import load_database
                    database = load_database()
                    food_key = food_name.lower().strip()
                    if food_key in database:
                        food_data = database[food_key]
                        nutrition = {
                            "name": food_data.get("name", food_key),
                            "calories": food_data.get("calories", 0),
                            "protein": food_data.get("protein", 0),
                            "carbs": food_data.get("carbs", 0),
                            "fats": food_data.get("fats", 0)
                        }
                        return {
                            "success": True,
                            "nutrition": nutrition,
                            "message": f"Informações nutricionais de '{food_name}' encontradas no banco"
                        }
                    else:
                        return {
                            "success": False,
                            "error": f"❌ Alimento '{food_name}' não encontrado no banco de dados. Você pode adicionar este alimento usando a ferramenta 'add_food', que irá pesquisar automaticamente as informações nutricionais na internet."
                        }
                else:
                    nutrition = loop.run_until_complete(get_food_nutrition(food_name, search_online=search_online))
            except RuntimeError:
                # No event loop, create one
                nutrition = asyncio.run(get_food_nutrition(food_name, search_online=search_online))
            
            if nutrition:
                return {
                    "success": True,
                    "nutrition": nutrition,
                    "message": f"✅ Informações nutricionais de '{food_name}' encontradas (valores por 100g)"
                }
            else:
                return {
                    "success": False,
                    "error": f"❌ Não foi possível encontrar informações nutricionais de '{food_name}' no banco de dados nem na internet. Você pode adicionar este alimento manualmente fornecendo os valores nutricionais (calorias, proteínas, carboidratos e gorduras)."
                }
        
        elif name == "add_food":
            food_name = args.get("food_name", "")
            if not food_name:
                return {
                    "success": False,
                    "error": "Por favor, informe o nome do alimento que deseja adicionar. Exemplo: 'frango grelhado', 'arroz branco', 'maçã'."
                }
            
            # Check if food already exists
            from .foods import load_database
            database = load_database()
            food_key = food_name.lower().strip()
            
            if food_key in database:
                food_data = database[food_key]
                nutrition = {
                    "name": food_data.get("name", food_key),
                    "calories": food_data.get("calories", 0),
                    "protein": food_data.get("protein", 0),
                    "carbs": food_data.get("carbs", 0),
                    "fats": food_data.get("fats", 0)
                }
                return {
                    "success": True,
                    "food": nutrition,
                    "message": f"Alimento '{food_name}' já existe no banco de dados"
                }
            
            # If manual values provided, use them
            calories = args.get("calories")
            protein = args.get("protein")
            carbs = args.get("carbs")
            fats = args.get("fats")
            
            if calories is not None and protein is not None and carbs is not None and fats is not None:
                # Add manually
                food = add_food_manually(food_name, calories, protein, carbs, fats)
                return {
                    "success": True,
                    "food": food,
                    "message": f"Alimento '{food_name}' adicionado manualmente ao banco"
                }
            else:
                # Search online automatically using get_food_nutrition which handles async
                import asyncio
                try:
                    loop = asyncio.get_event_loop()
                    if loop.is_running():
                        return {
                            "success": False,
                            "error": "⚠️ Não foi possível pesquisar informações nutricionais online no momento. Por favor, forneça os valores nutricionais manualmente (calorias, proteínas, carboidratos e gorduras por 100g) ou tente novamente mais tarde."
                        }
                    else:
                        nutrition = loop.run_until_complete(get_food_nutrition(food_name, search_online=True))
                except RuntimeError:
                    nutrition = asyncio.run(get_food_nutrition(food_name, search_online=True))
                
                if nutrition:
                    return {
                        "success": True,
                        "food": nutrition,
                        "message": f"Alimento '{food_name}' pesquisado na internet e adicionado ao banco automaticamente"
                    }
                else:
                    return {
                        "success": False,
                        "error": f"❌ Não foi possível encontrar informações nutricionais de '{food_name}' na internet. Por favor, forneça os valores nutricionais manualmente: calorias, proteínas, carboidratos e gorduras (todos por 100g do alimento)."
                    }
        
        # =============================================================================
        # MEAL PLAN / PRESETS TOOLS
        # =============================================================================
        
        elif name == "list_meal_presets":
            try:
                presets = get_presets(user_id)
                
                if not presets:
                    return {
                        "success": True,
                        "presets": [],
                        "count": 0,
                        "message": "📋 Você ainda não tem presets no plano alimentar. Que tal criar seu primeiro preset?"
                    }
                
                message = f"📋 Plano Alimentar: {len(presets)} preset(s) disponível(is)"
                
                return {
                    "success": True,
                    "presets": presets,
                    "count": len(presets),
                    "message": message
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"❌ Erro ao listar presets: {str(e)}"
                }
        
        elif name == "create_meal_preset":
            preset_name = args.get("name", "")
            meal_type = args.get("meal_type", "snack")
            foods = args.get("foods", [])
            suggested_time = args.get("suggested_time")
            notes = args.get("notes")
            
            if not preset_name:
                return {
                    "success": False,
                    "error": "Por favor, forneça um nome para o preset."
                }
            
            if not foods:
                return {
                    "success": False,
                    "error": "Por favor, adicione pelo menos um alimento ao preset."
                }
            
            # Validar meal_type
            valid_meal_types = list(MEAL_TYPES.keys())
            if meal_type not in valid_meal_types:
                return {
                    "success": False,
                    "error": f"Tipo de refeição inválido. Tipos válidos: {', '.join(valid_meal_types)}"
                }
            
            # Buscar informações nutricionais dos alimentos se não fornecidas
            enriched_foods = []
            for food in foods:
                food_item = {
                    "food_name": food.get("food_name", "Alimento"),
                    "quantity": food.get("quantity", 100),
                    "unit": food.get("unit", "g"),
                    "calories": food.get("calories", 0),
                    "protein": food.get("protein", 0),
                    "carbs": food.get("carbs", 0),
                    "fats": food.get("fats", 0)
                }
                
                # Se não tem calorias, tenta buscar do banco ou pesquisar online
                if not food_item["calories"]:
                    try:
                        from .foods import load_database, search_foods
                        database = load_database()
                        food_key = food_item["food_name"].lower().strip()
                        
                        # Tenta match exato primeiro
                        if food_key in database:
                            db_food = database[food_key]
                            ratio = food_item["quantity"] / 100
                            food_item["calories"] = round(db_food.get("calories", 0) * ratio, 1)
                            food_item["protein"] = round(db_food.get("protein", 0) * ratio, 1)
                            food_item["carbs"] = round(db_food.get("carbs", 0) * ratio, 1)
                            food_item["fats"] = round(db_food.get("fats", 0) * ratio, 1)
                        else:
                            # Tenta buscar por similaridade
                            search_results = search_foods(food_key, limit=1)
                            if search_results and len(search_results) > 0:
                                db_food = search_results[0]
                                ratio = food_item["quantity"] / 100
                                food_item["calories"] = round(db_food.get("calories", 0) * ratio, 1)
                                food_item["protein"] = round(db_food.get("protein", 0) * ratio, 1)
                                food_item["carbs"] = round(db_food.get("carbs", 0) * ratio, 1)
                                food_item["fats"] = round(db_food.get("fats", 0) * ratio, 1)
                            else:
                                # Tenta buscar online usando try_find_or_add_food
                                try:
                                    nutrition = await try_find_or_add_food(food_key, search_online=True)
                                    if nutrition:
                                        ratio = food_item["quantity"] / 100
                                        food_item["calories"] = round(nutrition.get("calories", 0) * ratio, 1)
                                        food_item["protein"] = round(nutrition.get("protein", 0) * ratio, 1)
                                        food_item["carbs"] = round(nutrition.get("carbs", 0) * ratio, 1)
                                        food_item["fats"] = round(nutrition.get("fats", 0) * ratio, 1)
                                except:
                                    pass
                    except Exception as e:
                        print(f"[HEALTH-TOOLS] Erro ao buscar nutrição de '{food_item['food_name']}': {e}")
                
                enriched_foods.append(food_item)
            
            try:
                new_preset = create_preset(
                    user_id=user_id,
                    name=preset_name,
                    meal_type=meal_type,
                    foods=enriched_foods,
                    suggested_time=suggested_time,
                    notes=notes
                )
                target_msg = ""
                
                meal_type_label = MEAL_TYPES.get(meal_type, {}).get("name", meal_type)
                meal_type_icon = MEAL_TYPES.get(meal_type, {}).get("icon", "🍽️")
                
                return {
                    "success": True,
                    "preset": new_preset,
                    "message": f"{meal_type_icon} Preset '{preset_name}' ({meal_type_label}) criado com sucesso{target_msg}!\n"
                              f"   • Calorias: {new_preset.get('total_calories', 0)} kcal\n"
                              f"   • Proteínas: {new_preset.get('total_protein', 0)}g\n"
                              f"   • Carboidratos: {new_preset.get('total_carbs', 0)}g\n"
                              f"   • Gorduras: {new_preset.get('total_fats', 0)}g"
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"❌ Erro ao criar preset: {str(e)}"
                }
        
        elif name == "use_meal_preset":
            preset_id = args.get("preset_id")
            preset_name_search = args.get("preset_name")
            date = args.get("date")
            
            # Buscar preset por ID ou nome
            preset = None
            if preset_id:
                preset = get_preset_by_id(user_id, preset_id)
            elif preset_name_search:
                # Buscar por nome
                presets = get_presets(user_id)
                search_lower = preset_name_search.lower().strip()
                for p in presets:
                    if search_lower in p.get("name", "").lower():
                        preset = p
                        break
            
            if not preset:
                return {
                    "success": False,
                    "error": "❌ Preset não encontrado. Use 'list_meal_presets' para ver os presets disponíveis."
                }
            
            # Registrar refeição baseada no preset
            try:
                meal = storage_add_meal(
                    user_id=user_id,
                    name=preset.get("name"),
                    meal_type=preset.get("meal_type", "snack"),
                    calories=preset.get("total_calories"),
                    protein=preset.get("total_protein"),
                    carbs=preset.get("total_carbs"),
                    fats=preset.get("total_fats"),
                    notes=f"📋 Do plano: {preset.get('name')}",
                    date=date
                )
                
                meal_type_icon = MEAL_TYPES.get(preset.get("meal_type"), {}).get("icon", "🍽️")
                
                return {
                    "success": True,
                    "meal": meal,
                    "preset_used": preset,
                    "message": f"{meal_type_icon} Refeição '{preset.get('name')}' registrada a partir do plano alimentar!\n"
                              f"   • {preset.get('total_calories', 0)} kcal | P: {preset.get('total_protein', 0)}g | C: {preset.get('total_carbs', 0)}g | G: {preset.get('total_fats', 0)}g"
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"❌ Erro ao registrar refeição: {str(e)}"
                }
        
        elif name == "edit_meal_preset":
            preset_id = args.get("preset_id")
            
            if not preset_id:
                return {
                    "success": False,
                    "error": "Por favor, forneça o ID do preset a editar."
                }
            
            updates = {}
            if args.get("name"):
                updates["name"] = args["name"]
            if args.get("meal_type"):
                updates["meal_type"] = args["meal_type"]
            if args.get("foods"):
                updates["foods"] = args["foods"]
            if args.get("suggested_time") is not None:
                updates["suggested_time"] = args["suggested_time"]
            if args.get("notes") is not None:
                updates["notes"] = args["notes"]
            
            if not updates:
                return {
                    "success": False,
                    "error": "Por favor, forneça pelo menos um campo para atualizar."
                }
            
            try:
                updated = update_preset(user_id, preset_id, updates)
                
                if updated:
                    return {
                        "success": True,
                        "preset": updated,
                        "message": f"✅ Preset '{updated.get('name')}' atualizado com sucesso!"
                    }
                else:
                    return {
                        "success": False,
                        "error": "❌ Preset não encontrado ou você não tem permissão para editá-lo."
                    }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"❌ Erro ao editar preset: {str(e)}"
                }
        
        elif name == "delete_meal_preset":
            preset_id = args.get("preset_id")
            
            if not preset_id:
                return {
                    "success": False,
                    "error": "Por favor, forneça o ID do preset a remover."
                }
            
            try:
                deleted = delete_preset(user_id, preset_id)
                
                if deleted:
                    return {
                        "success": True,
                        "message": "✅ Preset removido com sucesso do plano alimentar!"
                    }
                else:
                    return {
                        "success": False,
                        "error": "❌ Preset não encontrado ou você não tem permissão para removê-lo."
                    }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"❌ Erro ao remover preset: {str(e)}"
                }
        
        elif name == "create_meal_plan":
            presets_data = args.get("presets", [])
            
            # Log para debug
            print(f"[HEALTH-TOOLS] create_meal_plan called: user_id={user_id}")
            
            if not presets_data:
                return {
                    "success": False,
                    "error": "Por favor, forneça pelo menos um preset para criar o plano alimentar."
                }
            
            try:
                created_presets = []
                total_calories = 0
                total_protein = 0
                total_carbs = 0
                total_fats = 0
                
                for preset_data in presets_data:
                    foods = preset_data.get("foods", [])
                    
                    # Enriquecer alimentos com dados do banco ou pesquisa online
                    enriched_foods = []
                    for food in foods:
                        food_item = {
                            "food_name": food.get("food_name", "Alimento"),
                            "quantity": food.get("quantity", 100),
                            "unit": food.get("unit", "g"),
                            "calories": food.get("calories", 0),
                            "protein": food.get("protein", 0),
                            "carbs": food.get("carbs", 0),
                            "fats": food.get("fats", 0)
                        }
                        
                        if not food_item["calories"]:
                            try:
                                from .foods import load_database, search_foods
                                database = load_database()
                                food_key = food_item["food_name"].lower().strip()
                                
                                # Match exato
                                if food_key in database:
                                    db_food = database[food_key]
                                    ratio = food_item["quantity"] / 100
                                    food_item["calories"] = round(db_food.get("calories", 0) * ratio, 1)
                                    food_item["protein"] = round(db_food.get("protein", 0) * ratio, 1)
                                    food_item["carbs"] = round(db_food.get("carbs", 0) * ratio, 1)
                                    food_item["fats"] = round(db_food.get("fats", 0) * ratio, 1)
                                else:
                                    # Busca por similaridade
                                    search_results = search_foods(food_key, limit=1)
                                    if search_results and len(search_results) > 0:
                                        db_food = search_results[0]
                                        ratio = food_item["quantity"] / 100
                                        food_item["calories"] = round(db_food.get("calories", 0) * ratio, 1)
                                        food_item["protein"] = round(db_food.get("protein", 0) * ratio, 1)
                                        food_item["carbs"] = round(db_food.get("carbs", 0) * ratio, 1)
                                        food_item["fats"] = round(db_food.get("fats", 0) * ratio, 1)
                                    else:
                                        # Pesquisa online
                                        try:
                                            nutrition = await try_find_or_add_food(food_key, search_online=True)
                                            if nutrition:
                                                ratio = food_item["quantity"] / 100
                                                food_item["calories"] = round(nutrition.get("calories", 0) * ratio, 1)
                                                food_item["protein"] = round(nutrition.get("protein", 0) * ratio, 1)
                                                food_item["carbs"] = round(nutrition.get("carbs", 0) * ratio, 1)
                                                food_item["fats"] = round(nutrition.get("fats", 0) * ratio, 1)
                                        except:
                                            pass
                            except Exception as e:
                                print(f"[HEALTH-TOOLS] Erro ao buscar nutrição: {e}")
                        
                        enriched_foods.append(food_item)
                    
                    # Usuário criando preset
                    print(f"[HEALTH-TOOLS] Creating preset for user (user_id={user_id})")
                    new_preset = create_preset(
                        user_id=user_id,
                        name=preset_data.get("name", "Refeição"),
                        meal_type=preset_data.get("meal_type", "snack"),
                        foods=enriched_foods,
                        suggested_time=preset_data.get("suggested_time"),
                        notes=preset_data.get("notes")
                    )
                    
                    created_presets.append(new_preset)
                    total_calories += new_preset.get("total_calories", 0)
                    total_protein += new_preset.get("total_protein", 0)
                    total_carbs += new_preset.get("total_carbs", 0)
                    total_fats += new_preset.get("total_fats", 0)
                
                target_msg = ""
                return {
                    "success": True,
                    "presets": created_presets,
                    "count": len(created_presets),
                    "totals": {
                        "calories": round(total_calories, 1),
                        "protein": round(total_protein, 1),
                        "carbs": round(total_carbs, 1),
                        "fats": round(total_fats, 1)
                    },
                    "message": f"🍽️ Plano alimentar criado com {len(created_presets)} refeições{target_msg}!\n"
                              f"   Totais do dia:\n"
                              f"   • Calorias: {total_calories:.0f} kcal\n"
                              f"   • Proteínas: {total_protein:.1f}g\n"
                              f"   • Carboidratos: {total_carbs:.1f}g\n"
                              f"   • Gorduras: {total_fats:.1f}g"
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"❌ Erro ao criar plano alimentar: {str(e)}"
                }
        
        elif name == "add_weight":
            weight = args.get("weight")
            date = args.get("date")
            
            if weight is None:
                return {
                    "success": False,
                    "error": "Por favor, forneça o peso em kg."
                }
            
            try:
                weight_entry = add_weight(user_id=user_id, weight=weight, date=date)
                return {
                    "success": True,
                    "weight": weight_entry,
                    "message": f"✅ Peso registrado: {weight_entry['weight']} kg na data {weight_entry['date']}"
                }
            except ValueError as e:
                return {
                    "success": False,
                    "error": f"⚠️ {str(e)}"
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"❌ Erro ao registrar peso: {str(e)}"
                }
        
        elif name == "get_weights":
            limit = args.get("limit")
            
            try:
                weights = get_weights(user_id=user_id, limit=limit)
                return {
                    "success": True,
                    "weights": weights,
                    "count": len(weights),
                    "message": f"📊 Histórico de pesos: {len(weights)} registro(s) encontrado(s)"
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"❌ Erro ao buscar histórico de pesos: {str(e)}"
                }
        
        elif name == "delete_weight":
            weight_id = args.get("weight_id")
            
            if not weight_id:
                return {
                    "success": False,
                    "error": "Por favor, forneça o ID do registro de peso a remover."
                }
            
            try:
                deleted = delete_weight(user_id=user_id, weight_id=weight_id)
                if deleted:
                    return {
                        "success": True,
                        "message": "✅ Registro de peso removido com sucesso"
                    }
                else:
                    return {
                        "success": False,
                        "error": "❌ Registro de peso não encontrado"
                    }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"❌ Erro ao remover registro de peso: {str(e)}"
                }
        
        elif name == "get_notifications":
            unread_only = args.get("unread_only", False)
            limit = args.get("limit")
            
            try:
                notifications = get_notifications(user_id=user_id, unread_only=unread_only, limit=limit)
                unread_count = sum(1 for n in notifications if not n.get("read", False))
                return {
                    "success": True,
                    "notifications": notifications,
                    "count": len(notifications),
                    "unread_count": unread_count,
                    "message": f"🔔 {len(notifications)} notificação(ões) encontrada(s)" + (f" ({unread_count} não lida(s))" if unread_count > 0 else "")
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"❌ Erro ao buscar notificações: {str(e)}"
                }
        
        elif name == "mark_notification_read":
            notification_id = args.get("notification_id")
            
            if not notification_id:
                return {
                    "success": False,
                    "error": "Por favor, forneça o ID da notificação a marcar como lida."
                }
            
            try:
                success = mark_notification_read(user_id=user_id, notification_id=notification_id)
                if success:
                    return {
                        "success": True,
                        "message": "✅ Notificação marcada como lida"
                    }
                else:
                    return {
                        "success": False,
                        "error": "❌ Notificação não encontrada"
                    }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"❌ Erro ao marcar notificação como lida: {str(e)}"
                }
        
        elif name == "suggest_goals":
            # Importar funções de cálculo do routes.py
            from .routes import (
                calculate_bmr_mifflin_st_jeor,
                calculate_tdee,
                adjust_calories_for_goal,
                calculate_macros
            )
            
            weight = args.get("weight")
            height = args.get("height")
            age = args.get("age")
            gender = args.get("gender")
            goal = args.get("goal")
            activity_level = args.get("activity_level", "moderate")
            target_weight = args.get("target_weight")
            
            # Validações básicas
            if weight is None or height is None or age is None or gender is None or goal is None:
                return {
                    "success": False,
                    "error": "Por favor, forneça todos os dados obrigatórios: weight, height, age, gender, goal"
                }
            
            if weight <= 0 or weight > 500:
                return {
                    "success": False,
                    "error": "Peso deve estar entre 1 e 500 kg"
                }
            
            if height <= 0 or height > 300:
                return {
                    "success": False,
                    "error": "Altura deve estar entre 1 e 300 cm"
                }
            
            if age <= 0 or age > 150:
                return {
                    "success": False,
                    "error": "Idade deve estar entre 1 e 150 anos"
                }
            
            # Normalizar gênero
            gender_normalized = "male" if gender.lower() in ["male", "m"] else "female"
            
            try:
                # Calcular BMR
                bmr = calculate_bmr_mifflin_st_jeor(weight, height, age, gender_normalized)
                
                # Calcular TDEE
                tdee = calculate_tdee(bmr, activity_level)
                
                # Ajustar calorias baseado no objetivo
                suggested_calories = adjust_calories_for_goal(tdee, goal, current_weight=weight, target_weight=target_weight)
                
                # Calcular macros
                macros = calculate_macros(suggested_calories, goal, weight=weight)
                
                suggested_goals = {
                    "daily_calories": round(suggested_calories, 0),
                    "daily_protein": macros["protein"],
                    "daily_carbs": macros["carbs"],
                    "daily_fats": macros["fats"],
                    "bmr": round(bmr, 1),
                    "tdee": round(tdee, 1)
                }
                
                return {
                    "success": True,
                    "suggested_goals": suggested_goals,
                    "message": f"✅ Metas sugeridas calculadas:\n"
                              f"   • Calorias diárias: {suggested_goals['daily_calories']:.0f} kcal\n"
                              f"   • Proteínas: {suggested_goals['daily_protein']:.1f}g\n"
                              f"   • Carboidratos: {suggested_goals['daily_carbs']:.1f}g\n"
                              f"   • Gorduras: {suggested_goals['daily_fats']:.1f}g"
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"❌ Erro ao calcular metas sugeridas: {str(e)}"
                }
        
        else:
            # Detecta se está tentando chamar uma tool com nome de refeição
            meal_names_pt = ["café da manhã", "lanche da manhã", "almoço", "lanche da tarde", "jantar", "ceia", "pré-treino", "pós-treino"]
            if any(meal_name in name.lower() for meal_name in meal_names_pt):
                return {
                    "success": False,
                    "error": f"❌ ERRO: '{name}' não é uma ferramenta válida! Você está tentando chamar uma refeição como se fosse uma tool. Para criar um plano alimentar, você DEVE usar a ferramenta 'create_meal_plan' UMA VEZ com TODOS os presets em um array. Exemplo: create_meal_plan(presets=[{{name: 'Café da Manhã', meal_type: 'breakfast', foods: [...]}}, {{name: 'Almoço', meal_type: 'lunch', foods: [...]}}]). NUNCA tente chamar tools individuais para cada refeição!"
                }
            return {
                "success": False,
                "error": f"❌ Ferramenta desconhecida: '{name}'. Por favor, verifique o nome da ferramenta e tente novamente. Tools disponíveis: create_meal_plan, create_meal_preset, list_meal_presets, add_meal, etc."
            }
    
    except ValueError as e:
        # Erros de validação
        error_msg = str(e)
        return {
            "success": False,
            "error": f"⚠️ Erro de validação: {error_msg}. Por favor, verifique os dados fornecidos e tente novamente."
        }
    except Exception as e:
        # Erros genéricos - tornar mais amigável
        error_msg = str(e)
        return {
            "success": False,
            "error": f"❌ Ocorreu um erro ao processar sua solicitação: {error_msg}. Por favor, tente novamente ou verifique se os dados estão corretos."
        }
