from typing import List, Dict, Optional
from datetime import datetime, date
from . import storage

def calculate_card_metrics(card: Dict, transactions: List[Dict]) -> Dict:
    """
    Calculate real-time metrics for a credit card.
    """
    current_period = datetime.now().strftime("%Y-%m")
    card_id = card.get('id')
    
    # Calculate current bill (expenses in this month linked to this card)
    current_bill = 0.0
    for tx in transactions:
        if (tx.get('type') == 'expense' and 
            tx.get('credit_card_id') == card_id and
            tx.get('date', '').startswith(current_period)):
            current_bill += float(tx.get('value', 0))
            
    limit = float(card.get('limit', 0))
    used_limit_base = float(card.get('used_limit', 0))
    
    total_used = used_limit_base + current_bill
    available_limit = max(0, limit - total_used)
    
    # Due Date logic
    due_day = card.get('due_day', 10)
    today = date.today()
    
    if today.day <= due_day:
        next_due = date(today.year, today.month, due_day)
    else:
        if today.month == 12:
            next_due = date(today.year + 1, 1, due_day)
        else:
            next_due = date(today.year, today.month + 1, due_day)
            
    days_left = (next_due - today).days
    
    return {
        **card,
        "current_bill": round(current_bill, 2),
        "total_used": round(total_used, 2),
        "available_limit": round(available_limit, 2),
        "next_due_date": next_due.isoformat(),
        "days_until_due": days_left,
        "utilization_percentage": round((total_used / limit * 100) if limit > 0 else 0, 2)
    }

def get_cards_with_metrics() -> List[Dict]:
    """
    Get all credit cards with their calculated metrics.
    """
    cards = storage.get_cards()
    transactions = storage.get_transactions({'limit': 1000}) # Load enough to cover the month
    
    return [calculate_card_metrics(c, transactions) for c in cards]

def get_cards_summary() -> Dict:
    """
    Get overall credit card summary.
    """
    cards = get_cards_with_metrics()
    active_cards = [c for c in cards if c.get('status') == 'active']
    
    total_limit = sum(c['limit'] for c in active_cards)
    total_used = sum(c['total_used'] for c in active_cards)
    total_bills = sum(c['current_bill'] for c in active_cards)
    
    return {
        "total_limit": round(total_limit, 2),
        "total_used": round(total_used, 2),
        "total_available": round(total_limit - total_used, 2),
        "total_bills": round(total_bills, 2),
        "utilization": round((total_used / total_limit * 100) if total_limit > 0 else 0, 2),
        "cards_count": len(active_cards)
    }
