"""
Luna Health Storage
-------------------
Storage and utilities for health/nutrition features.
Uses Firebase as primary storage with local JSON fallback.
"""

import json
import os
import time
from pathlib import Path
from datetime import datetime, timedelta
from typing import List, Dict, Optional
import uuid
import logging

# Configurar logging
logger = logging.getLogger(__name__)

# =============================================================================
# FIREBASE IMPORTS (com fallback)
# =============================================================================

try:
    from ..firebase_config import (
        save_meal_to_firebase,
        get_user_meals_from_firebase,
        delete_meal_from_firebase,
        update_meal_in_firebase,
        save_goals_to_firebase,
        get_user_goals_from_firebase,
        save_weight_to_firebase,
        get_user_weights_from_firebase,
        update_weight_in_firebase,
        delete_weight_from_firebase,
        get_firestore,
        initialize_firebase
    )
    # Marca como disponível (inicialização será lazy quando necessário)
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    logger.warning("[HEALTH] ⚠️ Firebase não disponível, usando storage local.")
except Exception as e:
    FIREBASE_AVAILABLE = False
    logger.warning(f"[HEALTH] ⚠️ Erro ao importar Firebase: {e}, usando storage local.")

def _ensure_firebase_initialized() -> bool:
    """Garante que Firebase está inicializado. Retorna True se disponível."""
    if not FIREBASE_AVAILABLE:
        return False
    try:
        # Tenta inicializar se ainda não foi
        db = get_firestore()
        return db is not None
    except Exception as e:
        logger.warning(f"[HEALTH] Erro ao inicializar Firebase: {e}")
        return False

# =============================================================================
# LOCAL STORAGE PATHS
# =============================================================================

DATA_DIR = Path(__file__).parent.parent.parent / "data" / "health"
DATA_DIR.mkdir(parents=True, exist_ok=True)

def get_user_data_dir(user_id: str) -> Path:
    """Get user-specific data directory (apenas para fallback local)."""
    if not user_id or user_id == "local":
        user_id = "local"
    user_dir = DATA_DIR / user_id
    user_dir.mkdir(parents=True, exist_ok=True)
    return user_dir

def _should_use_firebase(user_id: str) -> bool:
    """Determina se deve usar Firebase (não usa para 'local' ou None)."""
    if not user_id or user_id == "local":
        return False
    if not FIREBASE_AVAILABLE:
        return False
    # Garante que Firebase está inicializado
    return _ensure_firebase_initialized()

# =============================================================================
# FILE LOCKING (Simple cross-platform lock using temporary files)
# =============================================================================

class FileLock:
    """Simple file-based lock for preventing concurrent writes."""
    
    def __init__(self, lock_file: Path, timeout: float = 5.0, retry_interval: float = 0.1):
        self.lock_file = lock_file
        self.timeout = timeout
        self.retry_interval = retry_interval
        self.locked = False
    
    def __enter__(self):
        start_time = time.time()
        while time.time() - start_time < self.timeout:
            try:
                # Try to create lock file exclusively
                # On Windows, this will fail if file exists
                # On Unix, we use O_CREAT | O_EXCL
                if os.name == 'nt':  # Windows
                    if not self.lock_file.exists():
                        self.lock_file.write_text(str(os.getpid()), encoding="utf-8")
                        self.locked = True
                        return self
                    else:
                        # Check if lock is stale (check file modification time)
                        try:
                            lock_age = time.time() - self.lock_file.stat().st_mtime
                            # If lock is older than timeout * 2, consider it stale
                            if lock_age > (self.timeout * 2):
                                logger.warning(f"Lock antigo detectado (idade: {lock_age:.1f}s), removendo")
                                self.lock_file.unlink()
                                self.lock_file.write_text(str(os.getpid()), encoding="utf-8")
                                self.locked = True
                                return self
                        except (OSError, ValueError):
                            # Can't check, wait
                            pass
                else:  # Unix-like
                    try:
                        import fcntl
                        self.lock_fd = os.open(str(self.lock_file), os.O_CREAT | os.O_WRONLY | os.O_EXCL)
                        os.write(self.lock_fd, str(os.getpid()).encode())
                        self.locked = True
                        return self
                    except ImportError:
                        # fcntl not available, fallback to simple file creation
                        if not self.lock_file.exists():
                            self.lock_file.write_text(str(os.getpid()), encoding="utf-8")
                            self.locked = True
                            return self
            except (FileExistsError, OSError):
                # Lock exists, wait and retry
                pass
            
            time.sleep(self.retry_interval)
        
        # Timeout reached
        logger.warning(f"Timeout ao adquirir lock para {self.lock_file}")
        raise TimeoutError(f"Não foi possível adquirir lock para {self.lock_file} após {self.timeout}s")
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.locked:
            try:
                if os.name == 'nt':  # Windows
                    if self.lock_file.exists():
                        self.lock_file.unlink()
                else:  # Unix-like
                    # Check if we used fcntl (lock_fd exists)
                    if hasattr(self, 'lock_fd'):
                        try:
                            os.close(self.lock_fd)
                        except:
                            pass
                    if self.lock_file.exists():
                        self.lock_file.unlink()
            except Exception as e:
                logger.error(f"Erro ao liberar lock: {e}")
            finally:
                self.locked = False

def get_lock_file(file_path: Path) -> Path:
    """Get lock file path for a given data file."""
    return file_path.parent / f".{file_path.name}.lock"

# =============================================================================
# DATA VALIDATION
# =============================================================================

def validate_meal(meal: Dict) -> bool:
    """Validate meal structure and types."""
    if not isinstance(meal, dict):
        return False
    
    # Required fields
    required_fields = ["id", "name", "meal_type", "date"]
    for field in required_fields:
        if field not in meal:
            logger.warning(f"Meal sem campo obrigatório '{field}': {meal}")
            return False
    
    # Validate types
    if not isinstance(meal["id"], str) or not meal["id"]:
        return False
    if not isinstance(meal["name"], str) or not meal["name"]:
        return False
    if meal["meal_type"] not in ["breakfast", "lunch", "dinner", "snack"]:
        return False
    if not isinstance(meal["date"], str) or not meal["date"]:
        return False
    
    # Optional numeric fields should be numbers or None
    numeric_fields = ["calories", "protein", "carbs", "fats"]
    for field in numeric_fields:
        if field in meal and meal[field] is not None:
            try:
                float(meal[field])
            except (ValueError, TypeError):
                logger.warning(f"Meal com campo '{field}' inválido: {meal}")
                return False
    
    return True

def validate_meals_list(meals: any) -> bool:
    """Validate that meals is a list of valid meal dicts."""
    if not isinstance(meals, list):
        return False
    
    # Validate each meal
    for meal in meals:
        if not validate_meal(meal):
            return False
    
    return True

def validate_goals(goals: any) -> bool:
    """Validate goals structure and types."""
    if not isinstance(goals, dict):
        return False
    
    # All numeric fields should be numbers or None
    numeric_fields = ["daily_calories", "daily_protein", "daily_carbs", "daily_fats", 
                      "target_weight", "current_weight"]
    for field in numeric_fields:
        if field in goals and goals[field] is not None:
            try:
                float(goals[field])
            except (ValueError, TypeError):
                logger.warning(f"Goals com campo '{field}' inválido: {goals}")
                return False
    
    return True

# =============================================================================
# MEALS
# =============================================================================

def get_meals_file(user_id: str) -> Path:
    return get_user_data_dir(user_id) / "meals.json"

def _load_local_meals(user_id: str) -> List[Dict]:
    """Load meals from local JSON file with validation and error handling."""
    file_path = get_meals_file(user_id)
    
    if not file_path.exists():
        logger.debug(f"Arquivo meals.json não existe para user_id={user_id}, retornando lista vazia")
        return []
    
    # Check if file is empty
    try:
        content = file_path.read_text(encoding="utf-8").strip()
        if not content:
            logger.warning(f"Arquivo meals.json vazio para user_id={user_id}, retornando lista vazia")
            return []
    except Exception as e:
        logger.error(f"Erro ao ler arquivo meals.json para user_id={user_id}: {e}")
        return []
    
    # Try to parse JSON
    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        logger.error(f"Erro ao parsear JSON de meals.json para user_id={user_id}: {e}")
        # Backup do arquivo corrompido
        backup_path = file_path.with_suffix(f".json.corrupted.{int(time.time())}")
        try:
            file_path.rename(backup_path)
            logger.info(f"Arquivo corrompido movido para backup: {backup_path}")
        except Exception as backup_error:
            logger.error(f"Erro ao criar backup do arquivo corrompido: {backup_error}")
        return []
    
    # Validate structure
    if not isinstance(data, list):
        logger.error(f"Formato inválido em meals.json para user_id={user_id}: esperado lista, recebido {type(data)}")
        return []
    
    # Validate each meal
    valid_meals = []
    for i, meal in enumerate(data):
        if validate_meal(meal):
            valid_meals.append(meal)
        else:
            logger.warning(f"Meal inválido na posição {i} para user_id={user_id}, ignorando: {meal}")
    
    if len(valid_meals) < len(data):
        logger.info(f"Filtrados {len(data) - len(valid_meals)} meals inválidos para user_id={user_id}")
    
    return valid_meals

def _save_local_meals(user_id: str, meals: List[Dict]) -> None:
    """Save meals to local JSON file with locking."""
    file_path = get_meals_file(user_id)
    lock_file = get_lock_file(file_path)
    
    # Validate before saving
    if not validate_meals_list(meals):
        raise ValueError("Lista de meals inválida: estrutura ou tipos incorretos")
    
    # Use lock to prevent concurrent writes
    try:
        with FileLock(lock_file):
            # Write to temporary file first, then rename (atomic on most systems)
            temp_file = file_path.with_suffix(f".json.tmp.{os.getpid()}")
            try:
                temp_file.write_text(
                    json.dumps(meals, ensure_ascii=False, indent=2), 
                    encoding="utf-8"
                )
                # Atomic rename
                temp_file.replace(file_path)
                logger.debug(f"Meals salvos com sucesso para user_id={user_id} ({len(meals)} meals)")
            except Exception as e:
                # Clean up temp file on error
                if temp_file.exists():
                    try:
                        temp_file.unlink()
                    except:
                        pass
                raise e
    except TimeoutError:
        logger.error(f"Timeout ao salvar meals para user_id={user_id}")
        raise
    except Exception as e:
        logger.error(f"Erro ao salvar meals para user_id={user_id}: {e}")
        raise

def load_meals(user_id: str, limit: Optional[int] = None, date: Optional[str] = None) -> List[Dict]:
    """
    Load meals for a user.
    If date is provided (YYYY-MM-DD), filters by date.
    Usa Firebase se disponível, senão usa storage local.
    """
    if _should_use_firebase(user_id):
        try:
            meals = get_user_meals_from_firebase(user_id, limit=limit, date=date)
            logger.debug(f"[HEALTH] Carregadas {len(meals)} refeições do Firebase para user_id={user_id}")
            return meals
        except Exception as e:
            logger.error(f"[HEALTH] Erro ao carregar refeições do Firebase: {e}, usando fallback local")
            # Fallback para local
    
    # Fallback local
    meals = _load_local_meals(user_id)
    
    # Filter by date if provided
    if date:
        meals = [m for m in meals if m.get("date", "").startswith(date)]
    
    # Sort by date (most recent first)
    meals.sort(key=lambda x: x.get("date", ""), reverse=True)
    
    # Apply limit
    if limit:
        meals = meals[:limit]
    
    return meals

def add_meal(
    user_id: str,
    name: str,
    meal_type: str,  # "breakfast", "lunch", "dinner", "snack"
    calories: Optional[float] = None,
    protein: Optional[float] = None,
    carbs: Optional[float] = None,
    fats: Optional[float] = None,
    notes: Optional[str] = None,
    date: Optional[str] = None
) -> Dict:
    """Add a new meal. Usa Firebase se disponível, senão usa storage local."""
    
    meal_id = str(uuid.uuid4())
    meal_date = date if date else datetime.now().isoformat()
    
    # Se a data for só YYYY-MM-DD, adiciona hora
    if date and len(date) == 10:
        meal_date = f"{date}T{datetime.now().strftime('%H:%M:%S')}"
    
    meal = {
        "id": meal_id,
        "name": name,
        "meal_type": meal_type,
        "calories": calories,
        "protein": protein,
        "carbs": carbs,
        "fats": fats,
        "notes": notes,
        "date": meal_date,
        "created_at": datetime.now().isoformat()
    }
    
    # Tenta salvar no Firebase primeiro
    if _should_use_firebase(user_id):
        try:
            if save_meal_to_firebase(user_id, meal):
                logger.debug(f"[HEALTH] Refeição salva no Firebase: {meal_id}")
                return meal
            else:
                logger.warning(f"[HEALTH] Falha ao salvar no Firebase, usando fallback local")
        except Exception as e:
            logger.error(f"[HEALTH] Erro ao salvar no Firebase: {e}, usando fallback local")
    
    # Fallback local
    meals = _load_local_meals(user_id)
    meals.append(meal)
    _save_local_meals(user_id, meals)
    
    return meal

def update_meal(
    user_id: str,
    meal_id: str,
    name: Optional[str] = None,
    meal_type: Optional[str] = None,
    calories: Optional[float] = None,
    protein: Optional[float] = None,
    carbs: Optional[float] = None,
    fats: Optional[float] = None,
    notes: Optional[str] = None
) -> Optional[Dict]:
    """Update an existing meal. Usa Firebase se disponível, senão usa storage local."""
    
    # Prepara updates
    updates = {}
    if name is not None:
        updates["name"] = name
    if meal_type is not None:
        updates["meal_type"] = meal_type
    if calories is not None:
        updates["calories"] = calories
    if protein is not None:
        updates["protein"] = protein
    if carbs is not None:
        updates["carbs"] = carbs
    if fats is not None:
        updates["fats"] = fats
    if notes is not None:
        updates["notes"] = notes
    
    if not updates:
        return None
    
    # Tenta atualizar no Firebase primeiro
    if _should_use_firebase(user_id):
        try:
            if update_meal_in_firebase(user_id, meal_id, updates):
                # Busca a refeição atualizada
                meals = get_user_meals_from_firebase(user_id, limit=1000)
                for meal in meals:
                    if meal.get("id") == meal_id:
                        logger.debug(f"[HEALTH] Refeição atualizada no Firebase: {meal_id}")
                        return meal
            else:
                logger.warning(f"[HEALTH] Falha ao atualizar no Firebase, usando fallback local")
        except Exception as e:
            logger.error(f"[HEALTH] Erro ao atualizar no Firebase: {e}, usando fallback local")
    
    # Fallback local
    meals = _load_local_meals(user_id)
    
    for meal in meals:
        if meal.get("id") == meal_id:
            meal.update(updates)
            meal["updated_at"] = datetime.now().isoformat()
            _save_local_meals(user_id, meals)
            return meal
    
    return None

def delete_meal(user_id: str, meal_id: str) -> bool:
    """Delete a meal. Usa Firebase se disponível, senão usa storage local."""
    
    # Tenta deletar no Firebase primeiro
    if _should_use_firebase(user_id):
        try:
            if delete_meal_from_firebase(user_id, meal_id):
                logger.debug(f"[HEALTH] Refeição deletada do Firebase: {meal_id}")
                return True
            else:
                logger.warning(f"[HEALTH] Falha ao deletar no Firebase, usando fallback local")
        except Exception as e:
            logger.error(f"[HEALTH] Erro ao deletar no Firebase: {e}, usando fallback local")
    
    # Fallback local
    meals = _load_local_meals(user_id)
    original_count = len(meals)
    meals = [m for m in meals if m.get("id") != meal_id]
    
    if len(meals) < original_count:
        _save_local_meals(user_id, meals)
        return True
    return False

# =============================================================================
# GOALS
# =============================================================================

def get_goals_file(user_id: str) -> Path:
    return get_user_data_dir(user_id) / "goals.json"

def _load_local_goals(user_id: str) -> Dict:
    """Load goals from local JSON file with validation and error handling."""
    file_path = get_goals_file(user_id)
    
    if not file_path.exists():
        logger.debug(f"Arquivo goals.json não existe para user_id={user_id}, retornando dict vazio")
        return {}
    
    # Check if file is empty
    try:
        content = file_path.read_text(encoding="utf-8").strip()
        if not content:
            logger.warning(f"Arquivo goals.json vazio para user_id={user_id}, retornando dict vazio")
            return {}
    except Exception as e:
        logger.error(f"Erro ao ler arquivo goals.json para user_id={user_id}: {e}")
        return {}
    
    # Try to parse JSON
    try:
        data = json.loads(content)
    except json.JSONDecodeError as e:
        logger.error(f"Erro ao parsear JSON de goals.json para user_id={user_id}: {e}")
        # Backup do arquivo corrompido
        backup_path = file_path.with_suffix(f".json.corrupted.{int(time.time())}")
        try:
            file_path.rename(backup_path)
            logger.info(f"Arquivo corrompido movido para backup: {backup_path}")
        except Exception as backup_error:
            logger.error(f"Erro ao criar backup do arquivo corrompido: {backup_error}")
        return {}
    
    # Validate structure
    if not isinstance(data, dict):
        logger.error(f"Formato inválido em goals.json para user_id={user_id}: esperado dict, recebido {type(data)}")
        return {}
    
    # Validate goals
    if not validate_goals(data):
        logger.warning(f"Goals inválidos para user_id={user_id}, retornando dict vazio")
        return {}
    
    return data

def _save_local_goals(user_id: str, goals: Dict) -> None:
    """Save goals to local JSON file with locking."""
    file_path = get_goals_file(user_id)
    lock_file = get_lock_file(file_path)
    
    # Validate before saving
    if not validate_goals(goals):
        raise ValueError("Goals inválidos: estrutura ou tipos incorretos")
    
    # Use lock to prevent concurrent writes
    try:
        with FileLock(lock_file):
            # Write to temporary file first, then rename (atomic on most systems)
            temp_file = file_path.with_suffix(f".json.tmp.{os.getpid()}")
            try:
                temp_file.write_text(
                    json.dumps(goals, ensure_ascii=False, indent=2), 
                    encoding="utf-8"
                )
                # Atomic rename
                temp_file.replace(file_path)
                logger.debug(f"Goals salvos com sucesso para user_id={user_id}")
            except Exception as e:
                # Clean up temp file on error
                if temp_file.exists():
                    try:
                        temp_file.unlink()
                    except:
                        pass
                raise e
    except TimeoutError:
        logger.error(f"Timeout ao salvar goals para user_id={user_id}")
        raise
    except Exception as e:
        logger.error(f"Erro ao salvar goals para user_id={user_id}: {e}")
        raise

def get_goals(user_id: str) -> Dict:
    """Get user's nutrition goals. Usa Firebase se disponível, senão usa storage local."""
    if _should_use_firebase(user_id):
        try:
            goals = get_user_goals_from_firebase(user_id)
            logger.debug(f"[HEALTH] Metas carregadas do Firebase para user_id={user_id}")
            return goals
        except Exception as e:
            logger.error(f"[HEALTH] Erro ao carregar metas do Firebase: {e}, usando fallback local")
            # Fallback para local
    
    return _load_local_goals(user_id)

def update_goals(
    user_id: str,
    daily_calories: Optional[float] = None,
    daily_protein: Optional[float] = None,
    daily_carbs: Optional[float] = None,
    daily_fats: Optional[float] = None,
    target_weight: Optional[float] = None,
    current_weight: Optional[float] = None
) -> Dict:
    """Update user's nutrition goals. Usa Firebase se disponível, senão usa storage local."""
    
    # Carrega goals existentes
    if _should_use_firebase(user_id):
        goals = get_user_goals_from_firebase(user_id)
    else:
        goals = _load_local_goals(user_id)
    
    # Atualiza campos
    if daily_calories is not None:
        goals["daily_calories"] = daily_calories
    if daily_protein is not None:
        goals["daily_protein"] = daily_protein
    if daily_carbs is not None:
        goals["daily_carbs"] = daily_carbs
    if daily_fats is not None:
        goals["daily_fats"] = daily_fats
    if target_weight is not None:
        goals["target_weight"] = target_weight
    if current_weight is not None:
        goals["current_weight"] = current_weight
    
    goals["updated_at"] = datetime.now().isoformat()
    
    # Tenta salvar no Firebase primeiro
    if _should_use_firebase(user_id):
        try:
            if save_goals_to_firebase(user_id, goals):
                logger.debug(f"[HEALTH] Metas salvas no Firebase para user_id={user_id}")
                return goals
            else:
                logger.warning(f"[HEALTH] Falha ao salvar metas no Firebase, usando fallback local")
        except Exception as e:
            logger.error(f"[HEALTH] Erro ao salvar metas no Firebase: {e}, usando fallback local")
    
    # Fallback local
    _save_local_goals(user_id, goals)
    
    return goals

# =============================================================================
# SUMMARY / STATS
# =============================================================================

def get_summary(user_id: str, date: Optional[str] = None) -> Dict:
    """
    Get nutrition summary for a user.
    If date is provided (YYYY-MM-DD), returns summary for that day.
    Otherwise returns today's summary.
    """
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")
    
    meals = load_meals(user_id, date=date)
    
    total_calories = sum(m.get("calories") or 0 for m in meals)
    total_protein = sum(m.get("protein") or 0 for m in meals)
    total_carbs = sum(m.get("carbs") or 0 for m in meals)
    total_fats = sum(m.get("fats") or 0 for m in meals)
    
    goals = get_goals(user_id)
    
    # Extrair campos de peso
    current_weight = goals.get("current_weight")
    target_weight = goals.get("target_weight")
    
    # Calcular diferença de peso
    weight_difference = None
    if current_weight is not None and target_weight is not None:
        weight_difference = target_weight - current_weight
    
    return {
        "date": date,
        "meals_count": len(meals),
        "total_calories": total_calories,
        "total_protein": total_protein,
        "total_carbs": total_carbs,
        "total_fats": total_fats,
        "goals": goals,
        "remaining_calories": (goals.get("daily_calories") or 0) - total_calories,
        "remaining_protein": (goals.get("daily_protein") or 0) - total_protein,
        "remaining_carbs": (goals.get("daily_carbs") or 0) - total_carbs,
        "remaining_fats": (goals.get("daily_fats") or 0) - total_fats,
        # Campos de peso
        "current_weight": current_weight,
        "target_weight": target_weight,
        "weight_difference": weight_difference
    }

def get_summaries_by_range(user_id: str, start_date: str, end_date: str) -> List[Dict]:
    """
    Get nutrition summaries for a date range.
    
    Args:
        user_id: Firebase UID do usuário (ou "local" para desenvolvimento)
        start_date: Data inicial no formato YYYY-MM-DD
        end_date: Data final no formato YYYY-MM-DD (inclusiva)
    
    Returns:
        Lista de summaries diários ordenados por data (mais antiga primeiro)
    """
    try:
        # Validar formato das datas
        start_dt = datetime.strptime(start_date, "%Y-%m-%d")
        end_dt = datetime.strptime(end_date, "%Y-%m-%d")
        
        if start_dt > end_dt:
            raise ValueError("start_date não pode ser maior que end_date")
        
        # Limitar intervalo máximo (90 dias por padrão para evitar sobrecarga)
        max_days = 90  # Permitir até 90 dias
        days_diff = (end_dt - start_dt).days + 1
        if days_diff > max_days:
            raise ValueError(f"Intervalo muito grande. Máximo permitido: {max_days} dias. Você solicitou {days_diff} dias.")
        
        # Gerar lista de datas no intervalo
        summaries = []
        current_date = start_dt
        
        while current_date <= end_dt:
            date_str = current_date.strftime("%Y-%m-%d")
            try:
                summary = get_summary(user_id, date=date_str)
                summaries.append(summary)
            except Exception as e:
                # Se falhar ao obter summary de uma data específica, logar e continuar
                logger.warning(f"[HEALTH] Erro ao obter summary para {date_str}: {e}, continuando...")
                # Adicionar summary vazio para manter consistência
                summaries.append({
                    "date": date_str,
                    "meals_count": 0,
                    "total_calories": 0,
                    "total_protein": 0,
                    "total_carbs": 0,
                    "total_fats": 0,
                    "goals": {},
                    "remaining_calories": 0,
                    "remaining_protein": 0,
                    "remaining_carbs": 0,
                    "remaining_fats": 0
                })
            # Avançar para o próximo dia
            current_date += timedelta(days=1)
        
        return summaries
        
    except ValueError as e:
        if "does not match format" in str(e) or "time data" in str(e):
            raise ValueError(f"Formato de data inválido. Use YYYY-MM-DD (ex: 2025-01-27)")
        raise
    except Exception as e:
        logger.error(f"[HEALTH] Erro ao obter summaries por intervalo: {e}")
        raise

# =============================================================================
# WEIGHTS
# =============================================================================

def get_weights_file(user_id: str) -> Path:
    """Get path to weights.json file for a user."""
    return get_user_data_dir(user_id) / "weights.json"

def _load_local_weights(user_id: str) -> List[Dict]:
    """Load weights from local JSON file with validation and error handling."""
    file_path = get_weights_file(user_id)
    
    if not file_path.exists():
        logger.debug(f"Arquivo weights.json não existe para user_id={user_id}, retornando lista vazia")
        return []
    
    try:
        with FileLock(file_path):
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read().strip()
                if not content:
                    logger.debug(f"Arquivo weights.json vazio para user_id={user_id}, retornando lista vazia")
                    return []
                
                data = json.loads(content)
                
                # Validar estrutura
                if not isinstance(data, list):
                    logger.warning(f"weights.json não é uma lista para user_id={user_id}, criando backup e retornando lista vazia")
                    # Criar backup
                    backup_path = file_path.with_suffix('.json.backup')
                    file_path.rename(backup_path)
                    return []
                
                # Validar cada entrada
                valid_weights = []
                for weight_entry in data:
                    if isinstance(weight_entry, dict) and "date" in weight_entry and "weight" in weight_entry:
                        try:
                            float(weight_entry["weight"])  # Validar que weight é numérico
                            valid_weights.append(weight_entry)
                        except (ValueError, TypeError):
                            logger.warning(f"Entrada de peso inválida ignorada: {weight_entry}")
                    else:
                        logger.warning(f"Entrada de peso com estrutura inválida ignorada: {weight_entry}")
                
                logger.debug(f"Carregados {len(valid_weights)} registros de peso para user_id={user_id}")
                return valid_weights
                
    except json.JSONDecodeError as e:
        logger.error(f"Erro ao decodificar weights.json para user_id={user_id}: {e}")
        # Criar backup do arquivo corrompido
        backup_path = file_path.with_suffix('.json.backup')
        try:
            file_path.rename(backup_path)
            logger.info(f"Backup criado: {backup_path}")
        except Exception:
            pass
        return []
    except Exception as e:
        logger.error(f"Erro ao carregar weights.json para user_id={user_id}: {e}")
        return []

def _save_local_weights(user_id: str, weights: List[Dict]) -> None:
    """Save weights to local JSON file with locking."""
    file_path = get_weights_file(user_id)
    file_path.parent.mkdir(parents=True, exist_ok=True)
    
    # Validar dados antes de salvar
    if not isinstance(weights, list):
        raise ValueError("weights deve ser uma lista")
    
    for weight_entry in weights:
        if not isinstance(weight_entry, dict):
            raise ValueError("Cada entrada de peso deve ser um dicionário")
        if "date" not in weight_entry or "weight" not in weight_entry:
            raise ValueError("Cada entrada de peso deve ter 'date' e 'weight'")
        try:
            float(weight_entry["weight"])
        except (ValueError, TypeError):
            raise ValueError(f"Peso inválido: {weight_entry['weight']}")
    
    try:
        with FileLock(file_path):
            # Criar backup antes de salvar
            if file_path.exists():
                backup_path = file_path.with_suffix('.json.backup')
                try:
                    import shutil
                    shutil.copy2(file_path, backup_path)
                except Exception:
                    pass
            
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(weights, f, indent=2, ensure_ascii=False)
            
            logger.debug(f"Salvos {len(weights)} registros de peso para user_id={user_id}")
    except Exception as e:
        logger.error(f"Erro ao salvar weights.json para user_id={user_id}: {e}")
        raise

def get_weights(user_id: str, limit: Optional[int] = None) -> List[Dict]:
    """
    Get weight records for a user.
    Usa Firebase se disponível, senão usa storage local.
    
    Args:
        user_id: Firebase UID do usuário (ou "local" para desenvolvimento)
        limit: Limite de registros a retornar (opcional, ordenado por data mais recente primeiro)
    
    Returns:
        Lista de registros de peso ordenados por data (mais recente primeiro)
    """
    if _should_use_firebase(user_id):
        try:
            weights = get_user_weights_from_firebase(user_id, limit=limit)
            logger.debug(f"[HEALTH] Carregados {len(weights)} registros de peso do Firebase para user_id={user_id}")
            return weights
        except Exception as e:
            logger.error(f"[HEALTH] Erro ao carregar pesos do Firebase: {e}, usando fallback local")
    
    # Fallback para storage local
    weights = _load_local_weights(user_id)
    
    # Ordenar por data (mais recente primeiro)
    weights.sort(key=lambda x: x.get("date", ""), reverse=True)
    
    # Aplicar limite se especificado
    if limit is not None and limit > 0:
        weights = weights[:limit]
    
    return weights

def add_weight(user_id: str, weight: float, date: Optional[str] = None) -> Dict:
    """
    Add or update a weight record for a user.
    Se já existir um registro para a data, atualiza o peso.
    
    Args:
        user_id: Firebase UID do usuário (ou "local" para desenvolvimento)
        weight: Peso em kg
        date: Data no formato YYYY-MM-DD (opcional, padrão: hoje)
    
    Returns:
        Dict com o registro de peso criado/atualizado
    """
    if not date:
        date = datetime.now().strftime("%Y-%m-%d")
    
    # Validar data
    try:
        datetime.strptime(date, "%Y-%m-%d")
    except ValueError:
        raise ValueError(f"Formato de data inválido. Use YYYY-MM-DD (ex: 2025-01-27)")
    
    # Validar peso
    try:
        weight_float = float(weight)
        if weight_float <= 0 or weight_float > 500:
            raise ValueError("Peso deve estar entre 1 e 500 kg")
    except (ValueError, TypeError):
        raise ValueError(f"Peso inválido: {weight}")
    
    # Tenta usar Firebase primeiro
    if _should_use_firebase(user_id):
        try:
            # Verificar se já existe registro para esta data no Firebase
            existing_weights = get_user_weights_from_firebase(user_id, limit=1000)
            existing_weight = None
            for w in existing_weights:
                if w.get("date") == date:
                    existing_weight = w
                    break
            
            if existing_weight:
                # Atualizar registro existente
                weight_entry = {
                    "id": existing_weight.get("id"),
                    "date": date,
                    "weight": weight_float,
                    "created_at": existing_weight.get("created_at", datetime.now().isoformat()),
                    "updated_at": datetime.now().isoformat()
                }
                if update_weight_in_firebase(user_id, weight_entry["id"], {"weight": weight_float, "date": date}):
                    logger.debug(f"[HEALTH] Peso atualizado no Firebase: {weight_entry['id']}")
                    return weight_entry
                else:
                    logger.warning(f"[HEALTH] Falha ao atualizar peso no Firebase, usando fallback local")
            else:
                # Criar novo registro
                weight_entry = {
                    "id": str(uuid.uuid4()),
                    "date": date,
                    "weight": weight_float,
                    "created_at": datetime.now().isoformat(),
                    "updated_at": datetime.now().isoformat()
                }
                if save_weight_to_firebase(user_id, weight_entry):
                    logger.debug(f"[HEALTH] Peso salvo no Firebase: {weight_entry['id']}")
                    return weight_entry
                else:
                    logger.warning(f"[HEALTH] Falha ao salvar peso no Firebase, usando fallback local")
        except Exception as e:
            logger.error(f"[HEALTH] Erro ao salvar peso no Firebase: {e}, usando fallback local")
    
    # Fallback para storage local
    weights = _load_local_weights(user_id)
    
    # Verificar se já existe registro para esta data
    existing_index = None
    for i, entry in enumerate(weights):
        if entry.get("date") == date:
            existing_index = i
            break
    
    # Criar/atualizar registro
    weight_entry = {
        "id": str(uuid.uuid4()),
        "date": date,
        "weight": weight_float,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    if existing_index is not None:
        # Atualizar registro existente
        weight_entry["id"] = weights[existing_index].get("id", weight_entry["id"])
        weights[existing_index] = weight_entry
        logger.info(f"Peso atualizado para user_id={user_id}, date={date}, weight={weight_float}")
    else:
        # Adicionar novo registro
        weights.append(weight_entry)
        logger.info(f"Peso adicionado para user_id={user_id}, date={date}, weight={weight_float}")
    
    # Salvar
    _save_local_weights(user_id, weights)
    
    return weight_entry

def delete_weight(user_id: str, weight_id: str) -> bool:
    """
    Delete a weight record by ID.
    
    Args:
        user_id: Firebase UID do usuário (ou "local" para desenvolvimento)
        weight_id: ID do registro de peso a deletar
    
    Returns:
        True se deletado com sucesso, False se não encontrado
    """
    # Tenta deletar no Firebase primeiro
    if _should_use_firebase(user_id):
        try:
            if delete_weight_from_firebase(user_id, weight_id):
                logger.debug(f"[HEALTH] Peso deletado do Firebase: {weight_id}")
                return True
            else:
                logger.warning(f"[HEALTH] Falha ao deletar peso no Firebase, usando fallback local")
        except Exception as e:
            logger.error(f"[HEALTH] Erro ao deletar peso no Firebase: {e}, usando fallback local")
    
    # Fallback para storage local
    weights = _load_local_weights(user_id)
    
    original_count = len(weights)
    weights = [w for w in weights if w.get("id") != weight_id]
    
    if len(weights) < original_count:
        _save_local_weights(user_id, weights)
        logger.info(f"Peso deletado: user_id={user_id}, weight_id={weight_id}")
        return True
    else:
        logger.warning(f"Peso não encontrado para deletar: user_id={user_id}, weight_id={weight_id}")
        return False

# =============================================================================
# NOTIFICATIONS (Fase 6 - P6.1)
# =============================================================================

def _get_notifications_path(user_id: str) -> Path:
    """Retorna o caminho do arquivo de notificações para um usuário."""
    data_dir = Path("data/health/notifications")
    data_dir.mkdir(parents=True, exist_ok=True)
    return data_dir / f"{user_id}.json"

def _load_local_notifications(user_id: str) -> List[Dict]:
    """Carrega notificações do storage local."""
    notifications_path = _get_notifications_path(user_id)
    if notifications_path.exists():
        try:
            with open(notifications_path, "r", encoding="utf-8") as f:
                data = json.load(f)
                return data.get("notifications", [])
        except Exception as e:
            logger.error(f"[HEALTH] Erro ao carregar notificações locais: {e}")
            return []
    return []

def _save_local_notifications(user_id: str, notifications: List[Dict]) -> None:
    """Salva notificações no storage local."""
    notifications_path = _get_notifications_path(user_id)
    try:
        data = {
            "user_id": user_id,
            "notifications": notifications,
            "updated_at": datetime.now().isoformat()
        }
        with open(notifications_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"[HEALTH] Erro ao salvar notificações locais: {e}")

def add_notification(user_id: str, notification_type: str, title: str, message: str, metadata: Optional[Dict] = None) -> Dict:
    """
    Adiciona uma notificação para um usuário.
    
    Args:
        user_id: Firebase UID do usuário
        notification_type: Tipo da notificação (ex: "student_linked", "data_viewed")
        title: Título da notificação
        message: Mensagem da notificação
        metadata: Dados adicionais (opcional)
    
    Returns:
        Dict com a notificação criada
    """
    notification = {
        "id": str(uuid.uuid4()),
        "type": notification_type,
        "title": title,
        "message": message,
        "metadata": metadata or {},
        "read": False,
        "created_at": datetime.now().isoformat()
    }
    
    # Tenta salvar no Firebase primeiro
    if _should_use_firebase(user_id):
        try:
            db = get_firestore()
            if db:
                notifications_ref = db.collection("health_notifications").document(user_id)
                notifications_doc = notifications_ref.get()
                
                if notifications_doc.exists:
                    notifications = notifications_doc.to_dict().get("notifications", [])
                else:
                    notifications = []
                
                notifications.append(notification)
                notifications_ref.set({
                    "user_id": user_id,
                    "notifications": notifications,
                    "updated_at": datetime.now().isoformat()
                })
                logger.debug(f"[HEALTH] Notificação salva no Firebase: {notification['id']}")
                return notification
        except Exception as e:
            logger.warning(f"[HEALTH] Erro ao salvar notificação no Firebase: {e}, usando fallback local")
    
    # Fallback para storage local
    notifications = _load_local_notifications(user_id)
    notifications.append(notification)
    _save_local_notifications(user_id, notifications)
    logger.info(f"Notificação adicionada: user_id={user_id}, type={notification_type}")
    return notification

def get_notifications(user_id: str, unread_only: bool = False, limit: Optional[int] = None) -> List[Dict]:
    """
    Busca notificações de um usuário.
    
    Args:
        user_id: Firebase UID do usuário
        unread_only: Se True, retorna apenas não lidas
        limit: Limite de notificações a retornar (opcional)
    
    Returns:
        Lista de notificações ordenadas por data (mais recentes primeiro)
    """
    notifications = []
    
    # Tenta buscar no Firebase primeiro
    if _should_use_firebase(user_id):
        try:
            db = get_firestore()
            if db:
                notifications_ref = db.collection("health_notifications").document(user_id)
                notifications_doc = notifications_ref.get()
                
                if notifications_doc.exists:
                    notifications = notifications_doc.to_dict().get("notifications", [])
                    logger.debug(f"[HEALTH] Notificações carregadas do Firebase: {len(notifications)}")
        except Exception as e:
            logger.warning(f"[HEALTH] Erro ao buscar notificações no Firebase: {e}, usando fallback local")
    
    # Fallback para storage local
    if not notifications:
        notifications = _load_local_notifications(user_id)
    
    # Filtrar não lidas se solicitado
    if unread_only:
        notifications = [n for n in notifications if not n.get("read", False)]
    
    # Ordenar por data (mais recentes primeiro)
    notifications.sort(key=lambda x: x.get("created_at", ""), reverse=True)
    
    # Aplicar limite se fornecido
    if limit:
        notifications = notifications[:limit]
    
    return notifications

def mark_notification_read(user_id: str, notification_id: str) -> bool:
    """
    Marca uma notificação como lida.
    
    Args:
        user_id: Firebase UID do usuário
        notification_id: ID da notificação
    
    Returns:
        True se marcada com sucesso, False se não encontrada
    """
    # Tenta atualizar no Firebase primeiro
    if _should_use_firebase(user_id):
        try:
            db = get_firestore()
            if db:
                notifications_ref = db.collection("health_notifications").document(user_id)
                notifications_doc = notifications_ref.get()
                
                if notifications_doc.exists:
                    notifications = notifications_doc.to_dict().get("notifications", [])
                    updated = False
                    for n in notifications:
                        if n.get("id") == notification_id:
                            n["read"] = True
                            updated = True
                            break
                    
                    if updated:
                        notifications_ref.set({
                            "user_id": user_id,
                            "notifications": notifications,
                            "updated_at": datetime.now().isoformat()
                        })
                        logger.debug(f"[HEALTH] Notificação marcada como lida no Firebase: {notification_id}")
                        return True
        except Exception as e:
            logger.warning(f"[HEALTH] Erro ao marcar notificação como lida no Firebase: {e}, usando fallback local")
    
    # Fallback para storage local
    notifications = _load_local_notifications(user_id)
    for n in notifications:
        if n.get("id") == notification_id:
            n["read"] = True
            _save_local_notifications(user_id, notifications)
            logger.info(f"Notificação marcada como lida: user_id={user_id}, notification_id={notification_id}")
            return True
    
    return False

def mark_all_notifications_read(user_id: str) -> int:
    """
    Marca todas as notificações de um usuário como lidas.
    
    Args:
        user_id: Firebase UID do usuário
    
    Returns:
        Número de notificações marcadas como lidas
    """
    count = 0
    
    # Tenta atualizar no Firebase primeiro
    if _should_use_firebase(user_id):
        try:
            db = get_firestore()
            if db:
                notifications_ref = db.collection("health_notifications").document(user_id)
                notifications_doc = notifications_ref.get()
                
                if notifications_doc.exists:
                    notifications = notifications_doc.to_dict().get("notifications", [])
                    for n in notifications:
                        if not n.get("read", False):
                            n["read"] = True
                            count += 1
                    
                    if count > 0:
                        notifications_ref.set({
                            "user_id": user_id,
                            "notifications": notifications,
                            "updated_at": datetime.now().isoformat()
                        })
                        logger.debug(f"[HEALTH] {count} notificações marcadas como lidas no Firebase")
                        return count
        except Exception as e:
            logger.warning(f"[HEALTH] Erro ao marcar notificações como lidas no Firebase: {e}, usando fallback local")
    
    # Fallback para storage local
    notifications = _load_local_notifications(user_id)
    for n in notifications:
        if not n.get("read", False):
            n["read"] = True
            count += 1
    
    if count > 0:
        _save_local_notifications(user_id, notifications)
        logger.info(f"{count} notificações marcadas como lidas: user_id={user_id}")
    
    return count