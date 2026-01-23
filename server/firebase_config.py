"""
Luna Firebase Configuration
===========================
Configuração do Firebase Admin SDK para o novo projeto Luna.
Versão simplificada focada em memória e autenticação.
"""

import os
import json
import base64
import logging
from pathlib import Path
from typing import Optional, Dict, Any

logger = logging.getLogger(__name__)

# =============================================================================
# INICIALIZAÇÃO DO FIREBASE
# =============================================================================

_firebase_app = None
_firestore_client = None


def initialize_firebase() -> bool:
    """
    Inicializa o Firebase Admin SDK.
    
    Suporta duas formas de credenciais:
    1. Variável de ambiente FIREBASE_CREDENTIALS (JSON ou Base64)
    2. Arquivo local na pasta documentação
    
    Returns:
        True se inicializado com sucesso
    """
    global _firebase_app, _firestore_client
    
    if _firebase_app is not None:
        return True  # Já inicializado
    
    try:
        import firebase_admin
        from firebase_admin import credentials, firestore
        
        cred = None
        
        # Opção 1: Variável de ambiente (para produção/cloud)
        firebase_creds_env = os.environ.get("FIREBASE_CREDENTIALS")
        if firebase_creds_env:
            try:
                # Tenta como JSON direto
                cred_dict = json.loads(firebase_creds_env)
                cred = credentials.Certificate(cred_dict)
                print("[FIREBASE] Credenciais carregadas da variavel de ambiente!")
            except json.JSONDecodeError:
                # Tenta como Base64
                try:
                    decoded = base64.b64decode(firebase_creds_env).decode('utf-8')
                    cred_dict = json.loads(decoded)
                    cred = credentials.Certificate(cred_dict)
                    print("[FIREBASE] Credenciais carregadas (Base64)!")
                except Exception as e:
                    print(f"[FIREBASE] Erro ao decodificar FIREBASE_CREDENTIALS: {e}")
        
        # Opção 2: Arquivo local (para desenvolvimento)
        if cred is None:
            # Busca na pasta documentação do projeto
            base_dir = Path(__file__).parent.parent
            doc_dir = base_dir / "documentação"
            
            # Busca dinâmica por arquivos JSON de credenciais
            key_files = list(doc_dir.glob("*firebase-adminsdk*.json"))
            
            if key_files:
                key_path = key_files[0]
                cred = credentials.Certificate(str(key_path))
                print(f"[FIREBASE] Credenciais carregadas do arquivo: {key_path.name}")
            else:
                print(f"[FIREBASE] Nenhuma chave JSON encontrada em: {doc_dir}")
                return False
        
        _firebase_app = firebase_admin.initialize_app(cred)
        _firestore_client = firestore.client()
        
        print("[FIREBASE] Inicializado com sucesso!")
        return True
        
    except ImportError:
        print("[FIREBASE] firebase-admin nao instalado. Execute: pip install firebase-admin")
        return False
    except Exception as e:
        print(f"[FIREBASE] Erro na inicializacao: {e}")
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
        
        initialize_firebase()
        decoded_token = auth.verify_id_token(id_token)
        return decoded_token
        
    except Exception as e:
        print(f"[FIREBASE] Token inválido: {e}")
        return None


def get_user_info(uid: str) -> Optional[Dict[str, Any]]:
    """
    Busca informações de um usuário pelo UID.
    """
    try:
        from firebase_admin import auth
        
        user = auth.get_user(uid)
        return {
            "uid": user.uid,
            "email": user.email,
            "display_name": user.display_name,
            "photo_url": user.photo_url,
        }
    except Exception as e:
        print(f"[FIREBASE] Erro ao buscar usuário: {e}")
        return None


# =============================================================================
# FIRESTORE: PERFIS DE USUÁRIO
# =============================================================================

def get_user_profile(uid: str) -> Optional[Dict[str, Any]]:
    """Busca o perfil de um usuário no Firestore."""
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


def create_or_update_user_profile(uid: str, data: Dict) -> bool:
    """Cria ou atualiza o perfil de um usuário."""
    db = get_firestore()
    if db is None:
        return False
    
    try:
        from datetime import datetime, timezone
        
        data["updated_at"] = datetime.now(timezone.utc).isoformat()
        db.collection("users").document(uid).set(data, merge=True)
        return True
    except Exception as e:
        print(f"[FIREBASE] Erro ao salvar perfil: {e}")
        return False


# =============================================================================
# FIRESTORE: CHATS
# =============================================================================

def save_chat(uid: str, chat_id: str, title: str, messages: list) -> bool:
    """Salva um chat no Firestore."""
    db = get_firestore()
    if db is None:
        return False
    
    try:
        from datetime import datetime, timezone
        
        chat_data = {
            "title": title,
            "messages": messages,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        chat_ref = db.collection("users").document(uid).collection("chats").document(chat_id)
        
        # Adiciona created_at se for novo
        if not chat_ref.get().exists:
            chat_data["created_at"] = datetime.now(timezone.utc).isoformat()
        
        chat_ref.set(chat_data, merge=True)
        return True
    except Exception as e:
        print(f"[FIREBASE] Erro ao salvar chat: {e}")
        return False


def get_user_chats(uid: str, limit: int = 50) -> list:
    """Lista os chats de um usuário."""
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


def delete_chat(uid: str, chat_id: str) -> bool:
    """Deleta um chat do Firestore."""
    db = get_firestore()
    if db is None:
        return False
    
    try:
        db.collection("users").document(uid).collection("chats").document(chat_id).delete()
        return True
    except Exception as e:
        print(f"[FIREBASE] Erro ao deletar chat: {e}")
        return False
