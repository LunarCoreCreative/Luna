"""
Luna Tools - Sistema de Ferramentas para Agent
-----------------------------------------------
Ferramentas que a Luna pode usar para interagir com o sistema.
"""

import os
import subprocess
from typing import Dict, Any, List
from pathlib import Path

# Load environment variables early
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

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

# Fila global de eventos de aprendizado (para notificação no frontend)
_learning_events = []

def get_learning_events() -> list:
    """Retorna e limpa a fila de eventos de aprendizado."""
    global _learning_events
    events = _learning_events.copy()
    _learning_events = []
    return events

def _add_learning_event(title: str, source: str) -> None:
    """Adiciona um evento de aprendizado à fila."""
    global _learning_events
    _learning_events.append({"title": title, "source": source})

def _save_searched_knowledge(query: str, content: str, source: str) -> None:
    """
    Salva conhecimento obtido via pesquisa web automaticamente.
    Chamado internamente após pesquisas bem-sucedidas.
    """
    try:
        from .memory import save_technical_knowledge, is_duplicate_knowledge
        
        # Cria um resumo do conhecimento
        title = f"Pesquisa: {query[:50]}..."
        
        # Limita o conteúdo para evitar salvar demais
        max_content = content[:2000] if len(content) > 2000 else content
        full_text = f"{query} {max_content}"
        
        # Verifica se já existe algo similar
        if is_duplicate_knowledge(full_text, threshold=0.8):
            print(f"[SEARCH-LEARN] Conhecimento similar já existe, pulando...")
            return
        
        tags = f"web_search, {source}, auto_learned"
        if save_technical_knowledge(title=title, content=max_content, tags=tags):
            print(f"[SEARCH-LEARN] ✓ Conhecimento salvo: {title}")
            # Adiciona evento para notificação no frontend
            _add_learning_event(title, source)
    except Exception as e:
        print(f"[SEARCH-LEARN] Erro ao salvar: {e}")

def run_command(command: str, cwd: str = None, background: bool = False) -> Dict[str, Any]:
    """
    Executa um comando no terminal.
    """
    try:
        if background:
            if os.name == 'nt':
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
    Realiza uma pesquisa na web usando múltiplos provedores em hierarquia:
    1. Tavily API (primário, otimizado para LLMs)
    2. SearXNG (fallback, meta-search open source)
    3. DuckDuckGo/Bing/Google scraping (último recurso)
    """
    import os
    
    # ==========================================================================
    # PROVEDOR 1: TAVILY (API otimizada para LLMs)
    # ==========================================================================
    tavily_key = os.getenv("TAVILY_API_KEY")
    if tavily_key:
        try:
            from tavily import TavilyClient
            client = TavilyClient(api_key=tavily_key)
            response = client.search(
                query=query,
                search_depth="basic",
                max_results=5,
                include_answer=True
            )
            
            results = []
            # Incluir answer se disponível
            if response.get("answer"):
                results.append(f"RESUMO DA PESQUISA:\n{response['answer']}\n")
            
            for r in response.get("results", []):
                title = r.get("title", "Sem título")
                url = r.get("url", "")
                content = r.get("content", "Sem descrição")
                results.append(f"TITULO: {title}\nLINK: {url}\nRESUMO: {content}")
            
            if results:
                print(f"[DEBUG] Tavily search successful: {len(results)} results")
                content = "\n\n".join(results)
                # Salva conhecimento pesquisado automaticamente
                _save_searched_knowledge(query, content, "tavily")
                return {"success": True, "content": content, "error": "", "source": "tavily"}
        except ImportError:
            print("[DEBUG] Tavily not installed, trying next provider")
        except Exception as e:
            print(f"[DEBUG] Tavily search failed: {e}")
    
    # ==========================================================================
    # PROVEDOR 2: SEARXNG (Meta-search open source)
    # ==========================================================================
    try:
        import requests
        # Instâncias públicas de SearXNG (rotação para evitar rate limiting)
        searxng_instances = [
            "https://searx.be",
            "https://search.sapti.me",
            "https://searx.tiekoetter.com",
        ]
        
        for instance in searxng_instances:
            try:
                response = requests.get(
                    f"{instance}/search",
                    params={
                        "q": query,
                        "format": "json",
                        "language": "pt-BR",
                        "categories": "general"
                    },
                    headers={"User-Agent": "Luna AI Assistant/1.0"},
                    timeout=10
                )
                
                if response.status_code == 200:
                    data = response.json()
                    results = []
                    for r in data.get("results", [])[:5]:
                        title = r.get("title", "Sem título")
                        url = r.get("url", "")
                        content = r.get("content", "Sem descrição")
                        results.append(f"TITULO: {title}\nLINK: {url}\nRESUMO: {content}")
                    
                    if results:
                        print(f"[DEBUG] SearXNG ({instance}) successful: {len(results)} results")
                        content = "\n\n".join(results)
                        _save_searched_knowledge(query, content, "searxng")
                        return {"success": True, "content": content, "error": "", "source": "searxng"}
            except requests.exceptions.Timeout:
                continue
            except Exception as e:
                print(f"[DEBUG] SearXNG {instance} failed: {e}")
                continue
    except Exception as e:
        print(f"[DEBUG] SearXNG search failed: {e}")
    
    # ==========================================================================
    # PROVEDOR 3: DUCKDUCKGO LIBRARY (suporta ddgs ou duckduckgo_search)
    # ==========================================================================
    try:
        # Try new package name first
        try:
            from ddgs import DDGS
        except ImportError:
            from duckduckgo_search import DDGS
        
        results = []
        with DDGS() as ddgs:
            for r in ddgs.text(query, max_results=5):
                title = r.get("title", "Sem título")
                link = r.get("href", r.get("link", ""))
                body = r.get("body", "Sem descrição")
                results.append(f"TITULO: {title}\nLINK: {link}\nRESUMO: {body}")
        
        if results:
            print(f"[DEBUG] DuckDuckGo search successful: {len(results)} results")
            return {"success": True, "content": "\n\n".join(results), "error": "", "source": "duckduckgo"}
    except Exception as e:
        print(f"[DEBUG] DDG search failed: {e}")
    
    # ==========================================================================
    # PROVEDOR 4: BING SCRAPING (último recurso)
    # ==========================================================================
    try:
        import requests
        from bs4 import BeautifulSoup
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        }
        
        bing_url = f"https://www.bing.com/search?q={requests.utils.quote(query)}&setlang=pt-BR"
        res = requests.get(bing_url, headers=headers, timeout=15)
        
        if res.status_code == 200:
            soup = BeautifulSoup(res.text, "html.parser")
            results = []
            
            for item in soup.select("li.b_algo")[:5]:
                try:
                    title_tag = item.select_one("h2 a")
                    snippet_tag = item.select_one(".b_caption p")
                    
                    if title_tag:
                        title = title_tag.get_text(strip=True)
                        link = title_tag.get("href", "")
                        desc = snippet_tag.get_text(strip=True) if snippet_tag else "Sem descrição"
                        results.append(f"TITULO: {title}\nLINK: {link}\nRESUMO: {desc}")
                except:
                    continue
            
            if results:
                print(f"[DEBUG] Bing scraping successful: {len(results)} results")
                return {"success": True, "content": "\n\n".join(results), "error": "", "source": "bing"}
    except Exception as e:
        print(f"[DEBUG] Bing scraping failed: {e}")
    
    # ==========================================================================
    # PROVEDOR 5: GOOGLE SCRAPING (último recurso absoluto)
    # ==========================================================================
    try:
        import requests
        from bs4 import BeautifulSoup
        
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
            "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
        }
        
        google_url = f"https://www.google.com/search?q={requests.utils.quote(query)}&hl=pt-BR"
        res = requests.get(google_url, headers=headers, timeout=15)
        
        if res.status_code == 200:
            soup = BeautifulSoup(res.text, "html.parser")
            results = []
            
            for item in soup.select("div.g")[:5]:
                try:
                    title_tag = item.select_one("h3")
                    link_tag = item.select_one("a")
                    snippet_tag = item.select_one("div[data-sncf]") or item.select_one(".VwiC3b")
                    
                    if title_tag and link_tag:
                        title = title_tag.get_text(strip=True)
                        link = link_tag.get("href", "")
                        desc = snippet_tag.get_text(strip=True) if snippet_tag else ""
                        if link.startswith("http"):
                            results.append(f"TITULO: {title}\nLINK: {link}\nRESUMO: {desc}")
                except:
                    continue
            
            if results:
                print(f"[DEBUG] Google scraping successful: {len(results)} results")
                return {"success": True, "content": "\n\n".join(results), "error": "", "source": "google"}
    except Exception as e:
        print(f"[DEBUG] Google scraping failed: {e}")
    
    return {"success": False, "content": "Não foi possível realizar a busca. Todos os motores de pesquisa falharam.", "error": "All search providers failed", "source": "none"}



def read_url(url: str) -> Dict[str, Any]:
    """
    Lê e extrai o conteúdo de texto de uma URL.
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
        
        for element in soup(["script", "style", "nav", "footer", "header", "aside", "noscript", "iframe", "svg", "form", "button"]):
            element.decompose()
        
        title = soup.find("title")
        title_text = title.get_text(strip=True) if title else "Sem título"
        
        main_content = None
        selectors = [
            "article", "main", '[role="main"]', 
            "#content", ".content", ".post-content", ".entry-content", ".article-content",
            "#main-content", ".main-content", ".post-body", ".entry-body",
            ".chapter-content", ".reading-content"
        ]
        
        for selector in selectors:
            main_content = soup.select_one(selector)
            if main_content and len(main_content.get_text(strip=True)) > 200:
                break
        
        if not main_content:
            main_content = soup.find("body")
        
        if not main_content:
            return {"success": False, "content": "", "error": "Não foi possível extrair conteúdo da página"}
        
        text = main_content.get_text(separator="\n", strip=True)
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        clean_text = "\n".join(lines)
        
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
# CANVAS - CRIAÇÃO DE ARTEFATOS
# =============================================================================

def create_artifact(title: str, artifact_type: str, content: str, language: str = None) -> Dict[str, Any]:
    """
    Cria um artefato no Canvas.
    
    IMPORTANTE: Esta ferramenta DEVE ser usada para qualquer código, documento ou diagrama.
    NUNCA escreva código diretamente no chat.
    
    Args:
        title: Título descritivo do artefato (ex: "Componente de Login")
        artifact_type: Tipo do conteúdo (code, markdown, react, mermaid, svg)
        content: Conteúdo COMPLETO e executável. Sem placeholders.
        language: Linguagem de programação (python, javascript, typescript, etc)
    """
    import uuid
    from .artifacts import save_artifact as persist_artifact
    
    valid_types = ["code", "markdown", "react", "mermaid", "svg", "html"]
    if artifact_type not in valid_types:
        artifact_type = "code"
    
    art_id = str(uuid.uuid4())
    safe_title = title.encode('ascii', 'replace').decode('ascii')
    print(f"[DEBUG-ART] Criando artefato: {safe_title} (Tipo: {artifact_type}, ID: {art_id})")
    
    artifact = {
        "id": art_id,
        "title": title,
        "type": artifact_type,
        "language": language or "plaintext",
        "content": content
    }
    
    # Persist to storage
    persist_artifact(artifact)
    
    return {
        "success": True,
        "artifact": artifact
    }

def get_artifact(artifact_id: str) -> Dict[str, Any]:
    """
    Busca o conteúdo completo e metadados de um artefato pelo ID.
    Útil para ler artefatos que não estão atualmente em foco ou verificar versões.
    """
    from .artifacts import get_artifact as fetch_art
    art = fetch_art(artifact_id)
    if not art:
        return {"success": False, "error": f"Artefato {artifact_id} não encontrado."}
    return {"success": True, "artifact": art}

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
        "description": "Pesquisa na internet por informações gerais. Use APENAS quando NÃO tiver uma URL específica. Se o usuário fornecer um link (http/https), use read_url ao invés.",
        "parameters": {
            "query": {"type": "string", "description": "Termo de busca detalhado", "required": True}
        }
    },
    "read_url": {
        "function": read_url,
        "description": "OBRIGATÓRIO quando o usuário fornecer um link/URL específico (http:// ou https://). Lê e extrai o conteúdo de texto da página web. Use SEMPRE que houver uma URL na mensagem do usuário.",
        "parameters": {
            "url": {"type": "string", "description": "URL completa da página (ex: https://exemplo.com/pagina)", "required": True}
        }
    },
    "add_knowledge": {
        "function": None, 
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
    "create_artifact": {
        "function": create_artifact,
        "description": "Cria um NOVO artefato do zero. Use APENAS para novos arquivos ou quando o usuário pedir explicitamente para criar algo novo. NÃO use para atualizar.",
        "parameters": {
            "title": {"type": "string", "description": "Título descritivo do artefato", "required": True},
            "artifact_type": {
                "type": "string", 
                "enum": ["code", "markdown", "react", "mermaid", "svg", "html"],
                "description": "Tipo do conteúdo", 
                "required": True
            },
            "content": {"type": "string", "description": "Conteúdo COMPLETO e direto.", "required": True},
            "language": {"type": "string", "description": "Linguagem (python, js, etc)", "required": False}
        }
    },
    "edit_artifact": {
        "function": None, # Handled specially in agent.py
        "description": "Edita o artefato existente. PREFERIDA para QUALQUER alteração, correção ou melhoria. O sistema aceita buscas aproximadas (fuzzy), então não precisa ser perfeito.",
        "parameters": {
            "artifact_id": {"type": "string", "description": "ID do artefato a editar", "required": True},
            "changes": {
                "type": "array",
                "description": "Lista de alterações sequenciais (Search & Replace).",
                "items": {
                    "type": "object",
                    "properties": {
                        "search": {"type": "string", "description": "Bloco exato de texto original para buscar. Copie exatamente do artefato."},
                        "replace": {"type": "string", "description": "Novo bloco de texto para substituir"}
                    },
                    "required": ["search", "replace"]
                },
                "required": True
            }
        }
    },
    "get_artifact": {
        "function": get_artifact,
        "description": "Busca o conteúdo completo e metadados de um artefato pelo ID. Use quando quiser apenas ler ou quando o usuário pedir para você 'dar uma olhada' em um artefato específico sem necessariamente editá-lo.",
        "parameters": {
            "artifact_id": {"type": "string", "description": "ID do artefato a ser lido", "required": True}
        }
    }
}

def execute_tool(tool_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
    """Executa uma tool pelo nome."""
    if tool_name not in TOOLS:
        return {"success": False, "error": f"Tool desconhecida: {tool_name}"}
    
    tool = TOOLS[tool_name]
    try:
        print(f"[DEBUG] Executando tool: {tool_name} com args: {args}")
        
        if tool_name == "add_knowledge":
            from .memory import save_technical_knowledge
            success = save_technical_knowledge(**args)
            return {"success": success, "message": "Conhecimento técnico indexado com sucesso!" if success else "Falha ao indexar."}
        
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
                        } if "enum" not in param_info else {
                            "type": param_info["type"],
                            "enum": param_info["enum"],
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
