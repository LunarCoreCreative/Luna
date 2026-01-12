"""
Luna Business Routes
--------------------
REST API endpoints for business management.
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List

from .storage import (
    load_transactions,
    add_transaction,
    get_summary,
    load_clients,
    add_client,
    search_clients,
    delete_transaction,
    update_transaction
)

router = APIRouter(prefix="/business", tags=["business"])

# =============================================================================
# MODELS
# =============================================================================

class TransactionCreate(BaseModel):
    type: str  # "income", "expense", "investment"
    value: float
    description: str
    category: Optional[str] = "geral"
    date: Optional[str] = None  # formato YYYY-MM-DD
    user_id: Optional[str] = None

class TransactionUpdate(BaseModel):
    type: Optional[str] = None
    value: Optional[float] = None
    description: Optional[str] = None
    category: Optional[str] = None
    date: Optional[str] = None  # formato YYYY-MM-DD
    user_id: Optional[str] = None

class ClientCreate(BaseModel):
    name: str
    contact: Optional[str] = ""
    notes: Optional[str] = ""
    user_id: Optional[str] = None

# =============================================================================
# TRANSACTION ENDPOINTS
# =============================================================================

@router.get("/transactions")
async def get_transactions(user_id: str = "local", limit: int = 500, period: Optional[str] = None):
    """Get all transactions for a user. If period is provided (YYYY-MM), filters by that period."""
    if period:
        from .periods import get_transactions_by_period
        transactions = get_transactions_by_period(user_id, period)
        # Quando há período, não limita (ou limita com valor alto) para garantir todas as transações do período
        return {"transactions": transactions[:limit] if limit > 0 else transactions}
    
    transactions = load_transactions(user_id)
    # Sort by date descending and limit
    transactions.sort(key=lambda x: x.get("date", ""), reverse=True)
    return {"transactions": transactions[:limit] if limit > 0 else transactions}

@router.post("/transactions")
async def create_transaction(tx: TransactionCreate):
    """Create a new transaction."""
    if tx.type not in ["income", "expense", "investment"]:
        raise HTTPException(400, "Type must be 'income', 'expense' or 'investment'")
    
    # Valida e converte valor
    try:
        value = float(tx.value)
        if value <= 0:
            raise HTTPException(400, "Value must be positive")
    except (ValueError, TypeError):
        raise HTTPException(400, f"Invalid value: {tx.value}")
    
    # Valida descrição
    if not tx.description or not tx.description.strip():
        raise HTTPException(400, "Description is required")
    
    user_id = tx.user_id or "local"
    category = tx.category or "geral"
    
    # Ensure tag exists for this category
    if category:
        get_or_create_tag(user_id, category)
    
    try:
        new_tx = add_transaction(
            user_id=user_id,
            type=tx.type,
            value=value,  # Já convertido para float
            description=tx.description.strip(),
            category=category,
            date=tx.date
        )
        
        # Garante que os valores numéricos estão corretos na resposta
        new_tx["value"] = float(new_tx["value"])
        
        print(f"[BUSINESS-ROUTES] ✅ Transação criada: {new_tx['id']} - {new_tx['type']} - R$ {new_tx['value']:.2f}")
        return {"success": True, "transaction": new_tx}
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao criar transação: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Error creating transaction: {str(e)}")

@router.put("/transactions/{tx_id}")
async def edit_transaction(tx_id: str, tx: TransactionUpdate):
    """Update an existing transaction."""
    user_id = tx.user_id or "local"
    
    updates = {}
    if tx.type is not None:
        if tx.type not in ["income", "expense", "investment"]:
            raise HTTPException(400, "Type must be 'income', 'expense' or 'investment'")
        updates["type"] = tx.type
    if tx.value is not None:
        # Valida e converte valor
        try:
            value = float(tx.value)
            if value <= 0:
                raise HTTPException(400, "Value must be positive")
            updates["value"] = value
        except (ValueError, TypeError):
            raise HTTPException(400, f"Invalid value: {tx.value}")
    if tx.description is not None:
        if not tx.description.strip():
            raise HTTPException(400, "Description cannot be empty")
        updates["description"] = tx.description.strip()
    if tx.category is not None:
        updates["category"] = tx.category
        # Ensure tag exists for this category
        if tx.category:
            get_or_create_tag(user_id, tx.category)
    if tx.date is not None:
        updates["date"] = tx.date
    
    try:
        updated = update_transaction(user_id, tx_id, updates)
        if not updated:
            raise HTTPException(404, "Transaction not found")
        
        # Garante que os valores numéricos estão corretos na resposta
        if "value" in updated:
            updated["value"] = float(updated["value"])
        
        print(f"[BUSINESS-ROUTES] ✅ Transação atualizada: {tx_id}")
        return {"success": True, "transaction": updated}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao atualizar transação: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Error updating transaction: {str(e)}")

@router.delete("/transactions/{tx_id}")
async def remove_transaction(tx_id: str, user_id: str = "local"):
    """Delete a transaction."""
    deleted = delete_transaction(user_id, tx_id)
    if not deleted:
        raise HTTPException(404, "Transaction not found")
    return {"success": True, "deleted_id": tx_id}

@router.get("/summary")
async def get_business_summary(user_id: str = "local", period: Optional[str] = None):
    """Get financial summary. If period is provided (YYYY-MM), returns summary for that period."""
    if period:
        from .periods import get_period_summary
        summary = get_period_summary(user_id, period)
        clients = load_clients(user_id)
        summary["clients"] = len(clients)
        return summary
    
    summary = get_summary(user_id)
    clients = load_clients(user_id)
    summary["clients"] = len(clients)
    return summary

# =============================================================================
# CLIENT ENDPOINTS
# =============================================================================

@router.get("/clients")
async def get_clients(user_id: str = "local", query: str = None):
    """Get all clients or search by name."""
    if query:
        clients = search_clients(user_id, query)
    else:
        clients = load_clients(user_id)
    return {"clients": clients}

@router.post("/clients")
async def create_client(client: ClientCreate):
    """Create a new client."""
    if not client.name.strip():
        raise HTTPException(400, "Name is required")
    
    user_id = client.user_id or "local"
    new_client = add_client(
        user_id=user_id,
        name=client.name,
        contact=client.contact,
        notes=client.notes
    )
    return {"success": True, "client": new_client}

# =============================================================================
# RECURRING ENDPOINTS
# =============================================================================

from .recurring import load_recurring, add_recurring_item, delete_recurring_item, process_recurring_items

class RecurringCreate(BaseModel):
    title: str
    value: float
    type: str
    day_of_month: int
    category: Optional[str] = "fixo"
    user_id: Optional[str] = None

@router.get("/recurring-items")
async def get_recurring_items(user_id: str = "local"):
    """Get all recurring rules."""
    print(f"[BUSINESS] GET /recurring-items user_id={user_id}")
    return {"items": load_recurring(user_id)}

@router.post("/recurring-items")
async def create_recurring_item(item: RecurringCreate):
    """Create a new recurring rule."""
    print(f"[BUSINESS] POST /recurring-items {item}")
    if item.type not in ["income", "expense"]:
        raise HTTPException(400, "Type must be 'income' or 'expense'")
    if item.day_of_month < 1 or item.day_of_month > 31:
        raise HTTPException(400, "Day must be 1-31")
        
    user_id = item.user_id or "local"
    new_item = add_recurring_item(
        user_id=user_id,
        title=item.title,
        value=item.value,
        type=item.type,
        day_of_month=item.day_of_month,
        category=item.category
    )
    return {"success": True, "item": new_item}

@router.delete("/recurring-items/{item_id}")
async def remove_recurring_item(item_id: str, user_id: str = "local"):
    """Delete a recurring rule."""
    if delete_recurring_item(user_id, item_id):
        return {"success": True}
    raise HTTPException(404, "Item not found")

@router.post("/recurring-items/process")
async def process_recurring_items_endpoint(user_id: str = "local", month: Optional[str] = None):
    """Generate transactions from recurring rules."""
    generated = process_recurring_items(user_id, month)
    return {"success": True, "generated_count": len(generated), "transactions": generated}

# =============================================================================
# TAG ENDPOINTS
# =============================================================================

from .tags import load_tags, add_tag, delete_tag, get_or_create_tag, sync_tags_from_transactions

class TagCreate(BaseModel):
    label: str
    color: Optional[str] = None
    user_id: Optional[str] = None

@router.get("/tags")
async def get_tags_endpoint(user_id: str = "local"):
    """Get all tags. Also syncs tags from existing transactions."""
    # Sync tags from existing transactions to ensure all categories have tags
    transactions = load_transactions(user_id)
    sync_tags_from_transactions(user_id, transactions)
    return {"tags": load_tags(user_id)}

@router.post("/tags")
async def create_tag_endpoint(tag: TagCreate):
    """Create a new tag."""
    if not tag.label.strip():
        raise HTTPException(400, "Label is required")
        
    user_id = tag.user_id or "local"
    new_tag = add_tag(user_id, tag.label, tag.color)
    return {"success": True, "tag": new_tag}

@router.delete("/tags/{tag_id}")
async def delete_tag_endpoint(tag_id: str, user_id: str = "local"):
    """Delete a tag."""
    if delete_tag(user_id, tag_id):
        return {"success": True}
    return {"success": False, "message": "Tag not found or default tag"}

# =============================================================================
# OVERDUE BILLS ENDPOINTS
# =============================================================================

from .overdue import (
    load_overdue,
    add_overdue_bill as storage_add_overdue_bill,
    update_overdue_bill as storage_update_overdue_bill,
    delete_overdue_bill as storage_delete_overdue_bill,
    mark_bill_as_paid as storage_mark_bill_as_paid,
    pay_bill_and_create_transaction as storage_pay_bill_and_create_transaction,
    get_overdue_summary
)

class OverdueBillCreate(BaseModel):
    description: str
    value: float
    due_date: str  # YYYY-MM-DD
    category: Optional[str] = "geral"
    notes: Optional[str] = None
    user_id: Optional[str] = None

class OverdueBillUpdate(BaseModel):
    description: Optional[str] = None
    value: Optional[float] = None
    due_date: Optional[str] = None
    category: Optional[str] = None
    notes: Optional[str] = None
    status: Optional[str] = None  # pending, paid, cancelled
    user_id: Optional[str] = None

@router.get("/overdue-bills")
async def get_overdue_bills(user_id: str = "local", status: Optional[str] = None):
    """Get all overdue/pending bills, optionally filtered by status."""
    bills = load_overdue(user_id)
    if status:
        bills = [b for b in bills if b.get("status") == status]
    return {"bills": bills}

@router.post("/overdue-bills")
async def create_overdue_bill(bill: OverdueBillCreate):
    """Create a new overdue/pending bill."""
    if bill.value <= 0:
        raise HTTPException(400, "Value must be positive")
    
    user_id = bill.user_id or "local"
    new_bill = storage_add_overdue_bill(
        user_id=user_id,
        description=bill.description,
        value=bill.value,
        due_date=bill.due_date,
        category=bill.category or "geral",
        notes=bill.notes
    )
    return {"success": True, "bill": new_bill}

@router.put("/overdue-bills/{bill_id}")
async def update_overdue_bill_endpoint(bill_id: str, bill: OverdueBillUpdate):
    """Update an existing overdue bill."""
    user_id = bill.user_id or "local"
    
    updates = {}
    if bill.description is not None:
        updates["description"] = bill.description
    if bill.value is not None:
        if bill.value <= 0:
            raise HTTPException(400, "Value must be positive")
        updates["value"] = bill.value
    if bill.due_date is not None:
        updates["due_date"] = bill.due_date
    if bill.category is not None:
        updates["category"] = bill.category
    if bill.notes is not None:
        updates["notes"] = bill.notes
    if bill.status is not None:
        if bill.status not in ["pending", "paid", "cancelled"]:
            raise HTTPException(400, "Status must be 'pending', 'paid' or 'cancelled'")
        updates["status"] = bill.status
    
    updated = storage_update_overdue_bill(user_id, bill_id, updates)
    if not updated:
        raise HTTPException(404, "Bill not found")
    
    return {"success": True, "bill": updated}

@router.delete("/overdue-bills/{bill_id}")
async def delete_overdue_bill_endpoint(bill_id: str, user_id: str = "local"):
    """Delete an overdue bill."""
    deleted = storage_delete_overdue_bill(user_id, bill_id)
    if not deleted:
        raise HTTPException(404, "Bill not found")
    return {"success": True, "deleted_id": bill_id}

@router.post("/overdue-bills/{bill_id}/pay")
async def pay_overdue_bill_endpoint(bill_id: str, user_id: str = "local", payment_date: Optional[str] = None):
    """Mark a bill as paid and create corresponding expense transaction."""
    result = storage_pay_bill_and_create_transaction(user_id, bill_id, payment_date)
    if not result:
        raise HTTPException(404, "Bill not found or already paid")
    return {"success": True, "bill": result}

@router.get("/overdue-bills/summary")
async def get_overdue_summary_endpoint(user_id: str = "local"):
    """Get summary of overdue bills."""
    summary = get_overdue_summary(user_id)
    return summary

# =============================================================================
# PERIOD ENDPOINTS
# =============================================================================

from .periods import (
    get_periods_list,
    get_current_period,
    get_period_summary as periods_get_period_summary,
    close_period as periods_close_period,
    get_transactions_by_period
)

@router.get("/periods")
async def get_periods_endpoint(user_id: str = "local"):
    """Get list of all available periods (months with transactions)."""
    periods = get_periods_list(user_id)
    current = get_current_period()
    return {
        "periods": periods,
        "current_period": current
    }

@router.get("/periods/{period}/summary")
async def get_period_summary_endpoint(period: str, user_id: str = "local"):
    """Get summary for a specific period (YYYY-MM)."""
    summary = periods_get_period_summary(user_id, period)
    clients = load_clients(user_id)
    summary["clients"] = len(clients)
    return summary

@router.post("/periods/{period}/close")
async def close_period_endpoint(period: str, user_id: str = "local"):
    """Close a period by calculating and saving its summary."""
    summary = periods_close_period(user_id, period)
    return {"success": True, "summary": summary}

@router.get("/periods/{period}/transactions")
async def get_period_transactions_endpoint(period: str, user_id: str = "local", limit: int = 100):
    """Get all transactions for a specific period (YYYY-MM)."""
    transactions = get_transactions_by_period(user_id, period)
    return {"transactions": transactions[:limit]}