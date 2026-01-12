"""
Teste P1.1 e P1.2 - Sistema de Perfis de Saúde
==============================================
Valida que o sistema de perfis e storage está funcionando corretamente.
"""

import sys
import io
from pathlib import Path
import json

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

# Adicionar server ao path
sys.path.insert(0, str(Path(__file__).parent))

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
        if self.total > 0:
            print(f"Taxa de sucesso: {(self.passed/self.total*100):.1f}%")
        if self.errors:
            print("\n❌ Testes que falharam:")
            for name, error in self.errors:
                print(f"  - {name}: {error}")
        return self.failed == 0

def test_imports():
    """Testa se as funções podem ser importadas."""
    print("\n" + "="*70)
    print("Teste 1: Importação de Funções")
    print("="*70)
    
    try:
        from server.health.profiles import (
            get_health_profile,
            create_health_profile,
            update_health_profile,
            generate_evaluator_code,
            validate_code,
            link_student_to_evaluator,
            get_evaluator_students,
            get_student_evaluator,
            unlink_student
        )
        print("✅ Todas as funções importadas com sucesso!")
        return True
    except ImportError as e:
        print(f"❌ Erro ao importar funções: {e}")
        return False

def test_create_student_profile():
    """Testa criação de perfil de aluno."""
    print("\n" + "="*70)
    print("Teste 2: Criar Perfil de Aluno")
    print("="*70)
    
    try:
        from server.health.profiles import create_health_profile, get_health_profile
        
        # Limpar perfil anterior se existir
        test_user = "test_student_001"
        existing = get_health_profile(test_user)
        if existing:
            # Não podemos deletar facilmente, então vamos testar com outro ID
            import uuid
            test_user = f"test_student_{uuid.uuid4().hex[:8]}"
        
        # Criar perfil
        profile = create_health_profile(test_user, "student")
        
        assert profile is not None, "Perfil deve ser criado"
        assert profile.get("type") == "student", f"Tipo deve ser 'student', mas foi {profile.get('type')}"
        assert profile.get("user_id") == test_user, f"user_id deve ser {test_user}"
        assert "created_at" in profile, "Perfil deve ter created_at"
        assert "updated_at" in profile, "Perfil deve ter updated_at"
        assert "evaluator_code" not in profile, "Aluno não deve ter evaluator_code"
        
        # Verificar se foi salvo
        loaded = get_health_profile(test_user)
        assert loaded is not None, "Perfil deve ser carregável após criação"
        assert loaded.get("type") == "student", "Perfil carregado deve ser do tipo student"
        
        print(f"✅ Perfil de aluno criado: {test_user}")
        return True
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_create_evaluator_profile():
    """Testa criação de perfil de avaliador."""
    print("\n" + "="*70)
    print("Teste 3: Criar Perfil de Avaliador")
    print("="*70)
    
    try:
        from server.health.profiles import create_health_profile, get_health_profile
        import uuid
        
        test_user = f"test_evaluator_{uuid.uuid4().hex[:8]}"
        
        # Criar perfil
        profile = create_health_profile(test_user, "evaluator")
        
        assert profile is not None, "Perfil deve ser criado"
        assert profile.get("type") == "evaluator", f"Tipo deve ser 'evaluator'"
        assert "evaluator_code" in profile, "Avaliador deve ter evaluator_code"
        assert profile.get("evaluator_code", "").startswith("EVAL-"), "Código deve começar com EVAL-"
        assert len(profile.get("evaluator_code", "")) == 11, "Código deve ter formato EVAL-XXXXXX (11 caracteres)"
        assert "students" in profile, "Avaliador deve ter lista de students"
        assert isinstance(profile.get("students"), list), "students deve ser uma lista"
        
        # Verificar se foi salvo
        loaded = get_health_profile(test_user)
        assert loaded is not None, "Perfil deve ser carregável"
        assert loaded.get("evaluator_code") == profile.get("evaluator_code"), "Código deve ser o mesmo"
        
        print(f"✅ Perfil de avaliador criado: {test_user}")
        print(f"   Código gerado: {profile.get('evaluator_code')}")
        return True
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_validate_code():
    """Testa validação de código."""
    print("\n" + "="*70)
    print("Teste 4: Validar Código de Avaliador")
    print("="*70)
    
    try:
        from server.health.profiles import create_health_profile, validate_code
        import uuid
        
        test_user = f"test_eval_{uuid.uuid4().hex[:8]}"
        
        # Criar avaliador
        profile = create_health_profile(test_user, "evaluator")
        code = profile.get("evaluator_code")
        
        # Validar código
        evaluator_id = validate_code(code)
        assert evaluator_id == test_user, f"Código deve retornar {test_user}, mas retornou {evaluator_id}"
        
        # Testar código inválido
        invalid_id = validate_code("EVAL-INVALID")
        assert invalid_id is None, "Código inválido deve retornar None"
        
        # Testar código com formato errado
        invalid_id2 = validate_code("INVALID-CODE")
        assert invalid_id2 is None, "Código com formato errado deve retornar None"
        
        print(f"✅ Código validado: {code} -> {evaluator_id}")
        return True
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_link_student_to_evaluator():
    """Testa vinculação de aluno ao avaliador."""
    print("\n" + "="*70)
    print("Teste 5: Vincular Aluno ao Avaliador")
    print("="*70)
    
    try:
        from server.health.profiles import (
            create_health_profile,
            link_student_to_evaluator,
            get_student_evaluator,
            get_evaluator_students
        )
        import uuid
        
        # Criar avaliador
        evaluator_id = f"test_eval_{uuid.uuid4().hex[:8]}"
        eval_profile = create_health_profile(evaluator_id, "evaluator")
        code = eval_profile.get("evaluator_code")
        
        # Criar aluno
        student_id = f"test_student_{uuid.uuid4().hex[:8]}"
        create_health_profile(student_id, "student")
        
        # Vincular
        link_result = link_student_to_evaluator(student_id, code)
        
        assert link_result is not None, "link_student_to_evaluator deve retornar dict"
        assert link_result.get("evaluator_id") == evaluator_id, "evaluator_id deve estar correto"
        assert link_result.get("evaluator_code") == code, "evaluator_code deve estar correto"
        
        # Verificar vinculação do aluno
        student_evaluator = get_student_evaluator(student_id)
        assert student_evaluator == evaluator_id, f"Aluno deve estar vinculado a {evaluator_id}"
        
        # Verificar lista de alunos do avaliador
        students = get_evaluator_students(evaluator_id)
        assert student_id in students, f"Aluno {student_id} deve estar na lista do avaliador"
        
        print(f"✅ Aluno {student_id} vinculado ao avaliador {evaluator_id}")
        return True
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_update_profile():
    """Testa atualização de perfil."""
    print("\n" + "="*70)
    print("Teste 6: Atualizar Perfil")
    print("="*70)
    
    try:
        from server.health.profiles import create_health_profile, update_health_profile, get_health_profile
        import uuid
        
        test_user = f"test_user_{uuid.uuid4().hex[:8]}"
        
        # Criar perfil
        profile = create_health_profile(test_user, "student")
        original_updated = profile.get("updated_at")
        
        # Atualizar
        updated_profile = update_health_profile(test_user, {"custom_field": "test_value"})
        
        assert updated_profile.get("custom_field") == "test_value", "Campo customizado deve ser atualizado"
        assert updated_profile.get("updated_at") != original_updated, "updated_at deve ser atualizado"
        
        # Verificar se foi salvo
        loaded = get_health_profile(test_user)
        assert loaded.get("custom_field") == "test_value", "Campo deve persistir após atualização"
        
        print(f"✅ Perfil atualizado: {test_user}")
        return True
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_generate_new_code():
    """Testa geração de novo código."""
    print("\n" + "="*70)
    print("Teste 7: Gerar Novo Código")
    print("="*70)
    
    try:
        from server.health.profiles import create_health_profile, generate_evaluator_code, get_health_profile
        import uuid
        
        test_user = f"test_eval_{uuid.uuid4().hex[:8]}"
        
        # Criar avaliador
        profile = create_health_profile(test_user, "evaluator")
        original_code = profile.get("evaluator_code")
        
        # Gerar novo código
        new_code = generate_evaluator_code(test_user)
        
        assert new_code != original_code, "Novo código deve ser diferente do anterior"
        assert new_code.startswith("EVAL-"), "Novo código deve começar com EVAL-"
        
        # Verificar se foi salvo
        loaded = get_health_profile(test_user)
        assert loaded.get("evaluator_code") == new_code, "Novo código deve estar salvo"
        
        print(f"✅ Novo código gerado: {new_code} (anterior: {original_code})")
        return True
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_unlink_student():
    """Testa desvinculação de aluno."""
    print("\n" + "="*70)
    print("Teste 8: Desvincular Aluno")
    print("="*70)
    
    try:
        from server.health.profiles import (
            create_health_profile,
            link_student_to_evaluator,
            unlink_student,
            get_student_evaluator,
            get_evaluator_students
        )
        import uuid
        
        # Criar avaliador
        evaluator_id = f"test_eval_{uuid.uuid4().hex[:8]}"
        eval_profile = create_health_profile(evaluator_id, "evaluator")
        code = eval_profile.get("evaluator_code")
        
        # Criar e vincular aluno
        student_id = f"test_student_{uuid.uuid4().hex[:8]}"
        create_health_profile(student_id, "student")
        link_student_to_evaluator(student_id, code)
        
        # Verificar vinculação
        assert get_student_evaluator(student_id) == evaluator_id, "Aluno deve estar vinculado"
        assert student_id in get_evaluator_students(evaluator_id), "Aluno deve estar na lista"
        
        # Desvincular
        result = unlink_student(student_id, evaluator_id)
        assert result is True, "unlink_student deve retornar True"
        
        # Verificar desvinculação
        assert get_student_evaluator(student_id) is None, "Aluno não deve mais estar vinculado"
        assert student_id not in get_evaluator_students(evaluator_id), "Aluno não deve estar na lista"
        
        print(f"✅ Aluno {student_id} desvinculado do avaliador {evaluator_id}")
        return True
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_storage_local():
    """Testa storage local."""
    print("\n" + "="*70)
    print("Teste 9: Storage Local")
    print("="*70)
    
    try:
        from server.health.profiles import create_health_profile, get_health_profile, update_health_profile
        import os
        
        test_user = "local"
        
        # Verificar se já existe perfil
        existing = get_health_profile(test_user)
        if existing:
            # Atualizar perfil existente para garantir que está correto
            profile = update_health_profile(test_user, {"type": "evaluator"})
            if "evaluator_code" not in profile:
                # Se não tem código, gerar um
                from server.health.profiles import generate_evaluator_code
                generate_evaluator_code(test_user)
                profile = get_health_profile(test_user)
        else:
            # Criar perfil local
            profile = create_health_profile(test_user, "evaluator")
        
        # Verificar arquivo
        file_path = Path("data/health/local/profile.json")
        assert file_path.exists(), f"Arquivo {file_path} deve existir"
        
        # Ler arquivo diretamente
        with open(file_path, 'r', encoding='utf-8') as f:
            file_content = json.load(f)
        
        assert file_content.get("type") == "evaluator", "Conteúdo do arquivo deve estar correto"
        assert file_content.get("evaluator_code") == profile.get("evaluator_code"), "Código deve estar no arquivo"
        
        # Verificar se carrega corretamente
        loaded = get_health_profile(test_user)
        assert loaded is not None, "Perfil deve ser carregável do arquivo"
        assert loaded.get("evaluator_code") == profile.get("evaluator_code"), "Código deve ser o mesmo"
        
        print(f"✅ Storage local funcionando: {file_path}")
        return True
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        return False

def test_error_handling():
    """Testa tratamento de erros."""
    print("\n" + "="*70)
    print("Teste 10: Tratamento de Erros")
    print("="*70)
    
    try:
        from server.health.profiles import (
            create_health_profile,
            link_student_to_evaluator,
            generate_evaluator_code,
            update_health_profile
        )
        import uuid
        
        # Teste 1: Criar perfil com tipo inválido
        try:
            create_health_profile("test", "invalid_type")
            assert False, "Deveria lançar ValueError"
        except ValueError:
            pass  # Esperado
        
        # Teste 2: Criar perfil duplicado
        test_user = f"test_{uuid.uuid4().hex[:8]}"
        create_health_profile(test_user, "student")
        try:
            create_health_profile(test_user, "student")
            assert False, "Deveria lançar ValueError"
        except ValueError:
            pass  # Esperado
        
        # Teste 3: Vincular com código inválido
        student_id = f"test_student_{uuid.uuid4().hex[:8]}"
        create_health_profile(student_id, "student")
        try:
            link_student_to_evaluator(student_id, "EVAL-INVALID")
            assert False, "Deveria lançar ValueError"
        except ValueError:
            pass  # Esperado
        
        # Teste 4: Gerar código para não-avaliador
        try:
            generate_evaluator_code(student_id)
            assert False, "Deveria lançar ValueError"
        except ValueError:
            pass  # Esperado
        
        # Teste 5: Atualizar perfil inexistente
        try:
            update_health_profile("nonexistent_user", {"test": "value"})
            assert False, "Deveria lançar ValueError"
        except ValueError:
            pass  # Esperado
        
        print("✅ Tratamento de erros funcionando corretamente")
        return True
    except Exception as e:
        print(f"❌ Erro: {e}")
        import traceback
        traceback.print_exc()
        return False

def main():
    """Executa todos os testes."""
    print("="*70)
    print("TESTE P1.1 e P1.2 - Sistema de Perfis de Saúde")
    print("="*70)
    
    results = TestResults()
    
    # Executar testes
    results.add_test("Importação de funções", test_imports())
    results.add_test("Criar perfil de aluno", test_create_student_profile())
    results.add_test("Criar perfil de avaliador", test_create_evaluator_profile())
    results.add_test("Validar código", test_validate_code())
    results.add_test("Vincular aluno ao avaliador", test_link_student_to_evaluator())
    results.add_test("Atualizar perfil", test_update_profile())
    results.add_test("Gerar novo código", test_generate_new_code())
    results.add_test("Desvincular aluno", test_unlink_student())
    results.add_test("Storage local", test_storage_local())
    results.add_test("Tratamento de erros", test_error_handling())
    
    # Mostrar resumo
    success = results.print_summary()
    
    # Retornar código de saída
    return 0 if success else 1

if __name__ == "__main__":
    sys.exit(main())
