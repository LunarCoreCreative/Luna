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
async def get_transactions(user_id: str = "local", limit: int = 50):
    """Get all transactions for a user."""
    transactions = load_transactions(user_id)
    # Sort by date descending and limit
    transactions.sort(key=lambda x: x.get("date", ""), reverse=True)
    return {"transactions": transactions[:limit]}

@router.post("/transactions")
async def create_transaction(tx: TransactionCreate):
    """Create a new transaction."""
    if tx.type not in ["income", "expense", "investment"]:
        raise HTTPException(400, "Type must be 'income', 'expense' or 'investment'")
    if tx.value <= 0:
        raise HTTPException(400, "Value must be positive")
    
    user_id = tx.user_id or "local"
    new_tx = add_transaction(
        user_id=user_id,
        type=tx.type,
        value=tx.value,
        description=tx.description,
        category=tx.category or "geral",
        date=tx.date
    )
    return {"success": True, "transaction": new_tx}

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
        if tx.value <= 0:
            raise HTTPException(400, "Value must be positive")
        updates["value"] = tx.value
    if tx.description is not None:
        updates["description"] = tx.description
    if tx.category is not None:
        updates["category"] = tx.category
    if tx.date is not None:
        updates["date"] = tx.date
    
    updated = update_transaction(user_id, tx_id, updates)
    if not updated:
        raise HTTPException(404, "Transaction not found")
    
    return {"success": True, "transaction": updated}

@router.delete("/transactions/{tx_id}")
async def remove_transaction(tx_id: str, user_id: str = "local"):
    """Delete a transaction."""
    deleted = delete_transaction(user_id, tx_id)
    if not deleted:
        raise HTTPException(404, "Transaction not found")
    return {"success": True, "deleted_id": tx_id}

@router.get("/summary")
async def get_business_summary(user_id: str = "local"):
    """Get financial summary."""
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

from .tags import load_tags, add_tag, delete_tag

class TagCreate(BaseModel):
    label: str
    color: Optional[str] = None
    user_id: Optional[str] = None

@router.get("/tags")
async def get_tags_endpoint(user_id: str = "local"):
    """Get all tags."""
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
