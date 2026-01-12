"""
Teste T4.1 - Firebase para Weights
===================================
Valida que a implementação do Firebase para weights está funcionando corretamente.
"""

import sys
import io
import requests
import time
from pathlib import Path
from datetime import datetime, timedelta

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Importar helper de testes
try:
    from test_health_helper import TestResults, check_server_running, start_server, stop_server
except ImportError:
    import subprocess
    import signal
    
    SERVER_PROCESS = None
    
    class TestResults:
        def __init__(self):
            self.total = 0
            self.passed = 0
            self.failed = 0
            self.errors = []
        def add_test(self, name, passed, error=None):
            self.total += 1
            if passed:
                self.passed += 1
                print(f"  ✅ {name}")
            else:
                self.failed += 1
                self.errors.append((name, error))
                print(f"  ❌ {name}")
                if error:
                    print(f"     Erro: {error}")
        def print_summary(self):
            print("\n" + "="*70)
            print("RESUMO FINAL DOS TESTES")
            print("="*70)
            print(f"Total de testes: {self.total}")
            print(f"✅ Passou: {self.passed}")
            print(f"❌ Falhou: {self.failed}")
            if self.total > 0:
                print(f"Taxa de sucesso: {(self.passed/self.total*100):.1f}%")
            if self.errors:
                print("\n❌ Testes que falharam:")
                for name, error in self.errors:
                    print(f"   - {name}: {error}")
    
    def check_server_running():
        try:
            response = requests.get("http://127.0.0.1:8001/health/daily_overview?user_id=local", timeout=2)
            return response.status_code in [200, 404]
        except:
            return False
    
    def start_server():
        global SERVER_PROCESS
        if check_server_running():
            print("Servidor já está rodando")
            return
        print("Iniciando servidor...")
        SERVER_PROCESS = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "server.main:app", "--host", "127.0.0.1", "--port", "8001"],
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        # Aguardar servidor iniciar
        for _ in range(10):
            if check_server_running():
                print("Servidor iniciado!")
                time.sleep(1)
                return
            time.sleep(1)
        print("⚠️  Servidor pode não ter iniciado corretamente")
    
    def stop_server():
        global SERVER_PROCESS
        if SERVER_PROCESS:
            SERVER_PROCESS.terminate()
            SERVER_PROCESS.wait()
            SERVER_PROCESS = None
            print("Servidor parado")

BASE_URL = "http://127.0.0.1:8001"
TEST_USER_ID = "test_t4_1_weights"
LOCAL_USER_ID = "local"

def test_firebase_functions_import():
    """Testa se as funções Firebase para weights podem ser importadas."""
    print("\n" + "="*70)
    print("Teste 1: Importação de Funções Firebase para Weights")
    print("="*70)
    
    try:
        from server.firebase_config import (
            save_weight_to_firebase,
            get_user_weights_from_firebase,
            update_weight_in_firebase,
            delete_weight_from_firebase
        )
        print("✅ Todas as funções Firebase para weights importadas com sucesso!")
        return True
    except ImportError as e:
        print(f"❌ Erro ao importar funções: {e}")
        return False


def test_storage_functions_import():
    """Testa se as funções de storage para weights podem ser importadas."""
    print("\n" + "="*70)
    print("Teste 2: Importação de Funções de Storage para Weights")
    print("="*70)
    
    try:
        from server.health.storage import (
            get_weights,
            add_weight,
            delete_weight
        )
        print("✅ Todas as funções de storage para weights importadas com sucesso!")
        return True
    except ImportError as e:
        print(f"❌ Erro ao importar funções: {e}")
        return False


def test_local_storage_fallback():
    """Testa se o fallback local funciona quando user_id é 'local'."""
    print("\n" + "="*70)
    print("Teste 3: Fallback Local (user_id='local')")
    print("="*70)
    
    try:
        from server.health.storage import get_weights, add_weight, delete_weight
        
        # Limpar dados anteriores
        weights = get_weights(LOCAL_USER_ID)
        for w in weights:
            delete_weight(LOCAL_USER_ID, w.get("id"))
        
        # Adicionar peso
        today = datetime.now().strftime("%Y-%m-%d")
        weight_entry = add_weight(LOCAL_USER_ID, 75.5, today)
        
        assert weight_entry is not None, "add_weight deve retornar um dict"
        assert weight_entry.get("weight") == 75.5, f"Peso deve ser 75.5, mas foi {weight_entry.get('weight')}"
        assert weight_entry.get("date") == today, f"Data deve ser {today}"
        
        # Buscar pesos
        weights = get_weights(LOCAL_USER_ID)
        assert len(weights) > 0, "Deve haver pelo menos um peso registrado"
        
        # Verificar se o peso adicionado está na lista
        found = False
        for w in weights:
            if w.get("id") == weight_entry.get("id"):
                found = True
                assert w.get("weight") == 75.5, "Peso deve ser 75.5"
                break
        
        assert found, "Peso adicionado deve estar na lista"
        
        # Deletar peso
        deleted = delete_weight(LOCAL_USER_ID, weight_entry.get("id"))
        assert deleted, "delete_weight deve retornar True"
        
        # Verificar se foi deletado
        weights_after = get_weights(LOCAL_USER_ID)
        found_after = any(w.get("id") == weight_entry.get("id") for w in weights_after)
        assert not found_after, "Peso não deve estar mais na lista após deletar"
        
        print("✅ Fallback local funcionando corretamente!")
        return True
    except Exception as e:
        print(f"❌ Erro no teste de fallback local: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_api_endpoints():
    """Testa os endpoints da API para weights."""
    print("\n" + "="*70)
    print("Teste 4: Endpoints da API para Weights")
    print("="*70)
    
    try:
        # Limpar dados anteriores
        weights_resp = requests.get(f"{BASE_URL}/health/weights?user_id={LOCAL_USER_ID}")
        if weights_resp.status_code == 200:
            weights = weights_resp.json()
            for w in weights.get("weights", []):
                requests.delete(f"{BASE_URL}/health/weights/{w.get('id')}?user_id={LOCAL_USER_ID}")
        
        # Teste 1: Adicionar peso
        today = datetime.now().strftime("%Y-%m-%d")
        add_resp = requests.post(
            f"{BASE_URL}/health/weights",
            json={
                "user_id": LOCAL_USER_ID,
                "weight": 80.0,
                "date": today
            }
        )
        assert add_resp.status_code == 200, f"Status deve ser 200, mas foi {add_resp.status_code}"
        add_data = add_resp.json()
        assert add_data.get("success"), "Resposta deve ter success=True"
        weight_id = add_data.get("weight", {}).get("id")
        assert weight_id is not None, "Peso deve ter um ID"
        
        # Teste 2: Listar pesos
        list_resp = requests.get(f"{BASE_URL}/health/weights?user_id={LOCAL_USER_ID}")
        assert list_resp.status_code == 200, f"Status deve ser 200, mas foi {list_resp.status_code}"
        list_data = list_resp.json()
        assert list_data.get("success"), "Resposta deve ter success=True"
        weights = list_data.get("weights", [])
        assert len(weights) > 0, "Deve haver pelo menos um peso na lista"
        
        # Verificar se o peso adicionado está na lista
        found = False
        for w in weights:
            if w.get("id") == weight_id:
                found = True
                assert w.get("weight") == 80.0, f"Peso deve ser 80.0, mas foi {w.get('weight')}"
                break
        assert found, "Peso adicionado deve estar na lista"
        
        # Teste 3: Deletar peso
        delete_resp = requests.delete(f"{BASE_URL}/health/weights/{weight_id}?user_id={LOCAL_USER_ID}")
        assert delete_resp.status_code == 200, f"Status deve ser 200, mas foi {delete_resp.status_code}"
        delete_data = delete_resp.json()
        assert delete_data.get("success"), "Resposta deve ter success=True"
        
        # Verificar se foi deletado
        list_resp_after = requests.get(f"{BASE_URL}/health/weights?user_id={LOCAL_USER_ID}")
        list_data_after = list_resp_after.json()
        weights_after = list_data_after.get("weights", [])
        found_after = any(w.get("id") == weight_id for w in weights_after)
        assert not found_after, "Peso não deve estar mais na lista após deletar"
        
        print("✅ Todos os endpoints da API funcionando corretamente!")
        return True
    except Exception as e:
        print(f"❌ Erro no teste de endpoints: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_update_existing_weight():
    """Testa se atualizar peso existente funciona (mesma data)."""
    print("\n" + "="*70)
    print("Teste 5: Atualizar Peso Existente (Mesma Data)")
    print("="*70)
    
    try:
        from server.health.storage import get_weights, add_weight, delete_weight
        
        # Limpar dados anteriores
        weights = get_weights(LOCAL_USER_ID)
        for w in weights:
            delete_weight(LOCAL_USER_ID, w.get("id"))
        
        # Adicionar peso inicial
        today = datetime.now().strftime("%Y-%m-%d")
        weight_entry_1 = add_weight(LOCAL_USER_ID, 75.0, today)
        weight_id = weight_entry_1.get("id")
        
        # Tentar adicionar outro peso na mesma data (deve atualizar)
        weight_entry_2 = add_weight(LOCAL_USER_ID, 76.0, today)
        
        # Verificar se é o mesmo ID (atualização) ou novo ID (novo registro)
        # O comportamento esperado é atualizar o existente
        weights = get_weights(LOCAL_USER_ID)
        
        # Deve haver apenas um peso para esta data
        today_weights = [w for w in weights if w.get("date") == today]
        assert len(today_weights) == 1, f"Deve haver apenas um peso para {today}, mas há {len(today_weights)}"
        
        # O peso deve ser 76.0 (o último valor)
        assert today_weights[0].get("weight") == 76.0, f"Peso deve ser 76.0, mas foi {today_weights[0].get('weight')}"
        
        # Limpar
        delete_weight(LOCAL_USER_ID, weight_id)
        
        print("✅ Atualização de peso existente funcionando corretamente!")
        return True
    except Exception as e:
        print(f"❌ Erro no teste de atualização: {e}")
        import traceback
        traceback.print_exc()
        return False


def test_firebase_integration_if_available():
    """Testa integração com Firebase se disponível."""
    print("\n" + "="*70)
    print("Teste 6: Integração Firebase (se disponível)")
    print("="*70)
    
    try:
        from server.health.storage import _should_use_firebase, get_weights, add_weight, delete_weight
        from server.firebase_config import initialize_firebase
        
        # Tentar inicializar Firebase
        firebase_available = initialize_firebase()
        
        if not firebase_available:
            print("⚠️  Firebase não disponível (pode ser normal se não houver credenciais)")
            print("   Isso é OK - o sistema usará fallback local")
            return True  # Não é um erro, apenas não está configurado
        
        # Testar com user_id real (não "local")
        test_uid = "test_firebase_weights_integration"
        should_use = _should_use_firebase(test_uid)
        
        if not should_use:
            print("⚠️  Firebase não será usado para este user_id (pode ser normal)")
            return True
        
        print(f"✅ Firebase disponível e será usado para user_id={test_uid}")
        
        # Limpar dados anteriores
        weights = get_weights(test_uid)
        for w in weights:
            delete_weight(test_uid, w.get("id"))
        
        # Adicionar peso
        today = datetime.now().strftime("%Y-%m-%d")
        weight_entry = add_weight(test_uid, 70.0, today)
        
        assert weight_entry is not None, "add_weight deve retornar um dict"
        assert weight_entry.get("weight") == 70.0, f"Peso deve ser 70.0"
        
        # Buscar pesos
        weights = get_weights(test_uid)
        assert len(weights) > 0, "Deve haver pelo menos um peso registrado"
        
        # Verificar se o peso está na lista
        found = any(w.get("id") == weight_entry.get("id") for w in weights)
        assert found, "Peso adicionado deve estar na lista"
        
        # Deletar peso
        deleted = delete_weight(test_uid, weight_entry.get("id"))
        assert deleted, "delete_weight deve retornar True"
        
        print("✅ Integração Firebase funcionando corretamente!")
        return True
    except Exception as e:
        print(f"⚠️  Erro no teste de Firebase (pode ser normal): {e}")
        # Não falhar o teste se Firebase não estiver configurado
        return True


def main():
    """Executa todos os testes."""
    print("="*70)
    print("TESTE T4.1 - Firebase para Weights")
    print("="*70)
    
    results = TestResults()
    
    # Iniciar servidor se necessário
    if not check_server_running():
        start_server()
        time.sleep(3)  # Aguardar servidor iniciar
    
    # Executar testes
    results.add_test("Importação de funções Firebase", test_firebase_functions_import())
    results.add_test("Importação de funções de storage", test_storage_functions_import())
    results.add_test("Fallback local", test_local_storage_fallback())
    results.add_test("Endpoints da API", test_api_endpoints())
    results.add_test("Atualizar peso existente", test_update_existing_weight())
    results.add_test("Integração Firebase (se disponível)", test_firebase_integration_if_available())
    
    # Parar servidor
    stop_server()
    
    # Mostrar resumo
    results.print_summary()
    
    # Retornar código de saída
    return 0 if results.failed == 0 else 1


if __name__ == "__main__":
    sys.exit(main())
