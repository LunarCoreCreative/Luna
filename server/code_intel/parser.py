"""
Code Parser with Tree-sitter
-----------------------------
Parser AST usando Tree-sitter para extrair símbolos de código.
"""

from dataclasses import dataclass, field
from typing import List, Dict, Optional, Tuple
from pathlib import Path
import os

# Tentar importar tree-sitter (pode não estar instalado)
try:
    import tree_sitter_python as tspython
    import tree_sitter_javascript as tsjavascript
    import tree_sitter_typescript as tstypescript
    from tree_sitter import Language, Parser
    TREE_SITTER_AVAILABLE = True
except ImportError:
    TREE_SITTER_AVAILABLE = False
    print("[CodeParser] Tree-sitter não disponível. Usando fallback regex.")


@dataclass
class Symbol:
    """Representa um símbolo de código (função, classe, método, etc.)."""
    name: str
    kind: str  # 'function', 'class', 'method', 'variable', 'import'
    line_start: int
    line_end: int
    signature: str = ""
    docstring: str = ""
    children: List['Symbol'] = field(default_factory=list)
    
    def to_dict(self) -> dict:
        return {
            "name": self.name,
            "kind": self.kind,
            "line_start": self.line_start,
            "line_end": self.line_end,
            "signature": self.signature,
            "docstring": self.docstring[:200] if self.docstring else "",
            "children": [c.to_dict() for c in self.children]
        }


class CodeParser:
    """Parser de código usando Tree-sitter."""
    
    # Extensões suportadas
    SUPPORTED_EXTENSIONS = {
        '.py': 'python',
        '.js': 'javascript',
        '.jsx': 'javascript',
        '.ts': 'typescript',
        '.tsx': 'typescript',
    }
    
    def __init__(self):
        self.parsers: Dict[str, Parser] = {}
        self._init_parsers()
    
    def _init_parsers(self):
        """Inicializa parsers para cada linguagem."""
        if not TREE_SITTER_AVAILABLE:
            return
            
        try:
            # Python
            py_lang = Language(tspython.language())
            py_parser = Parser(py_lang)
            self.parsers['python'] = py_parser
            
            # JavaScript
            js_lang = Language(tsjavascript.language())
            js_parser = Parser(js_lang)
            self.parsers['javascript'] = js_parser
            
            # TypeScript
            ts_lang = Language(tstypescript.language_typescript())
            ts_parser = Parser(ts_lang)
            self.parsers['typescript'] = ts_parser
            
        except Exception as e:
            print(f"[CodeParser] Erro ao inicializar parsers: {e}")
    
    def get_language(self, filepath: str) -> Optional[str]:
        """Retorna a linguagem baseada na extensão do arquivo."""
        ext = Path(filepath).suffix.lower()
        return self.SUPPORTED_EXTENSIONS.get(ext)
    
    def parse_file(self, filepath: str, content: Optional[str] = None) -> List[Symbol]:
        """
        Faz parse de um arquivo e retorna lista de símbolos.
        
        Args:
            filepath: Caminho do arquivo
            content: Conteúdo do arquivo (opcional, será lido se não fornecido)
            
        Returns:
            Lista de símbolos encontrados
        """
        lang = self.get_language(filepath)
        if not lang:
            return []
        
        if content is None:
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
            except Exception:
                return []
        
        # Usa tree-sitter se disponível
        if TREE_SITTER_AVAILABLE and lang in self.parsers:
            return self._parse_with_treesitter(content, lang)
        
        # Fallback para regex
        return self._parse_with_regex(content, lang)
    
    def _parse_with_treesitter(self, content: str, lang: str) -> List[Symbol]:
        """Parse usando Tree-sitter."""
        parser = self.parsers.get(lang)
        if not parser:
            return []
        
        try:
            tree = parser.parse(bytes(content, 'utf-8'))
            root = tree.root_node
            
            if lang == 'python':
                return self._extract_python_symbols(root, content)
            elif lang in ('javascript', 'typescript'):
                return self._extract_js_symbols(root, content)
            
            return []
        except Exception as e:
            print(f"[CodeParser] Erro no parse: {e}")
            return []
    
    def _extract_python_symbols(self, node, content: str) -> List[Symbol]:
        """Extrai símbolos de código Python."""
        symbols = []
        
        def extract(node, parent_class=None):
            if node.type == 'function_definition':
                name_node = node.child_by_field_name('name')
                if name_node:
                    name = content[name_node.start_byte:name_node.end_byte]
                    
                    # Pega a assinatura
                    params_node = node.child_by_field_name('parameters')
                    sig = f"def {name}("
                    if params_node:
                        sig += content[params_node.start_byte:params_node.end_byte][1:-1]  # Remove ()
                    sig += ")"
                    
                    # Return type
                    return_node = node.child_by_field_name('return_type')
                    if return_node:
                        sig += f" -> {content[return_node.start_byte:return_node.end_byte]}"
                    
                    # Docstring
                    docstring = ""
                    body = node.child_by_field_name('body')
                    if body and body.child_count > 0:
                        first_stmt = body.children[0]
                        if first_stmt.type == 'expression_statement':
                            expr = first_stmt.children[0] if first_stmt.child_count > 0 else None
                            if expr and expr.type == 'string':
                                docstring = content[expr.start_byte:expr.end_byte].strip('"""\'\'\'')
                    
                    kind = 'method' if parent_class else 'function'
                    symbol = Symbol(
                        name=name,
                        kind=kind,
                        line_start=node.start_point[0] + 1,
                        line_end=node.end_point[0] + 1,
                        signature=sig,
                        docstring=docstring
                    )
                    symbols.append(symbol)
                    
            elif node.type == 'class_definition':
                name_node = node.child_by_field_name('name')
                if name_node:
                    name = content[name_node.start_byte:name_node.end_byte]
                    
                    # Herança
                    bases = []
                    args = node.child_by_field_name('superclasses')
                    if args:
                        for child in args.children:
                            if child.type not in ('(', ')', ','):
                                bases.append(content[child.start_byte:child.end_byte])
                    
                    sig = f"class {name}"
                    if bases:
                        sig += f"({', '.join(bases)})"
                    
                    symbol = Symbol(
                        name=name,
                        kind='class',
                        line_start=node.start_point[0] + 1,
                        line_end=node.end_point[0] + 1,
                        signature=sig
                    )
                    
                    # Extrai métodos da classe
                    body = node.child_by_field_name('body')
                    if body:
                        for child in body.children:
                            if child.type == 'function_definition':
                                extract(child, parent_class=name)
                                # Adiciona como filho
                                if symbols:
                                    method_sym = symbols[-1]
                                    symbol.children.append(method_sym)
                                    symbols.pop()
                    
                    symbols.append(symbol)
            
            # Recursão
            for child in node.children:
                if child.type not in ('function_definition', 'class_definition'):
                    extract(child, parent_class)
        
        extract(node)
        return symbols
    
    def _extract_js_symbols(self, node, content: str) -> List[Symbol]:
        """Extrai símbolos de código JavaScript/TypeScript."""
        symbols = []
        
        def extract(node):
            # Funções
            if node.type in ('function_declaration', 'function'):
                name_node = node.child_by_field_name('name')
                if name_node:
                    name = content[name_node.start_byte:name_node.end_byte]
                    symbol = Symbol(
                        name=name,
                        kind='function',
                        line_start=node.start_point[0] + 1,
                        line_end=node.end_point[0] + 1,
                        signature=f"function {name}()"
                    )
                    symbols.append(symbol)
            
            # Arrow functions com const/let
            elif node.type == 'lexical_declaration':
                for child in node.children:
                    if child.type == 'variable_declarator':
                        name_node = child.child_by_field_name('name')
                        value_node = child.child_by_field_name('value')
                        if name_node and value_node and value_node.type == 'arrow_function':
                            name = content[name_node.start_byte:name_node.end_byte]
                            symbol = Symbol(
                                name=name,
                                kind='function',
                                line_start=node.start_point[0] + 1,
                                line_end=node.end_point[0] + 1,
                                signature=f"const {name} = () => "
                            )
                            symbols.append(symbol)
            
            # Classes
            elif node.type == 'class_declaration':
                name_node = node.child_by_field_name('name')
                if name_node:
                    name = content[name_node.start_byte:name_node.end_byte]
                    symbol = Symbol(
                        name=name,
                        kind='class',
                        line_start=node.start_point[0] + 1,
                        line_end=node.end_point[0] + 1,
                        signature=f"class {name}"
                    )
                    symbols.append(symbol)
            
            # Recursão
            for child in node.children:
                extract(child)
        
        extract(node)
        return symbols
    
    def _parse_with_regex(self, content: str, lang: str) -> List[Symbol]:
        """Fallback: parse usando regex simples."""
        import re
        symbols = []
        lines = content.split('\n')
        
        if lang == 'python':
            func_pattern = re.compile(r'^(\s*)def\s+(\w+)\s*\((.*?)\)')
            class_pattern = re.compile(r'^(\s*)class\s+(\w+)')
            
            for i, line in enumerate(lines):
                func_match = func_pattern.match(line)
                if func_match:
                    indent = len(func_match.group(1))
                    name = func_match.group(2)
                    params = func_match.group(3)
                    symbols.append(Symbol(
                        name=name,
                        kind='method' if indent > 0 else 'function',
                        line_start=i + 1,
                        line_end=i + 1,
                        signature=f"def {name}({params})"
                    ))
                    continue
                
                class_match = class_pattern.match(line)
                if class_match:
                    name = class_match.group(2)
                    symbols.append(Symbol(
                        name=name,
                        kind='class',
                        line_start=i + 1,
                        line_end=i + 1,
                        signature=f"class {name}"
                    ))
        
        elif lang in ('javascript', 'typescript'):
            func_pattern = re.compile(r'(?:function|const|let|var)\s+(\w+)\s*[=\(]')
            class_pattern = re.compile(r'class\s+(\w+)')
            
            for i, line in enumerate(lines):
                func_match = func_pattern.search(line)
                if func_match:
                    name = func_match.group(1)
                    symbols.append(Symbol(
                        name=name,
                        kind='function',
                        line_start=i + 1,
                        line_end=i + 1,
                        signature=f"function {name}()"
                    ))
                    continue
                
                class_match = class_pattern.search(line)
                if class_match:
                    name = class_match.group(1)
                    symbols.append(Symbol(
                        name=name,
                        kind='class',
                        line_start=i + 1,
                        line_end=i + 1,
                        signature=f"class {name}"
                    ))
        
        return symbols
    
    def get_file_outline(self, filepath: str, content: Optional[str] = None) -> str:
        """
        Gera um outline textual do arquivo.
        
        Returns:
            String com o outline do arquivo
        """
        symbols = self.parse_file(filepath, content)
        if not symbols:
            return ""
        
        lines = []
        for sym in symbols:
            prefix = "  " if sym.kind == 'method' else ""
            icon = "📦" if sym.kind == 'class' else "🔹" if sym.kind == 'method' else "⚡"
            lines.append(f"{prefix}{icon} {sym.signature} (L{sym.line_start}-{sym.line_end})")
            
            for child in sym.children:
                lines.append(f"    🔹 {child.signature} (L{child.line_start}-{child.line_end})")
        
        return "\n".join(lines)
