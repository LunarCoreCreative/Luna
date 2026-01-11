"""
Luna Business Periods Module
---------------------------
Handles monthly periods and period summaries.
"""

import json
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional
from .storage import get_user_data_dir, load_transactions, _load_local_transactions


def get_periods_file(user_id: str) -> Path:
    """Get periods summary file path."""
    return get_user_data_dir(user_id) / "periods.json"


def get_period_from_date(date_str: str) -> str:
    """Extract period (YYYY-MM) from date string."""
    try:
        if len(date_str) >= 7:
            return date_str[:7]  # YYYY-MM
        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        return dt.strftime("%Y-%m")
    except:
        return datetime.now().strftime("%Y-%m")


def get_current_period() -> str:
    """Get current period (YYYY-MM)."""
    return datetime.now().strftime("%Y-%m")


def get_periods_list(user_id: str) -> List[str]:
    """Get list of all periods (months) that have transactions."""
    transactions = load_transactions(user_id)
    periods = set()
    
    for tx in transactions:
        period = get_period_from_date(tx.get("date", ""))
        if period:
            periods.add(period)
    
    # Sort descending (most recent first)
    return sorted(periods, reverse=True)


def get_transactions_by_period(user_id: str, period: str) -> List[Dict]:
    """Get all transactions for a specific period (YYYY-MM)."""
    transactions = load_transactions(user_id)
    
    filtered = []
    for tx in transactions:
        tx_period = get_period_from_date(tx.get("date", ""))
        if tx_period == period:
            filtered.append(tx)
    
    # Sort by date descending
    filtered.sort(key=lambda x: x.get("date", ""), reverse=True)
    return filtered


def calculate_period_summary(user_id: str, period: str) -> Dict:
    """Calculate summary for a specific period."""
    transactions = get_transactions_by_period(user_id, period)
    
    income = sum(tx["value"] for tx in transactions if tx["type"] == "income")
    expenses = sum(tx["value"] for tx in transactions if tx["type"] == "expense")
    invested = sum(tx["value"] for tx in transactions if tx.get("type") == "investment")
    
    # Balance for period (income - expenses - invested)
    balance = income - expenses - invested
    
    # Net Worth is Balance + Invested Assets
    net_worth = balance + invested
    
    return {
        "period": period,
        "balance": balance,
        "income": income,
        "expenses": expenses,
        "invested": invested,
        "net_worth": net_worth,
        "transaction_count": len(transactions)
    }


def load_period_summaries(user_id: str) -> Dict[str, Dict]:
    """Load saved period summaries."""
    file_path = get_periods_file(user_id)
    if not file_path.exists():
        return {}
    try:
        data = json.loads(file_path.read_text(encoding="utf-8"))
        if isinstance(data, dict):
            return data
        return {}
    except:
        return {}


def save_period_summary(user_id: str, period: str, summary: Dict) -> None:
    """Save period summary (used for closing months)."""
    summaries = load_period_summaries(user_id)
    summaries[period] = {
        **summary,
        "closed_at": datetime.now().isoformat()
    }
    
    file_path = get_periods_file(user_id)
    file_path.write_text(json.dumps(summaries, ensure_ascii=False, indent=2), encoding="utf-8")


def close_period(user_id: str, period: str) -> Dict:
    """Close a period by calculating and saving its summary."""
    summary = calculate_period_summary(user_id, period)
    save_period_summary(user_id, period, summary)
    return summary


def get_period_summary(user_id: str, period: str, use_saved: bool = True) -> Dict:
    """Get period summary, optionally using saved summary if period is closed."""
    if use_saved:
        summaries = load_period_summaries(user_id)
        if period in summaries:
            return summaries[period]
    
    # Calculate on the fly
    return calculate_period_summary(user_id, period)
