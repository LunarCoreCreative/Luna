"""
Luna Business Overdue Bills Module
-----------------------------------
Handles overdue and pending bills management.
"""

import json
import uuid
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime, date

from .storage import get_user_data_dir, add_transaction

def get_overdue_file(user_id: str) -> Path:
    return get_user_data_dir(user_id) / "overdue.json"

def load_overdue(user_id: str) -> List[Dict]:
    """Load all overdue/pending bills."""
    file_path = get_overdue_file(user_id)
    if not file_path.exists():
        return []
    try:
        bills = json.loads(file_path.read_text(encoding="utf-8"))
        # Calculate days overdue for each bill
        today = date.today()
        for bill in bills:
            if bill.get("status") == "pending":
                due_date_str = bill.get("due_date", "")
                if due_date_str:
                    try:
                        # Parse YYYY-MM-DD format
                        due_date = datetime.strptime(due_date_str[:10], "%Y-%m-%d").date()
                        days_overdue = (today - due_date).days
                        bill["days_overdue"] = max(0, days_overdue)
                    except:
                        bill["days_overdue"] = 0
        return bills
    except:
        return []

def save_overdue(user_id: str, bills: List[Dict]) -> None:
    """Save overdue bills to file."""
    file_path = get_overdue_file(user_id)
    file_path.write_text(json.dumps(bills, ensure_ascii=False, indent=2), encoding="utf-8")

def add_overdue_bill(
    user_id: str,
    description: str,
    value: float,
    due_date: str,  # YYYY-MM-DD
    category: str = "geral",
    notes: Optional[str] = None
) -> Dict:
    """Add a new overdue/pending bill."""
    bills = load_overdue(user_id)
    
    new_bill = {
        "id": str(uuid.uuid4())[:8],
        "description": description,
        "value": abs(value),
        "due_date": due_date,
        "category": category,
        "status": "pending",  # pending, paid, cancelled
        "notes": notes or "",
        "created_at": datetime.now().isoformat(),
        "paid_at": None,
        "days_overdue": 0
    }
    
    # Calculate days overdue
    today = date.today()
    try:
        due_date_obj = datetime.strptime(due_date[:10], "%Y-%m-%d").date()
        new_bill["days_overdue"] = max(0, (today - due_date_obj).days)
    except:
        new_bill["days_overdue"] = 0
    
    bills.append(new_bill)
    save_overdue(user_id, bills)
    return new_bill

def update_overdue_bill(user_id: str, bill_id: str, updates: Dict) -> Optional[Dict]:
    """Update an overdue bill."""
    bills = load_overdue(user_id)
    
    bill_index = next((i for i, b in enumerate(bills) if b["id"] == bill_id), -1)
    if bill_index == -1:
        return None
    
    bill = bills[bill_index]
    bill.update(updates)
    bill["updated_at"] = datetime.now().isoformat()
    
    # Recalculate days overdue if due_date changed
    if "due_date" in updates:
        today = date.today()
        try:
            due_date_obj = datetime.strptime(bill["due_date"][:10], "%Y-%m-%d").date()
            bill["days_overdue"] = max(0, (today - due_date_obj).days)
        except:
            bill["days_overdue"] = 0
    
    # If status changed to paid, set paid_at
    if updates.get("status") == "paid" and not bill.get("paid_at"):
        bill["paid_at"] = datetime.now().isoformat()
    
    save_overdue(user_id, bills)
    return bill

def delete_overdue_bill(user_id: str, bill_id: str) -> bool:
    """Delete an overdue bill."""
    bills = load_overdue(user_id)
    original_len = len(bills)
    bills = [b for b in bills if b["id"] != bill_id]
    
    if len(bills) < original_len:
        save_overdue(user_id, bills)
        return True
    return False

def mark_bill_as_paid(user_id: str, bill_id: str, payment_date: Optional[str] = None) -> Optional[Dict]:
    """Mark a bill as paid and optionally create a transaction."""
    bill = update_overdue_bill(user_id, bill_id, {
        "status": "paid",
        "paid_at": payment_date or datetime.now().isoformat()
    })
    
    if bill:
        # Optionally create a transaction for the payment
        # This can be done via the API if needed
        pass
    
    return bill

def pay_bill_and_create_transaction(user_id: str, bill_id: str, payment_date: Optional[str] = None) -> Optional[Dict]:
    """Mark bill as paid and create corresponding expense transaction."""
    bills = load_overdue(user_id)
    bill = next((b for b in bills if b["id"] == bill_id), None)
    
    if not bill or bill.get("status") == "paid":
        return None
    
    # Mark as paid
    updated_bill = mark_bill_as_paid(user_id, bill_id, payment_date)
    
    if updated_bill:
        # Create expense transaction
        payment_date_str = payment_date or datetime.now().isoformat().split('T')[0]
        transaction = add_transaction(
            user_id=user_id,
            type="expense",
            value=bill["value"],
            description=f"[Conta Paga] {bill['description']}",
            category=bill.get("category", "geral"),
            date=payment_date_str
        )
        updated_bill["transaction_id"] = transaction["id"]
        save_overdue(user_id, bills)
    
    return updated_bill

def get_overdue_summary(user_id: str) -> Dict:
    """Get summary of overdue bills."""
    bills = load_overdue(user_id)
    
    pending = [b for b in bills if b.get("status") == "pending"]
    total_pending = sum(b["value"] for b in pending)
    overdue = [b for b in pending if b.get("days_overdue", 0) > 0]
    total_overdue = sum(b["value"] for b in overdue)
    
    return {
        "total_bills": len(bills),
        "pending_count": len(pending),
        "pending_total": total_pending,
        "overdue_count": len(overdue),
        "overdue_total": total_overdue,
        "paid_count": len([b for b in bills if b.get("status") == "paid"])
    }
