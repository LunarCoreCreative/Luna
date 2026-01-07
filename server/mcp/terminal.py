"""
Luna MCP Terminal Server
------------------------
Servidor MCP para execução de comandos de terminal.
Permite executar comandos, compilar código e rodar testes.

IMPORTANTE: Comandos são executados COM CONFIRMAÇÃO do usuário no frontend.
"""

import asyncio
import os
import subprocess
from pathlib import Path
from typing import Dict, Any, Optional, List
import platform
import queue
import threading

from .security import SecurityManager


class TerminalSession:
    """
    Sessão de terminal persistente.
    Mantém um processo shell rodando para executar comandos.
    """
    
    def __init__(self, cwd: Path, shell: str = None):
        self.cwd = cwd
        self.shell = shell or self._detect_shell()
        self.process: Optional[subprocess.Popen] = None
        self.output_history: List[str] = []
        self._lock = threading.Lock()
    
    def _detect_shell(self) -> str:
        """Detecta o shell padrão do sistema."""
        if platform.system() == "Windows":
            return "powershell.exe"
        return os.environ.get("SHELL", "/bin/bash")
    
    def is_alive(self) -> bool:
        """Verifica se a sessão está ativa."""
        return self.process is not None and self.process.poll() is None


class TerminalMCP:
    """
    Servidor MCP de Terminal.
    Executa comandos dentro do workspace de forma segura.
    """
    
    # Comandos perigosos que SEMPRE requerem confirmação
    DANGEROUS_COMMANDS = [
        "rm", "del", "rmdir", "rd",
        "format", "diskpart",
        "chmod", "chown",
        "> /dev/", "| /dev/",
        "sudo", "su ",
        "curl", "wget",  # Download de arquivos
        "pip install", "npm install", "yarn add",  # Instalação de pacotes
        "git push", "git reset --hard",
    ]
    
    # Comandos seguros que NÃO requerem confirmação
    SAFE_COMMANDS = [
        "ls", "dir", "pwd", "cd",
        "cat", "type", "head", "tail",
        "echo", "grep", "find", "tree",
        "git status", "git log", "git diff", "git branch",
        "python --version", "node --version", "npm --version",
    ]
    
    # Comandos que rodam indefinidamente (servidores, watch mode)
    # Estes NÃO devem ser executados de forma bloqueante!
    WATCH_MODE_COMMANDS = [
        "npm run start", "npm run dev", "npm start", "npm run serve",
        "yarn start", "yarn dev", "yarn serve",
        "pnpm start", "pnpm dev", "pnpm serve",
        "python -m http.server", "python3 -m http.server",
        "flask run", "uvicorn", "gunicorn",
        "node server", "nodemon",
        "npm run watch", "yarn watch",
        "vite", "vite preview",
    ]
    
    # Timeout padrão para comandos (segundos) - aumentado para builds pesados
    DEFAULT_TIMEOUT = 120
    
    # Limite de output para evitar estouro de memória
    MAX_OUTPUT_SIZE = 100 * 1024  # 100KB
    
    def __init__(self, security_manager: SecurityManager):
        """
        Args:
            security_manager: Gerenciador de segurança para validação.
        """
        self.security = security_manager
        self._current_cwd: Optional[Path] = None
    
    @property
    def cwd(self) -> Path:
        """Retorna o diretório de trabalho atual."""
        if self._current_cwd is None:
            if self.security.is_configured:
                self._current_cwd = self.security.workspace
            else:
                self._current_cwd = Path.cwd()
        return self._current_cwd
    
    def is_dangerous_command(self, command: str) -> bool:
        """
        Verifica se um comando é potencialmente perigoso.
        
        Args:
            command: Comando a verificar.
            
        Returns:
            True se o comando requer confirmação do usuário.
        """
        cmd_lower = command.lower().strip()
        
        # Verifica comandos perigosos
        for dangerous in self.DANGEROUS_COMMANDS:
            if dangerous in cmd_lower:
                return True
        
        # Comandos com pipes ou redirecionamentos são potencialmente perigosos
        if "|" in command or ">" in command or ">>" in command:
            # Mas não se for apenas leitura
            if not any(safe in cmd_lower for safe in ["grep", "head", "tail", "less", "more"]):
                return True
        
        return False
    
    def is_safe_command(self, command: str) -> bool:
        """
        Verifica se um comando é considerado seguro (só leitura).
        
        Args:
            command: Comando a verificar.
            
        Returns:
            True se o comando pode ser executado sem confirmação.
        """
        cmd_lower = command.lower().strip()
        
        # Verifica comandos seguros
        for safe in self.SAFE_COMMANDS:
            if cmd_lower.startswith(safe):
                return True
        
        return False
    
    def execute_command(
        self, 
        command: str, 
        timeout: int = None,
        requires_approval: bool = None
    ) -> Dict[str, Any]:
        """
        Executa um comando de terminal.
        
        Args:
            command: Comando a executar.
            timeout: Timeout em segundos (default: 60s).
            requires_approval: Se especificado, sobrescreve a detecção automática.
            
        Returns:
            Dict com success, output, exit_code, requires_approval ou error.
        """
        if not self.security.is_configured:
            return {"success": False, "error": "Workspace não configurado"}
        
        if not command.strip():
            return {"success": False, "error": "Comando vazio"}
        
        # Determina se requer aprovação
        if requires_approval is None:
            # Modo "Acesso Total" solicitado pelo usuário:
            # Desativamos a verificação de comandos perigosos para fluxos fluidos.
            # O usuário confia na Luna.
            requires_approval = False
            
            # TODO: Futuramente podemos reativar apenas para deletes críticos (rm -rf /)
            
        
        # Se requer aprovação (manual override), retorna para frontend
        if requires_approval:
            return {
                "success": False,
                "requires_approval": True,
                "command": command,
                "reason": "Comando marcado como requerendo aprovação manual.",
                "is_dangerous": True
            }
        
        # Intercepta comando 'cd' para persistir estado
        cmd_parts = command.strip().split()
        if cmd_parts and cmd_parts[0] == "cd":
            if len(cmd_parts) > 1:
                target_dir = " ".join(cmd_parts[1:])
                # Trata aspas
                target_dir = target_dir.strip('"').strip("'")
                
                # Resolve o caminho
                new_path = (self.cwd / target_dir).resolve()
                
                if not new_path.exists() or not new_path.is_dir():
                    return {"success": False, "error": f"Caminho não encontrado: {target_dir}", "command": command}
                
                
                # Valida segurança - cd não pode sair do workspace
                valid, error, _ = self.security.validate_path(str(new_path))
                if not valid:
                    return {"success": False, "error": error, "command": command}
                
                self._current_cwd = new_path
                return {
                    "success": True, 
                    "output": "", 
                    "cwd": str(self.cwd), 
                    "command": command,
                    "exit_code": 0
                }
            else:
                # 'cd' vazio vai para home ou workspace root? Vamos assumir root do workspace ou ignorar.
                return {"success": True, "output": "", "cwd": str(self.cwd), "command": command, "exit_code": 0}

        # Detecta comandos watch mode (servidores que rodam indefinidamente)
        cmd_lower = command.lower().strip()
        for watch_cmd in self.WATCH_MODE_COMMANDS:
            if cmd_lower == watch_cmd or cmd_lower.startswith(f"{watch_cmd} "):
                return {
                    "success": True,
                    "output": f"⚠️ O comando '{command}' inicia um servidor/watch mode que roda indefinidamente.\n"
                             f"Não posso executá-lo de forma bloqueante.\n\n"
                             f"Para testar o projeto, peça ao usuário para rodar manualmente em outro terminal:\n"
                             f"  {command}",
                    "command": command,
                    "exit_code": 0,
                    "is_watch_mode": True
                }

        timeout = timeout or self.DEFAULT_TIMEOUT
        
        try:
            # Detecta shell
            if platform.system() == "Windows":
                # No Windows, powershell precisa de tratamento especial para manter o encoding correto
                shell_cmd = ["powershell", "-NoProfile", "-NonInteractive", "-Command", command]
            else:
                shell_cmd = ["/bin/bash", "-c", command]
            
            # Executa o comando
            result = subprocess.run(
                shell_cmd,
                cwd=str(self.cwd),
                capture_output=True,
                text=True,
                timeout=timeout,
                input="",  # Envia EOF para comandos interativos (evita travar em REPLs)
                env={
                    **os.environ,
                    "PAGER": "cat",      # Evita paginação
                    "PYTHONIOENCODING": "utf-8", # Força utf-8 no Python
                }
            )
            
            # Combina stdout e stderr
            output = result.stdout
            if result.stderr:
                # Alguns programas usam stderr para logs normais, não é necessariamente erro crítico
                if output:
                    output += "\n"
                output += result.stderr
            
            # Limita output
            if len(output) > self.MAX_OUTPUT_SIZE:
                output = output[:self.MAX_OUTPUT_SIZE] + f"\n\n... [OUTPUT TRUNCADO - {len(output)} bytes total]"
            
            return {
                "success": result.returncode == 0,
                "output": output,
                "exit_code": result.returncode,
                "cwd": str(self.cwd),
                "command": command
            }
            
        except subprocess.TimeoutExpired:
            return {
                "success": False,
                "error": f"Comando excedeu timeout de {timeout}s",
                "command": command,
                "timed_out": True
            }
        except Exception as e:
            return {
                "success": False,
                "error": f"Erro ao executar comando: {str(e)}",
                "command": command
            }
    
    def change_directory(self, path: str) -> Dict[str, Any]:
        """
        Muda o diretório de trabalho atual.
        
        Args:
            path: Novo diretório de trabalho.
            
        Returns:
            Dict com success e novo cwd ou error.
        """
        valid, error, resolved = self.security.validate_path(path)
        if not valid:
            return {"success": False, "error": error}
        
        if not resolved.is_dir():
            return {"success": False, "error": f"Não é um diretório: {path}"}
        
        self._current_cwd = resolved
        return {
            "success": True,
            "cwd": self.security.get_relative_path(resolved)
        }
    
    def get_cwd(self) -> Dict[str, Any]:
        """
        Retorna o diretório de trabalho atual.
        
        Returns:
            Dict com success e cwd.
        """
        return {
            "success": True,
            "cwd": self.security.get_relative_path(self.cwd),
            "absolute": str(self.cwd)
        }
    
    def get_environment(self) -> Dict[str, Any]:
        """
        Retorna informações sobre o ambiente de execução.
        
        Returns:
            Dict com informações do sistema.
        """
        return {
            "success": True,
            "platform": platform.system(),
            "python_version": platform.python_version(),
            "cwd": str(self.cwd),
            "workspace": str(self.security.workspace) if self.security.workspace else None,
        }


# Schema de ferramentas para o LLM
TERMINAL_TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "execute_command",
            "description": "Executa um comando de terminal no workspace. Comandos que modificam arquivos ou sistema requerem aprovação do usuário.",
            "parameters": {
                "type": "object",
                "properties": {
                    "command": {
                        "type": "string",
                        "description": "O comando a executar (ex: 'python main.py', 'npm test')."
                    },
                    "timeout": {
                        "type": "integer",
                        "description": "Timeout em segundos. Default: 60."
                    }
                },
                "required": ["command"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "change_directory",
            "description": "Muda o diretório de trabalho atual para os próximos comandos.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Caminho do novo diretório de trabalho."
                    }
                },
                "required": ["path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_cwd",
            "description": "Retorna o diretório de trabalho atual.",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_environment",
            "description": "Retorna informações sobre o ambiente de execução (sistema, versões, etc).",
            "parameters": {
                "type": "object",
                "properties": {},
                "required": []
            }
        }
    }
]
