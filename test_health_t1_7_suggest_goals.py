"""
Teste T1.7 - Endpoint de Metas Sugeridas
=========================================
Valida que o endpoint POST /health/suggest_goals está funcionando corretamente.
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
        results.add_test("Servidor respondendo", False, "Servidor não está rodando. Inicie com: python server/main.py")
        return False
    except Exception:
        return True

def test_suggest_goals_endpoint(results):
    """Testa POST /health/suggest_goals"""
    print("\n" + "="*70)
    print("TESTE T1.7 - POST /health/suggest_goals")
    print("="*70)
    
    try:
        # Teste 1: Emagrecer (lose)
        print("\n--- Teste 1: Objetivo de emagrecer ---")
        request_data = {
            "weight": 80.0,
            "height": 175.0,
            "age": 30,
            "gender": "male",
            "goal": "lose",
            "activity_level": "moderate"
        }
        
        response = requests.post(
            f"{BASE_URL}/health/suggest_goals",
            json=request_data,
            timeout=10
        )
        
        results.add_test("Endpoint responde", response.status_code == 200)
        
        if response.status_code == 200:
            data = response.json()
            results.add_test("Resposta tem 'success'", data.get("success") == True)
            results.add_test("Resposta tem 'suggested_goals'", "suggested_goals" in data)
            
            if "suggested_goals" in data:
                goals = data["suggested_goals"]
                results.add_test("Tem 'daily_calories'", "daily_calories" in goals)
                results.add_test("Tem 'daily_protein'", "daily_protein" in goals)
                results.add_test("Tem 'daily_carbs'", "daily_carbs" in goals)
                results.add_test("Tem 'daily_fats'", "daily_fats" in goals)
                results.add_test("Tem 'bmr'", "bmr" in goals)
                results.add_test("Tem 'tdee'", "tdee" in goals)
                
                # Verificar valores razoáveis
                if "daily_calories" in goals:
                    cal = goals["daily_calories"]
                    results.add_test("Calorias são razoáveis (1000-5000)", 1000 <= cal <= 5000)
                
                if "daily_protein" in goals:
                    prot = goals["daily_protein"]
                    results.add_test("Proteína é razoável (>0)", prot > 0)
        
        # Teste 2: Manter peso (maintain)
        print("\n--- Teste 2: Objetivo de manter peso ---")
        request_data2 = {
            "weight": 70.0,
            "height": 165.0,
            "age": 25,
            "gender": "female",
            "goal": "maintain",
            "activity_level": "light"
        }
        
        response2 = requests.post(
            f"{BASE_URL}/health/suggest_goals",
            json=request_data2,
            timeout=10
        )
        
        results.add_test("Endpoint funciona para 'maintain'", response2.status_code == 200)
        
        if response2.status_code == 200:
            data2 = response2.json()
            if "suggested_goals" in data2:
                goals2 = data2["suggested_goals"]
                # Para manter, calorias devem ser próximas do TDEE
                if "tdee" in goals2 and "daily_calories" in goals2:
                    diff = abs(goals2["daily_calories"] - goals2["tdee"])
                    results.add_test("Calorias para 'maintain' próximas do TDEE", diff < 100)
        
        # Teste 3: Ganhar massa (gain)
        print("\n--- Teste 3: Objetivo de ganhar massa ---")
        request_data3 = {
            "weight": 65.0,
            "height": 170.0,
            "age": 28,
            "gender": "male",
            "goal": "gain",
            "activity_level": "active"
        }
        
        response3 = requests.post(
            f"{BASE_URL}/health/suggest_goals",
            json=request_data3,
            timeout=10
        )
        
        results.add_test("Endpoint funciona para 'gain'", response3.status_code == 200)
        
        if response3.status_code == 200:
            data3 = response3.json()
            if "suggested_goals" in data3:
                goals3 = data3["suggested_goals"]
                # Para ganhar, calorias devem ser maiores que TDEE
                if "tdee" in goals3 and "daily_calories" in goals3:
                    results.add_test("Calorias para 'gain' maiores que TDEE", goals3["daily_calories"] > goals3["tdee"])
        
        # Teste 4: Validações de parâmetros
        print("\n--- Teste 4: Validações de parâmetros ---")
        
        # Peso inválido
        invalid_request = {
            "weight": -10,
            "height": 175.0,
            "age": 30,
            "gender": "male",
            "goal": "lose"
        }
        response_invalid = requests.post(
            f"{BASE_URL}/health/suggest_goals",
            json=invalid_request,
            timeout=10
        )
        results.add_test("Valida peso inválido", response_invalid.status_code == 400)
        
        # Gênero inválido
        invalid_gender = {
            "weight": 70.0,
            "height": 175.0,
            "age": 30,
            "gender": "invalid",
            "goal": "lose"
        }
        response_invalid_gender = requests.post(
            f"{BASE_URL}/health/suggest_goals",
            json=invalid_gender,
            timeout=10
        )
        results.add_test("Valida gênero inválido", response_invalid_gender.status_code == 400)
        
        # Objetivo inválido
        invalid_goal = {
            "weight": 70.0,
            "height": 175.0,
            "age": 30,
            "gender": "male",
            "goal": "invalid"
        }
        response_invalid_goal = requests.post(
            f"{BASE_URL}/health/suggest_goals",
            json=invalid_goal,
            timeout=10
        )
        results.add_test("Valida objetivo inválido", response_invalid_goal.status_code == 400)
        
        # Teste 5: Diferentes níveis de atividade
        print("\n--- Teste 5: Diferentes níveis de atividade ---")
        activity_levels = ["sedentary", "light", "moderate", "active", "very_active"]
        
        for level in activity_levels:
            request_activity = {
                "weight": 70.0,
                "height": 175.0,
                "age": 30,
                "gender": "male",
                "goal": "maintain",
                "activity_level": level
            }
            response_activity = requests.post(
                f"{BASE_URL}/health/suggest_goals",
                json=request_activity,
                timeout=10
            )
            results.add_test(f"Funciona com activity_level='{level}'", response_activity.status_code == 200)
        
        # Teste 6: Estrutura da resposta
        print("\n--- Teste 6: Estrutura da resposta ---")
        if response.status_code == 200:
            data = response.json()
            if "suggested_goals" in data:
                goals = data["suggested_goals"]
                # Verificar que todos os valores são numéricos
                results.add_test("daily_calories é numérico", isinstance(goals.get("daily_calories"), (int, float)))
                results.add_test("daily_protein é numérico", isinstance(goals.get("daily_protein"), (int, float)))
                results.add_test("daily_carbs é numérico", isinstance(goals.get("daily_carbs"), (int, float)))
                results.add_test("daily_fats é numérico", isinstance(goals.get("daily_fats"), (int, float)))
                results.add_test("bmr é numérico", isinstance(goals.get("bmr"), (int, float)))
                results.add_test("tdee é numérico", isinstance(goals.get("tdee"), (int, float)))
        
        print("\n[SUCESSO] Testes de suggest_goals concluídos")
        return True
        
    except requests.exceptions.ConnectionError:
        results.add_test("POST /health/suggest_goals", False, "Servidor não está rodando")
        return False
    except Exception as e:
        results.add_test("POST /health/suggest_goals", False, str(e))
        return False

def test_calculation_logic(results):
    """Testa a lógica de cálculo usando funções diretas"""
    print("\n" + "="*70)
    print("TESTE: LÓGICA DE CÁLCULO")
    print("="*70)
    
    try:
        # Importar funções de cálculo
        sys.path.insert(0, str(Path(__file__).parent / "server"))
        from server.health.routes import (
            calculate_bmr_mifflin_st_jeor,
            calculate_tdee,
            adjust_calories_for_goal,
            calculate_macros
        )
        
        # Teste 1: Cálculo de BMR
        print("\n--- Teste: Cálculo de BMR ---")
        bmr_male = calculate_bmr_mifflin_st_jeor(80.0, 175.0, 30, "male")
        bmr_female = calculate_bmr_mifflin_st_jeor(70.0, 165.0, 25, "female")
        
        results.add_test("BMR para homem calculado", bmr_male > 0)
        results.add_test("BMR para mulher calculado", bmr_female > 0)
        results.add_test("BMR homem > BMR mulher (mesmos dados)", bmr_male > bmr_female)
        
        # Teste 2: Cálculo de TDEE
        print("\n--- Teste: Cálculo de TDEE ---")
        tdee_sedentary = calculate_tdee(bmr_male, "sedentary")
        tdee_active = calculate_tdee(bmr_male, "active")
        
        results.add_test("TDEE calculado", tdee_sedentary > 0)
        results.add_test("TDEE ativo > TDEE sedentário", tdee_active > tdee_sedentary)
        
        # Teste 3: Ajuste para objetivo
        print("\n--- Teste: Ajuste para objetivo ---")
        calories_lose = adjust_calories_for_goal(tdee_male := calculate_tdee(bmr_male, "moderate"), "lose")
        calories_maintain = adjust_calories_for_goal(tdee_male, "maintain")
        calories_gain = adjust_calories_for_goal(tdee_male, "gain")
        
        results.add_test("Calorias para 'lose' < TDEE", calories_lose < tdee_male)
        results.add_test("Calorias para 'maintain' ≈ TDEE", abs(calories_maintain - tdee_male) < 10)
        results.add_test("Calorias para 'gain' > TDEE", calories_gain > tdee_male)
        
        # Teste 4: Cálculo de macros
        print("\n--- Teste: Cálculo de macros ---")
        macros_lose = calculate_macros(2000.0, "lose")
        macros_maintain = calculate_macros(2000.0, "maintain")
        macros_gain = calculate_macros(2000.0, "gain")
        
        results.add_test("Macros para 'lose' calculados", all(k in macros_lose for k in ["protein", "carbs", "fats"]))
        results.add_test("Macros para 'maintain' calculados", all(k in macros_maintain for k in ["protein", "carbs", "fats"]))
        results.add_test("Macros para 'gain' calculados", all(k in macros_gain for k in ["protein", "carbs", "fats"]))
        
        # Verificar que soma de macros faz sentido
        # Proteína + Carbs = ~4 cal/g, Fats = 9 cal/g
        for goal_name, macros in [("lose", macros_lose), ("maintain", macros_maintain), ("gain", macros_gain)]:
            total_cal = (macros["protein"] * 4) + (macros["carbs"] * 4) + (macros["fats"] * 9)
            # Deve estar próximo de 2000 (com margem de erro)
            results.add_test(f"Soma de macros para '{goal_name}' faz sentido", 1800 <= total_cal <= 2200)
        
        print("\n[SUCESSO] Testes de lógica de cálculo concluídos")
        return True
        
    except ImportError as e:
        results.add_test("Importar funções de cálculo", False, str(e))
        return False
    except Exception as e:
        results.add_test("Lógica de cálculo (geral)", False, str(e))
        return False

def main():
    """Executa todos os testes da T1.7"""
    print("\n" + "="*70)
    print("TESTE T1.7 - ENDPOINT DE METAS SUGERIDAS")
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
    
    test_suggest_goals_endpoint(results)
    test_calculation_logic(results)
    
    # Resumo final
    all_passed = results.print_summary()
    
    if all_passed:
        print("\n🎉 TODOS OS TESTES DA T1.7 PASSARAM!")
        print("O endpoint de metas sugeridas está funcionando corretamente.")
        return 0
    else:
        print("\n⚠️  ALGUNS TESTES FALHARAM. Revise os erros acima.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
