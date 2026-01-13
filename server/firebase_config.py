"""
Luna Firebase Configuration
===========================
Configuração do Firebase Admin SDK para autenticação e Firestore.
"""

import os
import logging
import time
from pathlib import Path
from typing import Optional, Dict, Any

# Configurar logging
logger = logging.getLogger(__name__)

# Importar exceções do Google API Core para tratamento de quota
try:
    from google.api_core import exceptions as google_exceptions
    GOOGLE_EXCEPTIONS_AVAILABLE = True
except ImportError:
    GOOGLE_EXCEPTIONS_AVAILABLE = False
    google_exceptions = None

def is_quota_exceeded_error(e: Exception) -> bool:
    """
    Verifica se um erro é relacionado a quota excedida do Firebase.
    
    Args:
        e: Exceção a verificar
    
    Returns:
        True se for erro de quota excedida
    """
    if not GOOGLE_EXCEPTIONS_AVAILABLE or not google_exceptions:
        # Fallback: verificar string do erro
        error_str = str(e)
        return 'Quota exceeded' in error_str or '429' in error_str or 'RESOURCE_EXHAUSTED' in error_str
    
    return isinstance(e, google_exceptions.ResourceExhausted) or \
           (hasattr(e, 'code') and e.code == 429) or \
           'Quota exceeded' in str(e) or \
           '429' in str(e) or \
           'RESOURCE_EXHAUSTED' in str(e)

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
        import json
        import base64
        
        cred = None
        
        # Opção 1: Variável de ambiente (para Railway/Cloud)
        firebase_creds_env = os.environ.get("FIREBASE_CREDENTIALS")
        if firebase_creds_env:
            try:
                # Tenta como JSON direto
                cred_dict = json.loads(firebase_creds_env)
                cred = credentials.Certificate(cred_dict)
                print("[FIREBASE] ✅ Credenciais carregadas da variável de ambiente!")
            except json.JSONDecodeError:
                # Tenta como Base64
                try:
                    decoded = base64.b64decode(firebase_creds_env).decode('utf-8')
                    cred_dict = json.loads(decoded)
                    cred = credentials.Certificate(cred_dict)
                    print("[FIREBASE] ✅ Credenciais carregadas (Base64)!")
                except Exception as e:
                    print(f"[FIREBASE] ⚠️ Erro ao decodificar FIREBASE_CREDENTIALS: {e}")
        
        # Opção 2: Arquivo local (para desenvolvimento)
        if cred is None:
            base_dir = Path(__file__).parent.parent
            doc_dir = base_dir / "documentação"
            
            # Busca dinâmica por arquivos JSON de credenciais
            key_files = list(doc_dir.glob("*firebase-adminsdk*.json"))
            
            if key_files:
                # Usa o primeiro arquivo encontrado
                key_path = key_files[0]
                cred = credentials.Certificate(str(key_path))
                print(f"[FIREBASE] ✅ Credenciais carregadas do arquivo: {key_path.name}")
            else:
                # Fallback para o nome de arquivo antigo se for um caminho específico conhecido
                legacy_path = doc_dir / "luna-8787d-firebase-adminsdk-fbsvc-506288a734.json"
                if legacy_path.exists():
                    cred = credentials.Certificate(str(legacy_path))
                    print(f"[FIREBASE] ✅ Credenciais carregadas do arquivo legado!")
                else:
                    print(f"[FIREBASE] ⚠️ Nenhuma chave JSON encontrada em: {doc_dir}")
                    print("[FIREBASE] ⚠️ Configure a variável de ambiente FIREBASE_CREDENTIALS para produção.")
                    return False
        
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

def get_chat_detail(uid: str, chat_id: str) -> Optional[Dict]:
    """Retrieves full chat details from Firestore."""
    db = get_firestore()
    if db is None:
        return None
    try:
        doc = db.collection("users").document(uid).collection("chats").document(chat_id).get()
        if doc.exists:
            res = doc.to_dict()
            res["id"] = doc.id
            return res
        return None
    except Exception as e:
        print(f"[FIREBASE] Error getting chat detail: {e}")
        return None


# =============================================================================
# FIRESTORE: BUSINESS TRANSACTIONS
# =============================================================================

def save_transaction_to_firebase(uid: str, tx_data: Dict) -> bool:
    """
    Salva uma transação financeira no Firestore.
    
    Args:
        uid: Firebase UID do usuário
        tx_data: Dados da transação (deve incluir 'id')
        
    Returns:
        True se salvo com sucesso
    """
    db = get_firestore()
    if db is None:
        return False
    
    try:
        from datetime import datetime
        
        tx_id = tx_data.get("id")
        if not tx_id:
            import uuid
            tx_id = str(uuid.uuid4())[:8]
            tx_data["id"] = tx_id
        
        # Adiciona timestamp de sync
        tx_data["synced_at"] = datetime.utcnow().isoformat()
        
        # Salva em /users/{uid}/transactions/{tx_id}
        db.collection("users").document(uid).collection("transactions").document(tx_id).set(tx_data, merge=True)
        print(f"[FIREBASE-BIZ] ✅ Transação salva: {tx_id}")
        return True
        
    except Exception as e:
        print(f"[FIREBASE-BIZ] Erro ao salvar transação: {e}")
        return False


def get_user_transactions(uid: str, limit: int = 100, max_retries: int = 3) -> list:
    """
    Lista as transações de um usuário com tratamento de quota excedida.
    
    Args:
        uid: Firebase UID do usuário
        limit: Limite de transações a retornar
        max_retries: Número máximo de tentativas com backoff exponencial
    
    Returns:
        Lista de transações ordenadas por data (mais recente primeiro)
    """
    db = get_firestore()
    if db is None:
        print(f"[FIREBASE-BIZ] ⚠️ Firestore não disponível")
        return []
    
    # Reduzir limite se muito alto para evitar quota exceeded
    if limit > 1000:
        print(f"[FIREBASE-BIZ] ⚠️ Limite muito alto ({limit}), reduzindo para 500 para evitar quota exceeded")
        limit = 500
    
    for attempt in range(max_retries):
        try:
            tx_ref = db.collection("users").document(uid).collection("transactions")
            
            # Pular contagem se já tentou antes (economiza quota)
            if attempt == 0:
                try:
                    collection_ref = tx_ref
                    count_query = collection_ref.count()
                    count_result = count_query.get()
                    total_count = list(count_result)[0][0].value if count_result else 0
                    print(f"[FIREBASE-BIZ] 📊 Total de transações na coleção: {total_count}")
                except Exception as count_err:
                    # Ignorar erro de contagem, não é crítico
                    pass
            
            # Se o limite for muito alto, carrega em batches menores
            if limit > 500:
                transactions = []
                query = tx_ref.order_by("date", direction="DESCENDING")
                
                # Reduzir batch_size para evitar quota exceeded
                batch_size = min(300, limit)  # Batches menores
                last_doc = None
                
                while len(transactions) < limit:
                    current_query = query.limit(batch_size)
                    if last_doc:
                        current_query = current_query.start_after(last_doc)
                    
                    # Adicionar pequeno delay entre batches para evitar quota
                    if last_doc:
                        time.sleep(0.1)  # 100ms entre batches
                    
                    batch = list(current_query.stream())
                    if not batch:
                        break
                    
                    for doc in batch:
                        tx = doc.to_dict()
                        tx["id"] = doc.id
                        transactions.append(tx)
                    
                    if len(batch) < batch_size:
                        break
                    
                    last_doc = batch[-1]
                    
                    if len(transactions) >= limit:
                        break
            else:
                # Query simples para limites menores
                query = tx_ref.order_by("date", direction="DESCENDING").limit(limit)
                transactions = []
                for doc in query.stream():
                    tx = doc.to_dict()
                    tx["id"] = doc.id
                    transactions.append(tx)
            
            print(f"[FIREBASE-BIZ] ✅ Carregadas {len(transactions)} transações para {uid} (limite solicitado: {limit})")
            return transactions
            
        except Exception as e:
            # Verificar se é erro de quota excedida
            if is_quota_exceeded_error(e):
                wait_time = (2 ** attempt) * 2  # Backoff exponencial: 2s, 4s, 8s
                print(f"[FIREBASE-BIZ] ⚠️ Quota excedida (tentativa {attempt + 1}/{max_retries}). Aguardando {wait_time}s...")
                
                if attempt < max_retries - 1:
                    time.sleep(wait_time)
                    # Reduzir limite na próxima tentativa
                    limit = min(limit, 200)
                    continue
                else:
                    print(f"[FIREBASE-BIZ] ❌ Quota excedida após {max_retries} tentativas. Retornando lista vazia.")
                    return []
            else:
                # Outro tipo de erro
                print(f"[FIREBASE-BIZ] ❌ Erro ao listar transações: {e}")
                import traceback
                traceback.print_exc()
                return []
    
    return []


def delete_transaction_from_firebase(uid: str, tx_id: str) -> bool:
    """
    Deleta uma transação do Firestore.
    
    Args:
        uid: Firebase UID do usuário
        tx_id: ID da transação a deletar
        
    Returns:
        True se deletado com sucesso
    """
    db = get_firestore()
    if db is None:
        return False
    
    try:
        db.collection("users").document(uid).collection("transactions").document(tx_id).delete()
        print(f"[FIREBASE-BIZ] ✅ Transação deletada: {tx_id}")
        return True
        
    except Exception as e:
        print(f"[FIREBASE-BIZ] Erro ao deletar transação: {e}")
        return False


def update_transaction_in_firebase(uid: str, tx_id: str, updates: Dict) -> bool:
    """
    Atualiza uma transação no Firestore.
    
    Args:
        uid: Firebase UID do usuário
        tx_id: ID da transação
        updates: Campos a atualizar
        
    Returns:
        True se atualizado com sucesso
    """
    db = get_firestore()
    if db is None:
        return False
    
    try:
        from datetime import datetime
        
        updates["updated_at"] = datetime.utcnow().isoformat()
        db.collection("users").document(uid).collection("transactions").document(tx_id).update(updates)
        print(f"[FIREBASE-BIZ] ✅ Transação atualizada: {tx_id}")
        return True
        
    except Exception as e:
        print(f"[FIREBASE-BIZ] Erro ao atualizar transação: {e}")
        return False


def get_business_summary_from_firebase(uid: str) -> Dict:
    """
    Calcula o resumo financeiro a partir das transações no Firebase.
    
    Returns:
        Dict com balance, income, expenses, invested, net_worth, transaction_count
    """
    # Reduzir limite para evitar quota exceeded (500 é suficiente para summary)
    transactions = get_user_transactions(uid, limit=500)  # Get recent transactions for summary
    
    income = 0.0
    expenses = 0.0
    invested = 0.0
    
    for tx in transactions:
        try:
            tx_value = float(tx.get("value", 0))
            tx_type = tx.get("type", "").lower()
            
            if tx_type == "income":
                income += tx_value
            elif tx_type == "expense":
                expenses += tx_value
            elif tx_type == "investment":
                invested += tx_value
        except (ValueError, TypeError):
            continue
    
    balance = income - expenses - invested
    net_worth = balance + invested
    
    return {
        "balance": round(balance, 2),
        "income": round(income, 2),
        "expenses": round(expenses, 2),
        "invested": round(invested, 2),
        "net_worth": round(net_worth, 2),
        "transaction_count": len(transactions)
    }


# =============================================================================
# FIRESTORE: HEALTH DATA (Meals, Goals, Weights)
# =============================================================================

def save_meal_to_firebase(uid: str, meal_data: Dict) -> bool:
    """
    Salva uma refeição no Firestore.
    
    Args:
        uid: Firebase UID do usuário
        meal_data: Dados da refeição (deve incluir 'id')
        
    Returns:
        True se salvo com sucesso
    """
    db = get_firestore()
    if db is None:
        return False
    
    try:
        from datetime import datetime
        
        meal_id = meal_data.get("id")
        if not meal_id:
            import uuid
            meal_id = str(uuid.uuid4())
            meal_data["id"] = meal_id
        
        # Adiciona timestamp de sync
        meal_data["synced_at"] = datetime.utcnow().isoformat()
        
        # Salva em /users/{uid}/meals/{meal_id}
        db.collection("users").document(uid).collection("meals").document(meal_id).set(meal_data, merge=True)
        logger.info(f"[FIREBASE-HEALTH] ✅ Refeição salva: {meal_id}")
        return True
        
    except Exception as e:
        logger.error(f"[FIREBASE-HEALTH] Erro ao salvar refeição: {e}")
        return False


def get_user_meals_from_firebase(uid: str, limit: Optional[int] = None, date: Optional[str] = None) -> list:
    """
    Lista as refeições de um usuário do Firestore.
    
    Args:
        uid: Firebase UID do usuário
        limit: Limite de refeições a retornar
        date: Filtrar por data (YYYY-MM-DD)
        
    Returns:
        Lista de refeições ordenadas por data (mais recente primeiro)
    """
    db = get_firestore()
    if db is None:
        return []
    
    try:
        meals_ref = db.collection("users").document(uid).collection("meals")
        
        # Ordena por data (mais recente primeiro)
        query = meals_ref.order_by("date", direction="DESCENDING")
        
        # Aplica filtro de data se fornecido
        if date:
            # Firestore precisa de range queries para datas
            # Vamos filtrar no código após buscar
            pass
        
        if limit:
            query = query.limit(limit)
        
        meals = []
        for doc in query.stream():
            meal = doc.to_dict()
            meal["id"] = doc.id
            
            # Filtro por data se fornecido
            if date:
                meal_date = meal.get("date", "")
                if not meal_date.startswith(date):
                    continue
            
            meals.append(meal)
        
        logger.info(f"[FIREBASE-HEALTH] Carregadas {len(meals)} refeições para {uid}")
        return meals
        
    except Exception as e:
        logger.error(f"[FIREBASE-HEALTH] Erro ao listar refeições: {e}")
        return []


def update_meal_in_firebase(uid: str, meal_id: str, updates: Dict) -> bool:
    """
    Atualiza uma refeição no Firestore.
    
    Args:
        uid: Firebase UID do usuário
        meal_id: ID da refeição
        updates: Campos a atualizar
        
    Returns:
        True se atualizado com sucesso
    """
    db = get_firestore()
    if db is None:
        return False
    
    try:
        from datetime import datetime
        
        updates["updated_at"] = datetime.utcnow().isoformat()
        updates["synced_at"] = datetime.utcnow().isoformat()
        
        db.collection("users").document(uid).collection("meals").document(meal_id).update(updates)
        logger.info(f"[FIREBASE-HEALTH] ✅ Refeição atualizada: {meal_id}")
        return True
        
    except Exception as e:
        logger.error(f"[FIREBASE-HEALTH] Erro ao atualizar refeição: {e}")
        return False


def delete_meal_from_firebase(uid: str, meal_id: str) -> bool:
    """
    Deleta uma refeição do Firestore.
    
    Args:
        uid: Firebase UID do usuário
        meal_id: ID da refeição a deletar
        
    Returns:
        True se deletado com sucesso
    """
    db = get_firestore()
    if db is None:
        return False
    
    try:
        db.collection("users").document(uid).collection("meals").document(meal_id).delete()
        logger.info(f"[FIREBASE-HEALTH] ✅ Refeição deletada: {meal_id}")
        return True
        
    except Exception as e:
        logger.error(f"[FIREBASE-HEALTH] Erro ao deletar refeição: {e}")
        return False


def save_goals_to_firebase(uid: str, goals_data: Dict) -> bool:
    """
    Salva as metas nutricionais de um usuário no Firestore.
    
    Args:
        uid: Firebase UID do usuário
        goals_data: Dados das metas
        
    Returns:
        True se salvo com sucesso
    """
    db = get_firestore()
    if db is None:
        return False
    
    try:
        from datetime import datetime
        
        goals_data["synced_at"] = datetime.utcnow().isoformat()
        goals_data["updated_at"] = datetime.utcnow().isoformat()
        
        # Salva em /users/{uid}/health/goals
        db.collection("users").document(uid).collection("health").document("goals").set(goals_data, merge=True)
        logger.info(f"[FIREBASE-HEALTH] ✅ Metas salvas para {uid}")
        return True
        
    except Exception as e:
        logger.error(f"[FIREBASE-HEALTH] Erro ao salvar metas: {e}")
        return False


def get_user_goals_from_firebase(uid: str) -> Dict:
    """
    Busca as metas nutricionais de um usuário do Firestore.
    
    Args:
        uid: Firebase UID do usuário
        
    Returns:
        Dicionário com as metas ou {} se não encontrado
    """
    db = get_firestore()
    if db is None:
        return {}
    
    try:
        doc = db.collection("users").document(uid).collection("health").document("goals").get()
        if doc.exists:
            return doc.to_dict() or {}
        return {}
        
    except Exception as e:
        logger.error(f"[FIREBASE-HEALTH] Erro ao buscar metas: {e}")
        return {}


# =============================================================================
# FIRESTORE: HEALTH WEIGHTS
# =============================================================================

def save_weight_to_firebase(uid: str, weight_data: Dict) -> bool:
    """
    Salva um registro de peso no Firestore.
    Usa last write wins para resolução de conflitos.
    
    Args:
        uid: Firebase UID do usuário
        weight_data: Dados do peso (deve incluir 'id' e 'date')
        
    Returns:
        True se salvo com sucesso
    """
    db = get_firestore()
    if db is None:
        return False
    
    try:
        from datetime import datetime
        
        weight_id = weight_data.get("id")
        if not weight_id:
            import uuid
            weight_id = str(uuid.uuid4())
            weight_data["id"] = weight_id
        
        # Adiciona timestamp de sync (para last write wins)
        weight_data["synced_at"] = datetime.utcnow().isoformat()
        weight_data["updated_at"] = datetime.utcnow().isoformat()
        
        # Salva em /users/{uid}/health/weights/{weight_id}
        # Usa merge=True para não sobrescrever created_at se já existe
        weight_ref = db.collection("users").document(uid).collection("health").collection("weights").document(weight_id)
        
        if not weight_ref.get().exists:
            weight_data["created_at"] = datetime.utcnow().isoformat()
        
        weight_ref.set(weight_data, merge=True)
        logger.info(f"[FIREBASE-HEALTH] ✅ Peso salvo: {weight_id} para {uid}")
        return True
        
    except Exception as e:
        logger.error(f"[FIREBASE-HEALTH] Erro ao salvar peso: {e}")
        return False


def get_user_weights_from_firebase(uid: str, limit: Optional[int] = None) -> list:
    """
    Lista os registros de peso de um usuário do Firestore.
    
    Args:
        uid: Firebase UID do usuário
        limit: Limite de registros a retornar
        
    Returns:
        Lista de registros de peso ordenados por data (mais recente primeiro)
    """
    db = get_firestore()
    if db is None:
        return []
    
    try:
        weights_ref = db.collection("users").document(uid).collection("health").collection("weights")
        
        # Ordena por data (mais recente primeiro)
        query = weights_ref.order_by("date", direction="DESCENDING")
        
        if limit:
            query = query.limit(limit)
        
        weights = []
        for doc in query.stream():
            weight = doc.to_dict()
            weight["id"] = doc.id
            weights.append(weight)
        
        logger.info(f"[FIREBASE-HEALTH] Carregados {len(weights)} registros de peso para {uid}")
        return weights
        
    except Exception as e:
        logger.error(f"[FIREBASE-HEALTH] Erro ao carregar pesos: {e}")
        return []


def update_weight_in_firebase(uid: str, weight_id: str, updates: Dict) -> bool:
    """
    Atualiza um registro de peso no Firestore.
    Usa last write wins para resolução de conflitos.
    
    Args:
        uid: Firebase UID do usuário
        weight_id: ID do registro de peso
        updates: Campos a atualizar
        
    Returns:
        True se atualizado com sucesso
    """
    db = get_firestore()
    if db is None:
        return False
    
    try:
        from datetime import datetime
        
        updates["updated_at"] = datetime.utcnow().isoformat()
        updates["synced_at"] = datetime.utcnow().isoformat()
        
        weight_ref = db.collection("users").document(uid).collection("health").collection("weights").document(weight_id)
        weight_ref.update(updates)
        
        logger.info(f"[FIREBASE-HEALTH] ✅ Peso atualizado: {weight_id} para {uid}")
        return True
        
    except Exception as e:
        logger.error(f"[FIREBASE-HEALTH] Erro ao atualizar peso: {e}")
        return False


def delete_weight_from_firebase(uid: str, weight_id: str) -> bool:
    """
    Deleta um registro de peso do Firestore.
    
    Args:
        uid: Firebase UID do usuário
        weight_id: ID do registro de peso a deletar
        
    Returns:
        True se deletado com sucesso
    """
    db = get_firestore()
    if db is None:
        return False
    
    try:
        db.collection("users").document(uid).collection("health").collection("weights").document(weight_id).delete()
        logger.info(f"[FIREBASE-HEALTH] ✅ Peso deletado: {weight_id} para {uid}")
        return True
        
    except Exception as e:
        logger.error(f"[FIREBASE-HEALTH] Erro ao deletar peso: {e}")
        return False
