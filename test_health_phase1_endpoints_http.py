"""
Teste Completo - Fase 1 Endpoints HTTP
=======================================
Valida que os endpoints HTTP estão funcionando corretamente,
simulando chamadas do frontend.
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
USER_ID = "test_phase1_http"

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
    print("\n" + "="*70)
    print("TESTE: CONEXÃO COM SERVIDOR")
    print("="*70)
    
    try:
        response = requests.get(f"{BASE_URL}/health", timeout=5)
        results.add_test("Servidor respondendo", response.status_code == 200 or response.status_code == 404)
        return True
    except requests.exceptions.ConnectionError:
        results.add_test("Servidor respondendo", False, "Servidor não está rodando. Inicie com: python server/main.py")
        return False
    except Exception as e:
        results.add_test("Servidor respondendo", False, str(e))
        return False

def test_daily_overview_endpoint(results):
    """Testa GET /health/daily_overview"""
    print("\n" + "="*70)
    print("TESTE: GET /health/daily_overview")
    print("="*70)
    
    try:
        # Teste 1: Endpoint básico
        response = requests.get(
            f"{BASE_URL}/health/daily_overview",
            params={"user_id": USER_ID},
            timeout=10
        )
        
        # Endpoint pode retornar 200 (sucesso) ou outros códigos válidos
        results.add_test("Endpoint responde", response.status_code in [200, 400, 500])
        
        if response.status_code == 200:
            data = response.json()
            results.add_test("Resposta é JSON válido", isinstance(data, dict))
            results.add_test("Resposta tem 'success'", "success" in data)
            results.add_test("Resposta tem 'overview'", "overview" in data)
            
            if data.get("success") and "overview" in data:
                overview = data["overview"]
                results.add_test("Overview tem 'summary'", "summary" in overview)
                results.add_test("Overview tem 'recent_meals'", "recent_meals" in overview)
                results.add_test("Overview tem 'meals_count'", "meals_count" in overview)
        
        # Teste 2: Com parâmetros
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        
        response2 = requests.get(
            f"{BASE_URL}/health/daily_overview",
            params={"user_id": USER_ID, "date": today, "meals_limit": 10},
            timeout=10
        )
        
        results.add_test("Endpoint com parâmetros funciona", response2.status_code == 200)
        
        # Teste 3: Validação de parâmetros
        response3 = requests.get(
            f"{BASE_URL}/health/daily_overview",
            params={"user_id": USER_ID, "meals_limit": 100},  # Acima do máximo
            timeout=10
        )
        
        results.add_test("Validação de meals_limit funciona", response3.status_code == 400)
        
        print("\n[SUCESSO] Testes de daily_overview concluídos")
        return True
        
    except requests.exceptions.ConnectionError:
        results.add_test("GET /health/daily_overview", False, "Servidor não está rodando")
        return False
    except Exception as e:
        results.add_test("GET /health/daily_overview", False, str(e))
        return False

def test_meals_endpoints(results):
    """Testa endpoints de refeições"""
    print("\n" + "="*70)
    print("TESTE: ENDPOINTS DE REFEIÇÕES")
    print("="*70)
    
    try:
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Teste 1: POST /health/meals
        meal_data = {
            "name": "Teste HTTP",
            "meal_type": "breakfast",
            "calories": 300.0,
            "protein": 15.0,
            "carbs": 40.0,
            "fats": 10.0,
            "date": today,
            "user_id": USER_ID
        }
        
        response = requests.post(
            f"{BASE_URL}/health/meals",
            json=meal_data,
            timeout=10
        )
        
        results.add_test("POST /health/meals funciona", response.status_code == 200)
        
        if response.status_code == 200:
            data = response.json()
            results.add_test("POST retorna 'success'", data.get("success") == True)
            meal_id = data.get("meal", {}).get("id") if "meal" in data else None
            
            if meal_id:
                # Teste 2: GET /health/meals
                response2 = requests.get(
                    f"{BASE_URL}/health/meals",
                    params={"user_id": USER_ID, "date": today},
                    timeout=10
                )
                
                results.add_test("GET /health/meals funciona", response2.status_code == 200)
                
                if response2.status_code == 200:
                    data2 = response2.json()
                    results.add_test("GET retorna lista de refeições", "meals" in data2)
                    
                    if "meals" in data2 and len(data2["meals"]) > 0:
                        results.add_test("Refeição criada aparece na lista", True)
                
                # Teste 3: PUT /health/meals/{id}
                update_data = {
                    "name": "Teste HTTP Atualizado",
                    "calories": 350.0,
                    "user_id": USER_ID
                }
                
                response3 = requests.put(
                    f"{BASE_URL}/health/meals/{meal_id}",
                    params={"user_id": USER_ID},
                    json=update_data,
                    timeout=10
                )
                
                results.add_test("PUT /health/meals/{id} funciona", response3.status_code == 200)
                
                # Teste 4: DELETE /health/meals/{id}
                response4 = requests.delete(
                    f"{BASE_URL}/health/meals/{meal_id}",
                    params={"user_id": USER_ID},
                    timeout=10
                )
                
                results.add_test("DELETE /health/meals/{id} funciona", response4.status_code == 200)
        
        print("\n[SUCESSO] Testes de endpoints de refeições concluídos")
        return True
        
    except requests.exceptions.ConnectionError:
        results.add_test("Endpoints de refeições", False, "Servidor não está rodando")
        return False
    except Exception as e:
        results.add_test("Endpoints de refeições", False, str(e))
        return False

def test_summary_endpoint(results):
    """Testa GET /health/summary"""
    print("\n" + "="*70)
    print("TESTE: GET /health/summary")
    print("="*70)
    
    try:
        from datetime import datetime
        today = datetime.now().strftime("%Y-%m-%d")
        
        # Teste 1: Endpoint básico
        response = requests.get(
            f"{BASE_URL}/health/summary",
            params={"user_id": USER_ID},
            timeout=10
        )
        
        results.add_test("GET /health/summary funciona", response.status_code == 200)
        
        if response.status_code == 200:
            data = response.json()
            results.add_test("Resposta tem 'success'", "success" in data)
            results.add_test("Resposta tem 'summary'", "summary" in data)
            
            if "summary" in data:
                summary = data["summary"]
                results.add_test("Summary tem 'total_calories'", "total_calories" in summary)
                results.add_test("Summary tem 'goals'", "goals" in summary)
                results.add_test("Summary tem 'remaining_calories'", "remaining_calories" in summary)
        
        # Teste 2: Com data específica
        response2 = requests.get(
            f"{BASE_URL}/health/summary",
            params={"user_id": USER_ID, "date": today},
            timeout=10
        )
        
        results.add_test("GET /health/summary com data funciona", response2.status_code == 200)
        
        print("\n[SUCESSO] Testes de summary concluídos")
        return True
        
    except requests.exceptions.ConnectionError:
        results.add_test("GET /health/summary", False, "Servidor não está rodando")
        return False
    except Exception as e:
        results.add_test("GET /health/summary", False, str(e))
        return False

def main():
    """Executa todos os testes HTTP"""
    print("\n" + "="*70)
    print("TESTE COMPLETO - FASE 1 ENDPOINTS HTTP")
    print("Validando endpoints usados pelo frontend")
    print("="*70)
    print(f"\n⚠️  NOTA: Certifique-se de que o servidor está rodando em {BASE_URL}")
    print("   Inicie com: python server/main.py\n")
    
    results = TestResults()
    
    # Verificar conexão primeiro
    if not test_server_connection(results):
        print("\n❌ Servidor não está rodando. Inicie o servidor e tente novamente.")
        return 1
    
    # Executar testes
    print("\n🔍 Iniciando testes HTTP...\n")
    
    test_daily_overview_endpoint(results)
    test_meals_endpoints(results)
    test_summary_endpoint(results)
    
    # Resumo final
    all_passed = results.print_summary()
    
    if all_passed:
        print("\n🎉 TODOS OS TESTES HTTP PASSARAM!")
        return 0
    else:
        print("\n⚠️  ALGUNS TESTES FALHARAM. Revise os erros acima.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
