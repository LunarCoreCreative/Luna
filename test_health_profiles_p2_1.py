"""
Teste P2.1 - Sistema de Permissões
===================================
Testa todas as funções do módulo de permissões
"""

import sys
import io
import uuid

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

from server.health.profiles import create_health_profile, link_student_to_evaluator, unlink_student
from server.health.permissions import (
    can_view_student_data,
    get_accessible_students,
    validate_data_access,
    is_evaluator,
    is_student
)

print("="*70)
print("TESTE P2.1 - SISTEMA DE PERMISSÕES")
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
other_eval_id = f"test_eval_other_{uuid.uuid4().hex[:8]}"

# Setup: Criar perfis
print("\n📋 Configurando ambiente de teste...")
try:
    eval_profile = create_health_profile(eval_id, "evaluator")
    student_profile = create_health_profile(student_id, "student")
    other_student_profile = create_health_profile(other_student_id, "student")
    other_eval_profile = create_health_profile(other_eval_id, "evaluator")
    print(f"   ✅ Avaliador criado: {eval_id}")
    print(f"   ✅ Aluno criado: {student_id}")
    print(f"   ✅ Outro aluno criado: {other_student_id}")
    print(f"   ✅ Outro avaliador criado: {other_eval_id}")
except Exception as e:
    print(f"   ❌ Erro ao criar perfis: {e}")
    sys.exit(1)

# Vincular aluno ao avaliador
print("\n📋 Vinculando aluno ao avaliador...")
try:
    link_student_to_evaluator(student_id, eval_profile["evaluator_code"])
    print(f"   ✅ Aluno {student_id} vinculado ao avaliador {eval_id}")
except Exception as e:
    print(f"   ❌ Erro ao vincular: {e}")
    sys.exit(1)

# ========== TESTES ==========

print("\n📋 TESTES DE PERMISSÕES")
print("-" * 70)

# 1. is_evaluator
test("1. is_evaluator (avaliador)", lambda: is_evaluator(eval_id) == True)
test("2. is_evaluator (aluno)", lambda: is_evaluator(student_id) == False)
test("3. is_evaluator (inexistente)", lambda: is_evaluator("nonexistent") == False)

# 4. is_student
test("4. is_student (aluno)", lambda: is_student(student_id) == True)
test("5. is_student (avaliador)", lambda: is_student(eval_id) == False)
test("6. is_student (inexistente)", lambda: is_student("nonexistent") == False)

# 7. can_view_student_data (permitido)
test("7. can_view_student_data (avaliador pode ver aluno vinculado)", 
     lambda: can_view_student_data(eval_id, student_id) == True)

# 8. can_view_student_data (negado - aluno não vinculado)
test("8. can_view_student_data (avaliador não pode ver aluno não vinculado)", 
     lambda: can_view_student_data(eval_id, other_student_id) == False)

# 9. can_view_student_data (negado - outro avaliador)
test("9. can_view_student_data (outro avaliador não pode ver aluno)", 
     lambda: can_view_student_data(other_eval_id, student_id) == False)

# 10. get_accessible_students
test("10. get_accessible_students (avaliador tem 1 aluno)", 
     lambda: len(get_accessible_students(eval_id)) == 1 and student_id in get_accessible_students(eval_id))

# 11. get_accessible_students (outro avaliador não tem alunos)
test("11. get_accessible_students (outro avaliador não tem alunos)", 
     lambda: len(get_accessible_students(other_eval_id)) == 0)

# 12. validate_data_access (próprios dados)
test("12. validate_data_access (usuário acessando próprios dados)", 
     lambda: validate_data_access(student_id, student_id, "view")[0] == True)

# 13. validate_data_access (avaliador pode ver aluno vinculado)
test("13. validate_data_access (avaliador pode ver aluno vinculado)", 
     lambda: validate_data_access(eval_id, student_id, "view")[0] == True)

# 14. validate_data_access (avaliador não pode ver aluno não vinculado)
test("14. validate_data_access (avaliador não pode ver aluno não vinculado)", 
     lambda: validate_data_access(eval_id, other_student_id, "view")[0] == False)

# 15. validate_data_access (aluno não pode ver avaliador)
test("15. validate_data_access (aluno não pode ver avaliador)", 
     lambda: validate_data_access(student_id, eval_id, "view")[0] == False)

# 16. validate_data_access (aluno não pode ver outro aluno)
test("16. validate_data_access (aluno não pode ver outro aluno)", 
     lambda: validate_data_access(student_id, other_student_id, "view")[0] == False)

# 17. validate_data_access (avaliador não pode ver outro avaliador)
test("17. validate_data_access (avaliador não pode ver outro avaliador)", 
     lambda: validate_data_access(eval_id, other_eval_id, "view")[0] == False)

# 18. validate_data_access (usuário inexistente)
test("18. validate_data_access (usuário inexistente)", 
     lambda: validate_data_access("nonexistent", student_id, "view")[0] == False)

# 19. Teste após desvincular
print("\n📋 Testando após desvincular...")
try:
    unlink_student(student_id, eval_id)
    test("19. can_view_student_data (após desvincular)", 
         lambda: can_view_student_data(eval_id, student_id) == False)
    test("20. get_accessible_students (após desvincular)", 
         lambda: len(get_accessible_students(eval_id)) == 0)
except Exception as e:
    print(f"   ⚠️  Erro ao desvincular: {e}")

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
