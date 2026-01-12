"""
Luna Health Permissions
-----------------------
Sistema de permissões e controle de acesso para Luna Health.
Permite que avaliadores visualizem dados de alunos vinculados.
"""

import logging
from typing import Dict, Optional, List, Tuple

from .profiles import (
    get_health_profile,
    get_evaluator_students,
    get_student_evaluator
)

# Configurar logging
logger = logging.getLogger(__name__)

# =============================================================================
# PERMISSIONS API
# =============================================================================

def can_view_student_data(evaluator_id: str, student_id: str) -> bool:
    """
    Verifica se um avaliador pode visualizar os dados de um aluno.
    
    Args:
        evaluator_id: Firebase UID do avaliador
        student_id: Firebase UID do aluno
    
    Returns:
        True se o avaliador pode ver os dados do aluno, False caso contrário
    """
    try:
        # Verificar se o avaliador existe e é do tipo correto
        evaluator_profile = get_health_profile(evaluator_id)
        if not evaluator_profile:
            logger.warning(f"[PERMISSIONS] Avaliador {evaluator_id} não encontrado")
            return False
        
        if evaluator_profile.get("type") != "evaluator":
            logger.warning(f"[PERMISSIONS] Usuário {evaluator_id} não é avaliador")
            return False
        
        # Verificar se o aluno existe e é do tipo correto
        student_profile = get_health_profile(student_id)
        if not student_profile:
            logger.warning(f"[PERMISSIONS] Aluno {student_id} não encontrado")
            return False
        
        if student_profile.get("type") != "student":
            logger.warning(f"[PERMISSIONS] Usuário {student_id} não é aluno")
            return False
        
        # Verificar se o aluno está vinculado ao avaliador
        students = get_evaluator_students(evaluator_id)
        if student_id in students:
            logger.info(f"[PERMISSIONS] ✅ Avaliador {evaluator_id} pode ver dados do aluno {student_id}")
            return True
        
        logger.warning(f"[PERMISSIONS] ❌ Aluno {student_id} não está vinculado ao avaliador {evaluator_id}")
        return False
        
    except Exception as e:
        logger.error(f"[PERMISSIONS] Erro ao verificar permissão: {e}")
        return False

def get_accessible_students(evaluator_id: str) -> List[str]:
    """
    Lista todos os alunos que um avaliador pode acessar.
    
    Args:
        evaluator_id: Firebase UID do avaliador
    
    Returns:
        Lista de user_ids dos alunos acessíveis (pode estar vazia)
    """
    try:
        # Verificar se o avaliador existe
        evaluator_profile = get_health_profile(evaluator_id)
        if not evaluator_profile:
            logger.warning(f"[PERMISSIONS] Avaliador {evaluator_id} não encontrado")
            return []
        
        if evaluator_profile.get("type") != "evaluator":
            logger.warning(f"[PERMISSIONS] Usuário {evaluator_id} não é avaliador")
            return []
        
        # Obter lista de alunos vinculados
        students = get_evaluator_students(evaluator_id)
        logger.info(f"[PERMISSIONS] Avaliador {evaluator_id} tem acesso a {len(students)} aluno(s)")
        return students
        
    except Exception as e:
        logger.error(f"[PERMISSIONS] Erro ao obter alunos acessíveis: {e}")
        return []

def validate_data_access(user_id: str, target_user_id: str, action: str = "view") -> Tuple[bool, Optional[str]]:
    """
    Valida se um usuário pode realizar uma ação em dados de outro usuário.
    
    Args:
        user_id: Firebase UID do usuário que está tentando acessar
        target_user_id: Firebase UID do usuário cujos dados estão sendo acessados
        action: Tipo de ação ("view", "edit", "delete") - por enquanto só "view" é suportado
    
    Returns:
        Tupla (permitido: bool, mensagem_erro: Optional[str])
        - Se permitido=True, mensagem_erro será None
        - Se permitido=False, mensagem_erro conterá a razão da negação
    """
    try:
        # Caso 1: Usuário acessando seus próprios dados
        if user_id == target_user_id:
            logger.info(f"[PERMISSIONS] ✅ Usuário {user_id} acessando seus próprios dados")
            return True, None
        
        # Caso 2: Verificar perfis
        user_profile = get_health_profile(user_id)
        target_profile = get_health_profile(target_user_id)
        
        if not user_profile:
            return False, f"Perfil do usuário {user_id} não encontrado"
        
        if not target_profile:
            return False, f"Perfil do usuário {target_user_id} não encontrado"
        
        # Caso 3: Avaliador tentando acessar dados de aluno
        if user_profile.get("type") == "evaluator" and target_profile.get("type") == "student":
            if can_view_student_data(user_id, target_user_id):
                logger.info(f"[PERMISSIONS] ✅ Avaliador {user_id} pode {action} dados do aluno {target_user_id}")
                return True, None
            else:
                return False, f"Avaliador {user_id} não tem permissão para acessar dados do aluno {target_user_id}"
        
        # Caso 4: Aluno tentando acessar dados de avaliador (não permitido)
        if user_profile.get("type") == "student" and target_profile.get("type") == "evaluator":
            return False, f"Alunos não podem acessar dados de avaliadores"
        
        # Caso 5: Avaliador tentando acessar dados de outro avaliador (não permitido)
        if user_profile.get("type") == "evaluator" and target_profile.get("type") == "evaluator":
            return False, f"Avaliadores não podem acessar dados de outros avaliadores"
        
        # Caso 6: Aluno tentando acessar dados de outro aluno (não permitido)
        if user_profile.get("type") == "student" and target_profile.get("type") == "student":
            return False, f"Alunos não podem acessar dados de outros alunos"
        
        # Caso padrão: não permitido
        return False, f"Acesso negado: tipo de perfil não suportado"
        
    except Exception as e:
        logger.error(f"[PERMISSIONS] Erro ao validar acesso: {e}")
        return False, f"Erro interno ao validar acesso: {str(e)}"

def is_evaluator(user_id: str) -> bool:
    """
    Verifica se um usuário é um avaliador.
    
    Args:
        user_id: Firebase UID do usuário
    
    Returns:
        True se o usuário é avaliador, False caso contrário
    """
    try:
        profile = get_health_profile(user_id)
        return profile is not None and profile.get("type") == "evaluator"
    except Exception as e:
        logger.error(f"[PERMISSIONS] Erro ao verificar se é avaliador: {e}")
        return False

def is_student(user_id: str) -> bool:
    """
    Verifica se um usuário é um aluno.
    
    Args:
        user_id: Firebase UID do usuário
    
    Returns:
        True se o usuário é aluno, False caso contrário
    """
    try:
        profile = get_health_profile(user_id)
        return profile is not None and profile.get("type") == "student"
    except Exception as e:
        logger.error(f"[PERMISSIONS] Erro ao verificar se é aluno: {e}")
        return False
