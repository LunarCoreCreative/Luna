"""
Luna Business Goals Module
--------------------------
Sistema de metas financeiras.
"""

import json
import uuid
from pathlib import Path
from datetime import datetime, timezone
from typing import List, Dict, Optional
from .storage import get_user_data_dir, get_summary, load_transactions


def get_goals_file(user_id: str) -> Path:
    """Get path to goals file."""
    return get_user_data_dir(user_id) / "goals.json"


def load_goals(user_id: str) -> List[Dict]:
    """Load all financial goals."""
    file_path = get_goals_file(user_id)
    if not file_path.exists():
        return []
    try:
        goals = json.loads(file_path.read_text(encoding="utf-8"))
        # Calculate progress for each goal
        for goal in goals:
            goal["progress"] = calculate_goal_progress(user_id, goal)
        return goals
    except Exception as e:
        print(f"[BUSINESS-GOALS] Erro ao carregar metas: {e}")
        return []


def save_goals(user_id: str, goals: List[Dict]) -> None:
    """Save goals to file."""
    file_path = get_goals_file(user_id)
    file_path.write_text(json.dumps(goals, ensure_ascii=False, indent=2), encoding="utf-8")


def add_goal(
    user_id: str,
    title: str,
    target_amount: float,
    target_date: Optional[str] = None,
    goal_type: str = "savings",  # "savings", "expense_reduction", "income_increase"
    description: Optional[str] = None
) -> Dict:
    """
    Add a new financial goal.
    
    Args:
        user_id: User ID
        title: Goal title
        target_amount: Target amount
        target_date: Target date (YYYY-MM-DD) or None for no deadline
        goal_type: Type of goal (savings, expense_reduction, income_increase)
        description: Optional description
    
    Returns:
        Created goal
    """
    goals = load_goals(user_id)
    
    new_goal = {
        "id": str(uuid.uuid4())[:8],
        "title": title.strip(),
        "target_amount": float(target_amount),
        "current_amount": 0.0,
        "target_date": target_date,
        "goal_type": goal_type,
        "description": description.strip() if description else "",
        "status": "active",  # "active", "completed", "cancelled"
        "created_at": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        "updated_at": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    }
    
    # Calculate initial progress
    new_goal["progress"] = calculate_goal_progress(user_id, new_goal)
    
    goals.append(new_goal)
    save_goals(user_id, goals)
    
    print(f"[BUSINESS-GOALS] ✅ Meta criada: {new_goal['id']} - {title}")
    return new_goal


def update_goal(
    user_id: str,
    goal_id: str,
    title: Optional[str] = None,
    target_amount: Optional[float] = None,
    target_date: Optional[str] = None,
    description: Optional[str] = None,
    status: Optional[str] = None
) -> Optional[Dict]:
    """
    Update an existing goal.
    
    Returns:
        Updated goal or None if not found
    """
    goals = load_goals(user_id)
    
    for goal in goals:
        if goal["id"] == goal_id:
            if title is not None:
                goal["title"] = title.strip()
            if target_amount is not None:
                goal["target_amount"] = float(target_amount)
            if target_date is not None:
                goal["target_date"] = target_date
            if description is not None:
                goal["description"] = description.strip()
            if status is not None:
                goal["status"] = status
            
            goal["updated_at"] = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
            goal["progress"] = calculate_goal_progress(user_id, goal)
            
            save_goals(user_id, goals)
            print(f"[BUSINESS-GOALS] ✅ Meta atualizada: {goal_id}")
            return goal
    
    return None


def delete_goal(user_id: str, goal_id: str) -> bool:
    """Delete a goal."""
    goals = load_goals(user_id)
    original_count = len(goals)
    goals = [g for g in goals if g["id"] != goal_id]
    
    if len(goals) < original_count:
        save_goals(user_id, goals)
        print(f"[BUSINESS-GOALS] ✅ Meta removida: {goal_id}")
        return True
    return False


def calculate_goal_progress(user_id: str, goal: Dict) -> Dict:
    """
    Calculate progress for a goal.
    
    Returns:
        Dictionary with progress information
    """
    goal_type = goal.get("goal_type", "savings")
    target_amount = goal.get("target_amount", 0)
    target_date = goal.get("target_date")
    
    # Get current financial data
    summary = get_summary(user_id)
    transactions = load_transactions(user_id)
    
    current_amount = 0.0
    
    if goal_type == "savings":
        # For savings goals, use current balance
        current_amount = summary.get("balance", 0)
    
    elif goal_type == "expense_reduction":
        # For expense reduction, calculate reduction from baseline
        # This is simplified - in a real system, you'd track baseline expenses
        current_expenses = summary.get("expenses", 0)
        # Assume target is to reduce expenses by target_amount
        # Progress = how much we've reduced (simplified)
        current_amount = max(0, target_amount - current_expenses)
    
    elif goal_type == "income_increase":
        # For income increase, calculate increase from baseline
        current_income = summary.get("income", 0)
        # Assume target is to increase income by target_amount
        # Progress = how much we've increased (simplified)
        current_amount = max(0, current_income - (current_income - target_amount))
    
    # Calculate percentage
    if target_amount > 0:
        percentage = min(100, (current_amount / target_amount) * 100)
    else:
        percentage = 0
    
    # Check if goal is completed
    is_completed = percentage >= 100
    
    # Calculate days remaining if target_date is set
    days_remaining = None
    if target_date:
        try:
            target = datetime.fromisoformat(target_date.replace('Z', '+00:00'))
            now = datetime.now(timezone.utc)
            delta = target - now
            days_remaining = max(0, delta.days)
        except Exception:
            days_remaining = None
    
    # Update goal status if completed
    if is_completed and goal.get("status") == "active":
        goal["status"] = "completed"
        goal["updated_at"] = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
    
    return {
        "current_amount": current_amount,
        "target_amount": target_amount,
        "percentage": round(percentage, 2),
        "is_completed": is_completed,
        "days_remaining": days_remaining,
        "amount_remaining": max(0, target_amount - current_amount)
    }


def get_goals_summary(user_id: str) -> Dict:
    """
    Get summary of all goals.
    
    Returns:
        Dictionary with goals summary
    """
    goals = load_goals(user_id)
    active_goals = [g for g in goals if g.get("status") == "active"]
    completed_goals = [g for g in goals if g.get("status") == "completed"]
    
    total_target = sum(g.get("target_amount", 0) for g in active_goals)
    total_current = sum(g.get("progress", {}).get("current_amount", 0) for g in active_goals)
    
    return {
        "total_goals": len(goals),
        "active_goals": len(active_goals),
        "completed_goals": len(completed_goals),
        "total_target_amount": total_target,
        "total_current_amount": total_current,
        "overall_progress": (total_current / total_target * 100) if total_target > 0 else 0
    }
