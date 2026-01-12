"""
Luna Business Module
--------------------
Storage and utilities for business management features.
Uses Firebase as primary storage with local JSON fallback.
"""

import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional
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


def load_transactions(user_id: str) -> List[Dict]:
    """
    Load all transactions for a user.
    Uses Firebase if available, otherwise local storage.
    Always syncs local cache with Firebase when available.
    """
    # Se user_id parece ser um Firebase UID (longo) e Firebase está disponível
    if FIREBASE_AVAILABLE and user_id and user_id != "local" and len(user_id) > 10:
        try:
            # Carrega TODAS as transações do Firebase (limite alto para garantir)
            transactions = get_user_transactions(user_id, limit=2000)
            
            # Se encontrou transações no Firebase, sincroniza o cache local
            if transactions:
                print(f"[BUSINESS] ✅ Carregadas {len(transactions)} transações do Firebase, sincronizando cache local...")
                _save_local_transactions(user_id, transactions)
                return transactions
            else:
                # Firebase retornou vazio - pode ser que não há transações ou houve problema
                # Tenta carregar do cache local e verificar se há algo
                local_txs = _load_local_transactions(user_id)
                if local_txs:
                    print(f"[BUSINESS] ⚠️ Firebase vazio, usando cache local com {len(local_txs)} transações")
                return local_txs
                
        except Exception as e:
            print(f"[BUSINESS] ❌ Firebase load failed, fallback local: {e}")
            import traceback
            traceback.print_exc()
    
    # Fallback para storage local
    return _load_local_transactions(user_id)


def add_transaction(
    user_id: str,
    type: str,  # "income" or "expense"
    value: float,
    description: str,
    category: str = "geral",
    date: Optional[str] = None
) -> Dict:
    """Add a new transaction. Saves to Firebase + local cache."""
    
    # Garante que value é float
    try:
        value = float(value)
        if value <= 0:
            raise ValueError("Value must be positive")
    except (ValueError, TypeError) as e:
        print(f"[BUSINESS] ❌ Valor inválido: {value}, erro: {e}")
        raise ValueError(f"Invalid value: {value}")
    
    # Use data fornecida ou data atual
    tx_date = date if date else datetime.now().isoformat()
    # Se a data for só YYYY-MM-DD, adiciona hora
    if date and len(date) == 10:
        tx_date = f"{date}T12:00:00"
    
    new_tx = {
        "id": str(uuid.uuid4())[:8],
        "type": type,
        "value": abs(value),  # Garante valor positivo
        "description": str(description).strip(),
        "category": str(category).strip() if category else "geral",
        "date": tx_date,
        "created_at": datetime.now().isoformat()
    }
    
    print(f"[BUSINESS] 📝 Adicionando transação: {new_tx['id']} - {new_tx['type']} - R$ {new_tx['value']:.2f}")
    
    # SEMPRE salva localmente primeiro (garantia de persistência)
    transactions = _load_local_transactions(user_id)
    # Evita duplicatas por ID
    if not any(tx.get("id") == new_tx["id"] for tx in transactions):
        transactions.append(new_tx)
        _save_local_transactions(user_id, transactions)
        print(f"[BUSINESS] ✅ Transação {new_tx['id']} salva no cache local")
    else:
        print(f"[BUSINESS] ⚠️ Transação {new_tx['id']} já existe no cache local, pulando...")
    
    # Depois tenta salvar no Firebase (opcional, mas desejável)
    if FIREBASE_AVAILABLE and user_id and user_id != "local" and len(user_id) > 10:
        try:
            firebase_success = save_transaction_to_firebase(user_id, new_tx)
            if firebase_success:
                print(f"[BUSINESS] ✅ Transação {new_tx['id']} também salva no Firebase")
            else:
                print(f"[BUSINESS] ⚠️ Falha ao salvar no Firebase, mas transação está salva localmente")
        except Exception as e:
            print(f"[BUSINESS] ❌ Firebase save failed: {e}")
            import traceback
            traceback.print_exc()
            # Não falha a operação, já salvou localmente
    
    return new_tx


def get_summary(user_id: str) -> Dict:
    """Calculate financial summary from Firebase or local."""
    
    # Carrega transações (já sincroniza Firebase com local)
    transactions = load_transactions(user_id)
    
    print(f"[BUSINESS] 📊 Calculando summary para {len(transactions)} transações")
    
    # Garante que todos os valores são floats
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
        except (ValueError, TypeError) as e:
            print(f"[BUSINESS] ⚠️ Erro ao processar transação {tx.get('id')}: {e}")
            continue
    
    # Balance is cash on hand (Income - Expenses - Outflows to Investment)
    balance = income - expenses - invested
    
    # Net Worth is Balance + Invested Assets
    net_worth = balance + invested
    
    summary = {
        "balance": round(balance, 2),
        "income": round(income, 2),
        "expenses": round(expenses, 2),
        "invested": round(invested, 2),
        "net_worth": round(net_worth, 2),
        "transaction_count": len(transactions)
    }
    
    print(f"[BUSINESS] 📊 Summary calculado: Balance={summary['balance']}, Income={summary['income']}, Expenses={summary['expenses']}, Invested={summary['invested']}, Net Worth={summary['net_worth']}")
    
    return summary


def delete_transaction(user_id: str, tx_id: str) -> bool:
    """Delete a transaction by ID from Firebase and local."""
    
    # Delete from Firebase
    if FIREBASE_AVAILABLE and user_id and user_id != "local" and len(user_id) > 10:
        try:
            delete_transaction_from_firebase(user_id, tx_id)
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
    tx.update(updates)
    tx["updated_at"] = datetime.now().isoformat()
    
    # 6. Salva no Firebase (Cloud)
    if FIREBASE_AVAILABLE and user_id and user_id != "local" and len(user_id) > 10:
        try:
            update_transaction_in_firebase(user_id, tx_id, updates)
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
        "created_at": datetime.now().isoformat()
    }
    
    clients.append(new_client)
    save_clients(user_id, clients)
    
    return new_client

def search_clients(user_id: str, query: str) -> List[Dict]:
    """Search clients by name."""
    clients = load_clients(user_id)
    query_lower = query.lower()
    return [c for c in clients if query_lower in c["name"].lower()]
