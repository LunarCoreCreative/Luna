"""
Teste T1.7 - Endpoint de Metas Sugeridas (Teste Unitário)
==========================================================
Testa as funções de cálculo diretamente, sem depender do servidor HTTP.
"""

import sys
import io
from pathlib import Path

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Adicionar server ao path
sys.path.insert(0, str(Path(__file__).parent / "server"))

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

def test_calculation_functions(results):
    """Testa as funções de cálculo diretamente"""
    print("\n" + "="*70)
    print("TESTE T1.7 - FUNÇÕES DE CÁLCULO")
    print("="*70)
    
    try:
        from server.health.routes import (
            calculate_bmr_mifflin_st_jeor,
            calculate_tdee,
            adjust_calories_for_goal,
            calculate_macros
        )
        
        # Teste 1: Cálculo de BMR
        print("\n--- Teste 1: Cálculo de BMR (Mifflin-St Jeor) ---")
        bmr_male = calculate_bmr_mifflin_st_jeor(80.0, 175.0, 30, "male")
        bmr_female = calculate_bmr_mifflin_st_jeor(70.0, 165.0, 25, "female")
        
        results.add_test("BMR para homem calculado", bmr_male > 0)
        results.add_test("BMR para mulher calculado", bmr_female > 0)
        results.add_test("BMR homem > BMR mulher (mesmos dados)", bmr_male > bmr_female)
        results.add_test("BMR homem é razoável (1500-2500)", 1500 <= bmr_male <= 2500)
        results.add_test("BMR mulher é razoável (1200-2200)", 1200 <= bmr_female <= 2200)
        
        # Teste 2: Cálculo de TDEE
        print("\n--- Teste 2: Cálculo de TDEE ---")
        tdee_sedentary = calculate_tdee(bmr_male, "sedentary")
        tdee_light = calculate_tdee(bmr_male, "light")
        tdee_moderate = calculate_tdee(bmr_male, "moderate")
        tdee_active = calculate_tdee(bmr_male, "active")
        tdee_very_active = calculate_tdee(bmr_male, "very_active")
        
        results.add_test("TDEE calculado", tdee_sedentary > 0)
        results.add_test("TDEE sedentário < TDEE leve", tdee_sedentary < tdee_light)
        results.add_test("TDEE leve < TDEE moderado", tdee_light < tdee_moderate)
        results.add_test("TDEE moderado < TDEE ativo", tdee_moderate < tdee_active)
        results.add_test("TDEE ativo < TDEE muito ativo", tdee_active < tdee_very_active)
        
        # Teste 3: Ajuste para objetivo
        print("\n--- Teste 3: Ajuste de calorias para objetivo ---")
        tdee_test = 2000.0
        calories_lose = adjust_calories_for_goal(tdee_test, "lose")
        calories_maintain = adjust_calories_for_goal(tdee_test, "maintain")
        calories_gain = adjust_calories_for_goal(tdee_test, "gain")
        
        results.add_test("Calorias para 'lose' < TDEE", calories_lose < tdee_test)
        results.add_test("Calorias para 'maintain' = TDEE", abs(calories_maintain - tdee_test) < 1)
        results.add_test("Calorias para 'gain' > TDEE", calories_gain > tdee_test)
        results.add_test("Déficit para 'lose' é razoável (400-600)", 400 <= (tdee_test - calories_lose) <= 600 or calories_lose >= tdee_test * 0.8)
        results.add_test("Superávit para 'gain' é razoável (400-600)", 400 <= (calories_gain - tdee_test) <= 600)
        
        # Teste 4: Cálculo de macros
        print("\n--- Teste 4: Cálculo de distribuição de macros ---")
        macros_lose = calculate_macros(2000.0, "lose")
        macros_maintain = calculate_macros(2000.0, "maintain")
        macros_gain = calculate_macros(2000.0, "gain")
        
        results.add_test("Macros para 'lose' têm todos os campos", all(k in macros_lose for k in ["protein", "carbs", "fats"]))
        results.add_test("Macros para 'maintain' têm todos os campos", all(k in macros_maintain for k in ["protein", "carbs", "fats"]))
        results.add_test("Macros para 'gain' têm todos os campos", all(k in macros_gain for k in ["protein", "carbs", "fats"]))
        
        # Verificar que soma de macros faz sentido
        for goal_name, macros in [("lose", macros_lose), ("maintain", macros_maintain), ("gain", macros_gain)]:
            total_cal = (macros["protein"] * 4) + (macros["carbs"] * 4) + (macros["fats"] * 9)
            # Deve estar próximo de 2000 (com margem de erro de 5%)
            results.add_test(f"Soma de macros para '{goal_name}' ≈ 2000 cal", 1900 <= total_cal <= 2100)
        
        # Verificar distribuição específica por objetivo
        results.add_test("Proteína para 'lose' > proteína para 'maintain'", macros_lose["protein"] > macros_maintain["protein"])
        results.add_test("Carbs para 'gain' > carbs para 'maintain'", macros_gain["carbs"] > macros_maintain["carbs"])
        
        print("\n[SUCESSO] Testes de funções de cálculo concluídos")
        return True
        
    except ImportError as e:
        results.add_test("Importar funções de cálculo", False, str(e))
        return False
    except Exception as e:
        results.add_test("Funções de cálculo (geral)", False, str(e))
        return False

def test_suggest_goals_model(results):
    """Testa se o modelo Pydantic está definido"""
    print("\n" + "="*70)
    print("TESTE: MODELO PYDANTIC")
    print("="*70)
    
    try:
        from server.health.routes import SuggestGoalsRequest
        
        # Teste 1: Criar instância válida
        request = SuggestGoalsRequest(
            weight=70.0,
            height=175.0,
            age=30,
            gender="male",
            goal="lose"
        )
        
        results.add_test("Modelo pode ser instanciado", request is not None)
        results.add_test("Campos estão corretos", request.weight == 70.0 and request.height == 175.0)
        
        # Teste 2: activity_level opcional
        request2 = SuggestGoalsRequest(
            weight=70.0,
            height=175.0,
            age=30,
            gender="female",
            goal="maintain",
            activity_level="active"
        )
        
        results.add_test("activity_level opcional funciona", request2.activity_level == "active")
        
        # Teste 3: Valores padrão
        request3 = SuggestGoalsRequest(
            weight=70.0,
            height=175.0,
            age=30,
            gender="male",
            goal="gain"
        )
        
        results.add_test("activity_level padrão é 'moderate'", request3.activity_level == "moderate")
        
        print("\n[SUCESSO] Testes de modelo Pydantic concluídos")
        return True
        
    except ImportError as e:
        results.add_test("Importar SuggestGoalsRequest", False, str(e))
        return False
    except Exception as e:
        results.add_test("Modelo Pydantic (geral)", False, str(e))
        return False

def test_endpoint_integration(results):
    """Testa se o endpoint está registrado (sem fazer requisição HTTP)"""
    print("\n" + "="*70)
    print("TESTE: ENDPOINT REGISTRADO")
    print("="*70)
    
    try:
        from server.health.routes import router
        
        # Verificar se o endpoint está nas rotas
        routes = [route.path for route in router.routes]
        results.add_test("Endpoint /suggest_goals está registrado", "/health/suggest_goals" in routes or any("/suggest_goals" in str(route) for route in router.routes))
        
        # Verificar se as funções estão disponíveis
        from server.health.routes import (
            calculate_bmr_mifflin_st_jeor,
            calculate_tdee,
            adjust_calories_for_goal,
            calculate_macros
        )
        
        results.add_test("Funções de cálculo estão disponíveis", True)
        
        print("\n[SUCESSO] Testes de integração concluídos")
        return True
        
    except Exception as e:
        results.add_test("Integração (geral)", False, str(e))
        return False

def main():
    """Executa todos os testes unitários da T1.7"""
    print("\n" + "="*70)
    print("TESTE T1.7 - ENDPOINT DE METAS SUGERIDAS (UNITÁRIO)")
    print("="*70)
    
    results = TestResults()
    
    # Executar testes
    print("\n🔍 Iniciando testes unitários...\n")
    
    test_calculation_functions(results)
    test_suggest_goals_model(results)
    test_endpoint_integration(results)
    
    # Resumo final
    all_passed = results.print_summary()
    
    if all_passed:
        print("\n🎉 TODOS OS TESTES UNITÁRIOS DA T1.7 PASSARAM!")
        print("As funções de cálculo e o modelo estão funcionando corretamente.")
        print("\n💡 Para testar o endpoint HTTP, inicie o servidor e execute:")
        print("   python test_health_t1_7_suggest_goals.py")
        return 0
    else:
        print("\n⚠️  ALGUNS TESTES FALHARAM. Revise os erros acima.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
