"""
Luna Memory System
==================
Sistema de memória semântica usando Firebase Firestore e embeddings locais.
Permite que Luna se lembre de conversas, preferências e conhecimento do usuário.
"""

import sys
import io
import os
import uuid
import logging
from datetime import datetime, timezone
from typing import List, Dict, Optional, Any

# Fix encoding for Windows console (only if not already wrapped)
if sys.platform == 'win32' and not isinstance(sys.stdout, io.TextIOWrapper):
    try:
        if hasattr(sys.stdout, 'buffer'):
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        if hasattr(sys.stderr, 'buffer'):
            sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    except (AttributeError, ValueError):
        # Se não conseguir reconfigurar, apenas definir variável de ambiente
        os.environ['PYTHONIOENCODING'] = 'utf-8'

from firebase_config import get_firestore
from embeddings import encode, cosine_similarity

logger = logging.getLogger(__name__)

# =============================================================================
# CONFIGURAÇÃO
# =============================================================================

MAX_MEMORIES_PER_SEARCH = 5
EMBEDDING_DIMENSION = 384  # all-MiniLM-L6-v2 dimension


# =============================================================================
# COLEÇÕES FIRESTORE
# =============================================================================

def get_memories_collection(user_id: str):
    """Retorna a coleção de memórias do usuário."""
    db = get_firestore()
    if not db or not user_id:
        return None
    return db.collection("users").document(user_id).collection("memories")


def get_knowledge_collection(user_id: str = None):
    """Retorna a coleção de conhecimento (global ou do usuário)."""
    db = get_firestore()
    if not db:
        return None
    if user_id:
        return db.collection("users").document(user_id).collection("knowledge")
    return db.collection("global_knowledge")


# =============================================================================
# SALVAR MEMÓRIAS
# =============================================================================

def save_memory(
    user_id: str,
    content: str,
    memory_type: str = "conversation",
    metadata: Dict = None
) -> Optional[str]:
    """
    Salva uma memória no Firestore com embedding.
    
    Args:
        user_id: UID do usuário
        content: Conteúdo da memória
        memory_type: Tipo (conversation, preference, fact, instruction)
        metadata: Dados adicionais
        
    Returns:
        ID da memória salva ou None se falhou
    """
    col = get_memories_collection(user_id)
    if not col:
        logger.error("[MEMORY] Coleção não disponível")
        return None
    
    # Gerar embedding
    embedding = encode(content)
    if embedding is None:
        logger.error("[MEMORY] Falha ao gerar embedding")
        return None
    
    try:
        doc_id = str(uuid.uuid4())
        
        memory_data = {
            "content": content,
            "type": memory_type,
            "embedding": embedding,
            "metadata": metadata or {},
            "created_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        col.document(doc_id).set(memory_data)
        logger.info(f"[MEMORY] Memoria salva: {doc_id[:8]}... ({memory_type})")
        return doc_id
        
    except Exception as e:
        logger.error(f"[MEMORY] Erro ao salvar: {e}")
        return None


def save_preference(user_id: str, preference: str) -> Optional[str]:
    """Atalho para salvar uma preferência do usuário."""
    return save_memory(user_id, preference, memory_type="preference")


def save_fact(user_id: str, fact: str) -> Optional[str]:
    """Atalho para salvar um fato sobre o usuário."""
    return save_memory(user_id, fact, memory_type="fact")


# =============================================================================
# BUSCAR MEMÓRIAS (Busca Semântica)
# =============================================================================

def search_memories(
    user_id: str,
    query: str,
    n_results: int = MAX_MEMORIES_PER_SEARCH,
    memory_type: str = None
) -> List[Dict]:
    """
    Busca memórias semanticamente similares a uma query.
    
    Args:
        user_id: UID do usuário
        query: Texto de busca
        n_results: Número máximo de resultados
        memory_type: Filtrar por tipo (opcional)
        
    Returns:
        Lista de memórias ordenadas por relevância
    """
    col = get_memories_collection(user_id)
    if not col:
        return []
    
    # Gerar embedding da query
    query_embedding = encode(query)
    if query_embedding is None:
        return []
    
    try:
        # Buscar todas as memórias do usuário
        # Nota: Firestore Vector Search nativo requer índices especiais
        # Aqui usamos busca local por simplicidade (funciona bem até ~1000 docs)
        
        query_ref = col.limit(500)  # Limitar para performance
        
        if memory_type:
            query_ref = col.where("type", "==", memory_type).limit(500)
        
        docs = list(query_ref.stream())
        
        # Calcular similaridade para cada memória
        scored_memories = []
        for doc in docs:
            data = doc.to_dict()
            doc_embedding = data.get("embedding")
            
            if doc_embedding:
                similarity = cosine_similarity(query_embedding, doc_embedding)
                scored_memories.append({
                    "id": doc.id,
                    "content": data.get("content", ""),
                    "type": data.get("type", "unknown"),
                    "similarity": similarity,
                    "created_at": data.get("created_at"),
                    "metadata": data.get("metadata", {})
                })
        
        # Ordenar por similaridade (maior primeiro)
        scored_memories.sort(key=lambda x: x["similarity"], reverse=True)
        
        # Retornar top N
        results = scored_memories[:n_results]
        
        logger.info(f"[MEMORY] Busca por '{query[:30]}...' retornou {len(results)} resultados")
        return results
        
    except Exception as e:
        logger.error(f"[MEMORY] Erro na busca: {e}")
        return []


def get_relevant_context(user_id: str, query: str) -> str:
    """
    Busca memórias relevantes e formata como contexto para o LLM.
    
    Args:
        user_id: UID do usuário
        query: Query atual do usuário
        
    Returns:
        String formatada com memórias relevantes
    """
    memories = search_memories(user_id, query, n_results=5)
    
    if not memories:
        return ""
    
    context_parts = ["[MEMÓRIAS RELEVANTES]"]
    
    for i, mem in enumerate(memories, 1):
        if mem["similarity"] > 0.3:  # Threshold de relevância
            context_parts.append(f"{i}. [{mem['type'].upper()}] {mem['content']}")
    
    if len(context_parts) == 1:
        return ""  # Nenhuma memória relevante o suficiente
    
    return "\n".join(context_parts)


# =============================================================================
# GERENCIAMENTO DE MEMÓRIAS
# =============================================================================

def delete_memory(user_id: str, memory_id: str) -> bool:
    """Deleta uma memória específica."""
    col = get_memories_collection(user_id)
    if not col:
        return False
    
    try:
        col.document(memory_id).delete()
        logger.info(f"[MEMORY] Memória deletada: {memory_id[:8]}...")
        return True
    except Exception as e:
        logger.error(f"[MEMORY] Erro ao deletar: {e}")
        return False


def list_memories(user_id: str, limit: int = 50) -> List[Dict]:
    """Lista todas as memórias de um usuário."""
    col = get_memories_collection(user_id)
    if not col:
        return []
    
    try:
        docs = col.order_by("created_at", direction="DESCENDING").limit(limit).stream()
        
        return [
            {
                "id": doc.id,
                "content": doc.to_dict().get("content"),
                "type": doc.to_dict().get("type"),
                "created_at": doc.to_dict().get("created_at")
            }
            for doc in docs
        ]
    except Exception as e:
        logger.error(f"[MEMORY] Erro ao listar: {e}")
        return []


def get_memory_count(user_id: str) -> int:
    """Retorna o número total de memórias do usuário."""
    col = get_memories_collection(user_id)
    if not col:
        return 0
    
    try:
        # Contagem eficiente
        count_query = col.count()
        result = list(count_query.get())
        return result[0][0].value if result else 0
    except Exception as e:
        logger.error(f"[MEMORY] Erro ao contar: {e}")
        return 0


def update_memory(
    user_id: str,
    memory_id: str,
    content: str = None,
    memory_type: str = None,
    metadata: Dict = None
) -> bool:
    """
    Atualiza uma memória existente.
    
    Args:
        user_id: UID do usuário
        memory_id: ID da memória
        content: Novo conteúdo (opcional)
        memory_type: Novo tipo (opcional)
        metadata: Novos metadados (opcional)
        
    Returns:
        True se atualizado com sucesso, False caso contrário
    """
    col = get_memories_collection(user_id)
    if not col:
        logger.error("[MEMORY] Coleção não disponível")
        return False
    
    try:
        doc_ref = col.document(memory_id)
        doc = doc_ref.get()
        
        if not doc.exists:
            logger.error(f"[MEMORY] Memória não encontrada: {memory_id}")
            return False
        
        update_data = {
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Atualizar campos fornecidos
        if content is not None:
            # Re-gerar embedding se o conteúdo mudou
            embedding = encode(content)
            if embedding is None:
                logger.error("[MEMORY] Falha ao gerar embedding para atualização")
                return False
            update_data["content"] = content
            update_data["embedding"] = embedding
        
        if memory_type is not None:
            update_data["type"] = memory_type
        
        if metadata is not None:
            update_data["metadata"] = metadata
        
        doc_ref.update(update_data)
        logger.info(f"[MEMORY] Memoria atualizada: {memory_id[:8]}...")
        return True
        
    except Exception as e:
        logger.error(f"[MEMORY] Erro ao atualizar: {e}")
        return False