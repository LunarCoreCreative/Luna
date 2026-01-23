"""
Period Management Module
Handles month transitions, budget rollovers, and historical data archiving.
"""
import json
import os
import uuid
from datetime import datetime
from typing import Dict, List, Optional
from . import storage

# Period metadata file helper
def _get_periods_file() -> str:
    return os.path.join(storage.get_user_data_dir(), 'periods.json')

def _load_periods() -> Dict:
    """Load period metadata from file."""
    periods_file = _get_periods_file()
    if not os.path.exists(periods_file):
        return {
            "current_period": datetime.now().strftime("%Y-%m"),
            "last_transition": None,
            "history": []
        }
    try:
        with open(periods_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        print(f"[Periods] Error loading: {e}")
        return {
            "current_period": datetime.now().strftime("%Y-%m"),
            "last_transition": None,
            "history": []
        }

def _save_periods(data: Dict):
    """Save period metadata to file."""
    try:
        periods_file = _get_periods_file()
        with open(periods_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"[Periods] Error saving: {e}")

def get_current_period() -> str:
    """Returns the current period string (YYYY-MM)."""
    return datetime.now().strftime("%Y-%m")

def get_period_metadata() -> Dict:
    """Returns full period metadata including history."""
    return _load_periods()

def get_period_summary(period: str) -> Dict:
    """
    Get financial summary for a specific period.
    """
    transactions = storage.get_transactions({'limit': 10000})
    
    # Filter by period
    period_txs = [t for t in transactions if t.get('date', '').startswith(period)]
    
    income = 0.0
    expenses = 0.0
    
    for t in period_txs:
        val = float(t.get('value', 0))
        if t['type'] == 'income':
            income += val
        elif t['type'] == 'expense':
            expenses += val
    
    return {
        "period": period,
        "income": round(income, 2),
        "expenses": round(expenses, 2),
        "balance": round(income - expenses, 2),
        "transaction_count": len(period_txs)
    }

def rollover_budgets(old_period: str, new_period: str) -> int:
    """
    Copy budgets from old period to new period.
    Returns number of budgets rolled over.
    """
    budgets = storage.get_budget()
    old_budgets = [b for b in budgets if b.get('period') == old_period]
    
    count = 0
    for budget in old_budgets:
        new_budget = {
            'id': str(uuid.uuid4()),
            'category': budget['category'],
            'amount': budget['amount'],
            'type': budget.get('type', 'expense'),
            'period': new_period,
            'created_at': datetime.now().isoformat(),
            'rolled_from': budget['id']
        }
        storage.add_budget(new_budget)
        count += 1
    
    print(f"[Periods] Rolled over {count} budgets from {old_period} to {new_period}")
    return count

def close_card_billing(period: str) -> int:
    """
    Archive billing for all cards for the specified period.
    Returns number of cards processed.
    """
    cards = storage.get_cards()
    transactions = storage.get_transactions({'limit': 5000})
    
    count = 0
    for card in cards:
        card_id = card.get('id')
        
        # Calculate bill for this period
        bill_amount = 0.0
        for tx in transactions:
            if (tx.get('credit_card_id') == card_id and 
                tx.get('date', '').startswith(period) and
                tx.get('type') == 'expense'):
                bill_amount += float(tx.get('value', 0))
        
        if bill_amount > 0:
            # Archive the bill
            if 'billing_history' not in card:
                card['billing_history'] = []
            
            card['billing_history'].append({
                'period': period,
                'amount': round(bill_amount, 2),
                'closed_at': datetime.now().isoformat()
            })
            
            storage.update_card(card_id, card)
            count += 1
    
    print(f"[Periods] Closed billing for {count} cards for period {period}")
    return count

def archive_period(period: str) -> Dict:
    """
    Take a snapshot of the period and archive it.
    """
    summary = get_period_summary(period)
    
    periods_data = _load_periods()
    
    # Check if already archived
    existing = next((h for h in periods_data['history'] if h['period'] == period), None)
    if existing:
        return existing
    
    archive_entry = {
        'period': period,
        'closed_at': datetime.now().isoformat(),
        'summary': summary
    }
    
    periods_data['history'].append(archive_entry)
    _save_periods(periods_data)
    
    print(f"[Periods] Archived period {period}")
    return archive_entry

def process_month_end(period: str):
    """
    Process end-of-month tasks for the specified period.
    """
    print(f"[Periods] Processing month end for {period}")
    
    # 1. Archive the period summary
    archive_period(period)
    
    # 2. Close card billing cycles
    close_card_billing(period)
    
    print(f"[Periods] Month end processing complete for {period}")

def process_month_start(new_period: str, old_period: str):
    """
    Process start-of-month tasks for the new period.
    """
    from . import recurring
    
    print(f"[Periods] Processing month start for {new_period}")
    
    # 1. Rollover budgets
    rollover_budgets(old_period, new_period)
    
    # 2. Process recurring items
    recurring.process_recurring_items(new_period)
    
    print(f"[Periods] Month start processing complete for {new_period}")

def check_and_process_transition() -> Dict:
    """
    Check if a month transition occurred and process it.
    Returns status info.
    """
    periods_data = _load_periods()
    current_actual = get_current_period()
    last_known = periods_data.get('current_period')
    
    result = {
        'transition_occurred': False,
        'old_period': last_known,
        'new_period': current_actual,
        'processed_periods': []
    }
    
    if not last_known:
        # First time - just set current
        periods_data['current_period'] = current_actual
        periods_data['last_transition'] = datetime.now().isoformat()
        _save_periods(periods_data)
        return result
    
    if current_actual == last_known:
        # No transition needed
        return result
    
    # Month changed! Process transition(s)
    result['transition_occurred'] = True
    
    # Handle case where multiple months passed
    from datetime import timedelta
    
    def next_month(period: str) -> str:
        year, month = int(period[:4]), int(period[5:7])
        if month == 12:
            return f"{year + 1}-01"
        return f"{year}-{month + 1:02d}"
    
    processing_period = last_known
    while processing_period != current_actual:
        # Process end of this period
        process_month_end(processing_period)
        
        # Move to next period
        old_period = processing_period
        processing_period = next_month(processing_period)
        
        # Process start of new period
        process_month_start(processing_period, old_period)
        
        result['processed_periods'].append(processing_period)
    
    # Update current period
    periods_data['current_period'] = current_actual
    periods_data['last_transition'] = datetime.now().isoformat()
    _save_periods(periods_data)
    
    print(f"[Periods] Transition complete: {result}")
    return result

def get_available_periods() -> List[str]:
    """
    Returns list of all periods that have data.
    """
    transactions = storage.get_transactions({'limit': 10000})
    periods = set()
    
    for tx in transactions:
        date = tx.get('date', '')
        if len(date) >= 7:
            periods.add(date[:7])
    
    return sorted(list(periods), reverse=True)
