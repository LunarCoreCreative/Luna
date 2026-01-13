"""
Luna Business AI Categorization Module
---------------------------------------
Sistema de categorização automática de transações usando IA e aprendizado.
"""

from typing import Dict, List, Optional, Tuple
from collections import Counter
import re

from .storage import load_transactions


def suggest_category(user_id: str, description: str, transaction_type: str = "expense") -> Tuple[Optional[str], float]:
    """
    Sugere categoria baseada na descrição e histórico.
    
    Args:
        user_id: ID do usuário
        description: Descrição da transação
        transaction_type: Tipo de transação (income, expense, investment)
    
    Returns:
        (suggested_category, confidence) - categoria sugerida e confiança (0-1)
    """
    if not description or not description.strip():
        return None, 0.0
    
    description_lower = description.lower().strip()
    
    # Carrega histórico de transações
    transactions = load_transactions(user_id)
    
    # Filtra transações do mesmo tipo
    same_type_txs = [tx for tx in transactions if tx.get("type") == transaction_type]
    
    if not same_type_txs:
        # Se não há histórico, usa categorias padrão baseadas em palavras-chave
        return suggest_by_keywords(description_lower, transaction_type)
    
    # Analisa padrões no histórico
    category_scores = analyze_historical_patterns(same_type_txs, description_lower)
    
    if category_scores:
        # Retorna categoria com maior score
        best_category, confidence = max(category_scores.items(), key=lambda x: x[1])
        return best_category, min(confidence, 1.0)
    
    # Fallback para palavras-chave
    return suggest_by_keywords(description_lower, transaction_type)


def analyze_historical_patterns(transactions: List[Dict], description: str) -> Dict[str, float]:
    """
    Analisa padrões históricos para sugerir categoria.
    
    Returns:
        Dicionário com scores por categoria
    """
    category_scores = {}
    
    # Extrai palavras da descrição
    description_words = set(re.findall(r'\b\w+\b', description.lower()))
    
    if not description_words:
        return category_scores
    
    # Agrupa transações por categoria
    category_transactions = {}
    for tx in transactions:
        cat = tx.get("category", "geral")
        if cat not in category_transactions:
            category_transactions[cat] = []
        category_transactions[cat].append(tx)
    
    # Calcula score para cada categoria
    for category, cat_txs in category_transactions.items():
        if not cat_txs:
            continue
        
        # Conta frequência da categoria
        category_frequency = len(cat_txs) / len(transactions)
        
        # Analisa palavras comuns nesta categoria
        all_descriptions = " ".join([tx.get("description", "").lower() for tx in cat_txs])
        category_words = set(re.findall(r'\b\w+\b', all_descriptions))
        
        # Calcula similaridade de palavras
        common_words = description_words.intersection(category_words)
        word_similarity = len(common_words) / len(description_words) if description_words else 0
        
        # Score combina frequência e similaridade
        score = (category_frequency * 0.4) + (word_similarity * 0.6)
        
        if score > 0.1:  # Threshold mínimo
            category_scores[category] = score
    
    return category_scores


def suggest_by_keywords(description: str, transaction_type: str) -> Tuple[Optional[str], float]:
    """
    Sugere categoria baseada em palavras-chave quando não há histórico.
    
    Returns:
        (suggested_category, confidence)
    """
    # Palavras-chave por categoria (para despesas)
    expense_keywords = {
        "alimentação": ["restaurante", "comida", "lanche", "mercado", "supermercado", "padaria", "açougue", "peixaria"],
        "transporte": ["uber", "taxi", "gasolina", "combustível", "ônibus", "metrô", "estacionamento", "pedágio"],
        "saúde": ["farmácia", "médico", "hospital", "clínica", "dentista", "exame", "medicamento"],
        "educação": ["escola", "curso", "faculdade", "livro", "material", "mensalidade"],
        "lazer": ["cinema", "show", "festival", "viagem", "hotel", "passeio", "parque"],
        "casa": ["aluguel", "condomínio", "luz", "água", "gás", "internet", "telefone", "energia"],
        "vestuário": ["roupa", "calçado", "acessório", "moda", "loja"],
        "serviços": ["banco", "seguro", "plano", "assinatura", "streaming"]
    }
    
    # Palavras-chave por categoria (para receitas)
    income_keywords = {
        "salário": ["salário", "salario", "pagamento", "folha"],
        "freelance": ["freelance", "projeto", "serviço", "consultoria"],
        "investimento": ["dividendo", "rendimento", "juros", "aplicação"],
        "venda": ["venda", "vendas", "receita", "faturamento"]
    }
    
    # Escolhe dicionário baseado no tipo
    keywords_dict = income_keywords if transaction_type == "income" else expense_keywords
    
    description_lower = description.lower()
    
    # Procura palavras-chave
    for category, keywords in keywords_dict.items():
        for keyword in keywords:
            if keyword in description_lower:
                return category, 0.7  # Confiança média para palavras-chave
    
    # Se não encontrou, retorna categoria padrão
    return "geral", 0.3


def auto_categorize_transaction(user_id: str, description: str, transaction_type: str, min_confidence: float = 0.5) -> Optional[str]:
    """
    Categoriza automaticamente uma transação se a confiança for alta.
    
    Args:
        user_id: ID do usuário
        description: Descrição da transação
        transaction_type: Tipo de transação
        min_confidence: Confiança mínima para auto-categorizar (padrão: 0.5)
    
    Returns:
        Categoria sugerida ou None se confiança baixa
    """
    suggested_category, confidence = suggest_category(user_id, description, transaction_type)
    
    if confidence >= min_confidence:
        return suggested_category
    
    return None


def learn_from_correction(user_id: str, description: str, category: str, transaction_type: str) -> None:
    """
    Aprende com correção manual de categoria.
    Isso pode ser usado para melhorar sugestões futuras.
    
    Args:
        user_id: ID do usuário
        description: Descrição da transação
        category: Categoria corrigida
        transaction_type: Tipo de transação
    """
    # Por enquanto, apenas loga a correção
    # Em uma implementação mais avançada, poderia salvar padrões aprendidos
    print(f"[BUSINESS-AI-CAT] Aprendendo: '{description}' -> '{category}' (tipo: {transaction_type})")
    
    # Futuro: salvar padrões aprendidos em arquivo separado
    # para melhorar sugestões baseadas em correções do usuário


def batch_suggest_categories(user_id: str, descriptions: List[str], transaction_type: str = "expense") -> List[Tuple[str, Optional[str], float]]:
    """
    Sugere categorias para múltiplas descrições.
    
    Args:
        user_id: ID do usuário
        descriptions: Lista de descrições
        transaction_type: Tipo de transação
    
    Returns:
        Lista de tuplas (description, suggested_category, confidence)
    """
    results = []
    for desc in descriptions:
        category, confidence = suggest_category(user_id, desc, transaction_type)
        results.append((desc, category, confidence))
    return results
