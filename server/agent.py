"""
Luna Agent
----------
Unified agent generator for streaming responses with tool support.
"""

import json
import re
import sys
from typing import AsyncGenerator

from .config import get_system_prompt, MODEL
from .memory import search_memories, save_memory, search_study_documents
from .api import call_api_stream, get_vision_description
from .chat import ChatRequest
from .tools import TOOLS, execute_tool, get_tools_schema
from . import artifacts
from .stream_parser import StreamStateParser
from .markdown_fixer import fix_markdown

# =============================================================================
# LOGGING SEGURO (Mapeamento de caracteres para evitar crash no Windows)
# =============================================================================

def safe_print(msg: str):
    """Prints a message to stdout in a unicode-safe way (replacing errors)."""
    try:
        # Tenta imprimir normalmente
        print(msg)
    except UnicodeEncodeError:
        # Se falhar, força encode/decode para ASCII/MBCS compatível
        try:
            # sys.stdout.encoding generally works, but fallback to ascii replace
            enc = sys.stdout.encoding or 'ascii'
            print(msg.encode(enc, 'replace').decode(enc))
        except:
             # Fallback final: apenas ASCII
             print(msg.encode('ascii', 'replace').decode('ascii'))

# =============================================================================
# PÓS-PROCESSAMENTO DE FORMATAÇÃO (Força quebras de linha)
# =============================================================================

def format_chat_text(text: str) -> str:
    """
    Pós-processa o texto para garantir formatação adequada.
    Insere quebras de linha antes de listas, bullets, e após pontuação.
    """
    if not text:
        return text
    
    result = text
    
    # 0. REMOVER TEMPLATES INDESEJADOS (forçado)
    result = re.sub(r'\*Conteúdo atualizado no Canvas\.?\*\s*', '', result)
    result = re.sub(r'\*Canvas atualizado\.?\*\s*', '', result)
    result = re.sub(r'⚡\s*\*Conteúdo atualizado[^*]*\*\s*', '', result)
    
    # 0.1 CORRIGIR FORMATAÇÃO MARKDOWN QUEBRADA (espaços entre ** e texto)
    # Estratégia: encontrar pares de ** ... ** e limpar espaços internos
    
    def fix_bold_spacing(match):
        """Corrige espaços dentro de blocos **...**"""
        content = match.group(1)
        # Remove espaços no início e fim do conteúdo interno
        return f"**{content.strip()}**"
    
    def fix_italic_spacing(match):
        """Corrige espaços dentro de blocos *...*"""
        content = match.group(1)
        return f"*{content.strip()}*"
    
    # Corrigir negrito: ** texto ** -> **texto**
    # Pattern: ** seguido de qualquer coisa (não-greedy) até **
    result = re.sub(r'\*\*\s*([^*]+?)\s*\*\*', fix_bold_spacing, result)
    
    # Corrigir itálico: * texto * -> *texto* (não pegar **)
    # Pattern mais cuidadoso para não pegar negrito
    result = re.sub(r'(?<!\*)\*\s+([^*]+?)\s+\*(?!\*)', fix_italic_spacing, result)
    
    # Remover ** órfãos que ficaram sozinhos (sem par)
    # Exemplo: "1. ** Abordagem**:" onde o primeiro ** não tem par válido
    # Se ** aparece no início de linha seguido de espaço e depois texto e **, provavelmente é um negrito mal formatado
    result = re.sub(r'^(\d+\.?\s*)\*\*\s+', r'\1**', result, flags=re.MULTILINE)
    
    # Corrigir caso especial: "****" (quando ** colou com **) -> remover
    result = re.sub(r'\*{4,}', '', result)
    

    # 1. Quebra antes de bullet points com negrito: "texto- **" -> "texto\n\n- **"
    result = re.sub(r'([^\n\-])(\s*-\s+\*\*)', r'\1\n\n\2', result)
    
    # 2. Quebra antes de bullet points simples: "texto- item" -> "texto\n\n- item"  
    result = re.sub(r'([^-\n])(\s*-\s+[A-ZÁÉÍÓÚÇ])', r'\1\n\n\2', result)
    
    # 3. Quebra após parênteses fechado seguido de letra/emoji: ")É" -> ")\n\nÉ"
    result = re.sub(r'\)([A-ZÁÉÍÓÚÇ✨💖🌙🎯📚🔧💡🎉⚡🌟❤️💕🌸☀️🌈🎨📝🚀💫🌺🔮✏️📖💻📱🎵🎶🌷])', r')\n\n\1', result)
    
    # 4. Quebra após reticências seguidas de emoji: "...💻" -> "...\n\n💻"
    result = re.sub(r'\.\.\.(\s*[✨💖🌙🎯📚🔧💡🎉⚡🌟❤️💕🌸☀️🌈🎨📝🚀💫🌺🔮✏️📖💻📱🎵🎶🌷📂🗂️])', r'...\n\n\1', result)
    
    # 5. Quebra após ? ou ! seguido de letra maiúscula (nova frase): "?E" -> "?\n\nE"
    result = re.sub(r'([?!])([A-ZÁÉÍÓÚÇ])', r'\1\n\n\2', result)
    
    # 6. Quebra após . seguido de emoji
    result = re.sub(r'\.(\s*[✨💖🌙🎯📚🔧💡🎉⚡🌟❤️💕🌸☀️🌈🎨📝🚀💫🌺🔮✏️📖💻📱🎵🎶🌷📂🗂️])', r'.\n\n\1', result)
    
    # 7. Quebra antes de "Ou..." que indica nova opção
    result = re.sub(r'([^\n])(Ou\.\.\.)', r'\1\n\n\2', result)
    
    # 8. QUEBRA APÓS TÍTULOS NUMERADOS: "1. RESUMO EXECUTIVOO texto" -> "1. RESUMO EXECUTIVO\n\nO texto"
    # Padrão: número + ponto + título em maiúsculas + letra maiúscula colada
    result = re.sub(r'(\d+\.\s*[A-ZÁÉÍÓÚÇ\s]+[A-ZÁÉÍÓÚÇ])([A-ZÁÉÍÓÚÇ][a-záéíóúç])', r'\1\n\n\2', result)
    
    # 9. Quebra após ** seguido imediatamente de letra (sem espaço)
    result = re.sub(r'\*\*([A-Za-záéíóúç])', r'**\n\n\1', result)
    
    # 10. Quebra após * de itálico seguido de letra maiúscula sem espaço: "*texto*O" -> "*texto*\n\nO"
    result = re.sub(r'\*([^*]+)\*([A-ZÁÉÍÓÚÇ])', r'*\1*\n\n\2', result)
    
    # 11. Evita múltiplas quebras de linha consecutivas (máximo 2)
    result = re.sub(r'\n{3,}', '\n\n', result)
    
    return result

# =============================================================================
# UTILITÁRIOS DE STREAMING
# =============================================================================

def extract_partial_json(json_str: str) -> dict:
    """
    Versão otimizada e robusta do extrator de JSON parcial.
    Garante captura de conteúdo incremental de forma segura.
    """
    extracted = {}
    s = json_str.strip()
    
    # 1. Tentar parse completo (rápido)
    try:
        return json.loads(s)
    except:
        pass
        
    # 2. Extração de campos simples (title, type, language, "id")
    for field in ["title", "type", "language", "id"]:
        # Busca por "field": "value" (capturando até a próxima aspa ou fim da string)
        match = re.search(rf'"{field}"\s*:\s*"([^"\\]*(?:\\.[^"\\]*)*)', s)
        if match:
            val = match.group(1)
            # Unescape se necessário
            try:
                extracted[field] = val.encode().decode('unicode_escape')
            except:
                extracted[field] = val
                
    # 3. Extração de conteúdo (HEURÍSTICA AGRESSIVA para streaming)
    # Busca o início do campo "content": "
    content_match = re.search(r'"content"\s*:\s*"(.*)', s, re.DOTALL)
    if content_match:
        content_val = content_match.group(1)
        valid_content = ""
        escaped = False
        
        # Percorre o conteúdo tratando caracteres de escape
        for char in content_val:
            if char == '\\' and not escaped:
                escaped = True
                valid_content += char
                continue
            if char == '"' and not escaped:
                # Encontrou o fechamento real (não escapado)
                break
            valid_content += char
            escaped = False
            
        # Limpeza final dos escapes para exibição no Canvas
        try:
            # Tenta decodificar escapes de string do JSON (ex: \n -> newline)
            extracted["content"] = valid_content.encode().decode('unicode_escape')
        except:
            # Fallback manual simples se falhar
            extracted["content"] = valid_content.replace("\\n", "\n").replace('\\"', '"').replace("\\\\", "\\")
            
    return extracted

# =============================================================================
# CANVAS - HEURÍSTICA DE DETECÇÃO DE CRIAÇÃO
# =============================================================================

# Keywords que indicam intenção de criar conteúdo substancial
CREATION_KEYWORDS = [
    # Verbos de criação
    "criar", "crie", "cria", "gerar", "gere", "gera",
    "escrever", "escreva", "escreve", "fazer", "faça", "faz",
    "desenvolver", "desenvolva", "implementar", "implemente",
    "construir", "construa", "montar", "monte", "elaborar", "elabore",
    "programar", "programe", "codar", "code", "redigir", "redija",
    "mostrar", "mostre", "mostra",
    # Objetos de criação - técnicos
    "código", "codigo", "script", "programa",
    "componente", "component", "função", "funcao", "classe", "class",
    "arquivo", "file", "módulo", "modulo", "module",
    "documento", "doc", "relatório", "relatorio",
    "diagrama", "fluxograma", "mermaid",
    "site", "página", "pagina", "page", "landing",
    "app", "aplicativo", "aplicação", "aplicacao",
    "api", "endpoint", "rota", "route",
    # Objetos de criação - literários/texto
    "livro", "capítulo", "capitulo", "história", "historia", "conto",
    "crônica", "cronica", "poesia", "poema", "redação", "redacao",
    "artigo", "ensaio", "texto", "markdown", "readme", "guia", "manual",
    # Linguagens e frameworks
    "html", "css", "javascript", "typescript", "python", "react", "vue", "angular",
    "node", "express", "fastapi", "django", "flask",
    "java", "c#", "csharp", "rust", "go", "kotlin", "swift",
    "sql", "query", "bash", "shell", "powershell",
    # Templates e exemplos
    "template", "modelo", "boilerplate", "exemplo", "sample",
]

# Frases comuns
CREATION_PHRASES = [
    "me faz", "me faça", "me cria", "me gera",
    "quero um", "quero uma", "preciso de um", "preciso de uma",
    "pode fazer", "pode criar", "pode gerar",
    "algo simples", "algo básico", "algo completo",
    "ordenar", "ordenação", "sorting", "sort"
]

def should_force_artifact(user_msg: str) -> bool:
    """
    Detecta se a mensagem do usuário indica intenção de criar conteúdo substancial.
    Se detectar, retorna True para forçar o uso da ferramenta create_artifact.
    """
    msg_lower = user_msg.lower()
    
    # Lista de exclusão: palavras que indicam feedback/elogio, NÃO criação/edição
    FEEDBACK_KEYWORDS = [
        "gostei", "amei", "adorei", "legal", "perfeito", "ótimo", "otimo", "bom", "boa",
        "incrível", "incrivel", "maravilhoso", "lindo", "bonito", "excelente", "top",
        "curti", "show", "demais", "massa", "bacana", "sensacional", "obrigado", "obrigada",
        "valeu", "thanks", "ok", "okay", "beleza", "blz", "hm", "hmm", "ah", "interessante",
        "entendi", "compreendi", "ajustei", "mudei", "editei", "arrumei", "corrigi", "ficou",
        "parece", "esta", "está", "tá", "ta", "queria", "quero apenas", "apenas"
    ]
    
    # Keywords que indicam pedido de REVISÃO/ANÁLISE (não edição!)
    REVIEW_KEYWORDS = [
        "dá uma olhada", "da uma olhada", "olhe", "olha", "analise", "analisa",
        "revise", "revisa", "revisão", "revisao", "o que acha", "o que achou",
        "está bom", "esta bom", "ta bom", "tá bom", "feedback", "critique",
        "consegue dar uma olhada", "pode olhar", "pode revisar", "veja",
        "me diz o que acha", "opinião", "opiniao"
    ]
    
    # Se contiver keywords de revisão, NÃO forçar artifact (ela deve analisar, não editar)
    if any(rk in msg_lower for rk in REVIEW_KEYWORDS):
        return False
    
    # Se a mensagem for curta e contiver principalmente feedback, NÃO forçar artifact
    words = msg_lower.split()
    if len(words) <= 15:  # Mensagens de até 15 palavras podem ser só feedback/comentário
        is_feedback = any(fb in msg_lower for fb in FEEDBACK_KEYWORDS)
        if is_feedback and not any(kw in msg_lower for kw in ["crie", "faça", "gere", "escreva"]):
            return False  # É comentário/feedback, não quer forçar ferramenta
    
    # Verifica se contém keywords de criação
    for keyword in CREATION_KEYWORDS:
        if keyword in msg_lower:
            return True
    
    # Verifica se contém frases de criação
    for phrase in CREATION_PHRASES:
        if phrase in msg_lower:
            return True
    
    return False

def handle_edit_artifact(args: dict, messages: list, user_id: str = None) -> dict:
    """
    Executa a edição de um artefato existente usando Search & Replace.
    Busca o artefato no histórico pelo ID e aplica as mudanças.
    """
    artifact_id = args.get("artifact_id")
    changes = args.get("changes", [])
    safe_print(f"[DEBUG-EDIT] Editando artefato ID: {artifact_id}, Mudanças: {len(changes)}")
    
    # 1. Encontrar o artefato no histórico (do mais recente para o mais antigo)
    target_artifact = None
    for msg in reversed(messages):
        if msg.artifact and msg.artifact.get("id") == artifact_id:
            target_artifact = msg.artifact
            safe_print(f"[DEBUG-EDIT] Artefato alvo encontrado: {target_artifact.get('title')}")
            break
            
    # Fallback: Verifica se é o artefato ativo
    if not target_artifact:
        # Importar aqui para evitar circularidade se necessário, ou assumir gestão externa
        # Mas como não temos acesso ao ArtifactStore aqui diretamente sem import,
        # vamos confiar que a mensagem deveria ter trazido. 
        # Se falhar, tentamos ler do disco via artifacts (se importado)
        try:
            from . import artifacts
            found = artifacts.get_artifact(artifact_id, user_id=user_id)
            if found:
                target_artifact = found
                safe_print(f"[DEBUG-EDIT] Artefato encontrado via Store: {target_artifact.get('title')}")
        except:
            pass

    if not target_artifact:
        safe_print(f"[DEBUG-EDIT] ERRO: Artefato {artifact_id} não encontrado no histórico!")
        return {"success": False, "error": f"Artefato com ID {artifact_id} não encontrado no contexto recente."}
    
    current_content = target_artifact.get("content", "")
    new_content = current_content
    
    # 2. Aplicar mudanças sequencialmente
    success_count = 0
    errors = []

    for change in changes:
        search_block = change.get("search", "")
        replace_block = change.get("replace", "")
        
        # Normalização simples (remove \r)
        content_norm = new_content.replace("\r\n", "\n")
        search_norm = search_block.replace("\r\n", "\n")
        
        # --- ESTRATÉGIA 1: MATCH EXATO ---
        if search_norm in content_norm:
             new_content = content_norm.replace(search_norm, replace_block)
             success_count += 1
             continue
        
        # --- ESTRATÉGIA 2: MATCH FLEXÍVEL (Indentation/Whitespace Agnostic) ---
        # "Structural Subsequence Match"
        # Ignora diferenças de indentação e linhas vazias "fantasmas"
        
        content_lines = content_norm.split('\n')
        
        # Mapeia linhas não-vazias para seus índices originais
        # Formato: [(original_index, clean_content)]
        non_empty_map = []
        for i, line in enumerate(content_lines):
            if line.strip():
                non_empty_map.append((i, line.strip()))
                
        search_lines_stripped = [line.strip() for line in search_norm.split('\n') if line.strip()]
        
        if not search_lines_stripped:
             errors.append("Bloco de busca vazio ou contendo apenas espaços.")
             continue

        # Busca a subsequência (search_lines_stripped) dentro de (non_empty_map)
        content_stripped = [x[1] for x in non_empty_map]
        
        n = len(search_lines_stripped)
        m = len(content_stripped)
        found_start_idx = -1
        
        if n <= m:
            for i in range(m - n + 1):
                if content_stripped[i : i + n] == search_lines_stripped:
                    found_start_idx = i
                    break
        
        if found_start_idx != -1:
            # Encontrou! Mapear de volta para índices originais
            start_mapping = non_empty_map[found_start_idx]       # (original_idx, content)
            end_mapping = non_empty_map[found_start_idx + n - 1] # (original_idx, content)
            
            orig_start_line = start_mapping[0]
            orig_end_line = end_mapping[0]
            
            safe_print(f"[DEBUG-EDIT] Match Estrutural Encontrado! Linhas {orig_start_line} até {orig_end_line}")
            
            # Substituir o intervalo total nas linhas originais
            # Isso substitui tudo entre a primeira e a última linha do match, 
            # incluindo linhas vazias originais que estejam no meio.
            # O replace_block entra inteiro no lugar.
            
            new_lines = content_lines[:orig_start_line] + [replace_block] + content_lines[orig_end_line+1:]
            new_content = "\n".join(new_lines)
            success_count += 1
            continue

        # --- FALHA ---
        safe_print(f"[DEBUG-EDIT] Falha ao encontrar bloco:\n{search_norm[:100]}...")
        # Adiciona erro mas continua tentando outras mudanças se houver
        errors.append(f"Não encontrei o bloco: '{search_block[:50]}...'")

    # 3. Retornar novo artefato (preservando metadados mas atualizando conteúdo)
    updated_artifact = target_artifact.copy()
    updated_artifact["content"] = new_content
    
    # Salvar apenas se houve mudança real
    if new_content != current_content:
        try:
            from .artifacts import save_artifact as persist_artifact
            result = persist_artifact(updated_artifact, user_id=user_id)
            if result.get("success") and result.get("artifact"):
                updated_artifact = result["artifact"]
        except Exception as e:
            safe_print(f"[DEBUG-EDIT] Erro ao salvar: {e}")
            return {"success": False, "error": f"Erro ao salvar artefato: {str(e)}"}
            
        return {
            "success": True,
            "artifact": updated_artifact,
            "message": f"Artefato editado com sucesso ({success_count}/{len(changes)} alterações aplicadas)." + (f" Erros: {'; '.join(errors)}" if errors else "")
        }
    else:
        return {
            "success": False, 
            "error": f"Nenhuma alteração aplicada. Verifique se os blocos de busca correspondem ao texto original. (Erros: {'; '.join(errors)})"
        }

# =============================================================================
# AGENT GENERATOR
# =============================================================================

async def unified_generator(request: ChatRequest) -> AsyncGenerator[str, None]:
    """
    Main agent generator that handles:
    - Image analysis
    - Memory retrieval
    - Tool execution
    - Streaming responses
    """
    user_msg = request.messages[-1].content
    yield f"data: {json.dumps({'start': True, 'mode': 'agent'})}\n\n"
    
    # Process images if present
    images_descriptions = []
    last_msg = request.messages[-1]
    
    if last_msg.images:
        safe_print(f"[DEBUG-IMAGES] Processando {len(last_msg.images)} imagem(ns)...")
        yield f"data: {json.dumps({'status': 'Luna está observando as imagens...', 'type': 'info'})}\n\n"
        for i, img_b64 in enumerate(last_msg.images):
            safe_print(f"[DEBUG-IMAGES] Analisando imagem {i+1}, tamanho base64: {len(img_b64)} chars")
            try:
                desc = await get_vision_description(img_b64, last_msg.content)
                safe_print(f"[DEBUG-IMAGES] Resultado imagem {i+1}: {desc[:200]}...")
                images_descriptions.append(f"IMAGEM {i+1}: {desc}")
            except Exception as e:
                err_msg = str(e)
                safe_print(f"[DEBUG-IMAGES] ERRO imagem {i+1}: {err_msg}")
                images_descriptions.append(f"IMAGEM {i+1}: [FALHA NO SISTEMA DE VISÃO: {err_msg}]")
    else:
        safe_print(f"[DEBUG-IMAGES] Nenhuma imagem detectada na mensagem")
    
    
    # Search memories
    memories = search_memories(user_msg, user_id=request.user_id) if user_msg.strip() and request.user_id else []
    
    # -------------------------------------------------------------------------
    # GESTÃO DE CONTEXTO DE ARTEFATO ATIVO
    # -------------------------------------------------------------------------
    active_artifact_content = ""
    active_artifact_title = ""
    
    if request.active_artifact_id:
        # Busca a versão mais atualizada direto da persistência (ArtifactStore)
        # Isso garante que edições manuais do usuário sejam capturadas!
        found_art = artifacts.get_artifact(request.active_artifact_id, user_id=request.user_id)
        
        if found_art:
            active_artifact_title = found_art.get('title', 'Sem título')
            art_id = found_art.get('id')
            # Injeta o conteúdo COMPLETO do artefato ativo para edição precisa
            active_artifact_content = f"""
🚨🚨🚨 ATENÇÃO: ARTEFATO ATIVO DETECTADO 🚨🚨🚨

[ARTEFATO ABERTO NO CANVAS - VOCÊ DEVE EDITAR ESTE, NÃO CRIAR NOVO]
artifact_id OBRIGATÓRIO para edit_artifact: {art_id}
TÍTULO: {active_artifact_title}
TIPO: {found_art.get('type')}
LINGUAGEM: {found_art.get('language', 'N/A')}

CONTEÚDO ATUAL (versão mais recente do disco):
---
{found_art.get('content')}
---
[FIM DO ARTEFATO]

⚠️ INSTRUÇÃO CRÍTICA OBRIGATÓRIA:
1. Para QUALQUER modificação (aprofundar, expandir, continuar, melhorar, detalhar), use APENAS:
   edit_artifact(artifact_id="{art_id}", changes=[...])
   
2. Se você usar create_artifact, você VAI CRIAR UM ARQUIVO DUPLICADO e o usuário perderá o original!

3. VERBOS QUE EXIGEM edit_artifact:
   - "aprofundar" → edit_artifact
   - "expandir" → edit_artifact  
   - "continuar" → edit_artifact
   - "melhorar" → edit_artifact
   - "adicionar" → edit_artifact
   - "detalhar" → edit_artifact
   - "escrever mais" → edit_artifact

4. ÚNICO CASO para create_artifact: usuário pede explicitamente "criar NOVO arquivo" ou é um tipo/propósito completamente diferente.
"""
            safe_print(f"[DEBUG-CTX] Artefato Ativo Injetado: {active_artifact_title} (ID: {art_id})")

    # Build system prompt with current date and user identity
    safe_print(f"[DEBUG-IDENTITY] Request UserID: {request.user_id}")
    safe_print(f"[DEBUG-IDENTITY] Request UserName: {request.user_name}")
    
    prompt = get_system_prompt(
        user_id=request.user_id,
        user_name=request.user_name or "Usuário"
    )
    
    # Log the first few lines of the generated identity prompt to verify override
    safe_print(f"[DEBUG-IDENTITY] Prompt Start: {prompt[:100]}...")
    
    if active_artifact_content:
        prompt += f"\n\n{active_artifact_content}"
        
    if images_descriptions:
        vision_context = f"""
🖼️ [SISTEMA DE VISÃO - INFORMAÇÕES VISUAIS]:
Seu módulo de visão (Maverick) analisou as imagens enviadas e gerou as descrições abaixo. 
USE ESTAS DESCRIÇÕES PARA RESPONDER AO USUÁRIO COMO SE VOCÊ ESTIVESSE VENDO AS IMAGENS:

{chr(10).join(images_descriptions)}

⚠️ NOTA TÉCNICA: Apenas reporte erro de visão se você ver explicitamente a mensagem '[FALHA NO SISTEMA DE VISÃO]' acima. Caso contrário, aja como se a visão estivesse 100% funcional.
"""
        prompt += vision_context
        safe_print(f"[DEBUG-VISION-INJECT] Injetadas {len(images_descriptions)} descrições de imagem no contexto")
    if memories:
        prompt += "\n\n[MEMÓRIAS]:\n" + "\n".join(memories)
    
    # Search Study Mode documents for relevant context
    study_results = search_study_documents(user_msg, n_results=3, user_id=request.user_id) if request.user_id else []
    if study_results:
        study_context = "\n\n[CONHECIMENTO ESTUDADO (DOCUMENTOS DO USUÁRIO)]:\n"
        for i, result in enumerate(study_results, 1):
            study_context += f"\n--- Fonte {i}: {result['title']} (por {result['author']}) ---\n"
            study_context += result['text'][:1500]  # Limit chunk size
            if len(result['text']) > 1500:
                study_context += "...[truncado]"
            study_context += "\n"
        study_context += "\n[FIM DO CONHECIMENTO ESTUDADO]\n"
        study_context += "INSTRUÇÃO: Use estas informações dos documentos do usuário para responder. Cite a fonte quando relevante."
        prompt += study_context
        safe_print(f"[DEBUG-STUDY] Injetados {len(study_results)} chunks de documentos estudados")
    
    # Build message history
    final_messages = []
    messages_to_process = request.messages[-10:]  # Keep last 10 messages for conversation flow
    
    for m in messages_to_process:
        content = m.content or ""
        if m.images:
            content += "\n[Imagens enviadas]"
        
        # Se a mensagem tem um artefato, e ele NÃO é o ativo (já injetado no system), mostra resumo
        if m.artifact:
            art = m.artifact
            if art.get("id") != request.active_artifact_id:
                 art_content = art.get('content', '')
                 if len(art_content) > 1000:
                     art_content = art_content[:1000] + "... [truncado]"
                 content += f"\n\n[ARTEFATO GERADO: {art.get('title')} ({art.get('type')})]\n{art_content}"
            else:
                 content += f"\n\n[ARTEFATO GERADO: {art.get('title')}] (Conteúdo já injetado no Contexto Global)"
            
        final_messages.append({"role": m.role, "content": content})
    
    msgs = [{"role": "system", "content": prompt}] + final_messages
    tools = get_tools_schema()
    
    full_response = ""
    max_iterations = 5
    
    try:
        for iteration in range(max_iterations):
            if iteration > 0:
                yield f"data: {json.dumps({'status': f'Refinando (etapa {iteration+1})...', 'type': 'info'})}\n\n"
            
            current_content = ""
            current_tool_calls_buffer = {}
            announced_tools = set()
            parser = StreamStateParser()  # Inicializar Parser
            
            # Tool choice strategy
            current_tool_choice = "auto"
            current_tools = tools
            
            # PRIORIDADE: Forçar criação de artefatos se detectado
            has_tool_result = any(m.get("role") == "tool" for m in msgs)
            is_creation = should_force_artifact(user_msg)
            
            if not has_tool_result and is_creation and iteration < 2:
                current_tools = [t for t in tools if t["function"]["name"] in ["create_artifact", "edit_artifact", "get_artifact"]]
                current_tool_choice = "auto"
                hint = "\n\n[SISTEMA: AJA AGORA. Use 'create_artifact' ou 'edit_artifact'. Não planeje infinitamente.]"
                if iteration == 0: msgs[-1]["content"] += hint
                yield f"data: {json.dumps({'status': 'Ativando Canvas...', 'type': 'info'})}\n\n"
            elif has_tool_result:
                # Se já temos resultados de ferramentas, PRIORIZAR resposta em texto (resumo)
                # Desativa ferramentas para evitar loops infinitos de "pensamento"
                current_tools = None
                current_tool_choice = "none"
            elif iteration == 0 and request.deep_thinking:
                current_tool_choice = {"type": "function", "function": {"name": "think"}}
                current_tools = [t for t in tools if t["function"]["name"] == "think"]
            
            # URL DETECTION: Se o usuário passou uma URL específica, forçar read_url
            url_pattern = r'https?://[^\s<>"\']+' 
            url_match = re.search(url_pattern, user_msg)
            if iteration == 0 and url_match and not request.active_artifact_id:
                detected_url = url_match.group(0)
                current_tools = [t for t in tools if t["function"]["name"] == "read_url"]
                current_tool_choice = {"type": "function", "function": {"name": "read_url"}}
                hint = f"\n\n[SISTEMA: O usuário forneceu uma URL específica: {detected_url}. Use 'read_url' para acessar o conteúdo desta página. NÃO use web_search.]"
                msgs[-1]["content"] += hint
                yield f"data: {json.dumps({'status': 'Lendo página...', 'type': 'info'})}\n\n"
            
            # Stream API response
            async for chunk in call_api_stream(msgs, tools=current_tools, tool_choice=current_tool_choice, model=MODEL):
                if "error" in chunk:
                    err = chunk.get("error")
                    yield f"data: {json.dumps({'content': f'Error: {err}'})}\n\n"
                    return
                if not chunk.get("choices"): continue
                
                delta = chunk["choices"][0].get("delta", {})
                
                # 1. Thinking (DeepSeek reasoning)
                rc = delta.get("reasoning_content")
                if rc:
                    current_thought += rc
                    yield f"data: {json.dumps({'thinking': rc})}\n\n"
                
                # 2. Tool Calls (Captura Robusta)
                tc_deltas = delta.get("tool_calls", [])
                for td in tc_deltas:
                    idx = td.get("index", 0)
                    if idx not in current_tool_calls_buffer:
                        current_tool_calls_buffer[idx] = {"id": td.get("id"), "name": "", "arguments": ""}
                    
                    if td.get("id"): 
                        current_tool_calls_buffer[idx]["id"] = td["id"]
                    
                    if "function" in td:
                        f = td["function"]
                        # Nome (Acumular com segurança)
                        new_name = f.get("name", "")
                        if new_name:
                            current_tool_calls_buffer[idx]["name"] += new_name
                        
                        # Argumentos (Acumular com segurança)
                        new_args = f.get("arguments", "")
                        if new_args:
                            current_tool_calls_buffer[idx]["arguments"] += new_args
                        
                        # Feedback imediato se a ferramenta for identificada
                        fname = current_tool_calls_buffer[idx]["name"]
                        if fname in TOOLS and (idx, fname) not in announced_tools:
                            yield f"data: {json.dumps({'tool_call': {'name': fname, 'args': {}}})}\n\n"
                            announced_tools.add((idx, fname))
                        
                        # Stream de argumentos parciais (Throttled para fluidez)
                        if (idx, fname) in announced_tools:
                            try:
                                args_str = current_tool_calls_buffer[idx]["arguments"]
                                
                                # Logs de depuração no servidor (Alta visibilidade)
                                if len(args_str) % 50 < 4: # Loga a cada ~50 chars para não inundar o terminal
                                    safe_print(f"[STREAMING {fname}] Args len: {len(args_str)}")

                                # Processa o JSON parcial
                                partial = extract_partial_json(args_str)
                                
                                # Emissão para o Canvas (Sincronização proativa)
                                if fname == "create_artifact" and partial.get("title"):
                                    # Usamos um ID único para streaming para evitar keys duplicadas
                                    # Prefixo "temp_" indica que é temporário (não tentar carregar via API)
                                    art_id = partial.get("id") or f"temp_{iteration}_{idx}"
                                    # Yield apenas o necessário para o streaming
                                    yield f"data: {json.dumps({'partial_artifact': {**partial, 'id': art_id, 'is_streaming': True}})}\n\n"
                                
                                # Payload completo para o badge (para ver os campos surgindo)
                                yield f"data: {json.dumps({'tool_call': {'name': fname, 'args': partial}})}\n\n"
                            except Exception as e:
                                safe_print(f"[DEBUG-STREAM] Falha: {str(e)}")
                
                # 3. Content (Parser Inteligente via State Machine)
                chunk_text = delta.get("content", "")
                if chunk_text:
                    # Ingesta via State Machine
                    parser_events = parser.ingest(chunk_text)
                    
                    for event in parser_events:
                        if event["type"] == "content":
                            # Safe text to display
                            filtered = event["text"]
                            # Hard filter for residual tokens (safety net)
                            filtered = filtered.replace("<|tool_calls_begin|>", "").replace("<|tool_calls_end|>", "")
                            
                            if filtered:
                                display_text = format_chat_text(filtered)
                                display_text = fix_markdown(display_text)
                                current_content += filtered
                                yield f"data: {json.dumps({'content': display_text})}\n\n"
                        
                        elif event["type"] == "tool_call_text":
                            # Tool call recovered from text stream
                            tc = event["json"]
                            if isinstance(tc, list):
                                for item in tc:
                                    t_name = item.get("name")
                                    t_args = item.get("arguments")
                                    safe_print(f"[DEBUG-AGENT] Text Tool Call Detected via Parser: {t_name}")
                                    idx = 2000 + len(current_tool_calls_buffer) 
                                    current_tool_calls_buffer[idx] = {
                                        "id": f"call_text_{idx}",
                                        "name": t_name,
                                        "arguments": json.dumps(t_args) if isinstance(t_args, (dict, list)) else str(t_args)
                                    }
                                    yield f"data: {json.dumps({'tool_call': {'name': t_name, 'args': t_args}})}\n\n"
                            
                            elif isinstance(tc, dict):
                                t_name = tc.get("name")
                                t_args = tc.get("arguments")
                                safe_print(f"[DEBUG-AGENT] Text Tool Call Detected via Parser: {t_name}")
                                idx = 2000 + len(current_tool_calls_buffer)
                                current_tool_calls_buffer[idx] = {
                                    "id": f"call_text_{idx}",
                                    "name": t_name,
                                    "arguments": json.dumps(t_args) if isinstance(t_args, (dict, list)) else str(t_args)
                                }
                                yield f"data: {json.dumps({'tool_call': {'name': t_name, 'args': t_args}})}\n\n" 

            # Process tool calls if any (Struct or Text-Based)
            if current_tool_calls_buffer:
                tool_calls = list(current_tool_calls_buffer.values())
                
                # Format tool_calls for API compatibility
                formatted_tool_calls = []
                for tc in tool_calls:
                    formatted_tool_calls.append({
                        "id": tc["id"],
                        "type": "function",
                        "function": {
                            "name": tc["name"],
                            "arguments": tc["arguments"]
                        }
                    })
                
                msgs.append({
                    "role": "assistant",
                    "content": current_content or None, # Pode ser vazio se foi tudo tool call
                    "tool_calls": formatted_tool_calls
                })
                
                for tc in tool_calls:
                    name = tc["name"]
                    args_str = tc["arguments"]
                    tc_id = tc["id"]
                    
                    try:
                        args = json.loads(args_str)
                    except json.JSONDecodeError:
                        args = {}
                    
                    try:
                        if name == "edit_artifact":
                            # Custom edit logic
                            result = handle_edit_artifact(args, request.messages, user_id=request.user_id)
                        else:
                            result = execute_tool(name, args, user_id=request.user_id)
                    except Exception as e:
                        result = {"success": False, "error": str(e)}
                    
                    yield f"data: {json.dumps({'tool_result': result})}\n\n"
                    
                    # Verificar se houve aprendizado durante a ferramenta
                    from .tools import get_learning_events
                    learning_events = get_learning_events()
                    if learning_events:
                        yield f"data: {json.dumps({'learning': [e['title'] for e in learning_events]})}\n\n"
                    
                    msgs.append({
                        "tool_call_id": tc_id,
                        "role": "tool",
                        "name": name,
                        "content": json.dumps(result, ensure_ascii=False)
                    })
                    
                    # Se foi uma ferramenta de Canvas, adicionar hint para responder
                    if name in ["create_artifact", "edit_artifact", "get_artifact"] and result.get("success"):
                        action_type = "criado" if name == "create_artifact" else ("lido" if name == "get_artifact" else "atualizado")
                        # Usamos 'system' em vez de 'user' para a instrução ser mais imperativa e não sujar o histórico do usuário
                        msgs.append({
                            "role": "system",
                            "content": f"[SISTEMA: O artefato foi {action_type} com sucesso no Canvas. FALE COM O USUÁRIO AGORA: Dê um resumo muito breve e natural (2 frases) e ofereça ajuda.]"
                        })
                    
                    # Se foi uma ferramenta de BUSCA, adicionar hint para SINTETIZAR resultados
                    if name in ["web_search", "read_url"] and result.get("success"):
                        source_type = "pesquisa na web" if name == "web_search" else "leitura da página"
                        msgs.append({
                            "role": "user",
                            "content": f"""[SISTEMA: A {source_type} foi concluída com sucesso. Os resultados estão acima.
INSTRUÇÕES CRÍTICAS PARA SUA RESPOSTA:
1. SINTETIZE os resultados em uma resposta NATURAL e INFORMATIVA.
2. NÃO apenas liste os resultados brutos - ORGANIZE a informação de forma útil.
3. CITE as fontes relevantes quando apropriado (ex: "Segundo o Python.org...").
4. Se foi uma pesquisa sobre estilo de autor, ANALISE os padrões encontrados.
5. Se o usuário queria informações específicas, RESPONDA diretamente à pergunta dele.
6. Seja detalhista e informativa - esta é a parte mais importante da resposta!]"""
                        })
                
                full_response += (current_content or "")
                continue
            else:
                full_response += current_content
                break
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        safe_print(f"[DEBUG-AGENT-ERROR] {str(e).encode('ascii', 'replace').decode('ascii')}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
    finally:
        # Save to memory
        if full_response and request.user_id:
            save_memory(user_msg, {"response": full_response}, user_id=request.user_id)
    
    yield f"data: {json.dumps({'done': True})}\n\n"
