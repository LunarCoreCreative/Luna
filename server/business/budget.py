"""
Luna Business Budget Module
---------------------------
Sistema de orçamento financeiro.
"""

import json
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Optional
from .storage import get_user_data_dir, load_transactions, get_summary
from .periods import get_transactions_by_period, get_period_summary


def get_budget_file(user_id: str) -> Path:
    """Get path to budget file."""
    return get_user_data_dir(user_id) / "budget.json"


def load_budget(user_id: str) -> List[Dict]:
    """Load all budget entries."""
    file_path = get_budget_file(user_id)
    if not file_path.exists():
        return []
    try:
        budgets = json.loads(file_path.read_text(encoding="utf-8"))
        # Calculate actual spending for each budget
        for budget in budgets:
            budget["actual"] = calculate_budget_actual(user_id, budget)
        return budgets
    except Exception as e:
        print(f"[BUSINESS-BUDGET] Erro ao carregar orçamento: {e}")
        return []


def save_budget(user_id: str, budgets: List[Dict]) -> None:
    """Save budget to file."""
    file_path = get_budget_file(user_id)
    file_path.write_text(json.dumps(budgets, ensure_ascii=False, indent=2), encoding="utf-8")


def add_budget(
    user_id: str,
    category: str,
    amount: float,
    period: str,  # YYYY-MM
    budget_type: str = "expense"  # "expense" or "income"
) -> Dict:
    """
    Add a new budget entry.
    
    Args:
        user_id: User ID
        category: Category name
        amount: Budget amount
        period: Period (YYYY-MM)
        budget_type: Type of budget (expense or income)
    
    Returns:
        Created budget entry
    """
    budgets = load_budget(user_id)
    
    # Check if budget already exists for this category and period
    existing = next(
        (b for b in budgets if b.get("category") == category and b.get("period") == period and b.get("type") == budget_type),
        None
    )
    
    if existing:
        # Update existing budget
        existing["amount"] = float(amount)
        existing["updated_at"] = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
        existing["actual"] = calculate_budget_actual(user_id, existing)
        save_budget(user_id, budgets)
        print(f"[BUSINESS-BUDGET] ✅ Orçamento atualizado: {existing['id']} - {category} ({period})")
        return existing
    
    # Create new budget
    new_budget = {
        "id": str(uuid.uuid4())[:8],
        "category": category.strip(),
        "amount": float(amount),
        "period": period,
        "type": budget_type,
        "created_at": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        "updated_at": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    }
    
    new_budget["actual"] = calculate_budget_actual(user_id, new_budget)
    
    budgets.append(new_budget)
    save_budget(user_id, budgets)
    
    print(f"[BUSINESS-BUDGET] ✅ Orçamento criado: {new_budget['id']} - {category} ({period})")
    return new_budget


def update_budget(
    user_id: str,
    budget_id: str,
    amount: Optional[float] = None,
    category: Optional[str] = None
) -> Optional[Dict]:
    """
    Update an existing budget.
    
    Returns:
        Updated budget or None if not found
    """
    budgets = load_budget(user_id)
    
    for budget in budgets:
        if budget["id"] == budget_id:
            if amount is not None:
                budget["amount"] = float(amount)
            if category is not None:
                budget["category"] = category.strip()
            
            budget["updated_at"] = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
            budget["actual"] = calculate_budget_actual(user_id, budget)
            
            save_budget(user_id, budgets)
            print(f"[BUSINESS-BUDGET] ✅ Orçamento atualizado: {budget_id}")
            return budget
    
    return None


def delete_budget(user_id: str, budget_id: str) -> bool:
    """Delete a budget entry."""
    budgets = load_budget(user_id)
    original_count = len(budgets)
    budgets = [b for b in budgets if b["id"] != budget_id]
    
    if len(budgets) < original_count:
        save_budget(user_id, budgets)
        print(f"[BUSINESS-BUDGET] ✅ Orçamento removido: {budget_id}")
        return True
    return False


def calculate_budget_actual(user_id: str, budget: Dict) -> Dict:
    """
    Calculate actual spending/income for a budget.
    
    Returns:
        Dictionary with actual amounts and status
    """
    category = budget.get("category", "")
    period = budget.get("period", "")
    budget_type = budget.get("type", "expense")
    budget_amount = budget.get("amount", 0)
    
    # Get transactions for this period
    transactions = get_transactions_by_period(user_id, period)
    
    # Filter by category and type
    relevant_txs = [
        tx for tx in transactions
        if tx.get("category", "").lower() == category.lower() and tx.get("type") == budget_type
    ]
    
    # Calculate actual amount
    actual_amount = sum(float(tx.get("value", 0)) for tx in relevant_txs)
    
    # Calculate percentage used
    if budget_amount > 0:
        percentage = (actual_amount / budget_amount) * 100
    else:
        percentage = 0
    
    # Determine status
    if percentage >= 100:
        status = "exceeded"
    elif percentage >= 80:
        status = "warning"
    else:
        status = "ok"
    
    return {
        "amount": actual_amount,
        "percentage": round(percentage, 2),
        "remaining": max(0, budget_amount - actual_amount),
        "status": status
    }


def get_budget_summary(user_id: str, period: Optional[str] = None) -> Dict:
    """
    Get summary of budgets for a period.
    
    Args:
        user_id: User ID
        period: Period (YYYY-MM) or None for current period
    
    Returns:
        Budget summary
    """
    if not period:
        from datetime import datetime
        period = datetime.now().strftime("%Y-%m")
    
    budgets = load_budget(user_id)
    period_budgets = [b for b in budgets if b.get("period") == period]
    
    expense_budgets = [b for b in period_budgets if b.get("type") == "expense"]
    income_budgets = [b for b in period_budgets if b.get("type") == "income"]
    
    # Calculate totals
    total_expense_budget = sum(b.get("amount", 0) for b in expense_budgets)
    total_expense_actual = sum(b.get("actual", {}).get("amount", 0) for b in expense_budgets)
    
    total_income_budget = sum(b.get("amount", 0) for b in income_budgets)
    total_income_actual = sum(b.get("actual", {}).get("amount", 0) for b in income_budgets)
    
    # Count budgets by status
    exceeded_count = sum(1 for b in period_budgets if b.get("actual", {}).get("status") == "exceeded")
    warning_count = sum(1 for b in period_budgets if b.get("actual", {}).get("status") == "warning")
    
    return {
        "period": period,
        "total_budgets": len(period_budgets),
        "expense_budgets": {
            "count": len(expense_budgets),
            "budgeted": total_expense_budget,
            "actual": total_expense_actual,
            "remaining": max(0, total_expense_budget - total_expense_actual),
            "percentage": (total_expense_actual / total_expense_budget * 100) if total_expense_budget > 0 else 0
        },
        "income_budgets": {
            "count": len(income_budgets),
            "budgeted": total_income_budget,
            "actual": total_income_actual,
            "remaining": max(0, total_income_actual - total_income_budget),
            "percentage": (total_income_actual / total_income_budget * 100) if total_income_budget > 0 else 0
        },
        "alerts": {
            "exceeded": exceeded_count,
            "warning": warning_count
        }
    }
