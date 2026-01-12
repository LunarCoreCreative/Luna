"""
Teste T2.1 - Resumos por Intervalo
===================================
Valida que o endpoint GET /health/history está funcionando corretamente.
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
USER_ID = "test_t2_1_history"

def test_history_endpoint(results):
    """Testa GET /health/history"""
    print("\n" + "="*70)
    print("TESTE T2.1 - ENDPOINT GET /health/history")
    print("="*70)
    
    try:
        # Preparar dados de teste: criar algumas refeições em datas diferentes
        print("\n--- Preparando dados de teste ---")
        today = datetime.now()
        dates_to_test = [
            (today - timedelta(days=2)).strftime("%Y-%m-%d"),
            (today - timedelta(days=1)).strftime("%Y-%m-%d"),
            today.strftime("%Y-%m-%d")
        ]
        
        # Criar refeições em diferentes datas
        for i, date in enumerate(dates_to_test):
            meal_data = {
                "name": f"Refeição teste {i+1}",
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
            params={
                "user_id": USER_ID,
                "start": start_date,
                "end": end_date
            },
            timeout=10
        )
        
        results.add_test("Endpoint responde", response.status_code == 200)
        
        if response.status_code == 200:
            data = response.json()
            results.add_test("Resposta tem 'success'", data.get("success") == True)
            results.add_test("Resposta tem 'summaries'", "summaries" in data)
            results.add_test("Resposta tem 'count'", "count" in data)
            results.add_test("Resposta tem 'start_date'", "start_date" in data)
            results.add_test("Resposta tem 'end_date'", "end_date" in data)
            
            if "summaries" in data:
                summaries = data["summaries"]
                results.add_test("Summaries é uma lista", isinstance(summaries, list))
                results.add_test("Count corresponde ao tamanho da lista", data["count"] == len(summaries))
                results.add_test("Tem 3 summaries (3 dias)", len(summaries) == 3)
                
                # Verificar estrutura de cada summary
                if len(summaries) > 0:
                    summary = summaries[0]
                    required_fields = ["date", "meals_count", "total_calories", "total_protein", "total_carbs", "total_fats"]
                    for field in required_fields:
                        results.add_test(f"Summary tem campo '{field}'", field in summary)
                    
                    # Verificar ordenação (mais antiga primeiro)
                    if len(summaries) > 1:
                        dates = [s["date"] for s in summaries]
                        sorted_dates = sorted(dates)
                        results.add_test("Summaries ordenados por data (mais antiga primeiro)", dates == sorted_dates)
        
        # Teste 2: Validação de parâmetros obrigatórios
        print("\n--- Teste 2: Validação de parâmetros ---")
        
        # Sem parâmetro start
        response_no_start = requests.get(
            f"{BASE_URL}/health/history",
            params={"user_id": USER_ID, "end": end_date},
            timeout=10
        )
        results.add_test("Valida parâmetro 'start' obrigatório", response_no_start.status_code == 400)
        
        # Sem parâmetro end
        response_no_end = requests.get(
            f"{BASE_URL}/health/history",
            params={"user_id": USER_ID, "start": start_date},
            timeout=10
        )
        results.add_test("Valida parâmetro 'end' obrigatório", response_no_end.status_code == 400)
        
        # Data inválida
        response_invalid_date = requests.get(
            f"{BASE_URL}/health/history",
            params={"user_id": USER_ID, "start": "2025-13-45", "end": end_date},
            timeout=10
        )
        results.add_test("Valida formato de data", response_invalid_date.status_code == 400)
        
        # Start > End
        response_invalid_range = requests.get(
            f"{BASE_URL}/health/history",
            params={"user_id": USER_ID, "start": end_date, "end": start_date},
            timeout=10
        )
        results.add_test("Valida que start <= end", response_invalid_range.status_code == 400)
        
        # Teste 3: Intervalo de 7 dias
        print("\n--- Teste 3: Intervalo de 7 dias ---")
        start_7d = (today - timedelta(days=6)).strftime("%Y-%m-%d")
        end_7d = today.strftime("%Y-%m-%d")
        
        response_7d = requests.get(
            f"{BASE_URL}/health/history",
            params={"user_id": USER_ID, "start": start_7d, "end": end_7d},
            timeout=10
        )
        
        if response_7d.status_code == 200:
            data_7d = response_7d.json()
            results.add_test("Intervalo de 7 dias funciona", True)
            results.add_test("Retorna 7 summaries", data_7d.get("count") == 7)
        
        # Teste 4: Intervalo de 1 dia (mesma data)
        print("\n--- Teste 4: Intervalo de 1 dia ---")
        single_date = today.strftime("%Y-%m-%d")
        
        response_1d = requests.get(
            f"{BASE_URL}/health/history",
            params={"user_id": USER_ID, "start": single_date, "end": single_date},
            timeout=10
        )
        
        if response_1d.status_code == 200:
            data_1d = response_1d.json()
            results.add_test("Intervalo de 1 dia funciona", True)
            results.add_test("Retorna 1 summary", data_1d.get("count") == 1)
        
        # Teste 5: Intervalo muito grande (deve falhar)
        print("\n--- Teste 5: Intervalo muito grande ---")
        start_large = (today - timedelta(days=100)).strftime("%Y-%m-%d")
        
        response_large = requests.get(
            f"{BASE_URL}/health/history",
            params={"user_id": USER_ID, "start": start_large, "end": end_date},
            timeout=10
        )
        results.add_test("Rejeita intervalo muito grande (>90 dias)", response_large.status_code == 400)
        
        print("\n[SUCESSO] Testes de endpoint history concluídos")
        return True
        
    except requests.exceptions.ConnectionError:
        results.add_test("Endpoint history", False, "Servidor não está rodando")
        return False
    except Exception as e:
        results.add_test("Endpoint history", False, str(e))
        return False

def main():
    """Executa todos os testes da T2.1"""
    print("\n" + "="*70)
    print("TESTE T2.1 - RESUMOS POR INTERVALO")
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
        
        test_history_endpoint(results)
        
        # Resumo final
        all_passed = results.print_summary()
        
        if all_passed:
            print("\n🎉 TODOS OS TESTES DA T2.1 PASSARAM!")
            print("O endpoint de histórico está funcionando corretamente.")
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
