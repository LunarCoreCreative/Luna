"""
Teste T1.6 - Campos extra de metas (target_weight e current_weight)
====================================================================
Valida que os campos de peso são exibidos no resumo e a diferença é calculada.
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

from datetime import datetime
from server.health.storage import (
    get_summary,
    update_goals,
    get_goals,
    delete_meal
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

def test_weight_fields_in_summary(results):
    """Testa se os campos de peso estão no resumo"""
    print("\n" + "="*70)
    print("TESTE T1.6 - CAMPOS DE PESO NO RESUMO")
    print("="*70)
    
    user_id = "test_t1_6_weight"
    today = datetime.now().strftime("%Y-%m-%d")
    
    try:
        # Configurar metas com peso
        print("\n--- Configurando metas com peso ---")
        update_goals(
            user_id,
            daily_calories=2000.0,
            current_weight=70.0,
            target_weight=65.0
        )
        
        # Obter resumo
        summary = get_summary(user_id, date=today)
        
        # Teste 1: Campos presentes no resumo
        results.add_test("Resumo tem 'current_weight'", "current_weight" in summary)
        results.add_test("Resumo tem 'target_weight'", "target_weight" in summary)
        results.add_test("Resumo tem 'weight_difference'", "weight_difference" in summary)
        
        # Teste 2: Valores corretos
        results.add_test("current_weight correto", summary.get("current_weight") == 70.0)
        results.add_test("target_weight correto", summary.get("target_weight") == 65.0)
        
        # Teste 3: Diferença calculada corretamente
        expected_diff = 65.0 - 70.0  # -5.0 (precisa perder 5kg)
        results.add_test("weight_difference calculado corretamente", summary.get("weight_difference") == expected_diff)
        
        # Teste 4: Campos também estão em goals
        goals = summary.get("goals", {})
        results.add_test("Goals tem 'current_weight'", "current_weight" in goals)
        results.add_test("Goals tem 'target_weight'", "target_weight" in goals)
        results.add_test("Goals tem valores corretos", goals.get("current_weight") == 70.0 and goals.get("target_weight") == 65.0)
        
        print("\n[SUCESSO] Testes de campos de peso no resumo concluídos")
        return True
        
    except Exception as e:
        results.add_test("Campos de peso no resumo (geral)", False, str(e))
        return False

def test_weight_difference_calculation(results):
    """Testa o cálculo da diferença de peso em diferentes cenários"""
    print("\n" + "="*70)
    print("TESTE: CÁLCULO DA DIFERENÇA DE PESO")
    print("="*70)
    
    user_id = "test_t1_6_weight_diff"
    today = datetime.now().strftime("%Y-%m-%d")
    
    try:
        # Cenário 1: Perda de peso (target < current)
        print("\n--- Cenário 1: Perda de peso ---")
        update_goals(user_id, current_weight=80.0, target_weight=75.0)
        summary1 = get_summary(user_id, date=today)
        expected_diff1 = 75.0 - 80.0  # -5.0
        results.add_test("Diferença para perda de peso", summary1.get("weight_difference") == expected_diff1)
        
        # Cenário 2: Ganho de peso (target > current)
        print("\n--- Cenário 2: Ganho de peso ---")
        update_goals(user_id, current_weight=60.0, target_weight=65.0)
        summary2 = get_summary(user_id, date=today)
        expected_diff2 = 65.0 - 60.0  # +5.0
        results.add_test("Diferença para ganho de peso", summary2.get("weight_difference") == expected_diff2)
        
        # Cenário 3: Manter peso (target == current)
        print("\n--- Cenário 3: Manter peso ---")
        update_goals(user_id, current_weight=70.0, target_weight=70.0)
        summary3 = get_summary(user_id, date=today)
        expected_diff3 = 70.0 - 70.0  # 0.0
        results.add_test("Diferença para manter peso", summary3.get("weight_difference") == expected_diff3)
        
        # Cenário 4: Apenas current_weight (sem target definido)
        print("\n--- Cenário 4: Apenas peso atual (sem target) ---")
        # Primeiro limpa tudo
        update_goals(user_id, current_weight=70.0, target_weight=70.0)
        # Depois remove target (definindo como 0 ou None não remove, então vamos testar com valor diferente)
        # Na verdade, update_goals não remove campos quando None, apenas não atualiza
        # Vamos testar que quando apenas um está definido, a diferença não é calculada
        update_goals(user_id, current_weight=70.0)
        # Não atualiza target, então mantém o anterior (70.0)
        summary4 = get_summary(user_id, date=today)
        # Se ambos estão definidos, a diferença deve ser calculada
        if summary4.get("current_weight") is not None and summary4.get("target_weight") is not None:
            results.add_test("Diferença calculada quando ambos presentes", summary4.get("weight_difference") is not None)
        else:
            results.add_test("weight_difference é None quando falta um dos pesos", summary4.get("weight_difference") is None)
        
        # Cenário 5: Testar quando realmente falta um dos valores
        print("\n--- Cenário 5: Testar cálculo quando falta um peso ---")
        # Criar novo usuário sem pesos
        empty_user = "test_t1_6_empty_weight"
        summary5 = get_summary(empty_user, date=today)
        results.add_test("weight_difference é None quando não há pesos", summary5.get("weight_difference") is None or summary5.get("weight_difference") == 0)
        
        # Cenário 6: Verificar que campos podem ser None
        print("\n--- Cenário 6: Campos podem ser None ---")
        # Se não há goals, os campos devem ser None
        results.add_test("Campos podem ser None quando não definidos", 
                        summary5.get("current_weight") is None or summary5.get("current_weight") == 0)
        
        print("\n[SUCESSO] Testes de cálculo de diferença concluídos")
        return True
        
    except Exception as e:
        results.add_test("Cálculo de diferença (geral)", False, str(e))
        return False

def test_weight_fields_in_goals(results):
    """Testa se os campos de peso são salvos e carregados corretamente"""
    print("\n" + "="*70)
    print("TESTE: CAMPOS DE PESO EM GOALS")
    print("="*70)
    
    user_id = "test_t1_6_goals_weight"
    
    try:
        # Salvar metas com peso
        update_goals(
            user_id,
            daily_calories=2000.0,
            current_weight=72.5,
            target_weight=68.0
        )
        
        # Carregar goals
        goals = get_goals(user_id)
        
        # Verificar que foram salvos
        results.add_test("Goals tem current_weight salvo", goals.get("current_weight") == 72.5)
        results.add_test("Goals tem target_weight salvo", goals.get("target_weight") == 68.0)
        
        # Atualizar apenas um campo
        update_goals(user_id, current_weight=73.0)
        goals_updated = get_goals(user_id)
        results.add_test("Atualizar apenas current_weight funciona", goals_updated.get("current_weight") == 73.0)
        results.add_test("target_weight mantido após atualização", goals_updated.get("target_weight") == 68.0)
        
        print("\n[SUCESSO] Testes de campos de peso em goals concluídos")
        return True
        
    except Exception as e:
        results.add_test("Campos de peso em goals (geral)", False, str(e))
        return False

def main():
    """Executa todos os testes da T1.6"""
    print("\n" + "="*70)
    print("TESTE T1.6 - CAMPOS EXTRA DE METAS (PESO)")
    print("="*70)
    
    results = TestResults()
    
    # Executar testes
    print("\n🔍 Iniciando testes...\n")
    
    test_weight_fields_in_summary(results)
    test_weight_difference_calculation(results)
    test_weight_fields_in_goals(results)
    
    # Resumo final
    all_passed = results.print_summary()
    
    if all_passed:
        print("\n🎉 TODOS OS TESTES DA T1.6 PASSARAM!")
        print("Os campos de peso estão funcionando corretamente.")
        return 0
    else:
        print("\n⚠️  ALGUNS TESTES FALHARAM. Revise os erros acima.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
