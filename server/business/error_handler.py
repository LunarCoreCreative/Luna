"""
Luna Business Error Handler
---------------------------
Decorator e utilitários para tratamento de erros consistente.
"""

import traceback
from functools import wraps
from typing import Callable, Any
from fastapi import HTTPException


def handle_business_errors(func: Callable) -> Callable:
    """
    Decorator para tratamento de erros em endpoints de business.
    
    Captura exceções e retorna HTTPException com mensagens descritivas.
    Funciona com funções async e sync.
    """
    @wraps(func)
    async def async_wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except HTTPException:
            # Re-raise HTTPException (já tem status code e mensagem)
            raise
        except ValueError as e:
            # Erros de validação
            error_msg = str(e)
            print(f"[BUSINESS-ERROR] ValueError em {func.__name__}: {error_msg}")
            traceback.print_exc()
            raise HTTPException(400, f"Erro de validação: {error_msg}")
        except KeyError as e:
            # Campos faltando
            error_msg = f"Campo obrigatório faltando: {str(e)}"
            print(f"[BUSINESS-ERROR] KeyError em {func.__name__}: {error_msg}")
            traceback.print_exc()
            raise HTTPException(400, error_msg)
        except FileNotFoundError as e:
            # Arquivo não encontrado
            error_msg = f"Arquivo não encontrado: {str(e)}"
            print(f"[BUSINESS-ERROR] FileNotFoundError em {func.__name__}: {error_msg}")
            raise HTTPException(404, error_msg)
        except PermissionError as e:
            # Erro de permissão
            error_msg = f"Sem permissão: {str(e)}"
            print(f"[BUSINESS-ERROR] PermissionError em {func.__name__}: {error_msg}")
            raise HTTPException(403, error_msg)
        except Exception as e:
            # Erro genérico
            error_type = type(e).__name__
            error_msg = str(e) or "Erro desconhecido"
            print(f"[BUSINESS-ERROR] {error_type} em {func.__name__}: {error_msg}")
            traceback.print_exc()
            raise HTTPException(500, f"Erro interno: {error_msg}")
    
    @wraps(func)
    def sync_wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except HTTPException:
            raise
        except ValueError as e:
            error_msg = str(e)
            print(f"[BUSINESS-ERROR] ValueError em {func.__name__}: {error_msg}")
            traceback.print_exc()
            raise HTTPException(400, f"Erro de validação: {error_msg}")
        except KeyError as e:
            error_msg = f"Campo obrigatório faltando: {str(e)}"
            print(f"[BUSINESS-ERROR] KeyError em {func.__name__}: {error_msg}")
            traceback.print_exc()
            raise HTTPException(400, error_msg)
        except FileNotFoundError as e:
            error_msg = f"Arquivo não encontrado: {str(e)}"
            print(f"[BUSINESS-ERROR] FileNotFoundError em {func.__name__}: {error_msg}")
            raise HTTPException(404, error_msg)
        except PermissionError as e:
            error_msg = f"Sem permissão: {str(e)}"
            print(f"[BUSINESS-ERROR] PermissionError em {func.__name__}: {error_msg}")
            raise HTTPException(403, error_msg)
        except Exception as e:
            error_type = type(e).__name__
            error_msg = str(e) or "Erro desconhecido"
            print(f"[BUSINESS-ERROR] {error_type} em {func.__name__}: {error_msg}")
            traceback.print_exc()
            raise HTTPException(500, f"Erro interno: {error_msg}")
    
    # Detecta se é função async
    import asyncio
    if asyncio.iscoroutinefunction(func):
        return async_wrapper
    else:
        return sync_wrapper


def format_error_message(operation: str, details: str = None) -> str:
    """
    Formata mensagem de erro de forma consistente.
    
    Args:
        operation: Nome da operação (ex: "criar transação")
        details: Detalhes adicionais do erro
    
    Returns:
        Mensagem de erro formatada
    """
    base_msg = f"Erro ao {operation}"
    if details:
        return f"{base_msg}: {details}"
    return base_msg
