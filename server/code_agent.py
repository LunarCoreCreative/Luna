"""
Luna Code Agent
----------------
Agente de código autônomo para o modo IDE.
Usa servidores MCP para manipular arquivos e executar comandos.
"""

import json
from typing import AsyncGenerator, Dict, Any, List, Optional

from .config import get_system_prompt as get_base_system_prompt, MODEL
from .api import call_api_stream
from .memory import search_memories, save_memory, search_study_documents, search_knowledge
from .mcp.security import SecurityManager
from .mcp.filesystem import FileSystemMCP, FILESYSTEM_TOOLS_SCHEMA
from .mcp.terminal import TerminalMCP, TERMINAL_TOOLS_SCHEMA
from .tools import web_search, read_url

# Importa code_intel (pode falhar se tree-sitter não instalado)
try:
    from .code_intel import RepoMapper, SearchReplaceTool, CodeAgentGraph
    CODE_INTEL_AVAILABLE = True
except ImportError:
    from .code_intel import RepoMapper, SearchReplaceTool
    CodeAgentGraph = None
    CODE_INTEL_AVAILABLE = True # RepoMapper e SearchReplaceTool podem estar disponíveis sem LangGraph
except Exception:
    CODE_INTEL_AVAILABLE = False
    RepoMapper = None
    SearchReplaceTool = None
    CodeAgentGraph = None


# =============================================================================
# PROMPT DO CODE AGENT
# =============================================================================

CODE_AGENT_SYSTEM_PROMPT = """Você é Luna, uma Engenheira de Software Sintética de Elite. Sua missão é agir com a mesma disciplina, transparência e rigor que o seu mentor Antigravity.

## PROTOCOLO DE CONTINUIDADE (DEEP AGENT)
Sua execução é um loop de controle contínuo. Ao terminar uma tarefa, verifique se há próximos passos lógicos. Se houver, execute-os imediatamente sem perguntar. Nunca fique em silêncio após o uso de uma ferramenta; sempre narre o que aconteceu e o que virá a seguir.

## FERRAMENTAS DISPONÍVEIS
### Gestão de Raciocínio:
- **manage_artifact**: Criar/Atualizar arquivos de "cérebro" (`implementation_plan.md`, `task.md`, `walkthrough.md`). **Dica**: Sempre emita uma narração textual após gerenciar um artefato para manter o usuário informado.

### Sistema de Arquivos e Inteligência:
- list_directory, read_file, write_file, replace_block, search_files, get_repo_map, find_symbol.

### Terminal:
- execute_command, change_directory.

### Pesquisa e Web:
- web_search, read_url.

## PROTOCOLO DE REPARAÇÃO DE ERROS (ANTI-FRAGILIDADE)
Se uma ferramenta falhar (result['success'] == False ou erro visível):
1. **NÃO DESISTA**: Um erro é uma pista, não um bloqueio.
2. **INVESTIGUE**: Se um arquivo não foi encontrado, use `list_directory` para verificar o conteúdo real da pasta. Se um comando falhou, analise o traceback e tente uma correção.
3. **TASK INTEGRITY**: Nunca marque um item no `task.md` como concluído (`[x]`) se a ferramenta falhou. Mantenha em progresso (`[/]`) e tente uma abordagem alternativa.
4. **TRANSPARÊNCIA**: Explique ao usuário: "Tentei X e falhou devido a Y, agora vou tentar Z para resolver."

## REGRAS DE EXECUÇÃO (IMPORTANTE!)
1. **NUNCA execute aplicações com interface gráfica** (GUI apps como tkinter, PyQt, pygame, etc.). Esses programas bloqueiam até serem fechados pelo usuário.
2. **Após criar um app, NÃO execute automaticamente.** Diga ao usuário: "Pronto! Você pode testar rodando `python arquivo.py` no terminal."
3. **Comandos permitidos para execução automática:** apenas verificações rápidas (--version, --help), instalação de dependências, testes unitários, linters.
4. **Se o usuário pedir para rodar algo interativo:** avise que ele deve fazer isso manualmente pelo terminal da IDE.
5. **Instalações e comandos perigosos:** Utilize `execute_command` normalmente. O sistema exibirá um modal de aprovação para o usuário. Não peça para o usuário fazer manualmente se a ferramenta puder ser usada.

## WORKSPACE ATUAL
{workspace_info}

## CONTEXTO DO PROJETO (REPO MAP)
{repo_map_context}

## CONHECIMENTO TÉCNICO APRENDIDO
{technical_knowledge_context}

## PROTOCOLO DE AUTO-PESQUISA (CURIOSIDADE ATIVA)

Quando você NÃO SOUBER algo com certeza ou tiver DÚVIDAS sobre sintaxe/API/configuração:

1. **NÃO INVENTE** - Use `web_search` para pesquisar ANTES de responder
2. **ABSORVA** - O sistema automaticamente salvará o conhecimento pesquisado para uso futuro
3. **CITE** - Mencione a fonte quando usar informação pesquisada

**Gatilhos para auto-pesquisa (USE `web_search` IMEDIATAMENTE):**
- Sintaxe exata de API/biblioteca que você não tem 100% de certeza
- Versões atuais de frameworks/bibliotecas
- Erros ou exceções que você não reconhece
- Configurações específicas de ambiente/deploy
- Melhores práticas que podem ter mudado

**NÃO** pesquise para coisas básicas que você sabe bem (loops, if/else, conceitos fundamentais).
"""


# =============================================================================
# CODE AGENT STATE
# =============================================================================

class CodeAgentState:
    """Estado do agente de código."""
    
    def __init__(self, workspace_path: str = None):
        self.security = SecurityManager(workspace_path)
        self.filesystem = FileSystemMCP(self.security)
        self.terminal = TerminalMCP(self.security)
        self.repo_mapper = None  # Inicializado quando workspace é configurado
        self.graph = None        # Inicializado sob demanda
        
        self.messages: List[Dict[str, Any]] = []
        self.tool_history: List[Dict[str, Any]] = []
        self.pending_approval: Optional[Dict[str, Any]] = None
        self.active_chat_id: Optional[str] = None
        self.user_id: Optional[str] = None
        self.user_name: Optional[str] = "Usuário"

    def load_session(self, chat_data: dict):
        """Carrega o estado a partir de um chat salvo."""
        self.active_chat_id = chat_data.get("id")
        self.messages = chat_data.get("messages", [])
        
        # Tenta restaurar workspace se estiver nos metadados
        workspace = chat_data.get("workspace")
        if workspace:
            self.set_workspace(workspace)
        
        # Sincroniza o CWD inicial
        self.filesystem.set_cwd(self.terminal.cwd)
        
        print(f"[CodeAgent] [OK] Sessão '{self.active_chat_id}' carregada com {len(self.messages)} mensagens.")
    
    def _ensure_graph(self):
        """Garante que o grafo cognitivo esteja inicializado."""
        if CODE_INTEL_AVAILABLE and CodeAgentGraph and not self.graph:
            # O model_caller será injetado pelo code_agent_generator
            self.graph = CodeAgentGraph(model_caller=None)
            
    def _init_repo_mapper(self):
        """Inicializa o RepoMapper para o workspace."""
        if CODE_INTEL_AVAILABLE and self.is_configured and RepoMapper:
            try:
                print(f"[CodeAgent] [BUSCA] Mapeando projeto em {self.security.workspace}...")
                self.repo_mapper = RepoMapper(str(self.security.workspace))
                # Começa com um scan leve para responder rápido
                self.repo_mapper.scan(max_files=100)
                print(f"[CodeAgent] [OK] Projeto mapeado ({len(self.repo_mapper.files)} arquivos).")
            except Exception as e:
                print(f"[CodeAgent] [ERRO] Erro ao iniciar RepoMapper: {e}")
                self.repo_mapper = None
    
    @property
    def is_configured(self) -> bool:
        return self.security.is_configured
    
    def set_workspace(self, path: str) -> bool:
        result = self.security.set_workspace(path)
        if result:
            # Reseta o CWD do terminal para o novo workspace root
            self.terminal._current_cwd = None
            # Sincroniza o sistema de arquivos
            self.filesystem.set_cwd(self.terminal.cwd)
            self._init_repo_mapper()
        return result
    
    def get_system_prompt(self, memories: List[str] = None, study_context: str = None, vision_context: str = None) -> str:
        """Gera o prompt do sistema com informações do workspace, repo map e memórias."""
        repo_map_context = "Nenhum mapa disponível ainda."
        if self.repo_mapper:
            repo_map_context = self.repo_mapper.get_context(max_tokens=2000)
            
        if self.is_configured:
            workspace_info = f"""
📁 Workspace: {self.security.workspace}
📂 Diretório atual: {self.terminal.cwd}
"""
        else:
            workspace_info = "⚠️ Workspace não configurado. Use /set-workspace para definir."
        
        # Injeta conhecimento técnico aprendido (RAG)
        # Tenta buscar algo relevante para a tarefa atual (se houver mensagens)
        tech_items_str = "Nenhum conhecimento prévio relevante encontrado."
        user_query = ""
        if self.messages and self.messages[-1]["role"] == "user":
            user_query = self.messages[-1]["content"]
        
        if user_query:
            # Busca memórias conversacionais
            knowledge_items = search_knowledge(user_query, n=3)
            
            # Busca conhecimento técnico especializado (guias, boas práticas)
            from .memory import search_technical_knowledge
            tech_items = search_technical_knowledge(user_query, n=2)
            
            all_items = knowledge_items + tech_items
            if all_items:
                tech_items_str = "\n".join([f"- {item}" for item in all_items])
        
        # Injetar identidade dinâmica
        from .identity import get_identity_prompt
        identity_prompt = get_identity_prompt(
            self.user_id, 
            self.user_name or "Usuário"
        )
        
        prompt = identity_prompt + "\n\n" + CODE_AGENT_SYSTEM_PROMPT.format(
            workspace_info=workspace_info,
            repo_map_context=repo_map_context,
            technical_knowledge_context=tech_items_str
        )

        # Injeta memórias se existirem
        if memories:
            prompt += "\n\n[MEMÓRIAS DE CONVERSAS ANTERIORES]:\n" + "\n".join(memories)
            
        # Injeta documentos de estudo se existirem
        if study_context:
            prompt += f"\n\n[CONHECIMENTO EXTRAÍDO DE DOCUMENTOS]:\n{study_context}"
            
        # Injeta contexto de visão se houver
        if vision_context:
            prompt += f"\n\n{vision_context}"
            
        return prompt


# =============================================================================
# TOOL EXECUTION
# =============================================================================

# Schema das ferramentas de code intel
CODE_INTEL_TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_repo_map",
            "description": "Obtém um mapa estruturado do repositório com árvore de diretórios e símbolos de código (funções, classes). Use ANTES de começar a trabalhar em um projeto para entender a estrutura.",
            "parameters": {
                "type": "object",
                "properties": {
                    "max_depth": {
                        "type": "integer",
                        "description": "Profundidade máxima da árvore (padrão: 3)"
                    }
                },
                "required": []
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "find_symbol",
            "description": "Busca funções, classes ou métodos pelo nome no repositório.",
            "parameters": {
                "type": "object",
                "properties": {
                    "name": {
                        "type": "string",
                        "description": "Nome do símbolo a buscar (função, classe, método)"
                    }
                },
                "required": ["name"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "replace_block",
            "description": "Edita um arquivo substituindo um bloco de texto específico por outro. Use isto para fazer alterações cirúrgicas sem reescrever o arquivo todo.",
            "parameters": {
                "type": "object",
                "properties": {
                    "path": {
                        "type": "string",
                        "description": "Caminho do arquivo a ser editado"
                    },
                    "search": {
                        "type": "string",
                        "description": "O bloco de texto EXATO a ser procurado no arquivo"
                    },
                    "replace": {
                        "type": "string",
                        "description": "O novo bloco de texto que substituirá o bloco de busca"
                    }
                },
                "required": ["path", "search", "replace"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "manage_artifact",
            "description": "Cria ou atualiza um artefato de 'cérebro' no diretório .luna/brain/. Use este para implementation_plan.md, task.md e walkthrough.md.",
            "parameters": {
                "type": "object",
                "properties": {
                    "type": {
                        "type": "string",
                        "enum": ["implementation_plan", "task", "walkthrough"],
                        "description": "O tipo do artefato"
                    },
                    "content": {
                        "type": "string",
                        "description": "O conteúdo markdown completo do artefato"
                    }
                },
                "required": ["type", "content"]
            }
        }
    }
]

# Schema das ferramentas web
WEB_TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "web_search",
            "description": "Pesquisa na internet por informações gerais. Use APENAS quando NÃO tiver uma URL específica.",
            "parameters": {
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Termo de busca detalhado"
                    }
                },
                "required": ["query"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "read_url",
            "description": "Lê e extrai o conteúdo de texto de uma URL específica (documentação, artigo, etc).",
            "parameters": {
                "type": "object",
                "properties": {
                    "url": {
                        "type": "string",
                        "description": "URL completa da página"
                    }
                },
                "required": ["url"]
            }
        }
    }
]


def get_code_agent_tools() -> List[Dict]:
    """Retorna o schema de todas as ferramentas do code agent."""
    tools = FILESYSTEM_TOOLS_SCHEMA + TERMINAL_TOOLS_SCHEMA + WEB_TOOLS_SCHEMA
    if CODE_INTEL_AVAILABLE:
        tools += CODE_INTEL_TOOLS_SCHEMA
    return tools


def execute_code_agent_tool(state: CodeAgentState, name: str, args: Dict) -> Dict[str, Any]:
    """
    Executa uma ferramenta do code agent.
    
    Args:
        state: Estado do agente.
        name: Nome da ferramenta.
        args: Argumentos da ferramenta.
        
    Returns:
        Resultado da execução.
    """
    # Ferramentas de FileSystem
    if name == "list_directory":
        return state.filesystem.list_directory(args.get("path", "."))
    
    elif name == "read_file":
        return state.filesystem.read_file(
            args.get("path"),
            args.get("max_lines")
        )
    
    elif name == "write_file":
        return state.filesystem.write_file(
            args.get("path"),
            args.get("content", "")
        )
    
    elif name == "search_files":
        return state.filesystem.search_files(
            args.get("query"),
            args.get("path", "."),
            args.get("file_pattern", "*")
        )
    
    elif name == "get_file_info":
        return state.filesystem.get_file_info(args.get("path"))
    
    elif name == "create_directory":
        return state.filesystem.create_directory(args.get("path"))
    
    elif name == "delete_file":
        return state.filesystem.delete_file(args.get("path"))
    
    elif name == "move_file":
        return state.filesystem.move_file(
            args.get("source"),
            args.get("destination")
        )
    
    elif name == "replace_block":
        if not SearchReplaceTool:
            return {"success": False, "error": "SearchReplaceTool não disponível."}
        
        # Resolve o caminho absoluto via security manager usando o CWD atual
        path = args.get("path")
        valid, error, abs_path = state.security.validate_path(path, base_path=state.terminal.cwd)
        
        if not valid:
            return {"success": False, "error": error}
            
        return SearchReplaceTool.edit_file(
            str(abs_path),
            args.get("search", ""),
            args.get("replace", "")
        )
    
    # Ferramentas de Terminal e Shell
    elif name == "execute_command":
        result = state.terminal.execute_command(
            args.get("command"),
            args.get("timeout")
        )
        # Sincroniza o CWD do filesystem se o comando mudou o diretório (ex: cd)
        state.filesystem.set_cwd(state.terminal.cwd)
        return result
    
    elif name == "change_directory":
        result = state.terminal.change_directory(args.get("path"))
        # Sincroniza o CWD do filesystem
        state.filesystem.set_cwd(state.terminal.cwd)
        return result
    
    elif name == "get_cwd":
        return state.terminal.get_cwd()
    
    elif name == "get_environment":
        return state.terminal.get_environment()
    
    # Ferramentas de Code Intel
    elif name == "get_repo_map":
        if not state.repo_mapper:
            return {"success": False, "error": "RepoMapper não disponível. Tree-sitter pode não estar instalado."}
        try:
            max_depth = args.get("max_depth", 3)
            context = state.repo_mapper.get_context(max_tokens=6000)
            return {"success": True, "content": context, "map": context}
        except Exception as e:
            return {"success": False, "error": str(e)}
    
    elif name == "find_symbol":
        if not state.repo_mapper:
            return {"success": False, "error": "RepoMapper não disponível."}
        try:
            name_query = args.get("name", "")
            matches = state.repo_mapper.find_symbol(name_query)
            # Formata matches para content para facilitar leitura
            matches_text = "\n".join([f"- {m.get('name')} em {m.get('path')} (Linha {m.get('line')})" for m in matches[:10]])
            return {"success": True, "content": matches_text, "matches": matches[:20], "total": len(matches)}
        except Exception as e:
            return {"success": False, "error": str(e)}
            
    elif name == "manage_artifact":
        artifact_type = args.get("type")
        content = args.get("content", "")
        
        # Define o caminho dentro de .luna/brain/
        brain_dir = ".luna/brain"
        # Garante que a pasta exista
        state.filesystem.create_directory(brain_dir)
        
        filename = f"{artifact_type}.md"
        path = f"{brain_dir}/{filename}"
        
        # Salva o arquivo
        result = state.filesystem.write_file(path, content)
        
        if artifact_type == "implementation_plan" and result.get("success"):
            return {
                "success": True,
                "requires_approval": True,
                "type": "implementation_plan",
                "reason": "Novo plano de implementação proposto. Revise o plano para autorizar a execução.",
                "path": path,
                "content": content,
                "summary": f"Plano de implementação '{artifact_type}' criado em {path}. Aguardando aprovação do usuário para prosseguir."
            }
            
        # Adiciona um resumo para as ferramentas visuais não matarem o loop
        if result.get("success"):
            result["summary"] = f"Artefato '{artifact_type}' atualizado com sucesso em {path}."
            
        return result
    
    # Ferramentas Web
    elif name == "web_search":
        return web_search(args.get("query"))
    
    elif name == "read_url":
        return read_url(args.get("url"))
    
    else:
        print(f"[CodeAgent] [ERRO] Ferramenta desconhecida: {name}")
        return {"success": False, "error": f"Ferramenta desconhecida: {name}"}


# =============================================================================
# STREAMING GENERATOR
# =============================================================================

async def code_agent_generator(
    state: CodeAgentState,
    user_message: str,
    images: List[str] = None
) -> AsyncGenerator[str, None]:
    """
    Gerador de streaming para o code agent.
    
    Args:
        state: Estado do agente.
        user_message: Mensagem do usuário.
        images: Lista de imagens em base64 (opcional).
        
    Yields:
        Eventos SSE em formato JSON.
    """
    yield f"data: {json.dumps({'start': True, 'mode': 'code-agent'})}\n\n"
    
    # Verifica se workspace está configurado
    if not state.is_configured:
        yield f"data: {json.dumps({'error': 'Workspace não configurado. Use /set-workspace primeiro.'})}\n\n"
        yield f"data: {json.dumps({'done': True})}\n\n"
        return
    
    # Processamento de Imagens (Visão)
    vision_context = ""
    if images:
        yield f"data: {json.dumps({'status': 'Analisando imagens...', 'type': 'vision'})}\n\n"
        
        from .api import get_vision_description
        image_descriptions = []
        for i, img in enumerate(images):
            try:
                desc = await get_vision_description(img, user_message)
                image_descriptions.append(f"IMAGEM {i+1}: {desc}")
                yield f"data: {json.dumps({'status': f'Imagem {i+1} analisada ✓', 'type': 'vision'})}\n\n"
            except Exception as e:
                err_msg = str(e)
                image_descriptions.append(f"IMAGEM {i+1}: [FALHA NO SISTEMA DE VISÃO: {err_msg}]")
                yield f"data: {json.dumps({'status': f'Erro na imagem {i+1}: {err_msg[:30]}...', 'type': 'error'})}\n\n"
        
        if image_descriptions:
            vision_context = "\n\n🖼️ [SISTEMA DE VISÃO - INFORMAÇÕES VISUAIS]:\n"
            vision_context += "Seu módulo de visão (Maverick) analisou as imagens enviadas e gerou as descrições abaixo. "
            vision_context += "USE ESTAS DESCRIÇÕES PARA RESPONDER AO USUÁRIO COMO SE VOCÊ ESTIVESSE VENDO AS IMAGENS:\n\n"
            vision_context += "\n".join(image_descriptions)
            vision_context += "\n\n⚠️ NOTA TÉCNICA: Apenas reporte erro de visão se você ver explicitamente a mensagem '[FALHA NO SISTEMA DE VISÃO]' acima. Caso contrário, aja como se a visão estivesse 100% funcional.\n"

    new_message = {"role": "user", "content": user_message}
    state.messages.append(new_message)
    
    # BUSCA DE CONTEXTO (MEMÓRIA E ESTUDO)
    # 1. Busca conversacional baseada na mensagem atual
    memories = search_memories(user_message)
    
    # 2. Busca de contexto técnico recente do projeto
    project_name = state.security.workspace.name if state.security.workspace else "unknown"
    tech_query = f"histórico técnico recente no projeto {project_name}"
    tech_memories = search_memories(tech_query, n=3)
    
    # Unifica e remove duplicatas simples
    all_memories = list(set(memories + tech_memories))
    
    study_results = search_study_documents(user_message, n=3)
    study_context = ""
    if study_results:
        for i, result in enumerate(study_results, 1):
            study_context += f"\n--- Fonte {i}: {result['title']} ---\n{result['text'][:1000]}\n"

    # Prepara mensagens para API
    from .agent import safe_print
    safe_print(f"[DEBUG-IDENTITY-CODE] Request UserID: {state.user_id}")
    safe_print(f"[DEBUG-IDENTITY-CODE] Request UserName: {state.user_name}")

    system_prompt = state.get_system_prompt(
        memories=all_memories, 
        study_context=study_context,
        vision_context=vision_context
    )
    
    # Log the first few lines of the generated identity prompt
    safe_print(f"[DEBUG-IDENTITY-CODE] Prompt Start: {system_prompt[:100]}...")
    msgs = [{"role": "system", "content": system_prompt}] + state.messages[-12:] # Aumentado um pouco o contexto curto
    tools = get_code_agent_tools()
    
    # Garante que o repo mapper esteja inicializado para o contexto
    if state.repo_mapper is None and state.is_configured:
        state._init_repo_mapper()
    
    max_iterations = 50  # Limite de passos de execução
    full_response = ""
    
    try:
        for iteration in range(max_iterations):
            yield f"data: {json.dumps({'status': f'Processando (etapa {iteration+1})...', 'type': 'info'})}\n\n"
            
            current_content = ""
            current_tool_calls = {}
            
            # CHAMADA NÃO-STREAMADA (Para garantir integridade do JSON de Tools)
            # O usuário pediu "blocos prontos" para evitar erros de stream.
            from .api import call_api_json
            
            # Avisa o frontend que estamos pensando (evita "silêncio" na UI)
            if len(msgs) > 0 and msgs[-1]["role"] == "user":
                 yield f"data: {json.dumps({'status': 'Pensando...', 'type': 'info'})}\n\n"
            else:
                 yield f"data: {json.dumps({'status': 'Gerando resposta...', 'type': 'info'})}\n\n"

            response = await call_api_json(msgs, tools=tools, tool_choice="auto", model=MODEL)
            
            if "error" in response:
                yield f"data: {json.dumps({'error': response['error']})}\n\n"
                return

            # Extração segura da resposta completa
            choice = response["choices"][0]
            message = choice["message"]
            content = message.get("content") or ""
            r_tool_calls = message.get("tool_calls")
            
            # --- PÓS-PROCESSAMENTO DE MENSAGEM ---
            # Como temos a resposta inteira, podemos corrigir formatações quebradas.
            if content:
                # 1. Fechar blocos de código abertos
                if content.count("```") % 2 != 0:
                    content += "\n```"
                
                # 2. Corrigir formatação de tabelas (Post-Processing solicitado)
                # O problema: alguns modelos concatenam linhas de tabela (|...|...|...|)
                # sem quebras de linha, resultando em tabelas malformadas.
                import re
                
                # Passo 1: Corrige concatenação severa (|| -> |\n|)
                # Isso divide linhas de tabela que foram coladas juntas
                content = content.replace('||', '|\n|')
                
                # Passo 2: Garante quebra de linha ANTES da tabela
                # Padrão: (Texto ou newline único)(Linha de tabela)(Newline)(Separador |---|)
                # Isso ancora a detecção no separador para evitar falsos positivos
                table_start_pattern = r'([^\n]+?)(\|.+?\|)\n(\|[\s:\-\|]+\|)'
                content = re.sub(table_start_pattern, r'\1\n\n\2\n\3', content)
                
                # Passo 3: Garante quebra de linha DEPOIS da tabela
                # Padrão: (Linha terminando em |)(Newline)(Texto que não começa com |)
                table_end_pattern = r'(\|\s*)\n([^\n\|])'
                content = re.sub(table_end_pattern, r'\1\n\n\2', content)
                
                # 3. Corrigir texto concatenado sem quebras de linha
                # O problema: alguns modelos (DeepSeek V3) não colocam quebras após pontuação
                # Padrão: (! ou : ou .) seguido diretamente de letra maiúscula = nova frase
                # Exemplo: "Vamos lá!Vou verificar" -> "Vamos lá!\n\nVou verificar"
                content = re.sub(r'([!?:])\s*([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ])', r'\1\n\n\2', content)
                
                # Padrão: (.) seguido de letra maiúscula (mas não em abreviações comuns)
                # Evita quebrar "Dr. João" ou "vs. algo" ou URLs
                content = re.sub(r'\.[ ]?([A-ZÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇ][a-záàâãéèêíïóôõöúç])', r'.\n\n\1', content)
            
            # -------------------------------------
            
            # 1. Simular Streaming do Texto (UX)
            if content:
                # Envia em chunks para não aparecer tudo de uma vez (efeito digitação)
                chunk_size = 50
                for i in range(0, len(content), chunk_size):
                    chunk = content[i:i+chunk_size]
                    yield f"data: {json.dumps({'content': chunk})}\n\n"
                    # Pequeno delay opcional se quiser realismo, mas sem delay é mais rápido
                
                current_content = content
            
            # 2. Processar Tool Calls (Agora garantidos e completos)
            if r_tool_calls:
                # Converter para formato interno (embora já venha pronto, normalizamos)
                for tc in r_tool_calls:
                    f = tc["function"]
                    # parse arguments se vier como string
                    args_str = f["arguments"]
                    if isinstance(args_str, str):
                        try:
                            # Tenta validar se é JSON válido
                            json.loads(args_str) 
                        except:
                            print(f"[CodeAgent] [AVISO] Argumentos de tool inválidos: {args_str}")
                            continue
                            
                    idx = len(current_tool_calls)
                    current_tool_calls[idx] = {
                        "id": tc.get("id"),
                        "name": f["name"],
                        "arguments": args_str
                    }
                    
            # Seção de processamento de tools continua abaixo...
            if current_tool_calls:
                tool_calls = list(current_tool_calls.values())
                
                # Formata para API (agora com IDs reais que vieram da API)
                formatted_tool_calls = []
                for tc in tool_calls:
                     # GARANTIA DE ID (Fallsafe final)
                     if not tc.get("id"):
                         import uuid
                         tc["id"] = f"call_{str(uuid.uuid4())[:8]}"
                     
                     formatted_tool_calls.append({
                        "id": tc["id"],
                        "type": "function",
                        "function": {"name": tc["name"], "arguments": tc["arguments"]}
                     })
                
                print(f"[DEBUG] Tool Calls Seguras: {len(formatted_tool_calls)}")
                
                # Adiciona ao contexto
                assistant_msg = {
                    "role": "assistant",
                    "content": current_content or "", 
                    "tool_calls": formatted_tool_calls
                }
                msgs.append(assistant_msg)
                state.messages.append(assistant_msg)
                
                # Executa cada ferramenta
                for tc in tool_calls:
                    name = tc["name"]
                    tc_id = tc["id"]
                    
                    try:
                        args = json.loads(tc["arguments"])
                    except:
                        args = {}
                    
                    # Envia feedback visual com ID
                    yield f"data: {json.dumps({'tool_call': {'id': tc_id, 'name': name, 'args': args}})}\n\n"
                    
                    # Executa
                    print(f"[CodeAgent] [TOOL] Executando: {name}({args})")
                    result = execute_code_agent_tool(state, name, args)
                    print(f"[CodeAgent] [OK] Resultado de {name} obtido.")
                    
                    # Verifica se requer aprovação
                    if result.get("requires_approval"):
                        yield f"data: {json.dumps({'requires_approval': result})}\n\n"
                        state.pending_approval = {
                            "tool_call_id": tc_id,
                            "name": name,
                            "args": args,
                            "result": result
                        }
                        yield f"data: {json.dumps({'done': True, 'awaiting_approval': True})}\n\n"
                        return
                    
                    # Envia resultado com ID para sincronização no frontend
                    yield f"data: {json.dumps({'tool_result': result, 'tool_call_id': tc_id})}\n\n"
                    
                    # Adiciona resultado ao histórico
                    state.tool_history.append({
                        "name": name,
                        "args": args,
                        "result": result
                    })
                    
                    tool_msg = {
                        "tool_call_id": tc_id,
                        "role": "tool",
                        "content": json.dumps(result, ensure_ascii=False)
                    }
                    

                    
                    # LOG DE DEBUG: Imprimir estrutura da mensagem para diagnóstico
                    # print(f"[DEBUG] Tool Msg Payload: {json.dumps(tool_msg)}") # Verbose demais
                    msgs.append(tool_msg)
                    state.messages.append(tool_msg)
                
                # Adiciona resultado ao histórico para a próxima iteração
                full_response += current_content or ""
                # Removido hint explícito para evitar confusão no histórico
                continue
            else:
                # Resposta final sem tool calls
                full_response += current_content
                
                # FALLBACK: Se o modelo ficou em silêncio após ferramentas, força uma explicação
                if not full_response.strip() and iteration > 0:
                    print("[CodeAgent] [AVISO] Modelo silencioso após ferramentas. Solicitando resumo...")
                    yield f"data: {json.dumps({'status': 'Finalizando resposta...', 'type': 'info'})}\n\n"
                    
                    # Adiciona instrução explicita para garantir resposta
                    msgs_fallback = msgs + [{"role": "user", "content": "[SISTEMA] A ferramenta foi executada. DESCREVA o que foi feito ou o resultado obtido para o usuário. Não fique em silêncio."}]
                    
                    # Solicita narração final forçando sem ferramentas
                    async for chunk in call_api_stream(msgs_fallback, tools=None, model=MODEL):
                        if "error" in chunk:
                             yield f"data: {json.dumps({'error': chunk['error']})}\n\n"
                             error_msg = f" **[Erro na geração de resposta: {chunk['error']}]**"
                             yield f"data: {json.dumps({'content': error_msg})}\n\n"
                             break
                             
                        if not chunk.get("choices"): continue
                        
                        delta = chunk["choices"][0].get("delta", {})
                        if delta.get("content"):
                            content = delta["content"]
                            current_content += content
                            full_response += content
                            yield f"data: {json.dumps({'content': content})}\n\n"
                            
                if not full_response.strip():
                    full_response = "Projeto analisado! O que vamos fazer agora? ✨"
                    yield f"data: {json.dumps({'content': full_response})}\n\n"
                    
                break
        # Se chegamos aqui pelo fim do for (max_iterations), avisa o usuário
        else:
            # Este ELSE pertence ao FOR (Python permite for...else)
            exhaustion_msg = "\n\n⚠️ **Atingi o limite de 50 passos de execução.** Se você quiser que eu continue esta tarefa, por favor peça novamente e eu retomo de onde parei! 💜"
            yield f"data: {json.dumps({'content': exhaustion_msg})}\n\n"
            full_response += exhaustion_msg
            state.messages.append({"role": "assistant", "content": current_content + exhaustion_msg if current_content else exhaustion_msg})
        
        # Salva resposta final (Apenas se houver conteúdo textual novo não capturado nas tool calls)
        # Nota: Se o modelo narrou durante o loop, isso já foi salvo via state.messages.append(assistant_msg)
        # No entanto, se o loop deu break sem narrar nada na última iteração, salvamos o que sobrou.
        if current_content and not current_tool_calls:
             # Se for a iteração final sem ferramentas, o que está em current_content é a resposta final
             # Mas cuidado para não duplicar se já foi adicionado acima (não foi, pois aqui caímos no ELSE)
             state.messages.append({"role": "assistant", "content": current_content})
        
        # Sincroniza memória global com metadados de projeto
        if full_response:
            metadata = {
                "type": "code_agent_session",
                "workspace": str(state.security.workspace) if state.security.workspace else "unknown",
                "project": project_name
            }
            save_memory(user_message, full_response, metadata=metadata)
        
    except Exception as e:
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    yield f"data: {json.dumps({'done': True})}\n\n"
