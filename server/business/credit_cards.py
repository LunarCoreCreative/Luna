"""
Luna Business Credit Cards Module
----------------------------------
Handles credit card management with limits, bills, and payment tracking.
"""

import json
import uuid
from pathlib import Path
from typing import List, Dict, Optional
from datetime import datetime, date, timedelta
from .storage import get_user_data_dir, add_transaction, load_transactions


def get_credit_cards_file(user_id: str) -> Path:
    """Get credit cards data file path."""
    return get_user_data_dir(user_id) / "credit_cards.json"


def load_credit_cards(user_id: str) -> List[Dict]:
    """Load all credit cards."""
    file_path = get_credit_cards_file(user_id)
    if not file_path.exists():
        return []
    try:
        cards = json.loads(file_path.read_text(encoding="utf-8"))
        # Calculate current bill and available limit for each card
        for card in cards:
            update_card_metrics(card, user_id)
        return cards
    except Exception as e:
        print(f"[CREDIT_CARDS] Erro ao carregar cartões: {e}")
        return []


def save_credit_cards(user_id: str, cards: List[Dict]) -> None:
    """Save credit cards to file."""
    file_path = get_credit_cards_file(user_id)
    file_path.write_text(json.dumps(cards, ensure_ascii=False, indent=2), encoding="utf-8")


def update_card_metrics(card: Dict, user_id: str) -> None:
    """Update card metrics (current_bill, available_limit, etc.)."""
    # Get current period (YYYY-MM)
    current_period = datetime.now().strftime("%Y-%m")
    
    # Calculate current bill from transactions
    transactions = load_transactions(user_id)
    current_bill = 0.0
    
    # Sum expenses from this card in current period
    card_id = card.get("id")
    for tx in transactions:
        if (tx.get("type") == "expense" and 
            tx.get("credit_card_id") == card_id and
            tx.get("date", "").startswith(current_period)):
            try:
                current_bill += float(tx.get("value", 0))
            except (ValueError, TypeError):
                pass
    
    # Calculate available limit
    limit = float(card.get("limit", 0))
    used_limit = float(card.get("used_limit", 0))
    available_limit = limit - used_limit - current_bill
    
    # Update card metrics
    card["current_bill"] = round(current_bill, 2)
    card["available_limit"] = max(0, round(available_limit, 2))
    card["used_limit"] = round(used_limit + current_bill, 2)
    
    # Calculate days until due date
    due_day = card.get("due_day", 10)  # Default day 10
    today = date.today()
    
    # Calculate next due date
    if today.day <= due_day:
        next_due = date(today.year, today.month, due_day)
    else:
        # Next month
        if today.month == 12:
            next_due = date(today.year + 1, 1, due_day)
        else:
            next_due = date(today.year, today.month + 1, due_day)
    
    days_until_due = (next_due - today).days
    card["days_until_due"] = days_until_due
    card["next_due_date"] = next_due.isoformat()


def add_credit_card(
    user_id: str,
    name: str,
    limit: float,
    due_day: int = 10,  # Day of month when bill is due
    last_four: Optional[str] = None,
    brand: Optional[str] = None,  # visa, mastercard, etc.
    color: Optional[str] = None,
    notes: Optional[str] = None
) -> Dict:
    """Add a new credit card."""
    cards = load_credit_cards(user_id)
    
    new_card = {
        "id": str(uuid.uuid4())[:8],
        "name": name,
        "limit": abs(limit),
        "due_day": max(1, min(31, due_day)),  # Between 1-31
        "last_four": last_four or "",
        "brand": brand or "other",
        "color": color or "#8B5CF6",  # Default purple
        "status": "active",  # active, blocked, cancelled
        "notes": notes or "",
        "created_at": datetime.now().isoformat(),
        "used_limit": 0.0,  # From previous periods
        "current_bill": 0.0,
        "available_limit": abs(limit),
        "days_until_due": 0,
        "next_due_date": None
    }
    
    update_card_metrics(new_card, user_id)
    cards.append(new_card)
    save_credit_cards(user_id, cards)
    return new_card


def update_credit_card(user_id: str, card_id: str, updates: Dict) -> Optional[Dict]:
    """Update a credit card."""
    cards = load_credit_cards(user_id)
    
    card_index = next((i for i, c in enumerate(cards) if c["id"] == card_id), -1)
    if card_index == -1:
        return None
    
    card = cards[card_index]
    
    # Update fields
    allowed_fields = ["name", "limit", "due_day", "last_four", "brand", "color", "status", "notes"]
    for field in allowed_fields:
        if field in updates:
            if field == "limit":
                card[field] = abs(float(updates[field]))
            elif field == "due_day":
                card[field] = max(1, min(31, int(updates[field])))
            else:
                card[field] = updates[field]
    
    card["updated_at"] = datetime.now().isoformat()
    update_card_metrics(card, user_id)
    save_credit_cards(user_id, cards)
    return card


def delete_credit_card(user_id: str, card_id: str) -> bool:
    """Delete a credit card."""
    cards = load_credit_cards(user_id)
    
    original_count = len(cards)
    cards = [c for c in cards if c["id"] != card_id]
    
    if len(cards) < original_count:
        save_credit_cards(user_id, cards)
        return True
    return False


def pay_credit_card_bill(user_id: str, card_id: str, amount: float, payment_date: Optional[str] = None) -> Optional[Dict]:
    """Pay credit card bill (creates a transaction and updates card)."""
    cards = load_credit_cards(user_id)
    
    card = next((c for c in cards if c["id"] == card_id), None)
    if not card:
        return None
    
    # Create payment transaction
    payment_date_str = payment_date or datetime.now().isoformat()
    
    # Add as expense transaction (payment reduces available cash)
    payment_tx = add_transaction(
        user_id=user_id,
        description=f"Pagamento fatura {card['name']}",
        value=abs(amount),
        transaction_type="expense",
        category="pagamento_cartao",
        date=payment_date_str
    )
    
    # Update card's used_limit (reduce by payment amount)
    current_used = float(card.get("used_limit", 0))
    card["used_limit"] = max(0, current_used - abs(amount))
    update_card_metrics(card, user_id)
    
    card["last_payment"] = {
        "amount": abs(amount),
        "date": payment_date_str,
        "transaction_id": payment_tx.get("id")
    }
    card["updated_at"] = datetime.now().isoformat()
    
    save_credit_cards(user_id, cards)
    return card


def get_credit_cards_summary(user_id: str) -> Dict:
    """Get summary of all credit cards."""
    cards = load_credit_cards(user_id)
    
    total_limit = sum(float(c.get("limit", 0)) for c in cards if c.get("status") == "active")
    total_used = sum(float(c.get("used_limit", 0)) + float(c.get("current_bill", 0)) for c in cards if c.get("status") == "active")
    total_available = total_limit - total_used
    total_bills = sum(float(c.get("current_bill", 0)) for c in cards if c.get("status") == "active")
    
    # Cards with bills due soon (within 7 days)
    cards_due_soon = [c for c in cards if c.get("status") == "active" and 0 <= c.get("days_until_due", 999) <= 7]
    
    return {
        "total_cards": len(cards),
        "active_cards": len([c for c in cards if c.get("status") == "active"]),
        "total_limit": round(total_limit, 2),
        "total_used": round(total_used, 2),
        "total_available": round(total_available, 2),
        "total_bills": round(total_bills, 2),
        "cards_due_soon": len(cards_due_soon),
        "utilization_percentage": round((total_used / total_limit * 100) if total_limit > 0 else 0, 2)
    }
