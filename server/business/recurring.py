
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
    category: str = "fixo"
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
        "last_generated": None 
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
    # We rely on special tag or description pattern
    existing_recurring = []
    for tx in all_tx:
        if tx.get("date", "").startswith(target_month) and "[Fixo]" in tx.get("description", ""):
            existing_recurring.append(tx.get("description"))

    generated = []
    
    for item in items:
        # Check if already generated for this month
        expected_desc = f"[Fixo] {item['title']}"
        if expected_desc in existing_recurring:
            continue

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
            
            # Create transaction
            tx = add_transaction(
                user_id=user_id,
                type=item["type"],
                value=item["value"],
                description=expected_desc,
                category=item["category"],
                date=date_str
            )
            
            # Update item last_generated (optional tracking)
            item["last_generated"] = date_str
            generated.append(tx)
            
        except Exception as e:
            print(f"[RECURRING] Error processing item {item['title']}: {e}")
            
    # Save items if we updated metadata (like last_generated)
    if generated:
        save_recurring(user_id, items)
            
    return generated
