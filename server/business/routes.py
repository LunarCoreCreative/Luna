from fastapi import APIRouter, HTTPException, Query, Depends
from fastapi.responses import StreamingResponse
import io
from pydantic import BaseModel
from typing import List, Optional, Literal
from .models import (
    Transaction, TransactionCreate, 
    RecurringItem, RecurringItemCreate,
    OverdueBill, OverdueBillCreate,
    Tag, TagCreate,
    Budget, BudgetCreate,
    Goal, GoalCreate, GoalBase,
    CreditCard, CreditCardCreate, CreditCardBase,
    Notification,
    PiggyBank, PiggyBankCreate, PiggyBankBase,
    PiggyBankTransaction, PiggyBankTransactionCreate
)
from . import storage
from . import tags
from . import recurring
from . import budget
from . import goals
from . import credit_cards
from . import notifications
from . import export
from . import ai
from . import overdue
from . import analytics
from . import periods
from . import firebase_sync
from . import piggy_banks

router = APIRouter()

# =============================================================================
# USER CONTEXT DEPENDENCY
# =============================================================================

def set_user_from_query(uid: Optional[str] = Query(None, description="User ID for multi-tenant access")):
    """Dependency to set user context from query parameter."""
    if uid:
        storage.set_user_context(uid)
        
        # Check if migration is needed
        if firebase_sync.check_legacy_data_exists(uid) and not firebase_sync.is_migration_complete(uid):
            print(f"[Routes] Triggering legacy migration for user {uid[:8]}...")
            firebase_sync.migrate_legacy_data(uid)
    
    return uid

# --- SUMMARY ---
@router.get("/summary")
async def get_summary(period: Optional[str] = None, uid: Optional[str] = Depends(set_user_from_query)):
    """Retorna o resumo financeiro (saldo, receitas, despesas). Aceita period=YYYY-MM."""
    # Check for period transition on every summary request
    periods.check_and_process_transition()
    return storage.get_summary(period)

# --- TRANSACTIONS ---
@router.get("/transactions", response_model=List[Transaction])
async def list_transactions(
    type: str = 'all',
    limit: int = 50,
    uid: Optional[str] = Depends(set_user_from_query)
):
    return storage.get_transactions({'type': type, 'limit': limit})

@router.post("/transactions", response_model=Transaction)
async def create_transaction(tx: TransactionCreate, uid: Optional[str] = Depends(set_user_from_query)):
    result = storage.add_transaction(tx.dict())
    # Auto-sync to Firebase if user is authenticated
    if uid:
        firebase_sync.auto_sync_collection(uid, 'transactions')
    return result

@router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str, uid: Optional[str] = Depends(set_user_from_query)):
    if storage.delete_transaction(transaction_id):
        # Auto-sync to Firebase if user is authenticated
        if uid:
            firebase_sync.auto_sync_collection(uid, 'transactions')
        return {"success": True, "message": "Transação removida."}
    raise HTTPException(status_code=404, detail="Transação não encontrada.")

@router.put("/transactions/{transaction_id}", response_model=Transaction)
async def update_transaction(transaction_id: str, tx: TransactionCreate, uid: Optional[str] = Depends(set_user_from_query)):
    # TransactionCreate fits well for full update behavior
    updated = storage.update_transaction(transaction_id, tx.dict())
    if updated:
        # Auto-sync to Firebase if user is authenticated
        if uid:
            firebase_sync.auto_sync_collection(uid, 'transactions')
        return updated
    raise HTTPException(status_code=404, detail="Transação não encontrada.")

# --- RECURRING ITEMS ---
@router.get("/recurring", response_model=List[RecurringItem])
async def list_recurring(uid: Optional[str] = Depends(set_user_from_query)):
    return storage.get_recurring()

@router.post("/recurring", response_model=RecurringItem)
async def create_recurring(item: RecurringItemCreate, uid: Optional[str] = Depends(set_user_from_query)):
    return storage.add_recurring(item.dict())

@router.put("/recurring/{item_id}", response_model=RecurringItem)
async def update_recurring(item_id: str, updates: RecurringItemCreate, uid: Optional[str] = Depends(set_user_from_query)):
    res = storage.update_recurring(item_id, updates.dict())
    if not res:
        raise HTTPException(status_code=404, detail="Item recorrente não encontrado")
    return res

@router.delete("/recurring/{item_id}")
async def delete_recurring(item_id: str, uid: Optional[str] = Depends(set_user_from_query)):
    if storage.delete_recurring(item_id):
        return {"success": True}
    raise HTTPException(status_code=404, detail="Item recorrente não encontrado")

@router.post("/recurring/process")
async def process_recurring(month: Optional[str] = None, uid: Optional[str] = Depends(set_user_from_query)):
    generated = recurring.process_recurring_items(month)
    return {"success": True, "generated_count": len(generated)}

# --- OVERDUE BILLS ---
@router.get("/bills", response_model=List[dict])
async def list_bills(uid: Optional[str] = Depends(set_user_from_query)):
    return storage.get_bills()

@router.post("/bills", response_model=OverdueBill)
async def create_bill(bill: OverdueBillCreate, uid: Optional[str] = Depends(set_user_from_query)):
    return storage.add_bill(bill.dict())

# --- TAGS ---
@router.get("/tags", response_model=List[Tag])
async def list_tags(uid: Optional[str] = Depends(set_user_from_query)):
    return tags.load_tags()

@router.get("/tags/sync")
async def sync_tags(uid: Optional[str] = Depends(set_user_from_query)):
    updated_tags = tags.sync_tags_from_transactions()
    return {"success": True, "message": "Tags sincronizadas com sucesso", "tags_count": len(updated_tags)}

@router.post("/tags", response_model=Tag)
async def create_tag(tag: TagCreate, uid: Optional[str] = Depends(set_user_from_query)):
    return tags.add_tag(tag.label, tag.color)

@router.delete("/tags/{tag_id}")
async def delete_tag(tag_id: str, uid: Optional[str] = Depends(set_user_from_query)):
    if tags.delete_tag(tag_id):
        return {"success": True}
    raise HTTPException(status_code=404, detail="Tag não encontrada")

# --- BUDGET ---
@router.get("/budget")
async def list_budgets(period: Optional[str] = None, uid: Optional[str] = Depends(set_user_from_query)):
    return budget.get_budgets_with_usage(period)

@router.get("/budget/summary")
async def get_budget_summary(period: Optional[str] = None, uid: Optional[str] = Depends(set_user_from_query)):
    return budget.get_budget_summary(period)

@router.post("/budget", response_model=Budget)
async def create_budget(item: BudgetCreate, uid: Optional[str] = Depends(set_user_from_query)):
    return storage.add_budget(item.dict())

@router.put("/budget/{budget_id}", response_model=Budget)
async def update_budget(budget_id: str, updates: BudgetCreate, uid: Optional[str] = Depends(set_user_from_query)):
    res = storage.update_budget(budget_id, updates.dict())
    if not res:
        raise HTTPException(status_code=404, detail="Orçamento não encontrado")
    return res

@router.delete("/budget/{budget_id}")
async def delete_budget(budget_id: str, uid: Optional[str] = Depends(set_user_from_query)):
    if storage.delete_budget(budget_id):
        return {"success": True}
    raise HTTPException(status_code=404, detail="Orçamento não encontrado")

# --- GOALS ---
@router.get("/goals")
async def list_goals(uid: Optional[str] = Depends(set_user_from_query)):
    return goals.get_goals_with_metrics()

@router.post("/goals", response_model=Goal)
async def create_goal(item: GoalCreate, uid: Optional[str] = Depends(set_user_from_query)):
    return storage.add_goal(item.dict())

@router.put("/goals/{goal_id}", response_model=Goal)
async def update_goal(goal_id: str, updates: GoalBase, uid: Optional[str] = Depends(set_user_from_query)):
    res = storage.update_goal(goal_id, updates.dict())
    if not res:
        raise HTTPException(status_code=404, detail="Meta não encontrada")
    return res

@router.delete("/goals/{goal_id}")
async def delete_goal(goal_id: str, uid: Optional[str] = Depends(set_user_from_query)):
    if storage.delete_goal(goal_id):
        return {"success": True}
    raise HTTPException(status_code=404, detail="Meta não encontrada")

# --- CREDIT CARDS ---
@router.get("/cards")
async def list_cards(uid: Optional[str] = Depends(set_user_from_query)):
    return credit_cards.get_cards_with_metrics()

@router.get("/cards/summary")
async def get_cards_summary(uid: Optional[str] = Depends(set_user_from_query)):
    return credit_cards.get_cards_summary()

@router.post("/cards", response_model=CreditCard)
async def create_card(item: CreditCardCreate, uid: Optional[str] = Depends(set_user_from_query)):
    return storage.add_card(item.dict())

@router.put("/cards/{card_id}", response_model=CreditCard)
async def update_card(card_id: str, updates: CreditCardBase, uid: Optional[str] = Depends(set_user_from_query)):
    res = storage.update_card(card_id, updates.dict())
    if not res:
        raise HTTPException(status_code=404, detail="Cartão não encontrado")
    return res

@router.delete("/cards/{card_id}")
async def delete_card(card_id: str, uid: Optional[str] = Depends(set_user_from_query)):
    if storage.delete_card(card_id):
        return {"success": True}
    raise HTTPException(status_code=404, detail="Cartão não encontrado")

# --- NOTIFICATIONS ---
@router.get("/notifications", response_model=List[Notification])
async def list_notifications(uid: Optional[str] = Depends(set_user_from_query)):
    return notifications.generate_notifications()

@router.post("/notifications/{notification_id}/read")
async def mark_notification_read(notification_id: str, uid: Optional[str] = Depends(set_user_from_query)):
    if storage.mark_notification_as_read(notification_id):
        return {"success": True}
    raise HTTPException(status_code=404, detail="Notificação não encontrada")

@router.delete("/notifications/clear")
async def clear_notifications(uid: Optional[str] = Depends(set_user_from_query)):
    storage.clear_notifications()
    return {"success": True}

# --- EXPORT & REPORTS ---
@router.get("/export/csv")
async def export_csv(uid: Optional[str] = Depends(set_user_from_query)):
    csv_data = export.export_transactions_csv()
    return StreamingResponse(
        io.StringIO(csv_data),
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=luna_transactions.csv"}
    )

@router.get("/export/json")
async def export_json(uid: Optional[str] = Depends(set_user_from_query)):
    json_data = export.export_full_report_json()
    return StreamingResponse(
        io.StringIO(json_data),
        media_type="application/json",
        headers={"Content-Disposition": "attachment; filename=luna_business_backup.json"}
    )

@router.get("/export/summary")
async def get_export_summary(uid: Optional[str] = Depends(set_user_from_query)):
    return export.get_report_summary()

# --- OVERDUE BILLS ---
@router.get("/bills")
async def get_bills(uid: Optional[str] = Depends(set_user_from_query)):
    return storage.get_bills()

@router.post("/bills")
async def add_bill(request: OverdueBillCreate, uid: Optional[str] = Depends(set_user_from_query)):
    return storage.add_bill(request.dict())

@router.put("/bills/{bill_id}")
async def update_bill(bill_id: str, request: OverdueBillCreate, uid: Optional[str] = Depends(set_user_from_query)):
    updated = storage.update_bill(bill_id, request.dict())
    if not updated:
        raise HTTPException(status_code=404, detail="Bill not found")
    return updated

@router.delete("/bills/{bill_id}")
async def delete_bill(bill_id: str, uid: Optional[str] = Depends(set_user_from_query)):
    if storage.delete_bill(bill_id):
        return {"success": True}
    raise HTTPException(status_code=404, detail="Bill not found")

@router.get("/bills/summary")
async def get_bills_summary(uid: Optional[str] = Depends(set_user_from_query)):
    return overdue.get_overdue_summary()

class PayBillRequest(BaseModel):
    credit_card_id: Optional[str] = None

@router.post("/bills/{bill_id}/pay")
async def pay_bill(bill_id: str, request: PayBillRequest, uid: Optional[str] = Depends(set_user_from_query)):
    tx = overdue.pay_bill_and_create_transaction(bill_id, request.credit_card_id)
    if not tx:
        raise HTTPException(status_code=400, detail="Could not pay bill (already paid or not found)")
    return tx

# --- AI INTELLIGENCE ---
class CategorizeRequest(BaseModel):
    description: str
    type: Literal['income', 'expense'] = 'expense'

@router.post("/ai/categorize")
async def categorize_description(request: CategorizeRequest, uid: Optional[str] = Depends(set_user_from_query)):
    category, confidence = ai.suggest_category(request.description, request.type)
    return {
        "category": category,
        "confidence": confidence
    }

# --- ANALYTICS ---
@router.get("/analytics")
async def get_analytics(uid: Optional[str] = Depends(set_user_from_query)):
    """Returns full analytics data: cashflow, categories, projections, metrics."""
    return analytics.get_full_analytics()

@router.get("/analytics/cashflow")
async def get_cashflow(months: int = 6, uid: Optional[str] = Depends(set_user_from_query)):
    return analytics.get_cash_flow_data(months)

@router.get("/analytics/categories")
async def get_categories(period: str = 'month', uid: Optional[str] = Depends(set_user_from_query)):
    return analytics.get_category_breakdown(period)

@router.get("/analytics/projections")
async def get_projections(uid: Optional[str] = Depends(set_user_from_query)):
    return analytics.get_projections()

@router.get("/analytics/metrics")
async def get_metrics(uid: Optional[str] = Depends(set_user_from_query)):
    return analytics.get_key_metrics()

# --- PERIODS ---
@router.get("/periods")
async def get_periods(uid: Optional[str] = Depends(set_user_from_query)):
    """Returns period metadata and available periods."""
    return {
        "metadata": periods.get_period_metadata(),
        "available_periods": periods.get_available_periods(),
        "current_period": periods.get_current_period()
    }

@router.get("/periods/history")
async def get_period_history(uid: Optional[str] = Depends(set_user_from_query)):
    """Returns historical period summaries."""
    metadata = periods.get_period_metadata()
    return metadata.get('history', [])

@router.post("/periods/transition")
async def force_transition(uid: Optional[str] = Depends(set_user_from_query)):
    """Force check and process any pending period transitions."""
    result = periods.check_and_process_transition()
    return result

# --- FIREBASE SYNC ---
@router.get("/sync/status")
async def get_sync_status(uid: Optional[str] = Depends(set_user_from_query)):
    """Get sync status for the current user."""
    if not uid:
        return {"error": "No user ID provided", "firebase_available": False}
    
    return {
        "uid": uid,
        "firebase_available": firebase_sync.is_firebase_available(),
        "metadata": firebase_sync.get_sync_metadata(uid),
        "legacy_data_exists": firebase_sync.check_legacy_data_exists(uid),
        "migration_complete": firebase_sync.is_migration_complete(uid)
    }

@router.post("/sync/push")
async def push_to_firebase(uid: Optional[str] = Depends(set_user_from_query)):
    """Push all local data to Firebase."""
    if not uid:
        raise HTTPException(400, "User ID required for sync")
    
    results = firebase_sync.sync_all_to_firebase(uid)
    return {"success": True, "synced": results}

@router.post("/sync/pull")
async def pull_from_firebase(uid: Optional[str] = Depends(set_user_from_query)):
    """Pull all data from Firebase to local."""
    if not uid:
        raise HTTPException(400, "User ID required for sync")
    
    results = firebase_sync.sync_all_from_firebase(uid)
    return {"success": True, "pulled": results}

@router.post("/sync/migrate")
async def migrate_legacy(uid: Optional[str] = Depends(set_user_from_query)):
    """Migrate legacy data for the user."""
    if not uid:
        raise HTTPException(400, "User ID required for migration")
    
    if not firebase_sync.check_legacy_data_exists(uid):
        return {"success": False, "message": "No legacy data found"}
    
    results = firebase_sync.migrate_legacy_data(uid)
    return {"success": True, "migrated": results}

# --- PIGGY BANKS (CAIXINHAS) ---
@router.get("/piggy-banks")
async def list_piggy_banks(uid: Optional[str] = Depends(set_user_from_query)):
    """List all piggy banks with metrics."""
    return piggy_banks.get_piggy_banks_with_metrics()

@router.get("/piggy-banks/summary")
async def get_piggy_banks_summary(uid: Optional[str] = Depends(set_user_from_query)):
    """Get summary of all piggy banks."""
    return piggy_banks.get_piggy_bank_summary()

@router.post("/piggy-banks", response_model=PiggyBank)
async def create_piggy_bank(item: PiggyBankCreate, uid: Optional[str] = Depends(set_user_from_query)):
    """Create a new piggy bank."""
    result = storage.add_piggy_bank(item.dict())
    if uid:
        firebase_sync.auto_sync_collection(uid, 'piggy_banks')
    return result

@router.put("/piggy-banks/{piggy_bank_id}", response_model=PiggyBank)
async def update_piggy_bank(piggy_bank_id: str, updates: PiggyBankBase, uid: Optional[str] = Depends(set_user_from_query)):
    """Update a piggy bank."""
    res = storage.update_piggy_bank(piggy_bank_id, updates.dict())
    if not res:
        raise HTTPException(status_code=404, detail="Caixinha não encontrada")
    if uid:
        firebase_sync.auto_sync_collection(uid, 'piggy_banks')
    return res

@router.delete("/piggy-banks/{piggy_bank_id}")
async def delete_piggy_bank(piggy_bank_id: str, uid: Optional[str] = Depends(set_user_from_query)):
    """Delete a piggy bank."""
    if storage.delete_piggy_bank(piggy_bank_id):
        if uid:
            firebase_sync.auto_sync_collection(uid, 'piggy_banks')
        return {"success": True}
    raise HTTPException(status_code=404, detail="Caixinha não encontrada")

@router.get("/piggy-banks/{piggy_bank_id}/transactions")
async def list_piggy_bank_transactions(piggy_bank_id: str, uid: Optional[str] = Depends(set_user_from_query)):
    """List transactions for a specific piggy bank."""
    return storage.get_piggy_bank_transactions(piggy_bank_id)

@router.post("/piggy-banks/{piggy_bank_id}/deposit")
async def deposit_to_piggy_bank(
    piggy_bank_id: str,
    request: dict,
    uid: Optional[str] = Depends(set_user_from_query)
):
    """Deposit money into a piggy bank."""
    amount = request.get('amount')
    description = request.get('description')
    if not amount or amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    try:
        result = piggy_banks.deposit_to_piggy_bank(piggy_bank_id, float(amount), description)
        if uid:
            firebase_sync.auto_sync_collection(uid, 'piggy_banks')
            firebase_sync.auto_sync_collection(uid, 'piggy_bank_transactions')
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.post("/piggy-banks/{piggy_bank_id}/withdraw")
async def withdraw_from_piggy_bank(
    piggy_bank_id: str,
    request: dict,
    uid: Optional[str] = Depends(set_user_from_query)
):
    """Withdraw money from a piggy bank."""
    amount = request.get('amount')
    description = request.get('description')
    if not amount or amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be positive")
    try:
        result = piggy_banks.withdraw_from_piggy_bank(piggy_bank_id, float(amount), description)
        if uid:
            firebase_sync.auto_sync_collection(uid, 'piggy_banks')
            firebase_sync.auto_sync_collection(uid, 'piggy_bank_transactions')
        return result
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@router.delete("/piggy-banks/transactions/{transaction_id}")
async def delete_piggy_bank_transaction(transaction_id: str, uid: Optional[str] = Depends(set_user_from_query)):
    """Delete a piggy bank transaction."""
    if storage.delete_piggy_bank_transaction(transaction_id):
        if uid:
            firebase_sync.auto_sync_collection(uid, 'piggy_banks')
            firebase_sync.auto_sync_collection(uid, 'piggy_bank_transactions')
        return {"success": True}
    raise HTTPException(status_code=404, detail="Transação não encontrada")
