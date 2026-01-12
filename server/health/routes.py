"""
Luna Health Routes
------------------
REST API endpoints for health/nutrition management.
"""

import logging
import traceback
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from .storage import (
    load_meals,
    add_meal,
    update_meal,
    delete_meal,
    get_summary,
    get_summaries_by_range,
    get_goals,
    update_goals,
    get_weights,
    add_weight,
    delete_weight,
    get_notifications,
    mark_notification_read,
    mark_all_notifications_read
)
from .profiles import (
    get_health_profile,
    create_health_profile,
    update_health_profile,
    generate_evaluator_code,
    validate_code,
    link_student_to_evaluator,
    get_evaluator_students,
    get_student_evaluator,
    unlink_student
)
from .permissions import validate_data_access
from datetime import datetime, timedelta
from .foods import search_foods, calculate_nutrition, add_food_manually, get_food_nutrition

# Configurar logger específico para health routes
logger = logging.getLogger("luna.health.routes")

router = APIRouter(prefix="/health", tags=["health"])

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def resolve_user_id(user_id: str, view_as: Optional[str] = None) -> str:
    """
    Resolve o user_id correto baseado no parâmetro view_as.
    
    Se view_as for fornecido:
    - Verifica se user_id é avaliador
    - Verifica se view_as está na lista de alunos do avaliador
    - Se sim, retorna view_as
    - Se não, levanta HTTPException 403
    
    Se view_as não for fornecido:
    - Retorna user_id (comportamento normal)
    
    Args:
        user_id: Firebase UID do usuário atual
        view_as: Firebase UID do aluno a visualizar (opcional)
    
    Returns:
        user_id correto a usar para buscar dados
    
    Raises:
        HTTPException: 403 se acesso negado
    """
    if not view_as:
        return user_id
    
    # CRITICAL SECURITY CHECK: Validate access
    allowed, error_msg = validate_data_access(user_id, view_as, "view")
    
    if not allowed:
        logger.warning(
            f"[SECURITY] Acesso negado: user_id={user_id} tentou acessar "
            f"dados de view_as={view_as}, erro: {error_msg}"
        )
        raise HTTPException(
            status_code=403,
            detail=error_msg or "Acesso negado: você não tem permissão para visualizar os dados deste aluno"
        )
    
    # Additional security check: Verify user is actually an evaluator
    from .profiles import get_health_profile
    user_profile = get_health_profile(user_id)
    if not user_profile or user_profile.get("type") != "evaluator":
        logger.warning(
            f"[SECURITY] Tentativa de acesso não autorizada: user_id={user_id} não é avaliador"
        )
        raise HTTPException(
            status_code=403,
            detail="Acesso negado: apenas avaliadores podem visualizar dados de alunos"
        )
    
    logger.info(
        f"[PERMISSIONS] Acesso permitido: avaliador {user_id} visualizando dados do aluno {view_as}"
    )
    return view_as

# =============================================================================
# MODELS
# =============================================================================

class MealCreate(BaseModel):
    name: str
    meal_type: str  # "breakfast", "lunch", "dinner", "snack"
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fats: Optional[float] = None
    notes: Optional[str] = None
    date: Optional[str] = None
    user_id: Optional[str] = None

class MealUpdate(BaseModel):
    name: Optional[str] = None
    meal_type: Optional[str] = None
    calories: Optional[float] = None
    protein: Optional[float] = None
    carbs: Optional[float] = None
    fats: Optional[float] = None
    notes: Optional[str] = None
    user_id: Optional[str] = None

class GoalsUpdate(BaseModel):
    daily_calories: Optional[float] = None
    daily_protein: Optional[float] = None
    daily_carbs: Optional[float] = None
    daily_fats: Optional[float] = None
    target_weight: Optional[float] = None
    current_weight: Optional[float] = None
    user_id: Optional[str] = None

class SuggestGoalsRequest(BaseModel):
    weight: float  # Peso em kg
    height: float  # Altura em cm
    age: int  # Idade em anos
    gender: str  # "male" ou "female"
    goal: str  # "lose" (emagrecer), "maintain" (manter), "gain" (ganhar massa)
    activity_level: Optional[str] = "moderate"  # "sedentary", "light", "moderate", "active", "very_active"

class ProfileCreateRequest(BaseModel):
    type: str  # "student" ou "evaluator"
    user_id: Optional[str] = None

class ProfileLinkRequest(BaseModel):
    code: str  # Código do avaliador (formato: EVAL-XXXXXX)
    user_id: Optional[str] = None

# =============================================================================
# MEAL ROUTES
# =============================================================================

@router.get("/meals")
async def get_meals(user_id: str = "local", limit: Optional[int] = None, date: Optional[str] = None, view_as: Optional[str] = None):
    """
    Get meals for a user.
    
    Args:
        user_id: Firebase UID do usuário (ou "local" para desenvolvimento)
        limit: Limite de refeições a retornar (opcional, padrão: todas)
        date: Filtrar por data no formato YYYY-MM-DD (opcional)
        view_as: Visualizar dados de outro usuário (apenas para avaliadores, opcional)
    
    Returns:
        Dict com success, meals (lista) e count (número de refeições)
    """
    logger.info(f"[GET /health/meals] user_id={user_id}, limit={limit}, date={date}, view_as={view_as}")
    
    # Resolver user_id baseado em view_as
    target_user_id = resolve_user_id(user_id, view_as)
    
    # Validações de parâmetros
    if limit is not None:
        if limit < 1:
            raise HTTPException(status_code=400, detail="O parâmetro 'limit' deve ser maior que 0")
        if limit > 1000:
            raise HTTPException(status_code=400, detail="O parâmetro 'limit' não pode ser maior que 1000")
    
    if date is not None:
        # Valida formato de data YYYY-MM-DD
        try:
            from datetime import datetime
            datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail="O parâmetro 'date' deve estar no formato YYYY-MM-DD (ex: 2025-01-27)"
            )
    
    try:
        meals = load_meals(target_user_id, limit=limit, date=date)
        logger.info(f"[GET /health/meals] Sucesso: user_id={user_id}, target_user_id={target_user_id}, encontrados {len(meals)} meals")
        return {"success": True, "meals": meals, "count": len(meals)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"[GET /health/meals] Erro: user_id={user_id}, limit={limit}, date={date}, "
            f"erro={str(e)}, traceback={traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/meals")
async def create_meal(meal: MealCreate):
    """Create a new meal."""
    user_id = meal.user_id or "local"
    logger.info(
        f"[POST /health/meals] user_id={user_id}, name={meal.name}, "
        f"meal_type={meal.meal_type}, calories={meal.calories}, "
        f"protein={meal.protein}, carbs={meal.carbs}, fats={meal.fats}, date={meal.date}"
    )
    try:
        new_meal = add_meal(
            user_id=user_id,
            name=meal.name,
            meal_type=meal.meal_type,
            calories=meal.calories,
            protein=meal.protein,
            carbs=meal.carbs,
            fats=meal.fats,
            notes=meal.notes,
            date=meal.date
        )
        logger.info(
            f"[POST /health/meals] Sucesso: user_id={user_id}, meal_id={new_meal.get('id')}, "
            f"name={new_meal.get('name')}"
        )
        return {"success": True, "meal": new_meal}
    except Exception as e:
        logger.error(
            f"[POST /health/meals] Erro: user_id={user_id}, name={meal.name}, "
            f"meal_type={meal.meal_type}, erro={str(e)}, traceback={traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/meals/{meal_id}")
async def edit_meal(meal_id: str, meal: MealUpdate, user_id: str = "local"):
    """Update an existing meal."""
    logger.info(
        f"[PUT /health/meals/{meal_id}] user_id={user_id}, meal_id={meal_id}, "
        f"updates: name={meal.name}, meal_type={meal.meal_type}, calories={meal.calories}, "
        f"protein={meal.protein}, carbs={meal.carbs}, fats={meal.fats}"
    )
    try:
        updated_meal = update_meal(
            user_id=user_id,
            meal_id=meal_id,
            name=meal.name,
            meal_type=meal.meal_type,
            calories=meal.calories,
            protein=meal.protein,
            carbs=meal.carbs,
            fats=meal.fats,
            notes=meal.notes
        )
        if not updated_meal:
            logger.warning(
                f"[PUT /health/meals/{meal_id}] Refeição não encontrada: "
                f"user_id={user_id}, meal_id={meal_id}"
            )
            raise HTTPException(status_code=404, detail="Refeição não encontrada")
        logger.info(
            f"[PUT /health/meals/{meal_id}] Sucesso: user_id={user_id}, "
            f"meal_id={meal_id}, name={updated_meal.get('name')}"
        )
        return {"success": True, "meal": updated_meal}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"[PUT /health/meals/{meal_id}] Erro: user_id={user_id}, meal_id={meal_id}, "
            f"erro={str(e)}, traceback={traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/meals/{meal_id}")
async def remove_meal(meal_id: str, user_id: str = "local"):
    """Delete a meal."""
    logger.info(f"[DELETE /health/meals/{meal_id}] user_id={user_id}, meal_id={meal_id}")
    try:
        success = delete_meal(user_id, meal_id)
        if not success:
            logger.warning(
                f"[DELETE /health/meals/{meal_id}] Refeição não encontrada: "
                f"user_id={user_id}, meal_id={meal_id}"
            )
            raise HTTPException(status_code=404, detail="Refeição não encontrada")
        logger.info(
            f"[DELETE /health/meals/{meal_id}] Sucesso: user_id={user_id}, "
            f"meal_id={meal_id} removido"
        )
        return {"success": True, "message": "Refeição removida com sucesso"}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"[DELETE /health/meals/{meal_id}] Erro: user_id={user_id}, meal_id={meal_id}, "
            f"erro={str(e)}, traceback={traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# GOALS ROUTES
# =============================================================================

@router.get("/goals")
async def get_user_goals(user_id: str = "local", view_as: Optional[str] = None):
    """
    Get user's nutrition goals.
    
    Args:
        user_id: Firebase UID do usuário (ou "local" para desenvolvimento)
        view_as: Visualizar dados de outro usuário (apenas para avaliadores, opcional)
    """
    logger.info(f"[GET /health/goals] user_id={user_id}, view_as={view_as}")
    
    # Resolver user_id baseado em view_as
    target_user_id = resolve_user_id(user_id, view_as)
    
    try:
        goals = get_goals(target_user_id)
        logger.info(
            f"[GET /health/goals] Sucesso: user_id={user_id}, target_user_id={target_user_id}, "
            f"goals_keys={list(goals.keys()) if goals else 'vazio'}"
        )
        return {"success": True, "goals": goals}
    except Exception as e:
        logger.error(
            f"[GET /health/goals] Erro: user_id={user_id}, "
            f"erro={str(e)}, traceback={traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/goals")
async def update_user_goals(goals: GoalsUpdate, user_id: str = "local"):
    """Update user's nutrition goals."""
    user_id = goals.user_id or user_id
    logger.info(
        f"[PUT /health/goals] user_id={user_id}, "
        f"daily_calories={goals.daily_calories}, daily_protein={goals.daily_protein}, "
        f"daily_carbs={goals.daily_carbs}, daily_fats={goals.daily_fats}, "
        f"target_weight={goals.target_weight}, current_weight={goals.current_weight}"
    )
    try:
        updated_goals = update_goals(
            user_id=user_id,
            daily_calories=goals.daily_calories,
            daily_protein=goals.daily_protein,
            daily_carbs=goals.daily_carbs,
            daily_fats=goals.daily_fats,
            target_weight=goals.target_weight,
            current_weight=goals.current_weight
        )
        logger.info(
            f"[PUT /health/goals] Sucesso: user_id={user_id}, "
            f"goals atualizados: {list(updated_goals.keys())}"
        )
        return {"success": True, "goals": updated_goals}
    except Exception as e:
        logger.error(
            f"[PUT /health/goals] Erro: user_id={user_id}, "
            f"erro={str(e)}, traceback={traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# GOALS SUGGESTION ROUTES
# =============================================================================

def calculate_bmr_mifflin_st_jeor(weight_kg: float, height_cm: float, age: int, gender: str) -> float:
    """
    Calcula Taxa Metabólica Basal (BMR) usando a fórmula de Mifflin-St Jeor.
    
    Args:
        weight_kg: Peso em quilogramas
        height_cm: Altura em centímetros
        age: Idade em anos
        gender: "male" ou "female"
    
    Returns:
        BMR em calorias por dia
    """
    if gender.lower() == "male":
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age + 5
    else:  # female
        bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age - 161
    return bmr

def calculate_tdee(bmr: float, activity_level: str) -> float:
    """
    Calcula Taxa de Dispêndio Energético Total (TDEE) baseado no nível de atividade.
    
    Args:
        bmr: Taxa Metabólica Basal
        activity_level: Nível de atividade
            - "sedentary": 1.2 (pouco ou nenhum exercício)
            - "light": 1.375 (exercício leve 1-3 dias/semana)
            - "moderate": 1.55 (exercício moderado 3-5 dias/semana)
            - "active": 1.725 (exercício pesado 6-7 dias/semana)
            - "very_active": 1.9 (exercício muito pesado, trabalho físico)
    
    Returns:
        TDEE em calorias por dia
    """
    multipliers = {
        "sedentary": 1.2,
        "light": 1.375,
        "moderate": 1.55,
        "active": 1.725,
        "very_active": 1.9
    }
    multiplier = multipliers.get(activity_level.lower(), 1.55)  # Padrão: moderado
    return bmr * multiplier

def adjust_calories_for_goal(tdee: float, goal: str) -> float:
    """
    Ajusta calorias baseado no objetivo do usuário.
    
    Args:
        tdee: Taxa de Dispêndio Energético Total
        goal: Objetivo ("lose", "maintain", "gain")
    
    Returns:
        Calorias sugeridas por dia
    """
    if goal.lower() == "lose":
        # Déficit de 500 calorias por dia (perda de ~0.5kg por semana)
        return max(tdee - 500, tdee * 0.8)  # Mínimo 80% do TDEE
    elif goal.lower() == "gain":
        # Superávit de 500 calorias por dia (ganho de ~0.5kg por semana)
        return tdee + 500
    else:  # maintain
        return tdee

def calculate_macros(calories: float, goal: str) -> dict:
    """
    Calcula distribuição de macros baseado nas calorias e objetivo.
    
    Args:
        calories: Calorias diárias
        goal: Objetivo ("lose", "maintain", "gain")
    
    Returns:
        Dict com protein, carbs, fats em gramas
    """
    # Proteína: 1.6-2.2g por kg de peso (usar 2g para ganho, 1.8g para manter, 2.2g para perda)
    # Para simplificar, vamos usar porcentagens fixas baseadas no objetivo
    
    if goal.lower() == "lose":
        # Maior proteína para preservar massa muscular
        protein_pct = 0.30  # 30% de proteína
        carbs_pct = 0.35    # 35% de carboidratos
        fats_pct = 0.35     # 35% de gorduras
    elif goal.lower() == "gain":
        # Mais carboidratos para ganho de massa
        protein_pct = 0.25  # 25% de proteína
        carbs_pct = 0.45    # 45% de carboidratos
        fats_pct = 0.30     # 30% de gorduras
    else:  # maintain
        # Distribuição balanceada
        protein_pct = 0.25  # 25% de proteína
        carbs_pct = 0.40    # 40% de carboidratos
        fats_pct = 0.35     # 35% de gorduras
    
    # Calcular macros em gramas
    # 1g proteína = 4 calorias
    # 1g carboidrato = 4 calorias
    # 1g gordura = 9 calorias
    
    protein_calories = calories * protein_pct
    carbs_calories = calories * carbs_pct
    fats_calories = calories * fats_pct
    
    protein_grams = protein_calories / 4
    carbs_grams = carbs_calories / 4
    fats_grams = fats_calories / 9
    
    return {
        "protein": round(protein_grams, 1),
        "carbs": round(carbs_grams, 1),
        "fats": round(fats_grams, 1)
    }

@router.post("/suggest_goals")
async def suggest_goals(request: SuggestGoalsRequest):
    """
    Sugere metas nutricionais baseadas em dados pessoais.
    
    Usa a fórmula de Mifflin-St Jeor para calcular TMB (Taxa Metabólica Basal)
    e ajusta baseado no nível de atividade e objetivo.
    
    Args:
        request: Dados do usuário
            - weight: Peso em kg
            - height: Altura em cm
            - age: Idade em anos
            - gender: "male" ou "female"
            - goal: "lose" (emagrecer), "maintain" (manter), "gain" (ganhar massa)
            - activity_level: Nível de atividade (opcional, padrão: "moderate")
    
    Returns:
        Dict com success e suggested_goals contendo:
        - daily_calories: Calorias sugeridas por dia
        - daily_protein: Proteína sugerida em gramas
        - daily_carbs: Carboidratos sugeridos em gramas
        - daily_fats: Gorduras sugeridas em gramas
        - bmr: Taxa Metabólica Basal calculada
        - tdee: Taxa de Dispêndio Energético Total
    """
    logger.info(
        f"[POST /health/suggest_goals] weight={request.weight}, height={request.height}, "
        f"age={request.age}, gender={request.gender}, goal={request.goal}, "
        f"activity_level={request.activity_level}"
    )
    
    # Validações
    if request.weight <= 0 or request.weight > 500:
        raise HTTPException(status_code=400, detail="Peso deve estar entre 1 e 500 kg")
    
    if request.height <= 0 or request.height > 300:
        raise HTTPException(status_code=400, detail="Altura deve estar entre 1 e 300 cm")
    
    if request.age <= 0 or request.age > 150:
        raise HTTPException(status_code=400, detail="Idade deve estar entre 1 e 150 anos")
    
    if request.gender.lower() not in ["male", "female", "m", "f"]:
        raise HTTPException(status_code=400, detail="Gênero deve ser 'male' ou 'female'")
    
    if request.goal.lower() not in ["lose", "maintain", "gain"]:
        raise HTTPException(
            status_code=400, 
            detail="Objetivo deve ser 'lose' (emagrecer), 'maintain' (manter) ou 'gain' (ganhar massa)"
        )
    
    # Normalizar gênero
    gender = "male" if request.gender.lower() in ["male", "m"] else "female"
    
    try:
        # Calcular BMR (Taxa Metabólica Basal)
        bmr = calculate_bmr_mifflin_st_jeor(
            weight_kg=request.weight,
            height_cm=request.height,
            age=request.age,
            gender=gender
        )
        
        # Calcular TDEE (Taxa de Dispêndio Energético Total)
        tdee = calculate_tdee(bmr, request.activity_level or "moderate")
        
        # Ajustar calorias baseado no objetivo
        suggested_calories = adjust_calories_for_goal(tdee, request.goal)
        
        # Calcular macros
        macros = calculate_macros(suggested_calories, request.goal)
        
        suggested_goals = {
            "daily_calories": round(suggested_calories, 0),
            "daily_protein": macros["protein"],
            "daily_carbs": macros["carbs"],
            "daily_fats": macros["fats"],
            "bmr": round(bmr, 1),
            "tdee": round(tdee, 1)
        }
        
        logger.info(
            f"[POST /health/suggest_goals] Sucesso: "
            f"calories={suggested_goals['daily_calories']}, "
            f"protein={suggested_goals['daily_protein']}g, "
            f"carbs={suggested_goals['daily_carbs']}g, "
            f"fats={suggested_goals['daily_fats']}g"
        )
        
        return {
            "success": True,
            "suggested_goals": suggested_goals
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"[POST /health/suggest_goals] Erro: "
            f"erro={str(e)}, traceback={traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# HISTORY ROUTES
# =============================================================================

@router.get("/history")
async def get_history(user_id: str = "local", start: Optional[str] = None, end: Optional[str] = None, view_as: Optional[str] = None):
    """
    Get nutrition summaries for a date range.
    
    Args:
        user_id: Firebase UID do usuário (ou "local" para desenvolvimento)
        start: Data inicial no formato YYYY-MM-DD (obrigatório)
        end: Data final no formato YYYY-MM-DD (obrigatório, inclusiva)
        view_as: Visualizar dados de outro usuário (apenas para avaliadores, opcional)
    
    Returns:
        Dict com success e summaries (lista de summaries diários ordenados por data)
    """
    logger.info(f"[GET /health/history] user_id={user_id}, start={start}, end={end}, view_as={view_as}")
    
    # Resolver user_id baseado em view_as
    target_user_id = resolve_user_id(user_id, view_as)
    
    # Validações
    if not start:
        raise HTTPException(status_code=400, detail="Parâmetro 'start' é obrigatório (formato: YYYY-MM-DD)")
    
    if not end:
        raise HTTPException(status_code=400, detail="Parâmetro 'end' é obrigatório (formato: YYYY-MM-DD)")
    
    # Validar formato de datas
    try:
        start_dt = datetime.strptime(start, "%Y-%m-%d")
        end_dt = datetime.strptime(end, "%Y-%m-%d")
    except ValueError:
        raise HTTPException(
            status_code=400,
            detail="Formato de data inválido. Use YYYY-MM-DD (ex: 2025-01-27)"
        )
    
    # Validar que start <= end
    if start_dt > end_dt:
        raise HTTPException(
            status_code=400,
            detail="A data inicial ('start') não pode ser maior que a data final ('end')"
        )
    
    try:
        summaries = get_summaries_by_range(target_user_id, start, end)
        
        logger.info(
            f"[GET /health/history] Sucesso: user_id={user_id}, target_user_id={target_user_id}, "
            f"start={start}, end={end}, summaries_count={len(summaries)}"
        )
        
        return {
            "success": True,
            "summaries": summaries,
            "count": len(summaries),
            "start_date": start,
            "end_date": end
        }
        
    except ValueError as e:
        logger.error(
            f"[GET /health/history] Erro de validação: user_id={user_id}, "
            f"start={start}, end={end}, erro={str(e)}"
        )
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(
            f"[GET /health/history] Erro: user_id={user_id}, start={start}, end={end}, "
            f"erro={str(e)}, traceback={traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# WEIGHTS ROUTES
# =============================================================================

class WeightCreate(BaseModel):
    weight: float  # Peso em kg
    date: Optional[str] = None  # Data no formato YYYY-MM-DD (opcional, padrão: hoje)

@router.get("/weights")
async def get_weights_endpoint(user_id: str = "local", limit: Optional[int] = None, view_as: Optional[str] = None):
    """
    Get weight records for a user.
    
    Args:
        user_id: Firebase UID do usuário (ou "local" para desenvolvimento)
        limit: Limite de registros a retornar (opcional, ordenado por data mais recente primeiro)
        view_as: Visualizar dados de outro usuário (apenas para avaliadores, opcional)
    
    Returns:
        Dict com success, weights (lista) e count (número de registros)
    """
    logger.info(f"[GET /health/weights] user_id={user_id}, limit={limit}, view_as={view_as}")
    
    # Resolver user_id baseado em view_as
    target_user_id = resolve_user_id(user_id, view_as)
    
    # Validações
    if limit is not None:
        if limit < 1:
            raise HTTPException(status_code=400, detail="O parâmetro 'limit' deve ser maior que 0")
        if limit > 1000:
            raise HTTPException(status_code=400, detail="O parâmetro 'limit' não pode ser maior que 1000")
    
    try:
        weights = get_weights(target_user_id, limit=limit)
        logger.info(f"[GET /health/weights] Sucesso: user_id={user_id}, target_user_id={target_user_id}, encontrados {len(weights)} registros")
        return {"success": True, "weights": weights, "count": len(weights)}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"[GET /health/weights] Erro: user_id={user_id}, limit={limit}, "
            f"erro={str(e)}, traceback={traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/weights")
async def create_weight(weight_data: WeightCreate, user_id: str = "local"):
    """
    Add or update a weight record for a user.
    Se já existir um registro para a data, atualiza o peso.
    
    Args:
        weight_data: Dados do peso (weight em kg, date opcional)
        user_id: Firebase UID do usuário (ou "local" para desenvolvimento)
    
    Returns:
        Dict com success e weight (registro criado/atualizado)
    """
    logger.info(
        f"[POST /health/weights] user_id={user_id}, weight={weight_data.weight}, date={weight_data.date}"
    )
    
    try:
        weight_entry = add_weight(
            user_id=user_id,
            weight=weight_data.weight,
            date=weight_data.date
        )
        
        logger.info(
            f"[POST /health/weights] Sucesso: user_id={user_id}, "
            f"date={weight_entry['date']}, weight={weight_entry['weight']}"
        )
        
        return {"success": True, "weight": weight_entry}
        
    except ValueError as e:
        logger.error(
            f"[POST /health/weights] Erro de validação: user_id={user_id}, "
            f"weight={weight_data.weight}, date={weight_data.date}, erro={str(e)}"
        )
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(
            f"[POST /health/weights] Erro: user_id={user_id}, "
            f"erro={str(e)}, traceback={traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/weights/{weight_id}")
async def delete_weight_endpoint(weight_id: str, user_id: str = "local"):
    """
    Delete a weight record by ID.
    
    Args:
        weight_id: ID do registro de peso a deletar
        user_id: Firebase UID do usuário (ou "local" para desenvolvimento)
    
    Returns:
        Dict com success indicando se foi deletado
    """
    logger.info(f"[DELETE /health/weights/{weight_id}] user_id={user_id}")
    
    try:
        deleted = delete_weight(user_id, weight_id)
        
        if deleted:
            logger.info(f"[DELETE /health/weights/{weight_id}] Sucesso: user_id={user_id}")
            return {"success": True, "message": "Peso deletado com sucesso"}
        else:
            logger.warning(f"[DELETE /health/weights/{weight_id}] Não encontrado: user_id={user_id}")
            raise HTTPException(status_code=404, detail="Registro de peso não encontrado")
            
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"[DELETE /health/weights/{weight_id}] Erro: user_id={user_id}, "
            f"erro={str(e)}, traceback={traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# SUMMARY ROUTES
# =============================================================================

@router.get("/daily_overview")
async def get_daily_overview(user_id: str = "local", date: Optional[str] = None, meals_limit: int = 5, view_as: Optional[str] = None):
    """
    Get daily overview - resumo do dia + últimas refeições em uma única chamada.
    
    Este endpoint facilita o carregamento inicial da tela "Hoje" no frontend,
    agregando resumo nutricional e últimas refeições em uma única requisição.
    
    Args:
        user_id: Firebase UID do usuário (ou "local" para desenvolvimento)
        date: Data no formato YYYY-MM-DD (opcional, padrão: hoje)
        meals_limit: Número de refeições a retornar (padrão: 5, máximo: 20)
        view_as: Visualizar dados de outro usuário (apenas para avaliadores, opcional)
    
    Returns:
        Dict com success e overview contendo:
        - summary: Resumo nutricional completo (igual a GET /health/summary)
        - recent_meals: Lista das últimas N refeições do dia
    """
    logger.info(f"[GET /health/daily_overview] user_id={user_id}, date={date}, meals_limit={meals_limit}, view_as={view_as}")
    
    # Resolver user_id baseado em view_as
    target_user_id = resolve_user_id(user_id, view_as)
    
    # Validações
    if meals_limit < 1:
        raise HTTPException(status_code=400, detail="O parâmetro 'meals_limit' deve ser maior que 0")
    if meals_limit > 20:
        raise HTTPException(status_code=400, detail="O parâmetro 'meals_limit' não pode ser maior que 20")
    
    if date is not None:
        try:
            datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail="O parâmetro 'date' deve estar no formato YYYY-MM-DD (ex: 2025-01-27)"
            )
    
    try:
        # Obtém resumo do dia
        summary = get_summary(target_user_id, date=date)
        
        # Obtém últimas refeições do dia
        summary_date = summary.get("date", date or datetime.now().strftime("%Y-%m-%d"))
        # Se summary_date tem hora, pega só a data
        if "T" in summary_date:
            summary_date = summary_date.split("T")[0]
        
        recent_meals = load_meals(target_user_id, limit=meals_limit, date=summary_date)
        
        overview = {
            "summary": summary,
            "recent_meals": recent_meals,
            "meals_count": len(recent_meals)
        }
        
        logger.info(
            f"[GET /health/daily_overview] Sucesso: user_id={user_id}, date={summary_date}, "
            f"meals_count={len(recent_meals)}, total_calories={summary.get('total_calories')}"
        )
        
        return {"success": True, "overview": overview}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"[GET /health/daily_overview] Erro: user_id={user_id}, date={date}, "
            f"erro={str(e)}, traceback={traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
async def get_nutrition_summary(user_id: str = "local", date: Optional[str] = None, view_as: Optional[str] = None):
    """
    Get nutrition summary for a user.
    
    Retorna:
    - Totais do dia (calorias, proteínas, carboidratos, gorduras)
    - Metas nutricionais
    - Saldos (remaining) - diferença entre metas e totais
    - Contagem de refeições
    
    Args:
        user_id: Firebase UID do usuário (ou "local" para desenvolvimento)
        date: Data no formato YYYY-MM-DD (opcional, padrão: hoje)
        view_as: Visualizar dados de outro usuário (apenas para avaliadores, opcional)
    
    Returns:
        Dict com success e summary contendo:
        - date: Data do resumo
        - meals_count: Número de refeições
        - total_calories, total_protein, total_carbs, total_fats: Totais consumidos
        - goals: Metas nutricionais
        - remaining_calories, remaining_protein, remaining_carbs, remaining_fats: Saldos
    """
    logger.info(f"[GET /health/summary] user_id={user_id}, date={date}, view_as={view_as}")
    
    # Resolver user_id baseado em view_as
    target_user_id = resolve_user_id(user_id, view_as)
    
    # Validação de data
    if date is not None:
        try:
            from datetime import datetime
            datetime.strptime(date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=400, 
                detail="O parâmetro 'date' deve estar no formato YYYY-MM-DD (ex: 2025-01-27)"
            )
    
    try:
        summary = get_summary(target_user_id, date=date)
        
        # Garante que todos os campos esperados estão presentes
        required_fields = [
            "date", "meals_count", "total_calories", "total_protein", 
            "total_carbs", "total_fats", "goals", "remaining_calories",
            "remaining_protein", "remaining_carbs", "remaining_fats"
        ]
        for field in required_fields:
            if field not in summary:
                logger.warning(f"[GET /health/summary] Campo '{field}' ausente no resumo, adicionando valor padrão")
                if field.startswith("remaining_"):
                    summary[field] = 0.0
                elif field == "meals_count":
                    summary[field] = 0
                elif field == "goals":
                    summary[field] = {}
                elif field == "date":
                    from datetime import datetime
                    summary[field] = datetime.now().strftime("%Y-%m-%d")
                else:
                    summary[field] = 0.0
        
        logger.info(
            f"[GET /health/summary] Sucesso: user_id={user_id}, target_user_id={target_user_id}, date={summary.get('date')}, "
            f"meals_count={summary.get('meals_count')}, total_calories={summary.get('total_calories')}"
        )
        return {"success": True, "summary": summary}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"[GET /health/summary] Erro: user_id={user_id}, date={date}, "
            f"erro={str(e)}, traceback={traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# FOODS ROUTES
# =============================================================================

@router.get("/foods/search")
async def search_foods_endpoint(query: str = "", limit: int = 10):
    """Search for foods in the database."""
    logger.info(f"[GET /health/foods/search] query='{query}', limit={limit}")
    try:
        foods = search_foods(query, limit=limit)
        logger.info(
            f"[GET /health/foods/search] Sucesso: query='{query}', "
            f"encontrados {len(foods)} alimentos"
        )
        return {"success": True, "foods": foods}
    except Exception as e:
        logger.error(
            f"[GET /health/foods/search] Erro: query='{query}', limit={limit}, "
            f"erro={str(e)}, traceback={traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/foods/calculate")
async def calculate_nutrition_endpoint(food_name: str, grams: float, search_online: bool = True):
    """Calculate nutrition for a specific amount of food. Searches online if not found in database."""
    logger.info(
        f"[GET /health/foods/calculate] food_name='{food_name}', "
        f"grams={grams}, search_online={search_online}"
    )
    try:
        nutrition = await calculate_nutrition(food_name, grams, search_online=search_online)
        if not nutrition:
            logger.warning(
                f"[GET /health/foods/calculate] Alimento não encontrado: "
                f"food_name='{food_name}', grams={grams}"
            )
            raise HTTPException(status_code=404, detail="Alimento não encontrado")
        logger.info(
            f"[GET /health/foods/calculate] Sucesso: food_name='{food_name}', "
            f"grams={grams}, calories={nutrition.get('calories')}"
        )
        return {"success": True, "nutrition": nutrition}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"[GET /health/foods/calculate] Erro: food_name='{food_name}', grams={grams}, "
            f"erro={str(e)}, traceback={traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/foods/add")
async def add_food_endpoint(
    food_name: str,
    calories: float,
    protein: float,
    carbs: float,
    fats: float
):
    """Add a food manually to the database."""
    logger.info(
        f"[POST /health/foods/add] food_name='{food_name}', "
        f"calories={calories}, protein={protein}, carbs={carbs}, fats={fats}"
    )
    try:
        food = add_food_manually(food_name, calories, protein, carbs, fats)
        logger.info(
            f"[POST /health/foods/add] Sucesso: food_name='{food_name}' adicionado ao banco"
        )
        return {"success": True, "food": food}
    except Exception as e:
        logger.error(
            f"[POST /health/foods/add] Erro: food_name='{food_name}', "
            f"erro={str(e)}, traceback={traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/foods/{food_name}")
async def get_food_endpoint(food_name: str, search_online: bool = True):
    """Get nutritional information for a food. Searches online if not found in database."""
    logger.info(
        f"[GET /health/foods/{food_name}] food_name='{food_name}', "
        f"search_online={search_online}"
    )
    try:
        nutrition = await get_food_nutrition(food_name, search_online=search_online)
        if not nutrition:
            logger.warning(
                f"[GET /health/foods/{food_name}] Alimento não encontrado: "
                f"food_name='{food_name}', search_online={search_online}"
            )
            raise HTTPException(status_code=404, detail="Alimento não encontrado")
        logger.info(
            f"[GET /health/foods/{food_name}] Sucesso: food_name='{food_name}', "
            f"calories={nutrition.get('calories')}, protein={nutrition.get('protein')}"
        )
        return {"success": True, "nutrition": nutrition}
    except HTTPException:
        raise
    except Exception as e:
        logger.error(
            f"[GET /health/foods/{food_name}] Erro: food_name='{food_name}', "
            f"search_online={search_online}, erro={str(e)}, traceback={traceback.format_exc()}"
        )
        raise HTTPException(status_code=500, detail=str(e))

# =============================================================================
# PROFILE ROUTES
# =============================================================================

@router.get("/profile")
async def get_profile(user_id: str = "local"):
    """
    Busca perfil de saúde do usuário atual.
    
    Args:
        user_id: Firebase UID do usuário (ou "local" para desenvolvimento)
    
    Returns:
        Dict com perfil do usuário ou None se não encontrado
    """
    logger.info(f"[GET /health/profile] user_id={user_id}")
    
    try:
        profile = get_health_profile(user_id)
        if profile:
            return {
                "success": True,
                "profile": profile
            }
        else:
            return {
                "success": True,
                "profile": None,
                "message": "Perfil não encontrado"
            }
    except Exception as e:
        logger.error(f"[GET /health/profile] Erro: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro ao buscar perfil: {str(e)}")

@router.post("/profile")
async def create_or_update_profile(request: ProfileCreateRequest, user_id: Optional[str] = None):
    """
    Cria ou atualiza perfil de saúde.
    
    Args:
        request: Body com type ("student" ou "evaluator")
        user_id: Firebase UID do usuário (opcional, pode vir no body também)
    
    Returns:
        Dict com perfil criado/atualizado
    """
    # Determinar user_id (prioridade: body > query param > "local")
    final_user_id = request.user_id or user_id or "local"
    
    logger.info(f"[POST /health/profile] user_id={final_user_id}, type={request.type}")
    
    try:
        # Validar tipo
        if request.type not in ["student", "evaluator"]:
            raise HTTPException(status_code=400, detail="Tipo de perfil inválido. Use 'student' ou 'evaluator'")
        
        # Verificar se perfil já existe
        existing = get_health_profile(final_user_id)
        
        if existing:
            # Atualizar tipo se necessário
            if existing.get("type") != request.type:
                profile = update_health_profile(final_user_id, {"type": request.type})
                logger.info(f"[POST /health/profile] Perfil atualizado: {final_user_id}")
                # Se mudou para evaluator e não tem código, garantir que foi gerado
                if request.type == "evaluator" and not profile.get("evaluator_code"):
                    logger.warning(f"[POST /health/profile] Perfil de avaliador sem código, gerando...")
                    generate_evaluator_code(final_user_id)
                    # Recarregar perfil para pegar o código gerado
                    profile = get_health_profile(final_user_id)
            else:
                profile = existing
                # Se já é evaluator mas não tem código, gerar
                if request.type == "evaluator" and not profile.get("evaluator_code"):
                    logger.warning(f"[POST /health/profile] Perfil de avaliador sem código, gerando...")
                    generate_evaluator_code(final_user_id)
                    # Recarregar perfil para pegar o código gerado
                    profile = get_health_profile(final_user_id)
                logger.info(f"[POST /health/profile] Perfil já existe: {final_user_id}")
        else:
            # Criar novo perfil
            profile = create_health_profile(final_user_id, request.type)
            logger.info(f"[POST /health/profile] Perfil criado: {final_user_id}")
        
        return {
            "success": True,
            "profile": profile
        }
    except HTTPException:
        raise
    except ValueError as e:
        logger.error(f"[POST /health/profile] Erro de validação: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[POST /health/profile] Erro: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro ao criar/atualizar perfil: {str(e)}")

@router.get("/profile/code")
async def get_evaluator_code(user_id: str = "local"):
    """
    Retorna código do avaliador (se o usuário for avaliador).
    
    Args:
        user_id: Firebase UID do usuário
    
    Returns:
        Dict com código do avaliador
    """
    logger.info(f"[GET /health/profile/code] user_id={user_id}")
    
    try:
        profile = get_health_profile(user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Perfil não encontrado")
        
        if profile.get("type") != "evaluator":
            raise HTTPException(status_code=403, detail="Usuário não é um avaliador")
        
        code = profile.get("evaluator_code")
        if not code:
            raise HTTPException(status_code=404, detail="Código do avaliador não encontrado")
        
        return {
            "success": True,
            "code": code,
            "message": "Código gerado com sucesso"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /health/profile/code] Erro: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro ao buscar código: {str(e)}")

@router.post("/profile/link")
async def link_to_evaluator(request: ProfileLinkRequest, user_id: Optional[str] = None):
    """
    Vincula aluno ao avaliador usando código.
    
    Args:
        request: Body com code (código do avaliador)
        user_id: Firebase UID do aluno (opcional, pode vir no body também)
    
    Returns:
        Dict com informações do avaliador vinculado
    """
    # Determinar user_id (prioridade: body > query param > "local")
    final_user_id = request.user_id or user_id or "local"
    
    logger.info(f"[POST /health/profile/link] user_id={final_user_id}, code={request.code}")
    
    try:
        link_result = link_student_to_evaluator(final_user_id, request.code)
        
        return {
            "success": True,
            "evaluator": {
                "uid": link_result.get("evaluator_id"),
                "code": link_result.get("evaluator_code")
            },
            "linked_at": link_result.get("linked_at"),
            "message": "Aluno vinculado ao avaliador com sucesso"
        }
    except ValueError as e:
        logger.error(f"[POST /health/profile/link] Erro de validação: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        logger.error(f"[POST /health/profile/link] Erro: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro ao vincular aluno: {str(e)}")

@router.get("/profile/students/search")
async def search_students(name: str, user_id: str = "local"):
    """
    Busca alunos do avaliador por nome (apenas para avaliadores).
    
    Args:
        name: Nome do aluno a buscar (busca parcial, case-insensitive)
        user_id: Firebase UID do avaliador
    
    Returns:
        Dict com lista de alunos que correspondem ao nome
    """
    logger.info(f"[GET /health/profile/students/search] user_id={user_id}, name={name}")
    
    try:
        # Validar que é avaliador
        profile = get_health_profile(user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Perfil não encontrado")
        
        if profile.get("type") != "evaluator":
            raise HTTPException(status_code=403, detail="Apenas avaliadores podem buscar alunos por nome")
        
        # Buscar alunos vinculados
        student_ids = get_evaluator_students(user_id)
        if not student_ids:
            return {
                "success": True,
                "students": [],
                "count": 0,
                "message": "Nenhum aluno vinculado encontrado"
            }
        
        # Buscar por nome
        from ..firebase_config import get_user_profile, get_user_info
        
        matching_students = []
        search_name = name.lower().strip()
        
        for sid in student_ids:
            student_name = None
            student_email = None
            
            try:
                # Try Firestore first
                profile = get_user_profile(sid)
                if profile and profile.get("name"):
                    student_name = profile.get("name")
                else:
                    # Fallback to Auth
                    info = get_user_info(sid)
                    if info:
                        student_name = info.get("display_name") or info.get("name")
                        student_email = info.get("email")
            except:
                pass
            
            # Check if name matches (case-insensitive, partial match)
            if student_name and search_name in student_name.lower():
                matching_students.append({
                    "uid": sid,
                    "name": student_name,
                    "email": student_email
                })
        
        return {
            "success": True,
            "students": matching_students,
            "count": len(matching_students),
            "search_term": name,
            "message": f"Encontrados {len(matching_students)} aluno(s) com nome contendo '{name}'"
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /health/profile/students/search] Erro: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro ao buscar alunos: {str(e)}")

@router.get("/profile/students")
async def get_students(user_id: str = "local"):
    """
    Lista alunos do avaliador (se o usuário for avaliador).
    
    Args:
        user_id: Firebase UID do avaliador
    
    Returns:
        Dict com lista de alunos (incluindo nome do Firebase)
    """
    logger.info(f"[GET /health/profile/students] user_id={user_id}")
    
    try:
        profile = get_health_profile(user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Perfil não encontrado")
        
        if profile.get("type") != "evaluator":
            raise HTTPException(status_code=403, detail="Usuário não é um avaliador")
        
        student_ids = get_evaluator_students(user_id)
        
        # Buscar informações dos alunos (incluindo nome do Firebase)
        students_with_info = []
        try:
            from ..firebase_config import get_user_info
            for student_id in student_ids:
                student_info = {
                    "id": student_id,
                    "name": None,
                    "email": None
                }
                
                # Tentar buscar informações do Firebase (Auth + Firestore)
                try:
                    from ..firebase_config import get_user_profile
                    
                    # Primeiro tenta buscar do Firestore (onde está o campo "name")
                    user_profile = get_user_profile(student_id)
                    if user_profile and user_profile.get("name"):
                        student_info["name"] = user_profile.get("name")
                    
                    # Busca email e display_name do Auth
                    user_info = get_user_info(student_id)
                    if user_info:
                        # Se não encontrou nome no Firestore, tenta do Auth
                        if not student_info["name"]:
                            student_info["name"] = user_info.get("display_name") or user_info.get("name") or user_info.get("displayName")
                        student_info["email"] = user_info.get("email")
                except Exception as e:
                    logger.debug(f"[GET /health/profile/students] Erro ao buscar info do Firebase para {student_id}: {e}")
                
                students_with_info.append(student_info)
        except ImportError:
            # Se não conseguir importar, retornar apenas IDs
            logger.warning("[GET /health/profile/students] Firebase não disponível, retornando apenas IDs")
            students_with_info = [{"id": sid, "name": None, "email": None} for sid in student_ids]
        
        return {
            "success": True,
            "students": [s["id"] for s in students_with_info],  # Manter compatibilidade
            "students_info": students_with_info,  # Nova lista com informações
            "count": len(students_with_info)
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /health/profile/students] Erro: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro ao listar alunos: {str(e)}")

@router.get("/profile/evaluator")
async def get_evaluator(user_id: str = "local"):
    """
    Retorna avaliador do aluno (se o usuário for aluno).
    
    Args:
        user_id: Firebase UID do aluno
    
    Returns:
        Dict com informações do avaliador
    """
    logger.info(f"[GET /health/profile/evaluator] user_id={user_id}")
    
    try:
        profile = get_health_profile(user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Perfil não encontrado")
        
        if profile.get("type") != "student":
            raise HTTPException(status_code=403, detail="Usuário não é um aluno")
        
        evaluator_id = get_student_evaluator(user_id)
        
        if not evaluator_id:
            return {
                "success": True,
                "evaluator": None,
                "message": "Aluno não está vinculado a nenhum avaliador"
            }
        
        # Buscar informações do avaliador
        evaluator_profile = get_health_profile(evaluator_id)
        if not evaluator_profile:
            return {
                "success": True,
                "evaluator": {
                    "uid": evaluator_id
                },
                "message": "Avaliador encontrado, mas perfil não disponível"
            }
        
        return {
            "success": True,
            "evaluator": {
                "uid": evaluator_id,
                "code": evaluator_profile.get("evaluator_code")
            }
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /health/profile/evaluator] Erro: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro ao buscar avaliador: {str(e)}")

@router.delete("/profile/link")
async def unlink_from_evaluator(user_id: str = "local", evaluator_id: Optional[str] = None):
    """
    Remove vinculação entre aluno e avaliador.
    
    Args:
        user_id: Firebase UID do aluno
        evaluator_id: Firebase UID do avaliador (opcional, será buscado se não fornecido)
    
    Returns:
        Dict com resultado da desvinculação
    """
    logger.info(f"[DELETE /health/profile/link] user_id={user_id}, evaluator_id={evaluator_id}")
    
    try:
        result = unlink_student(user_id, evaluator_id)
        
        if result:
            return {
                "success": True,
                "message": "Vinculação removida com sucesso"
            }
        else:
            raise HTTPException(status_code=404, detail="Vinculação não encontrada")
    except ValueError as e:
        logger.error(f"[DELETE /health/profile/link] Erro de validação: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[DELETE /health/profile/link] Erro: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro ao desvincular aluno: {str(e)}")

# =============================================================================
# FASE 6 - NOTIFICAÇÕES (P6.1)
# =============================================================================

@router.get("/profile/notifications")
async def get_notifications_endpoint(user_id: str = "local", unread_only: bool = False, limit: Optional[int] = None):
    """
    Retorna notificações do usuário.
    
    Args:
        user_id: Firebase UID do usuário
        unread_only: Se True, retorna apenas notificações não lidas
        limit: Limite de notificações a retornar (opcional)
    
    Returns:
        Dict com lista de notificações
    """
    logger.info(f"[GET /health/profile/notifications] user_id={user_id}, unread_only={unread_only}, limit={limit}")
    
    try:
        notifications = get_notifications(user_id, unread_only=unread_only, limit=limit)
        unread_count = sum(1 for n in notifications if not n.get("read", False))
        
        return {
            "success": True,
            "notifications": notifications,
            "count": len(notifications),
            "unread_count": unread_count
        }
    except Exception as e:
        logger.error(f"[GET /health/profile/notifications] Erro: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro ao buscar notificações: {str(e)}")

@router.put("/profile/notifications/{notification_id}/read")
async def mark_notification_read_endpoint(notification_id: str, user_id: str = "local"):
    """
    Marca uma notificação como lida.
    
    Args:
        notification_id: ID da notificação
        user_id: Firebase UID do usuário
    
    Returns:
        Dict com sucesso da operação
    """
    logger.info(f"[PUT /health/profile/notifications/{notification_id}/read] user_id={user_id}")
    
    try:
        success = mark_notification_read(user_id, notification_id)
        
        if success:
            return {
                "success": True,
                "message": "Notificação marcada como lida"
            }
        else:
            raise HTTPException(status_code=404, detail="Notificação não encontrada")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[PUT /health/profile/notifications/{notification_id}/read] Erro: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro ao marcar notificação como lida: {str(e)}")

@router.put("/profile/notifications/read-all")
async def mark_all_notifications_read_endpoint(user_id: str = "local"):
    """
    Marca todas as notificações do usuário como lidas.
    
    Args:
        user_id: Firebase UID do usuário
    
    Returns:
        Dict com número de notificações marcadas
    """
    logger.info(f"[PUT /health/profile/notifications/read-all] user_id={user_id}")
    
    try:
        count = mark_all_notifications_read(user_id)
        
        return {
            "success": True,
            "count": count,
            "message": f"{count} notificação(ões) marcada(s) como lida(s)"
        }
    except Exception as e:
        logger.error(f"[PUT /health/profile/notifications/read-all] Erro: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro ao marcar notificações como lidas: {str(e)}")

# =============================================================================
# FASE 6 - ESTATÍSTICAS AGREGADAS (P6.2)
# =============================================================================

@router.get("/profile/students/stats")
async def get_students_stats(user_id: str = "local", period_days: int = 30):
    """
    Retorna estatísticas agregadas de todos os alunos do avaliador.
    
    Args:
        user_id: Firebase UID do avaliador
        period_days: Período em dias para calcular estatísticas (padrão: 30)
    
    Returns:
        Dict com estatísticas agregadas
    """
    logger.info(f"[GET /health/profile/students/stats] user_id={user_id}, period_days={period_days}")
    
    try:
        # Verificar se é avaliador
        profile = get_health_profile(user_id)
        if not profile:
            raise HTTPException(status_code=404, detail="Perfil não encontrado")
        
        if profile.get("type") != "evaluator":
            raise HTTPException(status_code=403, detail="Usuário não é um avaliador")
        
        # Buscar alunos
        student_ids = get_evaluator_students(user_id)
        
        if not student_ids:
            return {
                "success": True,
                "stats": {
                    "total_students": 0,
                    "active_students": 0,
                    "avg_calories": 0,
                    "avg_protein": 0,
                    "avg_adherence_rate": 0,
                    "students_with_goals": 0,
                    "students_without_activity": []
                },
                "period_days": period_days,
                "message": "Nenhum aluno vinculado"
            }
        
        # Calcular estatísticas
        end_date = datetime.now()
        start_date = end_date - timedelta(days=period_days - 1)
        
        total_calories = 0
        total_protein = 0
        total_adherence = 0
        students_with_data = 0
        students_with_goals = 0
        students_without_activity = []
        
        from ..firebase_config import get_user_profile, get_user_info
        
        for student_id in student_ids:
            # Buscar resumos do período
            summaries = get_summaries_by_range(student_id, start_date.strftime("%Y-%m-%d"), end_date.strftime("%Y-%m-%d"))
            goals = get_goals(student_id)
            
            if summaries:
                students_with_data += 1
                # Calcular médias
                student_calories = sum(s.get("total_calories", 0) for s in summaries) / len(summaries)
                student_protein = sum(s.get("total_protein", 0) for s in summaries) / len(summaries)
                
                total_calories += student_calories
                total_protein += student_protein
                
                # Calcular aderência
                daily_calories_goal = goals.get("daily_calories", 0) if goals else 0
                if daily_calories_goal > 0:
                    adherence_count = sum(1 for s in summaries if s.get("total_calories", 0) >= daily_calories_goal * 0.9 and s.get("total_calories", 0) <= daily_calories_goal * 1.1)
                    adherence_rate = adherence_count / len(summaries)
                    total_adherence += adherence_rate
            else:
                # Aluno sem atividade no período
                try:
                    student_profile = get_user_profile(student_id)
                    student_name = student_profile.get("name") if student_profile else None
                    if not student_name:
                        user_info = get_user_info(student_id)
                        student_name = user_info.get("display_name") if user_info else f"Aluno {student_id[:8]}..."
                    students_without_activity.append({
                        "id": student_id,
                        "name": student_name or f"Aluno {student_id[:8]}..."
                    })
                except:
                    students_without_activity.append({
                        "id": student_id,
                        "name": f"Aluno {student_id[:8]}..."
                    })
            
            if goals:
                students_with_goals += 1
        
        # Calcular médias
        avg_calories = total_calories / students_with_data if students_with_data > 0 else 0
        avg_protein = total_protein / students_with_data if students_with_data > 0 else 0
        avg_adherence = total_adherence / students_with_data if students_with_data > 0 else 0
        
        return {
            "success": True,
            "stats": {
                "total_students": len(student_ids),
                "active_students": students_with_data,
                "avg_calories": round(avg_calories, 1),
                "avg_protein": round(avg_protein, 1),
                "avg_adherence_rate": round(avg_adherence, 2),
                "students_with_goals": students_with_goals,
                "students_without_activity": students_without_activity
            },
            "period_days": period_days,
            "start_date": start_date.strftime("%Y-%m-%d"),
            "end_date": end_date.strftime("%Y-%m-%d")
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"[GET /health/profile/students/stats] Erro: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Erro ao calcular estatísticas: {str(e)}")
