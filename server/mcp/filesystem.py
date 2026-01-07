"""
Luna MCP FileSystem Server
--------------------------
Servidor MCP para operações de sistema de arquivos.
Permite listar, ler, escrever e buscar arquivos dentro do workspace.
"""

import os
import re
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional

from .security import SecurityManager


class FileSystemMCP:
    """
    Servidor MCP de Sistema de Arquivos.
    Expõe operações de arquivo como ferramentas invocáveis pelo LLM.
    """
    
    # Limite de tamanho de arquivo para leitura (em bytes)
    MAX_FILE_SIZE = 1024 * 1024  # 1MB
    
    # Limite de resultados de busca
    MAX_SEARCH_RESULTS = 50
    
    def __init__(self, security_manager: SecurityManager):
        """
        Args:
            security_manager: Gerenciador de segurança para validação de caminhos.
        """
        self.security = security_manager
        self._current_cwd: Path = None  # Será sincronizado com terminal.cwd
    
    def set_cwd(self, cwd: Path):
        """Atualiza o diretório de trabalho atual (sincronizado com terminal)."""
        self._current_cwd = cwd
    
    @property
    def cwd(self) -> Path:
        """Retorna o diretório de trabalho atual para resolução de caminhos."""
        return self._current_cwd or (self.security.workspace if self.security.workspace else None)
    
    def list_directory(self, path: str = ".") -> Dict[str, Any]:
        """
        Lista o conteúdo de um diretório.
        
        Args:
            path: Caminho do diretório (relativo ao workspace ou absoluto).
            
        Returns:
            Dict com success, entries (lista de arquivos/pastas) ou error.
        """
        # Usa cwd atual para resolver caminhos relativos
        valid, error, resolved = self.security.validate_path(path, base_path=self.cwd)
        if not valid:
            return {"success": False, "error": error, "summary": f"ERRO DE ACESSO: {error}"}
        
        if not resolved.exists():
            return {"success": False, "error": f"Diretório não encontrado: {path}", "summary": f"ERRO: O diretório '{path}' não existe. Verifique o caminho."}
        
        if not resolved.is_dir():
            return {"success": False, "error": f"Não é um diretório: {path}", "summary": f"ERRO: '{path}' é um arquivo, não um diretório."}
        
        try:
            entries = []
            for item in sorted(resolved.iterdir()):
                entry = {
                    "name": item.name,
                    "path": self.security.get_relative_path(item),
                    "is_dir": item.is_dir(),
                }
                
                if item.is_file():
                    try:
                        stat = item.stat()
                        entry["size"] = stat.st_size
                        entry["modified"] = datetime.fromtimestamp(stat.st_mtime).isoformat()
                    except:
                        entry["size"] = 0
                
                # Indica se é pasta vazia ou tem conteúdo
                if item.is_dir():
                    try:
                        entry["has_children"] = any(item.iterdir())
                    except:
                        entry["has_children"] = False
                
                entries.append(entry)
            
            # Cria resumo textual para o LLM
            if entries:
                dirs = [e for e in entries if e["is_dir"]]
                files = [e for e in entries if not e["is_dir"]]
                summary = f"Diretório '{path}' contém {len(dirs)} pasta(s) e {len(files)} arquivo(s)."
            else:
                summary = f"Diretório '{path}' está VAZIO (0 itens)."
            
            return {
                "success": True,
                "path": self.security.get_relative_path(resolved),
                "entries": entries,
                "count": len(entries),
                "summary": summary
            }
        except PermissionError:
            return {"success": False, "error": f"Permissão negada: {path}", "summary": f"ERRO DE ACESSO: Sem permissão para acessar '{path}'."}
        except Exception as e:
            return {"success": False, "error": f"Erro ao listar diretório: {str(e)}", "summary": f"ERRO: Falha ao listar '{path}': {str(e)}"}
    
    def read_file(self, path: str, max_lines: Optional[int] = None) -> Dict[str, Any]:
        """
        Lê o conteúdo de um arquivo.
        
        Args:
            path: Caminho do arquivo.
            max_lines: Limite de linhas a retornar (None = todas).
            
        Returns:
            Dict com success, content, lines_count ou error.
        """
        # Usa cwd atual para resolver caminhos relativos
        valid, error, resolved = self.security.validate_path(path, base_path=self.cwd)
        if not valid:
            return {"success": False, "error": error, "summary": f"ERRO DE ACESSO: {error}"}
        
        if not resolved.exists():
            return {"success": False, "error": f"Arquivo não encontrado: {path}", "summary": f"ERRO: O arquivo '{path}' não existe."}
        
        if not resolved.is_file():
            return {"success": False, "error": f"Não é um arquivo: {path}", "summary": f"ERRO: '{path}' é um diretório, não um arquivo. Use list_directory."}
        
        # Verifica se é binário
        if self.security.is_binary_file(resolved):
            return {
                "success": False, 
                "error": f"Arquivo binário não pode ser lido: {path}",
                "is_binary": True,
                "size": resolved.stat().st_size
            }
        
        # Verifica tamanho
        file_size = resolved.stat().st_size
        if file_size > self.MAX_FILE_SIZE:
            return {
                "success": False,
                "error": f"Arquivo muito grande ({file_size/1024/1024:.1f}MB). Limite: {self.MAX_FILE_SIZE/1024/1024:.1f}MB",
                "size": file_size
            }
        
        try:
            # Tenta detectar encoding
            encodings = ["utf-8", "latin-1", "cp1252"]
            content = None
            used_encoding = None
            
            for enc in encodings:
                try:
                    content = resolved.read_text(encoding=enc)
                    used_encoding = enc
                    break
                except UnicodeDecodeError:
                    continue
            
            if content is None:
                return {"success": False, "error": "Não foi possível decodificar o arquivo"}
            
            lines = content.split("\n")
            total_lines = len(lines)
            
            # Limita linhas se solicitado
            if max_lines and max_lines < total_lines:
                content = "\n".join(lines[:max_lines])
                truncated = True
            else:
                truncated = False
            
            return {
                "success": True,
                "path": self.security.get_relative_path(resolved),
                "content": content,
                "lines_count": total_lines,
                "truncated": truncated,
                "encoding": used_encoding,
                "size": file_size,
                "summary": f"Arquivo '{path}' lido com sucesso ({total_lines} linhas, {file_size} bytes)."
            }
        except Exception as e:
            return {"success": False, "error": f"Erro ao ler arquivo: {str(e)}", "summary": f"ERRO: Falha ao ler '{path}': {str(e)}"}
    
    def write_file(self, path: str, content: str, create_dirs: bool = True) -> Dict[str, Any]:
        """
        Escreve conteúdo em um arquivo.
        
        Args:
            path: Caminho do arquivo.
            content: Conteúdo a escrever.
            create_dirs: Se True, cria diretórios pai se não existirem.
            
        Returns:
            Dict com success, path, size ou error.
        """
        # Usa cwd atual para resolver caminhos relativos
        valid, error, resolved = self.security.validate_path(path, base_path=self.cwd)
        if not valid:
            return {"success": False, "error": error}
        
        # Verifica se é sobrescrita
        is_overwrite = resolved.exists()
        
        try:
            # Cria diretórios pai se necessário
            if create_dirs:
                resolved.parent.mkdir(parents=True, exist_ok=True)
            elif not resolved.parent.exists():
                return {"success": False, "error": f"Diretório pai não existe: {resolved.parent}"}
            
            # Gera diff para feedback se for sobrescrita
            diff_text = ""
            if is_overwrite:
                try:
                    import difflib
                    old_content = resolved.read_text(encoding="utf-8", errors="ignore")
                    diff = difflib.unified_diff(
                        old_content.splitlines(),
                        content.splitlines(),
                        fromfile=f'a/{path}',
                        tofile=f'b/{path}',
                        lineterm=''
                    )
                    diff_text = '\n'.join(diff)
                except:
                    pass

            # Escreve o arquivo
            resolved.write_text(content, encoding="utf-8")
            
            # Para arquivos novos, enviamos um trecho do conteúdo para o chat
            preview = ""
            if not is_overwrite:
                preview = content[:500] + ("..." if len(content) > 500 else "")

            return {
                "success": True,
                "path": self.security.get_relative_path(resolved),
                "size": len(content.encode("utf-8")),
                "is_new": not is_overwrite,
                "backup_created": False,  # Backup feature removed
                "content": diff_text if diff_text else preview,
                "diff": diff_text
            }
        except Exception as e:
            return {"success": False, "error": f"Erro ao escrever arquivo: {str(e)}"}
    
    def search_files(
        self, 
        query: str, 
        path: str = ".", 
        file_pattern: str = "*",
        is_regex: bool = False,
        case_sensitive: bool = False
    ) -> Dict[str, Any]:
        """
        Busca por conteúdo em arquivos.
        
        Args:
            query: Texto ou regex a buscar.
            path: Diretório base para busca.
            file_pattern: Pattern glob para filtrar arquivos (ex: "*.py").
            is_regex: Se True, trata query como regex.
            case_sensitive: Se True, busca é case-sensitive.
            
        Returns:
            Dict com success, matches ou error.
        """
        # Usa cwd atual para resolver caminhos relativos
        valid, error, resolved = self.security.validate_path(path, base_path=self.cwd)
        if not valid:
            return {"success": False, "error": error}
        
        if not resolved.is_dir():
            return {"success": False, "error": f"Não é um diretório: {path}"}
        
        try:
            # Prepara o padrão de busca
            if is_regex:
                flags = 0 if case_sensitive else re.IGNORECASE
                pattern = re.compile(query, flags)
            else:
                if not case_sensitive:
                    query_lower = query.lower()
            
            matches = []
            files_searched = 0
            
            # Itera por arquivos usando glob
            for file_path in resolved.rglob(file_pattern):
                if not file_path.is_file():
                    continue
                
                # Ignora binários
                if self.security.is_binary_file(file_path):
                    continue
                
                # Limita busca
                if len(matches) >= self.MAX_SEARCH_RESULTS:
                    break
                
                files_searched += 1
                
                try:
                    content = file_path.read_text(encoding="utf-8", errors="ignore")
                    lines = content.split("\n")
                    
                    for line_num, line in enumerate(lines, 1):
                        found = False
                        
                        if is_regex:
                            match = pattern.search(line)
                            found = match is not None
                        else:
                            if case_sensitive:
                                found = query in line
                            else:
                                found = query_lower in line.lower()
                        
                        if found:
                            matches.append({
                                "file": self.security.get_relative_path(file_path),
                                "line_number": line_num,
                                "line_content": line.strip()[:200],  # Limita tamanho
                            })
                            
                            if len(matches) >= self.MAX_SEARCH_RESULTS:
                                break
                except:
                    continue
            
            return {
                "success": True,
                "query": query,
                "matches": matches,
                "count": len(matches),
                "files_searched": files_searched,
                "truncated": len(matches) >= self.MAX_SEARCH_RESULTS
            }
        except Exception as e:
            return {"success": False, "error": f"Erro na busca: {str(e)}"}
    
    def get_file_info(self, path: str) -> Dict[str, Any]:
        """
        Retorna informações sobre um arquivo ou diretório.
        
        Args:
            path: Caminho do arquivo/diretório.
            
        Returns:
            Dict com success e metadados ou error.
        """
        valid, error, resolved = self.security.validate_path(path)
        if not valid:
            return {"success": False, "error": error}
        
        if not resolved.exists():
            return {"success": False, "error": f"Não encontrado: {path}"}
        
        try:
            stat = resolved.stat()
            
            info = {
                "success": True,
                "path": self.security.get_relative_path(resolved),
                "name": resolved.name,
                "is_dir": resolved.is_dir(),
                "is_file": resolved.is_file(),
                "size": stat.st_size,
                "created": datetime.fromtimestamp(stat.st_ctime).isoformat(),
                "modified": datetime.fromtimestamp(stat.st_mtime).isoformat(),
            }
            
            if resolved.is_file():
                info["extension"] = resolved.suffix
                info["is_binary"] = self.security.is_binary_file(resolved)
            
            return info
        except Exception as e:
            return {"success": False, "error": f"Erro ao obter informações: {str(e)}"}
    
    def create_directory(self, path: str) -> Dict[str, Any]:
        """
        Cria um novo diretório.
        
        Args:
            path: Caminho do diretório a criar.
            
        Returns:
            Dict com success ou error.
        """
        valid, error, resolved = self.security.validate_path(path)
        if not valid:
            return {"success": False, "error": error}
        
        if resolved.exists():
            return {"success": False, "error": f"Já existe: {path}"}
        
        try:
            resolved.mkdir(parents=True, exist_ok=False)
            return {
                "success": True,
                "path": self.security.get_relative_path(resolved)
            }
        except Exception as e:
            return {"success": False, "error": f"Erro ao criar diretório: {str(e)}"}
    
    def delete_file(self, path: str) -> Dict[str, Any]:
        """
        Deleta um arquivo.
        NOTA: Esta operação requer confirmação do usuário no frontend.
        
        Args:
            path: Caminho do arquivo a deletar.
            
        Returns:
            Dict com success ou error.
        """
        valid, error, resolved = self.security.validate_path(path)
        if not valid:
            return {"success": False, "error": error}
        
        if not resolved.exists():
            return {"success": False, "error": f"Não encontrado: {path}"}
        
        if resolved.is_dir():
            return {"success": False, "error": "Use delete_directory para remover diretórios"}
        
        try:
            resolved.unlink()
            return {
                "success": True,
                "deleted": self.security.get_relative_path(resolved)
            }
        except Exception as e:
            return {"success": False, "error": f"Erro ao deletar: {str(e)}"}
    
    def move_file(self, source: str, destination: str) -> Dict[str, Any]:
        """
        Move ou renomeia um arquivo.
        
        Args:
            source: Caminho do arquivo de origem.
            destination: Caminho de destino.
            
        Returns:
            Dict com success ou error.
        """
        valid_src, error_src, resolved_src = self.security.validate_path(source)
        if not valid_src:
            return {"success": False, "error": f"Origem: {error_src}"}
        
        valid_dst, error_dst, resolved_dst = self.security.validate_path(destination)
        if not valid_dst:
            return {"success": False, "error": f"Destino: {error_dst}"}
        
        if not resolved_src.exists():
            return {"success": False, "error": f"Origem não encontrada: {source}"}
        
        if resolved_dst.exists():
            return {"success": False, "error": f"Destino já existe: {destination}"}
        
        try:
            import shutil
            shutil.move(str(resolved_src), str(resolved_dst))
            return {
                "success": True,
                "source": self.security.get_relative_path(resolved_src),
                "destination": self.security.get_relative_path(resolved_dst)
            }
        except Exception as e:
            return {"success": False, "error": f"Erro ao mover: {str(e)}"}


# Schema de ferramentas para o LLM
FILESYSTEM_TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "list_directory",
            "description": "Lista arquivos e pastas em um diretório. Use para explorar a estrutura do projeto.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Caminho do diretório (relativo ao workspace). Use '.' para o diretório atual."
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "read_file",
            "description": "Lê o conteúdo de um arquivo de texto/código. Não funciona com arquivos binários.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Caminho do arquivo a ler."
                    },
                    "max_lines": {
                        "type": "integer",
                        "description": "Número máximo de linhas a retornar. Omita para ler todo o arquivo."
                    }
                },
                "required": ["path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "write_file",
            "description": "Escreve conteúdo em um arquivo. Cria o arquivo se não existir, sobrescreve se existir.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Caminho do arquivo a escrever."
                    },
                    "content": {
                        "type": "string",
                        "description": "Conteúdo completo do arquivo."
                    }
                },
                "required": ["path", "content"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_files",
            "description": "Busca por texto em arquivos do projeto. Retorna linhas que contém o texto buscado.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Texto a buscar nos arquivos."
                    },
                    "path": {
                        "type": "string",
                        "description": "Diretório base para busca. Default: raiz do workspace."
                    },
                    "file_pattern": {
                        "type": "string",
                        "description": "Pattern glob para filtrar arquivos (ex: '*.py', '*.js'). Default: todos."
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_file_info",
            "description": "Retorna metadados de um arquivo ou diretório (tamanho, data de modificação, etc).",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Caminho do arquivo ou diretório."
                    }
                },
                "required": ["path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "create_directory",
            "description": "Cria um novo diretório no workspace.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Caminho do diretório a criar."
                    }
                },
                "required": ["path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "delete_file",
            "description": "Deleta um arquivo. USE COM CUIDADO - operação irreversível.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Caminho do arquivo a deletar."
                    }
                },
                "required": ["path"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "move_file",
            "description": "Move ou renomeia um arquivo.",
            "parameters": {
                "type": "object",
                "properties": {
                    "source": {
                        "type": "string",
                        "description": "Caminho do arquivo de origem."
                    },
                    "destination": {
                        "type": "string",
                        "description": "Caminho de destino (novo nome/localização)."
                    }
                },
                "required": ["source", "destination"]
            }
        }
    }
]
