"""
Teste Completo Consolidado - Fase 1 (Backend + Frontend)
========================================================
Executa todos os testes da Fase 1 em sequência.
"""

import sys
import io
import subprocess
from pathlib import Path

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

def run_test(test_file, description):
    """Executa um arquivo de teste e retorna o resultado"""
    print("\n" + "="*70)
    print(f"EXECUTANDO: {description}")
    print("="*70)
    
    try:
        result = subprocess.run(
            [sys.executable, test_file],
            capture_output=True,
            text=True,
            timeout=120
        )
        
        # Exibir saída
        if result.stdout:
            print(result.stdout)
        if result.stderr and "FutureWarning" not in result.stderr:
            print(result.stderr, file=sys.stderr)
        
        return result.returncode == 0
    except subprocess.TimeoutExpired:
        print(f"❌ Teste {test_file} excedeu o tempo limite")
        return False
    except Exception as e:
        print(f"❌ Erro ao executar {test_file}: {e}")
        return False

def main():
    """Executa todos os testes da Fase 1"""
    print("\n" + "="*70)
    print("TESTE COMPLETO CONSOLIDADO - FASE 1")
    print("Backend (T1.1 + T1.2) + Frontend (T1.3 + T1.4)")
    print("="*70)
    
    tests = [
        ("test_health_phase1_backend.py", "Backend - Endpoints de suporte ao diário"),
        ("test_health_phase1_frontend.py", "Frontend - Tela Hoje e integração com chat"),
        ("test_health_phase1_endpoints_http.py", "Endpoints HTTP - Validação de API")
    ]
    
    results = []
    total_tests = len(tests)
    passed_tests = 0
    
    for test_file, description in tests:
        if Path(test_file).exists():
            passed = run_test(test_file, description)
            results.append((description, passed))
            if passed:
                passed_tests += 1
        else:
            print(f"⚠️  Arquivo {test_file} não encontrado, pulando...")
            results.append((description, None))
    
    # Resumo final
    print("\n" + "="*70)
    print("RESUMO FINAL - TODOS OS TESTES")
    print("="*70)
    
    for description, passed in results:
        if passed is None:
            status = "⏭️  PULADO"
        elif passed:
            status = "✅ PASSOU"
        else:
            status = "❌ FALHOU"
        print(f"{status} - {description}")
    
    print(f"\nTotal: {passed_tests}/{total_tests} suites de testes passaram")
    print(f"Taxa de sucesso: {(passed_tests/total_tests*100):.1f}%")
    
    if passed_tests == total_tests:
        print("\n🎉 TODOS OS TESTES PASSARAM! A Fase 1 está 100% funcional!")
        return 0
    else:
        print("\n⚠️  ALGUNS TESTES FALHARAM. Revise os resultados acima.")
        return 1

if __name__ == "__main__":
    exit_code = main()
    sys.exit(exit_code)
