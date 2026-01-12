"""
Teste Completo - Fase 1: Endpoints REST de Perfis
==================================================
Testa todos os endpoints REST da Fase 1
"""

import sys
import os
os.environ['PYTHONIOENCODING'] = 'utf-8'

import requests
import uuid

BASE_URL = "http://127.0.0.1:8001"

print("="*70)
print("TESTE COMPLETO - ENDPOINTS REST - FASE 1")
print("="*70)
print("Testando todos os 7 endpoints de perfis")
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
        return False

# IDs de teste
eval_id = f"test_eval_{uuid.uuid4().hex[:8]}"
student_id = f"test_student_{uuid.uuid4().hex[:8]}"
code = None

# ========== TESTES PRINCIPAIS ==========

print("\n📋 TESTES PRINCIPAIS")
print("-" * 70)

# 1. GET /health/profile (não existe)
test("1. GET /health/profile (não existe)", 
     lambda: requests.get(f"{BASE_URL}/health/profile?user_id=nonexistent_{uuid.uuid4().hex[:8]}", timeout=10).json()["profile"] is None)

# 2. POST /health/profile (criar avaliador)
def create_evaluator():
    global code
    resp = requests.post(f"{BASE_URL}/health/profile", json={"type": "evaluator", "user_id": eval_id}, timeout=10)
    if resp.status_code == 200:
        code = resp.json()["profile"]["evaluator_code"]
        print(f"   Código gerado: {code}")
        return True
    return False

test("2. POST /health/profile (criar avaliador)", create_evaluator)

# 3. GET /health/profile (existe)
test("3. GET /health/profile (existe)", 
     lambda: requests.get(f"{BASE_URL}/health/profile?user_id={eval_id}", timeout=10).json()["profile"]["type"] == "evaluator")

# 4. GET /health/profile/code
test("4. GET /health/profile/code", 
     lambda: requests.get(f"{BASE_URL}/health/profile/code?user_id={eval_id}", timeout=10).json()["code"] == code)

# 5. POST /health/profile (criar aluno)
test("5. POST /health/profile (criar aluno)", 
     lambda: requests.post(f"{BASE_URL}/health/profile", json={"type": "student", "user_id": student_id}, timeout=10).status_code == 200)

# 6. POST /health/profile/link
test("6. POST /health/profile/link", 
     lambda: requests.post(f"{BASE_URL}/health/profile/link", json={"code": code, "user_id": student_id}, timeout=10).status_code == 200)

# 7. GET /health/profile/students
test("7. GET /health/profile/students", 
     lambda: student_id in requests.get(f"{BASE_URL}/health/profile/students?user_id={eval_id}", timeout=10).json()["students"])

# 8. GET /health/profile/evaluator
test("8. GET /health/profile/evaluator", 
     lambda: requests.get(f"{BASE_URL}/health/profile/evaluator?user_id={student_id}", timeout=10).json()["evaluator"]["uid"] == eval_id)

# 9. DELETE /health/profile/link
test("9. DELETE /health/profile/link", 
     lambda: requests.delete(f"{BASE_URL}/health/profile/link?user_id={student_id}&evaluator_id={eval_id}", timeout=10).status_code == 200)

# 10. Verificar desvinculação
test("10. Verificar desvinculação", 
     lambda: requests.get(f"{BASE_URL}/health/profile/evaluator?user_id={student_id}", timeout=10).json()["evaluator"] is None)

# ========== TESTES DE ERRO ==========

print("\n📋 TESTES DE ERRO")
print("-" * 70)

# 11. POST /health/profile (tipo inválido)
test("11. POST /health/profile (tipo inválido)", 
     lambda: requests.post(f"{BASE_URL}/health/profile", json={"type": "invalid"}, timeout=10).status_code == 400)

# 12. GET /health/profile/code (não-avaliador)
test("12. GET /health/profile/code (não-avaliador)", 
     lambda: requests.get(f"{BASE_URL}/health/profile/code?user_id={student_id}", timeout=10).status_code == 403)

# 13. POST /health/profile/link (código inválido)
test("13. POST /health/profile/link (código inválido)", 
     lambda: requests.post(f"{BASE_URL}/health/profile/link", json={"code": "EVAL-INVALID", "user_id": student_id}, timeout=10).status_code == 400)

# 14. GET /health/profile/students (não-avaliador)
test("14. GET /health/profile/students (não-avaliador)", 
     lambda: requests.get(f"{BASE_URL}/health/profile/students?user_id={student_id}", timeout=10).status_code == 403)

# 15. GET /health/profile/evaluator (não-aluno)
test("15. GET /health/profile/evaluator (não-aluno)", 
     lambda: requests.get(f"{BASE_URL}/health/profile/evaluator?user_id={eval_id}", timeout=10).status_code == 403)

# ========== TESTE DE FLUXO COMPLETO ==========

print("\n📋 TESTE DE FLUXO COMPLETO")
print("-" * 70)

def test_full_workflow():
    try:
        w_eval_id = f"test_workflow_eval_{uuid.uuid4().hex[:8]}"
        w_student_id = f"test_workflow_student_{uuid.uuid4().hex[:8]}"
        
        # 1. Criar avaliador
        resp = requests.post(f"{BASE_URL}/health/profile", json={"type": "evaluator", "user_id": w_eval_id}, timeout=10)
        if resp.status_code != 200:
            return False
        w_code = resp.json()["profile"]["evaluator_code"]
        
        # 2. Criar aluno
        resp = requests.post(f"{BASE_URL}/health/profile", json={"type": "student", "user_id": w_student_id}, timeout=10)
        if resp.status_code != 200:
            return False
        
        # 3. Vincular
        resp = requests.post(f"{BASE_URL}/health/profile/link", json={"code": w_code, "user_id": w_student_id}, timeout=10)
        if resp.status_code != 200:
            return False
        
        # 4. Verificar vinculação (lado aluno)
        resp = requests.get(f"{BASE_URL}/health/profile/evaluator?user_id={w_student_id}", timeout=10)
        if resp.json()["evaluator"]["uid"] != w_eval_id:
            return False
        
        # 5. Verificar vinculação (lado avaliador)
        resp = requests.get(f"{BASE_URL}/health/profile/students?user_id={w_eval_id}", timeout=10)
        if w_student_id not in resp.json()["students"]:
            return False
        
        # 6. Desvincular
        resp = requests.delete(f"{BASE_URL}/health/profile/link?user_id={w_student_id}&evaluator_id={w_eval_id}", timeout=10)
        if resp.status_code != 200:
            return False
        
        # 7. Verificar desvinculação
        resp = requests.get(f"{BASE_URL}/health/profile/evaluator?user_id={w_student_id}", timeout=10)
        if resp.json()["evaluator"] is not None:
            return False
        
        return True
    except Exception as e:
        print(f"   Erro: {e}")
        return False

test("16. Fluxo completo (criar, vincular, desvincular)", test_full_workflow)

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
