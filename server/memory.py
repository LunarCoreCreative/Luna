"""
Luna Memory System (Cloud Sync Edition)
--------------------------------------
User-centric semantic memory using Firebase Firestore Vector Search.
Provides persistent RAG across devices for conversations, knowledge, and study.
"""

import os
import json
import uuid
from datetime import datetime, timezone
from typing import List, Dict, Optional
from pathlib import Path

from .config import DB_PATH
from .api import call_api_json
from .firebase_config import get_firestore

# Firebase Vector Search Imports
try:
    from google.cloud.firestore_v1.vector import Vector
    from google.cloud.firestore_v1.base_vector_query import DistanceMeasure
    _VECTOR_SUPPORT = True
except ImportError:
    _VECTOR_SUPPORT = False

# =============================================================================
# GLOBALS & CACHE
# =============================================================================

_embedder = None
_models_ready = False

# =============================================================================
# FIRESTORE COLLECTION WRAPPERS (Scoped by User ID)
# =============================================================================

def get_user_memory_col(user_id: str):
    db = get_firestore()
    if not db or not user_id: return None
    return db.collection("users").document(user_id).collection("memories")

def get_tech_col(user_id: str = None):
    db = get_firestore()
    if not db: return None
    if user_id:
        return db.collection("users").document(user_id).collection("technical_knowledge")
    return db.collection("global_technical_knowledge")

def get_style_col(user_id: str):
    db = get_firestore()
    if not db or not user_id: return None
    return db.collection("users").document(user_id).collection("literary_styles")

def get_study_col(user_id: str):
    db = get_firestore()
    if not db or not user_id: return None
    return db.collection("users").document(user_id).collection("study_documents")

def get_embedder():
    global _embedder
    if _embedder is None:
        from sentence_transformers import SentenceTransformer
        _embedder = SentenceTransformer("all-MiniLM-L6-v2")
    return _embedder

def is_ready() -> bool:
    return _models_ready

async def preload_models():
    """Pre-warm models in background."""
    global _models_ready
    import asyncio
    try:
        get_embedder()
        _models_ready = True
    except Exception as e:
        print(f"[MEMORY] Error preloading models: {e}")

# =============================================================================
# CORE MEMORY FUNCTIONS
# =============================================================================

def search_memories(query: str, n_results: int = 5, user_id: str = None) -> List[str]:
    """Search conversational memories for a user using Vector Search."""
    if not user_id or not _VECTOR_SUPPORT:
        return []
        
    col = get_user_memory_col(user_id)
    if not col: return []
    
    try:
        query_vector = get_embedder().encode(query).tolist()
        
        # Firestore Vector Search Query
        vector_query = col.find_nearest(
            vector_field="embedding",
            query_vector=Vector(query_vector),
            distance_measure=DistanceMeasure.COSINE,
            limit=n_results
        )
        
        results = vector_query.get()
        return [doc.to_dict().get("content", "") for doc in results]
    except Exception as e:
        print(f"[MEMORY] Search error: {e}")
        return []

def save_memory(content: str, metadata: Dict = None, user_id: str = None):
    """Save a conversational memory to Firestore."""
    if not user_id: return
    
    col = get_user_memory_col(user_id)
    if not col: return
    
    try:
        embedding = get_embedder().encode(content).tolist()
        doc_id = str(uuid.uuid4())
        
        col.document(doc_id).set({
            "content": content,
            "embedding": Vector(embedding),
            "metadata": metadata or {},
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    except Exception as e:
        print(f"[MEMORY] Save error: {e}")

# =============================================================================
# TECHNICAL KNOWLEDGE (Global + User)
# =============================================================================

def save_technical_knowledge(title: str, content: str, user_id: str = None) -> bool:
    """Save technical knowledge snippets."""
    col = get_tech_col(user_id)
    if not col: return False
    
    try:
        embedding = get_embedder().encode(f"{title}\n{content}").tolist()
        doc_id = str(uuid.uuid4())
        
        col.document(doc_id).set({
            "title": title,
            "content": content,
            "embedding": Vector(embedding),
            "updated_at": datetime.now(timezone.utc).isoformat()
        })
        return True
    except Exception as e:
        print(f"[MEMORY] Tech Save error: {e}")
        return False

def search_knowledge(query: str, n_results: int = 3, user_id: str = None) -> List[Dict]:
    """Search knowledge (mix of user and global)."""
    if not _VECTOR_SUPPORT: return []
    
    results = []
    
    # 1. Search User Knowledge
    if user_id:
        user_col = get_tech_col(user_id)
        if user_col:
            try:
                emb = get_embedder().encode(query).tolist()
                q = user_col.find_nearest("embedding", Vector(emb), DistanceMeasure.COSINE, n_results)
                results.extend([{"source": "user", **d.to_dict()} for d in q.get()])
            except: pass
            
    # 2. Search Global Knowledge
    global_col = get_tech_col(None)
    if global_col:
        try:
            emb = get_embedder().encode(query).tolist()
            q = global_col.find_nearest("embedding", Vector(emb), DistanceMeasure.COSINE, n_results)
            results.extend([{"source": "global", **d.to_dict()} for d in q.get()])
        except: pass
        
    # Sort and Deduplicate
    return sorted(results, key=lambda x: x.get("updated_at", ""), reverse=True)[:n_results]

# =============================================================================
# STYLE ANALYSIS
# =============================================================================

def save_literary_style(author: str, patterns: List[str], samples: List[str], user_id: str):
    """Save author style patterns."""
    col = get_style_col(user_id)
    if not col: return
    
    try:
        data = {
            "author": author,
            "patterns": patterns,
            "samples": samples[:5],
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        # Use author as ID for easier updates
        doc_id = author.lower().replace(" ", "_")
        col.document(doc_id).set(data)
    except Exception as e:
        print(f"[MEMORY] Style Save error: {e}")

def search_style(author: str, user_id: str) -> Optional[Dict]:
    """Search specific style by author name."""
    col = get_style_col(user_id)
    if not col: return None
    
    doc_id = author.lower().replace(" ", "_")
    doc = col.document(doc_id).get()
    return doc.to_dict() if doc.exists else None

# =============================================================================
# STUDY MODE (RAG)
# =============================================================================

def save_study_chunk(doc_id: str, chunk_text: str, metadata: Dict, user_id: str):
    """Save a study document chunk with vector embedding."""
    col = get_study_col(user_id)
    if not col: return
    
    try:
        embedding = get_embedder().encode(chunk_text).tolist()
        doc_id_chunk = f"{doc_id}_{str(uuid.uuid4())[:8]}"
        
        col.document(doc_id_chunk).set({
            "doc_id": doc_id,
            "content": chunk_text,
            "embedding": Vector(embedding),
            "metadata": metadata,
            "timestamp": datetime.now(timezone.utc).isoformat()
        })
    except Exception as e:
        print(f"[MEMORY] Study Chunk Save error: {e}")

def search_study_documents(query: str, n_results: int = 5, user_id: str = None) -> List[Dict]:
    """Semantic search across all study documents."""
    if not user_id or not _VECTOR_SUPPORT: return []
    
    col = get_study_col(user_id)
    if not col: return []
    
    try:
        emb = get_embedder().encode(query).tolist()
        q = col.find_nearest("embedding", Vector(emb), DistanceMeasure.COSINE, n_results)
        return [doc.to_dict() for doc in q.get()]
    except Exception as e:
        print(f"[MEMORY] Study Search error: {e}")
        return []

def delete_study_document(user_id: str, doc_id: str):
    """Delete all chunks for a document using a batch write."""
    if not user_id: return
    
    col = get_study_col(user_id)
    if not col: return
    
    try:
        # Find all chunks matching doc_id
        docs = col.where("doc_id", "==", doc_id).stream()
        
        db = get_firestore()
        batch = db.batch()
        count = 0
        
        for doc in docs:
            batch.delete(doc.reference)
            count += 1
            # Firestore batch limit is 500
            if count >= 400:
                batch.commit()
                batch = db.batch()
                count = 0
        
        if count > 0:
            batch.commit()
            
        print(f"[MEMORY] Document {doc_id} deleted (Total chunks: {count})")
    except Exception as e:
        print(f"[MEMORY] Delete error: {e}")

# =============================================================================
# LEARNED CONTEXT (RETIRED LOCALS)
# =============================================================================
def get_collection(): # For backward compatibility in main.py count
    return None

def consolidate_learning():
    pass
