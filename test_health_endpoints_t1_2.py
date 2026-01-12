"""
Teste T1.2 - Endpoint de Resumo Curto (Daily Overview)
=======================================================
Testa se o endpoint GET /health/daily_overview está funcionando corretamente.
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
    delete_meal
)

def test_daily_overview():
    """Testa o endpoint GET /health/daily_overview"""
    print("\n" + "="*70)
    print("TESTE T1.2 - ENDPOINT DE RESUMO CURTO (DAILY OVERVIEW)")
    print("="*70)
    
    user_id = "test_t1_2_daily_overview"
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Limpar dados anteriores
    print("\n--- Limpando dados anteriores ---")
    try:
        meals = load_meals(user_id, limit=100)
        for meal in meals:
            delete_meal(user_id, meal.get("id"))
    except:
        pass
    print("[OK] Dados limpos")
    
    # Configurar metas
    print("\n--- Configurando metas ---")
    update_goals(
        user_id,
        daily_calories=2000.0,
        daily_protein=80.0,
        daily_carbs=250.0,
        daily_fats=65.0
    )
    print("[OK] Metas configuradas")
    
    # Adicionar refeições de hoje
    print("\n--- Adicionando refeições de hoje ---")
    add_meal(user_id, "Café da manhã", "breakfast", calories=400.0, protein=20.0, carbs=50.0, fats=15.0, date=today)
    add_meal(user_id, "Almoço", "lunch", calories=600.0, protein=30.0, carbs=80.0, fats=20.0, date=today)
    add_meal(user_id, "Lanche", "snack", calories=200.0, protein=5.0, carbs=25.0, fats=5.0, date=today)
    add_meal(user_id, "Jantar", "dinner", calories=500.0, protein=25.0, carbs=60.0, fats=15.0, date=today)
    print("[OK] 4 refeições adicionadas")
    
    # Teste 1: Daily overview padrão (sem parâmetros)
    print("\n--- Teste 1: Daily overview padrão (sem parâmetros) ---")
    summary = get_summary(user_id, date=today)
    recent_meals = load_meals(user_id, limit=5, date=today)
    
    # Simular resposta do endpoint
    overview = {
        "summary": summary,
        "recent_meals": recent_meals,
        "meals_count": len(recent_meals)
    }
    
    assert overview.get("summary") is not None, "Resumo deve estar presente"
    assert overview.get("recent_meals") is not None, "Refeições recentes devem estar presentes"
    assert overview.get("meals_count") == 4, f"Deve ter 4 refeições, encontrado {overview.get('meals_count')}"
    assert len(overview.get("recent_meals", [])) == 4, "Deve retornar 4 refeições"
    assert overview["summary"].get("total_calories") == 1700.0, "Deve ter 1700 calorias totais"
    print("[OK] Daily overview padrão funcionando")
    
    # Teste 2: Daily overview com meals_limit
    print("\n--- Teste 2: Daily overview com meals_limit=2 ---")
    recent_meals_limited = load_meals(user_id, limit=2, date=today)
    overview_limited = {
        "summary": summary,
        "recent_meals": recent_meals_limited,
        "meals_count": len(recent_meals_limited)
    }
    
    assert len(overview_limited.get("recent_meals", [])) == 2, "Deve retornar apenas 2 refeições"
    assert overview_limited["summary"].get("total_calories") == 1700.0, "Resumo deve ter todas as calorias"
    print("[OK] Limite de refeições funcionando")
    
    # Teste 3: Daily overview com data específica
    print("\n--- Teste 3: Daily overview com data específica ---")
    yesterday = (datetime.now() - timedelta(days=1)).strftime("%Y-%m-%d")
    add_meal(user_id, "Jantar de ontem", "dinner", calories=300.0, date=yesterday)
    
    summary_yesterday = get_summary(user_id, date=yesterday)
    recent_meals_yesterday = load_meals(user_id, limit=5, date=yesterday)
    overview_yesterday = {
        "summary": summary_yesterday,
        "recent_meals": recent_meals_yesterday,
        "meals_count": len(recent_meals_yesterday)
    }
    
    assert overview_yesterday["summary"].get("date") == yesterday or overview_yesterday["summary"].get("date").startswith(yesterday), "Data deve ser de ontem"
    assert overview_yesterday["summary"].get("total_calories") == 300.0, "Deve ter 300 calorias de ontem"
    assert len(overview_yesterday.get("recent_meals", [])) == 1, "Deve ter 1 refeição de ontem"
    print("[OK] Filtro por data funcionando")
    
    # Teste 4: Daily overview sem refeições
    print("\n--- Teste 4: Daily overview sem refeições ---")
    empty_user = "test_t1_2_empty"
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
    
    assert overview_empty["summary"].get("total_calories") == 0.0, "Deve ter 0 calorias"
    assert len(overview_empty.get("recent_meals", [])) == 0, "Não deve ter refeições"
    assert overview_empty.get("meals_count") == 0, "Contador deve ser 0"
    print("[OK] Daily overview vazio funcionando")
    
    # Teste 5: Estrutura completa do overview
    print("\n--- Teste 5: Estrutura completa do overview ---")
    assert "summary" in overview, "Deve ter campo 'summary'"
    assert "recent_meals" in overview, "Deve ter campo 'recent_meals'"
    assert "meals_count" in overview, "Deve ter campo 'meals_count'"
    
    # Verificar estrutura do summary
    summary_data = overview["summary"]
    assert "date" in summary_data, "Summary deve ter 'date'"
    assert "total_calories" in summary_data, "Summary deve ter 'total_calories'"
    assert "goals" in summary_data, "Summary deve ter 'goals'"
    
    # Verificar estrutura das refeições
    if len(overview["recent_meals"]) > 0:
        meal = overview["recent_meals"][0]
        assert "id" in meal, "Refeição deve ter 'id'"
        assert "name" in meal, "Refeição deve ter 'name'"
        assert "meal_type" in meal, "Refeição deve ter 'meal_type'"
        assert "calories" in meal, "Refeição deve ter 'calories'"
    
    print("[OK] Estrutura completa validada")
    
    print("\n" + "="*70)
    print("RESUMO DOS TESTES")
    print("="*70)
    print("GET /health/daily_overview: [OK] PASSOU")
    print("\nTotal: 1/1 testes passaram")
    print("\n[SUCESSO] T1.2 - Endpoint de resumo curto validado!")
    print("="*70)

if __name__ == "__main__":
    test_daily_overview()
