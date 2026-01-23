import json
import os
from typing import List, Dict, Optional
from datetime import datetime
from .models import RecurringItem, Transaction
from . import storage

def load_recurring() -> List[Dict]:
    return storage.get_recurring()

def save_recurring(items: List[Dict]):
    storage._save_json('recurring', items)

def process_recurring_items(target_month: Optional[str] = None) -> List[Transaction]:
    """
    Generate transactions from recurring items for the target month.
    target_month: "YYYY-MM"
    """
    if not target_month:
        target_month = datetime.now().strftime("%Y-%m")
        
    items = load_recurring()
    all_tx = storage.get_transactions()
    
    # Map for duplicate detection: recurring_id -> month
    # This ensures we don't generate more than one transaction per recurring item per month
    existing_hashes = set()
    for tx in all_tx:
        if tx.get('recurring_id') and tx.get('date'):
            month = tx['date'][:7] # YYYY-MM
            existing_hashes.add(f"{tx['recurring_id']}:{month}")

    generated = []
    updated_items = []
    
    current_day = datetime.now().day
    current_month_str = datetime.now().strftime("%Y-%m")

    for item in items:
        if not item.get('active', True):
            continue
            
        item_id = item.get('id')
        due_day = item.get('due_day', 1)
        
        # Logic: If target is current month, only process if day >= item day
        if target_month == current_month_str:
            if current_day < due_day:
                continue # Not due yet
        
        # Check if already generated for this month
        if f"{item_id}:{target_month}" in existing_hashes:
            continue
            
        # Create date string
        # Ensure day doesn't exceed 28 for safety across all months or use proper month bounds
        safe_day = min(due_day, 28)
        date_str = f"{target_month}-{safe_day:02d}"
        
        # Create transaction
        tx_data = {
            "description": f"[Recorrente] {item['description']}",
            "value": item['value'],
            "type": item['type'],
            "category": item.get('category', 'fixo'),
            "date": date_str,
            "recurring_id": item_id,
            "credit_card_id": item.get('credit_card_id')
        }
        
        try:
            tx = storage.add_transaction(tx_data)
            generated.append(tx)
            
            # Update item status
            item['last_generated'] = target_month
        except Exception as e:
            print(f"Error generating transaction for {item['description']}: {e}")
            
    if generated:
        save_recurring(items)
        
    return generated

def toggle_recurring_item(item_id: str, active: bool) -> bool:
    items = load_recurring()
    for item in items:
        if item['id'] == item_id:
            item['active'] = active
            save_recurring(items)
            return True
    return False

def delete_recurring_item(item_id: str) -> bool:
    items = load_recurring()
    original_len = len(items)
    items = [i for i in items if i['id'] != item_id]
    if len(items) < original_len:
        save_recurring(items)
        return True
    return False
