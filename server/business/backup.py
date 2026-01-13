"""
Luna Business Backup Module
---------------------------
Sistema de backup e restauração de dados do modo business.
"""

import json
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
import uuid

from .storage import (
    load_transactions,
    load_clients,
    get_user_data_dir
)
from .recurring import load_recurring
from .overdue import load_overdue
from .tags import load_tags


def export_all_data(user_id: str) -> Dict[str, Any]:
    """
    Exporta todos os dados do usuário em formato JSON.
    
    Args:
        user_id: ID do usuário
    
    Returns:
        Dicionário com todos os dados exportados
    """
    print(f"[BUSINESS-BACKUP] Exportando dados para user_id={user_id}")
    
    # Carrega todos os dados
    transactions = load_transactions(user_id)
    clients = load_clients(user_id)
    recurring_items = load_recurring(user_id)
    overdue_bills = load_overdue(user_id)
    tags = load_tags(user_id)
    
    # Cria estrutura de backup
    backup_data = {
        "version": "1.0",
        "export_date": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        "user_id": user_id,
        "data": {
            "transactions": transactions,
            "clients": clients,
            "recurring_items": recurring_items,
            "overdue_bills": overdue_bills,
            "tags": tags
        },
        "metadata": {
            "transactions_count": len(transactions),
            "clients_count": len(clients),
            "recurring_items_count": len(recurring_items),
            "overdue_bills_count": len(overdue_bills),
            "tags_count": len(tags)
        }
    }
    
    print(f"[BUSINESS-BACKUP] ✅ Exportação concluída: {backup_data['metadata']}")
    return backup_data


def validate_backup_data(backup_data: Dict[str, Any]) -> tuple[bool, Optional[str]]:
    """
    Valida estrutura de dados de backup.
    
    Args:
        backup_data: Dados do backup a validar
    
    Returns:
        (is_valid: bool, error_message: Optional[str])
    """
    # Verifica estrutura básica
    if not isinstance(backup_data, dict):
        return False, "Backup deve ser um objeto JSON"
    
    if "version" not in backup_data:
        return False, "Campo 'version' é obrigatório"
    
    if "data" not in backup_data:
        return False, "Campo 'data' é obrigatório"
    
    data = backup_data["data"]
    
    # Verifica campos obrigatórios
    required_fields = ["transactions", "clients", "recurring_items", "overdue_bills", "tags"]
    for field in required_fields:
        if field not in data:
            return False, f"Campo '{field}' é obrigatório no backup"
        
        if not isinstance(data[field], list):
            return False, f"Campo '{field}' deve ser uma lista"
    
    # Valida estrutura de transações
    for tx in data["transactions"]:
        if not isinstance(tx, dict):
            return False, "Transações devem ser objetos"
        
        required_tx_fields = ["id", "type", "value", "description", "date"]
        for field in required_tx_fields:
            if field not in tx:
                return False, f"Transação deve ter campo '{field}'"
    
    # Valida estrutura de clientes
    for client in data["clients"]:
        if not isinstance(client, dict):
            return False, "Clientes devem ser objetos"
        
        if "id" not in client or "name" not in client:
            return False, "Cliente deve ter campos 'id' e 'name'"
    
    print("[BUSINESS-BACKUP] ✅ Validação de backup concluída")
    return True, None


def import_backup_data(user_id: str, backup_data: Dict[str, Any], merge: bool = False) -> Dict[str, Any]:
    """
    Importa dados de backup.
    
    Args:
        user_id: ID do usuário para importar
        backup_data: Dados do backup
        merge: Se True, mescla com dados existentes. Se False, substitui.
    
    Returns:
        Dicionário com resultado da importação
    """
    print(f"[BUSINESS-BACKUP] Importando backup para user_id={user_id}, merge={merge}")
    
    # Valida dados
    is_valid, error = validate_backup_data(backup_data)
    if not is_valid:
        raise ValueError(f"Dados de backup inválidos: {error}")
    
    data = backup_data["data"]
    user_dir = get_user_data_dir(user_id)
    
    # Carrega dados existentes se merge
    existing_transactions = []
    existing_clients = []
    existing_recurring = []
    existing_overdue = []
    existing_tags = []
    
    if merge:
        existing_transactions = load_transactions(user_id)
        existing_clients = load_clients(user_id)
        existing_recurring = load_recurring(user_id)
        existing_overdue = load_overdue(user_id)
        existing_tags = load_tags(user_id)
    
    # Prepara dados para importação
    imported_transactions = data["transactions"]
    imported_clients = data["clients"]
    imported_recurring = data["recurring_items"]
    imported_overdue = data["overdue_bills"]
    imported_tags = data["tags"]
    
    # Se merge, combina dados (evita duplicatas por ID)
    if merge:
        # Combina transações (evita duplicatas)
        existing_ids = {tx["id"] for tx in existing_transactions}
        for tx in imported_transactions:
            if tx["id"] not in existing_ids:
                existing_transactions.append(tx)
        imported_transactions = existing_transactions
        
        # Combina clientes
        existing_client_ids = {c["id"] for c in existing_clients}
        for client in imported_clients:
            if client["id"] not in existing_client_ids:
                existing_clients.append(client)
        imported_clients = existing_clients
        
        # Combina itens recorrentes
        existing_recurring_ids = {r["id"] for r in existing_recurring}
        for item in imported_recurring:
            if item["id"] not in existing_recurring_ids:
                existing_recurring.append(item)
        imported_recurring = existing_recurring
        
        # Combina contas em atraso
        existing_overdue_ids = {b["id"] for b in existing_overdue}
        for bill in imported_overdue:
            if bill["id"] not in existing_overdue_ids:
                existing_overdue.append(bill)
        imported_overdue = existing_overdue
        
        # Combina tags
        existing_tag_ids = {t["id"] for t in existing_tags}
        for tag in imported_tags:
            if tag["id"] not in existing_tag_ids:
                existing_tags.append(tag)
        imported_tags = existing_tags
    
    # Salva dados importados
    # Transações
    transactions_file = user_dir / "transactions.json"
    with open(transactions_file, "w", encoding="utf-8") as f:
        json.dump(imported_transactions, f, ensure_ascii=False, indent=2)
    
    # Clientes
    clients_file = user_dir / "clients.json"
    with open(clients_file, "w", encoding="utf-8") as f:
        json.dump(imported_clients, f, ensure_ascii=False, indent=2)
    
    # Itens recorrentes
    recurring_file = user_dir / "recurring.json"
    with open(recurring_file, "w", encoding="utf-8") as f:
        json.dump(imported_recurring, f, ensure_ascii=False, indent=2)
    
    # Contas em atraso
    overdue_file = user_dir / "overdue.json"
    with open(overdue_file, "w", encoding="utf-8") as f:
        json.dump(imported_overdue, f, ensure_ascii=False, indent=2)
    
    # Tags
    tags_file = user_dir / "tags.json"
    with open(tags_file, "w", encoding="utf-8") as f:
        json.dump(imported_tags, f, ensure_ascii=False, indent=2)
    
    # Sincroniza com Firebase se disponível
    if FIREBASE_AVAILABLE:
        try:
            from .sync import sync_transaction_to_firebase
            # Sincroniza transações importadas
            for tx in imported_transactions:
                try:
                    sync_transaction_to_firebase(user_id, tx, retry=False)
                except Exception as e:
                    print(f"[BUSINESS-BACKUP] ⚠️ Erro ao sincronizar transação {tx['id']}: {e}")
        except Exception as e:
            print(f"[BUSINESS-BACKUP] ⚠️ Erro ao sincronizar com Firebase: {e}")
    
    result = {
        "success": True,
        "imported": {
            "transactions": len(imported_transactions),
            "clients": len(imported_clients),
            "recurring_items": len(imported_recurring),
            "overdue_bills": len(imported_overdue),
            "tags": len(imported_tags)
        },
        "merge": merge
    }
    
    print(f"[BUSINESS-BACKUP] ✅ Importação concluída: {result['imported']}")
    return result


# Importa FIREBASE_AVAILABLE do storage
try:
    from .storage import FIREBASE_AVAILABLE
except ImportError:
    FIREBASE_AVAILABLE = False

# Verifica se Firebase está disponível no contexto de importação
if 'FIREBASE_AVAILABLE' not in globals():
    try:
        from ..firebase_config import save_transaction_to_firebase
        FIREBASE_AVAILABLE = True
    except ImportError:
        FIREBASE_AVAILABLE = False
