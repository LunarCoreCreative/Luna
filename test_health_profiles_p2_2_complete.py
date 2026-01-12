"""
Teste P2.2 - Endpoints com view_as (com servidor automático)
=============================================================
Testa todos os endpoints modificados para suportar o parâmetro view_as
"""

import sys
import io
import os
os.environ['PYTHONIOENCODING'] = 'utf-8'

import requests
import uuid
import time
from datetime import datetime, timedelta

# Importar helper de testes
from test_health_helper import TestResults, check_server_running, start_server, stop_server, BASE_URL

print("="*70)
print("TESTE P2.2 - ENDPOINTS COM VIEW_AS")
print("="*70)

tests_passed = 0
tests_failed = 0
errors = []

def test(name, func):
    global tests_passed, tests_failed, errors
    try:
        result = func()
        if result:
            print(f"✅ {name}")
            tests_passed += 1
            return True
        else:
            print(f"❌ {name}")
            tests_failed += 1
            errors.append(name)
            return False
    except Exception as e:
        print(f"❌ {name}: {e}")
        tests_failed += 1
        errors.append(f"{name}: {e}")
        import traceback
        traceback.print_exc()
        return False

# IDs de teste
eval_id = f"test_eval_{uuid.uuid4().hex[:8]}"
student_id = f"test_student_{uuid.uuid4().hex[:8]}"
other_student_id = f"test_student_other_{uuid.uuid4().hex[:8]}"
code = None

# Verificar se servidor está rodando
server_started_by_us = False
try:
    resp = requests.get(f"{BASE_URL}/health/daily_overview?user_id=local", timeout=2)
    if resp.status_code in [200, 404, 500]:
        print("\n✅ Servidor já está rodando")
    else:
        raise Exception("Servidor não respondeu corretamente")
except:
    print("\n⚠️  Servidor não está respondendo. Tentando iniciar...")
    if start_server():
        print("Aguardando servidor ficar pronto...")
        time.sleep(5)
        server_started_by_us = True
        try:
            resp = requests.get(f"{BASE_URL}/health/daily_overview?user_id=local", timeout=2)
            if resp.status_code not in [200, 404, 500]:
                raise Exception("Servidor não respondeu corretamente")
            print("✅ Servidor iniciado com sucesso")
        except:
            print("❌ Servidor não iniciou corretamente")
            print("   Por favor, inicie manualmente: uvicorn server.main:app --port 8001")
            sys.exit(1)
    else:
        print("❌ Falha ao iniciar servidor automaticamente")
        print("   Por favor, inicie manualmente: uvicorn server.main:app --port 8001")
        sys.exit(1)

# Setup: Criar perfis e vincular
print("\n📋 Configurando ambiente de teste...")
try:
    # Criar avaliador
    resp = requests.post(f"{BASE_URL}/health/profile", json={"type": "evaluator", "user_id": eval_id}, timeout=10)
    assert resp.status_code == 200, f"Status {resp.status_code}"
    code = resp.json()["profile"]["evaluator_code"]
    print(f"   ✅ Avaliador criado: {eval_id}, código: {code}")
    
    # Criar aluno
    resp = requests.post(f"{BASE_URL}/health/profile", json={"type": "student", "user_id": student_id}, timeout=10)
    assert resp.status_code == 200, f"Status {resp.status_code}"
    print(f"   ✅ Aluno criado: {student_id}")
    
    # Criar outro aluno
    resp = requests.post(f"{BASE_URL}/health/profile", json={"type": "student", "user_id": other_student_id}, timeout=10)
    assert resp.status_code == 200, f"Status {resp.status_code}"
    print(f"   ✅ Outro aluno criado: {other_student_id}")
    
    # Vincular aluno ao avaliador
    resp = requests.post(f"{BASE_URL}/health/profile/link", json={"code": code, "user_id": student_id}, timeout=10)
    assert resp.status_code == 200, f"Status {resp.status_code}"
    print(f"   ✅ Aluno vinculado ao avaliador")
    
    # Adicionar alguns dados de teste para o aluno
    resp = requests.post(f"{BASE_URL}/health/meals", json={
        "name": "Teste Refeição",
        "meal_type": "breakfast",
        "calories": 300,
        "user_id": student_id
    }, timeout=10)
    assert resp.status_code == 200, f"Status {resp.status_code}"
    print(f"   ✅ Refeição de teste adicionada para o aluno")
    
    # Adicionar peso de teste
    resp = requests.post(f"{BASE_URL}/health/weights", json={
        "weight": 70.5,
        "user_id": student_id
    }, timeout=10)
    assert resp.status_code == 200, f"Status {resp.status_code}"
    print(f"   ✅ Peso de teste adicionado para o aluno")
    
except Exception as e:
    print(f"   ❌ Erro ao configurar ambiente: {e}")
    import traceback
    traceback.print_exc()
    stop_server()
    sys.exit(1)

# ========== TESTES ==========

print("\n📋 TESTES DE ENDPOINTS COM VIEW_AS")
print("-" * 70)

# 1. GET /health/meals com view_as (permitido)
test("1. GET /health/meals com view_as (avaliador pode ver aluno)", 
     lambda: requests.get(f"{BASE_URL}/health/meals?user_id={eval_id}&view_as={student_id}", timeout=10).status_code == 200)

# 2. GET /health/meals sem view_as (comportamento normal)
test("2. GET /health/meals sem view_as (comportamento normal)", 
     lambda: requests.get(f"{BASE_URL}/health/meals?user_id={student_id}", timeout=10).status_code == 200)

# 3. GET /health/goals com view_as (permitido)
test("3. GET /health/goals com view_as (avaliador pode ver aluno)", 
     lambda: requests.get(f"{BASE_URL}/health/goals?user_id={eval_id}&view_as={student_id}", timeout=10).status_code == 200)

# 4. GET /health/summary com view_as (permitido)
test("4. GET /health/summary com view_as (avaliador pode ver aluno)", 
     lambda: requests.get(f"{BASE_URL}/health/summary?user_id={eval_id}&view_as={student_id}", timeout=10).status_code == 200)

# 5. GET /health/history com view_as (permitido)
today = datetime.now().strftime("%Y-%m-%d")
week_ago = (datetime.now() - timedelta(days=7)).strftime("%Y-%m-%d")
test("5. GET /health/history com view_as (avaliador pode ver aluno)", 
     lambda: requests.get(f"{BASE_URL}/health/history?user_id={eval_id}&view_as={student_id}&start={week_ago}&end={today}", timeout=10).status_code == 200)

# 6. GET /health/weights com view_as (permitido)
test("6. GET /health/weights com view_as (avaliador pode ver aluno)", 
     lambda: requests.get(f"{BASE_URL}/health/weights?user_id={eval_id}&view_as={student_id}", timeout=10).status_code == 200)

# 7. GET /health/daily_overview com view_as (permitido)
test("7. GET /health/daily_overview com view_as (avaliador pode ver aluno)", 
     lambda: requests.get(f"{BASE_URL}/health/daily_overview?user_id={eval_id}&view_as={student_id}", timeout=10).status_code == 200)

# 8. Teste de acesso negado (aluno tentando ver outro aluno)
test("8. GET /health/meals com view_as (aluno não pode ver outro aluno)", 
     lambda: requests.get(f"{BASE_URL}/health/meals?user_id={student_id}&view_as={other_student_id}", timeout=10).status_code == 403)

# 9. Teste de acesso negado (aluno tentando ver avaliador)
test("9. GET /health/meals com view_as (aluno não pode ver avaliador)", 
     lambda: requests.get(f"{BASE_URL}/health/meals?user_id={student_id}&view_as={eval_id}", timeout=10).status_code == 403)

# 10. Teste de acesso negado (avaliador tentando ver aluno não vinculado)
test("10. GET /health/meals com view_as (avaliador não pode ver aluno não vinculado)", 
     lambda: requests.get(f"{BASE_URL}/health/meals?user_id={eval_id}&view_as={other_student_id}", timeout=10).status_code == 403)

# 11. Verificar que dados retornados são do aluno correto
print("\n📋 TESTES DE VALIDAÇÃO DE DADOS")
print("-" * 70)

def test_data_validation():
    """Verifica que os dados retornados são realmente do aluno quando view_as é usado"""
    try:
        # Buscar refeições do aluno diretamente
        resp1 = requests.get(f"{BASE_URL}/health/meals?user_id={student_id}", timeout=10)
        assert resp1.status_code == 200
        direct_meals = resp1.json()["meals"]
        
        # Buscar refeições do aluno via view_as
        resp2 = requests.get(f"{BASE_URL}/health/meals?user_id={eval_id}&view_as={student_id}", timeout=10)
        assert resp2.status_code == 200
        view_as_meals = resp2.json()["meals"]
        
        # Verificar que são as mesmas refeições
        assert len(direct_meals) == len(view_as_meals), "Número de refeições deve ser o mesmo"
        if len(direct_meals) > 0:
            assert direct_meals[0]["id"] == view_as_meals[0]["id"], "IDs das refeições devem ser os mesmos"
        
        return True
    except Exception as e:
        print(f"   Erro: {e}")
        return False

test("11. Dados retornados via view_as são do aluno correto", test_data_validation)

# ========== RESUMO ==========

print("\n" + "="*70)
print("RESUMO FINAL DOS TESTES")
print("="*70)
print(f"Total de testes: {tests_passed + tests_failed}")
print(f"✅ Passou: {tests_passed}")
print(f"❌ Falhou: {tests_failed}")
if tests_passed + tests_failed > 0:
    print(f"Taxa de sucesso: {(tests_passed/(tests_passed + tests_failed)*100):.1f}%")
if errors:
    print("\n❌ Testes que falharam:")
    for error in errors:
        print(f"  - {error}")
print("="*70)

# Parar servidor apenas se foi iniciado por nós
if server_started_by_us:
    stop_server()

if tests_failed == 0:
    print("\n🎉 TODOS OS TESTES PASSARAM!")
    sys.exit(0)
else:
    print("\n⚠️  Alguns testes falharam")
    sys.exit(1)
