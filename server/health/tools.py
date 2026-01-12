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
    update_goals as storage_update_goals
)
from .foods import (
    search_foods,
    get_food_nutrition,
    add_food_manually,
    try_find_or_add_food
)
from .profiles import (
    get_health_profile,
    get_evaluator_students
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
            "description": "Edita uma refeição já registrada.",
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
            "description": "Lista refeições recentes do usuário.",
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
    {
        "type": "function",
        "function": {
            "name": "get_student_data",
            "description": "Busca dados completos de um aluno/paciente específico (por nome ou ID). Use quando o avaliador mencionar um nome de aluno ou pedir dados de um paciente específico. Retorna: refeições recentes, metas, resumo nutricional, progresso. Exemplo: 'Mostre os dados do André' → use get_student_data com nome 'André'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "student_name_or_id": {
                        "type": "string",
                        "description": "Nome do aluno (ex: 'André', 'Maria') ou ID do aluno (Firebase UID). Se for nome, o sistema buscará entre os alunos vinculados ao avaliador."
                    }
                },
                "required": ["student_name_or_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_all_students",
            "description": "Lista todos os alunos vinculados ao avaliador com resumo rápido (nome, última atividade, status). Use quando o avaliador pedir para ver todos os pacientes ou fazer uma visão geral.",
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
            "name": "compare_students",
            "description": "Compara dados nutricionais entre múltiplos alunos. Use quando o avaliador quiser comparar progresso, padrões ou métricas entre pacientes. Exemplo: 'Compare o progresso do André e da Maria'.",
            "parameters": {
                "type": "object",
                "properties": {
                    "student_ids": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Lista de IDs ou nomes dos alunos a comparar (mínimo 2). Se for nome, o sistema buscará entre os alunos vinculados."
                    },
                    "metric": {
                        "type": "string",
                        "enum": ["calories", "protein", "adherence", "progress", "all"],
                        "description": "Métrica específica para comparar: 'calories' (calorias), 'protein' (proteínas), 'adherence' (aderência ao registro), 'progress' (progresso geral), 'all' (todas as métricas). Padrão: 'all'"
                    },
                    "period_days": {
                        "type": "integer",
                        "description": "Número de dias para análise (padrão: 7, para última semana)"
                    }
                },
                "required": ["student_ids"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_student_summary",
            "description": "Gera resumo completo e detalhado de um aluno em um período específico. Use para análises profundas de um paciente específico. Permite análise de tendências, padrões e progresso ao longo do tempo.",
            "parameters": {
                "type": "object",
                "properties": {
                    "student_name_or_id": {
                        "type": "string",
                        "description": "Nome do aluno (ex: 'André', 'Maria') ou ID do aluno (Firebase UID)"
                    },
                    "period_days": {
                        "type": "integer",
                        "description": "Número de dias para análise (padrão: 30, para último mês)"
                    },
                    "start_date": {
                        "type": "string",
                        "description": "Data inicial no formato YYYY-MM-DD (opcional, se não fornecido usa period_days a partir de hoje)"
                    },
                    "end_date": {
                        "type": "string",
                        "description": "Data final no formato YYYY-MM-DD (opcional, padrão é hoje)"
                    }
                },
                "required": ["student_name_or_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "generate_student_report",
            "description": "Gera relatório profissional formatado de um aluno. Use quando o avaliador pedir um relatório completo ou documentação. Retorna relatório estruturado com análises, gráficos e recomendações.",
            "parameters": {
                "type": "object",
                "properties": {
                    "student_name_or_id": {
                        "type": "string",
                        "description": "Nome do aluno (ex: 'André', 'Maria') ou ID do aluno (Firebase UID)"
                    },
                    "period_days": {
                        "type": "integer",
                        "description": "Número de dias para análise (padrão: 30, para último mês)"
                    },
                    "include_recommendations": {
                        "type": "boolean",
                        "description": "Se deve incluir recomendações profissionais no relatório (padrão: true)"
                    }
                },
                "required": ["student_name_or_id"]
            }
        }
    }
]

# =============================================================================
# HELPER FUNCTIONS FOR EVALUATOR TOOLS
# =============================================================================

def _resolve_student_id(evaluator_id: str, student_name_or_id: str) -> Optional[str]:
    """
    Resolve student_id from name or ID.
    If it's a name, search among evaluator's students.
    If it's an ID, verify it's linked to the evaluator.
    """
    # First, check if it's already an ID (Firebase UIDs are typically 28 chars)
    if len(student_name_or_id) > 20:
        # Likely an ID, verify it's linked to evaluator
        student_ids = get_evaluator_students(evaluator_id)
        if student_name_or_id in student_ids:
            return student_name_or_id
        return None
    
    # It's a name, search among students
    student_ids = get_evaluator_students(evaluator_id)
    if not student_ids:
        return None
    
    # Search by name
    from ..firebase_config import get_user_profile, get_user_info
    
    search_name = student_name_or_id.lower().strip()
    for sid in student_ids:
        try:
            # Try Firestore first
            profile = get_user_profile(sid)
            if profile and profile.get("name"):
                if profile.get("name").lower() == search_name:
                    return sid
            else:
                # Fallback to Auth
                info = get_user_info(sid)
                if info:
                    display_name = info.get("display_name") or info.get("name") or ""
                    if display_name.lower() == search_name:
                        return sid
        except:
            continue
    
    return None

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
    """Execute a health tool and return the result."""
    
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
        # EVALUATOR-SPECIFIC TOOLS
        # =============================================================================
        
        elif name == "get_student_data":
            student_name_or_id = args.get("student_name_or_id", "")
            if not student_name_or_id:
                return {
                    "success": False,
                    "error": "Por favor, informe o nome ou ID do aluno que deseja consultar."
                }
            
            # Resolve student_id from name or ID
            student_id = _resolve_student_id(user_id, student_name_or_id)
            if not student_id:
                return {
                    "success": False,
                    "error": f"❌ Aluno '{student_name_or_id}' não encontrado ou não está vinculado a você. Verifique o nome ou use 'list_all_students' para ver todos os alunos disponíveis."
                }
            
            # Get student data
            try:
                from ..firebase_config import get_user_profile, get_user_info
                
                # Get student name
                student_name = "Aluno"
                try:
                    profile = get_user_profile(student_id)
                    if profile and profile.get("name"):
                        student_name = profile.get("name")
                    else:
                        info = get_user_info(student_id)
                        if info:
                            student_name = info.get("display_name") or info.get("name") or "Aluno"
                except:
                    pass
                
                # Get recent meals
                recent_meals = load_meals(student_id, limit=10)
                
                # Get today's summary
                today_summary = storage_get_summary(student_id)
                
                # Get goals
                goals = get_goals(student_id)
                
                return {
                    "success": True,
                    "student_id": student_id,
                    "student_name": student_name,
                    "recent_meals": recent_meals[:5],  # Last 5 meals
                    "today_summary": today_summary,
                    "goals": goals,
                    "message": f"📊 Dados de {student_name} (ID: {student_id[:8]}...)"
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"❌ Erro ao buscar dados do aluno: {str(e)}"
                }
        
        elif name == "list_all_students":
            try:
                # Get all students for this evaluator
                student_ids = get_evaluator_students(user_id)
                
                if not student_ids:
                    return {
                        "success": True,
                        "students": [],
                        "count": 0,
                        "message": "📋 Você ainda não tem alunos vinculados. Compartilhe seu código de avaliador para que alunos se vinculem."
                    }
                
                # Get student info
                from ..firebase_config import get_user_profile, get_user_info
                students = []
                
                for sid in student_ids:
                    student_info = {"id": sid, "name": "Aluno", "email": None}
                    try:
                        # Try Firestore first
                        profile = get_user_profile(sid)
                        if profile and profile.get("name"):
                            student_info["name"] = profile.get("name")
                        else:
                            # Fallback to Auth
                            info = get_user_info(sid)
                            if info:
                                student_info["name"] = info.get("display_name") or info.get("name") or "Aluno"
                                student_info["email"] = info.get("email")
                    except:
                        pass
                    
                    # Get last activity (last meal date)
                    try:
                        meals = load_meals(sid, limit=1)
                        if meals:
                            student_info["last_activity"] = meals[0].get("date")
                        else:
                            student_info["last_activity"] = None
                    except:
                        student_info["last_activity"] = None
                    
                    students.append(student_info)
                
                return {
                    "success": True,
                    "students": students,
                    "count": len(students),
                    "message": f"📋 Lista de {len(students)} aluno(s) vinculado(s)"
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"❌ Erro ao listar alunos: {str(e)}"
                }
        
        elif name == "compare_students":
            student_ids_or_names = args.get("student_ids", [])
            metric = args.get("metric", "all")
            period_days = args.get("period_days", 7)
            
            if len(student_ids_or_names) < 2:
                return {
                    "success": False,
                    "error": "❌ É necessário fornecer pelo menos 2 alunos para comparação."
                }
            
            try:
                from datetime import datetime, timedelta
                from ..firebase_config import get_user_profile, get_user_info
                
                # Resolve all student IDs
                resolved_students = []
                for student_name_or_id in student_ids_or_names:
                    student_id = _resolve_student_id(user_id, student_name_or_id)
                    if not student_id:
                        return {
                            "success": False,
                            "error": f"❌ Aluno '{student_name_or_id}' não encontrado ou não está vinculado a você."
                        }
                    
                    # Get student name
                    student_name = "Aluno"
                    try:
                        profile = get_user_profile(student_id)
                        if profile and profile.get("name"):
                            student_name = profile.get("name")
                        else:
                            info = get_user_info(student_id)
                            if info:
                                student_name = info.get("display_name") or info.get("name") or "Aluno"
                    except:
                        pass
                    
                    resolved_students.append({"id": student_id, "name": student_name})
                
                # Calculate date range
                end_date = datetime.now().strftime("%Y-%m-%d")
                start_date = (datetime.now() - timedelta(days=period_days)).strftime("%Y-%m-%d")
                
                # Get summaries for each student
                comparison_data = []
                for student in resolved_students:
                    summaries = get_summaries_by_range(student["id"], start_date, end_date)
                    
                    if summaries:
                        total_calories = sum(s.get("total_calories", 0) for s in summaries)
                        total_protein = sum(s.get("total_protein", 0) for s in summaries)
                        avg_calories = total_calories / len(summaries)
                        avg_protein = total_protein / len(summaries)
                        
                        # Count adherence (days with meals)
                        days_with_meals = sum(1 for s in summaries if s.get("meals_count", 0) > 0)
                        adherence_rate = (days_with_meals / len(summaries)) * 100 if summaries else 0
                        
                        # Get goals
                        goals = get_goals(student["id"])
                        goal_calories = goals.get("daily_calories", 0)
                        goal_protein = goals.get("daily_protein", 0)
                        
                        comparison_data.append({
                            "student_id": student["id"],
                            "student_name": student["name"],
                            "avg_calories": round(avg_calories, 1),
                            "avg_protein": round(avg_protein, 1),
                            "adherence_rate": round(adherence_rate, 1),
                            "days_analyzed": len(summaries),
                            "goal_calories": goal_calories,
                            "goal_protein": goal_protein,
                            "calories_vs_goal": round((avg_calories / goal_calories * 100) if goal_calories > 0 else 0, 1),
                            "protein_vs_goal": round((avg_protein / goal_protein * 100) if goal_protein > 0 else 0, 1)
                        })
                    else:
                        comparison_data.append({
                            "student_id": student["id"],
                            "student_name": student["name"],
                            "avg_calories": 0,
                            "avg_protein": 0,
                            "adherence_rate": 0,
                            "days_analyzed": 0,
                            "goal_calories": 0,
                            "goal_protein": 0,
                            "calories_vs_goal": 0,
                            "protein_vs_goal": 0
                        })
                
                return {
                    "success": True,
                    "comparison": comparison_data,
                    "period": f"{start_date} a {end_date}",
                    "metric": metric,
                    "message": f"📊 Comparação entre {len(resolved_students)} aluno(s) nos últimos {period_days} dias"
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"❌ Erro ao comparar alunos: {str(e)}"
                }
        
        elif name == "get_student_summary":
            student_name_or_id = args.get("student_name_or_id", "")
            period_days = args.get("period_days", 30)
            start_date = args.get("start_date")
            end_date = args.get("end_date")
            
            if not student_name_or_id:
                return {
                    "success": False,
                    "error": "Por favor, informe o nome ou ID do aluno."
                }
            
            # Resolve student_id
            student_id = _resolve_student_id(user_id, student_name_or_id)
            if not student_id:
                return {
                    "success": False,
                    "error": f"❌ Aluno '{student_name_or_id}' não encontrado ou não está vinculado a você."
                }
            
            try:
                from datetime import datetime, timedelta
                from ..firebase_config import get_user_profile, get_user_info
                
                # Get student name
                student_name = "Aluno"
                try:
                    profile = get_user_profile(student_id)
                    if profile and profile.get("name"):
                        student_name = profile.get("name")
                    else:
                        info = get_user_info(student_id)
                        if info:
                            student_name = info.get("display_name") or info.get("name") or "Aluno"
                except:
                    pass
                
                # Calculate date range
                if not end_date:
                    end_date = datetime.now().strftime("%Y-%m-%d")
                if not start_date:
                    start_date = (datetime.now() - timedelta(days=period_days)).strftime("%Y-%m-%d")
                
                # Get summaries
                summaries = get_summaries_by_range(student_id, start_date, end_date)
                
                if not summaries:
                    return {
                        "success": True,
                        "student_id": student_id,
                        "student_name": student_name,
                        "period": f"{start_date} a {end_date}",
                        "summaries": [],
                        "statistics": {},
                        "message": f"📊 Nenhum dado encontrado para {student_name} no período de {start_date} a {end_date}"
                    }
                
                # Calculate statistics
                total_calories = sum(s.get("total_calories", 0) for s in summaries)
                total_protein = sum(s.get("total_protein", 0) for s in summaries)
                total_carbs = sum(s.get("total_carbs", 0) for s in summaries)
                total_fats = sum(s.get("total_fats", 0) for s in summaries)
                
                avg_calories = total_calories / len(summaries)
                avg_protein = total_protein / len(summaries)
                avg_carbs = total_carbs / len(summaries)
                avg_fats = total_fats / len(summaries)
                
                # Get goals
                goals = get_goals(student_id)
                goal_calories = goals.get("daily_calories", 0)
                goal_protein = goals.get("daily_protein", 0)
                
                # Count adherence
                days_with_meals = sum(1 for s in summaries if s.get("meals_count", 0) > 0)
                adherence_rate = (days_with_meals / len(summaries)) * 100 if summaries else 0
                
                # Days that met goals
                days_met_calories = sum(1 for s in summaries 
                                       if goal_calories > 0 
                                       and s.get("total_calories", 0) >= goal_calories * 0.9)  # 90% of goal
                days_met_protein = sum(1 for s in summaries 
                                      if goal_protein > 0 
                                      and s.get("total_protein", 0) >= goal_protein * 0.9)
                
                return {
                    "success": True,
                    "student_id": student_id,
                    "student_name": student_name,
                    "period": f"{start_date} a {end_date}",
                    "summaries": summaries,
                    "statistics": {
                        "total_days": len(summaries),
                        "days_with_meals": days_with_meals,
                        "adherence_rate": round(adherence_rate, 1),
                        "avg_calories": round(avg_calories, 1),
                        "avg_protein": round(avg_protein, 1),
                        "avg_carbs": round(avg_carbs, 1),
                        "avg_fats": round(avg_fats, 1),
                        "goal_calories": goal_calories,
                        "goal_protein": goal_protein,
                        "days_met_calories": days_met_calories,
                        "days_met_protein": days_met_protein,
                        "calories_goal_percentage": round((avg_calories / goal_calories * 100) if goal_calories > 0 else 0, 1),
                        "protein_goal_percentage": round((avg_protein / goal_protein * 100) if goal_protein > 0 else 0, 1)
                    },
                    "goals": goals,
                    "message": f"📊 Resumo completo de {student_name} ({len(summaries)} dias analisados)"
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"❌ Erro ao gerar resumo: {str(e)}"
                }
        
        elif name == "generate_student_report":
            student_name_or_id = args.get("student_name_or_id", "")
            period_days = args.get("period_days", 30)
            include_recommendations = args.get("include_recommendations", True)
            
            if not student_name_or_id:
                return {
                    "success": False,
                    "error": "Por favor, informe o nome ou ID do aluno."
                }
            
            # Resolve student_id
            student_id = _resolve_student_id(user_id, student_name_or_id)
            if not student_id:
                return {
                    "success": False,
                    "error": f"❌ Aluno '{student_name_or_id}' não encontrado ou não está vinculado a você."
                }
            
            try:
                from datetime import datetime, timedelta
                from ..firebase_config import get_user_profile, get_user_info
                
                # Get student name
                student_name = "Aluno"
                student_email = None
                try:
                    profile = get_user_profile(student_id)
                    if profile and profile.get("name"):
                        student_name = profile.get("name")
                    else:
                        info = get_user_info(student_id)
                        if info:
                            student_name = info.get("display_name") or info.get("name") or "Aluno"
                            student_email = info.get("email")
                except:
                    pass
                
                # Calculate date range
                end_date = datetime.now().strftime("%Y-%m-%d")
                start_date = (datetime.now() - timedelta(days=period_days)).strftime("%Y-%m-%d")
                
                # Get comprehensive summary
                summaries = get_summaries_by_range(student_id, start_date, end_date)
                goals = get_goals(student_id)
                recent_meals = load_meals(student_id, limit=20)
                
                # Calculate statistics (same as get_student_summary)
                if summaries:
                    total_calories = sum(s.get("total_calories", 0) for s in summaries)
                    total_protein = sum(s.get("total_protein", 0) for s in summaries)
                    avg_calories = total_calories / len(summaries)
                    avg_protein = total_protein / len(summaries)
                    days_with_meals = sum(1 for s in summaries if s.get("meals_count", 0) > 0)
                    adherence_rate = (days_with_meals / len(summaries)) * 100 if summaries else 0
                else:
                    avg_calories = 0
                    avg_protein = 0
                    adherence_rate = 0
                
                # Build report structure
                report = {
                    "student_id": student_id,
                    "student_name": student_name,
                    "student_email": student_email,
                    "period": f"{start_date} a {end_date}",
                    "generated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "summary": {
                        "total_days": len(summaries) if summaries else 0,
                        "days_with_meals": days_with_meals if summaries else 0,
                        "adherence_rate": round(adherence_rate, 1),
                        "avg_calories": round(avg_calories, 1),
                        "avg_protein": round(avg_protein, 1),
                        "goal_calories": goals.get("daily_calories", 0),
                        "goal_protein": goals.get("daily_protein", 0)
                    },
                    "goals": goals,
                    "recent_meals_count": len(recent_meals),
                    "recommendations": [] if not include_recommendations else _generate_recommendations(summaries, goals, adherence_rate, avg_calories, avg_protein)
                }
                
                return {
                    "success": True,
                    "report": report,
                    "message": f"📄 Relatório profissional de {student_name} gerado com sucesso"
                }
            except Exception as e:
                return {
                    "success": False,
                    "error": f"❌ Erro ao gerar relatório: {str(e)}"
                }
        
        else:
            return {
                "success": False,
                "error": f"❌ Ferramenta desconhecida: '{name}'. Por favor, verifique o nome da ferramenta e tente novamente."
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
