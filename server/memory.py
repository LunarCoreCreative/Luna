"""
Luna Memory System
------------------
RAG-based memory using ChromaDB or fallback SimpleIndex.
"""

import os
import json
import math
from datetime import datetime
from typing import List, Dict, Optional
from pathlib import Path

from .config import DB_PATH
from .api import call_api_json

# =============================================================================
# LAZY LOADING GLOBALS
# =============================================================================

_chroma_client = None
_collection = None
_tech_collection = None
_style_collection = None
_study_collection = None
_embedder = None
_models_ready = False
_consolidation_counter = 0  # Counter for learning consolidation (every 5 interactions)

# Check if ChromaDB is available
try:
    import chromadb
    _USE_CHROMA = True
except ImportError:
    chromadb = None
    _USE_CHROMA = False

# =============================================================================
# SIMPLE INDEX (Fallback when ChromaDB unavailable)
# =============================================================================

class SimpleIndex:
    """Lightweight vector index using JSON storage."""
    
    def __init__(self, name: str):
        self.name = name
        self.file = DB_PATH / f"{name}.json"
        self.items = []
        self._load()
    
    def _load(self):
        try:
            if self.file.exists():
                self.items = json.loads(self.file.read_text(encoding="utf-8"))
        except Exception:
            self.items = []
    
    def save(self):
        try:
            self.file.write_text(json.dumps(self.items, ensure_ascii=False), encoding="utf-8")
        except Exception:
            pass
    
    def add(self, documents: List[str], embeddings: List[List[float]], 
            ids: List[str], metadatas: Optional[List[Dict]] = None):
        for i, doc in enumerate(documents):
            item = {
                "id": ids[i] if i < len(ids) else f"{self.name}_{int(datetime.now().timestamp()*1000)}_{i}",
                "doc": doc,
                "emb": embeddings[i] if i < len(embeddings) else [],
                "meta": metadatas[i] if metadatas and i < len(metadatas) else {}
            }
            self.items.append(item)
        self.save()
    
    def query(self, query_embeddings: List[List[float]], n_results: int = 3) -> Dict:
        q = query_embeddings[0]
        
        def cosine_similarity(a, b):
            if not a or not b:
                return -1.0
            dot = sum(x * y for x, y in zip(a, b))
            norm_a = math.sqrt(sum(x * x for x in a))
            norm_b = math.sqrt(sum(x * x for x in b))
            if norm_a == 0 or norm_b == 0:
                return -1.0
            return dot / (norm_a * norm_b)
        
        scored = sorted(self.items, key=lambda it: cosine_similarity(q, it.get("emb", [])), reverse=True)
        docs = [it["doc"] for it in scored[:n_results]]
        return {"documents": [docs]}
    
    def count(self) -> int:
        return len(self.items)

# =============================================================================
# COLLECTION GETTERS (Lazy Loading)
# =============================================================================

def get_chroma_client():
    global _chroma_client
    if not _USE_CHROMA:
        return None
    if _chroma_client is None:
        _chroma_client = chromadb.PersistentClient(path=str(DB_PATH))
    return _chroma_client

def get_collection():
    global _collection
    if _collection is None:
        if _USE_CHROMA:
            _collection = get_chroma_client().get_or_create_collection(name="historico_memoria")
        else:
            _collection = SimpleIndex("historico_memoria")
    return _collection

def get_tech_collection():
    global _tech_collection
    if _tech_collection is None:
        if _USE_CHROMA:
            _tech_collection = get_chroma_client().get_or_create_collection(name="conhecimento_tecnico")
        else:
            _tech_collection = SimpleIndex("conhecimento_tecnico")
    return _tech_collection

def get_style_collection():
    global _style_collection
    if _style_collection is None:
        if _USE_CHROMA:
            _style_collection = get_chroma_client().get_or_create_collection(name="estilo_literario")
        else:
            _style_collection = SimpleIndex("estilo_literario")
    return _style_collection

def get_study_collection():
    """Get or create the Study Mode documents collection."""
    global _study_collection
    if _study_collection is None:
        if _USE_CHROMA:
            _study_collection = get_chroma_client().get_or_create_collection(name="study_documents")
        else:
            _study_collection = SimpleIndex("study_documents")
    return _study_collection

def get_embedder():
    global _embedder
    if _embedder is None:
        from sentence_transformers import SentenceTransformer
        _embedder = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedder

def is_ready() -> bool:
    return _models_ready

async def preload_models():
    """Pre-warm models in background for faster first request."""
    global _models_ready
    import asyncio
    await asyncio.sleep(0.5)
    try:
        get_embedder()
        get_collection()
        get_tech_collection()
        get_style_collection()
        get_study_collection()
        _models_ready = True
        print("[LUNA] [OK] Modelos pré-aquecidos e prontos!")
    except Exception as e:
        print(f"[LUNA] Erro no pré-aquecimento: {e}")

# =============================================================================
# MEMORY FUNCTIONS
# =============================================================================

def search_memories(query: str, n: int = 3) -> List[str]:
    """Search conversation memories."""
    try:
        embeddings = get_embedder().encode(query).tolist()
        coll = get_collection()
        results = coll.query(query_embeddings=[embeddings], n_results=min(n, coll.count() or 1))
        return results["documents"][0] if results["documents"] else []
    except Exception:
        return []

def save_memory(user: str, assistant: str, metadata: dict = None):
    """Save a conversation exchange to memory."""
    try:
        # Aumentamos o limite para o Code Agent não perder detalhes técnicos
        text = f"Usuário: {user} | Luna: {assistant}"
        
        # Garante metadados básicos
        meta = metadata or {"type": "conversation"}
        meta["timestamp"] = datetime.now().isoformat()
        
        get_collection().add(
            documents=[text],
            embeddings=[get_embedder().encode(text).tolist()],
            ids=[f"m_{int(datetime.now().timestamp()*1000)}"],
            metadatas=[meta]
        )
    except Exception as e:
        print(f"[MEMORY] Erro ao salvar memória: {e}")

def search_knowledge(query: str, n: int = 3) -> List[str]:
    """Search technical knowledge base."""
    try:
        embeddings = get_embedder().encode(query).tolist()
        coll = get_tech_collection()
        results = coll.query(query_embeddings=[embeddings], n_results=min(n, coll.count() or 1))
        return results["documents"][0] if results["documents"] else []
    except Exception:
        return []

def save_technical_knowledge(title: str, content: str, tags: str = "") -> bool:
    """Save technical knowledge to RAG."""
    try:
        text = f"TITULO: {title}\nTAGS: {tags}\nCONTEUDO:\n{content}"
        get_tech_collection().add(
            documents=[text],
            embeddings=[get_embedder().encode(text).tolist()],
            ids=[f"t_{int(datetime.now().timestamp()*1000)}"],
            metadatas=[{"title": title, "tags": tags}]
        )
        return True
    except Exception:
        return False

def search_technical_knowledge(query: str, n: int = 3) -> List[str]:
    """Search technical knowledge by semantic similarity."""
    try:
        embeddings = get_embedder().encode(query).tolist()
        results = get_tech_collection().query(
            query_embeddings=[embeddings],
            n_results=n
        )
        return results.get("documents", [[]])[0]
    except Exception as e:
        print(f"[Memory] Erro na busca técnica: {e}")
        return []

def search_style(query: str, n: int = 1) -> List[str]:
    """Search literary style patterns."""
    try:
        embeddings = get_embedder().encode(query).tolist()
        coll = get_style_collection()
        results = coll.query(query_embeddings=[embeddings], n_results=min(n, coll.count() or 1))
        return results["documents"][0] if results["documents"] else []
    except Exception:
        return []

def save_literary_style(author: str, analysis: str, original_text_sample: str = "") -> bool:
    """Save literary style analysis."""
    try:
        content = f"ESTILO DE {author.upper()}:\n{analysis}\n\nAMOSTRA:\n{original_text_sample[:500]}..."
        search_text = f"estilo escrita {author} {analysis[:200]}"
        get_style_collection().add(
            documents=[content],
            embeddings=[get_embedder().encode(search_text).tolist()],
            ids=[f"style_{int(datetime.now().timestamp()*1000)}"],
            metadatas=[{"author": author, "type": "literary_style"}]
        )
        return True
    except Exception as e:
        print(f"Erro ao salvar estilo: {e}")
        return False


# =============================================================================
# SISTEMA DE APRENDIZADO CONTÍNUO (MELHORADO)
# =============================================================================

# Contador global para controlar frequência de consolidação
_consolidation_counter = 0

def cosine_similarity(a: List[float], b: List[float]) -> float:
    """Calcula similaridade de cosseno entre dois vetores."""
    if not a or not b or len(a) != len(b):
        return 0.0
    dot = sum(x * y for x, y in zip(a, b))
    norm_a = math.sqrt(sum(x * x for x in a))
    norm_b = math.sqrt(sum(x * x for x in b))
    if norm_a == 0 or norm_b == 0:
        return 0.0
    return dot / (norm_a * norm_b)


def is_duplicate_knowledge(new_content: str, threshold: float = 0.85) -> bool:
    """
    Verifica se conhecimento similar já existe na base.
    Retorna True se encontrar algo muito similar (evita duplicatas).
    """
    try:
        existing = search_technical_knowledge(new_content, n=3)
        if not existing:
            return False
            
        new_emb = get_embedder().encode(new_content).tolist()
        
        for old_doc in existing:
            old_emb = get_embedder().encode(old_doc).tolist()
            similarity = cosine_similarity(new_emb, old_emb)
            if similarity > threshold:
                print(f"[LEARN] Conhecimento similar já existe (sim={similarity:.2f}), pulando...")
                return True
        return False
    except Exception as e:
        print(f"[LEARN] Erro na verificação de duplicata: {e}")
        return False


async def consolidate_learning(messages: List[Dict]) -> List[str]:
    """
    Sistema de aprendizado contínuo melhorado.
    
    - Usa o modelo principal (DeepSeek) para consistência
    - Analisa sessão completa (últimas 10 mensagens)
    - Executa a cada 5 interações (não toda mensagem)
    - Deduplica semanticamente antes de salvar
    - Foca em padrões de erro e correção
    
    Returns:
        Lista de títulos dos conhecimentos aprendidos (vazia se nenhum)
    """
    global _consolidation_counter
    
    if not messages or len(messages) < 2:
        return []
    
    # Incrementa contador
    _consolidation_counter += 1
    
    # Só consolida a cada 5 interações (economia de API)
    if _consolidation_counter % 5 != 0:
        return []
    
    print(f"[LEARN] Iniciando consolidação (interação #{_consolidation_counter})...")
    
    # Pega sessão completa para contexto (últimas 10 mensagens)
    session = messages[-10:] if len(messages) > 10 else messages
    
    # Se a última mensagem não for do assistente, não há o que aprender ainda
    if session[-1].get("role") != "assistant":
        return []
    
    # Importa o modelo padrão (DeepSeek)
    from .config import MODEL

    prompt = f"""Você é um sistema de extração de conhecimento técnico.

Analise esta sessão de interação entre Usuário e Assistente (Luna).
Seu objetivo é extrair APRENDIZADOS REUTILIZÁVEIS, especialmente:

1. **ERROS e suas CORREÇÕES** - O que estava errado e como foi corrigido
2. **SOLUÇÕES TÉCNICAS** - Comandos, configurações, abordagens que funcionaram
3. **PADRÕES DE DEBUGGING** - Como erros foram identificados e resolvidos
4. **CONHECIMENTO CONCEITUAL** - Explicações importantes que podem ser reutilizadas

Sessão:
{json.dumps(session, ensure_ascii=False, indent=2)}

REGRAS:
- Extraia APENAS conhecimentos TÉCNICOS e REUTILIZÁVEIS
- Ignore conversas casuais, elogios ou feedback simples
- Seja CONCISO nos conteúdos (máximo 200 palavras por item)
- Use tags relevantes para buscas futuras

Retorne JSON (sem markdown):
{{
    "learned": true,
    "items": [
        {{
            "title": "Título descritivo do problema/solução",
            "content": "Explicação técnica da solução, incluindo exemplo de código se aplicável",
            "tags": "tag1, tag2, tag3",
            "type": "error_fix | solution | pattern | concept"
        }}
    ]
}}

Se não houver nada técnico para aprender, retorne:
{{"learned": false, "items": []}}
"""
    
    try:
        response = await call_api_json(
            messages=[{"role": "user", "content": prompt}],
            model=MODEL,  # Usa o modelo padrão (DeepSeek)
            temperature=0.2,  # Mais determinístico
            max_tokens=1500
        )
        
        if "choices" in response:
            content = response["choices"][0]["message"]["content"]
            # Limpa markdown se houver
            clean_content = content.replace("```json", "").replace("```", "").strip()
            
            # Tenta encontrar JSON válido
            try:
                data = json.loads(clean_content)
            except json.JSONDecodeError:
                # Tenta extrair JSON de dentro do texto
                import re
                json_match = re.search(r'\{.*\}', clean_content, re.DOTALL)
                if json_match:
                    data = json.loads(json_match.group())
                else:
                    print("[LEARN] Resposta não contém JSON válido")
                    return
            
            if data.get("learned") and data.get("items"):
                saved_count = 0
                learned_titles = []  # Acumula títulos para retorno
                for item in data["items"]:
                    title = item.get("title", "")
                    content_item = item.get("content", "")
                    tags = item.get("tags", "")
                    item_type = item.get("type", "solution")
                    
                    # Texto completo para verificação de duplicata
                    full_text = f"{title} {content_item}"
                    
                    # Verifica se já existe algo similar
                    if is_duplicate_knowledge(full_text):
                        continue
                    
                    # Adiciona tipo às tags
                    if item_type and item_type not in tags:
                        tags = f"{item_type}, {tags}" if tags else item_type
                    
                    # Salva o conhecimento
                    if save_technical_knowledge(title=title, content=content_item, tags=tags):
                        saved_count += 1
                        learned_titles.append(title)  # Adiciona à lista de retorno
                        print(f"[LEARN] ✓ Aprendido: {title}")
                    
                if saved_count > 0:
                    print(f"[LEARN] Consolidação completa: {saved_count} novos conhecimentos salvos!")
                    return learned_titles  # Retorna títulos aprendidos
                else:
                    print("[LEARN] Nenhum conhecimento novo (todos já existiam)")
                    return []
            else:
                print("[LEARN] Sessão sem conhecimento técnico extraível")
                return []
                
    except Exception as e:
        print(f"[LEARN] Erro na consolidação: {e}")
        return []

# =============================================================================
# STUDY MODE FUNCTIONS
# =============================================================================

def save_study_chunk(doc_id: str, chunk_index: int, text: str, title: str = "", author: str = "") -> bool:
    """
    Save a single chunk from a Study Mode document to the vector store.
    
    Args:
        doc_id: Unique document identifier
        chunk_index: Index of the chunk within the document
        text: The chunk text content
        title: Document title for metadata
        author: Document author for metadata
    
    Returns:
        True if saved successfully
    """
    try:
        chunk_id = f"study_{doc_id}_{chunk_index}"
        metadata = {
            "doc_id": doc_id,
            "chunk_index": chunk_index,
            "title": title,
            "author": author
        }
        
        get_study_collection().add(
            documents=[text],
            embeddings=[get_embedder().encode(text).tolist()],
            ids=[chunk_id],
            metadatas=[metadata]
        )
        return True
    except Exception as e:
        print(f"[STUDY] Erro ao salvar chunk: {e}")
        return False


def search_study_documents(query: str, n: int = 5) -> List[Dict]:
    """
    Search Study Mode documents for relevant chunks.
    
    Args:
        query: Search query
        n: Number of results to return
    
    Returns:
        List of dicts with 'text', 'title', 'author', 'doc_id'
    """
    try:
        coll = get_study_collection()
        count = coll.count()
        
        if count == 0:
            return []
        
        embeddings = get_embedder().encode(query).tolist()
        results = coll.query(
            query_embeddings=[embeddings],
            n_results=min(n, count),
            include=["documents", "metadatas"]
        )
        
        if not results["documents"] or not results["documents"][0]:
            return []
        
        output = []
        docs = results["documents"][0]
        metas = results.get("metadatas", [[]])[0]
        
        for i, doc in enumerate(docs):
            meta = metas[i] if i < len(metas) else {}
            output.append({
                "text": doc,
                "title": meta.get("title", "Documento"),
                "author": meta.get("author", "Desconhecido"),
                "doc_id": meta.get("doc_id", "")
            })
        
        return output
    except Exception as e:
        print(f"[STUDY] Erro na busca: {e}")
        return []


def delete_study_document(doc_id: str) -> bool:
    """
    Delete all chunks from a Study Mode document.
    
    Args:
        doc_id: Document ID to delete
    
    Returns:
        True if deleted successfully
    """
    try:
        coll = get_study_collection()
        # ChromaDB allows filtering by metadata
        if _USE_CHROMA:
            coll.delete(where={"doc_id": doc_id})
        else:
            # SimpleIndex fallback - filter manually
            coll.items = [it for it in coll.items if it.get("meta", {}).get("doc_id") != doc_id]
            coll.save()
        return True
    except Exception as e:
        print(f"[STUDY] Erro ao deletar documento: {e}")
        return False

