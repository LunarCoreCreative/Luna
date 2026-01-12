"""
Teste T2.4 - Insights Automáticos
==================================
Valida que o agente pode usar ferramentas de histórico para fornecer insights.
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
USER_ID = "test_t2_4_insights"

def test_get_nutrition_history_tool(results):
    """Testa a ferramenta get_nutrition_history diretamente"""
    print("\n" + "="*70)
    print("TESTE T2.4 - FERRAMENTA get_nutrition_history")
    print("="*70)
    
    try:
        # Importar a função de execução de ferramentas
        sys.path.insert(0, str(Path(__file__).parent / "server"))
        from server.health.tools import execute_health_tool
        
        # Preparar dados: criar refeições e metas
        print("\n--- Preparando dados de teste ---")
        today = datetime.now()
        
        # Configurar metas
        goals_response = requests.put(
            f"{BASE_URL}/health/goals",
            params={"user_id": USER_ID},
            json={
                "daily_calories": 2000.0,
                "daily_protein": 80.0
            },
            timeout=10
        )
        if goals_response.status_code == 200:
            print("  ✅ Metas configuradas")
        
        # Criar refeições para últimos 7 dias
        for i in range(7):
            date = (today - timedelta(days=i)).strftime("%Y-%m-%d")
            # Alguns dias atingem a meta, outros não
            calories = 2000.0 if i % 2 == 0 else 1500.0
            protein = 80.0 if i % 2 == 0 else 60.0
            
            meal_data = {
                "name": f"Refeição teste insights dia {i+1}",
                "meal_type": "lunch",
                "calories": calories,
                "protein": protein,
                "carbs": 200.0,
                "fats": 50.0,
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
        
        # Teste 1: Executar ferramenta get_nutrition_history
        print("\n--- Teste 1: Executar get_nutrition_history ---")
        start_date = (today - timedelta(days=6)).strftime("%Y-%m-%d")
        end_date = today.strftime("%Y-%m-%d")
        
        import asyncio
        result = asyncio.run(execute_health_tool(
            "get_nutrition_history",
            {
                "start_date": start_date,
                "end_date": end_date
            },
            USER_ID
        ))
        
        results.add_test("Ferramenta get_nutrition_history funciona", result.get("success") == True)
        
        if result.get("success"):
            results.add_test("Retorna 'summaries'", "summaries" in result)
            results.add_test("Retorna 'statistics'", "statistics" in result)
            results.add_test("Retorna 'count'", "count" in result)
            results.add_test("Retorna 'message'", "message" in result)
            
            if "statistics" in result:
                stats = result["statistics"]
                results.add_test("Statistics tem 'avg_calories'", "avg_calories" in stats)
                results.add_test("Statistics tem 'avg_protein'", "avg_protein" in stats)
                results.add_test("Statistics tem 'days_with_protein_goal'", "days_with_protein_goal" in stats)
                results.add_test("Statistics tem 'days_with_calories_goal'", "days_with_calories_goal" in stats)
                
                # Verificar que os cálculos estão corretos
                if "days_with_protein_goal" in stats:
                    # Esperamos que cerca de 4 dias (índices pares) tenham atingido a meta
                    results.add_test("Cálculo de dias com meta de proteína correto", stats["days_with_protein_goal"] >= 3)
        
        # Teste 2: Validação de parâmetros
        print("\n--- Teste 2: Validação de parâmetros ---")
        result_invalid = asyncio.run(execute_health_tool(
            "get_nutrition_history",
            {},
            USER_ID
        ))
        
        results.add_test("Valida parâmetros obrigatórios", result_invalid.get("success") == False)
        
        print("\n[SUCESSO] Testes de ferramenta concluídos")
        return True
        
    except Exception as e:
        results.add_test("Ferramenta get_nutrition_history", False, str(e))
        import traceback
        traceback.print_exc()
        return False

def test_system_prompt_instructions(results):
    """Testa que as instruções de insights estão no prompt"""
    print("\n" + "="*70)
    print("TESTE: INSTRUÇÕES NO SYSTEM PROMPT")
    print("="*70)
    
    try:
        config_path = Path(__file__).parent / "server" / "config.py"
        
        if config_path.exists():
            with open(config_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
                # Verificar instruções sobre insights
                has_insights = (
                    "INSIGHTS AUTOMÁTICOS" in content or
                    "insights automáticos" in content.lower() or
                    "longo prazo" in content.lower()
                )
                results.add_test("Prompt tem instruções sobre insights automáticos", has_insights)
                
                # Verificar instruções sobre histórico
                has_history = (
                    "get_nutrition_history" in content or
                    "/health/history" in content or
                    "histórico" in content.lower()
                )
                results.add_test("Prompt menciona ferramenta de histórico", has_history)
                
                # Verificar exemplos de análise
                has_analysis_examples = (
                    "bateu sua meta" in content.lower() or
                    "dias que atingiu" in content.lower() or
                    "média de calorias" in content.lower()
                )
                results.add_test("Prompt tem exemplos de análise", has_analysis_examples)
        
        print("\n[SUCESSO] Testes de instruções concluídos")
        return True
        
    except Exception as e:
        results.add_test("Instruções no prompt", False, str(e))
        return False

def test_tool_schema(results):
    """Testa que a ferramenta está no schema"""
    print("\n" + "="*70)
    print("TESTE: FERRAMENTA NO SCHEMA")
    print("="*70)
    
    try:
        sys.path.insert(0, str(Path(__file__).parent / "server"))
        from server.health.tools import HEALTH_TOOLS_SCHEMA
        
        # Verificar se get_nutrition_history está no schema
        tool_names = []
        for tool in HEALTH_TOOLS_SCHEMA:
            if tool.get("type") == "function" and "function" in tool:
                tool_names.append(tool["function"].get("name"))
        
        results.add_test("get_nutrition_history está no schema", "get_nutrition_history" in tool_names)
        results.add_test("get_nutrition_summary está no schema", "get_nutrition_summary" in tool_names)
        
        # Verificar descrição da ferramenta
        for tool in HEALTH_TOOLS_SCHEMA:
            if tool.get("type") == "function" and tool.get("function", {}).get("name") == "get_nutrition_history":
                desc = tool["function"].get("description", "")
                results.add_test("Descrição menciona progresso de longo prazo", "longo prazo" in desc.lower() or "múltiplos dias" in desc.lower())
                break
        
        print("\n[SUCESSO] Testes de schema concluídos")
        return True
        
    except Exception as e:
        results.add_test("Ferramenta no schema", False, str(e))
        return False

def main():
    """Executa todos os testes da T2.4"""
    print("\n" + "="*70)
    print("TESTE T2.4 - INSIGHTS AUTOMÁTICOS")
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
        
        test_get_nutrition_history_tool(results)
        test_system_prompt_instructions(results)
        test_tool_schema(results)
        
        # Resumo final
        all_passed = results.print_summary()
        
        if all_passed:
            print("\n🎉 TODOS OS TESTES DA T2.4 PASSARAM!")
            print("Os insights automáticos estão implementados corretamente.")
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
