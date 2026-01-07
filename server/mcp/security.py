"""
Luna MCP Security Manager
-------------------------
Gerenciador de segurança para sandboxing de caminhos.
Impede acesso a arquivos fora do workspace permitido.
"""

import os
from pathlib import Path
from typing import Optional, List


class SecurityManager:
    """
    Sandbox de segurança para operações de arquivo.
    Garante que o agente só acesse caminhos dentro do workspace permitido.
    """
    
    # Arquivos/pastas sempre bloqueados (mesmo dentro do workspace)
    BLOCKED_PATTERNS = [
        ".env",
        ".git/config",
        "id_rsa",
        "id_ed25519", 
        ".ssh",
        "credentials",
        "secrets",
        ".aws",
    ]
    
    # Extensões de arquivo binário que não devem ser lidas
    BINARY_EXTENSIONS = [
        ".exe", ".dll", ".so", ".dylib",
        ".png", ".jpg", ".jpeg", ".gif", ".webp", ".ico", ".bmp",
        ".mp3", ".mp4", ".avi", ".mkv", ".mov", ".wav",
        ".zip", ".tar", ".gz", ".rar", ".7z",
        ".pdf", ".doc", ".docx", ".xls", ".xlsx",
        ".pyc", ".pyo", ".class", ".o", ".obj",
        ".woff", ".woff2", ".ttf", ".eot",
    ]
    
    def __init__(self, workspace_root: Optional[str] = None):
        """
        Inicializa o gerenciador de segurança.
        
        Args:
            workspace_root: Diretório raiz permitido. Se None, nenhum acesso é permitido.
        """
        self._workspace_root: Optional[Path] = None
        if workspace_root:
            self.set_workspace(workspace_root)
    
    def set_workspace(self, workspace_root: str) -> bool:
        """
        Define o diretório de workspace permitido.
        
        Args:
            workspace_root: Caminho absoluto ou relativo ao workspace.
            
        Returns:
            True se o workspace foi definido com sucesso.
        """
        try:
            # Expande ~ e resolve para caminho absoluto
            resolved = Path(workspace_root).expanduser().resolve()
            
            if not resolved.exists():
                return False
                
            if not resolved.is_dir():
                return False
            
            self._workspace_root = resolved
            return True
        except Exception:
            return False
    
    @property
    def workspace(self) -> Optional[Path]:
        """Retorna o workspace atual."""
        return self._workspace_root
    
    @property
    def is_configured(self) -> bool:
        """Verifica se o workspace está configurado."""
        return self._workspace_root is not None
    
    def validate_path(self, path: str, base_path: "Path | None" = None) -> tuple[bool, str, "Path | None"]:
        """
        Valida se um caminho é seguro para acessar.
        
        Args:
            path: Caminho a ser validado (absoluto ou relativo ao base_path/workspace).
            base_path: Diretório base para resolver caminhos relativos (default: workspace root).
            
        Returns:
            Tupla (is_valid, error_message, resolved_path)
        """
        if not self.is_configured:
            return False, "Workspace não configurado", None
        
        try:
            # Resolve o caminho
            path_obj = Path(path)
            
            # Se for relativo, resolve em relação ao base_path ou workspace
            if not path_obj.is_absolute():
                base = base_path or self._workspace_root
                resolved = (base / path_obj).resolve()
            else:
                resolved = path_obj.resolve()
            
            # Verifica se está dentro do workspace (previne path traversal)
            try:
                resolved.relative_to(self._workspace_root)
            except ValueError:
                return False, f"Acesso negado: caminho fora do workspace ({self._workspace_root})", None
            
            # Verifica padrões bloqueados
            path_str = str(resolved).lower()
            for pattern in self.BLOCKED_PATTERNS:
                if pattern.lower() in path_str:
                    return False, f"Acesso negado: arquivo sensível ({pattern})", None
            
            return True, "", resolved
            
        except Exception as e:
            return False, f"Erro ao validar caminho: {str(e)}", None
    
    def is_binary_file(self, path: Path) -> bool:
        """
        Verifica se um arquivo é binário baseado na extensão.
        
        Args:
            path: Caminho do arquivo.
            
        Returns:
            True se o arquivo parece ser binário.
        """
        suffix = path.suffix.lower()
        return suffix in self.BINARY_EXTENSIONS
    
    def get_relative_path(self, absolute_path: Path) -> str:
        """
        Converte um caminho absoluto para relativo ao workspace.
        
        Args:
            absolute_path: Caminho absoluto.
            
        Returns:
            Caminho relativo como string.
        """
        if not self.is_configured:
            return str(absolute_path)
        
        try:
            return str(absolute_path.relative_to(self._workspace_root))
        except ValueError:
            return str(absolute_path)
    
    def list_allowed_extensions(self) -> List[str]:
        """Retorna lista de extensões de arquivo permitidas para leitura."""
        # Extensões comuns de código e texto
        return [
            ".py", ".js", ".jsx", ".ts", ".tsx", ".json", ".yaml", ".yml",
            ".html", ".css", ".scss", ".sass", ".less",
            ".md", ".txt", ".rst", ".csv", ".xml",
            ".sh", ".bash", ".zsh", ".fish", ".ps1", ".bat", ".cmd",
            ".c", ".cpp", ".h", ".hpp", ".cs", ".java", ".kt", ".go",
            ".rs", ".swift", ".m", ".rb", ".php", ".lua", ".r",
            ".sql", ".graphql", ".proto",
            ".dockerfile", ".gitignore", ".env.example",
            ".toml", ".ini", ".cfg", ".conf",
        ]
