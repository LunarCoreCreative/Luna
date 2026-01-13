"""
Luna Business Data Integrity Module
-----------------------------------
Sistema de validação de integridade de dados do modo business.
"""

from typing import Dict, List, Any, Optional
from .storage import load_transactions, get_summary, load_clients
from .recurring import load_recurring
from .overdue import load_overdue
from .tags import load_tags


def verify_data_integrity(user_id: str) -> Dict[str, Any]:
    """
    Verifica integridade de todos os dados do usuário.
    
    Args:
        user_id: ID do usuário
    
    Returns:
        Dicionário com resultados da verificação
    """
    issues = []
    warnings = []
    stats = {}
    
    # 1. Verifica transações
    tx_issues, tx_warnings, tx_stats = verify_transactions_integrity(user_id)
    issues.extend(tx_issues)
    warnings.extend(tx_warnings)
    stats["transactions"] = tx_stats
    
    # 2. Verifica clientes
    client_issues, client_warnings, client_stats = verify_clients_integrity(user_id)
    issues.extend(client_issues)
    warnings.extend(client_warnings)
    stats["clients"] = client_stats
    
    # 3. Verifica itens recorrentes
    recurring_issues, recurring_warnings, recurring_stats = verify_recurring_integrity(user_id)
    issues.extend(recurring_issues)
    warnings.extend(recurring_warnings)
    stats["recurring"] = recurring_stats
    
    # 4. Verifica contas em atraso
    overdue_issues, overdue_warnings, overdue_stats = verify_overdue_integrity(user_id)
    issues.extend(overdue_issues)
    warnings.extend(overdue_warnings)
    stats["overdue"] = overdue_stats
    
    # 5. Verifica tags
    tags_issues, tags_warnings, tags_stats = verify_tags_integrity(user_id)
    issues.extend(tags_issues)
    warnings.extend(tags_warnings)
    stats["tags"] = tags_stats
    
    # 6. Verifica consistência entre entidades
    consistency_issues, consistency_warnings = verify_cross_entity_consistency(user_id)
    issues.extend(consistency_issues)
    warnings.extend(consistency_warnings)
    
    # 7. Verifica soma de saldos
    balance_issues, balance_warnings = verify_balance_consistency(user_id)
    issues.extend(balance_issues)
    warnings.extend(balance_warnings)
    
    return {
        "valid": len(issues) == 0,
        "issues_count": len(issues),
        "warnings_count": len(warnings),
        "issues": issues,
        "warnings": warnings,
        "stats": stats
    }


def verify_transactions_integrity(user_id: str) -> tuple[List[Dict], List[Dict], Dict]:
    """
    Verifica integridade das transações.
    
    Returns:
        (issues, warnings, stats)
    """
    issues = []
    warnings = []
    stats = {
        "total": 0,
        "valid": 0,
        "invalid": 0,
        "orphan": 0
    }
    
    try:
        transactions = load_transactions(user_id)
        stats["total"] = len(transactions)
        
        # Campos obrigatórios
        required_fields = ["id", "type", "value", "description", "date"]
        
        for tx in transactions:
            is_valid = True
            
            # Verifica campos obrigatórios
            for field in required_fields:
                if field not in tx:
                    issues.append({
                        "type": "missing_field",
                        "entity": "transaction",
                        "entity_id": tx.get("id", "unknown"),
                        "field": field,
                        "message": f"Transação {tx.get('id', 'unknown')} está faltando campo obrigatório: {field}"
                    })
                    is_valid = False
            
            # Verifica tipos de dados
            if "value" in tx:
                try:
                    value = float(tx["value"])
                    if value <= 0:
                        issues.append({
                            "type": "invalid_value",
                            "entity": "transaction",
                            "entity_id": tx.get("id", "unknown"),
                            "field": "value",
                            "message": f"Transação {tx.get('id', 'unknown')} tem valor inválido: {value}"
                        })
                        is_valid = False
                except (ValueError, TypeError):
                    issues.append({
                        "type": "invalid_type",
                        "entity": "transaction",
                        "entity_id": tx.get("id", "unknown"),
                        "field": "value",
                        "message": f"Transação {tx.get('id', 'unknown')} tem valor não numérico: {tx['value']}"
                    })
                    is_valid = False
            
            # Verifica tipo de transação
            if "type" in tx and tx["type"] not in ["income", "expense", "investment"]:
                issues.append({
                    "type": "invalid_type",
                    "entity": "transaction",
                    "entity_id": tx.get("id", "unknown"),
                    "field": "type",
                    "message": f"Transação {tx.get('id', 'unknown')} tem tipo inválido: {tx['type']}"
                })
                is_valid = False
            
            # Verifica formato de data
            if "date" in tx:
                date_str = tx["date"]
                if not isinstance(date_str, str) or len(date_str) < 10:
                    warnings.append({
                        "type": "invalid_date_format",
                        "entity": "transaction",
                        "entity_id": tx.get("id", "unknown"),
                        "field": "date",
                        "message": f"Transação {tx.get('id', 'unknown')} tem formato de data suspeito: {date_str}"
                    })
            
            # Verifica descrição vazia
            if "description" in tx and not tx["description"].strip():
                warnings.append({
                    "type": "empty_description",
                    "entity": "transaction",
                    "entity_id": tx.get("id", "unknown"),
                    "field": "description",
                    "message": f"Transação {tx.get('id', 'unknown')} tem descrição vazia"
                })
            
            if is_valid:
                stats["valid"] += 1
            else:
                stats["invalid"] += 1
        
    except Exception as e:
        issues.append({
            "type": "load_error",
            "entity": "transaction",
            "message": f"Erro ao carregar transações: {str(e)}"
        })
    
    return issues, warnings, stats


def verify_clients_integrity(user_id: str) -> tuple[List[Dict], List[Dict], Dict]:
    """
    Verifica integridade dos clientes.
    
    Returns:
        (issues, warnings, stats)
    """
    issues = []
    warnings = []
    stats = {
        "total": 0,
        "valid": 0,
        "invalid": 0
    }
    
    try:
        clients = load_clients(user_id)
        stats["total"] = len(clients)
        
        for client in clients:
            is_valid = True
            
            if "id" not in client:
                issues.append({
                    "type": "missing_field",
                    "entity": "client",
                    "entity_id": "unknown",
                    "field": "id",
                    "message": "Cliente sem ID"
                })
                is_valid = False
            
            if "name" not in client or not client["name"].strip():
                issues.append({
                    "type": "missing_field",
                    "entity": "client",
                    "entity_id": client.get("id", "unknown"),
                    "field": "name",
                    "message": f"Cliente {client.get('id', 'unknown')} está sem nome"
                })
                is_valid = False
            
            if is_valid:
                stats["valid"] += 1
            else:
                stats["invalid"] += 1
        
    except Exception as e:
        issues.append({
            "type": "load_error",
            "entity": "client",
            "message": f"Erro ao carregar clientes: {str(e)}"
        })
    
    return issues, warnings, stats


def verify_recurring_integrity(user_id: str) -> tuple[List[Dict], List[Dict], Dict]:
    """
    Verifica integridade dos itens recorrentes.
    
    Returns:
        (issues, warnings, stats)
    """
    issues = []
    warnings = []
    stats = {
        "total": 0,
        "valid": 0,
        "invalid": 0
    }
    
    try:
        recurring = load_recurring(user_id)
        stats["total"] = len(recurring)
        
        for item in recurring:
            is_valid = True
            
            required_fields = ["id", "title", "value", "type", "day_of_month"]
            for field in required_fields:
                if field not in item:
                    issues.append({
                        "type": "missing_field",
                        "entity": "recurring",
                        "entity_id": item.get("id", "unknown"),
                        "field": field,
                        "message": f"Item recorrente {item.get('id', 'unknown')} está faltando campo: {field}"
                    })
                    is_valid = False
            
            if "day_of_month" in item:
                day = item["day_of_month"]
                if not isinstance(day, int) or day < 1 or day > 31:
                    issues.append({
                        "type": "invalid_value",
                        "entity": "recurring",
                        "entity_id": item.get("id", "unknown"),
                        "field": "day_of_month",
                        "message": f"Item recorrente {item.get('id', 'unknown')} tem dia inválido: {day}"
                    })
                    is_valid = False
            
            if is_valid:
                stats["valid"] += 1
            else:
                stats["invalid"] += 1
        
    except Exception as e:
        issues.append({
            "type": "load_error",
            "entity": "recurring",
            "message": f"Erro ao carregar itens recorrentes: {str(e)}"
        })
    
    return issues, warnings, stats


def verify_overdue_integrity(user_id: str) -> tuple[List[Dict], List[Dict], Dict]:
    """
    Verifica integridade das contas em atraso.
    
    Returns:
        (issues, warnings, stats)
    """
    issues = []
    warnings = []
    stats = {
        "total": 0,
        "valid": 0,
        "invalid": 0
    }
    
    try:
        overdue = load_overdue(user_id)
        stats["total"] = len(overdue)
        
        for bill in overdue:
            is_valid = True
            
            required_fields = ["id", "description", "value", "due_date"]
            for field in required_fields:
                if field not in bill:
                    issues.append({
                        "type": "missing_field",
                        "entity": "overdue",
                        "entity_id": bill.get("id", "unknown"),
                        "field": field,
                        "message": f"Conta em atraso {bill.get('id', 'unknown')} está faltando campo: {field}"
                    })
                    is_valid = False
            
            if "value" in bill:
                try:
                    value = float(bill["value"])
                    if value <= 0:
                        issues.append({
                            "type": "invalid_value",
                            "entity": "overdue",
                            "entity_id": bill.get("id", "unknown"),
                            "field": "value",
                            "message": f"Conta em atraso {bill.get('id', 'unknown')} tem valor inválido: {value}"
                        })
                        is_valid = False
                except (ValueError, TypeError):
                    issues.append({
                        "type": "invalid_type",
                        "entity": "overdue",
                        "entity_id": bill.get("id", "unknown"),
                        "field": "value",
                        "message": f"Conta em atraso {bill.get('id', 'unknown')} tem valor não numérico"
                    })
                    is_valid = False
            
            if is_valid:
                stats["valid"] += 1
            else:
                stats["invalid"] += 1
        
    except Exception as e:
        issues.append({
            "type": "load_error",
            "entity": "overdue",
            "message": f"Erro ao carregar contas em atraso: {str(e)}"
        })
    
    return issues, warnings, stats


def verify_tags_integrity(user_id: str) -> tuple[List[Dict], List[Dict], Dict]:
    """
    Verifica integridade das tags.
    
    Returns:
        (issues, warnings, stats)
    """
    issues = []
    warnings = []
    stats = {
        "total": 0,
        "valid": 0,
        "invalid": 0
    }
    
    try:
        tags = load_tags(user_id)
        stats["total"] = len(tags)
        
        for tag in tags:
            is_valid = True
            
            if "id" not in tag or "label" not in tag:
                issues.append({
                    "type": "missing_field",
                    "entity": "tag",
                    "entity_id": tag.get("id", "unknown"),
                    "field": "id" if "id" not in tag else "label",
                    "message": f"Tag está faltando campo obrigatório"
                })
                is_valid = False
            
            if is_valid:
                stats["valid"] += 1
            else:
                stats["invalid"] += 1
        
    except Exception as e:
        issues.append({
            "type": "load_error",
            "entity": "tag",
            "message": f"Erro ao carregar tags: {str(e)}"
        })
    
    return issues, warnings, stats


def verify_cross_entity_consistency(user_id: str) -> tuple[List[Dict], List[Dict]]:
    """
    Verifica consistência entre diferentes entidades.
    
    Returns:
        (issues, warnings)
    """
    issues = []
    warnings = []
    
    try:
        transactions = load_transactions(user_id)
        tags = load_tags(user_id)
        
        # Cria set de categorias/tags usadas
        tag_labels = {tag.get("label", "").lower() for tag in tags}
        
        # Verifica se transações usam tags que existem
        for tx in transactions:
            category = tx.get("category", "").lower()
            if category and category not in tag_labels and category != "geral":
                warnings.append({
                    "type": "orphan_category",
                    "entity": "transaction",
                    "entity_id": tx.get("id", "unknown"),
                    "message": f"Transação {tx.get('id', 'unknown')} usa categoria '{tx.get('category')}' que não existe como tag"
                })
        
    except Exception as e:
        issues.append({
            "type": "consistency_check_error",
            "message": f"Erro ao verificar consistência entre entidades: {str(e)}"
        })
    
    return issues, warnings


def verify_balance_consistency(user_id: str) -> tuple[List[Dict], List[Dict]]:
    """
    Verifica consistência da soma de saldos.
    
    Returns:
        (issues, warnings)
    """
    issues = []
    warnings = []
    
    try:
        transactions = load_transactions(user_id)
        summary = get_summary(user_id)
        
        # Calcula saldo manualmente
        calculated_income = sum(
            float(tx.get("value", 0)) 
            for tx in transactions 
            if tx.get("type") == "income"
        )
        
        calculated_expenses = sum(
            float(tx.get("value", 0)) 
            for tx in transactions 
            if tx.get("type") == "expense"
        )
        
        calculated_balance = calculated_income - calculated_expenses
        
        # Compara com resumo
        # get_summary retorna "income" e "expenses", não "total_income" e "total_expenses"
        summary_income = summary.get("income", summary.get("total_income", 0))
        summary_expenses = summary.get("expenses", summary.get("total_expenses", 0))
        summary_balance = summary.get("balance", 0)
        
        # Tolerância de 0.01 para diferenças de arredondamento
        tolerance = 0.01
        
        if abs(calculated_income - summary_income) > tolerance:
            issues.append({
                "type": "balance_mismatch",
                "field": "income",
                "calculated": calculated_income,
                "summary": summary_income,
                "difference": abs(calculated_income - summary_income),
                "message": f"Soma de receitas não confere. Calculado: R$ {calculated_income:.2f}, Resumo: R$ {summary_income:.2f}"
            })
        
        if abs(calculated_expenses - summary_expenses) > tolerance:
            issues.append({
                "type": "balance_mismatch",
                "field": "expenses",
                "calculated": calculated_expenses,
                "summary": summary_expenses,
                "difference": abs(calculated_expenses - summary_expenses),
                "message": f"Soma de despesas não confere. Calculado: R$ {calculated_expenses:.2f}, Resumo: R$ {summary_expenses:.2f}"
            })
        
        if abs(calculated_balance - summary_balance) > tolerance:
            issues.append({
                "type": "balance_mismatch",
                "field": "balance",
                "calculated": calculated_balance,
                "summary": summary_balance,
                "difference": abs(calculated_balance - summary_balance),
                "message": f"Saldo não confere. Calculado: R$ {calculated_balance:.2f}, Resumo: R$ {summary_balance:.2f}"
            })
        
    except Exception as e:
        issues.append({
            "type": "balance_check_error",
            "message": f"Erro ao verificar consistência de saldo: {str(e)}"
        })
    
    return issues, warnings
