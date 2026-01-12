"""
Teste Fase 2 - Backend (T2.1 e T2.2)
=====================================
Valida que os endpoints de histórico e peso estão funcionando corretamente.
"""

import sys
import io
import requests
import time
from pathlib import Path
from datetime import datetime, timedelta

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
                    print(f"  - {name}: {error}")
            return self.failed == 0
    
    def check_server_running():
        try:
            response = requests.get("http://127.0.0.1:8001/health", timeout=2)
            return True
        except:
            return False
    
    def start_server():
        global SERVER_PROCESS
        print("\n🔧 Iniciando servidor...")
        if sys.platform == 'win32':
            SERVER_PROCESS = subprocess.Popen(
                [sys.executable, "-m", "uvicorn", "server.main:app", "--host", "127.0.0.1", "--port", "8001"],
                cwd=Path(__file__).parent,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
        else:
            SERVER_PROCESS = subprocess.Popen(
                [sys.executable, "-m", "uvicorn", "server.main:app", "--host", "127.0.0.1", "--port", "8001"],
                cwd=Path(__file__).parent,
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE
            )
        max_attempts = 30
        for i in range(max_attempts):
            time.sleep(1)
            if check_server_running():
                print(f"✅ Servidor iniciado com sucesso! (tentativa {i+1})")
                return True
            if SERVER_PROCESS.poll() is not None:
                stdout, stderr = SERVER_PROCESS.communicate()
                print(f"❌ Servidor falhou ao iniciar:")
                if stdout:
                    print(f"STDOUT: {stdout.decode('utf-8', errors='replace')}")
                if stderr:
                    print(f"STDERR: {stderr.decode('utf-8', errors='replace')}")
                return False
        print("❌ Timeout ao aguardar servidor iniciar")
        return False
    
    def stop_server():
        global SERVER_PROCESS
        if SERVER_PROCESS:
            print("\n🛑 Parando servidor...")
            try:
                if sys.platform == 'win32':
                    SERVER_PROCESS.terminate()
                    time.sleep(1)
                    if SERVER_PROCESS.poll() is None:
                        SERVER_PROCESS.kill()
                else:
                    SERVER_PROCESS.send_signal(signal.SIGTERM)
                    time.sleep(1)
                    if SERVER_PROCESS.poll() is None:
                        SERVER_PROCESS.kill()
                print("✅ Servidor parado")
            except Exception as e:
                print(f"⚠️  Erro ao parar servidor: {e}")

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

BASE_URL = "http://127.0.0.1:8001"
USER_ID = "test_phase2_backend"

def test_t2_1_history(results):
    """Testa T2.1 - Endpoint de histórico"""
    print("\n" + "="*70)
    print("TESTE T2.1 - ENDPOINT GET /health/history")
    print("="*70)
    
    try:
        # Preparar dados: criar refeições em diferentes datas
        print("\n--- Preparando dados de teste ---")
        today = datetime.now()
        dates_to_test = [
            (today - timedelta(days=2)).strftime("%Y-%m-%d"),
            (today - timedelta(days=1)).strftime("%Y-%m-%d"),
            today.strftime("%Y-%m-%d")
        ]
        
        for i, date in enumerate(dates_to_test):
            meal_data = {
                "name": f"Refeição teste histórico {i+1}",
                "meal_type": "lunch",
                "calories": 500.0 + (i * 100),
                "protein": 20.0 + (i * 5),
                "carbs": 50.0 + (i * 10),
                "fats": 15.0 + (i * 2),
                "date": date
            }
            response = requests.post(
                f"{BASE_URL}/health/meals",
                params={"user_id": USER_ID},
                json=meal_data,
                timeout=10
            )
            if response.status_code == 200:
                print(f"  ✅ Refeição criada para {date}")
        
        # Teste 1: Endpoint básico
        print("\n--- Teste 1: Endpoint básico ---")
        start_date = (today - timedelta(days=2)).strftime("%Y-%m-%d")
        end_date = today.strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/health/history",
            params={"user_id": USER_ID, "start": start_date, "end": end_date},
            timeout=10
        )
        
        results.add_test("GET /health/history funciona", response.status_code == 200)
        
        if response.status_code == 200:
            data = response.json()
            results.add_test("Resposta tem 'success'", data.get("success") == True)
            results.add_test("Resposta tem 'summaries'", "summaries" in data)
            results.add_test("Resposta tem 'count'", "count" in data)
            results.add_test("Count corresponde ao tamanho", data["count"] == len(data["summaries"]))
            results.add_test("Tem 3 summaries (3 dias)", len(data["summaries"]) == 3)
            
            if len(data["summaries"]) > 0:
                summary = data["summaries"][0]
                required_fields = ["date", "meals_count", "total_calories", "total_protein"]
                for field in required_fields:
                    results.add_test(f"Summary tem campo '{field}'", field in summary)
        
        # Teste 2: Validações
        print("\n--- Teste 2: Validações ---")
        response_no_start = requests.get(
            f"{BASE_URL}/health/history",
            params={"user_id": USER_ID, "end": end_date},
            timeout=10
        )
        results.add_test("Valida parâmetro 'start' obrigatório", response_no_start.status_code == 400)
        
        response_invalid = requests.get(
            f"{BASE_URL}/health/history",
            params={"user_id": USER_ID, "start": end_date, "end": start_date},
            timeout=10
        )
        results.add_test("Valida que start <= end", response_invalid.status_code == 400)
        
        print("\n[SUCESSO] Testes de histórico concluídos")
        return True
        
    except Exception as e:
        results.add_test("T2.1 - Histórico", False, str(e))
        return False

def test_t2_2_weights(results):
    """Testa T2.2 - Endpoints de peso"""
    print("\n" + "="*70)
    print("TESTE T2.2 - ENDPOINTS DE PESO")
    print("="*70)
    
    try:
        # Teste 1: GET /health/weights (vazio inicialmente)
        print("\n--- Teste 1: GET /health/weights ---")
        response = requests.get(
            f"{BASE_URL}/health/weights",
            params={"user_id": USER_ID},
            timeout=10
        )
        
        results.add_test("GET /health/weights funciona", response.status_code == 200)
        
        if response.status_code == 200:
            data = response.json()
            results.add_test("Resposta tem 'success'", data.get("success") == True)
            results.add_test("Resposta tem 'weights'", "weights" in data)
            results.add_test("Resposta tem 'count'", "count" in data)
            initial_count = data.get("count", 0)
        
        # Teste 2: POST /health/weights (adicionar peso)
        print("\n--- Teste 2: POST /health/weights ---")
        today = datetime.now()
        weight_data = {
            "weight": 70.5,
            "date": today.strftime("%Y-%m-%d")
        }
        
        response_post = requests.post(
            f"{BASE_URL}/health/weights",
            params={"user_id": USER_ID},
            json=weight_data,
            timeout=10
        )
        
        results.add_test("POST /health/weights funciona", response_post.status_code == 200)
        
        if response_post.status_code == 200:
            data_post = response_post.json()
            results.add_test("POST retorna 'success'", data_post.get("success") == True)
            results.add_test("POST retorna 'weight'", "weight" in data_post)
            
            if "weight" in data_post:
                weight_entry = data_post["weight"]
                results.add_test("Weight tem 'id'", "id" in weight_entry)
                results.add_test("Weight tem 'date'", "date" in weight_entry)
                results.add_test("Weight tem 'weight'", "weight" in weight_entry)
                results.add_test("Peso salvo corretamente", weight_entry["weight"] == 70.5)
                weight_id = weight_entry.get("id")
        
        # Teste 3: GET /health/weights (após adicionar)
        print("\n--- Teste 3: GET /health/weights (após adicionar) ---")
        response_get2 = requests.get(
            f"{BASE_URL}/health/weights",
            params={"user_id": USER_ID},
            timeout=10
        )
        
        if response_get2.status_code == 200:
            data_get2 = response_get2.json()
            results.add_test("Count aumentou após adicionar", data_get2["count"] == initial_count + 1)
            results.add_test("Lista ordenada por data (mais recente primeiro)", 
                           len(data_get2["weights"]) > 0 and data_get2["weights"][0]["date"] == today.strftime("%Y-%m-%d"))
        
        # Teste 4: Atualizar peso para mesma data
        print("\n--- Teste 4: Atualizar peso para mesma data ---")
        weight_data_update = {
            "weight": 71.0,
            "date": today.strftime("%Y-%m-%d")
        }
        
        response_update = requests.post(
            f"{BASE_URL}/health/weights",
            params={"user_id": USER_ID},
            json=weight_data_update,
            timeout=10
        )
        
        if response_update.status_code == 200:
            data_update = response_update.json()
            results.add_test("Atualização funciona", data_update["weight"]["weight"] == 71.0)
            results.add_test("ID mantido na atualização", data_update["weight"]["id"] == weight_id)
        
        # Teste 5: Adicionar peso em data diferente
        print("\n--- Teste 5: Adicionar peso em data diferente ---")
        yesterday = (today - timedelta(days=1)).strftime("%Y-%m-%d")
        weight_data_yesterday = {
            "weight": 70.0,
            "date": yesterday
        }
        
        response_yesterday = requests.post(
            f"{BASE_URL}/health/weights",
            params={"user_id": USER_ID},
            json=weight_data_yesterday,
            timeout=10
        )
        
        results.add_test("Adicionar peso em data diferente funciona", response_yesterday.status_code == 200)
        
        # Teste 6: GET com limit
        print("\n--- Teste 6: GET com limit ---")
        response_limit = requests.get(
            f"{BASE_URL}/health/weights",
            params={"user_id": USER_ID, "limit": 1},
            timeout=10
        )
        
        if response_limit.status_code == 200:
            data_limit = response_limit.json()
            results.add_test("Limit funciona", data_limit["count"] == 1)
        
        # Teste 7: Validações
        print("\n--- Teste 7: Validações ---")
        invalid_weight = {"weight": -10}
        response_invalid = requests.post(
            f"{BASE_URL}/health/weights",
            params={"user_id": USER_ID},
            json=invalid_weight,
            timeout=10
        )
        results.add_test("Valida peso inválido (negativo)", response_invalid.status_code == 400)
        
        invalid_date = {"weight": 70.0, "date": "2025-13-45"}
        response_invalid_date = requests.post(
            f"{BASE_URL}/health/weights",
            params={"user_id": USER_ID},
            json=invalid_date,
            timeout=10
        )
        results.add_test("Valida formato de data", response_invalid_date.status_code == 400)
        
        # Teste 8: DELETE /health/weights/{weight_id}
        print("\n--- Teste 8: DELETE /health/weights/{weight_id} ---")
        if 'weight_id' in locals():
            response_delete = requests.delete(
                f"{BASE_URL}/health/weights/{weight_id}",
                params={"user_id": USER_ID},
                timeout=10
            )
            
            results.add_test("DELETE funciona", response_delete.status_code == 200)
            
            if response_delete.status_code == 200:
                # Verificar que foi deletado
                response_check = requests.get(
                    f"{BASE_URL}/health/weights",
                    params={"user_id": USER_ID},
                    timeout=10
                )
                if response_check.status_code == 200:
                    data_check = response_check.json()
                    weights_ids = [w.get("id") for w in data_check["weights"]]
                    results.add_test("Peso foi deletado", weight_id not in weights_ids)
        
        print("\n[SUCESSO] Testes de peso concluídos")
        return True
        
    except Exception as e:
        results.add_test("T2.2 - Peso", False, str(e))
        return False

def main():
    """Executa todos os testes da Fase 2 Backend"""
    print("\n" + "="*70)
    print("TESTE FASE 2 - BACKEND (T2.1 e T2.2)")
    print("="*70)
    
    results = TestResults()
    server_started = False
    
    try:
        # Verificar se servidor está rodando
        if check_server_running():
            print("\n✅ Servidor já está rodando")
        else:
            # Iniciar servidor
            if not start_server():
                print("\n❌ Não foi possível iniciar o servidor")
                return 1
            server_started = True
        
        # Aguardar um pouco para garantir que está pronto
        time.sleep(2)
        
        # Executar testes
        print("\n🔍 Iniciando testes...\n")
        
        test_t2_1_history(results)
        test_t2_2_weights(results)
        
        # Resumo final
        all_passed = results.print_summary()
        
        if all_passed:
            print("\n🎉 TODOS OS TESTES DA FASE 2 BACKEND PASSARAM!")
            print("Os endpoints de histórico e peso estão funcionando corretamente.")
            return 0
        else:
            print("\n⚠️  ALGUNS TESTES FALHARAM. Revise os erros acima.")
            return 1
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Testes interrompidos pelo usuário")
        return 1
    except Exception as e:
        print(f"\n❌ Erro inesperado: {e}")
        import traceback
        traceback.print_exc()
        return 1
    finally:
        # Parar servidor se foi iniciado por nós
        if server_started:
            stop_server()

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
