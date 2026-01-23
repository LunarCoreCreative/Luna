from typing import List, Dict, Optional
from datetime import datetime, timezone
from . import storage

def calculate_goal_metrics(goal: Dict, summary: Dict) -> Dict:
    """
    Calculate progress metrics for a financial goal.
    If goal is linked to a piggy bank, use piggy bank amount instead.
    """
    goal_type = goal.get('goal_type', 'savings')
    target_amount = goal.get('target_amount', 0)
    current_amount = 0.0

    # Check if goal is linked to a piggy bank
    goal_id = goal.get('id')
    if goal_id:
        piggy_banks = storage.get_piggy_banks()
        linked_pb = next((pb for pb in piggy_banks if pb.get('goal_id') == goal_id), None)
        if linked_pb:
            # Use piggy bank amount for linked goals
            current_amount = linked_pb.get('current_amount', 0.0)
        else:
            # Fallback to original logic
            if goal_type == "savings":
                # For savings goals, we use the current balance as a proxy
                current_amount = summary.get('balance', 0)
            elif goal_type == "income_increase":
                current_amount = summary.get('income', 0)
            elif goal_type == "expense_reduction":
                # Percentage reduction is harder to express as current_amount
                # Let's say current_amount is how much we HAVEN'T spent from a baseline
                # In this V2 we keep it simple: progress from income or balance
                current_amount = summary.get('income', 0)
    else:
        # Original logic if no ID
        if goal_type == "savings":
            current_amount = summary.get('balance', 0)
        elif goal_type == "income_increase":
            current_amount = summary.get('income', 0)
        elif goal_type == "expense_reduction":
            current_amount = summary.get('income', 0)
    
    percentage = (current_amount / target_amount * 100) if target_amount > 0 else 0
    remaining = max(0, target_amount - current_amount)
    
    # Calculate time metrics
    days_left = None
    if goal.get('target_date'):
        try:
            target_dt = datetime.fromisoformat(goal['target_date'].split('T')[0])
            now_dt = datetime.now()
            delta = target_dt - now_dt
            days_left = max(0, delta.days)
        except:
            pass

    return {
        **goal,
        "current_amount": round(current_amount, 2),
        "percentage": min(100, round(percentage, 2)),
        "remaining_amount": round(remaining, 2),
        "days_left": days_left,
        "is_completed": percentage >= 100
    }

def get_goals_with_metrics() -> List[Dict]:
    """
    Get all goals with their real-time progress metrics.
    """
    goals = storage.get_goals()
    summary = storage.get_summary()
    
    return [calculate_goal_metrics(g, summary) for g in goals]

def update_goal_from_transaction(category: str, value: float, tx_type: str) -> Optional[Dict]:
    """
    Check if a transaction contributes to any goal and update progress.
    For savings goals, income transactions with matching category add to current_amount.
    Returns the updated goal if matched, None otherwise.
    """
    goals = storage.get_goals()
    
    # Find goal linked to this category
    matching_goal = next(
        (g for g in goals 
         if g.get('category', '').lower() == category.lower() and
         g.get('goal_type') == 'savings'),
        None
    )
    
    if not matching_goal:
        return None
    
    # For savings goals, we add income to current_amount
    if tx_type == 'income':
        current = matching_goal.get('current_amount', 0.0)
        new_amount = current + value
        matching_goal['current_amount'] = round(new_amount, 2)
        
        # Check if goal is now complete
        target = matching_goal.get('target_amount', 0)
        if new_amount >= target and current < target:
            matching_goal['completed_at'] = datetime.now().isoformat()
        
        # Save updated goal
        storage.update_goal(matching_goal['id'], matching_goal)
        
        return {
            'goal_id': matching_goal['id'],
            'name': matching_goal.get('name', ''),
            'new_amount': new_amount,
            'target': target,
            'percentage': round((new_amount / target * 100) if target > 0 else 0, 2),
            'just_completed': new_amount >= target and current < target
        }
    
    return None

def update_goal_from_piggy_bank(goal_id: str, amount: float, tx_type: str) -> Optional[Dict]:
    """
    Update goal progress from a piggy bank transaction.
    """
    goals = storage.get_goals()
    goal = next((g for g in goals if g.get('id') == goal_id), None)
    
    if not goal:
        return None
    
    current = goal.get('current_amount', 0.0)
    
    if tx_type == 'deposit':
        new_amount = current + amount
    elif tx_type == 'withdrawal':
        new_amount = max(0.0, current - amount)
    else:
        return None
    
    goal['current_amount'] = round(new_amount, 2)
    
    # Check if goal is now complete
    target = goal.get('target_amount', 0)
    if new_amount >= target and current < target:
        goal['completed_at'] = datetime.now().isoformat()
        goal['status'] = 'completed'
    
    # Save updated goal
    storage.update_goal(goal_id, goal)
    
    return {
        'goal_id': goal_id,
        'new_amount': new_amount,
        'target': target,
        'percentage': round((new_amount / target * 100) if target > 0 else 0, 2),
        'just_completed': new_amount >= target and current < target
    }

def check_goal_achievements() -> List[Dict]:
    """
    Check all goals and return any that have been recently achieved.
    Used for notification generation.
    """
    goals = storage.get_goals()
    summary = storage.get_summary()
    
    achieved = []
    for goal in goals:
        metrics = calculate_goal_metrics(goal, summary)
        if metrics['is_completed'] and not goal.get('notified_complete'):
            achieved.append(metrics)
    
    return achieved
