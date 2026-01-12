"""
Teste T1.8 - Tela de Metas Nutricionais
========================================
Valida que a funcionalidade de metas está funcionando corretamente.
"""

import sys
import io
import requests
from pathlib import Path

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Configuração
BASE_URL = "http://127.0.0.1:8001"
USER_ID = "test_t1_8_goals"

class TestResults:
    """Classe para rastrear resultados dos testes"""
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
        print(f"Taxa de sucesso: {(self.passed/self.total*100):.1f}%")
        
        if self.errors:
            print("\n❌ Testes que falharam:")
            for name, error in self.errors:
                print(f"  - {name}: {error}")
        
        return self.failed == 0

def test_server_connection(results):
    """Testa se o servidor está rodando"""
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        return True
    except requests.exceptions.ConnectionError:
        results.add_test("Servidor respondendo", False, "Servidor não está rodando")
        return False
    except Exception:
        return True

def test_goals_endpoints(results):
    """Testa endpoints de metas"""
    print("\n" + "="*70)
    print("TESTE T1.8 - ENDPOINTS DE METAS")
    print("="*70)
    
    try:
        # Teste 1: GET /health/goals
        print("\n--- Teste 1: GET /health/goals ---")
        response = requests.get(
            f"{BASE_URL}/health/goals",
            params={"user_id": USER_ID},
            timeout=10
        )
        
        results.add_test("GET /health/goals funciona", response.status_code == 200)
        
        if response.status_code == 200:
            data = response.json()
            results.add_test("Resposta tem 'success'", "success" in data)
            results.add_test("Resposta tem 'goals'", "goals" in data)
        
        # Teste 2: PUT /health/goals (salvar metas)
        print("\n--- Teste 2: PUT /health/goals ---")
        goals_data = {
            "daily_calories": 2000.0,
            "daily_protein": 80.0,
            "daily_carbs": 250.0,
            "daily_fats": 65.0,
            "current_weight": 70.0,
            "target_weight": 65.0
        }
        
        response2 = requests.put(
            f"{BASE_URL}/health/goals",
            params={"user_id": USER_ID},
            json=goals_data,
            timeout=10
        )
        
        results.add_test("PUT /health/goals funciona", response2.status_code == 200)
        
        if response2.status_code == 200:
            data2 = response2.json()
            results.add_test("PUT retorna 'success'", data2.get("success") == True)
            results.add_test("PUT retorna 'goals'", "goals" in data2)
            
            if "goals" in data2:
                goals = data2["goals"]
                results.add_test("Goals tem 'daily_calories'", goals.get("daily_calories") == 2000.0)
                results.add_test("Goals tem 'current_weight'", goals.get("current_weight") == 70.0)
                results.add_test("Goals tem 'target_weight'", goals.get("target_weight") == 65.0)
        
        # Teste 3: Verificar que metas aparecem no resumo
        print("\n--- Teste 3: Metas no resumo ---")
        response3 = requests.get(
            f"{BASE_URL}/health/summary",
            params={"user_id": USER_ID},
            timeout=10
        )
        
        if response3.status_code == 200:
            data3 = response3.json()
            if "summary" in data3:
                summary = data3["summary"]
                results.add_test("Resumo tem 'goals'", "goals" in summary)
                results.add_test("Resumo tem 'current_weight'", "current_weight" in summary)
                results.add_test("Resumo tem 'target_weight'", "target_weight" in summary)
                results.add_test("Resumo tem 'weight_difference'", "weight_difference" in summary)
                
                if "weight_difference" in summary:
                    diff = summary["weight_difference"]
                    results.add_test("weight_difference calculado corretamente", diff == -5.0)
        
        # Teste 4: Atualizar apenas alguns campos
        print("\n--- Teste 4: Atualização parcial ---")
        partial_goals = {
            "daily_calories": 1800.0,
            "current_weight": 72.0
        }
        
        response4 = requests.put(
            f"{BASE_URL}/health/goals",
            params={"user_id": USER_ID},
            json=partial_goals,
            timeout=10
        )
        
        if response4.status_code == 200:
            data4 = response4.json()
            if "goals" in data4:
                goals4 = data4["goals"]
                results.add_test("Atualização parcial funciona", goals4.get("daily_calories") == 1800.0)
                results.add_test("Outros campos mantidos", goals4.get("daily_protein") == 80.0)
        
        print("\n[SUCESSO] Testes de endpoints de metas concluídos")
        return True
        
    except requests.exceptions.ConnectionError:
        results.add_test("Endpoints de metas", False, "Servidor não está rodando")
        return False
    except Exception as e:
        results.add_test("Endpoints de metas", False, str(e))
        return False

def test_suggest_goals_integration(results):
    """Testa integração entre suggest_goals e update_goals"""
    print("\n" + "="*70)
    print("TESTE: INTEGRAÇÃO SUGGEST_GOALS + UPDATE_GOALS")
    print("="*70)
    
    try:
        # Teste 1: Obter sugestões
        print("\n--- Teste 1: Obter sugestões ---")
        suggest_request = {
            "weight": 75.0,
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
        
        results.add_test("suggest_goals funciona", response.status_code == 200)
        
        if response.status_code == 200:
            data = response.json()
            if "suggested_goals" in data:
                suggested = data["suggested_goals"]
                results.add_test("Sugestões têm todos os campos", all(k in suggested for k in ["daily_calories", "daily_protein", "daily_carbs", "daily_fats"]))
                
                # Teste 2: Aplicar sugestões
                print("\n--- Teste 2: Aplicar sugestões ---")
                apply_goals = {
                    "daily_calories": suggested["daily_calories"],
                    "daily_protein": suggested["daily_protein"],
                    "daily_carbs": suggested["daily_carbs"],
                    "daily_fats": suggested["daily_fats"],
                    "current_weight": 75.0
                }
                
                response2 = requests.put(
                    f"{BASE_URL}/health/goals",
                    params={"user_id": USER_ID},
                    json=apply_goals,
                    timeout=10
                )
                
                results.add_test("Aplicar sugestões funciona", response2.status_code == 200)
                
                if response2.status_code == 200:
                    data2 = response2.json()
                    if "goals" in data2:
                        goals = data2["goals"]
                        results.add_test("Metas aplicadas corretamente", goals.get("daily_calories") == suggested["daily_calories"])
        
        print("\n[SUCESSO] Testes de integração concluídos")
        return True
        
    except requests.exceptions.ConnectionError:
        results.add_test("Integração suggest_goals", False, "Servidor não está rodando")
        return False
    except Exception as e:
        results.add_test("Integração suggest_goals", False, str(e))
        return False

def main():
    """Executa todos os testes da T1.8"""
    print("\n" + "="*70)
    print("TESTE T1.8 - TELA DE METAS NUTRICIONAIS")
    print("="*70)
    print(f"\n⚠️  NOTA: Certifique-se de que o servidor está rodando em {BASE_URL}")
    print("   Inicie com: python server/main.py\n")
    
    results = TestResults()
    
    # Verificar conexão primeiro
    if not test_server_connection(results):
        print("\n❌ Servidor não está rodando. Inicie o servidor e tente novamente.")
        return 1
    
    # Executar testes
    print("\n🔍 Iniciando testes...\n")
    
    test_goals_endpoints(results)
    test_suggest_goals_integration(results)
    
    # Resumo final
    all_passed = results.print_summary()
    
    if all_passed:
        print("\n🎉 TODOS OS TESTES DA T1.8 PASSARAM!")
        print("A tela de metas nutricionais está funcionando corretamente.")
        return 0
    else:
        print("\n⚠️  ALGUNS TESTES FALHARAM. Revise os erros acima.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
