"""
Luna Health Profiles
--------------------
Sistema de perfis e vinculação para Luna Health.
Permite que nutricionistas (Avaliadores) gerenciem dados de pacientes (Alunos).
Uses Firebase as primary storage with local JSON fallback.
"""

import json
import os
import time
import secrets
import string
from pathlib import Path
from datetime import datetime
from typing import Dict, Optional, List
import logging

# Configurar logging
logger = logging.getLogger(__name__)

# =============================================================================
# FIREBASE IMPORTS (com fallback)
# =============================================================================

try:
    from ..firebase_config import get_firestore, initialize_firebase
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    logger.warning("[HEALTH-PROFILES] ⚠️ Firebase não disponível, usando storage local.")
except Exception as e:
    FIREBASE_AVAILABLE = False
    logger.warning(f"[HEALTH-PROFILES] ⚠️ Erro ao importar Firebase: {e}, usando storage local.")

def _ensure_firebase_initialized() -> bool:
    """Garante que Firebase está inicializado. Retorna True se disponível."""
    if not FIREBASE_AVAILABLE:
        return False
    try:
        db = get_firestore()
        return db is not None
    except Exception as e:
        logger.warning(f"[HEALTH-PROFILES] Erro ao inicializar Firebase: {e}")
        return False

# =============================================================================
# LOCAL STORAGE PATHS
# =============================================================================

DATA_DIR = Path(__file__).parent.parent.parent / "data" / "health"

def get_profile_file(user_id: str) -> Path:
    """Get path to profile.json file for a user."""
    user_dir = DATA_DIR / user_id
    user_dir.mkdir(parents=True, exist_ok=True)
    return user_dir / "profile.json"

def _should_use_firebase(user_id: str) -> bool:
    """Determina se deve usar Firebase (não usa para 'local' ou None)."""
    if not user_id or user_id == "local":
        return False
    if not FIREBASE_AVAILABLE:
        return False
    return _ensure_firebase_initialized()

# =============================================================================
# FILE LOCKING (Simple cross-platform lock)
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
                if os.name == 'nt':  # Windows
                    # Windows: try to create exclusively
                    if not self.lock_file.exists():
                        self.lock_file.touch()
                        self.locked = True
                        return self
                else:  # Unix
                    # Unix: use O_CREAT | O_EXCL
                    fd = os.open(str(self.lock_file), os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                    os.close(fd)
                    self.locked = True
                    return self
            except (OSError, FileExistsError):
                time.sleep(self.retry_interval)
                continue
        
        raise TimeoutError(f"Could not acquire lock for {self.lock_file} within {self.timeout}s")
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        if self.locked and self.lock_file.exists():
            try:
                self.lock_file.unlink()
            except Exception:
                pass

# =============================================================================
# LOCAL STORAGE HELPERS
# =============================================================================

def _load_local_profile(user_id: str) -> Optional[Dict]:
    """Load profile from local JSON file."""
    file_path = get_profile_file(user_id)
    
    if not file_path.exists():
        return None
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read().strip()
            if not content:
                return None
            return json.loads(content)
    except Exception as e:
        logger.error(f"[HEALTH-PROFILES] Erro ao carregar perfil local: {e}")
        return None

def _save_local_profile(user_id: str, profile: Dict) -> None:
    """Save profile to local JSON file."""
    file_path = get_profile_file(user_id)
    lock_file = file_path.with_suffix('.lock')
    
    try:
        with FileLock(lock_file):
            with open(file_path, 'w', encoding='utf-8') as f:
                json.dump(profile, f, indent=2, ensure_ascii=False)
    except Exception as e:
        logger.error(f"[HEALTH-PROFILES] Erro ao salvar perfil local: {e}")
        raise

# =============================================================================
# FIREBASE STORAGE HELPERS
# =============================================================================

def _save_profile_to_firebase(user_id: str, profile: Dict) -> bool:
    """Save profile to Firebase Firestore."""
    db = get_firestore()
    if db is None:
        return False
    
    try:
        from datetime import datetime
        
        profile["updated_at"] = datetime.utcnow().isoformat()
        if "created_at" not in profile:
            profile["created_at"] = datetime.utcnow().isoformat()
        
        # Salva em /health_profiles/{user_id}
        db.collection("health_profiles").document(user_id).set(profile, merge=True)
        logger.info(f"[HEALTH-PROFILES] ✅ Perfil salvo no Firebase: {user_id}")
        return True
    except Exception as e:
        logger.error(f"[HEALTH-PROFILES] Erro ao salvar perfil no Firebase: {e}")
        return False

def _get_profile_from_firebase(user_id: str) -> Optional[Dict]:
    """Get profile from Firebase Firestore."""
    db = get_firestore()
    if db is None:
        return None
    
    try:
        doc = db.collection("health_profiles").document(user_id).get()
        if doc.exists:
            return doc.to_dict()
        return None
    except Exception as e:
        logger.error(f"[HEALTH-PROFILES] Erro ao buscar perfil no Firebase: {e}")
        return None

# =============================================================================
# CODE GENERATION
# =============================================================================

def _generate_unique_code(length: int = 6, max_attempts: int = 100) -> str:
    """
    Gera código alfanumérico único.
    
    Args:
        length: Comprimento do código (sem contar o prefixo EVAL-)
        max_attempts: Número máximo de tentativas para gerar código único
    
    Returns:
        Código no formato EVAL-XXXXXX
    """
    characters = string.ascii_uppercase + string.digits
    
    for attempt in range(max_attempts):
        # Gerar código aleatório
        code_suffix = ''.join(secrets.choice(characters) for _ in range(length))
        full_code = f"EVAL-{code_suffix}"
        
        # Verificar se já existe
        if not _code_exists(full_code):
            return full_code
    
    # Se não conseguiu gerar código único após max_attempts, usar timestamp como fallback
    import time
    timestamp_suffix = ''.join(secrets.choice(characters) for _ in range(length - 4))
    timestamp_part = str(int(time.time()))[-4:]
    fallback_code = f"EVAL-{timestamp_part}{timestamp_suffix}"
    logger.warning(f"[HEALTH-PROFILES] Usando código com timestamp após {max_attempts} tentativas: {fallback_code}")
    return fallback_code

def _code_exists(code: str) -> bool:
    """
    Verifica se um código já existe no banco (Firebase ou local).
    
    Args:
        code: Código completo (formato: EVAL-XXXXXX)
    
    Returns:
        True se código existe, False caso contrário
    """
    # Verificar no Firebase primeiro
    if FIREBASE_AVAILABLE and _ensure_firebase_initialized():
        evaluator_id = _find_code_in_firebase(code)
        if evaluator_id:
            return True
    
    # Verificar no storage local
    evaluator_id = _find_code_in_local(code)
    if evaluator_id:
        return True
    
    return False

def _find_code_in_firebase(code: str) -> Optional[str]:
    """Busca código no Firebase e retorna user_id do avaliador."""
    db = get_firestore()
    if db is None:
        return None
    
    try:
        # Buscar todos os perfis de avaliadores
        evaluators = db.collection("health_profiles").where("type", "==", "evaluator").stream()
        for doc in evaluators:
            profile = doc.to_dict()
            if profile.get("evaluator_code") == code:
                return doc.id
        return None
    except Exception as e:
        logger.error(f"[HEALTH-PROFILES] Erro ao buscar código no Firebase: {e}")
        return None

def _find_code_in_local(code: str) -> Optional[str]:
    """Busca código no storage local e retorna user_id do avaliador."""
    if not DATA_DIR.exists():
        return None
    
    try:
        for user_dir in DATA_DIR.iterdir():
            if not user_dir.is_dir():
                continue
            
            profile_file = user_dir / "profile.json"
            if not profile_file.exists():
                continue
            
            try:
                with open(profile_file, 'r', encoding='utf-8') as f:
                    profile = json.loads(f.read())
                    if profile.get("type") == "evaluator" and profile.get("evaluator_code") == code:
                        return user_dir.name
            except Exception:
                continue
        
        return None
    except Exception as e:
        logger.error(f"[HEALTH-PROFILES] Erro ao buscar código local: {e}")
        return None

# =============================================================================
# PUBLIC API
# =============================================================================

def get_health_profile(user_id: str) -> Optional[Dict]:
    """
    Busca perfil de saúde do usuário.
    
    Args:
        user_id: Firebase UID do usuário (ou "local" para desenvolvimento)
    
    Returns:
        Dict com perfil ou None se não encontrado
    """
    if _should_use_firebase(user_id):
        try:
            profile = _get_profile_from_firebase(user_id)
            if profile:
                logger.debug(f"[HEALTH-PROFILES] Perfil carregado do Firebase: {user_id}")
                return profile
        except Exception as e:
            logger.error(f"[HEALTH-PROFILES] Erro ao carregar perfil do Firebase: {e}, usando fallback local")
    
    # Fallback local
    profile = _load_local_profile(user_id)
    if profile:
        logger.debug(f"[HEALTH-PROFILES] Perfil carregado do storage local: {user_id}")
    
    return profile

def create_health_profile(user_id: str, profile_type: str) -> Dict:
    """
    Cria perfil de saúde (student ou evaluator).
    
    Args:
        user_id: Firebase UID do usuário
        profile_type: "student" ou "evaluator"
    
    Returns:
        Dict com perfil criado
    
    Raises:
        ValueError: Se profile_type for inválido
    """
    if profile_type not in ["student", "evaluator"]:
        raise ValueError(f"Tipo de perfil inválido: {profile_type}. Use 'student' ou 'evaluator'")
    
    # Verificar se já existe perfil
    existing = get_health_profile(user_id)
    if existing:
        raise ValueError(f"Perfil já existe para user_id={user_id}")
    
    # Criar perfil base
    profile = {
        "user_id": user_id,
        "type": profile_type,
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }
    
    # Se for avaliador, gerar código único
    if profile_type == "evaluator":
        profile["evaluator_code"] = _generate_unique_code()
        profile["students"] = []
        logger.info(f"[HEALTH-PROFILES] Código gerado para avaliador {user_id}: {profile['evaluator_code']}")
    
    # Salvar
    if _should_use_firebase(user_id):
        try:
            if _save_profile_to_firebase(user_id, profile):
                logger.debug(f"[HEALTH-PROFILES] Perfil criado no Firebase: {user_id}")
                return profile
        except Exception as e:
            logger.error(f"[HEALTH-PROFILES] Erro ao criar perfil no Firebase: {e}, usando fallback local")
    
    # Fallback local
    _save_local_profile(user_id, profile)
    logger.info(f"[HEALTH-PROFILES] Perfil criado localmente: {user_id}")
    
    return profile

def update_health_profile(user_id: str, updates: Dict) -> Dict:
    """
    Atualiza perfil de saúde.
    
    Args:
        user_id: Firebase UID do usuário
        updates: Campos a atualizar
    
    Returns:
        Dict com perfil atualizado
    """
    # Carregar perfil existente
    profile = get_health_profile(user_id)
    if not profile:
        raise ValueError(f"Perfil não encontrado para user_id={user_id}")
    
    # Se está mudando para avaliador e não tem código, gerar um
    if updates.get("type") == "evaluator" and not profile.get("evaluator_code"):
        updates["evaluator_code"] = _generate_unique_code()
        updates["students"] = []  # Inicializar lista de alunos
        logger.info(f"[HEALTH-PROFILES] Código gerado para avaliador {user_id}: {updates['evaluator_code']}")
    
    # Aplicar updates
    profile.update(updates)
    profile["updated_at"] = datetime.utcnow().isoformat()
    
    # Salvar
    if _should_use_firebase(user_id):
        try:
            if _save_profile_to_firebase(user_id, profile):
                logger.debug(f"[HEALTH-PROFILES] Perfil atualizado no Firebase: {user_id}")
                return profile
        except Exception as e:
            logger.error(f"[HEALTH-PROFILES] Erro ao atualizar perfil no Firebase: {e}, usando fallback local")
    
    # Fallback local
    _save_local_profile(user_id, profile)
    logger.info(f"[HEALTH-PROFILES] Perfil atualizado localmente: {user_id}")
    
    return profile

def generate_evaluator_code(user_id: str) -> str:
    """
    Gera novo código único para avaliador (invalida o anterior).
    
    Args:
        user_id: Firebase UID do avaliador
    
    Returns:
        Novo código gerado
    """
    profile = get_health_profile(user_id)
    if not profile:
        raise ValueError(f"Perfil não encontrado para user_id={user_id}")
    
    if profile.get("type") != "evaluator":
        raise ValueError(f"Usuário {user_id} não é um avaliador")
    
    # Gerar novo código único
    new_code = _generate_unique_code()
    
    # Atualizar perfil
    update_health_profile(user_id, {"evaluator_code": new_code})
    
    logger.info(f"[HEALTH-PROFILES] Novo código gerado para avaliador {user_id}: {new_code}")
    return new_code

def validate_code(code: str) -> Optional[str]:
    """
    Valida se código existe e retorna avaliator_uid.
    
    Args:
        code: Código do avaliador (formato: EVAL-XXXXXX)
    
    Returns:
        user_id do avaliador ou None se código inválido
    """
    if not code or not code.startswith("EVAL-"):
        return None
    
    # Buscar no Firebase primeiro
    if FIREBASE_AVAILABLE and _ensure_firebase_initialized():
        evaluator_id = _find_code_in_firebase(code)
        if evaluator_id:
            logger.debug(f"[HEALTH-PROFILES] Código validado no Firebase: {code} -> {evaluator_id}")
            return evaluator_id
    
    # Buscar no storage local
    evaluator_id = _find_code_in_local(code)
    if evaluator_id:
        logger.debug(f"[HEALTH-PROFILES] Código validado localmente: {code} -> {evaluator_id}")
        return evaluator_id
    
    logger.warning(f"[HEALTH-PROFILES] Código inválido: {code}")
    return None

def link_student_to_evaluator(student_id: str, code: str) -> Dict:
    """
    Vincula aluno ao avaliador usando código.
    
    Args:
        student_id: Firebase UID do aluno
        code: Código do avaliador
    
    Returns:
        Dict com informações do avaliador vinculado
    
    Raises:
        ValueError: Se código inválido ou aluno já vinculado
    """
    # Validar código
    evaluator_id = validate_code(code)
    if not evaluator_id:
        raise ValueError(f"Código inválido: {code}")
    
    # Verificar se aluno já está vinculado
    student_profile = get_health_profile(student_id)
    if not student_profile:
        raise ValueError(f"Perfil do aluno não encontrado: {student_id}")
    
    if student_profile.get("type") != "student":
        raise ValueError(f"Usuário {student_id} não é um aluno")
    
    if student_profile.get("linked_to"):
        raise ValueError(f"Aluno {student_id} já está vinculado a um avaliador")
    
    # Verificar se avaliador existe
    evaluator_profile = get_health_profile(evaluator_id)
    if not evaluator_profile:
        raise ValueError(f"Perfil do avaliador não encontrado: {evaluator_id}")
    
    if evaluator_profile.get("type") != "evaluator":
        raise ValueError(f"Usuário {evaluator_id} não é um avaliador")
    
    # Verificar se aluno está tentando se vincular a si mesmo (caso tenha perfil de avaliador também)
    if student_id == evaluator_id:
        raise ValueError("Você não pode se vincular ao seu próprio código de avaliador")
    
    # Atualizar perfil do aluno
    update_health_profile(student_id, {"linked_to": evaluator_id})
    
    # Atualizar lista de alunos do avaliador
    students = evaluator_profile.get("students", [])
    if student_id not in students:
        students.append(student_id)
        update_health_profile(evaluator_id, {"students": students})
    
    # Criar notificação para o avaliador (P6.1)
    try:
        # Importar de forma que funcione tanto em runtime quanto em testes
        try:
            from .storage import add_notification
        except ImportError:
            from health.storage import add_notification
        
        try:
            from ..firebase_config import get_user_profile, get_user_info
        except ImportError:
            try:
                from firebase_config import get_user_profile, get_user_info
            except ImportError:
                get_user_profile = None
                get_user_info = None
        
        # Buscar nome do aluno
        student_name = "Aluno"
        if get_user_profile:
            try:
                student_profile = get_user_profile(student_id)
                if student_profile and student_profile.get("name"):
                    student_name = student_profile.get("name")
            except:
                pass
        
        if student_name == "Aluno" and get_user_info:
            try:
                user_info = get_user_info(student_id)
                if user_info:
                    student_name = user_info.get("display_name") or user_info.get("name") or "Aluno"
            except:
                pass
        
        # Adicionar notificação
        add_notification(
            user_id=evaluator_id,
            notification_type="student_linked",
            title="Novo aluno vinculado",
            message=f"{student_name} se vinculou ao seu perfil de avaliador.",
            metadata={
                "student_id": student_id,
                "student_name": student_name,
                "linked_at": datetime.now().isoformat()
            }
        )
        logger.info(f"[HEALTH-PROFILES] Notificação criada para avaliador {evaluator_id}: aluno {student_id} vinculado")
    except Exception as e:
        logger.warning(f"[HEALTH-PROFILES] Erro ao criar notificação: {e}")
    
    logger.info(f"[HEALTH-PROFILES] Aluno {student_id} vinculado ao avaliador {evaluator_id}")
    
    return {
        "evaluator_id": evaluator_id,
        "evaluator_code": evaluator_profile.get("evaluator_code"),
        "linked_at": datetime.utcnow().isoformat()
    }

def get_evaluator_students(evaluator_id: str) -> List[str]:
    """
    Lista alunos do avaliador.
    
    Args:
        evaluator_id: Firebase UID do avaliador
    
    Returns:
        Lista de user_ids dos alunos
    """
    profile = get_health_profile(evaluator_id)
    if not profile:
        return []
    
    if profile.get("type") != "evaluator":
        return []
    
    return profile.get("students", [])

def get_student_evaluator(student_id: str) -> Optional[str]:
    """
    Retorna avaliador do aluno.
    
    Args:
        student_id: Firebase UID do aluno
    
    Returns:
        user_id do avaliador ou None se não vinculado
    """
    profile = get_health_profile(student_id)
    if not profile:
        return None
    
    if profile.get("type") != "student":
        return None
    
    return profile.get("linked_to")

def unlink_student(student_id: str, evaluator_id: Optional[str] = None) -> bool:
    """
    Remove vinculação entre aluno e avaliador.
    
    Args:
        student_id: Firebase UID do aluno
        evaluator_id: Firebase UID do avaliador (opcional, será buscado se não fornecido)
    
    Returns:
        True se desvinculado com sucesso
    """
    student_profile = get_health_profile(student_id)
    if not student_profile:
        raise ValueError(f"Perfil do aluno não encontrado: {student_id}")
    
    if student_profile.get("type") != "student":
        raise ValueError(f"Usuário {student_id} não é um aluno")
    
    # Se evaluator_id não fornecido, buscar do perfil do aluno
    if not evaluator_id:
        evaluator_id = student_profile.get("linked_to")
        if not evaluator_id:
            return False  # Já não está vinculado
    
    # Remover vinculação do aluno
    update_health_profile(student_id, {"linked_to": None})
    
    # Remover aluno da lista do avaliador
    evaluator_profile = get_health_profile(evaluator_id)
    if evaluator_profile:
        students = evaluator_profile.get("students", [])
        if student_id in students:
            students.remove(student_id)
            update_health_profile(evaluator_id, {"students": students})
    
    logger.info(f"[HEALTH-PROFILES] Aluno {student_id} desvinculado do avaliador {evaluator_id}")
    return True
