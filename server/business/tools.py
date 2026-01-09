"""
Luna Business Tools
--------------------
Agent tools for business management via chat.
"""

from typing import Dict

from .storage import (
    add_transaction as storage_add_transaction,
    get_summary as storage_get_summary,
    load_transactions,
    add_client as storage_add_client,
    search_clients as storage_search_clients,
    update_transaction as storage_update_transaction,
    delete_transaction as storage_delete_transaction
)
from .tags import add_tag as storage_add_tag

# Import recurring loader (safe import)
try:
    from .recurring import load_recurring
except ImportError:
    load_recurring = lambda uid: []

# =============================================================================
# TOOL DEFINITIONS (para registro no agente principal)
# =============================================================================

BUSINESS_TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "add_transaction",
            "description": "Registra uma transação financeira (entrada ou saída de dinheiro). Use quando o usuário mencionar pagamentos, vendas, compras, gastos ou receitas.",
            "parameters": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": ["income", "expense", "investment"],
                        "description": "Tipo: 'income' (entrada), 'expense' (saída), 'investment' (investimento)"
                    },
                    "value": {
                        "type": "number",
                        "description": "Valor em reais (sempre positivo)"
                    },
                    "description": {
                        "type": "string",
                        "description": "Descrição curta da transação (ex: 'Mensalidade João', 'Conta de luz')"
                    },
                    "category": {
                        "type": "string",
                        "description": "Categoria/Tag da transação (ex: 'mensalidade', 'despesa', 'alimentacao'). O sistema cria se não existir."
                    },
                    "date": {
                        "type": "string",
                        "description": "Data da transação no formato YYYY-MM-DD (opcional, padrão é hoje)"
                    }
                },
                "required": ["type", "value", "description"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "edit_transaction",
            "description": "Edita ou corrige uma transação existente.",
            "parameters": {
                "type": "object",
                "properties": {
                    "transaction_id": {
                        "type": "string",
                        "description": "ID da transação a ser editada."
                    },
                    "value": {
                        "type": "number",
                        "description": "Novo valor (opcional)"
                    },
                    "description": {
                         "type": "string",
                         "description": "Nova descrição (opcional)"
                    },
                    "category": {
                        "type": "string",
                        "description": "Nova categoria (opcional)"
                    },
                    "date": {
                        "type": "string",
                        "description": "Nova data YYYY-MM-DD (opcional)"
                    },
                    "type": {
                        "type": "string",
                        "enum": ["income", "expense", "investment"],
                        "description": "Novo tipo (opcional)"
                    }
                },
                "required": ["transaction_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_transaction",
            "description": "Remove uma transação lançada errado.",
            "parameters": {
                "type": "object",
                "properties": {
                    "transaction_id": {
                        "type": "string",
                        "description": "ID da transação a remover"
                    }
                },
                "required": ["transaction_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_tag",
            "description": "Cria uma nova categoria/tag para organizar as finanças.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Nome da nova categoria (ex: 'Carro', 'Viagem')"
                    },
                    "color": {
                        "type": "string",
                        "description": "Cor em Hex (opcional, ex: #ff0000)"
                    }
                },
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_balance",
            "description": "Retorna o saldo atual e resumo financeiro (total de entradas, saídas e número de transações).",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "list_transactions",
            "description": "Lista as transações recentes filtradas por período ou tipo.",
            "parameters": {
                "type": "object",
                "properties": {
                    "limit": {
                        "type": "integer",
                        "description": "Número máximo de transações a retornar (padrão: 10)"
                    },
                    "type": {
                        "type": "string",
                        "enum": ["income", "expense", "all"],
                        "description": "Filtrar por tipo (padrão: all)"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "add_client",
            "description": "Cadastra um novo cliente com nome e contato opcional.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Nome do cliente"
                    },
                    "contact": {
                        "type": "string",
                        "description": "Telefone ou email de contato (opcional)"
                    }
                },
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_recurring_items",
            "description": "Lista despesas e gastos fixos/recorrentes para projeção de fluxo de caixa.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    }
]

# =============================================================================
# TOOL EXECUTORS
# =============================================================================

def execute_business_tool(name: str, args: Dict, user_id: str = "local") -> Dict:
    """Execute a business tool and return the result."""
    
    if name == "add_transaction":
        tx = storage_add_transaction(
            user_id=user_id,
            type=args.get("type", "expense"),
            value=args.get("value", 0),
            description=args.get("description", ""),
            category=args.get("category", "geral"),
            date=args.get("date")
        )
        return {
            "success": True,
            "message": f"Transação registrada: {tx['description']} - R$ {tx['value']:.2f}",
            "transaction": tx
        }
    
    elif name == "edit_transaction" or name == "update_transaction":
        # Handle flexible arguments (AI often flattens the schema)
        tx_id = args.get("transaction_id") or args.get("id")
        
        changes = {}
        # 1. Try to get from 'changes' nested object (legacy/compat)
        if "changes" in args and isinstance(args["changes"], dict):
            changes.update(args["changes"])
            
        # 2. Get from top-level args (preferred/new schema)
        # Also map common aliases that AI might use by mistake
        FIELD_MAP = {
            "name": "description",
            "title": "description",
            "label": "description",
            "amount": "value",
            "cost": "value",
            "tag": "category",
            "tags": "category",
            "day": "date"
        }
        
        valid_fields = ["value", "description", "category", "date", "type"]
        
        for k, v in args.items():
            if k in ["transaction_id", "id", "changes"]:
                continue
                
            # Direct match
            if k in valid_fields:
                changes[k] = v
                continue
                
            # Alias match
            if k in FIELD_MAP:
                final_key = FIELD_MAP[k]
                changes[final_key] = v
        
        updated = storage_update_transaction(user_id, tx_id, changes)
        if updated:
            return {
                "success": True,
                "message": "Transação atualizada com sucesso.",
                "transaction": updated
            }
        return {"success": False, "message": "Erro: Transação não encontrada."}

    elif name == "delete_transaction":
        tx_id = args.get("transaction_id")
        if storage_delete_transaction(user_id, tx_id):
            return {"success": True, "message": "Transação removida."}
        return {"success": False, "message": "Erro: Transação não encontrada."}

    elif name == "add_tag":
        label = args.get("name")
        color = args.get("color")
        tag = storage_add_tag(user_id, label, color)
        return {
            "success": True,
            "message": f"Categoria '{label}' criada com sucesso.",
            "tag": tag
        }
    
    elif name == "get_balance":
        summary = storage_get_summary(user_id)
        return {
            "success": True,
            "balance": summary["balance"],
            "income": summary["income"],
            "expenses": summary["expenses"],
            "transaction_count": summary["transaction_count"],
            "message": f"Saldo atual: R$ {summary['balance']:.2f} (Entradas: R$ {summary['income']:.2f}, Saídas: R$ {summary['expenses']:.2f})"
        }
    
    elif name == "list_transactions" or name == "get_transactions":
        limit = args.get("limit", 10)
        type_filter = args.get("type", "all")
        
        transactions = load_transactions(user_id)
        transactions.sort(key=lambda x: x.get("date", ""), reverse=True)
        
        if type_filter != "all":
            transactions = [t for t in transactions if t["type"] == type_filter]
        
        transactions = transactions[:limit]
        
        return {
            "success": True,
            "transactions": transactions,
            "count": len(transactions)
        }
    
    elif name == "add_client":
        client = storage_add_client(
            user_id=user_id,
            name=args.get("name", ""),
            contact=args.get("contact", "")
        )
        return {
            "success": True,
            "message": f"Cliente cadastrado: {client['name']}",
            "client": client
        }

    elif name == "get_recurring_items":
        items = load_recurring(user_id)
        return {
            "success": True,
            "items": items,
            "count": len(items),
            "message": f"Achei {len(items)} itens recorrentes."
        }
    
    return {"success": False, "error": f"Ferramenta desconhecida: {name}"}
