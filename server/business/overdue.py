from datetime import datetime
from typing import Dict, List, Optional
from . import storage
from .models import OverdueBill, Transaction

def pay_bill_and_create_transaction(bill_id: str, credit_card_id: Optional[str] = None) -> Optional[Transaction]:
    """
    Marks a bill as paid and creates a corresponding expense transaction.
    """
    bills = storage.get_bills()
    bill_to_pay = None
    bill_idx = -1
    
    for idx, b in enumerate(bills):
        if b.get('id') == bill_id:
            bill_to_pay = b
            bill_idx = idx
            break
            
    if not bill_to_pay or bill_to_pay.get('status') == 'paid':
        return None
        
    # 1. Update bill status
    bill_to_pay['status'] = 'paid'
    bill_to_pay['paid_at'] = datetime.now().isoformat()
    storage._save_json('bills', bills)
    
    # 2. Create transaction
    tx_data = {
        "description": f"Pagamento: {bill_to_pay['description']}",
        "value": bill_to_pay['value'],
        "type": "expense",
        "category": bill_to_pay.get('category', 'contas'),
        "date": datetime.now().strftime("%Y-%m-%d"),
        "credit_card_id": credit_card_id,
        "metadata": {
            "bill_id": bill_id
        }
    }
    
    return storage.add_transaction(tx_data)

def get_overdue_summary() -> Dict:
    """
    Calculates summary of pending and overdue bills.
    """
    bills = storage.get_bills()
    today = datetime.now()
    
    pending_bills = [b for b in bills if b.get('status') == 'pending']
    
    total_pending_value = 0.0
    overdue_count = 0
    overdue_value = 0.0
    
    for b in pending_bills:
        val = b.get('value', 0.0)
        total_pending_value += val
        
        try:
            due_date = datetime.strptime(b['due_date'], "%Y-%m-%d")
            if due_date < today and due_date.date() != today.date():
                overdue_count += 1
                overdue_value += val
        except:
            continue
            
    return {
        "pending_count": len(pending_bills),
        "total_pending_value": total_pending_value,
        "overdue_count": overdue_count,
        "overdue_value": overdue_value
    }

def delete_paid_bills() -> int:
    """
    Cleans up old paid bills.
    """
    bills = storage.get_bills()
    pending = [b for b in bills if b.get('status') == 'pending']
    deleted_count = len(bills) - len(pending)
    storage._save_json('bills', pending)
    return deleted_count
