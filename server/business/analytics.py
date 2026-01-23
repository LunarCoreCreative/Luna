"""
Analytics Module - Financial Projections and Insights
Calculates cash flow, category breakdowns, projections, and key metrics.
"""
from datetime import datetime, timedelta
from typing import Dict, List, Optional
from collections import defaultdict
from . import storage

def get_cash_flow_data(months: int = 6) -> List[Dict]:
    """
    Returns income/expense totals per month for chart visualization.
    """
    transactions = storage.get_transactions({'limit': 1000})
    
    # Group by month
    monthly_data = defaultdict(lambda: {'income': 0.0, 'expense': 0.0})
    
    for tx in transactions:
        try:
            date = datetime.strptime(tx['date'], '%Y-%m-%d')
            month_key = date.strftime('%Y-%m')
            
            if tx['type'] == 'income':
                monthly_data[month_key]['income'] += tx['value']
            else:
                monthly_data[month_key]['expense'] += tx['value']
        except:
            continue
    
    # Get last N months
    today = datetime.now()
    result = []
    
    for i in range(months - 1, -1, -1):
        target_date = today - timedelta(days=30 * i)
        month_key = target_date.strftime('%Y-%m')
        month_label = target_date.strftime('%b')
        
        data = monthly_data.get(month_key, {'income': 0.0, 'expense': 0.0})
        result.append({
            'month': month_label,
            'month_key': month_key,
            'income': round(data['income'], 2),
            'expense': round(data['expense'], 2),
            'balance': round(data['income'] - data['expense'], 2)
        })
    
    return result

def get_category_breakdown(period: str = 'month') -> List[Dict]:
    """
    Returns spending by category for pie chart visualization.
    """
    transactions = storage.get_transactions({'limit': 500})
    
    # Filter by period
    today = datetime.now()
    if period == 'month':
        start_date = today.replace(day=1)
    elif period == 'week':
        start_date = today - timedelta(days=7)
    else:
        start_date = today - timedelta(days=365)
    
    # Group expenses by category
    category_totals = defaultdict(float)
    
    for tx in transactions:
        if tx['type'] != 'expense':
            continue
        try:
            tx_date = datetime.strptime(tx['date'], '%Y-%m-%d')
            if tx_date >= start_date:
                category = tx.get('category', 'outros')
                category_totals[category] += tx['value']
        except:
            continue
    
    # Convert to list and sort
    result = [
        {'category': cat, 'value': round(val, 2)}
        for cat, val in category_totals.items()
    ]
    result.sort(key=lambda x: x['value'], reverse=True)
    
    return result

def get_projections() -> Dict:
    """
    Calculates projected balance for next month based on:
    - Current balance
    - Recurring items
    - Pending bills
    """
    # Current balance
    summary = storage.get_summary()
    current_balance = summary.get('balance', 0.0)
    
    # Recurring items (expected income/expense)
    recurring_items = storage.get_recurring()
    projected_income = 0.0
    projected_expense = 0.0
    
    for item in recurring_items:
        if item.get('type') == 'income':
            projected_income += item.get('value', 0.0)
        else:
            projected_expense += item.get('value', 0.0)
    
    # Pending bills
    bills = storage.get_bills()
    pending_bills_total = sum(
        b.get('value', 0.0) for b in bills if b.get('status') == 'pending'
    )
    
    # Calculate projection
    projected_balance = current_balance + projected_income - projected_expense - pending_bills_total
    
    return {
        'current_balance': round(current_balance, 2),
        'projected_income': round(projected_income, 2),
        'projected_expense': round(projected_expense, 2),
        'pending_bills': round(pending_bills_total, 2),
        'projected_balance': round(projected_balance, 2),
        'trend': 'up' if projected_balance > current_balance else 'down'
    }

def get_key_metrics() -> Dict:
    """
    Calculates key financial metrics:
    - Average daily spending
    - Savings rate
    - Top expense category
    - Transaction count
    """
    transactions = storage.get_transactions({'limit': 500})
    summary = storage.get_summary()
    
    today = datetime.now()
    month_start = today.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    days_in_month = (today - month_start).days + 1
    
    # Monthly expenses
    monthly_expenses = summary.get('expenses', 0.0)
    monthly_income = summary.get('income', 0.0)
    
    # Average daily spending
    avg_daily_spending = monthly_expenses / max(days_in_month, 1)
    
    # Savings rate
    savings_rate = 0.0
    if monthly_income > 0:
        savings_rate = ((monthly_income - monthly_expenses) / monthly_income) * 100
    
    # Top expense category this month
    category_breakdown = get_category_breakdown('month')
    top_category = category_breakdown[0] if category_breakdown else {'category': 'N/A', 'value': 0}
    
    # Transaction counts
    month_txs = [
        tx for tx in transactions
        if tx.get('date', '').startswith(today.strftime('%Y-%m'))
    ]
    
    return {
        'avg_daily_spending': round(avg_daily_spending, 2),
        'savings_rate': round(savings_rate, 1),
        'top_category': top_category['category'],
        'top_category_value': top_category['value'],
        'transaction_count': len(month_txs),
        'days_tracked': days_in_month
    }

def get_full_analytics() -> Dict:
    """
    Returns all analytics data in a single response.
    """
    return {
        'cashflow': get_cash_flow_data(6),
        'categories': get_category_breakdown('month'),
        'projections': get_projections(),
        'metrics': get_key_metrics()
    }
