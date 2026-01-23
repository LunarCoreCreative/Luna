import json
import os
from typing import List, Dict, Optional
from datetime import datetime
from .models import Transaction, RecurringItem, OverdueBill, Budget, Goal, CreditCard, Notification, PiggyBank, PiggyBankTransaction

# =============================================================================
# MULTI-TENANT USER CONTEXT
# =============================================================================

# Base data directory
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BASE_DATA_DIR = os.path.join(BASE_DIR, 'data', 'business')
if not os.path.exists(BASE_DATA_DIR):
    os.makedirs(BASE_DATA_DIR, exist_ok=True)

# Current user context (thread-local would be better for production)
_current_user_id: Optional[str] = None

def set_user_context(uid: str):
    """Set the current user context for all storage operations."""
    global _current_user_id
    _current_user_id = uid
    # Ensure user directory exists
    user_dir = get_user_data_dir()
    if not os.path.exists(user_dir):
        os.makedirs(user_dir, exist_ok=True)
    print(f"[Storage] User context set to: {uid}")

def get_current_user_id() -> str:
    """Get current user ID, defaulting to 'local' for non-authenticated users."""
    return _current_user_id or 'local'

def get_user_data_dir() -> str:
    """Get the data directory for the current user."""
    return os.path.join(BASE_DATA_DIR, get_current_user_id())

def _get_files() -> Dict[str, str]:
    """Get file paths for the current user context."""
    user_dir = get_user_data_dir()
    if not os.path.exists(user_dir):
        os.makedirs(user_dir, exist_ok=True)
    
    return {
        'transactions': os.path.join(user_dir, 'transactions.json'),
        'recurring': os.path.join(user_dir, 'recurring.json'),
        'bills': os.path.join(user_dir, 'bills.json'),
        'budget': os.path.join(user_dir, 'budget.json'),
        'goals': os.path.join(user_dir, 'goals.json'),
        'cards': os.path.join(user_dir, 'credit_cards.json'),
        'notifications': os.path.join(user_dir, 'notifications.json'),
        'tags': os.path.join(user_dir, 'tags.json'),
        'piggy_banks': os.path.join(user_dir, 'piggy_banks.json'),
        'piggy_bank_transactions': os.path.join(user_dir, 'piggy_bank_transactions.json')
    }

# Legacy compatibility
def get_data_dir() -> str:
    """Get the current user's data directory. Used by other modules."""
    return get_user_data_dir()

# Legacy compatibility - keeping it as a functional equivalent
DATA_DIR = property(lambda self: get_user_data_dir()) # This won't work for top-level imports


def _load_json(file_key: str) -> List[Dict]:
    files = _get_files()
    path = files.get(file_key)
    if not path or not os.path.exists(path):
        return []
    try:
        with open(path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
            # Normalization logic for Recurring Items
            if file_key == 'recurring' and isinstance(data, list):
                for item in data:
                    # title -> description
                    if 'title' in item and 'description' not in item:
                        item['description'] = item['title']
                    # day_of_month -> due_day
                    if 'day_of_month' in item and 'due_day' not in item:
                        item['due_day'] = item['day_of_month']
                    # Ensure type exists
                    if 'type' not in item:
                        item['type'] = 'expense'
            
            return data
    except Exception as e:
        print(f"Error loading {file_key}: {e}")
        return []

def _save_json(file_key: str, data: List[Dict]):
    files = _get_files()
    path = files.get(file_key)
    if not path:
        print(f"Unknown file key: {file_key}")
        return
    try:
        # Ensure directory exists
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"Error saving {file_key}: {e}")

# --- TRANSACTIONS ---

def add_transaction(data: Dict) -> Transaction:
    from . import tags
    from . import budget
    from . import goals
    
    transactions = _load_json('transactions')
    
    # Ensure category is set
    category = data.get('category', 'geral')
    tags.get_or_create_tag(category)
    
    # Assign ID if not present
    if 'id' not in data:
        import uuid
        data['id'] = str(uuid.uuid4())
    if 'created_at' not in data:
        data['created_at'] = datetime.now().isoformat()
        
    transactions.append(data)
    _save_json('transactions', transactions)
    
    # === SMART INTEGRATIONS ===
    tx_type = data.get('type', 'expense')
    value = float(data.get('value', 0))
    
    # 1. Check budget impact for expenses
    if tx_type == 'expense':
        try:
            budget.check_budget_impact(category, value, tx_type)
        except Exception as e:
            print(f"[Integration] Budget check error: {e}")
    
    # 2. Update goal progress for income linked to savings goals
    if tx_type == 'income':
        try:
            goals.update_goal_from_transaction(category, value, tx_type)
        except Exception as e:
            print(f"[Integration] Goal update error: {e}")
    
    return Transaction(**data)

def get_transactions(filters: Optional[Dict] = None) -> List[Dict]:
    transactions = _load_json('transactions')
    # Sort by date desc
    transactions.sort(key=lambda x: x.get('date', ''), reverse=True)
    
    if filters:
        if 'type' in filters and filters['type'] != 'all':
            transactions = [t for t in transactions if t['type'] == filters['type']]
        if 'limit' in filters:
            transactions = transactions[:int(filters['limit'])]
            
    return transactions

def delete_transaction(transaction_id: str) -> bool:
    transactions = _load_json('transactions')
    original_len = len(transactions)
    transactions = [t for t in transactions if t.get('id') != transaction_id]
    
    if len(transactions) < original_len:
        _save_json('transactions', transactions)
        return True
    return False

def update_transaction(transaction_id: str, updates: Dict) -> Optional[Transaction]:
    transactions = _load_json('transactions')
    updated = False
    updated_tx = None
    
    for tx in transactions:
        if tx.get('id') == transaction_id:
            from . import tags
            # Update fields, forbidding id change
            for k, v in updates.items():
                if k != 'id' and k != 'created_at':
                     tx[k] = v
                     if k == 'category':
                         tags.get_or_create_tag(v)
            updated = True
            updated_tx = tx
            break
            
    if updated:
        _save_json('transactions', transactions)
        return Transaction(**updated_tx)
    return None

def get_summary(period: Optional[str] = None) -> Dict:
    """
    Get financial summary. If period is specified (YYYY-MM), 
    returns data for that month only. Balance is always all-time.
    """
    transactions = _load_json('transactions')
    
    # All-time balance
    all_time_balance = 0.0
    for t in transactions:
        val = t.get('value', 0)
        if t['type'] == 'income':
            all_time_balance += val
        elif t['type'] == 'expense':
            all_time_balance -= val
        elif t['type'] == 'investment':
            all_time_balance -= val
    
    # Period-specific income/expenses
    if period:
        period_txs = [t for t in transactions if t.get('date', '').startswith(period)]
    else:
        # Default to current month
        from datetime import datetime
        current_period = datetime.now().strftime("%Y-%m")
        period_txs = [t for t in transactions if t.get('date', '').startswith(current_period)]
    
    income = 0.0
    expenses = 0.0
    
    for t in period_txs:
        val = t.get('value', 0)
        if t['type'] == 'income':
            income += val
        elif t['type'] == 'expense':
            expenses += val
            
    return {
        "balance": round(all_time_balance, 2),
        "income": round(income, 2),
        "expenses": round(expenses, 2),
        "transaction_count": len(period_txs),
        "period": period or datetime.now().strftime("%Y-%m")
    }

# --- RECURRING ---

def get_recurring() -> List[Dict]:
    return _load_json('recurring')

def add_recurring(data: Dict) -> RecurringItem:
    from . import tags
    items = _load_json('recurring')
    if 'id' not in data:
        import uuid
        data['id'] = str(uuid.uuid4())
    # Auto-create tag for category
    category = data.get('category', 'fixo')
    tags.get_or_create_tag(category)
    items.append(data)
    _save_json('recurring', items)
    return RecurringItem(**data)

def delete_recurring(item_id: str) -> bool:
    items = _load_json('recurring')
    original_len = len(items)
    items = [i for i in items if i.get('id') != item_id]
    if len(items) < original_len:
        _save_json('recurring', items)
        return True
    return False

def update_recurring(item_id: str, updates: Dict) -> Optional[RecurringItem]:
    from . import tags
    items = _load_json('recurring')
    updated = False
    updated_tx = None
    for i in items:
        if i.get('id') == item_id:
            for k, v in updates.items():
                if k != 'id':
                    i[k] = v
                    # Auto-create tag when category changes
                    if k == 'category':
                        tags.get_or_create_tag(v)
            updated = True
            updated_tx = i
            break
    if updated:
        _save_json('recurring', items)
        return RecurringItem(**updated_tx)
    return None

# --- OVERDUE BILLS ---

def get_bills() -> List[Dict]:
    return _load_json('bills')

def add_bill(data: Dict) -> OverdueBill:
    from . import tags
    bills = _load_json('bills')
    if 'id' not in data:
        import uuid
        data['id'] = str(uuid.uuid4())
    # Auto-create tag for category
    category = data.get('category', 'geral')
    tags.get_or_create_tag(category)
    bills.append(data)
    _save_json('bills', bills)
    return OverdueBill(**data)

def update_bill(bill_id: str, updates: Dict) -> Optional[OverdueBill]:
    from . import tags
    bills = _load_json('bills')
    updated = False
    updated_bill = None
    
    for bill in bills:
        if bill.get('id') == bill_id:
            # Update fields
            for k, v in updates.items():
                if k != 'id':
                    bill[k] = v
                    # Auto-create tag when category changes
                    if k == 'category':
                        tags.get_or_create_tag(v)
            updated = True
            updated_bill = bill
            break
    
    if updated:
        _save_json('bills', bills)
        return OverdueBill(**updated_bill)
    return None

# --- BUDGET ---

def get_budget() -> List[Dict]:
    return _load_json('budget')

def add_budget(data: Dict) -> Budget:
    items = _load_json('budget')
    if 'id' not in data:
        import uuid
        data['id'] = str(uuid.uuid4())
    if 'created_at' not in data:
        data['created_at'] = datetime.now().isoformat()
    if 'updated_at' not in data:
        data['updated_at'] = datetime.now().isoformat()
        
    items.append(data)
    _save_json('budget', items)
    return Budget(**data)

def delete_budget(budget_id: str) -> bool:
    items = _load_json('budget')
    original_len = len(items)
    items = [i for i in items if i.get('id') != budget_id]
    if len(items) < original_len:
        _save_json('budget', items)
        return True
    return False

def update_budget(budget_id: str, updates: Dict) -> Optional[Budget]:
    items = _load_json('budget')
    updated = False
    updated_obj = None
    for i in items:
        if i.get('id') == budget_id:
            for k, v in updates.items():
                if k not in ['id', 'created_at']:
                    i[k] = v
            i['updated_at'] = datetime.now().isoformat()
            updated = True
            updated_obj = i
            break
    if updated:
        _save_json('budget', items)
        return Budget(**updated_obj)
    return None

# --- GOALS ---

def get_goals() -> List[Dict]:
    return _load_json('goals')

def add_goal(data: Dict) -> Goal:
    items = _load_json('goals')
    if 'id' not in data:
        import uuid
        data['id'] = str(uuid.uuid4())
    if 'created_at' not in data:
        data['created_at'] = datetime.now().isoformat()
    if 'updated_at' not in data:
        data['updated_at'] = datetime.now().isoformat()
        
    items.append(data)
    _save_json('goals', items)
    return Goal(**data)

def delete_goal(goal_id: str) -> bool:
    items = _load_json('goals')
    original_len = len(items)
    items = [i for i in items if i.get('id') != goal_id]
    if len(items) < original_len:
        _save_json('goals', items)
        return True
    return False

def update_goal(goal_id: str, updates: Dict) -> Optional[Goal]:
    items = _load_json('goals')
    updated = False
    updated_obj = None
    for i in items:
        if i.get('id') == goal_id:
            for k, v in updates.items():
                if k not in ['id', 'created_at']:
                    i[k] = v
            i['updated_at'] = datetime.now().isoformat()
            updated = True
            updated_obj = i
            break
    if updated:
        _save_json('goals', items)
        return Goal(**updated_obj)
    return None

# --- CREDIT CARDS ---

def get_cards() -> List[Dict]:
    return _load_json('cards')

def add_card(data: Dict) -> CreditCard:
    items = _load_json('cards')
    if 'id' not in data:
        import uuid
        data['id'] = str(uuid.uuid4())[:8]
    if 'created_at' not in data:
        data['created_at'] = datetime.now().isoformat()
        
    items.append(data)
    _save_json('cards', items)
    return CreditCard(**data)

def delete_card(card_id: str) -> bool:
    items = _load_json('cards')
    original_len = len(items)
    items = [i for i in items if i.get('id') != card_id]
    if len(items) < original_len:
        _save_json('cards', items)
        return True
    return False

def update_card(card_id: str, updates: Dict) -> Optional[CreditCard]:
    items = _load_json('cards')
    updated = False
    updated_obj = None
    for i in items:
        if i.get('id') == card_id:
            for k, v in updates.items():
                if k not in ['id', 'created_at']:
                    i[k] = v
            updated = True
            updated_obj = i
            break
    if updated:
        _save_json('cards', items)
        return CreditCard(**updated_obj)
    return None

# --- NOTIFICATIONS ---

def get_notifications() -> List[Dict]:
    return _load_json('notifications')

def add_notification(data: Dict) -> Notification:
    items = _load_json('notifications')
    if 'id' not in data:
        import uuid
        data['id'] = str(uuid.uuid4())
    if 'date' not in data:
        data['date'] = datetime.now().isoformat()
    items.append(data)
    _save_json('notifications', items)
    return Notification(**data)

def mark_notification_as_read(notification_id: str) -> bool:
    items = _load_json('notifications')
    updated = False
    for i in items:
        if i.get('id') == notification_id:
            i['read'] = True
            updated = True
            break
    if updated:
        _save_json('notifications', items)
        return True
    return False

def clear_notifications() -> bool:
    _save_json('notifications', [])
    return True

def delete_notification(notification_id: str) -> bool:
    items = _load_json('notifications')
    original_len = len(items)
    items = [i for i in items if i.get('id') != notification_id]
    if len(items) < original_len:
        _save_json('notifications', items)
        return True
    return False

# --- PIGGY BANKS (CAIXINHAS) ---

def get_piggy_banks() -> List[Dict]:
    return _load_json('piggy_banks')

def add_piggy_bank(data: Dict) -> PiggyBank:
    items = _load_json('piggy_banks')
    if 'id' not in data:
        import uuid
        data['id'] = str(uuid.uuid4())
    if 'created_at' not in data:
        data['created_at'] = datetime.now().isoformat()
    if 'updated_at' not in data:
        data['updated_at'] = datetime.now().isoformat()
    if 'current_amount' not in data:
        data['current_amount'] = 0.0
        
    items.append(data)
    _save_json('piggy_banks', items)
    return PiggyBank(**data)

def delete_piggy_bank(piggy_bank_id: str) -> bool:
    items = _load_json('piggy_banks')
    original_len = len(items)
    items = [i for i in items if i.get('id') != piggy_bank_id]
    if len(items) < original_len:
        _save_json('piggy_banks', items)
        # Also delete related transactions
        transactions = _load_json('piggy_bank_transactions')
        transactions = [t for t in transactions if t.get('piggy_bank_id') != piggy_bank_id]
        _save_json('piggy_bank_transactions', transactions)
        return True
    return False

def update_piggy_bank(piggy_bank_id: str, updates: Dict) -> Optional[PiggyBank]:
    items = _load_json('piggy_banks')
    updated = False
    updated_obj = None
    for i in items:
        if i.get('id') == piggy_bank_id:
            for k, v in updates.items():
                if k not in ['id', 'created_at', 'current_amount']:  # current_amount is managed by transactions
                    i[k] = v
            i['updated_at'] = datetime.now().isoformat()
            updated = True
            updated_obj = i
            break
    if updated:
        _save_json('piggy_banks', items)
        return PiggyBank(**updated_obj)
    return None

def get_piggy_bank_transactions(piggy_bank_id: Optional[str] = None) -> List[Dict]:
    transactions = _load_json('piggy_bank_transactions')
    if piggy_bank_id:
        transactions = [t for t in transactions if t.get('piggy_bank_id') == piggy_bank_id]
    # Sort by date desc
    transactions.sort(key=lambda x: x.get('date', ''), reverse=True)
    return transactions

def add_piggy_bank_transaction(data: Dict) -> PiggyBankTransaction:
    transactions = _load_json('piggy_bank_transactions')
    piggy_banks = _load_json('piggy_banks')
    
    if 'id' not in data:
        import uuid
        data['id'] = str(uuid.uuid4())
    if 'created_at' not in data:
        data['created_at'] = datetime.now().isoformat()
        
    transactions.append(data)
    _save_json('piggy_bank_transactions', transactions)
    
    # Update piggy bank current_amount
    piggy_bank_id = data.get('piggy_bank_id')
    amount = float(data.get('amount', 0))
    tx_type = data.get('type', 'deposit')
    
    for pb in piggy_banks:
        if pb.get('id') == piggy_bank_id:
            if tx_type == 'deposit':
                pb['current_amount'] = pb.get('current_amount', 0.0) + amount
            elif tx_type == 'withdrawal':
                pb['current_amount'] = max(0.0, pb.get('current_amount', 0.0) - amount)
            pb['updated_at'] = datetime.now().isoformat()
            break
    
    _save_json('piggy_banks', piggy_banks)
    
    return PiggyBankTransaction(**data)

def delete_piggy_bank_transaction(transaction_id: str) -> bool:
    transactions = _load_json('piggy_bank_transactions')
    piggy_banks = _load_json('piggy_banks')
    
    # Find the transaction to reverse its effect
    tx_to_delete = None
    for tx in transactions:
        if tx.get('id') == transaction_id:
            tx_to_delete = tx
            break
    
    if not tx_to_delete:
        return False
    
    # Reverse the transaction effect on the piggy bank
    piggy_bank_id = tx_to_delete.get('piggy_bank_id')
    amount = float(tx_to_delete.get('amount', 0))
    tx_type = tx_to_delete.get('type', 'deposit')
    
    for pb in piggy_banks:
        if pb.get('id') == piggy_bank_id:
            if tx_type == 'deposit':
                pb['current_amount'] = max(0.0, pb.get('current_amount', 0.0) - amount)
            elif tx_type == 'withdrawal':
                pb['current_amount'] = pb.get('current_amount', 0.0) + amount
            pb['updated_at'] = datetime.now().isoformat()
            break
    
    # Remove transaction
    original_len = len(transactions)
    transactions = [t for t in transactions if t.get('id') != transaction_id]
    
    if len(transactions) < original_len:
        _save_json('piggy_bank_transactions', transactions)
        _save_json('piggy_banks', piggy_banks)
        return True
    return False
