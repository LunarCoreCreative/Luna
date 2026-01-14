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

def _load_local_transactions(user_id: str) -> List[Dict]:
    """Load transactions from local JSON file."""
    file_path = get_transactions_file(user_id)
    if not file_path.exists():
        return []
    try:
        return json.loads(file_path.read_text(encoding="utf-8"))
    except:
        return []

def _save_local_transactions(user_id: str, transactions: List[Dict]) -> None:
    """Save transactions to local JSON file."""
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
    Uses Firebase if available, otherwise local storage.
    Always syncs local cache with Firebase when available.
    Removes duplicates automatically.
    
    Args:
        user_id: ID do usuário
        auto_reconcile: Se True, executa reconciliação automática se necessário
    """
    # Se user_id parece ser um Firebase UID (longo) e Firebase está disponível
    if FIREBASE_AVAILABLE and user_id and user_id != "local" and len(user_id) > 10:
        try:
            # Carrega transações do Firebase (limite reduzido para evitar quota exceeded)
            firebase_txs = get_user_transactions(user_id, limit=500)
            
            # Carrega também do local para merge
            local_txs = _load_local_transactions(user_id)
            
            # Merge: combina Firebase e local, removendo duplicatas
            all_transactions = firebase_txs + local_txs
            transactions = _remove_duplicates(all_transactions)
            
            # Se encontrou transações, sincroniza o cache local
            if transactions:
                print(f"[BUSINESS] ✅ Carregadas {len(transactions)} transações (Firebase: {len(firebase_txs)}, Local: {len(local_txs)})")
                _save_local_transactions(user_id, transactions)
                return transactions
            else:
                # Nenhuma transação encontrada
                return []
                
        except Exception as e:
            print(f"[BUSINESS] ❌ Firebase load failed, fallback local: {e}")
            import traceback
            traceback.print_exc()
            # Fallback para local mesmo em caso de erro
            local_txs = _load_local_transactions(user_id)
            return _remove_duplicates(local_txs)
    
    # Fallback para storage local
    local_txs = _load_local_transactions(user_id)
    return _remove_duplicates(local_txs)


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
    
    # SEMPRE salva localmente primeiro (garantia de persistência)
    transactions = _load_local_transactions(user_id)
    # Evita duplicatas por ID
    if not any(tx.get("id") == new_tx["id"] for tx in transactions):
        transactions.append(new_tx)
        _save_local_transactions(user_id, transactions)
        print(f"[BUSINESS] ✅ Transação {new_tx['id']} salva no cache local")
    else:
        print(f"[BUSINESS] ⚠️ Transação {new_tx['id']} já existe no cache local, pulando...")
    
    # Depois tenta salvar no Firebase com retry automático
    if FIREBASE_AVAILABLE and user_id and user_id != "local" and len(user_id) > 10:
        try:
            from .sync import sync_transaction_to_firebase
            firebase_success, error = sync_transaction_to_firebase(user_id, new_tx, retry=True)
            if firebase_success:
                print(f"[BUSINESS] ✅ Transação {new_tx['id']} também salva no Firebase")
            else:
                print(f"[BUSINESS] ⚠️ Falha ao salvar no Firebase após retries: {error}")
                print(f"[BUSINESS] ⚠️ Transação está salva localmente e será sincronizada depois")
        except Exception as e:
            print(f"[BUSINESS] ❌ Firebase save failed: {e}")
            import traceback
            traceback.print_exc()
            # Não falha a operação, já salvou localmente
    
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
    """Delete a transaction by ID from Firebase and local."""
    
    # Delete from Firebase com retry
    if FIREBASE_AVAILABLE and user_id and user_id != "local" and len(user_id) > 10:
        try:
            from .sync import _retry_with_backoff
            def attempt_delete():
                try:
                    delete_transaction_from_firebase(user_id, tx_id)
                    return True, None
                except Exception as e:
                    return False, str(e)
            
            success, error, attempts = _retry_with_backoff(attempt_delete)
            if not success:
                print(f"[BUSINESS] ⚠️ Firebase delete failed após {attempts} tentativas: {error}")
        except Exception as e:
            print(f"[BUSINESS] Firebase delete failed: {e}")
    
    # Delete from local
    transactions = _load_local_transactions(user_id)
    original_len = len(transactions)
    transactions = [tx for tx in transactions if tx["id"] != tx_id]
    
    if len(transactions) < original_len:
        _save_local_transactions(user_id, transactions)
        return True
    return False


def update_transaction(user_id: str, tx_id: str, updates: Dict) -> Optional[Dict]:
    """Update a transaction by ID."""
    
    # 1. Carregar transações locais
    transactions = _load_local_transactions(user_id)
    
    # 2. Tentar encontrar a transação
    tx_index = next((i for i, t in enumerate(transactions) if t["id"] == tx_id), -1)
    
    # 3. Se não encontrou e estamos online, tentar sincronizar do Firebase
    if tx_index == -1 and FIREBASE_AVAILABLE and user_id and user_id != "local" and len(user_id) > 10:
        print(f"[BUSINESS] Transação {tx_id} não encontrada localmente, buscando no Firebase...")
        try:
            # Busca as mais recentes para tentar achar
            fresh_txs = get_user_transactions(user_id, limit=200)
            if fresh_txs:
                # Atualiza cache local (sobrescreve ou merge? sobrescrever é mais seguro pra consistência de lista, mas perde dados offline não syncados.
                # Como é um cache, vamos assumir que o Firebase é a verdade absoluta se tivermos dados.
                _save_local_transactions(user_id, fresh_txs)
                transactions = fresh_txs
                # Tenta achar de novo
                tx_index = next((i for i, t in enumerate(transactions) if t["id"] == tx_id), -1)
        except Exception as e:
            print(f"[BUSINESS] Erro ao sincronizar para update: {e}")

    # 4. Se ainda não encontrou, falha
    if tx_index == -1:
        return None

    # 5. Aplica atualizações no objeto em memória
    tx = transactions[tx_index]
    
    # Verifica duplicatas se estiver atualizando campos que afetam a chave única
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
    
    # Se está atualizando a data, normaliza para UTC
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
    
    tx.update(updates)
    tx["updated_at"] = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    
    # 6. Salva no Firebase (Cloud) com retry
    if FIREBASE_AVAILABLE and user_id and user_id != "local" and len(user_id) > 10:
        try:
            from .sync import _retry_with_backoff
            def attempt_update():
                try:
                    update_transaction_in_firebase(user_id, tx_id, updates)
                    return True, None
                except Exception as e:
                    return False, str(e)
            
            success, error, attempts = _retry_with_backoff(attempt_update)
            if not success:
                print(f"[BUSINESS] ⚠️ Firebase update failed após {attempts} tentativas: {error}")
        except Exception as e:
            print(f"[BUSINESS] Firebase update failed: {e}")
    
    # 7. Salva no Local (Cache)
    # Precisamos garantir que atualizamos a lista original com o objeto modificado
    transactions[tx_index] = tx
    _save_local_transactions(user_id, transactions)
    
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
