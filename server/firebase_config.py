"""
Luna Firebase Configuration
===========================
Configuração do Firebase Admin SDK para autenticação e Firestore.
"""

import os
from pathlib import Path
from typing import Optional, Dict, Any

# =============================================================================
# INICIALIZAÇÃO DO FIREBASE
# =============================================================================

_firebase_app = None
_firestore_client = None


def initialize_firebase() -> bool:
    """
    Inicializa o Firebase Admin SDK.
    
    Returns:
        True se inicializado com sucesso
    """
    global _firebase_app, _firestore_client
    
    if _firebase_app is not None:
        return True  # Já inicializado
    
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
        
        # Caminho para a chave de serviço
        base_dir = Path(__file__).parent.parent
        key_path = base_dir / "documentação" / "luna-8787d-firebase-adminsdk-fbsvc-506288a734.json"
        
        if not key_path.exists():
            print(f"[FIREBASE] ⚠️ Chave não encontrada: {key_path}")
            return False
        
        cred = credentials.Certificate(str(key_path))
        _firebase_app = firebase_admin.initialize_app(cred)
        _firestore_client = firestore.client()
        
        print("[FIREBASE] ✅ Inicializado com sucesso!")
        return True
        
    except ImportError:
        print("[FIREBASE] ⚠️ firebase-admin não instalado. Execute: pip install firebase-admin")
        return False
    except Exception as e:
        print(f"[FIREBASE] ❌ Erro na inicialização: {e}")
        return False


def get_firestore():
    """Retorna o cliente Firestore."""
    global _firestore_client
    if _firestore_client is None:
        initialize_firebase()
    return _firestore_client


# =============================================================================
# VERIFICAÇÃO DE TOKEN (AUTENTICAÇÃO)
# =============================================================================

def verify_id_token(id_token: str) -> Optional[Dict[str, Any]]:
    """
    Verifica um token de ID do Firebase Auth.
    
    Args:
        id_token: Token JWT do cliente
        
    Returns:
        Dicionário com claims do usuário ou None se inválido
    """
    try:
        from firebase_admin import auth
        
        # Garantir inicialização
        initialize_firebase()
        
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
        
    except Exception as e:
        print(f"[FIREBASE] Token inválido: {e}")
        return None


def get_user_info(uid: str) -> Optional[Dict[str, Any]]:
    """
    Busca informações de um usuário pelo UID.
    
    Args:
        uid: Firebase UID do usuário
        
    Returns:
        Informações do usuário ou None
    """
    try:
        from firebase_admin import auth
        
        user = auth.get_user(uid)
        return {
            "uid": user.uid,
            "email": user.email,
            "display_name": user.display_name,
            "photo_url": user.photo_url,
            "created_at": user.user_metadata.creation_timestamp,
            "last_login": user.user_metadata.last_sign_in_timestamp
        }
        
    except Exception as e:
        print(f"[FIREBASE] Erro ao buscar usuário: {e}")
        return None


# =============================================================================
# FIRESTORE: PERFIS DE USUÁRIO
# =============================================================================

def get_user_profile(uid: str) -> Optional[Dict[str, Any]]:
    """
    Busca o perfil de um usuário no Firestore.
    
    Args:
        uid: Firebase UID do usuário
        
    Returns:
        Perfil do usuário ou None
    """
    db = get_firestore()
    if db is None:
        return None
    
    try:
        doc = db.collection("users").document(uid).get()
        if doc.exists:
            return doc.to_dict()
        return None
        
    except Exception as e:
        print(f"[FIREBASE] Erro ao buscar perfil: {e}")
        return None


def create_user_profile(uid: str, name: str, email: str) -> bool:
    """
    Cria um perfil de usuário no Firestore.
    
    Args:
        uid: Firebase UID do usuário
        name: Nome do usuário
        email: Email do usuário
        
    Returns:
        True se criado com sucesso
    """
    db = get_firestore()
    if db is None:
        return False
    
    try:
        from datetime import datetime
        
        profile = {
            "name": name,
            "email": email,
            "preferences": {
                "tone": "friendly",  # friendly, professional, romantic (só criador)
                "theme": "dark",
                "language": "pt-BR"
            },
            "is_premium": False,
            "created_at": datetime.utcnow(),
            "updated_at": datetime.utcnow()
        }
        
        db.collection("users").document(uid).set(profile)
        print(f"[FIREBASE] ✅ Perfil criado: {name}")
        return True
        
    except Exception as e:
        print(f"[FIREBASE] Erro ao criar perfil: {e}")
        return False


def update_user_profile(uid: str, updates: Dict[str, Any]) -> bool:
    """
    Atualiza o perfil de um usuário.
    
    Args:
        uid: Firebase UID do usuário
        updates: Campos a atualizar
        
    Returns:
        True se atualizado com sucesso
    """
    db = get_firestore()
    if db is None:
        return False
    
    try:
        from datetime import datetime
        
        updates["updated_at"] = datetime.utcnow()
        db.collection("users").document(uid).update(updates)
        return True
        
    except Exception as e:
        print(f"[FIREBASE] Erro ao atualizar perfil: {e}")
        return False


# =============================================================================
# FIRESTORE: CHATS
# =============================================================================

def save_chat_to_firebase(uid: str, chat_id: str, title: str, messages: list) -> bool:
    """
    Salva um chat no Firestore.
    
    Args:
        uid: Firebase UID do usuário
        chat_id: ID único do chat
        title: Título do chat
        messages: Lista de mensagens
        
    Returns:
        True se salvo com sucesso
    """
    db = get_firestore()
    if db is None:
        return False
    
    try:
        from datetime import datetime
        
        chat_data = {
            "title": title,
            "messages": messages,
            "updated_at": datetime.utcnow()
        }
        
        # Salva em /users/{uid}/chats/{chat_id}
        chat_ref = db.collection("users").document(uid).collection("chats").document(chat_id)
        
        # Merge para não sobrescrever created_at se já existe
        if not chat_ref.get().exists:
            chat_data["created_at"] = datetime.utcnow()
        
        chat_ref.set(chat_data, merge=True)
        return True
        
    except Exception as e:
        print(f"[FIREBASE] Erro ao salvar chat: {e}")
        return False


def get_user_chats(uid: str, limit: int = 50) -> list:
    """
    Lista os chats de um usuário.
    
    Args:
        uid: Firebase UID do usuário
        limit: Limite de chats a retornar
        
    Returns:
        Lista de chats
    """
    db = get_firestore()
    if db is None:
        return []
    
    try:
        chats_ref = db.collection("users").document(uid).collection("chats")
        query = chats_ref.order_by("updated_at", direction="DESCENDING").limit(limit)
        
        chats = []
        for doc in query.stream():
            chat = doc.to_dict()
            chat["id"] = doc.id
            chats.append(chat)
        
        return chats
        
    except Exception as e:
        print(f"[FIREBASE] Erro ao listar chats: {e}")
        return []


def delete_chat_from_firebase(uid: str, chat_id: str) -> bool:
    """
    Deleta um chat do Firestore.
    
    Args:
        uid: Firebase UID do usuário
        chat_id: ID do chat a deletar
        
    Returns:
        True se deletado com sucesso
    """
    db = get_firestore()
    if db is None:
        return False
    
    try:
        db.collection("users").document(uid).collection("chats").document(chat_id).delete()
        return True
        
    except Exception as e:
        print(f"[FIREBASE] Erro ao deletar chat: {e}")
        return False
