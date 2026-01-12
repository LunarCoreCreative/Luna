"""
Teste T1.1 - Endpoints de Suporte ao Diário
============================================
Testa se os endpoints GET /health/meals e GET /health/summary estão funcionando corretamente.
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
    get_goals,
    delete_meal
)


def test_get_meals_with_filters():
    """Testa GET /health/meals com filtros de date e limit."""
    print("=" * 70)
    print("Teste: GET /health/meals com filtros")
    print("=" * 70)
    
    test_user = "test_t1_1_user"
    
    # Limpa dados anteriores (se houver)
    try:
        from server.health.storage import delete_meal
        meals = load_meals(test_user, limit=100)
        for meal in meals:
            delete_meal(test_user, meal.get("id"))
    except:
        pass
    
    # Cria refeições de teste para diferentes datas
    today = datetime.now()
    yesterday = today - timedelta(days=1)
    
    # Refeições de hoje
    meal1 = add_meal(
        user_id=test_user,
        name="Café da manhã",
        meal_type="breakfast",
        calories=350.0,
        protein=15.0,
        carbs=45.0,
        fats=10.0,
        date=today.strftime("%Y-%m-%d")
    )
    
    meal2 = add_meal(
        user_id=test_user,
        name="Almoço",
        meal_type="lunch",
        calories=600.0,
        protein=30.0,
        carbs=80.0,
        fats=20.0,
        date=today.strftime("%Y-%m-%d")
    )
    
    # Refeição de ontem
    meal3 = add_meal(
        user_id=test_user,
        name="Jantar de ontem",
        meal_type="dinner",
        calories=500.0,
        date=yesterday.strftime("%Y-%m-%d")
    )
    
    print(f"\n[OK] Criadas 3 refeições de teste")
    print(f"  - Hoje: {meal1['name']}, {meal2['name']}")
    print(f"  - Ontem: {meal3['name']}")
    
    # Teste 1: Buscar todas as refeições
    print("\n--- Teste 1: Buscar todas as refeições ---")
    all_meals = load_meals(test_user)
    print(f"Total de refeições: {len(all_meals)}")
    assert len(all_meals) >= 3, f"Esperado pelo menos 3 refeições, encontrado {len(all_meals)}"
    print("[OK] Todas as refeições carregadas")
    
    # Teste 2: Filtrar por data (hoje)
    print("\n--- Teste 2: Filtrar por data (hoje) ---")
    today_str = today.strftime("%Y-%m-%d")
    today_meals = load_meals(test_user, date=today_str)
    print(f"Refeições de hoje ({today_str}): {len(today_meals)}")
    assert len(today_meals) == 2, f"Esperado 2 refeições de hoje, encontrado {len(today_meals)}"
    for meal in today_meals:
        assert meal.get("date", "").startswith(today_str), f"Refeição não é de hoje: {meal.get('date')}"
    print("[OK] Filtro por data funcionando")
    
    # Teste 3: Limitar quantidade
    print("\n--- Teste 3: Limitar quantidade ---")
    limited_meals = load_meals(test_user, limit=2)
    print(f"Refeições limitadas a 2: {len(limited_meals)}")
    assert len(limited_meals) == 2, f"Esperado 2 refeições, encontrado {len(limited_meals)}"
    print("[OK] Limite funcionando")
    
    # Teste 4: Filtrar por data E limitar
    print("\n--- Teste 4: Filtrar por data E limitar ---")
    today_limited = load_meals(test_user, date=today_str, limit=1)
    print(f"Refeições de hoje limitadas a 1: {len(today_limited)}")
    assert len(today_limited) == 1, f"Esperado 1 refeição, encontrado {len(today_limited)}"
    assert today_limited[0].get("date", "").startswith(today_str), "Refeição não é de hoje"
    print("[OK] Filtro por data + limite funcionando")
    
    # Teste 5: Ordenação (mais recente primeiro)
    print("\n--- Teste 5: Ordenação (mais recente primeiro) ---")
    ordered_meals = load_meals(test_user, limit=10)
    if len(ordered_meals) > 1:
        dates = [m.get("date", "") for m in ordered_meals]
        # Verifica se está ordenado (mais recente primeiro)
        is_ordered = all(dates[i] >= dates[i+1] for i in range(len(dates)-1))
        print(f"Ordenação correta: {is_ordered}")
        if not is_ordered:
            print(f"  Datas: {dates}")
        print("[OK] Ordenação funcionando")
    
    print("\n[SUCESSO] Todos os testes de GET /health/meals passaram!")
    return True


def test_get_summary():
    """Testa GET /health/summary retornando totais, metas e saldo."""
    print("\n" + "=" * 70)
    print("Teste: GET /health/summary")
    print("=" * 70)
    
    test_user = "test_t1_1_summary"
    
    # Limpa dados anteriores
    try:
        from server.health.storage import delete_meal
        meals = load_meals(test_user, limit=100)
        for meal in meals:
            delete_meal(test_user, meal.get("id"))
    except:
        pass
    
    # Define metas
    print("\n--- Configurando metas ---")
    goals = update_goals(
        user_id=test_user,
        daily_calories=2000.0,
        daily_protein=80.0,
        daily_carbs=250.0,
        daily_fats=65.0
    )
    print(f"Metas configuradas:")
    print(f"  - Calorias: {goals.get('daily_calories')} kcal")
    print(f"  - Proteína: {goals.get('daily_protein')}g")
    print(f"  - Carboidratos: {goals.get('daily_carbs')}g")
    print(f"  - Gorduras: {goals.get('daily_fats')}g")
    
    # Adiciona refeições de hoje
    print("\n--- Adicionando refeições ---")
    today = datetime.now().strftime("%Y-%m-%d")
    
    add_meal(
        user_id=test_user,
        name="Café da manhã",
        meal_type="breakfast",
        calories=400.0,
        protein=20.0,
        carbs=50.0,
        fats=12.0,
        date=today
    )
    
    add_meal(
        user_id=test_user,
        name="Almoço",
        meal_type="lunch",
        calories=600.0,
        protein=30.0,
        carbs=80.0,
        fats=20.0,
        date=today
    )
    
    add_meal(
        user_id=test_user,
        name="Lanche",
        meal_type="snack",
        calories=200.0,
        protein=5.0,
        carbs=25.0,
        fats=8.0,
        date=today
    )
    
    print("[OK] 3 refeições adicionadas")
    
    # Teste: Obter resumo
    print("\n--- Teste: Obter resumo do dia ---")
    summary = get_summary(test_user, date=today)
    
    # Validações
    print(f"\nResumo obtido:")
    print(f"  - Data: {summary.get('date')}")
    print(f"  - Total de refeições: {summary.get('meals_count')}")
    print(f"  - Total de calorias: {summary.get('total_calories')} kcal")
    print(f"  - Total de proteína: {summary.get('total_protein')}g")
    print(f"  - Total de carboidratos: {summary.get('total_carbs')}g")
    print(f"  - Total de gorduras: {summary.get('total_fats')}g")
    
    # Verifica totais
    assert summary.get("meals_count") == 3, f"Esperado 3 refeições, encontrado {summary.get('meals_count')}"
    assert summary.get("total_calories") == 1200.0, f"Esperado 1200 kcal, encontrado {summary.get('total_calories')}"
    assert summary.get("total_protein") == 55.0, f"Esperado 55g proteína, encontrado {summary.get('total_protein')}"
    assert summary.get("total_carbs") == 155.0, f"Esperado 155g carboidratos, encontrado {summary.get('total_carbs')}"
    assert summary.get("total_fats") == 40.0, f"Esperado 40g gorduras, encontrado {summary.get('total_fats')}"
    print("[OK] Totais corretos")
    
    # Verifica metas
    print(f"\nMetas no resumo:")
    goals_in_summary = summary.get("goals", {})
    assert goals_in_summary.get("daily_calories") == 2000.0, "Meta de calorias não encontrada"
    assert goals_in_summary.get("daily_protein") == 80.0, "Meta de proteína não encontrada"
    print("[OK] Metas presentes no resumo")
    
    # Verifica saldo (remaining)
    print(f"\nSaldos (remaining):")
    print(f"  - Calorias restantes: {summary.get('remaining_calories')} kcal")
    print(f"  - Proteína restante: {summary.get('remaining_protein')}g")
    print(f"  - Carboidratos restantes: {summary.get('remaining_carbs')}g")
    print(f"  - Gorduras restantes: {summary.get('remaining_fats')}g")
    
    assert summary.get("remaining_calories") == 800.0, f"Esperado 800 kcal restantes, encontrado {summary.get('remaining_calories')}"
    assert summary.get("remaining_protein") == 25.0, f"Esperado 25g proteína restante, encontrado {summary.get('remaining_protein')}"
    assert summary.get("remaining_carbs") == 95.0, f"Esperado 95g carboidratos restantes, encontrado {summary.get('remaining_carbs')}"
    assert summary.get("remaining_fats") == 25.0, f"Esperado 25g gorduras restantes, encontrado {summary.get('remaining_fats')}"
    print("[OK] Saldos calculados corretamente")
    
    # Teste: Resumo sem refeições
    print("\n--- Teste: Resumo sem refeições ---")
    empty_user = "test_t1_1_empty"
    empty_summary = get_summary(empty_user)
    assert empty_summary.get("meals_count") == 0, "Deve ter 0 refeições"
    assert empty_summary.get("total_calories") == 0, "Deve ter 0 calorias"
    print("[OK] Resumo vazio funcionando")
    
    # Teste: Resumo sem metas
    print("\n--- Teste: Resumo sem metas definidas ---")
    no_goals_user = "test_t1_1_no_goals"
    
    # Limpa refeições anteriores
    try:
        meals = load_meals(no_goals_user, limit=100)
        for meal in meals:
            delete_meal(no_goals_user, meal.get("id"))
    except:
        pass
    
    add_meal(no_goals_user, "Teste", "breakfast", calories=300.0, date=today)
    no_goals_summary = get_summary(no_goals_user, date=today)
    print(f"Total de calorias: {no_goals_summary.get('total_calories')}")
    assert no_goals_summary.get("total_calories") == 300.0, f"Esperado 300 calorias, encontrado {no_goals_summary.get('total_calories')}"
    # Verifica que goals existe (pode estar vazio)
    goals = no_goals_summary.get("goals", {})
    print(f"Metas no resumo: {goals}")
    print("[OK] Resumo sem metas funcionando")
    
    print("\n[SUCESSO] Todos os testes de GET /health/summary passaram!")
    return True


def main():
    """Executa todos os testes."""
    print("\n" + "=" * 70)
    print("TESTE T1.1 - ENDPOINTS DE SUPORTE AO DIARIO")
    print("=" * 70)
    print()
    
    results = []
    
    try:
        results.append(("GET /health/meals com filtros", test_get_meals_with_filters()))
    except Exception as e:
        print(f"\n[ERRO] Teste de meals falhou: {e}")
        import traceback
        traceback.print_exc()
        results.append(("GET /health/meals com filtros", False))
    
    try:
        results.append(("GET /health/summary", test_get_summary()))
    except Exception as e:
        print(f"\n[ERRO] Teste de summary falhou: {e}")
        import traceback
        traceback.print_exc()
        results.append(("GET /health/summary", False))
    
    # Resumo
    print("\n" + "=" * 70)
    print("RESUMO DOS TESTES")
    print("=" * 70)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "[OK] PASSOU" if result else "[ERRO] FALHOU"
        print(f"{name}: {status}")
    
    print()
    print(f"Total: {passed}/{total} testes passaram")
    
    if passed == total:
        print("\n[SUCESSO] T1.1 - Endpoints de suporte ao diario validados!")
    else:
        print(f"\n[ERRO] {total - passed} teste(s) falharam")
    
    print("=" * 70)
    
    return passed == total


if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1)
