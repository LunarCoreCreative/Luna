"""
Teste Fase 3 - Porções, Lembretes e Qualidade de Vida
======================================================
Valida todas as funcionalidades da Fase 3:
- T3.1: Porções no banco de alimentos
- T3.2: Integração de porções no add_meal
- T3.3: Lembretes básicos (verificação de componente)
- T3.4: Conversas sobre porções (instruções no prompt)
"""

import sys
import io
import requests
import time
import asyncio
from pathlib import Path
from datetime import datetime

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
USER_ID = "test_phase3"

def test_t3_1_portion_helpers(results):
    """Testa T3.1 - Helpers de porções"""
    print("\n" + "="*70)
    print("TESTE T3.1 - HELPERS DE PORÇÕES")
    print("="*70)
    
    try:
        sys.path.insert(0, str(Path(__file__).parent / "server"))
        from server.health.foods import convert_portion_to_grams, parse_portion_string, DEFAULT_PORTIONS
        
        # Teste 1: Conversão de porções padrão
        print("\n--- Teste 1: Conversão de porções padrão ---")
        fatia_grams = convert_portion_to_grams("pão integral", "fatia", 2.0)
        results.add_test("convert_portion_to_grams retorna valor para fatia", fatia_grams is not None and fatia_grams > 0)
        if fatia_grams:
            results.add_test("2 fatias = 50g (25g cada)", abs(fatia_grams - 50.0) < 0.1)
        
        xicara_grams = convert_portion_to_grams("arroz branco", "xícara", 1.0)
        results.add_test("convert_portion_to_grams retorna valor para xícara", xicara_grams is not None and xicara_grams > 0)
        
        # Teste 2: Porções específicas do alimento
        print("\n--- Teste 2: Porções específicas do alimento ---")
        # Verificar que pão integral tem porção "fatia" definida
        from server.health.foods import load_database
        database = load_database()
        pao_integral = database.get("pão integral", {})
        has_servings = "servings" in pao_integral
        results.add_test("Pão integral tem campo 'servings'", has_servings)
        
        if has_servings:
            servings = pao_integral.get("servings", {})
            has_fatia = "fatia" in servings
            results.add_test("Pão integral tem porção 'fatia' definida", has_fatia)
        
        # Teste 3: Parse de strings de porção
        print("\n--- Teste 3: Parse de strings de porção ---")
        parsed1 = parse_portion_string("2 fatias de pão integral")
        results.add_test("parse_portion_string funciona para '2 fatias de pão integral'", parsed1 is not None)
        if parsed1:
            results.add_test("Parse extrai quantidade correta", parsed1.get("quantity") == 2.0)
            results.add_test("Parse extrai tipo de porção", parsed1.get("portion_type") == "fatia")
            results.add_test("Parse extrai nome do alimento", "pão" in parsed1.get("food_name", "").lower())
        
        parsed2 = parse_portion_string("1 xícara de arroz branco")
        results.add_test("parse_portion_string funciona para '1 xícara de arroz branco'", parsed2 is not None)
        
        parsed3 = parse_portion_string("3 colheres de sopa de feijão")
        results.add_test("parse_portion_string funciona para '3 colheres de sopa de feijão'", parsed3 is not None)
        
        # Teste 4: DEFAULT_PORTIONS existe
        print("\n--- Teste 4: DEFAULT_PORTIONS ---")
        results.add_test("DEFAULT_PORTIONS está definido", DEFAULT_PORTIONS is not None and len(DEFAULT_PORTIONS) > 0)
        results.add_test("DEFAULT_PORTIONS tem 'fatia'", "fatia" in DEFAULT_PORTIONS)
        results.add_test("DEFAULT_PORTIONS tem 'xícara'", "xícara" in DEFAULT_PORTIONS or "xicara" in DEFAULT_PORTIONS)
        
        print("\n[SUCESSO] Testes T3.1 concluídos")
        return True
        
    except Exception as e:
        results.add_test("T3.1 - Helpers de porções", False, str(e))
        import traceback
        traceback.print_exc()
        return False

def test_t3_2_portion_integration(results):
    """Testa T3.2 - Integração de porções no add_meal"""
    print("\n" + "="*70)
    print("TESTE T3.2 - INTEGRAÇÃO DE PORÇÕES NO add_meal")
    print("="*70)
    
    try:
        sys.path.insert(0, str(Path(__file__).parent / "server"))
        from server.health.tools import execute_health_tool
        
        # Teste 1: add_meal com portion_type
        print("\n--- Teste 1: add_meal com portion_type ---")
        result1 = asyncio.run(execute_health_tool(
            "add_meal",
            {
                "name": "2 fatias de pão integral",
                "meal_type": "breakfast",
                "portion_type": "fatia",
                "portion_quantity": 2.0
            },
            USER_ID
        ))
        
        results.add_test("add_meal aceita portion_type e portion_quantity", result1.get("success") == True)
        if result1.get("success"):
            results.add_test("Refeição foi registrada", "meal" in result1)
            # Verificar que as calorias foram calculadas (não zero)
            meal = result1.get("meal", {})
            has_calories = meal.get("calories", 0) > 0
            results.add_test("Calorias foram calculadas automaticamente", has_calories)
        
        # Teste 2: add_meal com parse automático de porção
        print("\n--- Teste 2: add_meal com parse automático ---")
        result2 = asyncio.run(execute_health_tool(
            "add_meal",
            {
                "name": "1 xícara de arroz branco cozido",
                "meal_type": "lunch"
            },
            USER_ID
        ))
        
        results.add_test("add_meal faz parse automático de porção", result2.get("success") == True)
        if result2.get("success"):
            meal2 = result2.get("meal", {})
            has_calories2 = meal2.get("calories", 0) > 0
            results.add_test("Calorias calculadas após parse automático", has_calories2)
        
        # Teste 3: Schema da ferramenta tem parâmetros de porção
        print("\n--- Teste 3: Schema da ferramenta ---")
        from server.health.tools import HEALTH_TOOLS_SCHEMA
        add_meal_tool = None
        for tool in HEALTH_TOOLS_SCHEMA:
            if tool.get("type") == "function" and tool.get("function", {}).get("name") == "add_meal":
                add_meal_tool = tool["function"]
                break
        
        results.add_test("Ferramenta add_meal existe no schema", add_meal_tool is not None)
        if add_meal_tool:
            params = add_meal_tool.get("parameters", {}).get("properties", {})
            has_portion_type = "portion_type" in params
            has_portion_quantity = "portion_quantity" in params
            has_grams = "grams" in params
            results.add_test("Schema tem 'portion_type'", has_portion_type)
            results.add_test("Schema tem 'portion_quantity'", has_portion_quantity)
            results.add_test("Schema tem 'grams'", has_grams)
        
        # Teste 4: calculate_nutrition com porções
        print("\n--- Teste 4: calculate_nutrition com porções ---")
        from server.health.foods import calculate_nutrition
        nutrition = asyncio.run(calculate_nutrition(
            "pão integral",
            portion_type="fatia",
            portion_quantity=2.0,
            search_online=False
        ))
        
        results.add_test("calculate_nutrition funciona com porções", nutrition is not None)
        if nutrition:
            results.add_test("calculate_nutrition retorna calorias", "calories" in nutrition)
            results.add_test("Calorias calculadas são positivas", nutrition.get("calories", 0) > 0)
        
        print("\n[SUCESSO] Testes T3.2 concluídos")
        return True
        
    except Exception as e:
        results.add_test("T3.2 - Integração de porções", False, str(e))
        import traceback
        traceback.print_exc()
        return False

def test_t3_3_reminders_component(results):
    """Testa T3.3 - Lembretes básicos (verificação de componente)"""
    print("\n" + "="*70)
    print("TESTE T3.3 - LEMBRETES BÁSICOS")
    print("="*70)
    
    try:
        # Teste 1: Componente existe
        print("\n--- Teste 1: Componente RemindersTab existe ---")
        reminders_path = Path(__file__).parent / "src" / "components" / "health" / "RemindersTab.jsx"
        results.add_test("RemindersTab.jsx existe", reminders_path.exists())
        
        if reminders_path.exists():
            content = reminders_path.read_text(encoding='utf-8')
            has_notification_api = "Notification" in content
            has_local_storage = "localStorage" in content
            has_breakfast = "breakfast" in content or "Café da manhã" in content
            has_water = "water" in content or "água" in content.lower()
            
            results.add_test("Componente usa Notification API", has_notification_api)
            results.add_test("Componente usa localStorage", has_local_storage)
            results.add_test("Componente tem lembretes de refeições", has_breakfast)
            results.add_test("Componente tem lembretes de água", has_water)
        
        # Teste 2: Integração no HealthMode
        print("\n--- Teste 2: Integração no HealthMode ---")
        health_mode_path = Path(__file__).parent / "src" / "components" / "health" / "HealthMode.jsx"
        if health_mode_path.exists():
            content = health_mode_path.read_text(encoding='utf-8')
            imports_reminders = "RemindersTab" in content
            has_reminders_tab = "reminders" in content.lower() and "activeTab" in content
            has_bell_icon = "Bell" in content
            
            results.add_test("HealthMode importa RemindersTab", imports_reminders)
            results.add_test("HealthMode tem aba 'reminders'", has_reminders_tab)
            results.add_test("HealthMode usa ícone Bell", has_bell_icon)
        
        # Teste 3: localStorage funciona (simulação)
        print("\n--- Teste 3: localStorage (verificação) ---")
        # Verificar que o código salva no localStorage
        if reminders_path.exists():
            content = reminders_path.read_text(encoding='utf-8')
            saves_to_storage = "setItem" in content and "luna_health_reminders" in content
            loads_from_storage = "getItem" in content and "luna_health_reminders" in content
            results.add_test("Componente salva no localStorage", saves_to_storage)
            results.add_test("Componente carrega do localStorage", loads_from_storage)
        
        print("\n[SUCESSO] Testes T3.3 concluídos")
        return True
        
    except Exception as e:
        results.add_test("T3.3 - Lembretes básicos", False, str(e))
        import traceback
        traceback.print_exc()
        return False

def test_t3_4_portion_conversations(results):
    """Testa T3.4 - Conversas sobre porções (instruções no prompt)"""
    print("\n" + "="*70)
    print("TESTE T3.4 - CONVERSAS SOBRE PORÇÕES")
    print("="*70)
    
    try:
        # Teste 1: Instruções no prompt
        print("\n--- Teste 1: Instruções no HEALTH_SYSTEM_PROMPT ---")
        config_path = Path(__file__).parent / "server" / "config.py"
        
        if config_path.exists():
            with open(config_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
                has_portion_section = (
                    "CONVERSAS SOBRE PORÇÕES" in content or
                    "conversas sobre porções" in content.lower() or
                    "porções" in content.lower() and "obrigatório" in content.lower()
                )
                results.add_test("Prompt tem seção sobre porções", has_portion_section)
                
                has_examples = (
                    "2 fatias de pão" in content or
                    "1 xícara de arroz" in content or
                    "portion_type" in content
                )
                results.add_test("Prompt tem exemplos de porções", has_examples)
                
                has_portion_type = "portion_type" in content
                has_portion_quantity = "portion_quantity" in content
                results.add_test("Prompt menciona 'portion_type'", has_portion_type)
                results.add_test("Prompt menciona 'portion_quantity'", has_portion_quantity)
        
        # Teste 2: Ferramenta processa porções corretamente
        print("\n--- Teste 2: Ferramenta processa porções ---")
        sys.path.insert(0, str(Path(__file__).parent / "server"))
        from server.health.tools import execute_health_tool
        from server.health.foods import parse_portion_string
        
        # Testar que parse_portion_string funciona com exemplos do prompt
        test_strings = [
            "2 fatias de pão integral",
            "1 xícara de arroz branco",
            "3 colheres de sopa de feijão"
        ]
        
        for test_str in test_strings:
            parsed = parse_portion_string(test_str)
            results.add_test(f"parse_portion_string funciona para '{test_str}'", parsed is not None)
        
        print("\n[SUCESSO] Testes T3.4 concluídos")
        return True
        
    except Exception as e:
        results.add_test("T3.4 - Conversas sobre porções", False, str(e))
        import traceback
        traceback.print_exc()
        return False

def main():
    """Executa todos os testes da Fase 3"""
    print("\n" + "="*70, flush=True)
    print("TESTE FASE 3 - PORÇÕES, LEMBRETES E QUALIDADE DE VIDA", flush=True)
    print("="*70, flush=True)
    
    results = TestResults()
    server_started = False
    
    try:
        print("[DEBUG] Iniciando main()", flush=True)
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
        
        test_t3_1_portion_helpers(results)
        test_t3_2_portion_integration(results)
        test_t3_3_reminders_component(results)
        test_t3_4_portion_conversations(results)
        
        # Resumo final
        all_passed = results.print_summary()
        
        if all_passed:
            print("\n🎉 TODOS OS TESTES DA FASE 3 PASSARAM!")
            print("A Fase 3 está funcionando corretamente.")
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
