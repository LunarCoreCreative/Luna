"""
Luna Business Notifications Module
-----------------------------------
Sistema de notificações para o modo business.
"""

from datetime import datetime, timezone, timedelta
from typing import List, Dict, Any, Optional
from .storage import load_transactions, get_summary
from .overdue import load_overdue
from .recurring import load_recurring


def get_notifications(user_id: str) -> List[Dict[str, Any]]:
    """
    Retorna todas as notificações ativas para o usuário.
    
    Args:
        user_id: ID do usuário
    
    Returns:
        Lista de notificações ordenadas por prioridade
    """
    notifications = []
    
    # 1. Notificações de contas vencendo
    overdue_notifications = get_overdue_notifications(user_id)
    notifications.extend(overdue_notifications)
    
    # 2. Alertas de saldo baixo
    balance_notifications = get_balance_alerts(user_id)
    notifications.extend(balance_notifications)
    
    # 3. Lembretes de pagamentos recorrentes
    recurring_notifications = get_recurring_reminders(user_id)
    notifications.extend(recurring_notifications)
    
    # Ordena por prioridade (critical > warning > info) e data
    priority_order = {"critical": 0, "warning": 1, "info": 2}
    notifications.sort(
        key=lambda n: (
            priority_order.get(n.get("priority", "info"), 2),
            n.get("timestamp", "")
        )
    )
    
    return notifications


def get_overdue_notifications(user_id: str) -> List[Dict[str, Any]]:
    """
    Retorna notificações de contas vencendo ou vencidas.
    
    Args:
        user_id: ID do usuário
    
    Returns:
        Lista de notificações de contas vencidas
    """
    notifications = []
    bills = load_overdue(user_id)
    
    today = datetime.now(timezone.utc).date()
    
    for bill in bills:
        if bill.get("status") != "paid":
            due_date_str = bill.get("due_date", "")
            if due_date_str:
                try:
                    # Tenta parsear data (formato YYYY-MM-DD)
                    due_date = datetime.fromisoformat(due_date_str.replace('Z', '+00:00')).date()
                    days_overdue = (today - due_date).days
                    
                    if days_overdue > 0:
                        # Conta vencida
                        priority = "critical" if days_overdue > 7 else "warning"
                        notifications.append({
                            "id": f"overdue_{bill['id']}",
                            "type": "overdue_bill",
                            "priority": priority,
                            "title": f"Conta vencida: {bill.get('description', 'Sem descrição')}",
                            "message": f"Conta vencida há {days_overdue} dia(s). Valor: R$ {bill.get('value', 0):.2f}",
                            "timestamp": bill.get("due_date", ""),
                            "data": {
                                "bill_id": bill.get("id"),
                                "value": bill.get("value"),
                                "days_overdue": days_overdue
                            }
                        })
                    elif days_overdue == 0:
                        # Conta vence hoje
                        notifications.append({
                            "id": f"overdue_today_{bill['id']}",
                            "type": "overdue_bill",
                            "priority": "warning",
                            "title": f"Conta vence hoje: {bill.get('description', 'Sem descrição')}",
                            "message": f"Conta vence hoje. Valor: R$ {bill.get('value', 0):.2f}",
                            "timestamp": bill.get("due_date", ""),
                            "data": {
                                "bill_id": bill.get("id"),
                                "value": bill.get("value"),
                                "days_overdue": 0
                            }
                        })
                    elif days_overdue >= -3:
                        # Conta vence em até 3 dias
                        days_until = abs(days_overdue)
                        notifications.append({
                            "id": f"overdue_soon_{bill['id']}",
                            "type": "overdue_bill",
                            "priority": "info",
                            "title": f"Conta vence em {days_until} dia(s)",
                            "message": f"{bill.get('description', 'Sem descrição')} vence em {days_until} dia(s). Valor: R$ {bill.get('value', 0):.2f}",
                            "timestamp": bill.get("due_date", ""),
                            "data": {
                                "bill_id": bill.get("id"),
                                "value": bill.get("value"),
                                "days_until": days_until
                            }
                        })
                except (ValueError, AttributeError) as e:
                    print(f"[BUSINESS-NOTIFICATIONS] Erro ao processar data de vencimento: {e}")
                    continue
    
    return notifications


def get_balance_alerts(user_id: str, low_balance_threshold: float = 1000.0) -> List[Dict[str, Any]]:
    """
    Retorna alertas de saldo baixo.
    
    Args:
        user_id: ID do usuário
        low_balance_threshold: Limite mínimo de saldo (padrão: R$ 1000)
    
    Returns:
        Lista de notificações de saldo baixo
    """
    notifications = []
    
    try:
        summary = get_summary(user_id)
        balance = summary.get("balance", 0)
        
        if balance < low_balance_threshold:
            priority = "critical" if balance < (low_balance_threshold * 0.3) else "warning"
            
            notifications.append({
                "id": "low_balance",
                "type": "low_balance",
                "priority": priority,
                "title": "Saldo baixo",
                "message": f"Seu saldo atual é R$ {balance:.2f}, abaixo do limite recomendado de R$ {low_balance_threshold:.2f}",
                "timestamp": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
                "data": {
                    "current_balance": balance,
                    "threshold": low_balance_threshold
                }
            })
    except Exception as e:
        print(f"[BUSINESS-NOTIFICATIONS] Erro ao verificar saldo: {e}")
    
    return notifications


def get_recurring_reminders(user_id: str, days_ahead: int = 3) -> List[Dict[str, Any]]:
    """
    Retorna lembretes de pagamentos recorrentes que estão próximos.
    
    Args:
        user_id: ID do usuário
        days_ahead: Quantos dias antes avisar (padrão: 3)
    
    Returns:
        Lista de notificações de lembretes recorrentes
    """
    notifications = []
    
    try:
        recurring_items = load_recurring(user_id)
        today = datetime.now(timezone.utc)
        current_day = today.day
        current_month = today.month
        current_year = today.year
        
        # Carrega transações para verificar se já foram criadas
        transactions = load_transactions(user_id)
        current_month_str = today.strftime("%Y-%m")
        
        # Cria set de transações recorrentes já criadas neste mês
        created_recurring = set()
        for tx in transactions:
            tx_date = tx.get("date", "")
            if tx_date.startswith(current_month_str):
                description = tx.get("description", "")
                if "[Fixo]" in description:
                    created_recurring.add(description)
        
        for item in recurring_items:
            day_of_month = item.get("day_of_month", 1)
            safe_day = min(day_of_month, 28)  # Evita problemas com meses de 28-31 dias
            
            # Calcula data esperada
            expected_date = datetime(current_year, current_month, safe_day, tzinfo=timezone.utc)
            
            # Verifica se já foi criada
            expected_desc = f"[Fixo] {item.get('title', '')}"
            if expected_desc in created_recurring:
                continue  # Já foi criada, não precisa notificar
            
            # Calcula dias até o vencimento
            days_until = (expected_date - today).days
            
            # Se está dentro do período de aviso
            if 0 <= days_until <= days_ahead:
                if days_until == 0:
                    # Vence hoje
                    notifications.append({
                        "id": f"recurring_today_{item.get('id')}",
                        "type": "recurring_reminder",
                        "priority": "warning",
                        "title": f"Pagamento recorrente vence hoje: {item.get('title', '')}",
                        "message": f"{item.get('title', '')} - R$ {item.get('value', 0):.2f} vence hoje",
                        "timestamp": expected_date.isoformat().replace('+00:00', 'Z'),
                        "data": {
                            "recurring_id": item.get("id"),
                            "title": item.get("title"),
                            "value": item.get("value"),
                            "day_of_month": day_of_month
                        }
                    })
                else:
                    # Vence em alguns dias
                    notifications.append({
                        "id": f"recurring_soon_{item.get('id')}",
                        "type": "recurring_reminder",
                        "priority": "info",
                        "title": f"Pagamento recorrente em {days_until} dia(s)",
                        "message": f"{item.get('title', '')} - R$ {item.get('value', 0):.2f} vence em {days_until} dia(s)",
                        "timestamp": expected_date.isoformat().replace('+00:00', 'Z'),
                        "data": {
                            "recurring_id": item.get("id"),
                            "title": item.get("title"),
                            "value": item.get("value"),
                            "day_of_month": day_of_month,
                            "days_until": days_until
                        }
                    })
    except Exception as e:
        print(f"[BUSINESS-NOTIFICATIONS] Erro ao verificar lembretes recorrentes: {e}")
        import traceback
        traceback.print_exc()
    
    return notifications


def get_notification_count(user_id: str) -> Dict[str, int]:
    """
    Retorna contagem de notificações por tipo e prioridade.
    
    Args:
        user_id: ID do usuário
    
    Returns:
        Dicionário com contagens
    """
    notifications = get_notifications(user_id)
    
    counts = {
        "total": len(notifications),
        "critical": len([n for n in notifications if n.get("priority") == "critical"]),
        "warning": len([n for n in notifications if n.get("priority") == "warning"]),
        "info": len([n for n in notifications if n.get("priority") == "info"]),
        "by_type": {}
    }
    
    # Conta por tipo
    for notification in notifications:
        notif_type = notification.get("type", "unknown")
        counts["by_type"][notif_type] = counts["by_type"].get(notif_type, 0) + 1
    
    return counts
