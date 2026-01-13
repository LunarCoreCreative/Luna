
"""
Luna Business Recurring Module
------------------------------
Handles recurring transaction templates (Fixed Income/Expenses).
"""

import json
import uuid
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime

from .storage import get_user_data_dir, add_transaction

def get_recurring_file(user_id: str) -> Path:
    return get_user_data_dir(user_id) / "recurring.json"

def load_recurring(user_id: str) -> List[Dict]:
    """Load recurring rules."""
    file_path = get_recurring_file(user_id)
    if not file_path.exists():
        return []
    try:
        return json.loads(file_path.read_text(encoding="utf-8"))
    except:
        return []

def save_recurring(user_id: str, items: List[Dict]) -> None:
    """Save recurring rules."""
    file_path = get_recurring_file(user_id)
    file_path.write_text(json.dumps(items, ensure_ascii=False, indent=2), encoding="utf-8")

def add_recurring_item(
    user_id: str,
    title: str,
    value: float,
    type: str, # "income", "expense"
    day_of_month: int,
    category: str = "fixo",
    credit_card_id: Optional[str] = None
) -> Dict:
    """Add a new recurring rule."""
    items = load_recurring(user_id)
    
    new_item = {
        "id": str(uuid.uuid4())[:8],
        "title": title,
        "value": abs(value),
        "type": type,
        "day_of_month": day_of_month,
        "category": category,
        "created_at": datetime.now().isoformat(),
        "last_generated": None,
        "credit_card_id": credit_card_id if credit_card_id else None
    }
    
    items.append(new_item)
    save_recurring(user_id, items)
    return new_item

def delete_recurring_item(user_id: str, item_id: str) -> bool:
    items = load_recurring(user_id)
    original_len = len(items)
    items = [i for i in items if i["id"] != item_id]
    if len(items) < original_len:
        save_recurring(user_id, items)
        return True
    return False

def process_recurring_items(user_id: str, target_month: str = None) -> List[Dict]:
    """
    Generate transactions from recurring items for the current (or target) month.
    Checks if transaction was already generated to avoid duplicates.
    target_month: "YYYY-MM"
    """
    if not target_month:
        target_month = datetime.now().strftime("%Y-%m")
        
    items = load_recurring(user_id)
    # Load ALL existing transactions for checking logic (could be optimized, but MVP)
    # We only need transactions for the target month
    from .storage import load_transactions
    all_tx = load_transactions(user_id)
    
    # Filter transactions from this month to check duplicates
    # Usa detector de duplicatas mais robusto
    from .duplicate_detector import _get_transaction_key
    existing_keys = set()
    recurring_hashes = set()  # Hash único baseado em (recurring_id, period, day)
    
    for tx in all_tx:
        tx_date = tx.get("date", "")
        if tx_date.startswith(target_month):
            # Cria chave para verificação de duplicatas
            key = _get_transaction_key(tx, include_id=False)
            existing_keys.add(key)
            
            # Extrai hash de transação recorrente se presente
            # Verifica se tem recurring_id no metadata
            tx_recurring_id = tx.get("recurring_id")
            if tx_recurring_id:
                # Cria hash baseado em (recurring_id, period, day)
                period = tx_date[:7]  # YYYY-MM
                day = tx_date[8:10] if len(tx_date) >= 10 else "01"
                recurring_hash = f"{tx_recurring_id}:{period}:{day}"
                recurring_hashes.add(recurring_hash)
            
            # Extrai hash de transação recorrente se presente
            # Formato esperado: [Fixo] {title} ou metadata com recurring_id
            description = tx.get("description", "")
            if "[Fixo]" in description:
                # Tenta extrair recurring_id do metadata ou criar hash da descrição
                recurring_id = tx.get("recurring_id")
                if recurring_id:
                    # Cria hash baseado em (recurring_id, period, day)
                    period = tx_date[:7]  # YYYY-MM
                    day = tx_date[8:10] if len(tx_date) >= 10 else "01"
                    recurring_hash = f"{recurring_id}:{period}:{day}"
                    recurring_hashes.add(recurring_hash)

    generated = []
    
    for item in items:
        item_id = item.get("id")
        recurring_id = item_id  # ID do item recorrente
        expected_desc = f"[Fixo] {item['title']}"  # Descrição esperada da transação

        # Check if it is DUE (day has passed or is today)
        try:
            current_day = datetime.now().day
            current_month_str = datetime.now().strftime("%Y-%m")
            
            # Only generate if target month is current month AND day <= today
            # OR if target month is PAST month.
            # If target month is future, maybe wait? User might want to project.
            # Let's assume process called implies "process due items".
            
            safe_day = min(item["day_of_month"], 28)
            
            # Logic: If target is current month, only process if day >= item day
            if target_month == current_month_str:
                if current_day < safe_day:
                    continue # Not due yet
            
            # Construct date
            date_str = f"{target_month}-{safe_day:02d}"
            
            # Verifica duplicatas usando hash único baseado em (recurring_id, period, day)
            recurring_hash = f"{recurring_id}:{target_month}:{safe_day:02d}"
            
            if recurring_hash in recurring_hashes:
                print(f"[BUSINESS-RECURRING] ⚠️ Transação recorrente já existe (hash: {recurring_hash}): {item['title']}")
                continue
            
            # Verifica também usando detector de duplicatas (backup)
            from .duplicate_detector import _get_transaction_key
            test_tx = {
                "date": date_str,
                "value": item["value"],
                "description": expected_desc,
                "type": item["type"]
            }
            test_key = _get_transaction_key(test_tx, include_id=False)
            
            if test_key in existing_keys:
                print(f"[BUSINESS-RECURRING] ⚠️ Transação duplicada detectada (chave: {test_key}): {item['title']}")
                continue
            
            # Create transaction
            try:
                tx = add_transaction(
                    user_id=user_id,
                    type=item["type"],
                    value=item["value"],
                    description=expected_desc,
                    category=item.get("category", "fixo"),
                    date=date_str,
                    recurring_id=recurring_id,  # Adiciona ID do item recorrente para rastreamento
                    credit_card_id=item.get("credit_card_id")  # Adiciona ID do cartão de crédito se presente
                )
                
                # Adiciona metadata de recurring_id à transação (para rastreamento futuro)
                # Nota: add_transaction não retorna objeto completo, então salvamos hash separadamente
                # O hash já foi verificado acima, então não precisamos adicionar aqui
                
                # Adiciona chave à lista de existentes para evitar duplicatas no mesmo batch
                existing_keys.add(test_key)
                recurring_hashes.add(recurring_hash)
                
                generated.append(tx)
                print(f"[BUSINESS-RECURRING] ✅ Transação gerada: {item['title']} - R$ {item['value']:.2f} ({date_str})")
                
            except ValueError as e:
                # Pode ser duplicata detectada pelo add_transaction
                if "duplicada" in str(e).lower():
                    print(f"[BUSINESS-RECURRING] ⚠️ Duplicata detectada pelo add_transaction, pulando: {item['title']}")
                    # Adiciona ao hash para evitar tentativas futuras
                    recurring_hashes.add(recurring_hash)
                    continue
                raise
            except Exception as e:
                print(f"[BUSINESS-RECURRING] ❌ Erro ao criar transação para {item['title']}: {e}")
                continue
            
            # Update item last_generated (optional tracking)
            item["last_generated"] = date_str
            generated.append(tx)
            
        except Exception as e:
            print(f"[RECURRING] Error processing item {item['title']}: {e}")
            
    # Save items if we updated metadata (like last_generated)
    if generated:
        save_recurring(user_id, items)
            
    return generated
