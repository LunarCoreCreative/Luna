"""
Helper para testes do Luna Health
==================================
Fornece funções utilitárias para iniciar/parar servidor e executar testes.
"""

import sys
import io
import requests
import subprocess
import time
import signal
from pathlib import Path

# Configurar encoding UTF-8 para Windows
if sys.platform == 'win32':
    sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
    sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')

BASE_URL = "http://127.0.0.1:8001"
SERVER_PROCESS = None

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

def check_server_running():
    """Verifica se o servidor está rodando"""
    try:
        response = requests.get(f"{BASE_URL}/health/daily_overview?user_id=local", timeout=2)
        return response.status_code in [200, 404]
    except:
        return False

def start_server():
    """Inicia o servidor em background"""
    global SERVER_PROCESS
    
    print("\n🔧 Iniciando servidor...")
    
    # Determinar o comando baseado no sistema operacional
    if sys.platform == 'win32':
        # Windows
        SERVER_PROCESS = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "server.main:app", "--host", "127.0.0.1", "--port", "8001"],
            cwd=Path(__file__).parent,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            creationflags=subprocess.CREATE_NEW_CONSOLE if hasattr(subprocess, 'CREATE_NEW_CONSOLE') else 0
        )
    else:
        # Linux/Mac
        SERVER_PROCESS = subprocess.Popen(
            [sys.executable, "-m", "uvicorn", "server.main:app", "--host", "127.0.0.1", "--port", "8001"],
            cwd=Path(__file__).parent,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
    
    # Aguardar servidor iniciar
    max_attempts = 30
    for i in range(max_attempts):
        time.sleep(1)
        if check_server_running():
            print(f"✅ Servidor iniciado com sucesso! (tentativa {i+1})")
            return True
        if SERVER_PROCESS.poll() is not None:
            # Processo terminou
            stdout, stderr = SERVER_PROCESS.communicate()
            print(f"❌ Servidor falhou ao iniciar:")
            if stdout:
                print(f"STDOUT: {stdout.decode('utf-8', errors='replace')}")
            if stderr:
                print(f"STDERR: {stderr.decode('utf-8', errors='replace')}")
            return False
    
    print("❌ Timeout ao aguardar servidor iniciar")
    return False

def stop_server():
    """Para o servidor"""
    global SERVER_PROCESS
    
    if SERVER_PROCESS:
        print("\n🛑 Parando servidor...")
        try:
            if sys.platform == 'win32':
                SERVER_PROCESS.terminate()
                time.sleep(1)
                if SERVER_PROCESS.poll() is None:
                    SERVER_PROCESS.kill()
            else:
                SERVER_PROCESS.send_signal(signal.SIGTERM)
                time.sleep(1)
                if SERVER_PROCESS.poll() is None:
                    SERVER_PROCESS.kill()
            print("✅ Servidor parado")
        except Exception as e:
            print(f"⚠️  Erro ao parar servidor: {e}")

def ensure_server():
    """Garante que o servidor está rodando, iniciando se necessário"""
    if check_server_running():
        return True
    return start_server()
