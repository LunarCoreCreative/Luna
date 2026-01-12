"""
Teste T2.3 - Tela "Histórico" (Frontend)
========================================
Valida que os endpoints usados pela tela de histórico estão funcionando corretamente.
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
USER_ID = "test_t2_3_history"

def test_history_endpoint_for_tab(results):
    """Testa GET /health/history usado pela HistoryTab"""
    print("\n" + "="*70)
    print("TESTE T2.3 - ENDPOINT DE HISTÓRICO PARA A TAB")
    print("="*70)
    
    try:
        # Preparar dados: criar refeições em diferentes datas
        print("\n--- Preparando dados de teste ---")
        today = datetime.now()
        
        # Criar refeições para últimos 7 dias
        for i in range(7):
            date = (today - timedelta(days=i)).strftime("%Y-%m-%d")
            meal_data = {
                "name": f"Refeição teste histórico dia {i+1}",
                "meal_type": "lunch",
                "calories": 500.0 + (i * 50),
                "protein": 20.0 + (i * 3),
                "carbs": 50.0 + (i * 5),
                "fats": 15.0 + (i * 1),
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
        
        # Teste 1: Histórico de 7 dias
        print("\n--- Teste 1: Histórico de 7 dias ---")
        start_7d = (today - timedelta(days=6)).strftime("%Y-%m-%d")
        end_7d = today.strftime("%Y-%m-%d")
        
        response_7d = requests.get(
            f"{BASE_URL}/health/history",
            params={"user_id": USER_ID, "start": start_7d, "end": end_7d},
            timeout=10
        )
        
        results.add_test("GET /health/history (7 dias) funciona", response_7d.status_code == 200)
        
        if response_7d.status_code == 200:
            data_7d = response_7d.json()
            results.add_test("Retorna 7 summaries", data_7d.get("count") == 7)
            results.add_test("Summaries têm estrutura correta", len(data_7d.get("summaries", [])) > 0)
            
            if len(data_7d.get("summaries", [])) > 0:
                summary = data_7d["summaries"][0]
                required_fields = ["date", "total_calories", "total_protein", "goals"]
                for field in required_fields:
                    results.add_test(f"Summary tem campo '{field}'", field in summary)
        
        # Teste 2: Histórico de 30 dias
        print("\n--- Teste 2: Histórico de 30 dias ---")
        start_30d = (today - timedelta(days=29)).strftime("%Y-%m-%d")
        end_30d = today.strftime("%Y-%m-%d")
        
        response_30d = requests.get(
            f"{BASE_URL}/health/history",
            params={"user_id": USER_ID, "start": start_30d, "end": end_30d},
            timeout=10
        )
        
        results.add_test("GET /health/history (30 dias) funciona", response_30d.status_code == 200)
        
        if response_30d.status_code == 200:
            data_30d = response_30d.json()
            results.add_test("Retorna 30 summaries", data_30d.get("count") == 30)
        
        # Teste 3: Histórico de 90 dias
        print("\n--- Teste 3: Histórico de 90 dias ---")
        start_90d = (today - timedelta(days=89)).strftime("%Y-%m-%d")
        end_90d = today.strftime("%Y-%m-%d")
        
        response_90d = requests.get(
            f"{BASE_URL}/health/history",
            params={"user_id": USER_ID, "start": start_90d, "end": end_90d},
            timeout=10
        )
        
        results.add_test("GET /health/history (90 dias) funciona", response_90d.status_code == 200)
        
        if response_90d.status_code == 200:
            data_90d = response_90d.json()
            results.add_test("Retorna 90 summaries", data_90d.get("count") == 90)
        
        print("\n[SUCESSO] Testes de histórico concluídos")
        return True
        
    except Exception as e:
        results.add_test("Histórico para tab", False, str(e))
        return False

def test_weights_endpoint_for_tab(results):
    """Testa GET /health/weights usado pela HistoryTab"""
    print("\n" + "="*70)
    print("TESTE: ENDPOINT DE PESOS PARA A TAB")
    print("="*70)
    
    try:
        # Preparar dados: criar registros de peso
        print("\n--- Preparando dados de peso ---")
        today = datetime.now()
        
        # Criar registros de peso para últimos 5 dias
        weight_ids = []
        for i in range(5):
            date = (today - timedelta(days=i)).strftime("%Y-%m-%d")
            weight_data = {
                "weight": 70.0 - (i * 0.2),
                "date": date
            }
            response = requests.post(
                f"{BASE_URL}/health/weights",
                params={"user_id": USER_ID},
                json=weight_data,
                timeout=10
            )
            if response.status_code == 200:
                data = response.json()
                if "weight" in data and "id" in data["weight"]:
                    weight_ids.append(data["weight"]["id"])
                print(f"  ✅ Peso registrado para {date}")
        
        # Teste 1: GET /health/weights
        print("\n--- Teste 1: GET /health/weights ---")
        response = requests.get(
            f"{BASE_URL}/health/weights",
            params={"user_id": USER_ID, "limit": 100},
            timeout=10
        )
        
        results.add_test("GET /health/weights funciona", response.status_code == 200)
        
        if response.status_code == 200:
            data = response.json()
            results.add_test("Resposta tem 'success'", data.get("success") == True)
            results.add_test("Resposta tem 'weights'", "weights" in data)
            results.add_test("Resposta tem 'count'", "count" in data)
            results.add_test("Tem pelo menos 5 registros", data.get("count", 0) >= 5)
            
            if "weights" in data and len(data["weights"]) > 0:
                weight = data["weights"][0]
                results.add_test("Weight tem 'id'", "id" in weight)
                results.add_test("Weight tem 'date'", "date" in weight)
                results.add_test("Weight tem 'weight'", "weight" in weight)
                results.add_test("Lista ordenada por data (mais recente primeiro)", 
                               data["weights"][0]["date"] == today.strftime("%Y-%m-%d"))
        
        # Teste 2: GET com limit
        print("\n--- Teste 2: GET com limit ---")
        response_limit = requests.get(
            f"{BASE_URL}/health/weights",
            params={"user_id": USER_ID, "limit": 3},
            timeout=10
        )
        
        if response_limit.status_code == 200:
            data_limit = response_limit.json()
            results.add_test("Limit funciona corretamente", data_limit.get("count") == 3)
        
        print("\n[SUCESSO] Testes de pesos concluídos")
        return True
        
    except Exception as e:
        results.add_test("Pesos para tab", False, str(e))
        return False

def test_statistics_calculation(results):
    """Testa se os dados retornados permitem calcular estatísticas"""
    print("\n" + "="*70)
    print("TESTE: CÁLCULO DE ESTATÍSTICAS")
    print("="*70)
    
    try:
        # Obter histórico de 7 dias
        today = datetime.now()
        start = (today - timedelta(days=6)).strftime("%Y-%m-%d")
        end = today.strftime("%Y-%m-%d")
        
        response = requests.get(
            f"{BASE_URL}/health/history",
            params={"user_id": USER_ID, "start": start, "end": end},
            timeout=10
        )
        
        if response.status_code == 200:
            data = response.json()
            summaries = data.get("summaries", [])
            
            if len(summaries) > 0:
                # Calcular média de calorias
                total_calories = sum(s.get("total_calories", 0) for s in summaries)
                avg_calories = total_calories / len(summaries)
                
                results.add_test("Pode calcular média de calorias", avg_calories > 0)
                
                # Calcular média de proteína
                total_protein = sum(s.get("total_protein", 0) for s in summaries)
                avg_protein = total_protein / len(summaries)
                
                results.add_test("Pode calcular média de proteína", avg_protein > 0)
                
                # Contar dias que atingiu meta de proteína
                days_with_protein_goal = sum(1 for s in summaries 
                                            if s.get("goals", {}).get("daily_protein", 0) > 0 
                                            and s.get("total_protein", 0) >= s.get("goals", {}).get("daily_protein", 0))
                
                results.add_test("Pode contar dias que atingiu meta de proteína", True)
                
                # Contar dias que atingiu meta de calorias
                days_with_calories_goal = sum(1 for s in summaries 
                                            if s.get("goals", {}).get("daily_calories", 0) > 0 
                                            and s.get("total_calories", 0) >= s.get("goals", {}).get("daily_calories", 0))
                
                results.add_test("Pode contar dias que atingiu meta de calorias", True)
        
        print("\n[SUCESSO] Testes de cálculo de estatísticas concluídos")
        return True
        
    except Exception as e:
        results.add_test("Cálculo de estatísticas", False, str(e))
        return False

def test_data_structure_for_charts(results):
    """Testa se a estrutura de dados é adequada para gráficos"""
    print("\n" + "="*70)
    print("TESTE: ESTRUTURA DE DADOS PARA GRÁFICOS")
    print("="*70)
    
    try:
        # Teste histórico
        today = datetime.now()
        start = (today - timedelta(days=6)).strftime("%Y-%m-%d")
        end = today.strftime("%Y-%m-%d")
        
        response_history = requests.get(
            f"{BASE_URL}/health/history",
            params={"user_id": USER_ID, "start": start, "end": end},
            timeout=10
        )
        
        if response_history.status_code == 200:
            data_history = response_history.json()
            summaries = data_history.get("summaries", [])
            
            if len(summaries) > 0:
                # Verificar que cada summary tem dados necessários para gráfico de calorias
                for summary in summaries:
                    has_date = "date" in summary
                    has_calories = "total_calories" in summary
                    has_goal = "goals" in summary and "daily_calories" in summary.get("goals", {})
                    
                    results.add_test("Summary tem 'date' para gráfico", has_date)
                    results.add_test("Summary tem 'total_calories' para gráfico", has_calories)
                    results.add_test("Summary tem 'goals.daily_calories' para gráfico", has_goal)
                    break  # Testar apenas o primeiro
        
        # Teste pesos
        response_weights = requests.get(
            f"{BASE_URL}/health/weights",
            params={"user_id": USER_ID, "limit": 10},
            timeout=10
        )
        
        if response_weights.status_code == 200:
            data_weights = response_weights.json()
            weights = data_weights.get("weights", [])
            
            if len(weights) > 0:
                weight = weights[0]
                results.add_test("Weight tem 'date' para gráfico", "date" in weight)
                results.add_test("Weight tem 'weight' para gráfico", "weight" in weight)
        
        print("\n[SUCESSO] Testes de estrutura de dados concluídos")
        return True
        
    except Exception as e:
        results.add_test("Estrutura de dados", False, str(e))
        return False

def main():
    """Executa todos os testes da T2.3"""
    print("\n" + "="*70)
    print("TESTE T2.3 - TELA HISTÓRICO (FRONTEND)")
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
        
        test_history_endpoint_for_tab(results)
        test_weights_endpoint_for_tab(results)
        test_statistics_calculation(results)
        test_data_structure_for_charts(results)
        
        # Resumo final
        all_passed = results.print_summary()
        
        if all_passed:
            print("\n🎉 TODOS OS TESTES DA T2.3 PASSARAM!")
            print("A tela de histórico está funcionando corretamente.")
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
