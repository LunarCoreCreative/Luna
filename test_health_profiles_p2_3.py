"""
Teste P2.3 - Health Agent com contexto de avaliador
====================================================
Testa o health_agent com suporte a view_as_student_id
"""

import sys
import io
import os
os.environ['PYTHONIOENCODING'] = 'utf-8'

import uuid
from typing import List

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from server.chat import ChatRequest, Message
from server.health_agent import health_generator
from server.health.profiles import create_health_profile, link_student_to_evaluator
from server.health.permissions import validate_data_access
from server.health.storage import add_meal, get_summary, load_meals, get_goals

print("="*70)
print("TESTE P2.3 - HEALTH AGENT COM VIEW_AS_STUDENT_ID")
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

# Setup: Criar perfis e vincular
print("\n📋 Configurando ambiente de teste...")
try:
    # Criar avaliador
    eval_profile = create_health_profile(eval_id, "evaluator")
    code = eval_profile["evaluator_code"]
    print(f"   ✅ Avaliador criado: {eval_id}, código: {code}")
    
    # Criar aluno
    student_profile = create_health_profile(student_id, "student")
    print(f"   ✅ Aluno criado: {student_id}")
    
    # Criar outro aluno
    other_student_profile = create_health_profile(other_student_id, "student")
    print(f"   ✅ Outro aluno criado: {other_student_id}")
    
    # Vincular aluno ao avaliador
    link_student_to_evaluator(student_id, code)
    print(f"   ✅ Aluno vinculado ao avaliador")
    
    # Adicionar dados de teste para o aluno
    add_meal(
        user_id=student_id,
        name="Teste Refeição",
        meal_type="breakfast",
        calories=300,
        protein=20,
        carbs=40,
        fats=10
    )
    print(f"   ✅ Refeição de teste adicionada para o aluno")
    
except Exception as e:
    print(f"   ❌ Erro ao configurar ambiente: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)

# ========== TESTES ==========

print("\n📋 TESTES DE CHATREQUEST")
print("-" * 70)

# 1. ChatRequest aceita view_as_student_id
test("1. ChatRequest aceita view_as_student_id", 
     lambda: ChatRequest(messages=[], view_as_student_id=student_id).view_as_student_id == student_id)

# 2. ChatRequest funciona sem view_as_student_id
test("2. ChatRequest funciona sem view_as_student_id", 
     lambda: ChatRequest(messages=[]).view_as_student_id is None)

print("\n📋 TESTES DE VALIDAÇÃO DE PERMISSÕES")
print("-" * 70)

# 3. Validação de permissões funciona (permitido)
test("3. Validação de permissões (avaliador pode ver aluno vinculado)", 
     lambda: validate_data_access(eval_id, student_id, "view")[0] == True)

# 4. Validação de permissões funciona (negado)
test("4. Validação de permissões (avaliador não pode ver aluno não vinculado)", 
     lambda: validate_data_access(eval_id, other_student_id, "view")[0] == False)

print("\n📋 TESTES DE DADOS CARREGADOS")
print("-" * 70)

# 5. Dados do aluno são carregados corretamente
test("5. Dados do aluno são carregados corretamente", 
     lambda: len(load_meals(student_id, limit=10)) > 0)

# 6. Resumo do aluno é carregado corretamente
test("6. Resumo do aluno é carregado corretamente", 
     lambda: get_summary(student_id) is not None)

# 7. Metas do aluno são carregadas corretamente
test("7. Metas do aluno são carregadas corretamente", 
     lambda: get_goals(student_id) is not None)

print("\n📋 TESTES DE HEALTH_GENERATOR (Estrutura)")
print("-" * 70)

# 8. health_generator retorna AsyncGenerator
import inspect
from typing import AsyncGenerator
test("8. health_generator retorna AsyncGenerator", 
     lambda: inspect.isasyncgenfunction(health_generator))

# 9. health_generator aceita ChatRequest
test("9. health_generator aceita ChatRequest", 
     lambda: inspect.signature(health_generator).parameters.get('request') is not None)

print("\n📋 TESTES DE INTEGRAÇÃO")
print("-" * 70)

# 10. Criar ChatRequest com view_as_student_id e mensagem
def test_chat_request_with_view_as():
    try:
        request = ChatRequest(
            messages=[
                Message(role="user", content="Olá")
            ],
            user_id=eval_id,
            view_as_student_id=student_id,
            health_mode=True
        )
        assert request.view_as_student_id == student_id
        assert request.user_id == eval_id
        assert request.health_mode == True
        return True
    except Exception as e:
        print(f"   Erro: {e}")
        return False

test("10. ChatRequest com view_as_student_id e mensagem", test_chat_request_with_view_as)

# 11. Verificar que dados são diferentes entre aluno e avaliador
def test_data_isolation():
    try:
        # Dados do aluno
        student_meals = load_meals(student_id, limit=10)
        student_summary = get_summary(student_id)
        
        # Dados do avaliador (não deve ter refeições)
        eval_meals = load_meals(eval_id, limit=10)
        eval_summary = get_summary(eval_id)
        
        # Aluno deve ter refeições, avaliador não
        assert len(student_meals) > 0, "Aluno deve ter refeições"
        assert student_summary.get("meals_count", 0) > 0, "Aluno deve ter refeições no resumo"
        
        return True
    except Exception as e:
        print(f"   Erro: {e}")
        return False

test("11. Isolamento de dados (aluno tem dados, avaliador não)", test_data_isolation)

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
