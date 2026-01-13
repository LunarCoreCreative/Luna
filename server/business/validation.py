"""
Luna Business Validation Module
--------------------------------
Validações centralizadas para dados de negócio.
"""

from typing import Tuple, Optional


# Limites de valores
MIN_VALUE = 0.01  # Mínimo: R$ 0,01 (1 centavo)
MAX_VALUE = 1_000_000_000.0  # Máximo: R$ 1 bilhão


def validate_value(value: any, field_name: str = "value") -> Tuple[bool, Optional[float], Optional[str]]:
    """
    Valida e converte um valor monetário.
    
    Args:
        value: Valor a validar (pode ser string, int, float)
        field_name: Nome do campo para mensagens de erro
    
    Returns:
        (is_valid: bool, converted_value: Optional[float], error_message: Optional[str])
    """
    # 1. Verifica se é None ou vazio
    if value is None:
        return False, None, f"{field_name} não pode ser vazio"
    
    # 2. Tenta converter para float
    try:
        if isinstance(value, str):
            # Remove espaços e caracteres de formatação
            value = value.strip().replace("R$", "").replace("$", "").replace(",", ".").strip()
            if not value:
                return False, None, f"{field_name} não pode ser vazio"
        
        converted = float(value)
        
        # 3. Verifica se é NaN ou infinito
        if not (converted == converted):  # NaN check
            return False, None, f"{field_name} deve ser um número válido"
        
        if abs(converted) == float('inf'):
            return False, None, f"{field_name} não pode ser infinito"
        
        # 4. Verifica limites
        if converted < MIN_VALUE:
            return False, None, f"{field_name} deve ser no mínimo R$ {MIN_VALUE:.2f}"
        
        if converted > MAX_VALUE:
            return False, None, f"{field_name} deve ser no máximo R$ {MAX_VALUE:,.2f}"
        
        # 5. Arredonda para 2 casas decimais (padrão monetário)
        converted = round(converted, 2)
        
        return True, converted, None
        
    except (ValueError, TypeError) as e:
        return False, None, f"{field_name} deve ser um número válido: {str(e)}"


def validate_description(description: str, field_name: str = "description") -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Valida uma descrição de transação.
    
    Args:
        description: Descrição a validar
        field_name: Nome do campo para mensagens de erro
    
    Returns:
        (is_valid: bool, cleaned_description: Optional[str], error_message: Optional[str])
    """
    if not description:
        return False, None, f"{field_name} é obrigatório"
    
    if not isinstance(description, str):
        return False, None, f"{field_name} deve ser uma string"
    
    cleaned = description.strip()
    
    if not cleaned:
        return False, None, f"{field_name} não pode ser vazio"
    
    if len(cleaned) > 500:
        return False, None, f"{field_name} não pode ter mais de 500 caracteres"
    
    return True, cleaned, None


def validate_transaction_type(tx_type: str) -> Tuple[bool, Optional[str]]:
    """
    Valida o tipo de transação.
    
    Args:
        tx_type: Tipo a validar
    
    Returns:
        (is_valid: bool, error_message: Optional[str])
    """
    valid_types = ["income", "expense", "investment"]
    
    if not tx_type:
        return False, "Tipo de transação é obrigatório"
    
    if tx_type not in valid_types:
        return False, f"Tipo deve ser um de: {', '.join(valid_types)}"
    
    return True, None


def validate_category(category: str) -> Tuple[bool, Optional[str], Optional[str]]:
    """
    Valida uma categoria.
    
    Args:
        category: Categoria a validar
    
    Returns:
        (is_valid: bool, cleaned_category: Optional[str], error_message: Optional[str])
    """
    if not category:
        return True, "geral", None  # Categoria padrão
    
    if not isinstance(category, str):
        return False, None, "Categoria deve ser uma string"
    
    cleaned = category.strip().lower()
    
    if len(cleaned) > 50:
        return False, None, "Categoria não pode ter mais de 50 caracteres"
    
    # Remove caracteres especiais perigosos
    import re
    cleaned = re.sub(r'[<>"\']', '', cleaned)
    
    return True, cleaned, None
