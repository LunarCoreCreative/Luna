"""
Code Patcher
------------
Implementa o protocolo de edição Search/Replace para modificações cirúrgicas.
"""

import re
from typing import List, Tuple, Optional
import difflib

class CodePatcher:
    """
    Realiza edições cirúrgicas em arquivos usando o protocolo Search/Replace.
    """
    
    @staticmethod
    def apply_search_replace(content: str, search_block: str, replace_block: str) -> Tuple[bool, str, str]:
        """
        Tenta aplicar um bloco de substituição no conteúdo.
        
        Args:
            content: Conteúdo original do arquivo
            search_block: Bloco de texto a ser procurado
            replace_block: Bloco de texto substituto
            
        Returns:
            Tuple (sucesso, novo_conteúdo, mensagem_erro)
        """
        # Limpa espaços em branco extras nas pontas
        search_block = search_block.strip('\n')
        replace_block = replace_block.strip('\n')
        
        if not search_block:
            # Se search_block estiver vazio, podemos tentar um append ou acusar erro
            return False, content, "Bloco de busca vazio."
            
        # 1. Tentativa exata
        if search_block in content:
            new_content = content.replace(search_block, replace_block, 1)
            return True, new_content, ""
            
        # 2. Tentativa ignorando espaços em branco nas pontas de cada linha
        search_lines = [line.strip() for line in search_block.split('\n')]
        content_lines = content.split('\n')
        
        # Busca por sequência de linhas que coincidem ignorando espaços
        for i in range(len(content_lines) - len(search_lines) + 1):
            match = True
            for j in range(len(search_lines)):
                if content_lines[i + j].strip() != search_lines[j]:
                    match = False
                    break
            
            if match:
                # Encontramos! Agora precisamos preservar a indentação original se possível
                # ou usar a nova. Vamos substituir o bloco mantendo as linhas exteriores.
                new_lines = content_lines[:i] + replace_block.split('\n') + content_lines[i + len(search_lines):]
                return True, '\n'.join(new_lines), ""
        
        # 3. Tentativa com Fuzzy Match (difflib)
        # Se o bloco for grande, tentamos encontrar a parte mais parecida
        return False, content, "Não foi possível encontrar o bloco de busca no arquivo. Certifique-se de que o texto de busca é IDÊNTICO a uma parte do arquivo."

    @staticmethod
    def find_best_match(content: str, search_block: str) -> Optional[int]:
        """
        Encontra o melhor índice de início do bloco usando difflib para casos difíceis.
        """
        search_lines = search_block.split('\n')
        content_lines = content.split('\n')
        
        # Implementação futura para casos onde o LLM erra levemente a indentação
        return None

class SearchReplaceTool:
    """
    Helper para o agente usar o patcher.
    """
    
    @staticmethod
    def edit_file(filepath: str, search_block: str, replace_block: str) -> dict:
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()
                
            success, new_content, error = CodePatcher.apply_search_replace(content, search_block, replace_block)
            
            if success:
                # Gera o diff para feedback visual
                diff = difflib.unified_diff(
                    content.splitlines(),
                    new_content.splitlines(),
                    fromfile=f'a/{filepath}',
                    tofile=f'b/{filepath}',
                    lineterm=''
                )
                diff_text = '\n'.join(diff)
                
                with open(filepath, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                return {
                    "success": True, 
                    "message": f"Arquivo {filepath} editado com sucesso.",
                    "content": diff_text if diff_text else "Nenhuma mudança textual detectada (apenas espaços ou similar).",
                    "diff": diff_text
                }
            else:
                return {"success": False, "error": error}
                
        except Exception as e:
            return {"success": False, "error": str(e)}
