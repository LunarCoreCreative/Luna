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

# =============================================================================
# LAZY LOADING GLOBALS
# =============================================================================

_chroma_client = None
_collection = None
_tech_collection = None
_style_collection = None
_embedder = None
_models_ready = False

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

def save_memory(user: str, assistant: str):
    """Save a conversation exchange to memory."""
    try:
        text = f"Ethan: {user} | Luna: {assistant[:200]}"
        get_collection().add(
            documents=[text],
            embeddings=[get_embedder().encode(text).tolist()],
            ids=[f"m_{int(datetime.now().timestamp()*1000)}"]
        )
    except Exception:
        pass

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
