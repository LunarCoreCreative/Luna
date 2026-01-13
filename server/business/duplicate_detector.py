"""
Luna Business Duplicate Detector
---------------------------------
Sistema de detecção e remoção de transações duplicadas.
"""

from typing import List, Dict, Tuple, Optional
from datetime import datetime

# Firebase imports
try:
    from ..firebase_config import get_user_transactions
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False

# Local storage imports
from .storage import _load_local_transactions
from .date_utils import get_date_only, compare_dates


def _get_transaction_key(tx: Dict, include_id: bool = False) -> Tuple:
    """
    Gera uma chave única para uma transação baseada em seus dados.
    
    Args:
        tx: Dicionário da transação
        include_id: Se True, inclui ID na chave (para comparação exata)
    
    Returns:
        Tupla com (date_only, value, description_lower, type)
    """
    date_str = tx.get("date", "")
    date_only = get_date_only(date_str)
    
    value = float(tx.get("value", 0))
    description = str(tx.get("description", "")).strip().lower()
    tx_type = str(tx.get("type", "")).lower()
    
    key = (date_only, value, description, tx_type)
    
    if include_id:
        tx_id = tx.get("id", "")
        return key + (tx_id,)
    
    return key


def find_duplicate_in_list(transactions: List[Dict], target_tx: Dict, exclude_id: Optional[str] = None) -> Optional[Dict]:
    """
    Encontra uma transação duplicada em uma lista.
    
    Args:
        transactions: Lista de transações para verificar
        target_tx: Transação a verificar
        exclude_id: ID de transação a excluir da verificação (útil para updates)
    
    Returns:
        Transação duplicada encontrada ou None
    """
    target_key = _get_transaction_key(target_tx, include_id=False)
    
    for tx in transactions:
        # Exclui a própria transação se for update
        if exclude_id and tx.get("id") == exclude_id:
            continue
        
        tx_key = _get_transaction_key(tx, include_id=False)
        
        # Compara chaves (date, value, description, type)
        if tx_key == target_key:
            return tx
    
    return None


def check_duplicate(user_id: str, tx: Dict, exclude_id: Optional[str] = None, check_firebase: bool = True) -> Tuple[bool, Optional[Dict], Optional[str]]:
    """
    Verifica se uma transação é duplicada (local e Firebase).
    
    Args:
        user_id: ID do usuário
        tx: Transação a verificar
        exclude_id: ID a excluir (útil para updates)
        check_firebase: Se True, também verifica no Firebase
    
    Returns:
        (is_duplicate: bool, duplicate_tx: Optional[Dict], source: Optional[str])
        source pode ser "local" ou "firebase"
    """
    # 1. Verifica no cache local
    local_txs = _load_local_transactions(user_id)
    duplicate = find_duplicate_in_list(local_txs, tx, exclude_id=exclude_id)
    
    if duplicate:
        return True, duplicate, "local"
    
    # 2. Verifica no Firebase se solicitado
    if check_firebase and FIREBASE_AVAILABLE and user_id and user_id != "local" and len(user_id) > 10:
        try:
            # Limite reduzido para evitar quota exceeded
            firebase_txs = get_user_transactions(user_id, limit=500)
            duplicate = find_duplicate_in_list(firebase_txs, tx, exclude_id=exclude_id)
            
            if duplicate:
                return True, duplicate, "firebase"
        except Exception as e:
            print(f"[BUSINESS-DUP] ⚠️ Erro ao verificar Firebase: {e}")
            # Continua sem erro, apenas não verifica Firebase
    
    return False, None, None


def find_all_duplicates(user_id: str, check_firebase: bool = True) -> List[Dict]:
    """
    Encontra todas as transações duplicadas.
    
    Args:
        user_id: ID do usuário
        check_firebase: Se True, também verifica no Firebase
    
    Returns:
        Lista de grupos de duplicatas. Cada grupo contém:
        {
            "key": (date, value, description, type),
            "count": número de duplicatas,
            "transactions": [lista de transações duplicadas]
        }
    """
    # Carrega todas as transações
    all_txs = _load_local_transactions(user_id)
    
    if check_firebase and FIREBASE_AVAILABLE and user_id and user_id != "local" and len(user_id) > 10:
        try:
            # Limite reduzido para evitar quota exceeded
            firebase_txs = get_user_transactions(user_id, limit=500)
            # Mescla, mantendo apenas uma cópia de cada ID
            firebase_by_id = {tx.get("id"): tx for tx in firebase_txs}
            local_by_id = {tx.get("id"): tx for tx in all_txs}
            
            # Adiciona transações do Firebase que não estão no local
            for tx_id, tx in firebase_by_id.items():
                if tx_id not in local_by_id:
                    all_txs.append(tx)
        except Exception as e:
            print(f"[BUSINESS-DUP] ⚠️ Erro ao carregar Firebase: {e}")
    
    # Agrupa por chave
    groups = {}
    for tx in all_txs:
        key = _get_transaction_key(tx, include_id=False)
        
        if key not in groups:
            groups[key] = []
        
        groups[key].append(tx)
    
    # Filtra apenas grupos com duplicatas (2+ transações)
    duplicates = []
    for key, txs in groups.items():
        if len(txs) > 1:
            # Ordena por created_at (mais antiga primeiro)
            txs.sort(key=lambda x: x.get("created_at", ""))
            
            duplicates.append({
                "key": {
                    "date": key[0],
                    "value": key[1],
                    "description": key[2],
                    "type": key[3]
                },
                "count": len(txs),
                "transactions": txs
            })
    
    # Ordena por número de duplicatas (mais duplicatas primeiro)
    duplicates.sort(key=lambda x: x["count"], reverse=True)
    
    return duplicates


def remove_duplicates(user_id: str, keep_oldest: bool = True, dry_run: bool = False) -> Dict:
    """
    Remove transações duplicadas, mantendo apenas uma cópia.
    
    Args:
        user_id: ID do usuário
        keep_oldest: Se True, mantém a transação mais antiga. Se False, mantém a mais recente.
        dry_run: Se True, apenas simula sem remover
    
    Returns:
        Dict com estatísticas da remoção:
        {
            "removed_count": número de transações removidas,
            "groups_processed": número de grupos de duplicatas processados,
            "removed_ids": lista de IDs removidos
        }
    """
    duplicates = find_all_duplicates(user_id, check_firebase=True)
    
    removed_count = 0
    removed_ids = []
    groups_processed = len(duplicates)
    
    if dry_run:
        print(f"[BUSINESS-DUP] 🔍 DRY RUN: Encontrados {groups_processed} grupos de duplicatas")
        for group in duplicates:
            print(f"  - {group['count']} duplicatas: {group['key']['description']} (R$ {group['key']['value']:.2f})")
        return {
            "removed_count": 0,
            "groups_processed": groups_processed,
            "removed_ids": [],
            "dry_run": True
        }
    
    # Carrega transações locais
    local_txs = _load_local_transactions(user_id)
    local_by_id = {tx.get("id"): tx for tx in local_txs}
    
    # Para cada grupo de duplicatas
    for group in duplicates:
        txs = group["transactions"]
        
        if len(txs) <= 1:
            continue
        
        # Ordena por created_at
        txs.sort(key=lambda x: x.get("created_at", ""))
        
        # Mantém a primeira (mais antiga) ou última (mais recente)
        if keep_oldest:
            keep_tx = txs[0]
            remove_txs = txs[1:]
        else:
            keep_tx = txs[-1]
            remove_txs = txs[:-1]
        
        # Remove duplicatas do cache local
        for tx in remove_txs:
            tx_id = tx.get("id")
            if tx_id and tx_id in local_by_id:
                local_txs = [t for t in local_txs if t.get("id") != tx_id]
                removed_ids.append(tx_id)
                removed_count += 1
                
                # Remove do Firebase também
                if FIREBASE_AVAILABLE and user_id and user_id != "local" and len(user_id) > 10:
                    try:
                        from ..firebase_config import delete_transaction_from_firebase
                        delete_transaction_from_firebase(user_id, tx_id)
                    except Exception as e:
                        print(f"[BUSINESS-DUP] ⚠️ Erro ao remover do Firebase: {e}")
    
    # Salva cache local atualizado
    if removed_count > 0:
        from .storage import _save_local_transactions
        _save_local_transactions(user_id, local_txs)
        print(f"[BUSINESS-DUP] ✅ Removidas {removed_count} transações duplicadas")
    
    return {
        "removed_count": removed_count,
        "groups_processed": groups_processed,
        "removed_ids": removed_ids,
        "dry_run": False
    }
