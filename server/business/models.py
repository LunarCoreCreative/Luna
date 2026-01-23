from pydantic import BaseModel, Field
from typing import Optional, Literal, List
from datetime import datetime
import uuid

# --- TAGS ---
class TagBase(BaseModel):
    label: str
    color: str = "#8B5CF6"

class TagCreate(TagBase):
    pass

class Tag(TagBase):
    id: str

def generate_id():
    return str(uuid.uuid4())

# --- TRANSACTIONS ---
class TransactionBase(BaseModel):
    description: str
    value: float = Field(..., gt=0, description="Valor deve ser positivo")
    type: Literal['income', 'expense', 'investment']
    category: str = "geral"
    date: str = Field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d"))
    credit_card_id: Optional[str] = None

class TransactionCreate(TransactionBase):
    pass

class Transaction(TransactionBase):
    id: str = Field(default_factory=generate_id)
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

# --- RECURRING ITEMS ---
class RecurringItemBase(BaseModel):
    description: str
    value: float
    type: Literal['income', 'expense', 'investment']
    category: str = "fixo"
    frequency: Literal['monthly', 'yearly', 'weekly'] = 'monthly'
    due_day: int = Field(..., ge=1, le=31)
    active: bool = True
    auto_pay: bool = False
    credit_card_id: Optional[str] = None
    last_generated: Optional[str] = None # Format "YYYY-MM"

class RecurringItemCreate(RecurringItemBase):
    pass

class RecurringItem(RecurringItemBase):
    id: str = Field(default_factory=generate_id)

# --- BUDGET ---
class BudgetBase(BaseModel):
    category: str
    amount: float
    period: str # Format "YYYY-MM"
    type: Literal['income', 'expense'] = 'expense'

class BudgetCreate(BudgetBase):
    pass

class Budget(BudgetBase):
    id: str = Field(default_factory=generate_id)
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    actual: Optional[float] = 0.0

# --- OVERDUE BILLS (Contas a Pagar/Atrasadas) ---
class OverdueBillBase(BaseModel):
    description: str
    value: float
    due_date: str
    category: str = "geral"
    notes: Optional[str] = None
    status: Literal['pending', 'paid'] = 'pending'

class OverdueBillCreate(OverdueBillBase):
    pass

class OverdueBill(OverdueBillBase):
    id: str = Field(default_factory=generate_id)
    days_overdue: int = 0  # Calculated field

# --- FINANCIAL GOALS ---
class GoalBase(BaseModel):
    title: str
    target_amount: float
    target_date: Optional[str] = None # Format "YYYY-MM-DD"
    goal_type: Literal['savings', 'expense_reduction', 'income_increase', 'other'] = 'savings'
    description: Optional[str] = ""

class GoalCreate(GoalBase):
    pass

class Goal(GoalBase):
    id: str = Field(default_factory=generate_id)
    current_amount: float = 0.0
    status: Literal['active', 'completed', 'cancelled'] = 'active'
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())

# --- CREDIT CARDS ---
class CreditCardBase(BaseModel):
    name: str
    limit: float
    due_day: int = Field(..., ge=1, le=31)
    last_four: Optional[str] = ""
    brand: Literal['visa', 'mastercard', 'elo', 'amex', 'other'] = 'other'
    color: str = "#8B5CF6"
    notes: Optional[str] = ""

class CreditCardCreate(CreditCardBase):
    pass

class CreditCard(CreditCardBase):
    id: str = Field(default_factory=generate_id)
    used_limit: float = 0.0 # From previous periods
    current_bill: float = 0.0 # From current period txs
    available_limit: float = 0.0
    next_due_date: Optional[str] = None
    days_until_due: int = 0
    status: Literal['active', 'blocked', 'cancelled'] = 'active'
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

# --- PIGGY BANKS (CAIXINHAS) ---
class PiggyBankBase(BaseModel):
    name: str
    description: Optional[str] = ""
    target_amount: Optional[float] = None  # Meta opcional
    color: str = "#8B5CF6"
    icon: Optional[str] = None  # Emoji ou nome de ícone
    goal_id: Optional[str] = None  # ID da meta vinculada (opcional)

class PiggyBankCreate(PiggyBankBase):
    pass

class PiggyBank(PiggyBankBase):
    id: str = Field(default_factory=generate_id)
    current_amount: float = 0.0
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())
    updated_at: str = Field(default_factory=lambda: datetime.now().isoformat())

# --- PIGGY BANK TRANSACTIONS (Movimentações das Caixinhas) ---
class PiggyBankTransactionBase(BaseModel):
    piggy_bank_id: str
    amount: float = Field(..., gt=0, description="Valor deve ser positivo")
    type: Literal['deposit', 'withdrawal']  # Guardar ou Retirar
    description: Optional[str] = ""
    date: str = Field(default_factory=lambda: datetime.now().strftime("%Y-%m-%d"))

class PiggyBankTransactionCreate(PiggyBankTransactionBase):
    pass

class PiggyBankTransaction(PiggyBankTransactionBase):
    id: str = Field(default_factory=generate_id)
    created_at: str = Field(default_factory=lambda: datetime.now().isoformat())

# --- NOTIFICATIONS ---
class Notification(BaseModel):
    id: str = Field(default_factory=generate_id)
    type: Literal['budget_limit', 'overdue_bill', 'card_due', 'low_balance', 'recurring_pending']
    priority: Literal['critical', 'warning', 'info'] = 'info'
    title: str
    message: str
    date: str = Field(default_factory=lambda: datetime.now().isoformat())
    link: Optional[str] = None
    read: bool = False
