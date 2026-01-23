from datetime import datetime, timedelta
from typing import List, Dict, Optional
from . import storage
from . import budget
from . import credit_cards
from . import goals
from .models import Notification

def generate_notifications() -> List[Notification]:
    """
    Analyzes current data and generates or updates notifications.
    Returns the list of active notifications.
    """
    notifications = storage.get_notifications()
    new_notifications = []
    
    # 1. Check Overdue Bills
    bills = storage.get_bills()
    today = datetime.now()
    for bill in bills:
        if bill.get('status') == 'pending':
            due_date = datetime.strptime(bill['due_date'], "%Y-%m-%d")
            diff = (due_date - today).days
            
            notif_id = f"bill_{bill['id']}"
            if diff < 0:
                # Overdue
                add_or_update_notification(
                    new_notifications, notifications,
                    id=notif_id,
                    type='overdue_bill',
                    priority='critical',
                    title=f"Conta Atrasada: {bill['description']}",
                    message=f"A conta de R$ {bill['value']:.2f} venceu em {bill['due_date']}.",
                    link="/business/bills"
                )
            elif diff <= 2:
                # Due soon
                add_or_update_notification(
                    new_notifications, notifications,
                    id=notif_id,
                    type='overdue_bill',
                    priority='warning',
                    title=f"Conta Próxima ao Vencimento: {bill['description']}",
                    message=f"A conta de R$ {bill['value']:.2f} vence em {diff} dias.",
                    link="/business/bills"
                )

    # 2. Check Budget Thresholds
    budgets_with_metrics = budget.get_budgets_with_usage()
    for b in budgets_with_metrics:
        percent = (b['actual'] / b['amount']) * 100 if b['amount'] > 0 else 0
        notif_id = f"budget_{b['id']}_{b['period']}"
        
        if percent >= 100:
            add_or_update_notification(
                new_notifications, notifications,
                id=notif_id,
                type='budget_limit',
                priority='critical',
                title=f"Orçamento Estourado: {b['category']}",
                message=f"Você gastou R$ {b['actual']:.2f} de um limite de R$ {b['amount']:.2f}.",
                link="/business/budget"
            )
        elif percent >= 80:
            add_or_update_notification(
                new_notifications, notifications,
                id=notif_id,
                type='budget_limit',
                priority='warning',
                title=f"Limite de Orçamento: {b['category']}",
                message=f"Você já atingiu {percent:.1f}% do seu limite de R$ {b['amount']:.2f}.",
                link="/business/budget"
            )

    # 3. Check Credit Card Due Dates
    cards = credit_cards.get_cards_with_metrics()
    for card in cards:
        if card.get('days_until_due', 99) <= 3:
            notif_id = f"card_{card['id']}_{card['next_due_date']}"
            add_or_update_notification(
                new_notifications, notifications,
                id=notif_id,
                type='card_due',
                priority='warning',
                title=f"Fatura de Cartão Próxima: {card['name']}",
                message=f"Sua fatura de R$ {card['current_bill']:.2f} vence em {card['days_until_due']} dias.",
                link="/business/cards"
            )

    # 4. Low Balance Warning
    summary = storage.get_summary()
    balance = summary.get('balance', 0)
    if balance < 500:
        priority = 'critical' if balance < 100 else 'warning'
        add_or_update_notification(
            new_notifications, notifications,
            id="low_balance",
            type='low_balance',
            priority=priority,
            title="Saldo Baixo",
            message=f"Seu saldo atual é de apenas R$ {balance:.2f}. Considere revisar seus gastos.",
            link="/business"
        )

    # 5. Recurring Pending
    # (Simplified: check if any recurring with due_day == today and not generated)
    recurring = storage.get_recurring()
    current_month = today.strftime("%Y-%m")
    for item in recurring:
        if item.get('active') and item.get('due_day') == today.day:
            if item.get('last_generated') != current_month:
                notif_id = f"recurring_{item['id']}_{current_month}"
                add_or_update_notification(
                    new_notifications, notifications,
                    id=notif_id,
                    type='recurring_pending',
                    priority='info',
                    title=f"Pagamento Recorrente Hoje: {item['description']}",
                    message=f"Lembre-se de registrar o pagamento de R$ {item['value']:.2f}.",
                    link="/business/recurring"
                )

    # 6. Goal Achievements
    achieved_goals = goals.check_goal_achievements()
    for goal in achieved_goals:
        notif_id = f"goal_achieved_{goal['id']}"
        add_or_update_notification(
            new_notifications, notifications,
            id=notif_id,
            type='goal_achieved',
            priority='info',
            title=f"Meta Atingida: {goal['name']}",
            message=f"Parabéns! Você atingiu sua meta de R$ {goal['target_amount']:.2f}!",
            link="/business/goals"
        )

    # Filter out old notifications that are no longer valid (e.g. bill paid)
    # But keep those that were marked as read if they are still "active"
    # Actually, if the condition is no longer met, the notification should probably go away.
    # We only save current "active" notifications.
    
    storage._save_json('notifications', [n.dict() for n in new_notifications])
    return new_notifications

def add_or_update_notification(new_list, existing_list, **kwargs):
    notif_id = kwargs['id']
    # Check if exists in existing list to preserve 'read' status
    existing = next((n for n in existing_list if n['id'] == notif_id), None)
    
    if existing:
        # Update existing
        kwargs['read'] = existing.get('read', False)
        kwargs['date'] = existing.get('date', datetime.now().isoformat())
    else:
        # New one
        kwargs['read'] = False
        kwargs['date'] = datetime.now().isoformat()
        
    new_list.append(Notification(**kwargs))
