"""
Luna Tools - Sistema de Ferramentas para Agent
-----------------------------------------------
Ferramentas que a Luna pode usar para interagir com o sistema.
"""

import os
import subprocess
import glob
from typing import Dict, Any, List
from pathlib import Path

# Diretório base permitido (segurança)
ALLOWED_BASE = Path(os.path.expanduser("~")).resolve()

def sanitize_path(path: str) -> Path:
    """Garante que o path está dentro do diretório permitido."""
    resolved = Path(path).resolve()
    if not str(resolved).startswith(str(ALLOWED_BASE)):
        raise PermissionError(f"Acesso negado: {path}")
    return resolved

# =============================================================================
# TOOLS DISPONÍVEIS
# =============================================================================

def run_command(command: str, cwd: str = None, background: bool = False) -> Dict[str, Any]:
    """
    Executa um comando no terminal.
    
    Args:
        command: Comando a executar
        cwd: Diretório de trabalho (opcional)
        background: Se True, não espera o comando terminar (ideal para apps GUI)
    
    Returns:
        {"success": bool, "output": str, "error": str, "message": str}
    """
    try:
        if background:
            # No Windows, usamos creationflags para desvincular o processo
            # e não abrir uma nova janela preta se não for necessário,
            # ou usamos 'start' para garantir que abra de forma independente.
            if os.name == 'nt':
                # CREATE_NEW_PROCESS_GROUP = 0x00000200
                # DETACHED_PROCESS = 0x00000008
                subprocess.Popen(
                    command,
                    shell=True,
                    cwd=cwd,
                    creationflags=subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.DETACHED_PROCESS,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
            else:
                subprocess.Popen(
                    command,
                    shell=True,
                    cwd=cwd,
                    start_new_session=True,
                    stdout=subprocess.DEVNULL,
                    stderr=subprocess.DEVNULL
                )
            return {
                "success": True, 
                "output": "", 
                "error": "", 
                "message": f"Comando iniciado em background: {command}"
            }

        result = subprocess.run(
            command,
            shell=True,
            capture_output=True,
            text=True,
            timeout=30,
            cwd=cwd
        )
        return {
            "success": result.returncode == 0,
            "output": result.stdout[:5000] if result.stdout else "",
            "error": result.stderr[:2000] if result.stderr else ""
        }
    except subprocess.TimeoutExpired:
        return {"success": False, "output": "", "error": "Comando expirou (timeout 30s). Para processos longos, use background=True."}
    except Exception as e:
        return {"success": False, "output": "", "error": str(e)}



def web_search(query: str) -> Dict[str, Any]:
    """
    Realiza uma pesquisa na web usando scraping do DuckDuckGo HTML (Backup Robusto).
    """
    try:
        # Tenta importar dependências necessárias
        try:
            import requests
            from bs4 import BeautifulSoup
        except ImportError:
            return {"success": False, "content": "Erro: requests e beautifulsoup4 são necessários.", "error": "Missing dependencies"}

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }
        url = "https://html.duckduckgo.com/html/"
        data = {'q': query}
        
        # Realiza a requisição
        res = requests.post(url, data=data, headers=headers, timeout=15)
        
        if res.status_code != 200:
             return {"success": False, "content": f"Erro na busca: Status {res.status_code}", "error": f"Status {res.status_code}"}

        soup = BeautifulSoup(res.text, "html.parser")
        results = []
        
        # Faz o parsing dos resultados
        for item in soup.find_all("div", class_="result"):
            try:
                title_tag = item.find("a", class_="result__a")
                snippet_tag = item.find("a", class_="result__snippet")
                
                if title_tag:
                    title = title_tag.get_text(strip=True)
                    link = title_tag["href"]
                    desc = snippet_tag.get_text(strip=True) if snippet_tag else "Sem descrição"
                    results.append(f"TITULO: {title}\nLINK: {link}\nRESUMO: {desc}")
                    if len(results) >= 5: break
            except: continue
        
        if not results:
            return {"success": True, "content": "Nenhum resultado encontrado.", "error": ""}
            
        content = "\n\n".join(results)
        return {"success": True, "content": content, "error": ""}
    except Exception as e:
        return {"success": False, "content": "", "error": str(e)}


def read_url(url: str) -> Dict[str, Any]:
    """
    Lê e extrai o conteúdo de texto de uma URL.
    
    Args:
        url: URL completa da página a ser lida
    
    Returns:
        {"success": bool, "content": str, "title": str, "error": str}
    """
    try:
        import requests
        from bs4 import BeautifulSoup
    except ImportError:
        return {"success": False, "content": "", "error": "Erro: requests e beautifulsoup4 são necessários."}

    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        }
        
        response = requests.get(url, headers=headers, timeout=20, allow_redirects=True)
        
        if response.status_code != 200:
            return {"success": False, "content": "", "error": f"Erro HTTP {response.status_code}"}
        
        soup = BeautifulSoup(response.text, "html.parser")
        
        # Remove elementos desnecessários e ruidosos
        for element in soup(["script", "style", "nav", "footer", "header", "aside", "noscript", "iframe", "svg", "form", "button"]):
            element.decompose()
        
        # Tenta pegar o título
        title = soup.find("title")
        title_text = title.get_text(strip=True) if title else "Sem título"
        
        # Extrai o conteúdo principal com estratégias de fallback
        main_content = None
        
        # Lista de seletores comuns para áreas de conteúdo (ordenados por probabilidade)
        selectors = [
            "article", "main", '[role="main"]', 
            "#content", ".content", ".post-content", ".entry-content", ".article-content",
            "#main-content", ".main-content", ".post-body", ".entry-body",
            ".chapter-content", ".reading-content" # Comum em sites de leitura
        ]
        
        for selector in selectors:
            main_content = soup.select_one(selector)
            if main_content and len(main_content.get_text(strip=True)) > 200:
                break
        
        # Se não encontrou área principal robusta, usa o body
        if not main_content:
            main_content = soup.find("body")
        
        if not main_content:
            return {"success": False, "content": "", "error": "Não foi possível extrair conteúdo da página"}
        
        # Extrai texto limpo
        text = main_content.get_text(separator="\n", strip=True)
        
        # Limpa linhas vazias múltiplas e excesso de espaços
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        clean_text = "\n".join(lines)
        
        # Aumenta limite para suportar capítulos longos (50k caracteres)
        MAX_CHARS = 50000
        if len(clean_text) > MAX_CHARS:
            clean_text = clean_text[:MAX_CHARS] + "\n\n... [Conteúdo muito longo, truncado para 50k caracteres]"
        
        return {
            "success": True,
            "title": title_text,
            "content": clean_text,
            "error": ""
        }
    except requests.exceptions.Timeout:
        return {"success": False, "content": "", "error": "Timeout ao acessar a URL"}
    except requests.exceptions.RequestException as e:
        return {"success": False, "content": "", "error": f"Erro de conexão: {str(e)}"}
    except Exception as e:
        return {"success": False, "content": "", "error": str(e)}


# =============================================================================
# CANVAS/DOCUMENT TOOLS (Chamam API do memory_server)
# =============================================================================

import requests

MEMORY_SERVER_URL = "http://127.0.0.1:8001"

def create_document(title: str, content: str = "") -> Dict[str, Any]:
    """
    Cria um novo documento no Canvas.
    
    Args:
        title: Título do documento
        content: Conteúdo inicial (opcional)
    
    Returns:
        {"success": bool, "document_id": str, "message": str}
    """
    try:
        response = requests.post(
            f"{MEMORY_SERVER_URL}/documents",
            json={"title": title, "content": content},
            timeout=10
        )
        data = response.json()
        if data.get("success"):
            doc = data.get("document", {})
            return {
                "success": True,
                "document_id": doc.get("id"),
                "message": f"Documento '{title}' criado com sucesso!"
            }
        return {"success": False, "error": data.get("error", "Erro desconhecido")}
    except Exception as e:
        return {"success": False, "error": str(e)}

def write_document(document_id: str, content: str) -> Dict[str, Any]:
    """
    Escreve/substitui o conteúdo de um documento existente.
    
    Args:
        document_id: ID do documento
        content: Novo conteúdo completo
    
    Returns:
        {"success": bool, "message": str}
    """
    try:
        response = requests.put(
            f"{MEMORY_SERVER_URL}/documents/{document_id}",
            json={"content": content},
            timeout=10
        )
        data = response.json()
        if data.get("success"):
            return {"success": True, "message": "Documento atualizado com sucesso!"}
        return {"success": False, "error": data.get("error", "Documento não encontrado")}
    except Exception as e:
        return {"success": False, "error": str(e)}

def append_document(document_id: str, content: str) -> Dict[str, Any]:
    """
    Adiciona conteúdo ao final de um documento existente.
    
    Args:
        document_id: ID do documento
        content: Conteúdo a adicionar
    
    Returns:
        {"success": bool, "message": str}
    """
    try:
        # First, get current content
        get_response = requests.get(
            f"{MEMORY_SERVER_URL}/documents/{document_id}",
            timeout=10
        )
        get_data = get_response.json()
        if not get_data.get("success"):
            return {"success": False, "error": "Documento não encontrado"}
        
        current_content = get_data.get("document", {}).get("content", "")
        new_content = current_content + "\n\n" + content if current_content else content
        
        # Then update
        response = requests.put(
            f"{MEMORY_SERVER_URL}/documents/{document_id}",
            json={"content": new_content},
            timeout=10
        )
        data = response.json()
        if data.get("success"):
            return {"success": True, "message": "Conteúdo adicionado ao documento!"}
        return {"success": False, "error": data.get("error", "Erro ao atualizar")}
    except Exception as e:
        return {"success": False, "error": str(e)}

def read_document(document_id: str = None) -> Dict[str, Any]:
    """
    Lê o conteúdo de um documento. Se document_id não for fornecido, lê o documento ativo.
    
    Args:
        document_id: ID do documento (opcional, usa ativo se omitido)
    
    Returns:
        {"success": bool, "title": str, "content": str}
    """
    try:
        if document_id:
            url = f"{MEMORY_SERVER_URL}/documents/{document_id}"
        else:
            url = f"{MEMORY_SERVER_URL}/documents/active"
        
        response = requests.get(url, timeout=10)
        data = response.json()
        
        if data.get("success"):
            doc = data.get("document")
            if not doc:
                return {"success": True, "content": "", "message": "Nenhum documento ativo no momento."}
            return {
                "success": True,
                "document_id": doc.get("id"),
                "title": doc.get("title", "Sem título"),
                "content": doc.get("content", "")
            }
        return {"success": False, "error": data.get("error", "Documento não encontrado")}
    except Exception as e:
        return {"success": False, "error": str(e)}

def list_documents() -> Dict[str, Any]:
    """
    Lista todos os documentos disponíveis no Canvas.
    
    Returns:
        {"success": bool, "documents": [{"id": str, "title": str, "updated_at": str}]}
    """
    try:
        response = requests.get(f"{MEMORY_SERVER_URL}/documents", timeout=10)
        data = response.json()
        if data.get("success"):
            docs = data.get("documents", [])
            if not docs:
                return {"success": True, "content": "Nenhum documento encontrado no Canvas."}
            doc_list = "\n".join([f"- {d['title']} (ID: {d['id']})" for d in docs])
            return {"success": True, "content": f"Documentos disponíveis:\n{doc_list}"}
        return {"success": False, "error": data.get("error", "Erro ao listar")}
    except Exception as e:
        return {"success": False, "error": str(e)}



# =============================================================================
# REGISTRY DE TOOLS
# =============================================================================

TOOLS = {
    "run_command": {
        "function": run_command,
        "description": "Executa um comando no terminal",
        "parameters": {
            "command": {"type": "string", "description": "Comando a executar", "required": True},
            "cwd": {"type": "string", "description": "Diretório de trabalho", "required": False},
            "background": {"type": "boolean", "description": "Se True, executa em background sem esperar (ideal para apps GUI/servidores)", "required": False}
        }
    },
    "web_search": {
        "function": web_search,
        "description": "Pesquisa na internet por informações atualizadas, documentação e tendências tecnológicas",
        "parameters": {
            "query": {"type": "string", "description": "Termo de busca detalhado", "required": True}
        }
    },
    "read_url": {
        "function": read_url,
        "description": "Lê e extrai o conteúdo de texto de uma URL/página web específica. Use quando precisar acessar o conteúdo de um link.",
        "parameters": {
            "url": {"type": "string", "description": "URL completa da página (ex: https://exemplo.com/pagina)", "required": True}
        }
    },
    "add_knowledge": {
        "function": None, # Será mapeado no execute_tool para chamar o memory_server se necessário, ou injetado aqui
        "description": "Salva um novo padrão de código ou conhecimento técnico na base RAG da Luna",
        "parameters": {
            "title": {"type": "string", "description": "Título curto do conhecimento (ex: Modern Tkinter Button)", "required": True},
            "content": {"type": "string", "description": "O código ou explicação técnica detalhada", "required": True},
            "tags": {"type": "string", "description": "Tags separadas por vírgula (ex: ui, python, aesthetic)", "required": False}
        }
    },
    "think": {
        "function": lambda detailed_thought: {"success": True, "content": "Pensamento registrado."},
        "description": "MONÓLOGO INTERNO. Use IMEDIATAMENTE após o pedido do usuário para planejar, analisar e decidir como agir. Não fale no chat antes de usar esta ferramenta se o problema for complexo.",
        "parameters": {
            "detailed_thought": {"type": "string", "description": "Seu pensamento puro e profundo. Decida aqui se precisará de outras ferramentas.", "required": True}
        }
    },
    "screen_capture": {
        "function": None, # Injetado no execute_tool via pc_observer
        "description": "Captura uma imagem da tela atual do usuário. Use para ver o que ele está vendo, ler janelas, entender o contexto visual ou quando ele perguntar 'o que tem na minha tela?'.",
        "parameters": {}
    },
    "get_running_apps": {
        "function": None,
        "description": "Lista todas as janelas/aplicativos abertos e visíveis no PC do usuário. Use quando ele perguntar 'o que está aberto?', 'quais apps estão rodando?' ou quiser saber o contexto geral do desktop.",
        "parameters": {}
    },
    # === CANVAS/DOCUMENT TOOLS ===
    "create_document": {
        "function": create_document,
        "description": "Cria um novo documento no Canvas de escrita. Use quando o usuário pedir para escrever algo longo (artigo, história, livro, documento).",
        "parameters": {
            "title": {"type": "string", "description": "Título do documento", "required": True},
            "content": {"type": "string", "description": "Conteúdo inicial do documento (opcional)", "required": False}
        }
    },
    "write_document": {
        "function": write_document,
        "description": "Escreve/substitui o conteúdo completo de um documento existente no Canvas.",
        "parameters": {
            "document_id": {"type": "string", "description": "ID do documento", "required": True},
            "content": {"type": "string", "description": "Novo conteúdo completo do documento", "required": True}
        }
    },
    "append_document": {
        "function": append_document,
        "description": "Adiciona conteúdo ao final de um documento existente. Ideal para continuar escrevendo um texto longo.",
        "parameters": {
            "document_id": {"type": "string", "description": "ID do documento", "required": True},
            "content": {"type": "string", "description": "Conteúdo a adicionar ao final", "required": True}
        }
    },
    "read_document": {
        "function": read_document,
        "description": "Lê o conteúdo de um documento para consultar o que já foi escrito. Use antes de continuar escrevendo.",
        "parameters": {
            "document_id": {"type": "string", "description": "ID do documento (opcional, usa o documento ativo se omitido)", "required": False}
        }
    },
    "list_documents": {
        "function": list_documents,
        "description": "Lista todos os documentos disponíveis no Canvas.",
        "parameters": {}
    }
}


def execute_tool(tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
    """Executa uma tool pelo nome."""
    if tool_name not in TOOLS:
        return {"success": False, "error": f"Tool desconhecida: {tool_name}"}
    
    tool = TOOLS[tool_name]
    try:
        print(f"[DEBUG] Executando tool: {tool_name} com args: {args}")
        # Failsafe para ferramentas de memória que residem no memory_server
        if tool_name == "add_knowledge":
            from memory_server import save_technical_knowledge
            success = save_technical_knowledge(**args)
            return {"success": success, "message": "Conhecimento técnico indexado com sucesso!" if success else "Falha ao indexar."}
        
        if tool_name == "screen_capture":
            try:
                from server.pc_observer import observer
            except ImportError:
                from pc_observer import observer
            
            img_b64 = observer.capture_screen()
            if img_b64:
                return {"success": True, "image_url": f"data:image/jpeg;base64,{img_b64}", "content": "[FOTO DA TELA CAPTURADA. ANALISE A IMAGEM AGORA.]"}
            else:
                return {"success": False, "error": "Falha ao capturar a tela."}
        
        if tool_name == "get_running_apps":
            try:
                from server.pc_observer import observer
            except ImportError:
                from pc_observer import observer
            
            apps = observer.get_open_windows()
            return {"success": True, "content": f"Janelas Abertas:\n- " + "\n- ".join(apps)}
        


        result = tool["function"](**args)
        return result
    except Exception as e:
        return {"success": False, "error": str(e)}


def get_tools_schema() -> List[Dict]:
    """Retorna o schema das tools para o modelo."""
    schema = []
    for name, tool in TOOLS.items():
        schema.append({
            "type": "function",
            "function": {
                "name": name,
                "description": tool["description"],
                "parameters": {
                    "type": "object",
                    "properties": {
                        param_name: {
                            "type": param_info["type"],
                            "description": param_info["description"]
                        }
                        for param_name, param_info in tool["parameters"].items()
                    },
                    "required": [
                        param_name
                        for param_name, param_info in tool["parameters"].items()
                        if param_info.get("required", False)
                    ]
                }
            }
        })
    return schema
