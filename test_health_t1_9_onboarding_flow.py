"""
Teste T1.9 - Fluxo de Perguntas sobre o Usuário
================================================
Valida que o agente faz perguntas sobre o usuário no primeiro uso
e sugere revisão periódica de metas.
"""

import sys
import io
import requests
import time
from pathlib import Path

# Importar helper de testes
try:
    from test_health_helper import TestResults, check_server_running, start_server, stop_server
except ImportError:
    # Fallback se não conseguir importar
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
USER_ID = "test_t1_9_onboarding"

def test_first_use_detection(results):
    """Testa detecção de primeiro uso (sem metas)"""
    print("\n" + "="*70)
    print("TESTE T1.9 - DETECÇÃO DE PRIMEIRO USO")
    print("="*70)
    
    try:
        # Limpar metas do usuário de teste
        print("\n--- Teste 1: Limpar metas para simular primeiro uso ---")
        clear_response = requests.put(
            f"{BASE_URL}/health/goals",
            params={"user_id": USER_ID},
            json={
                "daily_calories": None,
                "daily_protein": None,
                "daily_carbs": None,
                "daily_fats": None,
                "current_weight": None,
                "target_weight": None
            },
            timeout=10
        )
        
        results.add_test("Limpar metas funciona", clear_response.status_code == 200)
        
        # Verificar que não há metas
        print("\n--- Teste 2: Verificar ausência de metas ---")
        goals_response = requests.get(
            f"{BASE_URL}/health/goals",
            params={"user_id": USER_ID},
            timeout=10
        )
        
        if goals_response.status_code == 200:
            data = goals_response.json()
            if "goals" in data:
                goals = data["goals"]
                has_no_goals = (
                    (goals.get("daily_calories") is None or goals.get("daily_calories") == 0) and
                    (goals.get("daily_protein") is None or goals.get("daily_protein") == 0) and
                    (goals.get("current_weight") is None or goals.get("current_weight") == 0)
                )
                results.add_test("Detecta ausência de metas", has_no_goals)
        
        print("\n[SUCESSO] Testes de detecção de primeiro uso concluídos")
        return True
        
    except Exception as e:
        results.add_test("Detecção de primeiro uso", False, str(e))
        return False

def test_suggest_goals_endpoint(results):
    """Testa que o endpoint suggest_goals está disponível para o agente usar"""
    print("\n" + "="*70)
    print("TESTE: ENDPOINT SUGGEST_GOALS DISPONÍVEL")
    print("="*70)
    
    try:
        suggest_request = {
            "weight": 70.0,
            "height": 175.0,
            "age": 30,
            "gender": "male",
            "goal": "lose",
            "activity_level": "moderate"
        }
        
        response = requests.post(
            f"{BASE_URL}/health/suggest_goals",
            json=suggest_request,
            timeout=10
        )
        
        results.add_test("suggest_goals endpoint disponível", response.status_code == 200)
        
        if response.status_code == 200:
            data = response.json()
            results.add_test("Resposta tem 'suggested_goals'", "suggested_goals" in data)
            results.add_test("Pode ser usado pelo agente", data.get("success") == True)
        
        print("\n[SUCESSO] Testes de endpoint suggest_goals concluídos")
        return True
        
    except Exception as e:
        results.add_test("Endpoint suggest_goals", False, str(e))
        return False

def test_onboarding_flow(results):
    """Testa o fluxo completo de onboarding"""
    print("\n" + "="*70)
    print("TESTE: FLUXO COMPLETO DE ONBOARDING")
    print("="*70)
    
    try:
        # Simular fluxo: limpar metas -> obter sugestões -> aplicar metas
        print("\n--- Teste 1: Limpar metas ---")
        clear_response = requests.put(
            f"{BASE_URL}/health/goals",
            params={"user_id": USER_ID},
            json={
                "daily_calories": None,
                "daily_protein": None,
                "daily_carbs": None,
                "daily_fats": None,
                "current_weight": None,
                "target_weight": None
            },
            timeout=10
        )
        results.add_test("Limpar metas para onboarding", clear_response.status_code == 200)
        
        # Obter sugestões
        print("\n--- Teste 2: Obter sugestões baseadas em dados do usuário ---")
        suggest_request = {
            "weight": 75.0,
            "height": 170.0,
            "age": 28,
            "gender": "female",
            "goal": "maintain",
            "activity_level": "light"
        }
        
        suggest_response = requests.post(
            f"{BASE_URL}/health/suggest_goals",
            json=suggest_request,
            timeout=10
        )
        
        results.add_test("Obter sugestões funciona", suggest_response.status_code == 200)
        
        if suggest_response.status_code == 200:
            suggest_data = suggest_response.json()
            if "suggested_goals" in suggest_data:
                suggested = suggest_data["suggested_goals"]
                
                # Aplicar sugestões
                print("\n--- Teste 3: Aplicar sugestões como metas ---")
                apply_goals = {
                    "daily_calories": suggested["daily_calories"],
                    "daily_protein": suggested["daily_protein"],
                    "daily_carbs": suggested["daily_carbs"],
                    "daily_fats": suggested["daily_fats"],
                    "current_weight": 75.0,
                    "target_weight": 75.0
                }
                
                apply_response = requests.put(
                    f"{BASE_URL}/health/goals",
                    params={"user_id": USER_ID},
                    json=apply_goals,
                    timeout=10
                )
                
                results.add_test("Aplicar sugestões funciona", apply_response.status_code == 200)
                
                if apply_response.status_code == 200:
                    apply_data = apply_response.json()
                    if "goals" in apply_data:
                        goals = apply_data["goals"]
                        results.add_test("Metas aplicadas corretamente", goals.get("daily_calories") == suggested["daily_calories"])
                        results.add_test("Peso atual salvo", goals.get("current_weight") == 75.0)
        
        print("\n[SUCESSO] Testes de fluxo de onboarding concluídos")
        return True
        
    except Exception as e:
        results.add_test("Fluxo de onboarding", False, str(e))
        return False

def test_system_prompt_instructions(results):
    """Testa que as instruções do prompt estão corretas"""
    print("\n" + "="*70)
    print("TESTE: INSTRUÇÕES DO SYSTEM PROMPT")
    print("="*70)
    
    try:
        # Verificar que o arquivo de config tem as instruções
        config_path = Path(__file__).parent / "server" / "config.py"
        
        if config_path.exists():
            with open(config_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
                # Verificar instruções sobre primeiro uso
                has_first_use = (
                    "PRIMEIRO USO" in content or 
                    "primeiro uso" in content or
                    "primeira interação" in content
                )
                results.add_test("Prompt tem instruções sobre primeiro uso", has_first_use)
                
                # Verificar instruções sobre perguntas
                has_questions = (
                    "peso atual" in content.lower() or
                    "objetivo" in content.lower() or
                    "altura" in content.lower()
                )
                results.add_test("Prompt tem instruções sobre perguntas", has_questions)
                
                # Verificar instruções sobre revisão periódica
                has_review = (
                    "revisão" in content.lower() or
                    "revisar" in content.lower() or
                    "PERIÓDICA" in content
                )
                results.add_test("Prompt tem instruções sobre revisão periódica", has_review)
                
                # Verificar instruções sobre suggest_goals
                has_suggest = (
                    "suggest_goals" in content or
                    "sugerir metas" in content.lower()
                )
                results.add_test("Prompt menciona suggest_goals", has_suggest)
        else:
            results.add_test("Arquivo config.py existe", False, "Arquivo não encontrado")
        
        print("\n[SUCESSO] Testes de instruções do prompt concluídos")
        return True
        
    except Exception as e:
        results.add_test("Instruções do prompt", False, str(e))
        return False

def main():
    """Executa todos os testes da T1.9"""
    print("\n" + "="*70)
    print("TESTE T1.9 - FLUXO DE PERGUNTAS SOBRE O USUÁRIO")
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
        
        test_first_use_detection(results)
        test_suggest_goals_endpoint(results)
        test_onboarding_flow(results)
        test_system_prompt_instructions(results)
        
        # Resumo final
        all_passed = results.print_summary()
        
        if all_passed:
            print("\n🎉 TODOS OS TESTES DA T1.9 PASSARAM!")
            print("O fluxo de perguntas sobre o usuário está implementado corretamente.")
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
