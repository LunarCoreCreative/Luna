"""
Luna Business Export Module
---------------------------
Sistema de exportação de dados para Excel e PDF.
"""

import json
from datetime import datetime, timezone
from typing import List, Dict, Any, Optional
from pathlib import Path
import csv
import io

from .storage import load_transactions, get_summary, load_clients
from .recurring import load_recurring
from .overdue import load_overdue
from .tags import load_tags


def export_to_csv(user_id: str, period: Optional[str] = None) -> str:
    """
    Exporta transações para CSV.
    
    Args:
        user_id: ID do usuário
        period: Período opcional (YYYY-MM)
    
    Returns:
        String CSV formatada
    """
    if period:
        from .periods import get_transactions_by_period
        transactions = get_transactions_by_period(user_id, period)
    else:
        transactions = load_transactions(user_id)
    
    # Ordena por data (mais recente primeiro)
    transactions.sort(key=lambda x: x.get("date", ""), reverse=True)
    
    # Cria buffer CSV
    output = io.StringIO()
    writer = csv.writer(output, delimiter=';', quoting=csv.QUOTE_ALL)
    
    # Cabeçalho
    writer.writerow([
        "ID",
        "Data",
        "Tipo",
        "Descrição",
        "Categoria",
        "Valor",
        "Criado em"
    ])
    
    # Dados
    for tx in transactions:
        writer.writerow([
            tx.get("id", ""),
            tx.get("date", ""),
            tx.get("type", ""),
            tx.get("description", ""),
            tx.get("category", ""),
            tx.get("value", 0),
            tx.get("created_at", "")
        ])
    
    return output.getvalue()


def export_to_excel_json(user_id: str, period: Optional[str] = None) -> Dict[str, Any]:
    """
    Exporta dados para formato JSON compatível com Excel.
    
    Args:
        user_id: ID do usuário
        period: Período opcional (YYYY-MM)
    
    Returns:
        Dicionário com dados formatados para Excel
    """
    if period:
        from .periods import get_transactions_by_period, get_period_summary
        transactions = get_transactions_by_period(user_id, period)
        summary = get_period_summary(user_id, period)
    else:
        transactions = load_transactions(user_id)
        summary = get_summary(user_id)
    
    # Ordena por data
    transactions.sort(key=lambda x: x.get("date", ""), reverse=True)
    
    # Formata dados para Excel
    excel_data = {
        "metadata": {
            "export_date": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            "user_id": user_id,
            "period": period,
            "total_transactions": len(transactions)
        },
        "summary": {
            "balance": summary.get("balance", 0),
            "income": summary.get("income", 0),
            "expenses": summary.get("expenses", 0),
            "invested": summary.get("invested", 0)
        },
        "transactions": []
    }
    
    # Formata transações
    for tx in transactions:
        excel_data["transactions"].append({
            "ID": tx.get("id", ""),
            "Data": tx.get("date", ""),
            "Tipo": tx.get("type", ""),
            "Descrição": tx.get("description", ""),
            "Categoria": tx.get("category", ""),
            "Valor": tx.get("value", 0),
            "Criado em": tx.get("created_at", "")
        })
    
    return excel_data


def export_full_report_json(user_id: str, period: Optional[str] = None) -> Dict[str, Any]:
    """
    Exporta relatório completo em formato JSON.
    
    Args:
        user_id: ID do usuário
        period: Período opcional (YYYY-MM)
    
    Returns:
        Dicionário com relatório completo
    """
    if period:
        from .periods import get_transactions_by_period, get_period_summary
        transactions = get_transactions_by_period(user_id, period)
        summary = get_period_summary(user_id, period)
    else:
        transactions = load_transactions(user_id)
        summary = get_summary(user_id)
    
    clients = load_clients(user_id)
    recurring = load_recurring(user_id)
    overdue = load_overdue(user_id)
    tags = load_tags(user_id)
    
    # Ordena transações
    transactions.sort(key=lambda x: x.get("date", ""), reverse=True)
    
    report = {
        "metadata": {
            "export_date": datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
            "user_id": user_id,
            "period": period,
            "version": "1.0"
        },
        "summary": summary,
        "transactions": transactions,
        "clients": clients,
        "recurring_items": recurring,
        "overdue_bills": overdue,
        "tags": tags,
        "statistics": {
            "total_transactions": len(transactions),
            "total_clients": len(clients),
            "total_recurring_items": len(recurring),
            "total_overdue_bills": len(overdue),
            "total_tags": len(tags)
        }
    }
    
    return report
