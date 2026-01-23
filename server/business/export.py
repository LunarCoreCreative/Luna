import csv
import io
import json
from typing import List, Dict
from . import storage

def export_transactions_csv() -> str:
    """
    Generates a CSV string of all transactions.
    """
    transactions = storage.get_transactions()
    
    output = io.StringIO()
    # Write BOM for Excel UTF-8 compatibility
    output.write('\ufeff')
    
    if not transactions:
        return output.getvalue()
        
    # Aggregate all unique headers from all transactions
    all_headers = set()
    for tx in transactions:
        all_headers.update(tx.keys())
    headers = sorted(list(all_headers))
    
    writer = csv.DictWriter(output, fieldnames=headers, delimiter=';', quoting=csv.QUOTE_MINIMAL, extrasaction='ignore')
    writer.writeheader()
    for tx in transactions:
        writer.writerow(tx)
        
    return output.getvalue()

def export_full_report_json() -> str:
    """
    Generates a full JSON report containing all business data (backup-like).
    """
    data = {
        "summary": storage.get_summary(),
        "transactions": storage.get_transactions(),
        "recurring": storage.get_recurring(),
        "bills": storage.get_bills(),
        "budget": storage.get_budget(),
        "goals": storage.get_goals(),
        "cards": storage.get_cards(),
        "notifications": storage.get_notifications(),
        "tags": [] 
    }
    
    # Import tags here to avoid circular dependencies if any
    from . import tags
    data["tags"] = tags.load_tags()
    
    return json.dumps(data, indent=4, ensure_ascii=False)

def get_report_summary() -> Dict:
    """
    Generates a dictionary summary for reporting purposes.
    """
    summary = storage.get_summary()
    transactions = storage.get_transactions()
    
    # Simple stats
    total_txs = len(transactions)
    income_txs = len([t for t in transactions if t.get('type') == 'income'])
    expense_txs = len([t for t in transactions if t.get('type') == 'expense'])
    
    return {
        **summary,
        "total_transactions": total_txs,
        "income_count": income_txs,
        "expense_count": expense_txs,
        "generated_at": storage.datetime.now().isoformat()
    }
