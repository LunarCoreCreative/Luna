"""
Luna Embeddings Module
======================
Gerencia o modelo de embedding para busca semântica.
Usa SentenceTransformer com modelo all-MiniLM-L6-v2.
"""

import os
import logging
from typing import List, Optional

logger = logging.getLogger(__name__)

# =============================================================================
# CONFIGURAÇÃO
# =============================================================================

MODEL_NAME = "all-MiniLM-L6-v2"  # Modelo leve e eficiente (384 dimensões)
_embedder = None
_is_ready = False


def get_embedder():
    """
    Retorna o modelo de embedding, carregando-o se necessário.
    Usa lazy loading para não bloquear a inicialização do servidor.
    """
    global _embedder, _is_ready
    
    if _embedder is not None:
        return _embedder
    
    try:
        from sentence_transformers import SentenceTransformer
        
        # Configurar timeout para download
        os.environ.setdefault("HF_HUB_DOWNLOAD_TIMEOUT", "120")
        os.environ.setdefault("HF_HUB_DOWNLOAD_RETRY", "3")
        
        logger.info(f"[EMBEDDINGS] Carregando modelo: {MODEL_NAME}")
        
        _embedder = SentenceTransformer(
            MODEL_NAME,
            device="cpu",  # Forçar CPU para compatibilidade
        )
        
        _is_ready = True
        logger.info("[EMBEDDINGS] Modelo carregado com sucesso!")
        return _embedder
        
    except Exception as e:
        logger.error(f"[EMBEDDINGS] Erro ao carregar modelo: {e}")
        return None


def is_ready() -> bool:
    """Verifica se o modelo está pronto."""
    return _is_ready


def encode(text: str) -> Optional[List[float]]:
    """
    Gera embedding para um texto.
    
    Args:
        text: Texto para codificar
        
    Returns:
        Lista de floats representando o embedding (384 dimensões)
    """
    embedder = get_embedder()
    if embedder is None:
        return None
    
    try:
        embedding = embedder.encode(text)
        return embedding.tolist()
    except Exception as e:
        logger.error(f"[EMBEDDINGS] Erro ao gerar embedding: {e}")
        return None


def encode_batch(texts: List[str]) -> Optional[List[List[float]]]:
    """
    Gera embeddings para múltiplos textos de forma eficiente.
    
    Args:
        texts: Lista de textos para codificar
        
    Returns:
        Lista de embeddings
    """
    embedder = get_embedder()
    if embedder is None:
        return None
    
    try:
        embeddings = embedder.encode(texts)
        return [emb.tolist() for emb in embeddings]
    except Exception as e:
        logger.error(f"[EMBEDDINGS] Erro ao gerar embeddings em batch: {e}")
        return None


def cosine_similarity(vec1: List[float], vec2: List[float]) -> float:
    """
    Calcula similaridade de cosseno entre dois vetores.
    
    Args:
        vec1, vec2: Vetores de embedding
        
    Returns:
        Similaridade entre 0 e 1
    """
    import numpy as np
    
    v1 = np.array(vec1)
    v2 = np.array(vec2)
    
    dot_product = np.dot(v1, v2)
    norm1 = np.linalg.norm(v1)
    norm2 = np.linalg.norm(v2)
    
    if norm1 == 0 or norm2 == 0:
        return 0.0
    
    return float(dot_product / (norm1 * norm2))


# =============================================================================
# PRE-WARMING (Opcional)
# =============================================================================

async def preload_model():
    """
    Pré-carrega o modelo em background.
    Útil para chamar no startup do servidor.
    """
    import asyncio
    
    def _load():
        get_embedder()
    
    loop = asyncio.get_event_loop()
    await loop.run_in_executor(None, _load)
    logger.info("[EMBEDDINGS] Modelo pré-carregado em background")
