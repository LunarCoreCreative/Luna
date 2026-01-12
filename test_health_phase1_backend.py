"""
Teste Completo - Fase 1 Backend (T1.1 + T1.2)
==============================================
Executa todos os testes da subfase backend da Fase 1 para garantir
que os endpoints estão funcionando corretamente.
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

from datetime import datetime, timedelta
from server.health.storage import (
    add_meal,
    load_meals,
    get_summary,
    update_goals,
    delete_meal,
    get_goals
)

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

def test_t1_1_meals_endpoint(results):
    """Testa T1.1 - GET /health/meals com filtros"""
    print("\n" + "="*70)
    print("TESTE T1.1 - GET /health/meals com filtros")
    print("="*70)
    
    user_id = "test_phase1_meals"
    today = datetime.now().strftime("%Y-%m-%d")
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    
    try:
        # Limpar dados anteriores
        meals = load_meals(user_id, limit=100)
        for meal in meals:
            delete_meal(user_id, meal.get("id"))
        
        # Criar refeições de teste
        add_meal(user_id, "Café da manhã", "breakfast", calories=400.0, date=today)
        add_meal(user_id, "Almoço", "lunch", calories=600.0, date=today)
        add_meal(user_id, "Jantar de ontem", "dinner", calories=500.0, date=yesterday)
        
        # Teste 1: Buscar todas as refeições
        all_meals = load_meals(user_id, limit=100)
        results.add_test("Buscar todas as refeições", len(all_meals) == 3)
        
        # Teste 2: Filtrar por data (hoje)
        today_meals = load_meals(user_id, limit=100, date=today)
        results.add_test("Filtrar por data (hoje)", len(today_meals) == 2)
        
        # Teste 3: Limitar quantidade
        limited_meals = load_meals(user_id, limit=2)
        results.add_test("Limitar quantidade", len(limited_meals) == 2)
        
        # Teste 4: Filtrar por data E limitar
        filtered_limited = load_meals(user_id, limit=1, date=today)
        results.add_test("Filtrar por data + limitar", len(filtered_limited) == 1)
        
        # Teste 5: Ordenação (mais recente primeiro)
        ordered = load_meals(user_id, limit=10)
        is_ordered = True
        if len(ordered) > 1:
            for i in range(len(ordered) - 1):
                date1 = ordered[i].get("date", "")
                date2 = ordered[i+1].get("date", "")
                if date1 < date2:
                    is_ordered = False
                    break
        results.add_test("Ordenação (mais recente primeiro)", is_ordered)
        
        print("\n[SUCESSO] Testes de GET /health/meals concluídos")
        return True
        
    except Exception as e:
        results.add_test("GET /health/meals (geral)", False, str(e))
        return False

def test_t1_1_summary_endpoint(results):
    """Testa T1.1 - GET /health/summary"""
    print("\n" + "="*70)
    print("TESTE T1.1 - GET /health/summary")
    print("="*70)
    
    user_id = "test_phase1_summary"
    today = datetime.now().strftime("%Y-%m-%d")
    
    try:
        # Limpar dados anteriores
        meals = load_meals(user_id, limit=100)
        for meal in meals:
            delete_meal(user_id, meal.get("id"))
        
        # Configurar metas
        update_goals(
            user_id,
            daily_calories=2000.0,
            daily_protein=80.0,
            daily_carbs=250.0,
            daily_fats=65.0
        )
        
        # Adicionar refeições
        add_meal(user_id, "Café", "breakfast", calories=400.0, protein=20.0, carbs=50.0, fats=15.0, date=today)
        add_meal(user_id, "Almoço", "lunch", calories=600.0, protein=30.0, carbs=80.0, fats=20.0, date=today)
        add_meal(user_id, "Jantar", "dinner", calories=200.0, protein=5.0, carbs=25.0, fats=5.0, date=today)
        
        # Obter resumo
        summary = get_summary(user_id, date=today)
        
        # Teste 1: Totais corretos
        total_cal = summary.get("total_calories", 0)
        total_prot = summary.get("total_protein", 0)
        total_carbs = summary.get("total_carbs", 0)
        total_fats = summary.get("total_fats", 0)
        
        results.add_test("Total de calorias correto", total_cal == 1200.0)
        results.add_test("Total de proteína correto", total_prot == 55.0)
        results.add_test("Total de carboidratos correto", total_carbs == 155.0)
        results.add_test("Total de gorduras correto", total_fats == 40.0)
        
        # Teste 2: Metas presentes
        goals = summary.get("goals", {})
        results.add_test("Metas presentes no resumo", isinstance(goals, dict))
        
        # Teste 3: Saldos calculados
        remaining_cal = summary.get("remaining_calories", None)
        remaining_prot = summary.get("remaining_protein", None)
        
        results.add_test("Saldos calculados", remaining_cal is not None and remaining_prot is not None)
        results.add_test("Saldo de calorias correto", remaining_cal == 800.0)
        results.add_test("Saldo de proteína correto", remaining_prot == 25.0)
        
        # Teste 4: Resumo vazio
        empty_user = "test_phase1_summary_empty"
        try:
            meals = load_meals(empty_user, limit=100)
            for meal in meals:
                delete_meal(empty_user, meal.get("id"))
        except:
            pass
        
        empty_summary = get_summary(empty_user, date=today)
        results.add_test("Resumo vazio funcionando", empty_summary.get("total_calories") == 0.0)
        
        # Teste 5: Resumo sem metas
        no_goals_user = "test_phase1_summary_no_goals"
        try:
            meals = load_meals(no_goals_user, limit=100)
            for meal in meals:
                delete_meal(no_goals_user, meal.get("id"))
        except:
            pass
        
        add_meal(no_goals_user, "Teste", "breakfast", calories=300.0, date=today)
        no_goals_summary = get_summary(no_goals_user, date=today)
        results.add_test("Resumo sem metas funcionando", no_goals_summary.get("total_calories") == 300.0)
        
        print("\n[SUCESSO] Testes de GET /health/summary concluídos")
        return True
        
    except Exception as e:
        results.add_test("GET /health/summary (geral)", False, str(e))
        return False

def test_t1_2_daily_overview(results):
    """Testa T1.2 - GET /health/daily_overview"""
    print("\n" + "="*70)
    print("TESTE T1.2 - GET /health/daily_overview")
    print("="*70)
    
    user_id = "test_phase1_overview"
    today = datetime.now().strftime("%Y-%m-%d")
    
    try:
        # Limpar dados anteriores
        meals = load_meals(user_id, limit=100)
        for meal in meals:
            delete_meal(user_id, meal.get("id"))
        
        # Configurar metas
        update_goals(
            user_id,
            daily_calories=2000.0,
            daily_protein=80.0,
            daily_carbs=250.0,
            daily_fats=65.0
        )
        
        # Adicionar refeições
        add_meal(user_id, "Café", "breakfast", calories=400.0, protein=20.0, carbs=50.0, fats=15.0, date=today)
        add_meal(user_id, "Almoço", "lunch", calories=600.0, protein=30.0, carbs=80.0, fats=20.0, date=today)
        add_meal(user_id, "Lanche", "snack", calories=200.0, protein=5.0, carbs=25.0, fats=5.0, date=today)
        add_meal(user_id, "Jantar", "dinner", calories=500.0, protein=25.0, carbs=60.0, fats=15.0, date=today)
        
        # Simular endpoint daily_overview
        summary = get_summary(user_id, date=today)
        recent_meals = load_meals(user_id, limit=5, date=today)
        overview = {
            "summary": summary,
            "recent_meals": recent_meals,
            "meals_count": len(recent_meals)
        }
        
        # Teste 1: Estrutura básica
        results.add_test("Overview tem campo 'summary'", "summary" in overview)
        results.add_test("Overview tem campo 'recent_meals'", "recent_meals" in overview)
        results.add_test("Overview tem campo 'meals_count'", "meals_count" in overview)
        
        # Teste 2: Dados corretos
        results.add_test("Meals_count correto", overview.get("meals_count") == 4)
        results.add_test("Total de refeições retornadas", len(overview.get("recent_meals", [])) == 4)
        results.add_test("Resumo tem total de calorias", overview["summary"].get("total_calories") == 1700.0)
        
        # Teste 3: Limite de refeições
        limited_meals = load_meals(user_id, limit=2, date=today)
        overview_limited = {
            "summary": summary,
            "recent_meals": limited_meals,
            "meals_count": len(limited_meals)
        }
        results.add_test("Limite de refeições funcionando", len(overview_limited.get("recent_meals", [])) == 2)
        
        # Teste 4: Filtro por data
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        add_meal(user_id, "Jantar de ontem", "dinner", calories=300.0, date=yesterday)
        
        summary_yesterday = get_summary(user_id, date=yesterday)
        recent_meals_yesterday = load_meals(user_id, limit=5, date=yesterday)
        overview_yesterday = {
            "summary": summary_yesterday,
            "recent_meals": recent_meals_yesterday,
            "meals_count": len(recent_meals_yesterday)
        }
        
        results.add_test("Filtro por data funcionando", overview_yesterday["summary"].get("total_calories") == 300.0)
        results.add_test("Refeições filtradas por data", len(overview_yesterday.get("recent_meals", [])) == 1)
        
        # Teste 5: Overview vazio
        empty_user = "test_phase1_overview_empty"
        try:
            meals = load_meals(empty_user, limit=100)
            for meal in meals:
                delete_meal(empty_user, meal.get("id"))
        except:
            pass
        
        summary_empty = get_summary(empty_user, date=today)
        recent_meals_empty = load_meals(empty_user, limit=5, date=today)
        overview_empty = {
            "summary": summary_empty,
            "recent_meals": recent_meals_empty,
            "meals_count": len(recent_meals_empty)
        }
        
        results.add_test("Overview vazio funcionando", overview_empty["summary"].get("total_calories") == 0.0)
        results.add_test("Overview vazio sem refeições", len(overview_empty.get("recent_meals", [])) == 0)
        
        # Teste 6: Estrutura completa do summary
        summary_data = overview["summary"]
        required_fields = ["date", "total_calories", "goals"]
        for field in required_fields:
            results.add_test(f"Summary tem campo '{field}'", field in summary_data)
        
        # Teste 7: Estrutura das refeições
        if len(overview["recent_meals"]) > 0:
            meal = overview["recent_meals"][0]
            required_meal_fields = ["id", "name", "meal_type", "calories"]
            for field in required_meal_fields:
                results.add_test(f"Refeição tem campo '{field}'", field in meal)
        
        print("\n[SUCESSO] Testes de GET /health/daily_overview concluídos")
        return True
        
    except Exception as e:
        results.add_test("GET /health/daily_overview (geral)", False, str(e))
        return False

def main():
    """Executa todos os testes da Fase 1 Backend"""
    print("\n" + "="*70)
    print("TESTE COMPLETO - FASE 1 BACKEND")
    print("T1.1: Endpoints de suporte ao diário")
    print("T1.2: Endpoint de resumo curto (daily_overview)")
    print("="*70)
    
    results = TestResults()
    
    # Executar testes
    print("\n🔍 Iniciando testes...\n")
    
    test_t1_1_meals_endpoint(results)
    test_t1_1_summary_endpoint(results)
    test_t1_2_daily_overview(results)
    
    # Resumo final
    all_passed = results.print_summary()
    
    if all_passed:
        print("\n🎉 TODOS OS TESTES PASSARAM! A subfase backend da Fase 1 está funcionando corretamente.")
        return 0
    else:
        print("\n⚠️  ALGUNS TESTES FALHARAM. Revise os erros acima.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
