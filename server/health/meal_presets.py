"""
Luna Health - Meal Presets (Plano Alimentar)
---------------------------------------------
Storage e gerenciamento de presets de refeições.
"""

import json
import os
import uuid
import logging
from datetime import datetime
from typing import List, Dict, Optional
from pathlib import Path

logger = logging.getLogger("luna.health.meal_presets")

# =============================================================================
# CONSTANTS
# =============================================================================

MEAL_TYPES = {
    "breakfast": {"name": "Café da Manhã", "icon": "🍳", "order": 1},
    "morning_snack": {"name": "Lanche da Manhã", "icon": "🍎", "order": 2},
    "lunch": {"name": "Almoço", "icon": "🥗", "order": 3},
    "afternoon_snack": {"name": "Lanche da Tarde", "icon": "🍌", "order": 4},
    "pre_workout": {"name": "Pré-Treino", "icon": "💪", "order": 5},
    "post_workout": {"name": "Pós-Treino", "icon": "🥤", "order": 6},
    "dinner": {"name": "Jantar", "icon": "🍽️", "order": 7},
    "supper": {"name": "Ceia", "icon": "🌙", "order": 8},
    "snack": {"name": "Lanche", "icon": "🥜", "order": 9},
}

# =============================================================================
# FIREBASE INTEGRATION
# =============================================================================

try:
    from ..firebase_config import get_firestore
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    logger.warning("[MEAL_PRESETS] Firebase não disponível, usando storage local")

# =============================================================================
# LOCAL STORAGE
# =============================================================================

def _get_presets_path(user_id: str) -> Path:
    """Retorna o caminho do arquivo de presets do usuário."""
    base_path = Path("data/health") / user_id
    base_path.mkdir(parents=True, exist_ok=True)
    return base_path / "meal_presets.json"

def _load_local_presets(user_id: str) -> List[Dict]:
    """Carrega presets do storage local."""
    path = _get_presets_path(user_id)
    if not path.exists():
        return []
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
            return data if isinstance(data, list) else []
    except Exception as e:
        logger.error(f"[MEAL_PRESETS] Erro ao carregar presets locais: {e}")
        return []

def _save_local_presets(user_id: str, presets: List[Dict]):
    """Salva presets no storage local."""
    path = _get_presets_path(user_id)
    try:
        with open(path, "w", encoding="utf-8") as f:
            json.dump(presets, f, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"[MEAL_PRESETS] Erro ao salvar presets locais: {e}")

# =============================================================================
# FIREBASE STORAGE
# =============================================================================

def _get_firebase_presets(user_id: str) -> List[Dict]:
    """Carrega presets do Firebase."""
    if not FIREBASE_AVAILABLE:
        return []
    
    try:
        db = get_firestore()
        if db is None:
            return []
        
        presets_ref = db.collection("users").document(user_id).collection("meal_presets")
        presets = []
        
        for doc in presets_ref.stream():
            preset = doc.to_dict()
            preset["id"] = doc.id
            presets.append(preset)
        
        logger.info(f"[MEAL_PRESETS] Carregados {len(presets)} presets do Firebase para {user_id}")
        return presets
    except Exception as e:
        logger.error(f"[MEAL_PRESETS] Erro ao carregar do Firebase: {e}")
        return []

def _save_firebase_preset(user_id: str, preset: Dict) -> bool:
    """Salva um preset no Firebase."""
    if not FIREBASE_AVAILABLE:
        return False
    
    try:
        db = get_firestore()
        if db is None:
            return False
        
        preset_id = preset.get("id")
        if not preset_id:
            return False
        
        presets_ref = db.collection("users").document(user_id).collection("meal_presets")
        presets_ref.document(preset_id).set(preset)
        
        logger.info(f"[MEAL_PRESETS] Preset {preset_id} salvo no Firebase")
        return True
    except Exception as e:
        logger.error(f"[MEAL_PRESETS] Erro ao salvar no Firebase: {e}")
        return False

def _delete_firebase_preset(user_id: str, preset_id: str) -> bool:
    """Deleta um preset do Firebase."""
    if not FIREBASE_AVAILABLE:
        return False
    
    try:
        db = get_firestore()
        if db is None:
            return False
        
        presets_ref = db.collection("users").document(user_id).collection("meal_presets")
        presets_ref.document(preset_id).delete()
        
        logger.info(f"[MEAL_PRESETS] Preset {preset_id} deletado do Firebase")
        return True
    except Exception as e:
        logger.error(f"[MEAL_PRESETS] Erro ao deletar do Firebase: {e}")
        return False

# =============================================================================
# PUBLIC API
# =============================================================================

def get_meal_types() -> Dict:
    """Retorna os tipos de refeição disponíveis."""
    return MEAL_TYPES

def get_presets(user_id: str, include_evaluator: bool = True) -> List[Dict]:
    """
    Retorna todos os presets disponíveis para um usuário.
    
    Args:
        user_id: ID do usuário
        include_evaluator: Se True, inclui presets criados pelo avaliador
    
    Returns:
        Lista de presets ordenados por meal_type
    """
    presets = []
    
    # Tenta carregar do Firebase primeiro
    if FIREBASE_AVAILABLE and user_id and user_id != "local" and len(user_id) > 10:
        firebase_presets = _get_firebase_presets(user_id)
        if firebase_presets:
            presets = firebase_presets
            # Sincroniza com local
            _save_local_presets(user_id, presets)
        else:
            # Fallback para local
            presets = _load_local_presets(user_id)
    else:
        presets = _load_local_presets(user_id)
    
    # Se include_evaluator, busca presets do avaliador para este aluno
    if include_evaluator:
        from .profiles import get_student_evaluator
        evaluator = get_student_evaluator(user_id)
        if evaluator and evaluator.get("evaluator_id"):
            evaluator_id = evaluator["evaluator_id"]
            # Busca presets do avaliador criados para este aluno
            evaluator_presets = _get_presets_for_student(evaluator_id, user_id)
            presets.extend(evaluator_presets)
    
    # Ordena por meal_type
    def sort_key(p):
        meal_type = p.get("meal_type", "snack")
        return MEAL_TYPES.get(meal_type, {}).get("order", 99)
    
    presets.sort(key=sort_key)
    
    return presets

def _get_presets_for_student(evaluator_id: str, student_id: str) -> List[Dict]:
    """Busca presets criados por um avaliador para um aluno específico."""
    # Presets do avaliador são salvos na coleção do avaliador com created_for = student_id
    all_evaluator_presets = []
    
    if FIREBASE_AVAILABLE:
        all_evaluator_presets = _get_firebase_presets(evaluator_id)
    else:
        all_evaluator_presets = _load_local_presets(evaluator_id)
    
    # Filtra apenas os criados para este aluno
    student_presets = [
        p for p in all_evaluator_presets 
        if p.get("created_for") == student_id
    ]
    
    # Marca como criado pelo avaliador
    for p in student_presets:
        p["created_by_evaluator"] = True
        p["evaluator_id"] = evaluator_id
    
    return student_presets

def create_preset(
    user_id: str,
    name: str,
    meal_type: str,
    foods: List[Dict],
    suggested_time: Optional[str] = None,
    notes: Optional[str] = None,
    created_for: Optional[str] = None
) -> Dict:
    """
    Cria um novo preset de refeição.
    
    Args:
        user_id: ID do usuário que está criando
        name: Nome do preset
        meal_type: Tipo de refeição (breakfast, lunch, etc.)
        foods: Lista de alimentos com macros
        suggested_time: Horário sugerido (ex: "07:00")
        notes: Observações
        created_for: ID do aluno (se avaliador criando para aluno)
    
    Returns:
        Preset criado
    """
    preset_id = str(uuid.uuid4())[:8]
    now = datetime.now().isoformat()
    
    # Calcula totais
    total_calories = sum(f.get("calories", 0) or 0 for f in foods)
    total_protein = sum(f.get("protein", 0) or 0 for f in foods)
    total_carbs = sum(f.get("carbs", 0) or 0 for f in foods)
    total_fats = sum(f.get("fats", 0) or 0 for f in foods)
    
    preset = {
        "id": preset_id,
        "user_id": user_id,
        "created_for": created_for or user_id,  # Para quem é o preset
        "created_by_evaluator": created_for is not None and created_for != user_id,
        
        "name": name,
        "meal_type": meal_type,
        "suggested_time": suggested_time,
        "foods": foods,
        
        "total_calories": round(total_calories, 1),
        "total_protein": round(total_protein, 1),
        "total_carbs": round(total_carbs, 1),
        "total_fats": round(total_fats, 1),
        
        "notes": notes,
        "is_active": True,
        
        "created_at": now,
        "updated_at": now
    }
    
    # Salva no Firebase e local
    target_user = user_id  # Presets são salvos na coleção de quem criou
    
    if FIREBASE_AVAILABLE and target_user and target_user != "local":
        _save_firebase_preset(target_user, preset)
    
    # Salva local
    presets = _load_local_presets(target_user)
    presets.append(preset)
    _save_local_presets(target_user, presets)
    
    logger.info(f"[MEAL_PRESETS] Preset '{name}' criado por {user_id} para {created_for or user_id}")
    
    return preset

def update_preset(
    user_id: str,
    preset_id: str,
    updates: Dict
) -> Optional[Dict]:
    """
    Atualiza um preset existente.
    
    Args:
        user_id: ID do usuário
        preset_id: ID do preset
        updates: Campos a atualizar
    
    Returns:
        Preset atualizado ou None se não encontrado
    """
    presets = _load_local_presets(user_id)
    
    for i, preset in enumerate(presets):
        if preset.get("id") == preset_id:
            # Verifica permissão
            if preset.get("user_id") != user_id:
                logger.warning(f"[MEAL_PRESETS] Usuário {user_id} tentou editar preset de outro usuário")
                return None
            
            # Atualiza campos
            for key, value in updates.items():
                if key not in ["id", "user_id", "created_at"]:
                    preset[key] = value
            
            # Recalcula totais se foods foi atualizado
            if "foods" in updates:
                foods = updates["foods"]
                preset["total_calories"] = round(sum(f.get("calories", 0) or 0 for f in foods), 1)
                preset["total_protein"] = round(sum(f.get("protein", 0) or 0 for f in foods), 1)
                preset["total_carbs"] = round(sum(f.get("carbs", 0) or 0 for f in foods), 1)
                preset["total_fats"] = round(sum(f.get("fats", 0) or 0 for f in foods), 1)
            
            preset["updated_at"] = datetime.now().isoformat()
            presets[i] = preset
            
            # Salva
            _save_local_presets(user_id, presets)
            if FIREBASE_AVAILABLE and user_id != "local":
                _save_firebase_preset(user_id, preset)
            
            logger.info(f"[MEAL_PRESETS] Preset {preset_id} atualizado")
            return preset
    
    return None

def delete_preset(user_id: str, preset_id: str) -> bool:
    """
    Deleta um preset.
    
    Args:
        user_id: ID do usuário
        preset_id: ID do preset
    
    Returns:
        True se deletado, False se não encontrado
    """
    presets = _load_local_presets(user_id)
    
    for i, preset in enumerate(presets):
        if preset.get("id") == preset_id:
            # Verifica permissão
            if preset.get("user_id") != user_id:
                logger.warning(f"[MEAL_PRESETS] Usuário {user_id} tentou deletar preset de outro usuário")
                return False
            
            presets.pop(i)
            _save_local_presets(user_id, presets)
            
            if FIREBASE_AVAILABLE and user_id != "local":
                _delete_firebase_preset(user_id, preset_id)
            
            logger.info(f"[MEAL_PRESETS] Preset {preset_id} deletado")
            return True
    
    return False

def get_preset_by_id(user_id: str, preset_id: str) -> Optional[Dict]:
    """Busca um preset específico pelo ID."""
    presets = get_presets(user_id, include_evaluator=True)
    
    for preset in presets:
        if preset.get("id") == preset_id:
            return preset
    
    return None
