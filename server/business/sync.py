"""
Luna Business Sync Module
-------------------------
Sistema de sincronização (apenas Firebase - sem storage local).
"""

import json
import time
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Optional, Tuple
from dataclasses import dataclass

# Firebase imports
try:
    from ..firebase_config import (
        get_user_transactions,
        save_transaction_to_firebase,
        update_transaction_in_firebase,
        delete_transaction_from_firebase
    )
    FIREBASE_AVAILABLE = True
except ImportError:
    FIREBASE_AVAILABLE = False
    print("[BUSINESS-SYNC] ⚠️ Firebase não disponível")

# Storage imports (apenas Firebase agora)
from .storage import load_transactions, get_user_data_dir


@dataclass
class SyncResult:
    """Resultado de uma operação de sincronização."""
    success: bool
    local_count: int
    firebase_count: int
    synced_count: int
    conflicts: List[Dict]
    errors: List[str]
    duration_ms: float


@dataclass
class SyncLog:
    """Log de uma operação de sincronização."""
    timestamp: str
    user_id: str
    operation: str  # 'reconcile', 'sync_to_firebase', 'sync_from_firebase'
    result: SyncResult
    details: Dict


def _save_sync_log(user_id: str, log: SyncLog) -> None:
    """Salva log de sincronização em arquivo."""
    try:
        log_file = get_user_data_dir(user_id) / "sync_logs.json"
        logs = []
        
        if log_file.exists():
            try:
                logs = json.loads(log_file.read_text(encoding="utf-8"))
            except:
                logs = []
        
        # Adiciona novo log
        logs.append({
            "timestamp": log.timestamp,
            "user_id": log.user_id,
            "operation": log.operation,
            "result": {
                "success": log.result.success,
                "local_count": log.result.local_count,
                "firebase_count": log.result.firebase_count,
                "synced_count": log.result.synced_count,
                "conflicts_count": len(log.result.conflicts),
                "errors_count": len(log.result.errors),
                "duration_ms": log.result.duration_ms
            },
            "details": log.details
        })
        
        # Mantém apenas os últimos 100 logs
        logs = logs[-100:]
        
        log_file.write_text(json.dumps(logs, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"[BUSINESS-SYNC] ⚠️ Erro ao salvar log: {e}")


def _retry_with_backoff(func, max_retries: int = 3, initial_delay: float = 1.0):
    """
    Executa função com retry e backoff exponencial.
    
    Args:
        func: Função a executar (deve retornar (success: bool, result: any))
        max_retries: Número máximo de tentativas
        initial_delay: Delay inicial em segundos
    
    Returns:
        Tupla (success: bool, result: any, attempts: int)
    """
    delay = initial_delay
    last_error = None
    
    for attempt in range(max_retries):
        try:
            success, result = func()
            if success:
                if attempt > 0:
                    print(f"[BUSINESS-SYNC] ✅ Sucesso após {attempt + 1} tentativa(s)")
                return True, result, attempt + 1
            else:
                last_error = result  # result contém o erro
        except Exception as e:
            last_error = str(e)
        
        if attempt < max_retries - 1:
            print(f"[BUSINESS-SYNC] ⚠️ Tentativa {attempt + 1}/{max_retries} falhou, aguardando {delay:.1f}s...")
            time.sleep(delay)
            delay *= 2  # Backoff exponencial
    
    print(f"[BUSINESS-SYNC] ❌ Falha após {max_retries} tentativas: {last_error}")
    return False, last_error, max_retries


def sync_transaction_to_firebase(user_id: str, tx: Dict, retry: bool = True) -> Tuple[bool, Optional[str]]:
    """
    Sincroniza uma transação para o Firebase com retry automático.
    
    Returns:
        (success: bool, error_message: Optional[str])
    """
    if not FIREBASE_AVAILABLE or not user_id or user_id == "local" or len(user_id) <= 10:
        return False, "Firebase não disponível ou user_id inválido"
    
    if retry:
        def attempt_save():
            try:
                success = save_transaction_to_firebase(user_id, tx)
                if success:
                    return True, None
                else:
                    return False, "save_transaction_to_firebase retornou False"
            except Exception as e:
                return False, str(e)
        
        success, result, attempts = _retry_with_backoff(attempt_save)
        return success, result if not success else None
    else:
        try:
            success = save_transaction_to_firebase(user_id, tx)
            return success, None if success else "save_transaction_to_firebase retornou False"
        except Exception as e:
            return False, str(e)


def reconcile_transactions(user_id: str, force: bool = False) -> SyncResult:
    """
    Verifica integridade das transações no Firebase.
    (Não há mais storage local para reconciliar)
    
    Args:
        user_id: ID do usuário (Firebase UID)
        force: Ignorado (mantido para compatibilidade)
    
    Returns:
        SyncResult com detalhes da operação
    """
    start_time = time.time()
    result = SyncResult(
        success=False,
        local_count=0,
        firebase_count=0,
        synced_count=0,
        conflicts=[],
        errors=[],
        duration_ms=0.0
    )
    
    try:
        if not FIREBASE_AVAILABLE or not user_id or user_id == "local" or len(user_id) <= 10:
            result.errors.append("Firebase não disponível ou user_id inválido")
            result.duration_ms = (time.time() - start_time) * 1000
            return result
        
        # Carrega transações do Firebase (apenas fonte de dados agora)
        transactions = load_transactions(user_id, auto_reconcile=False)
        result.firebase_count = len(transactions)
        result.local_count = 0  # Sem storage local
        result.synced_count = 0  # Não há mais o que sincronizar
        result.success = True
        
        print(f"[BUSINESS-SYNC] ✅ Verificação concluída: {result.firebase_count} transações no Firebase")
        
    except Exception as e:
        result.errors.append(f"Erro durante verificação: {str(e)}")
        print(f"[BUSINESS-SYNC] ❌ Erro na verificação: {e}")
        import traceback
        traceback.print_exc()
    
    finally:
        result.duration_ms = (time.time() - start_time) * 1000
        
        # Salvar log
        log = SyncLog(
            timestamp=datetime.now().isoformat(),
            user_id=user_id,
            operation="reconcile",
            result=result,
            details={
                "force": force,
                "firebase_available": FIREBASE_AVAILABLE
            }
        )
        _save_sync_log(user_id, log)
    
    return result


def verify_integrity(user_id: str) -> Dict:
    """
    Verifica integridade dos dados no Firebase.
    (Não há mais storage local para comparar)
    
    Returns:
        Dict com status de integridade e detalhes
    """
    result = {
        "valid": True,
        "local_count": 0,
        "firebase_count": 0,
        "missing_in_firebase": [],
        "missing_in_local": [],
        "conflicts": [],
        "errors": []
    }
    
    try:
        if not FIREBASE_AVAILABLE or not user_id or user_id == "local" or len(user_id) <= 10:
            result["valid"] = False
            result["errors"].append("Firebase não disponível ou user_id inválido")
            return result
        
        # Carrega apenas do Firebase (sem storage local)
        transactions = load_transactions(user_id, auto_reconcile=False)
        result["firebase_count"] = len(transactions)
        result["local_count"] = 0  # Sem storage local
        
        print(f"[BUSINESS-SYNC] ✅ Integridade verificada: {result['firebase_count']} transações no Firebase")
        
    except Exception as e:
        result["valid"] = False
        result["errors"].append(f"Erro ao verificar integridade: {str(e)}")
        print(f"[BUSINESS-SYNC] ❌ Erro na verificação: {e}")
        firebase_txs = []
        if FIREBASE_AVAILABLE and user_id and user_id != "local" and len(user_id) > 10:
            try:
                # Limite reduzido para evitar quota exceeded
                firebase_txs = get_user_transactions(user_id, limit=500)
                result["firebase_count"] = len(firebase_txs)
                firebase_by_id = {tx.get("id"): tx for tx in firebase_txs if tx.get("id")}
                
                # Verificar diferenças
                result["missing_in_firebase"] = [
                    tx_id for tx_id in local_by_id.keys() 
                    if tx_id not in firebase_by_id
                ]
                result["missing_in_local"] = [
                    tx_id for tx_id in firebase_by_id.keys()
                    if tx_id not in local_by_id
                ]
                
                # Verificar conflitos
                for tx_id in set(local_by_id.keys()) & set(firebase_by_id.keys()):
                    local_tx = local_by_id[tx_id]
                    firebase_tx = firebase_by_id[tx_id]
                    
                    local_key = (
                        local_tx.get("type"),
                        local_tx.get("value"),
                        local_tx.get("description"),
                        local_tx.get("category"),
                        local_tx.get("date", "")[:10]
                    )
                    firebase_key = (
                        firebase_tx.get("type"),
                        firebase_tx.get("value"),
                        firebase_tx.get("description"),
                        firebase_tx.get("category"),
                        firebase_tx.get("date", "")[:10]
                    )
                    
                    if local_key != firebase_key:
                        result["conflicts"].append({
                            "id": tx_id,
                            "local": local_key,
                            "firebase": firebase_key
                        })
                
                # Validar integridade
                if (result["missing_in_firebase"] or 
                    result["missing_in_local"] or 
                    result["conflicts"]):
                    result["valid"] = False
                    
            except Exception as e:
                result["errors"].append(f"Erro ao carregar Firebase: {str(e)}")
                result["valid"] = False
        else:
            result["errors"].append("Firebase não disponível")
        
    except Exception as e:
        result["errors"].append(f"Erro na verificação: {str(e)}")
        result["valid"] = False
    
    return result


def get_sync_logs(user_id: str, limit: int = 50) -> List[Dict]:
    """Retorna logs de sincronização recentes."""
    try:
        log_file = get_user_data_dir(user_id) / "sync_logs.json"
        if not log_file.exists():
            return []
        
        logs = json.loads(log_file.read_text(encoding="utf-8"))
        return logs[-limit:]
    except Exception as e:
        print(f"[BUSINESS-SYNC] Erro ao carregar logs: {e}")
        return []
