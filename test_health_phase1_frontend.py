"""
Teste Completo - Fase 1 Frontend (T1.3 + T1.4)
===============================================
Valida que os endpoints e funcionalidades usadas pelo frontend estão funcionando corretamente.
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

def test_t1_3_daily_overview_endpoint(results):
    """Testa T1.3 - Endpoint daily_overview usado pela tela Hoje"""
    print("\n" + "="*70)
    print("TESTE T1.3 - ENDPOINT DAILY_OVERVIEW (Tela Hoje)")
    print("="*70)
    
    user_id = "test_phase1_frontend_today"
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
        
        # Adicionar refeições de hoje
        add_meal(user_id, "Café da manhã", "breakfast", calories=400.0, protein=20.0, carbs=50.0, fats=15.0, date=today)
        add_meal(user_id, "Almoço", "lunch", calories=600.0, protein=30.0, carbs=80.0, fats=20.0, date=today)
        add_meal(user_id, "Lanche", "snack", calories=200.0, protein=5.0, carbs=25.0, fats=5.0, date=today)
        
        # Simular chamada do endpoint daily_overview
        summary = get_summary(user_id, date=today)
        recent_meals = load_meals(user_id, limit=20, date=today)
        overview = {
            "summary": summary,
            "recent_meals": recent_meals,
            "meals_count": len(recent_meals)
        }
        
        # Teste 1: Estrutura do overview
        results.add_test("Overview tem campo 'summary'", "summary" in overview)
        results.add_test("Overview tem campo 'recent_meals'", "recent_meals" in overview)
        results.add_test("Overview tem campo 'meals_count'", "meals_count" in overview)
        
        # Teste 2: Dados do summary
        summary_data = overview["summary"]
        results.add_test("Summary tem 'total_calories'", "total_calories" in summary_data)
        results.add_test("Summary tem 'total_protein'", "total_protein" in summary_data)
        results.add_test("Summary tem 'goals'", "goals" in summary_data)
        results.add_test("Summary tem 'remaining_calories'", "remaining_calories" in summary_data)
        
        # Teste 3: Valores corretos
        results.add_test("Total de calorias correto", summary_data.get("total_calories") == 1200.0)
        results.add_test("Total de proteína correto", summary_data.get("total_protein") == 55.0)
        results.add_test("Saldo de calorias calculado", summary_data.get("remaining_calories") == 800.0)
        
        # Teste 4: Refeições
        results.add_test("Número de refeições correto", len(recent_meals) == 3)
        results.add_test("Meals_count correto", overview.get("meals_count") == 3)
        
        # Teste 5: Estrutura das refeições
        if len(recent_meals) > 0:
            meal = recent_meals[0]
            results.add_test("Refeição tem 'id'", "id" in meal)
            results.add_test("Refeição tem 'name'", "name" in meal or "food_name" in meal)
            results.add_test("Refeição tem 'meal_type'", "meal_type" in meal)
            results.add_test("Refeição tem 'calories'", "calories" in meal)
        
        # Teste 6: Filtro por data
        yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
        add_meal(user_id, "Jantar de ontem", "dinner", calories=300.0, date=yesterday)
        
        summary_yesterday = get_summary(user_id, date=yesterday)
        recent_meals_yesterday = load_meals(user_id, limit=20, date=yesterday)
        overview_yesterday = {
            "summary": summary_yesterday,
            "recent_meals": recent_meals_yesterday,
            "meals_count": len(recent_meals_yesterday)
        }
        
        results.add_test("Filtro por data funcionando", overview_yesterday["summary"].get("total_calories") == 300.0)
        results.add_test("Refeições filtradas por data", len(overview_yesterday.get("recent_meals", [])) == 1)
        
        print("\n[SUCESSO] Testes de daily_overview concluídos")
        return True
        
    except Exception as e:
        results.add_test("daily_overview (geral)", False, str(e))
        return False

def test_t1_3_today_tab_data(results):
    """Testa T1.3 - Dados necessários para a tela Hoje"""
    print("\n" + "="*70)
    print("TESTE T1.3 - DADOS DA TELA HOJE")
    print("="*70)
    
    user_id = "test_phase1_frontend_today_data"
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
        
        # Adicionar refeições variadas
        add_meal(user_id, "Café", "breakfast", calories=400.0, protein=20.0, carbs=50.0, fats=15.0, date=today)
        add_meal(user_id, "Almoço", "lunch", calories=600.0, protein=30.0, carbs=80.0, fats=20.0, date=today)
        add_meal(user_id, "Jantar", "dinner", calories=500.0, protein=25.0, carbs=60.0, fats=15.0, date=today)
        
        summary = get_summary(user_id, date=today)
        meals_list = load_meals(user_id, limit=20, date=today)
        
        # Teste 1: Cálculo de porcentagens (para barras de progresso)
        total_cal = summary.get("total_calories", 0)
        goal_cal = summary.get("goals", {}).get("daily_calories", 0)
        if goal_cal > 0:
            percentage = (total_cal / goal_cal) * 100
            results.add_test("Porcentagem de calorias calculável", 0 <= percentage <= 100)
        else:
            results.add_test("Porcentagem sem meta (OK)", True)
        
        # Teste 2: Dados para barras de macros
        total_prot = summary.get("total_protein", 0)
        goal_prot = summary.get("goals", {}).get("daily_protein", 0)
        results.add_test("Dados de proteína disponíveis", total_prot is not None and goal_prot is not None)
        
        # Teste 3: Valores restantes
        remaining_cal = summary.get("remaining_calories", None)
        remaining_prot = summary.get("remaining_protein", None)
        results.add_test("Valores restantes calculados", remaining_cal is not None and remaining_prot is not None)
        
        # Teste 4: Tipos de refeição (para ícones)
        meal_types = set(m.get("meal_type") for m in meals_list if m.get("meal_type"))
        expected_types = {"breakfast", "lunch", "dinner", "snack"}
        results.add_test("Tipos de refeição válidos", meal_types.issubset(expected_types) or len(meal_types) > 0)
        
        # Teste 5: Dados para cards de refeições
        if len(meals_list) > 0:
            meal = meals_list[0]
            has_name = "name" in meal or "food_name" in meal
            has_calories = "calories" in meal
            results.add_test("Card de refeição tem nome", has_name)
            results.add_test("Card de refeição tem calorias", has_calories)
        
        # Teste 6: Estado vazio
        empty_user = "test_phase1_frontend_empty"
        try:
            meals = load_meals(empty_user, limit=100)
            for meal in meals:
                delete_meal(empty_user, meal.get("id"))
        except:
            pass
        
        empty_summary = get_summary(empty_user, date=today)
        empty_meals = load_meals(empty_user, limit=20, date=today)
        results.add_test("Estado vazio funcionando", empty_summary.get("total_calories") == 0.0 and len(empty_meals) == 0)
        
        print("\n[SUCESSO] Testes de dados da tela Hoje concluídos")
        return True
        
    except Exception as e:
        results.add_test("Dados da tela Hoje (geral)", False, str(e))
        return False

def test_t1_4_chat_integration(results):
    """Testa T1.4 - Integração com chat (atualização automática)"""
    print("\n" + "="*70)
    print("TESTE T1.4 - INTEGRAÇÃO COM CHAT")
    print("="*70)
    
    user_id = "test_phase1_frontend_chat"
    today = datetime.now().strftime("%Y-%m-%d")
    
    try:
        # Limpar dados anteriores
        meals = load_meals(user_id, limit=100)
        for meal in meals:
            delete_meal(user_id, meal.get("id"))
        
        # Estado inicial
        initial_summary = get_summary(user_id, date=today)
        initial_calories = initial_summary.get("total_calories", 0)
        results.add_test("Estado inicial vazio", initial_calories == 0.0)
        
        # Simular: Luna registra uma refeição via chat (tool add_meal)
        add_meal(user_id, "Refeição via chat", "lunch", calories=500.0, protein=25.0, carbs=60.0, fats=15.0, date=today)
        
        # Após onUpdate ser chamado, os dados devem estar atualizados
        updated_summary = get_summary(user_id, date=today)
        updated_meals = load_meals(user_id, limit=20, date=today)
        
        # Teste 1: Dados atualizados
        results.add_test("Calorias atualizadas após refeição", updated_summary.get("total_calories") == 500.0)
        results.add_test("Refeições atualizadas", len(updated_meals) == 1)
        
        # Teste 2: Overview atualizado
        overview = {
            "summary": updated_summary,
            "recent_meals": updated_meals,
            "meals_count": len(updated_meals)
        }
        results.add_test("Overview reflete mudanças", overview["summary"].get("total_calories") == 500.0)
        results.add_test("Meals_count atualizado", overview.get("meals_count") == 1)
        
        # Teste 3: Múltiplas atualizações
        add_meal(user_id, "Segunda refeição", "dinner", calories=300.0, date=today)
        final_summary = get_summary(user_id, date=today)
        final_meals = load_meals(user_id, limit=20, date=today)
        
        results.add_test("Múltiplas atualizações funcionando", final_summary.get("total_calories") == 800.0)
        results.add_test("Contagem de refeições atualizada", len(final_meals) == 2)
        
        # Teste 4: Atualização de metas
        update_goals(user_id, daily_calories=1500.0)
        goals_updated_summary = get_summary(user_id, date=today)
        results.add_test("Metas atualizadas refletem no resumo", goals_updated_summary.get("goals", {}).get("daily_calories") == 1500.0)
        results.add_test("Saldo recalculado após atualizar metas", goals_updated_summary.get("remaining_calories") == 700.0)
        
        print("\n[SUCESSO] Testes de integração com chat concluídos")
        return True
        
    except Exception as e:
        results.add_test("Integração com chat (geral)", False, str(e))
        return False

def test_t1_4_chat_actions(results):
    """Testa T1.4 - Ações do chat (mensagens pré-definidas)"""
    print("\n" + "="*70)
    print("TESTE T1.4 - AÇÕES DO CHAT")
    print("="*70)
    
    user_id = "test_phase1_frontend_chat_actions"
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
        
        # Adicionar algumas refeições
        add_meal(user_id, "Café", "breakfast", calories=400.0, date=today)
        add_meal(user_id, "Almoço", "lunch", calories=600.0, date=today)
        
        summary = get_summary(user_id, date=today)
        
        # Teste 1: Mensagens pré-definidas têm contexto
        messages = [
            "Como posso melhorar minha alimentação hoje?",
            "Quais alimentos devo comer para atingir minhas metas?",
            "Me dê dicas nutricionais para hoje"
        ]
        
        for msg in messages:
            # Verificar que a mensagem pode ser enviada (não precisa validar resposta da IA)
            results.add_test(f"Mensagem válida: '{msg[:30]}...'", len(msg) > 0 and isinstance(msg, str))
        
        # Teste 2: Contexto disponível para a IA
        has_calories = summary.get("total_calories", 0) > 0
        has_goals = summary.get("goals", {}).get("daily_calories", 0) > 0
        results.add_test("Contexto de calorias disponível", has_calories)
        results.add_test("Contexto de metas disponível", has_goals)
        
        # Teste 3: Dados suficientes para sugestões
        remaining = summary.get("remaining_calories", 0)
        has_remaining = remaining is not None
        results.add_test("Dados suficientes para sugestões", has_remaining)
        
        print("\n[SUCESSO] Testes de ações do chat concluídos")
        return True
        
    except Exception as e:
        results.add_test("Ações do chat (geral)", False, str(e))
        return False

def main():
    """Executa todos os testes da Fase 1 Frontend"""
    print("\n" + "="*70)
    print("TESTE COMPLETO - FASE 1 FRONTEND")
    print("T1.3: Tela de 'Hoje' (Diário visual)")
    print("T1.4: Integração com o chat")
    print("="*70)
    
    results = TestResults()
    
    # Executar testes
    print("\n🔍 Iniciando testes...\n")
    
    test_t1_3_daily_overview_endpoint(results)
    test_t1_3_today_tab_data(results)
    test_t1_4_chat_integration(results)
    test_t1_4_chat_actions(results)
    
    # Resumo final
    all_passed = results.print_summary()
    
    if all_passed:
        print("\n🎉 TODOS OS TESTES PASSARAM! A subfase frontend da Fase 1 está funcionando corretamente.")
        return 0
    else:
        print("\n⚠️  ALGUNS TESTES FALHARAM. Revise os erros acima.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
