"""
Luna Business Sync Module
-------------------------
Sistema de sincronização e reconciliação entre Firebase e Local Storage.
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

# Local storage imports
from .storage import (
    _load_local_transactions,
    _save_local_transactions,
    get_user_data_dir
)


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
    Reconcilia transações entre Firebase e Local Storage.
    
    Estratégia:
    1. Carrega transações do Firebase
    2. Carrega transações locais
    3. Compara e identifica diferenças
    4. Sincroniza: Firebase é considerado fonte da verdade se houver conflito
    5. Sincroniza transações locais não presentes no Firebase
    
    Args:
        user_id: ID do usuário
        force: Se True, força reconciliação mesmo se recente
    
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
        # 1. Carregar transações locais
        local_txs = _load_local_transactions(user_id)
        result.local_count = len(local_txs)
        print(f"[BUSINESS-SYNC] 📦 Carregadas {result.local_count} transações locais")
        
        # 2. Carregar transações do Firebase (com retry)
        firebase_txs = []
        if FIREBASE_AVAILABLE and user_id and user_id != "local" and len(user_id) > 10:
            def load_firebase():
                try:
                    txs = get_user_transactions(user_id, limit=2000)
                    return True, txs
                except Exception as e:
                    return False, str(e)
            
            success, firebase_result, attempts = _retry_with_backoff(load_firebase)
            
            if success:
                firebase_txs = firebase_result
                result.firebase_count = len(firebase_txs)
                print(f"[BUSINESS-SYNC] ☁️ Carregadas {result.firebase_count} transações do Firebase")
            else:
                result.errors.append(f"Falha ao carregar do Firebase após {attempts} tentativas: {firebase_result}")
                print(f"[BUSINESS-SYNC] ❌ Erro ao carregar Firebase: {firebase_result}")
                # Continua com apenas local
        else:
            print(f"[BUSINESS-SYNC] ⚠️ Firebase não disponível, usando apenas local")
        
        # 3. Criar índices por ID para comparação rápida
        local_by_id = {tx.get("id"): tx for tx in local_txs if tx.get("id")}
        firebase_by_id = {tx.get("id"): tx for tx in firebase_txs if tx.get("id")}
        
        # 4. Identificar transações apenas no Firebase (precisa adicionar localmente)
        firebase_only = []
        for tx_id, tx in firebase_by_id.items():
            if tx_id not in local_by_id:
                firebase_only.append(tx)
        
        # 5. Identificar transações apenas no Local (precisa sincronizar para Firebase)
        local_only = []
        for tx_id, tx in local_by_id.items():
            if tx_id not in firebase_by_id:
                local_only.append(tx)
        
        # 6. Identificar conflitos (mesmo ID, dados diferentes)
        conflicts = []
        for tx_id in set(local_by_id.keys()) & set(firebase_by_id.keys()):
            local_tx = local_by_id[tx_id]
            firebase_tx = firebase_by_id[tx_id]
            
            # Compara campos relevantes (ignora timestamps de sync)
            local_key = (
                local_tx.get("type"),
                local_tx.get("value"),
                local_tx.get("description"),
                local_tx.get("category"),
                local_tx.get("date", "")[:10]  # Apenas data, sem hora
            )
            firebase_key = (
                firebase_tx.get("type"),
                firebase_tx.get("value"),
                firebase_tx.get("description"),
                firebase_tx.get("category"),
                firebase_tx.get("date", "")[:10]
            )
            
            if local_key != firebase_key:
                conflicts.append({
                    "id": tx_id,
                    "local": local_tx,
                    "firebase": firebase_tx
                })
        
        result.conflicts = conflicts
        
        # 7. Resolver conflitos: Firebase é fonte da verdade
        if conflicts:
            print(f"[BUSINESS-SYNC] ⚠️ Encontrados {len(conflicts)} conflitos, usando Firebase como fonte da verdade")
        
        # 8. Sincronizar: mesclar Firebase + Local (Firebase tem prioridade)
        merged_txs = {}
        
        # Primeiro adiciona todas do Firebase (fonte da verdade)
        for tx in firebase_txs:
            tx_id = tx.get("id")
            if tx_id:
                merged_txs[tx_id] = tx
        
        # Depois adiciona as locais que não estão no Firebase
        for tx in local_only:
            tx_id = tx.get("id")
            if tx_id and tx_id not in merged_txs:
                merged_txs[tx_id] = tx
                # Tenta sincronizar para Firebase
                if FIREBASE_AVAILABLE and user_id and user_id != "local" and len(user_id) > 10:
                    success, error = sync_transaction_to_firebase(user_id, tx, retry=True)
                    if success:
                        result.synced_count += 1
                    else:
                        result.errors.append(f"Falha ao sincronizar tx {tx_id}: {error}")
        
        # 9. Salvar resultado mesclado localmente
        merged_list = list(merged_txs.values())
        # Ordenar por data (mais recente primeiro)
        merged_list.sort(key=lambda x: x.get("date", ""), reverse=True)
        
        _save_local_transactions(user_id, merged_list)
        
        result.synced_count += len(firebase_only)  # Conta as que foram adicionadas do Firebase
        result.success = True
        
        print(f"[BUSINESS-SYNC] ✅ Reconciliação concluída:")
        print(f"  - Local: {result.local_count} → {len(merged_list)} transações")
        print(f"  - Firebase: {result.firebase_count} transações")
        print(f"  - Sincronizadas: {result.synced_count} transações")
        print(f"  - Conflitos resolvidos: {len(conflicts)}")
        if result.errors:
            print(f"  - Erros: {len(result.errors)}")
        
    except Exception as e:
        result.errors.append(f"Erro durante reconciliação: {str(e)}")
        print(f"[BUSINESS-SYNC] ❌ Erro na reconciliação: {e}")
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
    Verifica integridade dos dados entre Firebase e Local.
    
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
        # Carregar local
        local_txs = _load_local_transactions(user_id)
        result["local_count"] = len(local_txs)
        local_by_id = {tx.get("id"): tx for tx in local_txs if tx.get("id")}
        
        # Carregar Firebase
        firebase_txs = []
        if FIREBASE_AVAILABLE and user_id and user_id != "local" and len(user_id) > 10:
            try:
                firebase_txs = get_user_transactions(user_id, limit=2000)
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
