"""
Luna Business Date Utilities
------------------------------
Utilitários para validação, normalização e manipulação de datas.
Padroniza todas as datas para UTC (ISO 8601).
"""

from datetime import datetime, timezone, date
from typing import Optional, Tuple
import re


# Formatos de data aceitos
DATE_FORMATS = [
    "%Y-%m-%d",           # YYYY-MM-DD
    "%Y-%m-%dT%H:%M:%S",  # YYYY-MM-DDTHH:MM:SS
    "%Y-%m-%dT%H:%M:%SZ", # YYYY-MM-DDTHH:MM:SSZ
    "%Y-%m-%d %H:%M:%S",  # YYYY-MM-DD HH:MM:SS
    "%d/%m/%Y",           # DD/MM/YYYY (compatibilidade)
    "%d-%m-%Y",           # DD-MM-YYYY (compatibilidade)
]

# Regex para validação rápida
DATE_PATTERN = re.compile(r'^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})?)?$')
DATE_ONLY_PATTERN = re.compile(r'^\d{4}-\d{2}-\d{2}$')


def validate_date_format(date_str: str) -> Tuple[bool, Optional[str]]:
    """
    Valida se a string de data está em um formato aceito.
    
    Args:
        date_str: String de data a validar
    
    Returns:
        (is_valid: bool, error_message: Optional[str])
    """
    if not date_str or not isinstance(date_str, str):
        return False, "Data deve ser uma string não vazia"
    
    date_str = date_str.strip()
    
    # Validação rápida com regex
    if not DATE_PATTERN.match(date_str) and not DATE_ONLY_PATTERN.match(date_str):
        # Tenta formatos alternativos
        for fmt in DATE_FORMATS:
            try:
                datetime.strptime(date_str, fmt)
                return True, None
            except ValueError:
                continue
        return False, f"Formato de data inválido. Use YYYY-MM-DD ou ISO 8601"
    
    return True, None


def normalize_date(date_input: Optional[str], default_to_now: bool = True) -> str:
    """
    Normaliza uma data para formato ISO 8601 UTC.
    
    Args:
        date_input: String de data ou None
        default_to_now: Se True e date_input for None, usa data/hora atual
    
    Returns:
        String ISO 8601 em UTC (ex: "2025-01-27T12:00:00Z")
    
    Raises:
        ValueError: Se a data for inválida
    """
    # Se None e default_to_now, usa agora
    if date_input is None:
        if default_to_now:
            return datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')
        raise ValueError("Data não fornecida e default_to_now=False")
    
    if not isinstance(date_input, str):
        raise ValueError(f"Data deve ser string, recebido: {type(date_input)}")
    
    date_str = date_input.strip()
    
    # Valida formato
    is_valid, error = validate_date_format(date_str)
    if not is_valid:
        raise ValueError(error)
    
    # Se for apenas data (YYYY-MM-DD), adiciona hora meia-noite UTC
    if DATE_ONLY_PATTERN.match(date_str):
        # Cria datetime com hora 00:00:00 UTC
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        dt = dt.replace(tzinfo=timezone.utc)
        return dt.isoformat().replace('+00:00', 'Z')
    
    # Tenta parsear como ISO 8601
    try:
        # Remove 'Z' e substitui por +00:00 para compatibilidade
        if date_str.endswith('Z'):
            date_str = date_str[:-1] + '+00:00'
        
        # Tenta parsear
        dt = datetime.fromisoformat(date_str.replace('Z', '+00:00'))
        
        # Se não tem timezone, assume UTC
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        
        # Converte para UTC
        dt_utc = dt.astimezone(timezone.utc)
        
        # Retorna em formato ISO 8601 com Z
        return dt_utc.isoformat().replace('+00:00', 'Z')
        
    except ValueError:
        # Tenta formatos alternativos
        for fmt in DATE_FORMATS:
            try:
                dt = datetime.strptime(date_str, fmt)
                # Assume UTC se não tem timezone
                if dt.tzinfo is None:
                    dt = dt.replace(tzinfo=timezone.utc)
                else:
                    dt = dt.astimezone(timezone.utc)
                return dt.isoformat().replace('+00:00', 'Z')
            except ValueError:
                continue
        
        raise ValueError(f"Não foi possível parsear a data: {date_str}")


def get_date_only(iso_date: str) -> str:
    """
    Extrai apenas a parte da data (YYYY-MM-DD) de uma string ISO 8601.
    
    Args:
        iso_date: String ISO 8601
    
    Returns:
        String YYYY-MM-DD
    """
    if not iso_date:
        return ""
    
    # Remove timezone e hora se presente
    date_part = iso_date.split('T')[0]
    
    # Valida que é YYYY-MM-DD
    if DATE_ONLY_PATTERN.match(date_part):
        return date_part
    
    return ""


def get_period_from_date(iso_date: str) -> str:
    """
    Extrai o período (YYYY-MM) de uma data ISO 8601.
    
    Args:
        iso_date: String ISO 8601
    
    Returns:
        String YYYY-MM
    """
    date_only = get_date_only(iso_date)
    if len(date_only) >= 7:
        return date_only[:7]
    return ""


def compare_dates(date1: str, date2: str) -> int:
    """
    Compara duas datas ISO 8601.
    
    Args:
        date1: Primeira data ISO 8601
        date2: Segunda data ISO 8601
    
    Returns:
        -1 se date1 < date2, 0 se iguais, 1 se date1 > date2
    """
    try:
        dt1 = datetime.fromisoformat(date1.replace('Z', '+00:00'))
        dt2 = datetime.fromisoformat(date2.replace('Z', '+00:00'))
        
        if dt1 < dt2:
            return -1
        elif dt1 > dt2:
            return 1
        else:
            return 0
    except (ValueError, AttributeError):
        # Fallback: compara strings
        if date1 < date2:
            return -1
        elif date1 > date2:
            return 1
        else:
            return 0


def is_date_in_period(iso_date: str, period: str) -> bool:
    """
    Verifica se uma data está em um período específico (YYYY-MM).
    
    Args:
        iso_date: Data ISO 8601
        period: Período no formato YYYY-MM
    
    Returns:
        True se a data está no período
    """
    date_period = get_period_from_date(iso_date)
    return date_period == period


def format_date_for_display(iso_date: str, format: str = "pt-BR") -> str:
    """
    Formata uma data ISO 8601 para exibição.
    
    Args:
        iso_date: Data ISO 8601
        format: Formato de exibição ("pt-BR", "en-US", etc)
    
    Returns:
        String formatada
    """
    try:
        dt = datetime.fromisoformat(iso_date.replace('Z', '+00:00'))
        
        if format == "pt-BR":
            return dt.strftime("%d/%m/%Y")
        elif format == "pt-BR-full":
            return dt.strftime("%d/%m/%Y %H:%M")
        elif format == "en-US":
            return dt.strftime("%Y-%m-%d")
        else:
            return iso_date
    except (ValueError, AttributeError):
        return iso_date
