"""
Teste P2.2 - Endpoints com view_as
==================================
Testa todos os endpoints modificados para suportar o parâmetro view_as
"""

import sys
import io
import os
os.environ['PYTHONIOENCODING'] = 'utf-8'

import requests
import uuid
import time

BASE_URL = "http://127.0.0.1:8001"

print("="*70)
print("TESTE P2.2 - ENDPOINTS COM VIEW_AS")
print("="*70)

# Verificar se servidor está rodando
try:
    resp = requests.get(f"{BASE_URL}/health/daily_overview?user_id=local", timeout=2)
    server_running = resp.status_code in [200, 404, 500]
except:
    server_running = False
    print("⚠️  Servidor não está rodando. Inicie com: uvicorn server.main:app --port 8001")

if not server_running:
    print("Pulando testes de endpoints (servidor não está rodando)")
    sys.exit(0)

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
        return False

# IDs de teste
eval_id = f"test_eval_{uuid.uuid4().hex[:8]}"
student_id = f"test_student_{uuid.uuid4().hex[:8]}"
code = None

# Setup: Criar perfis e vincular
print("\n📋 Configurando ambiente de teste...")
try:
    # Criar avaliador
    resp = requests.post(f"{BASE_URL}/health/profile", json={"type": "evaluator", "user_id": eval_id}, timeout=10)
    assert resp.status_code == 200
    code = resp.json()["profile"]["evaluator_code"]
    print(f"   ✅ Avaliador criado: {eval_id}, código: {code}")
    
    # Criar aluno
    resp = requests.post(f"{BASE_URL}/health/profile", json={"type": "student", "user_id": student_id}, timeout=10)
    assert resp.status_code == 200
    print(f"   ✅ Aluno criado: {student_id}")
    
    # Vincular aluno ao avaliador
    resp = requests.post(f"{BASE_URL}/health/profile/link", json={"code": code, "user_id": student_id}, timeout=10)
    assert resp.status_code == 200
    print(f"   ✅ Aluno vinculado ao avaliador")
    
    # Adicionar alguns dados de teste para o aluno
    resp = requests.post(f"{BASE_URL}/health/meals", json={
        "name": "Teste Refeição",
        "meal_type": "breakfast",
        "calories": 300,
        "user_id": student_id
    }, timeout=10)
    assert resp.status_code == 200
    print(f"   ✅ Refeição de teste adicionada para o aluno")
    
except Exception as e:
    print(f"   ❌ Erro ao configurar ambiente: {e}")
    import traceback
    traceback.print_exc()
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
from datetime import datetime, timedelta
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
other_student_id = f"test_student_other_{uuid.uuid4().hex[:8]}"
try:
    resp = requests.post(f"{BASE_URL}/health/profile", json={"type": "student", "user_id": other_student_id}, timeout=10)
    if resp.status_code == 200:
        test("8. GET /health/meals com view_as (aluno não pode ver outro aluno)", 
             lambda: requests.get(f"{BASE_URL}/health/meals?user_id={student_id}&view_as={other_student_id}", timeout=10).status_code == 403)
except:
    pass

# 9. Teste de acesso negado (aluno tentando ver avaliador)
test("9. GET /health/meals com view_as (aluno não pode ver avaliador)", 
     lambda: requests.get(f"{BASE_URL}/health/meals?user_id={student_id}&view_as={eval_id}", timeout=10).status_code == 403)

# 10. Teste de acesso negado (avaliador tentando ver aluno não vinculado)
test("10. GET /health/meals com view_as (avaliador não pode ver aluno não vinculado)", 
     lambda: requests.get(f"{BASE_URL}/health/meals?user_id={eval_id}&view_as={other_student_id}", timeout=10).status_code == 403)

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

if tests_failed == 0:
    print("\n🎉 TODOS OS TESTES PASSARAM!")
    sys.exit(0)
else:
    print("\n⚠️  Alguns testes falharam")
    sys.exit(1)
