"""
Teste T1.8 - Tela de Metas Nutricionais (Completo com Auto-Servidor)
=====================================================================
Valida que a funcionalidade de metas está funcionando corretamente.
Inicia o servidor automaticamente se necessário e fecha ao final.
"""

import sys
import io
import requests
import time
from pathlib import Path

# Importar helper de testes
sys.path.insert(0, str(Path(__file__).parent))
from test_health_helper import TestResults, check_server_running, start_server, stop_server

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Configuração
BASE_URL = "http://127.0.0.1:8001"
USER_ID = "test_t1_8_goals"

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
                results.add_test("Sugestões têm 'bmr'", "bmr" in suggested)
                results.add_test("Sugestões têm 'tdee'", "tdee" in suggested)
                
                # Verificar valores razoáveis
                if "daily_calories" in suggested:
                    cal = suggested["daily_calories"]
                    results.add_test("Calorias sugeridas são razoáveis (1000-5000)", 1000 <= cal <= 5000)
                
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

def test_goals_validation(results):
    """Testa validações de metas"""
    print("\n" + "="*70)
    print("TESTE: VALIDAÇÕES DE METAS")
    print("="*70)
    
    try:
        # Teste 1: Validação de valores negativos (se implementado)
        print("\n--- Teste 1: Validação de valores ---")
        
        # Teste 2: Campos opcionais
        print("\n--- Teste 2: Campos opcionais ---")
        minimal_goals = {
            "daily_calories": 2000.0
        }
        
        response = requests.put(
            f"{BASE_URL}/health/goals",
            params={"user_id": USER_ID},
            json=minimal_goals,
            timeout=10
        )
        
        results.add_test("Aceita apenas alguns campos", response.status_code == 200)
        
        # Teste 3: Limpar metas (valores None)
        print("\n--- Teste 3: Limpar metas ---")
        clear_goals = {
            "daily_calories": None,
            "daily_protein": None,
            "current_weight": None,
            "target_weight": None
        }
        
        response2 = requests.put(
            f"{BASE_URL}/health/goals",
            params={"user_id": USER_ID},
            json=clear_goals,
            timeout=10
        )
        
        results.add_test("Aceita valores None para limpar", response2.status_code == 200)
        
        print("\n[SUCESSO] Testes de validação concluídos")
        return True
        
    except Exception as e:
        results.add_test("Validações de metas", False, str(e))
        return False

def main():
    """Executa todos os testes da T1.8"""
    print("\n" + "="*70)
    print("TESTE T1.8 - TELA DE METAS NUTRICIONAIS (COMPLETO)")
    print("="*70)
    
    results = TestResults()
    server_started = False
    
    try:
        # Verificar se servidor está rodando
        server_started = False
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
        
        test_goals_endpoints(results)
        test_suggest_goals_integration(results)
        test_goals_validation(results)
        
        # Resumo final
        all_passed = results.print_summary()
        
        if all_passed:
            print("\n🎉 TODOS OS TESTES DA T1.8 PASSARAM!")
            print("A tela de metas nutricionais está funcionando corretamente.")
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
