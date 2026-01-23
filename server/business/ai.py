import re
import unicodedata
from typing import Dict, List, Optional, Tuple
from . import storage

def normalize_text(text: str) -> str:
    """
    Removes accents and converts to lowercase.
    """
    if not text: return ""
    # Normalize unicode characters to remove accents
    text = unicodedata.normalize('NFD', text.lower())
    text = ''.join(c for c in text if unicodedata.category(c) != 'Mn')
    return text.strip()

def suggest_category(description: str, transaction_type: str = "expense") -> Tuple[str, float]:
    """
    Suggests a category based on description and historical data.
    Returns (suggested_category, confidence).
    """
    if not description or not description.strip():
        return "geral", 0.0
        
    desc_norm = normalize_text(description)
    
    # 1. Historical Pattern Matching
    transactions = storage.get_transactions({'limit': 1000})
    same_type_txs = [tx for tx in transactions if tx.get('type') == transaction_type]
    
    if same_type_txs:
        # Check for exact normalized description matches first (high confidence)
        exact_matches = [tx for tx in same_type_txs if normalize_text(tx.get('description', '')) == desc_norm]
        if exact_matches:
            # Get the most frequent category for this exact description
            categories = [tx.get('category', 'geral') for tx in exact_matches]
            most_common = max(set(categories), key=categories.count)
            return most_common, 0.95

        # Pattern matching (basic word similarity)
        scores = analyze_patterns(same_type_txs, desc_norm)
        if scores:
            best_cat = max(scores, key=scores.get)
            if scores[best_cat] > 0.3:
                return best_cat, min(scores[best_cat], 0.9)

    # 2. Keyword Fallback
    return suggest_by_keywords(desc_norm, transaction_type)

def analyze_patterns(transactions: List[Dict], description: str) -> Dict[str, float]:
    """
    Analyzes historical data to find the best category match for a description.
    """
    scores = {}
    tokens = set(re.findall(r'\w+', description))
    if not tokens: return scores
    
    # Group by category
    cat_data = {}
    for tx in transactions:
        cat = tx.get('category', 'geral')
        if cat not in cat_data: cat_data[cat] = []
        cat_data[cat].append(tx)
        
    for cat, txs in cat_data.items():
        # Frequency score
        freq = len(txs) / len(transactions)
        
        # Word overlap score
        cat_tokens = set()
        for tx in txs:
            cat_tokens.update(re.findall(r'\w+', tx.get('description', '').lower()))
            
        overlap = tokens.intersection(cat_tokens)
        similarity = len(overlap) / len(tokens)
        
        # Combined score
        scores[cat] = (freq * 0.3) + (similarity * 0.7)
        
    return scores

def suggest_by_keywords(description: str, transaction_type: str) -> Tuple[str, float]:
    """
    Static keyword mapping for common categories.
    """
    expense_map = {
        "alimentação": ["restaurante", "ifood", "comida", "almoço", "jantar", "mercado", "super", "padaria", "lanche", "café"],
        "transporte": ["uber", "99", "gasolina", "combustivel", "metrô", "onibus", "estacionamento", "pedagio"],
        "casa": ["aluguel", "luz", "agua", "internet", "enel", "sabesp", "gas", "condominio", "móveis"],
        "lazer": ["cinema", "netflix", "spotify", "show", "ingresso", "viagem", "hotel", "cerveja", "bar"],
        "saúde": ["farmacia", "droga", "medico", "hospital", "exame", "dentista"],
        "vestuário": ["loja", "renner", "cea", "zara", "roupa", "sapato", "tenis"],
        "serviços": ["banco", "tarifa", "anuidade", "seguro", "nuvini", "nuvem", "hospedagem"],
        "educação": ["curso", "escola", "livro", "faculdade", "mensalidade"],
        "fixo": ["assinatura", "mensal", "plano"]
    }
    
    income_map = {
        "salário": ["salario", "pagamento", "vencimento", "folha"],
        "freelance": ["freelance", "projeto", "extra", "job"],
        "investimento": ["dividendo", "juros", "rendimento", "fii", "acao"],
        "venda": ["venda", "recebido", "pix"]
    }
    
    keywords = income_map if transaction_type == "income" else expense_map
    
    for cat, keys in keywords.items():
        if any(k in description for k in keys):
            return cat, 0.75
            
    return "geral", 0.2
