"""
Script para executar testes da Fase 0 - Luna Health
====================================================
Execute: python run_health_tests.py
"""

import sys
import subprocess
import os

def main():
    """Executa os testes da Fase 0."""
    # Configurar encoding UTF-8 para Windows
    import io
    import sys
    if sys.platform == 'win32':
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    
    print("=" * 70)
    print("Testes da Fase 0 - Luna Health")
    print("=" * 70)
    print()
    
    # Verifica se pytest está instalado
    try:
        import pytest
        print("[OK] pytest encontrado")
    except ImportError:
        print("[ERRO] pytest nao encontrado. Instalando...")
        subprocess.check_call([sys.executable, "-m", "pip", "install", "pytest", "pytest-asyncio"])
        print("[OK] pytest instalado")
        print()
    
    # Executa os testes
    test_file = "test_health_phase0.py"
    
    if not os.path.exists(test_file):
        print(f"[ERRO] Arquivo de testes nao encontrado: {test_file}")
        return 1
    
    print(f"Executando testes de: {test_file}")
    print()
    
    # Comandos do pytest
    cmd = [
        sys.executable, "-m", "pytest",
        test_file,
        "-v",  # Verbose
        "--tb=short",  # Traceback curto
        "-s"  # Mostra prints
    ]
    
    try:
        result = subprocess.run(cmd, check=False)
        print()
        print("=" * 70)
        if result.returncode == 0:
            print("[OK] Todos os testes passaram!")
        else:
            print(f"[AVISO] Alguns testes falharam (codigo: {result.returncode})")
        print("=" * 70)
        return result.returncode
    except Exception as e:
        print(f"[ERRO] Erro ao executar testes: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())
