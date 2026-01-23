from typing import List, Dict, Optional
from datetime import datetime
from . import storage

def calculate_budget_usage(budget: Dict, transactions: List[Dict]) -> Dict:
    """
    Calculate actual spending for a specific budget item.
    """
    category = budget.get('category', '')
    period = budget.get('period', '') # YYYY-MM
    budget_type = budget.get('type', 'expense')
    budget_amount = budget.get('amount', 0)

    # Filter transactions by month, category and type
    relevant_txs = [
        tx for tx in transactions
        if tx.get('date', '').startswith(period) and 
        tx.get('category', '').lower() == category.lower() and 
        tx.get('type') == budget_type
    ]

    actual_amount = sum(float(tx.get('value', 0)) for tx in relevant_txs)
    
    percentage = (actual_amount / budget_amount * 100) if budget_amount > 0 else 0
    
    status = "ok"
    if percentage >= 100:
        status = "exceeded"
    elif percentage >= 80:
        status = "warning"

    return {
        **budget,
        "actual": round(actual_amount, 2),
        "percentage": round(percentage, 2),
        "remaining": round(max(0, budget_amount - actual_amount), 2),
        "status": status
    }

def get_budgets_with_usage(period: Optional[str] = None) -> List[Dict]:
    """
    Get all budgets for a period with their current usage calculated.
    """
    if not period:
        period = datetime.now().strftime("%Y-%m")
    
    budgets = storage.get_budget()
    transactions = storage.get_transactions() # In real app, might want to filter by month first
    
    period_budgets = [b for b in budgets if b.get('period') == period]
    
    results = []
    for b in period_budgets:
        results.append(calculate_budget_usage(b, transactions))
        
    return results

def get_budget_summary(period: Optional[str] = None) -> Dict:
    """
    Returns a bird's eye view of all budgets in a period.
    """
    usage = get_budgets_with_usage(period)
    
    total_budgeted = sum(b['amount'] for b in usage if b['type'] == 'expense')
    total_actual = sum(b['actual'] for b in usage if b['type'] == 'expense')
    
    return {
        "period": period,
        "expense": {
            "budgeted": round(total_budgeted, 2),
            "actual": round(total_actual, 2),
            "percentage": round((total_actual / total_budgeted * 100) if total_budgeted > 0 else 0, 2)
        },
        "items_count": len(usage),
        "alerts": {
            "exceeded": sum(1 for b in usage if b['status'] == 'exceeded'),
            "warning": sum(1 for b in usage if b['status'] == 'warning')
        }
    }

def check_budget_impact(category: str, value: float, tx_type: str = 'expense') -> Optional[Dict]:
    """
    Check if a transaction impacts any budget and return the impact info.
    Called after adding a transaction to trigger notifications if needed.
    """
    if tx_type != 'expense':
        return None
        
    period = datetime.now().strftime("%Y-%m")
    budgets = storage.get_budget()
    
    # Find matching budget
    matching_budget = next(
        (b for b in budgets 
         if b.get('period') == period and 
         b.get('category', '').lower() == category.lower() and
         b.get('type') == 'expense'),
        None
    )
    
    if not matching_budget:
        return None
    
    # Calculate new usage
    transactions = storage.get_transactions()
    usage = calculate_budget_usage(matching_budget, transactions)
    
    return {
        'budget_id': matching_budget.get('id'),
        'category': category,
        'limit': matching_budget.get('amount', 0),
        'actual': usage['actual'],
        'percentage': usage['percentage'],
        'status': usage['status']
    }
