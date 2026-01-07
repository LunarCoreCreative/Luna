"""
Repository Mapper
------------------
Gera mapas semânticos do repositório para contexto do agente.
"""

from pathlib import Path
from typing import List, Dict, Optional, Set
from dataclasses import dataclass
from .parser import CodeParser, Symbol
import os


@dataclass
class FileInfo:
    """Informações de um arquivo no repositório."""
    path: str
    relative_path: str
    language: Optional[str]
    size: int
    symbols: List[Symbol]
    
    def to_dict(self) -> dict:
        return {
            "path": self.relative_path,
            "language": self.language,
            "size": self.size,
            "symbols": [s.to_dict() for s in self.symbols]
        }


class RepoMapper:
    """
    Gera mapas do repositório para contexto inteligente.
    
    O mapa inclui:
    - Estrutura de diretórios
    - Símbolos de código (funções, classes, métodos)
    - Dependências (imports)
    """
    
    # Extensões de código
    CODE_EXTENSIONS = {'.py', '.js', '.jsx', '.ts', '.tsx', '.html', '.css', '.json', '.md'}
    
    # Diretórios/arquivos ignorados
    IGNORE_PATTERNS = {
        'node_modules', '__pycache__', '.git', '.venv', 'venv', 'env',
        'dist', 'build', '.next', '.cache', 'coverage', '.pytest_cache',
        '.eggs', '*.egg-info', '.tox', '.mypy_cache'
    }
    
    # Limite de tamanho de arquivo (100KB)
    MAX_FILE_SIZE = 100 * 1024
    
    def __init__(self, root_path: str):
        """
        Args:
            root_path: Caminho raiz do repositório
        """
        self.root = Path(root_path).resolve()
        self.parser = CodeParser()
        self.files: List[FileInfo] = []
        self._scanned = False
    
    def _should_ignore(self, path: Path) -> bool:
        """Verifica se o caminho deve ser ignorado."""
        name = path.name
        
        # Ignora arquivos ocultos
        if name.startswith('.') and name not in ('.env.example',):
            return True
        
        # Verifica se algum componente do path está nos padrões ignorados
        parts = path.parts
        for part in parts:
            if part in self.IGNORE_PATTERNS:
                return True
                
        return False
    
    def _is_code_file(self, path: Path) -> bool:
        """Verifica se é um arquivo de código."""
        return path.suffix.lower() in self.CODE_EXTENSIONS
    
    def scan(self, max_files: int = 500) -> 'RepoMapper':
        """
        Escaneia o repositório e extrai símbolos.
        """
        self.files = []
        count = 0
        
        print(f"[RepoMapper] Iniciando scan em: {self.root}")
        
        for root, dirs, files in os.walk(self.root):
            # Filtra diretórios ignorados
            dirs[:] = [d for d in dirs if not self._should_ignore(Path(root) / d)]
            
            for file in files:
                if count >= max_files:
                    break
                    
                filepath = Path(root) / file
                
                if self._should_ignore(filepath):
                    continue
                
                if not self._is_code_file(filepath):
                    continue
                
                try:
                    stat = filepath.stat()
                    if stat.st_size > self.MAX_FILE_SIZE:
                        continue
                    
                    # Parse do arquivo
                    symbols = self.parser.parse_file(str(filepath))
                    lang = self.parser.get_language(str(filepath))
                    
                    self.files.append(FileInfo(
                        path=str(filepath),
                        relative_path=str(filepath.relative_to(self.root)),
                        language=lang,
                        size=stat.st_size,
                        symbols=symbols
                    ))
                    count += 1
                    
                    if count % 50 == 0:
                        print(f"[RepoMapper] ... processados {count} arquivos")
                    
                except Exception as e:
                    continue
            
            if count >= max_files:
                break
        
        print(f"[RepoMapper] Scan concluído: {count} arquivos processados.")
        self._scanned = True
        return self
    
    def get_tree(self, max_depth: int = 4) -> str:
        """
        Gera uma representação em árvore do repositório.
        
        Args:
            max_depth: Profundidade máxima da árvore
            
        Returns:
            String com a árvore de diretórios
        """
        lines = [f"📁 {self.root.name}/"]
        
        def add_entries(path: Path, prefix: str, depth: int):
            if depth > max_depth:
                return
            
            try:
                entries = sorted(path.iterdir(), key=lambda x: (not x.is_dir(), x.name.lower()))
            except PermissionError:
                return
            
            # Filtra
            entries = [e for e in entries if not self._should_ignore(e)]
            
            for i, entry in enumerate(entries[:20]):  # Limita a 20 por nível
                is_last = i == len(entries[:20]) - 1
                connector = "└── " if is_last else "├── "
                
                if entry.is_dir():
                    lines.append(f"{prefix}{connector}📁 {entry.name}/")
                    new_prefix = prefix + ("    " if is_last else "│   ")
                    add_entries(entry, new_prefix, depth + 1)
                else:
                    icon = "📄" if self._is_code_file(entry) else "📝"
                    lines.append(f"{prefix}{connector}{icon} {entry.name}")
            
            if len(entries) > 20:
                lines.append(f"{prefix}    ... (+{len(entries) - 20} mais)")
        
        add_entries(self.root, "", 1)
        return "\n".join(lines)
    
    def get_symbols_map(self, max_symbols_per_file: int = 10) -> str:
        """
        Gera um mapa de símbolos do repositório.
        
        Returns:
            String com resumo dos símbolos por arquivo
        """
        if not self._scanned:
            self.scan()
        
        lines = ["## Mapa de Símbolos\n"]
        
        for file_info in self.files:
            if not file_info.symbols:
                continue
            
            lines.append(f"\n### {file_info.relative_path}")
            
            for sym in file_info.symbols[:max_symbols_per_file]:
                icon = "[CLASS]" if sym.kind == 'class' else "[FUNC]"
                lines.append(f"- {icon} `{sym.signature}` (L{sym.line_start})")
                
                for child in sym.children[:5]:
                    lines.append(f"  - [SUB] `{child.signature}` (L{child.line_start})")
        
        return "\n".join(lines)
    
    def get_context(self, query: str = "", max_tokens: int = 4000) -> str:
        """
        Gera contexto relevante para o agente.
        
        Args:
            query: Pergunta ou tarefa do usuário (para filtragem futura)
            max_tokens: Limite aproximado de tokens
            
        Returns:
            String com contexto do repositório
        """
        if not self._scanned:
            self.scan()
        
        # Gera árvore compacta
        tree = self.get_tree(max_depth=3)
        
        # Gera mapa de símbolos
        symbols = self.get_symbols_map(max_symbols_per_file=5)
        
        context = f"""# Estrutura do Projeto

{tree}

{symbols}

---
Total: {len(self.files)} arquivos de código analisados.
"""
        
        # Trunca se necessário (estimativa: 1 token ≈ 4 chars)
        max_chars = max_tokens * 4
        if len(context) > max_chars:
            context = context[:max_chars] + "\n\n... (truncado)"
        
        return context
    
    def find_symbol(self, name: str) -> List[Dict]:
        """
        Busca um símbolo pelo nome.
        
        Args:
            name: Nome do símbolo a buscar
            
        Returns:
            Lista de matches com arquivo e símbolo
        """
        if not self._scanned:
            self.scan()
        
        matches = []
        name_lower = name.lower()
        
        for file_info in self.files:
            for sym in file_info.symbols:
                if name_lower in sym.name.lower():
                    matches.append({
                        "file": file_info.relative_path,
                        "symbol": sym.to_dict()
                    })
                
                # Busca em filhos também
                for child in sym.children:
                    if name_lower in child.name.lower():
                        matches.append({
                            "file": file_info.relative_path,
                            "parent": sym.name,
                            "symbol": child.to_dict()
                        })
        
        return matches
    
    def get_file_context(self, relative_path: str) -> Optional[str]:
        """
        Retorna contexto detalhado de um arquivo específico.
        
        Args:
            relative_path: Caminho relativo do arquivo
            
        Returns:
            String com outline do arquivo ou None
        """
        filepath = self.root / relative_path
        if not filepath.exists():
            return None
        
        try:
            outline = self.parser.get_file_outline(str(filepath))
            return f"## {relative_path}\n\n{outline}" if outline else None
        except Exception:
            return None
