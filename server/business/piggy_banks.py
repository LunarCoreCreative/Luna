from typing import List, Dict, Optional
from datetime import datetime
from . import storage

def get_piggy_banks_with_metrics() -> List[Dict]:
    """
    Get all piggy banks with their metrics (progress, percentage, etc).
    """
    piggy_banks = storage.get_piggy_banks()
    result = []
    
    for pb in piggy_banks:
        current_amount = pb.get('current_amount', 0.0)
        target_amount = pb.get('target_amount')
        
        percentage = 0.0
        if target_amount and target_amount > 0:
            percentage = min(100, round((current_amount / target_amount * 100), 2))
        
        result.append({
            **pb,
            "percentage": percentage,
            "remaining_amount": max(0, (target_amount or 0) - current_amount) if target_amount else None,
            "is_completed": target_amount and current_amount >= target_amount
        })
    
    return result

def get_piggy_bank_summary() -> Dict:
    """
    Get summary of all piggy banks (total saved, count, etc).
    """
    piggy_banks = storage.get_piggy_banks()
    
    total_saved = sum(pb.get('current_amount', 0.0) for pb in piggy_banks)
    total_target = sum(pb.get('target_amount', 0.0) for pb in piggy_banks if pb.get('target_amount'))
    
    return {
        "total_piggy_banks": len(piggy_banks),
        "total_saved": round(total_saved, 2),
        "total_target": round(total_target, 2) if total_target > 0 else None,
        "overall_progress": round((total_saved / total_target * 100), 2) if total_target > 0 else None
    }

def deposit_to_piggy_bank(piggy_bank_id: str, amount: float, description: Optional[str] = None) -> Dict:
    """
    Deposit money into a piggy bank.
    This creates an expense transaction to reduce the user's balance.
    """
    # Get piggy bank name for transaction description
    piggy_banks = storage.get_piggy_banks()
    piggy_bank = next((pb for pb in piggy_banks if pb.get('id') == piggy_bank_id), None)
    
    if not piggy_bank:
        raise ValueError("Piggy bank not found")
    
    piggy_bank_name = piggy_bank.get('name', 'Caixinha')
    
    # Create expense transaction to reduce balance
    expense_description = description or f"Guardado em {piggy_bank_name}"
    expense_tx = {
        'description': expense_description,
        'value': amount,
        'type': 'expense',
        'category': 'caixinha',
        'date': datetime.now().strftime("%Y-%m-%d")
    }
    storage.add_transaction(expense_tx)
    
    # Create piggy bank transaction record
    transaction_data = {
        'piggy_bank_id': piggy_bank_id,
        'amount': amount,
        'type': 'deposit',
        'description': description or f"Depósito de R$ {amount:.2f}",
        'date': datetime.now().strftime("%Y-%m-%d")
    }
    
    tx = storage.add_piggy_bank_transaction(transaction_data)
    
    # Update linked goal if exists
    goal_id = piggy_bank.get('goal_id')
    if goal_id:
        from . import goals
        goals.update_goal_from_piggy_bank(goal_id, amount, 'deposit')
    
    return tx.dict() if hasattr(tx, 'dict') else tx

def withdraw_from_piggy_bank(piggy_bank_id: str, amount: float, description: Optional[str] = None) -> Dict:
    """
    Withdraw money from a piggy bank.
    This creates an income transaction to add back to the user's balance.
    """
    # Check if piggy bank has enough balance
    piggy_banks = storage.get_piggy_banks()
    piggy_bank = next((pb for pb in piggy_banks if pb.get('id') == piggy_bank_id), None)
    
    if not piggy_bank:
        raise ValueError("Piggy bank not found")
    
    current_amount = piggy_bank.get('current_amount', 0.0)
    if amount > current_amount:
        raise ValueError(f"Insufficient balance. Available: R$ {current_amount:.2f}")
    
    piggy_bank_name = piggy_bank.get('name', 'Caixinha')
    
    # Create income transaction to add back to balance
    income_description = description or f"Retirado de {piggy_bank_name}"
    income_tx = {
        'description': income_description,
        'value': amount,
        'type': 'income',
        'category': 'caixinha',
        'date': datetime.now().strftime("%Y-%m-%d")
    }
    storage.add_transaction(income_tx)
    
    # Create piggy bank transaction record
    transaction_data = {
        'piggy_bank_id': piggy_bank_id,
        'amount': amount,
        'type': 'withdrawal',
        'description': description or f"Retirada de R$ {amount:.2f}",
        'date': datetime.now().strftime("%Y-%m-%d")
    }
    
    tx = storage.add_piggy_bank_transaction(transaction_data)
    
    # Update linked goal if exists
    if piggy_bank.get('goal_id'):
        from . import goals
        goals.update_goal_from_piggy_bank(piggy_bank.get('goal_id'), amount, 'withdrawal')
    
    return tx.dict() if hasattr(tx, 'dict') else tx
