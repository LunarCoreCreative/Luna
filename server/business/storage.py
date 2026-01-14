"""
Luna Business Module
--------------------
Storage and utilities for business management features.
Uses Firebase as primary storage with local JSON fallback.
"""

import json
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Optional
from decimal import Decimal, ROUND_HALF_UP
import uuid

# =============================================================================
# FIREBASE IMPORTS (com fallback)
# =============================================================================

try:
    from ..firebase_config import (
        save_transaction_to_firebase,
        get_user_transactions,
        delete_transaction_from_firebase,
        update_transaction_in_firebase,
        get_business_summary_from_firebase
    )
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    print("[BUSINESS] ⚠️ Firebase não disponível, usando storage local.")

# =============================================================================
# LOCAL STORAGE PATHS (Fallback)
# =============================================================================

DATA_DIR = Path(__file__).parent.parent.parent / "data" / "business"
DATA_DIR.mkdir(parents=True, exist_ok=True)

def get_user_data_dir(user_id: str) -> Path:
    """Get user-specific data directory."""
    if not user_id:
        user_id = "local"
    user_dir = DATA_DIR / user_id
    user_dir.mkdir(parents=True, exist_ok=True)
    return user_dir

# =============================================================================
# TRANSACTIONS
# =============================================================================

def get_transactions_file(user_id: str) -> Path:
    return get_user_data_dir(user_id) / "transactions.json"

# Storage local removido - app funciona apenas online com Firebase
# Funções _load_local_transactions e _save_local_transactions disponíveis apenas em modo de teste
def _load_local_transactions(user_id: str) -> List[Dict]:
    """Load transactions from local JSON file (apenas em modo de teste)."""
    import os
    if os.environ.get("LUNA_TEST_MODE") != "1":
        raise RuntimeError("Storage local disponível apenas em modo de teste")
    file_path = get_transactions_file(user_id)
    if not file_path.exists():
        return []
    try:
        return json.loads(file_path.read_text(encoding="utf-8"))
    except:
        return []

def _save_local_transactions(user_id: str, transactions: List[Dict]) -> None:
    """Save transactions to local JSON file (apenas em modo de teste)."""
    import os
    if os.environ.get("LUNA_TEST_MODE") != "1":
        raise RuntimeError("Storage local disponível apenas em modo de teste")
    file_path = get_transactions_file(user_id)
    file_path.write_text(json.dumps(transactions, ensure_ascii=False, indent=2), encoding="utf-8")


def _remove_duplicates(transactions: List[Dict]) -> List[Dict]:
    """
    Remove transações duplicadas baseado no ID.
    Mantém a primeira ocorrência de cada ID único.
    """
    seen_ids = set()
    unique_transactions = []
    duplicates_count = 0
    
    for tx in transactions:
        tx_id = tx.get("id")
        if not tx_id:
            # Se não tem ID, mantém (pode ser problema, mas não é duplicata)
            unique_transactions.append(tx)
            continue
        
        if tx_id not in seen_ids:
            seen_ids.add(tx_id)
            unique_transactions.append(tx)
        else:
            duplicates_count += 1
            print(f"[BUSINESS] ⚠️ Transação duplicada removida: ID {tx_id}")
    
    if duplicates_count > 0:
        print(f"[BUSINESS] 🔍 Removidas {duplicates_count} transações duplicadas")
    
    return unique_transactions


def load_transactions(user_id: str, auto_reconcile: bool = True) -> List[Dict]:
    """
    Load all transactions for a user.
    REQUIRES Firebase - no local storage fallback.
    App will not work offline.
    
    Args:
        user_id: ID do usuário (deve ser Firebase UID)
        auto_reconcile: Se True, executa reconciliação automática se necessário (não usado mais)
    
    Returns:
        Lista de transações do Firebase
        
    Raises:
        ValueError: Se Firebase não estiver disponível ou user_id inválido
    """
    # Modo de teste: permite storage local temporariamente
    import os
    TEST_MODE = os.environ.get("LUNA_TEST_MODE") == "1"
    
    # Valida que user_id é um Firebase UID válido (ou permite local em modo de teste)
    if not user_id or (user_id == "local" and not TEST_MODE) or (len(user_id) <= 10 and not TEST_MODE):
        raise ValueError(f"user_id inválido para modo online-only: {user_id}. Firebase UID requerido.")
    
    if not FIREBASE_AVAILABLE and not TEST_MODE:
        raise ValueError("Firebase não está disponível. App requer conexão com Firebase para funcionar.")
    
    # Em modo de teste, permite usar storage local
    if TEST_MODE and (not FIREBASE_AVAILABLE or user_id.startswith("testlocal")):
        local_txs = _load_local_transactions(user_id)
        transactions = _remove_duplicates(local_txs)
        print(f"[BUSINESS-TEST] ✅ Carregadas {len(transactions)} transações do storage local (modo teste)")
        return transactions
    
    try:
        # Carrega transações APENAS do Firebase
        transactions = get_user_transactions(user_id, limit=500)
        
        # Remove duplicatas (caso existam no próprio Firebase)
        transactions = _remove_duplicates(transactions)
        
        print(f"[BUSINESS] ✅ Carregadas {len(transactions)} transações do Firebase")
        return transactions
                
    except Exception as e:
        print(f"[BUSINESS] ❌ Erro ao carregar transações do Firebase: {e}")
        import traceback
        traceback.print_exc()
        # Não há fallback - propaga o erro
        raise ValueError(f"Erro ao carregar transações do Firebase: {str(e)}") from e


def add_transaction(
    user_id: str,
    type: str,  # "income" or "expense"
    value: float,
    description: str,
    category: str = "geral",
    date: Optional[str] = None,
    recurring_id: Optional[str] = None,  # ID do item recorrente que gerou esta transação
    credit_card_id: Optional[str] = None,  # ID do cartão de crédito (se aplicável)
    interest_rate: Optional[float] = None,  # Taxa de juros anual (%) - apenas para investimentos
    investment_type: Optional[str] = None  # "investment" (investimento real) ou "savings" (caixinha/poupança)
) -> Dict:
    """Add a new transaction. Saves to Firebase + local cache."""
    
    # Valida e converte valor usando módulo de validação
    try:
        from .validation import validate_value
        is_valid, validated_value, error = validate_value(value, "value")
        if not is_valid:
            print(f"[BUSINESS] ❌ Valor inválido: {value}, erro: {error}")
            raise ValueError(error)
        value = validated_value
    except ValueError:
        # Re-raise ValueError (já tem mensagem de erro)
        raise
    except Exception as e:
        print(f"[BUSINESS] ❌ Erro ao validar valor: {value}, erro: {e}")
        raise ValueError(f"Erro ao processar valor: {str(e)}")
    
    # Normaliza data para UTC (ISO 8601)
    try:
        from .date_utils import normalize_date, validate_date_format
        if date:
            # Valida formato antes de normalizar
            is_valid, error = validate_date_format(date)
            if not is_valid:
                raise ValueError(f"Data inválida: {error}")
            tx_date = normalize_date(date, default_to_now=False)
        else:
            tx_date = normalize_date(None, default_to_now=True)
    except Exception as e:
        print(f"[BUSINESS] ❌ Erro ao normalizar data: {e}")
        raise ValueError(f"Erro ao processar data: {str(e)}")
    
    # Valida descrição e categoria
    from .validation import validate_description, validate_category
    
    is_valid_desc, cleaned_description, desc_error = validate_description(description)
    if not is_valid_desc:
        raise ValueError(desc_error)
    
    is_valid_cat, cleaned_category, cat_error = validate_category(category)
    if not is_valid_cat:
        raise ValueError(cat_error)
    
    new_tx = {
        "id": str(uuid.uuid4())[:8],
        "type": type,
        "value": abs(value),  # Já validado e garantido positivo
        "description": cleaned_description,  # Já validado e limpo
        "category": cleaned_category,  # Já validado e limpo
        "date": tx_date,
        "created_at": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    }
    
    # Adiciona recurring_id se fornecido (para rastreamento de transações recorrentes)
    if recurring_id:
        new_tx["recurring_id"] = str(recurring_id)
    
    # Adiciona credit_card_id se fornecido
    if credit_card_id:
        new_tx["credit_card_id"] = str(credit_card_id)
    
    # Adiciona campos de investimento se for tipo investment
    if type == "investment":
        if interest_rate is not None:
            new_tx["interest_rate"] = float(interest_rate)
        if investment_type:
            new_tx["investment_type"] = str(investment_type)
    
    print(f"[BUSINESS] 📝 Adicionando transação: {new_tx['id']} - {new_tx['type']} - R$ {new_tx['value']:.2f}")
    
    # Verifica duplicatas antes de salvar
    try:
        from .duplicate_detector import check_duplicate
        is_dup, dup_tx, source = check_duplicate(user_id, new_tx, exclude_id=None, check_firebase=True)
        
        if is_dup:
            dup_id = dup_tx.get("id", "unknown") if dup_tx else "unknown"
            error_msg = f"Transação duplicada detectada (ID existente: {dup_id}, fonte: {source}). Transação com mesma data ({new_tx['date'][:10]}), valor (R$ {new_tx['value']:.2f}) e descrição ('{new_tx['description']}') já existe."
            print(f"[BUSINESS] ❌ {error_msg}")
            raise ValueError(error_msg)
    except ValueError:
        # Re-raise ValueError (duplicata detectada)
        raise
    except Exception as e:
        # Outros erros na verificação não devem impedir a criação
        print(f"[BUSINESS] ⚠️ Erro ao verificar duplicatas (continuando): {e}")
    
    # Modo de teste: permite storage local temporariamente
    import os
    TEST_MODE = os.environ.get("LUNA_TEST_MODE") == "1"
    
    # Valida que Firebase está disponível (ou permite modo de teste)
    if not FIREBASE_AVAILABLE and not TEST_MODE:
        raise ValueError("Firebase não está disponível. App requer conexão com Firebase para funcionar.")
    
    if not user_id or (user_id == "local" and not TEST_MODE) or (len(user_id) <= 10 and not TEST_MODE):
        raise ValueError(f"user_id inválido para modo online-only: {user_id}. Firebase UID requerido.")
    
    # Em modo de teste, salva localmente primeiro
    if TEST_MODE and (not FIREBASE_AVAILABLE or user_id.startswith("testlocal")):
        transactions = _load_local_transactions(user_id)
        if not any(tx.get("id") == new_tx["id"] for tx in transactions):
            transactions.append(new_tx)
            _save_local_transactions(user_id, transactions)
            print(f"[BUSINESS-TEST] ✅ Transação {new_tx['id']} salva localmente (modo teste)")
            return new_tx
    
    # Salva APENAS no Firebase (sem cache local)
    try:
        from .sync import sync_transaction_to_firebase
        firebase_success, error = sync_transaction_to_firebase(user_id, new_tx, retry=True)
        if firebase_success:
            print(f"[BUSINESS] ✅ Transação {new_tx['id']} salva no Firebase")
        else:
            raise ValueError(f"Falha ao salvar no Firebase após retries: {error}")
    except Exception as e:
        print(f"[BUSINESS] ❌ Firebase save failed: {e}")
        import traceback
        traceback.print_exc()
        # Propaga o erro - sem fallback local
        raise ValueError(f"Erro ao salvar transação no Firebase: {str(e)}") from e
    
    return new_tx


def get_summary(user_id: str) -> Dict:
    """
    Calculate financial summary from Firebase or local.
    Uses Decimal for precise calculations to avoid floating-point errors.
    """
    
    # Carrega transações (já sincroniza Firebase com local)
    transactions = load_transactions(user_id)
    
    print(f"[BUSINESS] 📊 Calculando summary para {len(transactions)} transações")
    
    # Usa Decimal para cálculos precisos
    income = Decimal('0.00')
    expenses = Decimal('0.00')
    invested = Decimal('0.00')
    
    # Contadores para debug
    income_count = 0
    expense_count = 0
    investment_count = 0
    invalid_count = 0
    
    for tx in transactions:
        try:
            # Converte para Decimal para precisão
            tx_value_str = str(tx.get("value", 0))
            tx_value = Decimal(tx_value_str).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            tx_type = tx.get("type", "").lower().strip()
            
            # Valida valor
            if tx_value < 0:
                print(f"[BUSINESS] ⚠️ Transação {tx.get('id')} tem valor negativo: {tx_value}, ignorando")
                invalid_count += 1
                continue
            
            if tx_type == "income":
                income += tx_value
                income_count += 1
            elif tx_type == "expense":
                expenses += tx_value
                expense_count += 1
            elif tx_type == "investment":
                invested += tx_value
                investment_count += 1
            else:
                print(f"[BUSINESS] ⚠️ Transação {tx.get('id')} tem tipo inválido: '{tx_type}', ignorando")
                invalid_count += 1
                continue
        except (ValueError, TypeError, Exception) as e:
            print(f"[BUSINESS] ⚠️ Erro ao processar transação {tx.get('id', 'unknown')}: {e}, tx={tx}")
            invalid_count += 1
            continue
    
    # Balance is cash on hand (Income - Expenses - Outflows to Investment)
    balance = income - expenses - invested
    
    # Net Worth is Balance + Invested Assets
    net_worth = balance + invested
    
    # Converte para float com 2 casas decimais
    def to_float(decimal_val):
        return float(decimal_val.quantize(Decimal('0.01'), rounding=ROUND_HALF_UP))
    
    summary = {
        "balance": to_float(balance),
        "income": to_float(income),
        "expenses": to_float(expenses),
        "invested": to_float(invested),
        "net_worth": to_float(net_worth),
        "transaction_count": len(transactions)
    }
    
    print(f"[BUSINESS] 📊 Summary calculado: Balance={summary['balance']}, Income={summary['income']} ({income_count} transações), Expenses={summary['expenses']} ({expense_count} transações), Invested={summary['invested']} ({investment_count} transações), Net Worth={summary['net_worth']}, Invalid={invalid_count}")
    
    return summary


def delete_transaction(user_id: str, tx_id: str) -> bool:
    """
    Delete a transaction by ID from Firebase.
    REQUIRES Firebase - no local storage fallback.
    
    Args:
        user_id: Firebase UID do usuário
        tx_id: ID da transação a deletar
    
    Returns:
        True se deletado com sucesso
        
    Raises:
        ValueError: Se Firebase não estiver disponível
    """
    # Valida que Firebase está disponível
    if not FIREBASE_AVAILABLE:
        raise ValueError("Firebase não está disponível. App requer conexão com Firebase para funcionar.")
    
    if not user_id or user_id == "local" or len(user_id) <= 10:
        raise ValueError(f"user_id inválido para modo online-only: {user_id}. Firebase UID requerido.")
    
    # Delete APENAS do Firebase
    try:
        from .sync import _retry_with_backoff
        def attempt_delete():
            try:
                delete_transaction_from_firebase(user_id, tx_id)
                return True, None
            except Exception as e:
                return False, str(e)
        
        success, error, attempts = _retry_with_backoff(attempt_delete)
        if success:
            print(f"[BUSINESS] ✅ Transação {tx_id} deletada do Firebase")
            return True
        else:
            raise ValueError(f"Falha ao deletar no Firebase após {attempts} tentativas: {error}")
    except Exception as e:
        print(f"[BUSINESS] ❌ Firebase delete failed: {e}")
        raise ValueError(f"Erro ao deletar transação no Firebase: {str(e)}") from e


def update_transaction(user_id: str, tx_id: str, updates: Dict) -> Optional[Dict]:
    """
    Update a transaction by ID.
    REQUIRES Firebase - no local storage fallback.
    
    Args:
        user_id: Firebase UID do usuário
        tx_id: ID da transação a atualizar
        updates: Dicionário com campos a atualizar
    
    Returns:
        Transação atualizada ou None se não encontrada
        
    Raises:
        ValueError: Se Firebase não estiver disponível
    """
    # Valida que Firebase está disponível
    if not FIREBASE_AVAILABLE:
        raise ValueError("Firebase não está disponível. App requer conexão com Firebase para funcionar.")
    
    if not user_id or user_id == "local" or len(user_id) <= 10:
        raise ValueError(f"user_id inválido para modo online-only: {user_id}. Firebase UID requerido.")
    
    # 1. Buscar transação no Firebase
    try:
        transactions = get_user_transactions(user_id, limit=200)
        tx = next((t for t in transactions if t.get("id") == tx_id), None)
        
        if not tx:
            print(f"[BUSINESS] ⚠️ Transação {tx_id} não encontrada no Firebase")
            return None
    except Exception as e:
        print(f"[BUSINESS] ❌ Erro ao buscar transação no Firebase: {e}")
        raise ValueError(f"Erro ao buscar transação no Firebase: {str(e)}") from e

    # 2. Verifica duplicatas se estiver atualizando campos que afetam a chave única
    fields_that_affect_key = ["date", "value", "description", "type"]
    if any(field in updates for field in fields_that_affect_key):
        try:
            from .duplicate_detector import check_duplicate
            # Cria transação temporária com valores atualizados
            test_tx = tx.copy()
            test_tx.update(updates)
            # Verifica duplicatas excluindo a própria transação
            is_dup, dup_tx, source = check_duplicate(user_id, test_tx, exclude_id=tx_id, check_firebase=True)
            
            if is_dup:
                dup_id = dup_tx.get("id", "unknown") if dup_tx else "unknown"
                error_msg = f"Atualização criaria transação duplicada (ID existente: {dup_id}, fonte: {source})."
                print(f"[BUSINESS] ❌ {error_msg}")
                raise ValueError(error_msg)
        except ValueError:
            # Re-raise ValueError (duplicata detectada)
            raise
        except Exception as e:
            # Outros erros na verificação não devem impedir a atualização
            print(f"[BUSINESS] ⚠️ Erro ao verificar duplicatas no update (continuando): {e}")
    
    # 3. Se está atualizando a data, normaliza para UTC
    if "date" in updates:
        try:
            from .date_utils import normalize_date, validate_date_format
            date_value = updates["date"]
            is_valid, error = validate_date_format(date_value)
            if not is_valid:
                raise ValueError(f"Data inválida: {error}")
            updates["date"] = normalize_date(date_value, default_to_now=False)
        except Exception as e:
            print(f"[BUSINESS] ❌ Erro ao normalizar data no update: {e}")
            raise ValueError(f"Erro ao processar data: {str(e)}")
    
    # 4. Aplica atualizações
    tx.update(updates)
    tx["updated_at"] = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    
    # 5. Salva APENAS no Firebase (sem cache local)
    try:
        from .sync import _retry_with_backoff
        def attempt_update():
            try:
                update_transaction_in_firebase(user_id, tx_id, updates)
                return True, None
            except Exception as e:
                return False, str(e)
        
        success, error, attempts = _retry_with_backoff(attempt_update)
        if success:
            print(f"[BUSINESS] ✅ Transação {tx_id} atualizada no Firebase")
        else:
            raise ValueError(f"Falha ao atualizar no Firebase após {attempts} tentativas: {error}")
    except Exception as e:
        print(f"[BUSINESS] ❌ Firebase update failed: {e}")
        raise ValueError(f"Erro ao atualizar transação no Firebase: {str(e)}") from e
    
    return tx


# =============================================================================
# CLIENTS (mantém local por enquanto)
# =============================================================================

def get_clients_file(user_id: str) -> Path:
    return get_user_data_dir(user_id) / "clients.json"

def load_clients(user_id: str) -> List[Dict]:
    """Load all clients for a user."""
    file_path = get_clients_file(user_id)
    if not file_path.exists():
        return []
    try:
        return json.loads(file_path.read_text(encoding="utf-8"))
    except:
        return []

def save_clients(user_id: str, clients: List[Dict]) -> None:
    """Save clients to file."""
    file_path = get_clients_file(user_id)
    file_path.write_text(json.dumps(clients, ensure_ascii=False, indent=2), encoding="utf-8")

def add_client(user_id: str, name: str, contact: str = "") -> Dict:
    """Add a new client."""
    clients = load_clients(user_id)
    
    new_client = {
        "id": str(uuid.uuid4())[:8],
        "name": name,
        "contact": contact,
        "created_at": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    }
    
    clients.append(new_client)
    save_clients(user_id, clients)
    
    return new_client

def search_clients(user_id: str, query: str) -> List[Dict]:
    """Search clients by name."""
    clients = load_clients(user_id)
    query_lower = query.lower()
    return [c for c in clients if query_lower in c["name"].lower()]
