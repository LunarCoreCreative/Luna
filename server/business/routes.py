"""
Luna Business Routes
--------------------
REST API endpoints for business management.
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from pydantic import BaseModel
from typing import Optional, List, Dict, Any
from datetime import datetime
from .error_handler import handle_business_errors, format_error_message
from .backup import export_all_data, import_backup_data, validate_backup_data
from .notifications import get_notifications, get_notification_count
from .integrity import verify_data_integrity
from .export import export_to_csv, export_to_excel_json, export_full_report_json
from .goals import (
    load_goals,
    add_goal,
    update_goal,
    delete_goal,
    get_goals_summary
)
from .ai_categorization import suggest_category, auto_categorize_transaction, learn_from_correction
from .budget import (
    load_budget,
    add_budget,
    update_budget,
    delete_budget,
    get_budget_summary
)
from .credit_cards import (
    load_credit_cards,
    add_credit_card,
    update_credit_card,
    delete_credit_card,
    pay_credit_card_bill,
    get_credit_cards_summary
)

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
    credit_card_id: Optional[str] = None  # ID do cartão de crédito (se aplicável)
    interest_rate: Optional[float] = None  # Taxa de juros anual (%) - apenas para investimentos
    investment_type: Optional[str] = None  # "investment" (investimento real) ou "savings" (caixinha/poupança)

class TransactionUpdate(BaseModel):
    type: Optional[str] = None
    value: Optional[float] = None
    description: Optional[str] = None
    category: Optional[str] = None
    date: Optional[str] = None  # formato YYYY-MM-DD
    user_id: Optional[str] = None
    credit_card_id: Optional[str] = None
    interest_rate: Optional[float] = None
    investment_type: Optional[str] = None

class ClientCreate(BaseModel):
    name: str
    contact: Optional[str] = ""
    notes: Optional[str] = ""
    user_id: Optional[str] = None

# =============================================================================
# TRANSACTION ENDPOINTS
# =============================================================================

@router.get("/transactions")
@handle_business_errors
async def get_transactions(user_id: str = "local", limit: int = 500, period: Optional[str] = None):
    """Get all transactions for a user. If period is provided (YYYY-MM), filters by that period."""
    try:
        if period:
            from .periods import get_transactions_by_period
            transactions = get_transactions_by_period(user_id, period)
            # Quando há período, não limita (ou limita com valor alto) para garantir todas as transações do período
            return {"transactions": transactions[:limit] if limit > 0 else transactions}
        
        transactions = load_transactions(user_id)
        # Sort by date descending and limit
        transactions.sort(key=lambda x: x.get("date", ""), reverse=True)
        return {"transactions": transactions[:limit] if limit > 0 else transactions}
    except Exception as e:
        print(f"[BUSINESS-ROUTES] Erro ao buscar transações: {e}")
        raise HTTPException(500, format_error_message("buscar transações", str(e)))

@router.post("/transactions")
@handle_business_errors
async def create_transaction(tx: TransactionCreate):
    """Create a new transaction."""
    from .validation import (
        validate_value,
        validate_description,
        validate_transaction_type,
        validate_category
    )
    
    # Valida tipo
    is_valid_type, type_error = validate_transaction_type(tx.type)
    if not is_valid_type:
        raise HTTPException(400, type_error)
    
    # Valida e converte valor
    is_valid_value, value, value_error = validate_value(tx.value, "value")
    if not is_valid_value:
        raise HTTPException(400, value_error)
    
    # Valida descrição
    is_valid_desc, description, desc_error = validate_description(tx.description)
    if not is_valid_desc:
        raise HTTPException(400, desc_error)
    
    # Valida categoria ou sugere automaticamente
    user_id = tx.user_id or "local"
    
    if not tx.category or tx.category == "geral":
        # Tenta categorização automática se categoria não fornecida
        suggested_category = auto_categorize_transaction(
            user_id, 
            tx.description, 
            tx.type,
            min_confidence=0.5
        )
        if suggested_category:
            tx.category = suggested_category
            print(f"[BUSINESS-ROUTES] 🤖 Categoria sugerida automaticamente: '{suggested_category}' para '{tx.description}'")
    
    # Valida categoria
    is_valid_cat, category, cat_error = validate_category(tx.category)
    if not is_valid_cat:
        raise HTTPException(400, cat_error)
    
    # Valida data se fornecida
    if tx.date:
        from .date_utils import validate_date_format
        is_valid, error = validate_date_format(tx.date)
        if not is_valid:
            raise HTTPException(400, f"Invalid date format: {error}")
    
    # Ensure tag exists for this category
    if category:
        get_or_create_tag(user_id, category)
    
    try:
        new_tx = add_transaction(
            user_id=user_id,
            type=tx.type,
            value=value,  # Já validado e convertido para float
            description=description,  # Já validado e limpo
            category=category,  # Já validado e limpo
            date=tx.date,
            credit_card_id=tx.credit_card_id,
            interest_rate=tx.interest_rate if tx.type == "investment" else None,
            investment_type=tx.investment_type if tx.type == "investment" else None
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
@handle_business_errors
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
        from .validation import validate_value, validate_description, validate_category
        is_valid_value, value, value_error = validate_value(tx.value, "value")
        if not is_valid_value:
            raise HTTPException(400, value_error)
        updates["value"] = value
    
    if tx.description is not None:
        is_valid_desc, description, desc_error = validate_description(tx.description)
        if not is_valid_desc:
            raise HTTPException(400, desc_error)
        updates["description"] = description
    
    if tx.category is not None:
        is_valid_cat, category, cat_error = validate_category(tx.category)
        if not is_valid_cat:
            raise HTTPException(400, cat_error)
        updates["category"] = category
    if tx.category is not None:
        updates["category"] = tx.category
        # Ensure tag exists for this category
        if tx.category:
            get_or_create_tag(user_id, tx.category)
    if tx.date is not None:
        # Valida formato de data antes de atualizar
        from .date_utils import validate_date_format
        is_valid, error = validate_date_format(tx.date)
        if not is_valid:
            raise HTTPException(400, f"Invalid date format: {error}")
        updates["date"] = tx.date
    
    if tx.credit_card_id is not None:
        updates["credit_card_id"] = tx.credit_card_id if tx.credit_card_id else None
    
    if tx.type == "investment":
        if tx.interest_rate is not None:
            updates["interest_rate"] = float(tx.interest_rate)
        if tx.investment_type is not None:
            updates["investment_type"] = tx.investment_type
    elif tx.type is not None and tx.type != "investment":
        # Se mudou de investment para outro tipo, remove campos de investimento
        updates["interest_rate"] = None
        updates["investment_type"] = None
    
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
@handle_business_errors
async def remove_transaction(tx_id: str, user_id: str = "local"):
    """Delete a transaction."""
    deleted = delete_transaction(user_id, tx_id)
    if not deleted:
        raise HTTPException(404, "Transaction not found")
    return {"success": True, "deleted_id": tx_id}

@router.get("/summary")
@handle_business_errors
async def get_business_summary(user_id: str = "local", period: Optional[str] = None):
    """
    Get financial summary. 
    If period is provided (YYYY-MM), returns income/expenses/invested for that period,
    but balance and net_worth are always the total (not filtered by period).
    """
    try:
        # Always get total summary for balance and net_worth
        total_summary = get_summary(user_id)
        
        if period:
            # Get period-specific values for income/expenses/invested
            from .periods import get_period_summary
            period_summary = get_period_summary(user_id, period)
            
            # Combine: period-specific income/expenses/invested, but total balance/net_worth
            summary = {
                "balance": total_summary["balance"],  # Always total
                "net_worth": total_summary["net_worth"],  # Always total
                "income": period_summary["income"],  # Period-specific
                "expenses": period_summary["expenses"],  # Period-specific
                "invested": period_summary["invested"],  # Period-specific
                "transaction_count": period_summary["transaction_count"],
                "period": period
            }
        else:
            summary = total_summary
        
        clients = load_clients(user_id)
        summary["clients"] = len(clients)
        return summary
    except Exception as e:
        print(f"[BUSINESS-ROUTES] Erro ao buscar resumo: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, format_error_message("buscar resumo financeiro", str(e)))

# =============================================================================
# CLIENT ENDPOINTS
# =============================================================================

@router.get("/clients")
@handle_business_errors
async def get_clients(user_id: str = "local", query: str = None):
    """Get all clients or search by name."""
    try:
        if query:
            clients = search_clients(user_id, query)
        else:
            clients = load_clients(user_id)
        return {"clients": clients}
    except Exception as e:
        print(f"[BUSINESS-ROUTES] Erro ao buscar clientes: {e}")
        raise HTTPException(500, format_error_message("buscar clientes", str(e)))

@router.post("/clients")
@handle_business_errors
async def create_client(client: ClientCreate):
    """Create a new client."""
    try:
        if not client.name or not client.name.strip():
            raise HTTPException(400, "Nome do cliente é obrigatório")
        
        user_id = client.user_id or "local"
        new_client = add_client(
            user_id=user_id,
            name=client.name.strip(),
            contact=client.contact or "",
            notes=client.notes or ""
        )
        print(f"[BUSINESS-ROUTES] ✅ Cliente criado: {new_client['id']} - {new_client['name']}")
        return {"success": True, "client": new_client}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao criar cliente: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, format_error_message("criar cliente", str(e)))

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
    credit_card_id: Optional[str] = None  # ID do cartão de crédito (se aplicável)

@router.get("/recurring-items")
@handle_business_errors
async def get_recurring_items(user_id: str = "local"):
    """Get all recurring rules."""
    try:
        print(f"[BUSINESS] GET /recurring-items user_id={user_id}")
        items = load_recurring(user_id)
        return {"items": items}
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao buscar itens recorrentes: {e}")
        raise HTTPException(500, format_error_message("buscar itens recorrentes", str(e)))

@router.post("/recurring-items")
@handle_business_errors
async def create_recurring_item(item: RecurringCreate):
    """Create a new recurring rule."""
    try:
        print(f"[BUSINESS] POST /recurring-items {item}")
        if item.type not in ["income", "expense"]:
            raise HTTPException(400, "Tipo deve ser 'income' ou 'expense'")
        if item.day_of_month < 1 or item.day_of_month > 31:
            raise HTTPException(400, "Dia do mês deve ser entre 1 e 31")
        
        # Valida valor
        from .validation import validate_value
        is_valid, value, error = validate_value(item.value, "value")
        if not is_valid:
            raise HTTPException(400, error)
        
        user_id = item.user_id or "local"
        new_item = add_recurring_item(
            user_id=user_id,
            title=item.title.strip(),
            value=value,
            type=item.type,
            day_of_month=item.day_of_month,
            category=item.category or "fixo",
            credit_card_id=item.credit_card_id
        )
        print(f"[BUSINESS-ROUTES] ✅ Item recorrente criado: {new_item['id']} - {new_item['title']}")
        return {"success": True, "item": new_item}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao criar item recorrente: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, format_error_message("criar item recorrente", str(e)))

@router.delete("/recurring-items/{item_id}")
@handle_business_errors
async def remove_recurring_item(item_id: str, user_id: str = "local"):
    """Delete a recurring rule."""
    try:
        if delete_recurring_item(user_id, item_id):
            print(f"[BUSINESS-ROUTES] ✅ Item recorrente removido: {item_id}")
            return {"success": True}
        raise HTTPException(404, f"Item recorrente '{item_id}' não encontrado")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao remover item recorrente: {e}")
        raise HTTPException(500, format_error_message("remover item recorrente", str(e)))

@router.post("/recurring-items/process")
@handle_business_errors
async def process_recurring_items_endpoint(user_id: str = "local", month: Optional[str] = None):
    """Generate transactions from recurring rules."""
    try:
        generated = process_recurring_items(user_id, month)
        print(f"[BUSINESS-ROUTES] ✅ Processados {len(generated)} itens recorrentes")
        return {"success": True, "generated_count": len(generated), "transactions": generated}
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao processar itens recorrentes: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, format_error_message("processar itens recorrentes", str(e)))

# =============================================================================
# TAG ENDPOINTS
# =============================================================================

from .tags import load_tags, add_tag, delete_tag, get_or_create_tag, sync_tags_from_transactions

class TagCreate(BaseModel):
    label: str
    color: Optional[str] = None
    user_id: Optional[str] = None

@router.get("/tags")
@handle_business_errors
async def get_tags_endpoint(user_id: str = "local"):
    """Get all tags. Also syncs tags from existing transactions."""
    try:
        # Sync tags from existing transactions to ensure all categories have tags
        transactions = load_transactions(user_id)
        sync_tags_from_transactions(user_id, transactions)
        tags = load_tags(user_id)
        return {"tags": tags}
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao buscar tags: {e}")
        raise HTTPException(500, format_error_message("buscar tags", str(e)))

@router.post("/tags")
@handle_business_errors
async def create_tag_endpoint(tag: TagCreate):
    """Create a new tag."""
    try:
        if not tag.label or not tag.label.strip():
            raise HTTPException(400, "Label é obrigatório")
        
        user_id = tag.user_id or "local"
        new_tag = add_tag(user_id, tag.label.strip(), tag.color)
        print(f"[BUSINESS-ROUTES] ✅ Tag criada: {new_tag['id']} - {new_tag['label']}")
        return {"success": True, "tag": new_tag}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao criar tag: {e}")
        raise HTTPException(500, format_error_message("criar tag", str(e)))

@router.delete("/tags/{tag_id}")
@handle_business_errors
async def delete_tag_endpoint(tag_id: str, user_id: str = "local"):
    """Delete a tag."""
    try:
        if delete_tag(user_id, tag_id):
            print(f"[BUSINESS-ROUTES] ✅ Tag removida: {tag_id}")
            return {"success": True}
        raise HTTPException(404, f"Tag '{tag_id}' não encontrada ou é tag padrão")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao remover tag: {e}")
        raise HTTPException(500, format_error_message("remover tag", str(e)))

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
@handle_business_errors
async def get_overdue_bills(user_id: str = "local", status: Optional[str] = None):
    """Get all overdue/pending bills, optionally filtered by status."""
    bills = load_overdue(user_id)
    if status:
        bills = [b for b in bills if b.get("status") == status]
    return {"bills": bills}

@router.post("/overdue-bills")
@handle_business_errors
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
@handle_business_errors
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
@handle_business_errors
async def delete_overdue_bill_endpoint(bill_id: str, user_id: str = "local"):
    """Delete an overdue bill."""
    deleted = storage_delete_overdue_bill(user_id, bill_id)
    if not deleted:
        raise HTTPException(404, "Bill not found")
    return {"success": True, "deleted_id": bill_id}

@router.post("/overdue-bills/{bill_id}/pay")
@handle_business_errors
async def pay_overdue_bill_endpoint(bill_id: str, user_id: str = "local", payment_date: Optional[str] = None):
    """Mark a bill as paid and create corresponding expense transaction."""
    result = storage_pay_bill_and_create_transaction(user_id, bill_id, payment_date)
    if not result:
        raise HTTPException(404, "Bill not found or already paid")
    return {"success": True, "bill": result}

@router.get("/overdue-bills/summary")
@handle_business_errors
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
@handle_business_errors
async def get_periods_endpoint(user_id: str = "local"):
    """Get list of all available periods (months with transactions)."""
    try:
        periods = get_periods_list(user_id)
        current = get_current_period()
        return {
            "periods": periods,
            "current_period": current
        }
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao buscar períodos: {e}")
        raise HTTPException(500, format_error_message("buscar períodos", str(e)))

@router.get("/periods/{period}/summary")
@handle_business_errors
async def get_period_summary_endpoint(period: str, user_id: str = "local"):
    """Get summary for a specific period (YYYY-MM)."""
    try:
        # Valida formato do período
        if len(period) != 7 or period[4] != '-':
            raise HTTPException(400, f"Formato de período inválido. Use YYYY-MM (ex: 2025-01)")
        
        summary = periods_get_period_summary(user_id, period)
        clients = load_clients(user_id)
        summary["clients"] = len(clients)
        return summary
    except HTTPException:
        raise
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao buscar resumo do período {period}: {e}")
        raise HTTPException(500, format_error_message(f"buscar resumo do período {period}", str(e)))

@router.post("/periods/{period}/close")
@handle_business_errors
async def close_period_endpoint(period: str, user_id: str = "local"):
    """Close a period by calculating and saving its summary."""
    try:
        # Valida formato do período
        if len(period) != 7 or period[4] != '-':
            raise HTTPException(400, f"Formato de período inválido. Use YYYY-MM (ex: 2025-01)")
        
        summary = periods_close_period(user_id, period)
        print(f"[BUSINESS-ROUTES] ✅ Período {period} fechado com sucesso")
        return {"success": True, "summary": summary}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao fechar período {period}: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, format_error_message(f"fechar período {period}", str(e)))

@router.get("/periods/{period}/transactions")
@handle_business_errors
async def get_period_transactions_endpoint(period: str, user_id: str = "local", limit: int = 100):
    """Get all transactions for a specific period (YYYY-MM)."""
    try:
        # Valida formato do período
        if len(period) != 7 or period[4] != '-':
            raise HTTPException(400, f"Formato de período inválido. Use YYYY-MM (ex: 2025-01)")
        
        transactions = get_transactions_by_period(user_id, period)
        return {"transactions": transactions[:limit]}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao buscar transações do período {period}: {e}")
        raise HTTPException(500, format_error_message(f"buscar transações do período {period}", str(e)))

# =============================================================================
# SYNC ENDPOINTS
# =============================================================================

from .sync import (
    reconcile_transactions,
    verify_integrity,
    get_sync_logs
)

@router.post("/sync/reconcile")
@handle_business_errors
async def reconcile_transactions_endpoint(user_id: str = "local", force: bool = False):
    """
    Verifica integridade das transações no Firebase.
    (Não há mais storage local - app funciona apenas online)
    
    Args:
        user_id: ID do usuário (Firebase UID)
        force: Ignorado (mantido para compatibilidade)
    """
    try:
        result = reconcile_transactions(user_id, force=force)
        return {
            "success": result.success,
            "local_count": result.local_count,
            "firebase_count": result.firebase_count,
            "synced_count": result.synced_count,
            "conflicts_count": len(result.conflicts),
            "errors_count": len(result.errors),
            "duration_ms": result.duration_ms,
            "conflicts": result.conflicts[:10],  # Limita a 10 para não sobrecarregar
            "errors": result.errors[:10]  # Limita a 10
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Erro na reconciliação: {str(e)}")

@router.get("/sync/integrity")
@handle_business_errors
async def verify_integrity_endpoint(user_id: str = "local"):
    """
    Verifica integridade dos dados no Firebase (app funciona apenas online).
    
    Returns:
        Status de integridade e detalhes de inconsistências
    """
    try:
        result = verify_integrity(user_id)
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Erro na verificação: {str(e)}")

@router.get("/sync/logs")
@handle_business_errors
async def get_sync_logs_endpoint(user_id: str = "local", limit: int = 50):
    """
    Retorna logs de sincronização recentes.
    
    Args:
        user_id: ID do usuário
        limit: Número máximo de logs a retornar
    """
    try:
        logs = get_sync_logs(user_id, limit=limit)
        return {"logs": logs, "count": len(logs)}
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Erro ao carregar logs: {str(e)}")

# =============================================================================
# DUPLICATE DETECTION ENDPOINTS
# =============================================================================

from .duplicate_detector import (
    find_all_duplicates,
    remove_duplicates,
    check_duplicate
)

@router.get("/duplicates")
@handle_business_errors
async def get_duplicates_endpoint(user_id: str = "local"):
    """
    Retorna todas as transações duplicadas encontradas.
    
    Args:
        user_id: ID do usuário
    """
    try:
        duplicates = find_all_duplicates(user_id, check_firebase=True)
        return {
            "duplicates": duplicates,
            "count": len(duplicates),
            "total_duplicate_transactions": sum(g["count"] - 1 for g in duplicates)
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Erro ao buscar duplicatas: {str(e)}")

@router.post("/duplicates/remove")
@handle_business_errors
async def remove_duplicates_endpoint(
    user_id: str = "local",
    keep_oldest: bool = True,
    dry_run: bool = False
):
    """
    Remove transações duplicadas.
    
    Args:
        user_id: ID do usuário
        keep_oldest: Se True, mantém a transação mais antiga. Se False, mantém a mais recente.
        dry_run: Se True, apenas simula sem remover
    """
    try:
        result = remove_duplicates(user_id, keep_oldest=keep_oldest, dry_run=dry_run)
        return {
            "success": True,
            **result
        }
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(500, f"Erro ao remover duplicatas: {str(e)}")

# =============================================================================
# BACKUP AND RESTORE ENDPOINTS
# =============================================================================

class BackupImportRequest(BaseModel):
    backup_data: Dict[str, Any]
    merge: Optional[bool] = False

@router.get("/backup/export")
@handle_business_errors
async def export_backup_endpoint(user_id: str = "local"):
    """
    Exporta todos os dados do usuário em formato JSON.
    
    Returns:
        JSON com todos os dados do usuário
    """
    try:
        backup_data = export_all_data(user_id)
        return backup_data
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao exportar backup: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, format_error_message("exportar backup", str(e)))

@router.post("/backup/import")
@handle_business_errors
async def import_backup_endpoint(request: BackupImportRequest, user_id: str = "local"):
    """
    Importa dados de backup.
    
    Args:
        request: Dados do backup e opções de importação
        user_id: ID do usuário para importar
    
    Returns:
        Resultado da importação
    """
    try:
        merge = request.merge if request.merge is not None else False
        result = import_backup_data(user_id, request.backup_data, merge=merge)
        print(f"[BUSINESS-ROUTES] ✅ Backup importado com sucesso: {result['imported']}")
        return result
    except ValueError as e:
        # Erro de validação
        raise HTTPException(400, str(e))
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao importar backup: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, format_error_message("importar backup", str(e)))

@router.post("/backup/validate")
@handle_business_errors
async def validate_backup_endpoint(request: BackupImportRequest):
    """
    Valida estrutura de dados de backup sem importar.
    
    Args:
        request: Dados do backup a validar
    
    Returns:
        Resultado da validação
    """
    try:
        is_valid, error = validate_backup_data(request.backup_data)
        if is_valid:
            metadata = request.backup_data.get("metadata", {})
            return {
                "valid": True,
                "metadata": metadata
            }
        else:
            return {
                "valid": False,
                "error": error
            }
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao validar backup: {e}")
        raise HTTPException(500, format_error_message("validar backup", str(e)))

# =============================================================================
# NOTIFICATIONS ENDPOINTS
# =============================================================================

@router.get("/notifications")
@handle_business_errors
async def get_notifications_endpoint(user_id: str = "local"):
    """
    Retorna todas as notificações ativas para o usuário.
    
    Returns:
        Lista de notificações ordenadas por prioridade
    """
    try:
        notifications = get_notifications(user_id)
        return {
            "notifications": notifications,
            "count": len(notifications)
        }
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao buscar notificações: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, format_error_message("buscar notificações", str(e)))

@router.get("/notifications/count")
@handle_business_errors
async def get_notification_count_endpoint(user_id: str = "local"):
    """
    Retorna contagem de notificações por tipo e prioridade.
    
    Returns:
        Dicionário com contagens de notificações
    """
    try:
        counts = get_notification_count(user_id)
        return counts
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao contar notificações: {e}")
        raise HTTPException(500, format_error_message("contar notificações", str(e)))

# =============================================================================
# DATA INTEGRITY ENDPOINTS
# =============================================================================

@router.get("/integrity/verify")
@handle_business_errors
async def verify_integrity_endpoint(user_id: str = "local"):
    """
    Verifica integridade de todos os dados do usuário.
    
    Returns:
        Resultado da verificação de integridade
    """
    try:
        result = verify_data_integrity(user_id)
        return result
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao verificar integridade: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, format_error_message("verificar integridade", str(e)))

# =============================================================================
# EXPORT ENDPOINTS
# =============================================================================

@router.get("/export/csv")
@handle_business_errors
async def export_csv_endpoint(user_id: str = "local", period: Optional[str] = None):
    """
    Exporta transações para CSV.
    
    Args:
        user_id: ID do usuário
        period: Período opcional (YYYY-MM)
    
    Returns:
        Arquivo CSV para download
    """
    try:
        csv_content = export_to_csv(user_id, period)
        filename = f"transacoes_{period or 'all'}_{datetime.now().strftime('%Y%m%d')}.csv"
        
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={filename}",
                "Content-Type": "text/csv; charset=utf-8"
            }
        )
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao exportar CSV: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, format_error_message("exportar CSV", str(e)))

@router.get("/export/excel")
@handle_business_errors
async def export_excel_endpoint(user_id: str = "local", period: Optional[str] = None):
    """
    Exporta dados para formato JSON compatível com Excel.
    
    Args:
        user_id: ID do usuário
        period: Período opcional (YYYY-MM)
    
    Returns:
        JSON formatado para Excel
    """
    try:
        excel_data = export_to_excel_json(user_id, period)
        return excel_data
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao exportar Excel: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, format_error_message("exportar Excel", str(e)))

@router.get("/export/report")
@handle_business_errors
async def export_report_endpoint(user_id: str = "local", period: Optional[str] = None):
    """
    Exporta relatório completo em formato JSON.
    
    Args:
        user_id: ID do usuário
        period: Período opcional (YYYY-MM)
    
    Returns:
        Relatório completo em JSON
    """
    try:
        report = export_full_report_json(user_id, period)
        return report
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao exportar relatório: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, format_error_message("exportar relatório", str(e)))

# =============================================================================
# GOALS ENDPOINTS
# =============================================================================

class GoalCreate(BaseModel):
    title: str
    target_amount: float
    target_date: Optional[str] = None
    goal_type: Optional[str] = "savings"  # "savings", "expense_reduction", "income_increase"
    description: Optional[str] = None
    user_id: Optional[str] = None

class GoalUpdate(BaseModel):
    title: Optional[str] = None
    target_amount: Optional[float] = None
    target_date: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    user_id: Optional[str] = None

@router.get("/goals")
@handle_business_errors
async def get_goals_endpoint(user_id: str = "local"):
    """
    Get all financial goals.
    
    Returns:
        List of goals with progress
    """
    try:
        goals = load_goals(user_id)
        return {"goals": goals}
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao buscar metas: {e}")
        raise HTTPException(500, format_error_message("buscar metas", str(e)))

@router.post("/goals")
@handle_business_errors
async def create_goal_endpoint(goal: GoalCreate):
    """
    Create a new financial goal.
    
    Returns:
        Created goal
    """
    try:
        # Validate goal type
        valid_types = ["savings", "expense_reduction", "income_increase"]
        goal_type = goal.goal_type or "savings"
        if goal_type not in valid_types:
            raise HTTPException(400, f"Tipo de meta inválido. Deve ser um de: {', '.join(valid_types)}")
        
        # Validate target amount
        from .validation import validate_value
        is_valid, target_amount, error = validate_value(goal.target_amount, "target_amount")
        if not is_valid:
            raise HTTPException(400, error)
        
        user_id = goal.user_id or "local"
        new_goal = add_goal(
            user_id=user_id,
            title=goal.title,
            target_amount=target_amount,
            target_date=goal.target_date,
            goal_type=goal_type,
            description=goal.description
        )
        
        print(f"[BUSINESS-ROUTES] ✅ Meta criada: {new_goal['id']} - {new_goal['title']}")
        return {"success": True, "goal": new_goal}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao criar meta: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, format_error_message("criar meta", str(e)))

@router.put("/goals/{goal_id}")
@handle_business_errors
async def update_goal_endpoint(goal_id: str, goal: GoalUpdate):
    """
    Update an existing goal.
    
    Returns:
        Updated goal
    """
    try:
        user_id = goal.user_id or "local"
        
        # Validate status if provided
        if goal.status and goal.status not in ["active", "completed", "cancelled"]:
            raise HTTPException(400, "Status inválido. Deve ser: active, completed ou cancelled")
        
        updated_goal = update_goal(
            user_id=user_id,
            goal_id=goal_id,
            title=goal.title,
            target_amount=goal.target_amount,
            target_date=goal.target_date,
            description=goal.description,
            status=goal.status
        )
        
        if not updated_goal:
            raise HTTPException(404, f"Meta '{goal_id}' não encontrada")
        
        print(f"[BUSINESS-ROUTES] ✅ Meta atualizada: {goal_id}")
        return {"success": True, "goal": updated_goal}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao atualizar meta: {e}")
        raise HTTPException(500, format_error_message("atualizar meta", str(e)))

@router.delete("/goals/{goal_id}")
@handle_business_errors
async def delete_goal_endpoint(goal_id: str, user_id: str = "local"):
    """
    Delete a goal.
    
    Returns:
        Success status
    """
    try:
        if delete_goal(user_id, goal_id):
            print(f"[BUSINESS-ROUTES] ✅ Meta removida: {goal_id}")
            return {"success": True}
        raise HTTPException(404, f"Meta '{goal_id}' não encontrada")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao remover meta: {e}")
        raise HTTPException(500, format_error_message("remover meta", str(e)))

@router.get("/goals/summary")
@handle_business_errors
async def get_goals_summary_endpoint(user_id: str = "local"):
    """
    Get summary of all goals.
    
    Returns:
        Goals summary
    """
    try:
        summary = get_goals_summary(user_id)
        return summary
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao buscar resumo de metas: {e}")
        raise HTTPException(500, format_error_message("buscar resumo de metas", str(e)))

# =============================================================================
# AI CATEGORIZATION ENDPOINTS
# =============================================================================

@router.post("/ai/suggest-category")
@handle_business_errors
async def suggest_category_endpoint(
    description: str,
    transaction_type: str = "expense",
    user_id: str = "local"
):
    """
    Sugere categoria baseada na descrição usando IA e histórico.
    
    Args:
        description: Descrição da transação
        transaction_type: Tipo de transação (income, expense, investment)
        user_id: ID do usuário
    
    Returns:
        Categoria sugerida com confiança
    """
    try:
        suggested_category, confidence = suggest_category(user_id, description, transaction_type)
        return {
            "suggested_category": suggested_category,
            "confidence": round(confidence, 2),
            "description": description,
            "transaction_type": transaction_type
        }
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao sugerir categoria: {e}")
        raise HTTPException(500, format_error_message("sugerir categoria", str(e)))

@router.post("/ai/learn-correction")
@handle_business_errors
async def learn_correction_endpoint(
    description: str,
    category: str,
    transaction_type: str = "expense",
    user_id: str = "local"
):
    """
    Registra correção manual de categoria para aprendizado.
    
    Args:
        description: Descrição da transação
        category: Categoria corrigida
        transaction_type: Tipo de transação
        user_id: ID do usuário
    
    Returns:
        Success status
    """
    try:
        learn_from_correction(user_id, description, category, transaction_type)
        return {"success": True, "message": "Correção registrada para aprendizado"}
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao registrar correção: {e}")
        raise HTTPException(500, format_error_message("registrar correção", str(e)))

# =============================================================================
# BUDGET ENDPOINTS
# =============================================================================

class BudgetCreate(BaseModel):
    category: str
    amount: float
    period: str  # YYYY-MM
    budget_type: Optional[str] = "expense"  # "expense" or "income"
    user_id: Optional[str] = None

class BudgetUpdate(BaseModel):
    amount: Optional[float] = None
    category: Optional[str] = None
    user_id: Optional[str] = None

class CreditCardCreate(BaseModel):
    user_id: Optional[str] = "local"
    name: str
    limit: float
    due_day: int = 10  # Day of month (1-31)
    last_four: Optional[str] = None
    brand: Optional[str] = None  # visa, mastercard, etc.
    color: Optional[str] = None
    notes: Optional[str] = None

class CreditCardUpdate(BaseModel):
    user_id: Optional[str] = "local"
    name: Optional[str] = None
    limit: Optional[float] = None
    due_day: Optional[int] = None
    last_four: Optional[str] = None
    brand: Optional[str] = None
    color: Optional[str] = None
    status: Optional[str] = None  # active, blocked, cancelled
    notes: Optional[str] = None

class CreditCardPayment(BaseModel):
    user_id: Optional[str] = "local"
    amount: float
    payment_date: Optional[str] = None  # ISO format

@router.get("/budget")
@handle_business_errors
async def get_budget_endpoint(user_id: str = "local", period: Optional[str] = None):
    """
    Get all budget entries, optionally filtered by period.
    
    Returns:
        List of budget entries with actual spending
    """
    try:
        budgets = load_budget(user_id)
        
        if period:
            budgets = [b for b in budgets if b.get("period") == period]
        
        return {"budgets": budgets}
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao buscar orçamento: {e}")
        raise HTTPException(500, format_error_message("buscar orçamento", str(e)))

@router.post("/budget")
@handle_business_errors
async def create_budget_endpoint(budget: BudgetCreate):
    """
    Create or update a budget entry.
    
    Returns:
        Created/updated budget
    """
    try:
        # Validate budget type
        if budget.budget_type not in ["expense", "income"]:
            raise HTTPException(400, "Tipo de orçamento deve ser 'expense' ou 'income'")
        
        # Validate period format
        if len(budget.period) != 7 or budget.period[4] != '-':
            raise HTTPException(400, "Formato de período inválido. Use YYYY-MM (ex: 2025-01)")
        
        # Validate amount
        from .validation import validate_value
        is_valid, amount, error = validate_value(budget.amount, "amount")
        if not is_valid:
            raise HTTPException(400, error)
        
        user_id = budget.user_id or "local"
        new_budget = add_budget(
            user_id=user_id,
            category=budget.category,
            amount=amount,
            period=budget.period,
            budget_type=budget.budget_type
        )
        
        print(f"[BUSINESS-ROUTES] ✅ Orçamento criado/atualizado: {new_budget['id']} - {budget.category} ({budget.period})")
        return {"success": True, "budget": new_budget}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao criar orçamento: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(500, format_error_message("criar orçamento", str(e)))

@router.put("/budget/{budget_id}")
@handle_business_errors
async def update_budget_endpoint(budget_id: str, budget: BudgetUpdate):
    """
    Update an existing budget.
    
    Returns:
        Updated budget
    """
    try:
        user_id = budget.user_id or "local"
        
        # Validate amount if provided
        amount = budget.amount
        if amount is not None:
            from .validation import validate_value
            is_valid, validated_amount, error = validate_value(amount, "amount")
            if not is_valid:
                raise HTTPException(400, error)
            amount = validated_amount
        
        updated_budget = update_budget(
            user_id=user_id,
            budget_id=budget_id,
            amount=amount,
            category=budget.category
        )
        
        if not updated_budget:
            raise HTTPException(404, f"Orçamento '{budget_id}' não encontrado")
        
        print(f"[BUSINESS-ROUTES] ✅ Orçamento atualizado: {budget_id}")
        return {"success": True, "budget": updated_budget}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao atualizar orçamento: {e}")
        raise HTTPException(500, format_error_message("atualizar orçamento", str(e)))

@router.delete("/budget/{budget_id}")
@handle_business_errors
async def delete_budget_endpoint(budget_id: str, user_id: str = "local"):
    """
    Delete a budget entry.
    
    Returns:
        Success status
    """
    try:
        if delete_budget(user_id, budget_id):
            print(f"[BUSINESS-ROUTES] ✅ Orçamento removido: {budget_id}")
            return {"success": True}
        raise HTTPException(404, f"Orçamento '{budget_id}' não encontrado")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao remover orçamento: {e}")
        raise HTTPException(500, format_error_message("remover orçamento", str(e)))

@router.get("/budget/summary")
@handle_business_errors
async def get_budget_summary_endpoint(user_id: str = "local", period: Optional[str] = None):
    """
    Get summary of budgets for a period.
    
    Returns:
        Budget summary
    """
    try:
        summary = get_budget_summary(user_id, period)
        return summary
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao buscar resumo de orçamento: {e}")
        raise HTTPException(500, format_error_message("buscar resumo de orçamento", str(e)))

# =============================================================================
# CREDIT CARDS ENDPOINTS
# =============================================================================

@router.get("/credit-cards")
@handle_business_errors
async def get_credit_cards_endpoint(user_id: str = "local"):
    """
    Get all credit cards.
    
    Returns:
        List of credit cards with current metrics
    """
    try:
        cards = load_credit_cards(user_id)
        return {"credit_cards": cards}
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao buscar cartões: {e}")
        raise HTTPException(500, format_error_message("buscar cartões de crédito", str(e)))

@router.post("/credit-cards")
@handle_business_errors
async def create_credit_card_endpoint(card: CreditCardCreate):
    """
    Create a new credit card.
    
    Returns:
        Created credit card
    """
    try:
        user_id = card.user_id or "local"
        
        # Validate limit
        from .validation import validate_value
        is_valid, validated_limit, error = validate_value(card.limit, "limit")
        if not is_valid:
            raise HTTPException(400, error)
        
        # Validate due_day
        if not (1 <= card.due_day <= 31):
            raise HTTPException(400, "Dia de vencimento deve estar entre 1 e 31")
        
        new_card = add_credit_card(
            user_id=user_id,
            name=card.name,
            limit=validated_limit,
            due_day=card.due_day,
            last_four=card.last_four,
            brand=card.brand,
            color=card.color,
            notes=card.notes
        )
        
        print(f"[BUSINESS-ROUTES] ✅ Cartão criado: {new_card['id']}")
        return {"success": True, "credit_card": new_card}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao criar cartão: {e}")
        raise HTTPException(500, format_error_message("criar cartão de crédito", str(e)))

@router.put("/credit-cards/{card_id}")
@handle_business_errors
async def update_credit_card_endpoint(card_id: str, card: CreditCardUpdate):
    """
    Update an existing credit card.
    
    Returns:
        Updated credit card
    """
    try:
        user_id = card.user_id or "local"
        
        updates = {}
        if card.name is not None:
            updates["name"] = card.name
        if card.limit is not None:
            from .validation import validate_value
            is_valid, validated_limit, error = validate_value(card.limit, "limit")
            if not is_valid:
                raise HTTPException(400, error)
            updates["limit"] = validated_limit
        if card.due_day is not None:
            if not (1 <= card.due_day <= 31):
                raise HTTPException(400, "Dia de vencimento deve estar entre 1 e 31")
            updates["due_day"] = card.due_day
        if card.last_four is not None:
            updates["last_four"] = card.last_four
        if card.brand is not None:
            updates["brand"] = card.brand
        if card.color is not None:
            updates["color"] = card.color
        if card.status is not None:
            if card.status not in ["active", "blocked", "cancelled"]:
                raise HTTPException(400, "Status deve ser 'active', 'blocked' ou 'cancelled'")
            updates["status"] = card.status
        if card.notes is not None:
            updates["notes"] = card.notes
        
        updated_card = update_credit_card(user_id, card_id, updates)
        
        if not updated_card:
            raise HTTPException(404, f"Cartão '{card_id}' não encontrado")
        
        print(f"[BUSINESS-ROUTES] ✅ Cartão atualizado: {card_id}")
        return {"success": True, "credit_card": updated_card}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao atualizar cartão: {e}")
        raise HTTPException(500, format_error_message("atualizar cartão de crédito", str(e)))

@router.delete("/credit-cards/{card_id}")
@handle_business_errors
async def delete_credit_card_endpoint(card_id: str, user_id: str = "local"):
    """
    Delete a credit card.
    
    Returns:
        Success status
    """
    try:
        if delete_credit_card(user_id, card_id):
            print(f"[BUSINESS-ROUTES] ✅ Cartão removido: {card_id}")
            return {"success": True}
        raise HTTPException(404, f"Cartão '{card_id}' não encontrado")
    except HTTPException:
        raise
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao remover cartão: {e}")
        raise HTTPException(500, format_error_message("remover cartão de crédito", str(e)))

@router.post("/credit-cards/{card_id}/pay")
@handle_business_errors
async def pay_credit_card_bill_endpoint(card_id: str, payment: CreditCardPayment):
    """
    Pay credit card bill (creates transaction and updates card).
    
    Returns:
        Updated credit card
    """
    try:
        user_id = payment.user_id or "local"
        
        # Validate amount
        from .validation import validate_value
        is_valid, validated_amount, error = validate_value(payment.amount, "amount")
        if not is_valid:
            raise HTTPException(400, error)
        
        updated_card = pay_credit_card_bill(
            user_id=user_id,
            card_id=card_id,
            amount=validated_amount,
            payment_date=payment.payment_date
        )
        
        if not updated_card:
            raise HTTPException(404, f"Cartão '{card_id}' não encontrado")
        
        print(f"[BUSINESS-ROUTES] ✅ Fatura paga: {card_id}, valor: R$ {validated_amount:.2f}")
        return {"success": True, "credit_card": updated_card}
    except HTTPException:
        raise
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao pagar fatura: {e}")
        raise HTTPException(500, format_error_message("pagar fatura de cartão", str(e)))

@router.get("/credit-cards/summary")
@handle_business_errors
async def get_credit_cards_summary_endpoint(user_id: str = "local"):
    """
    Get summary of all credit cards.
    
    Returns:
        Credit cards summary
    """
    try:
        summary = get_credit_cards_summary(user_id)
        return summary
    except Exception as e:
        print(f"[BUSINESS-ROUTES] ❌ Erro ao buscar resumo de cartões: {e}")
        raise HTTPException(500, format_error_message("buscar resumo de cartões", str(e)))