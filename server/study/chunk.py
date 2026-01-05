"""
Study Mode - Semantic Chunking
Divide textos longos em chunks preservando contexto semântico.
"""

import re
from typing import List, Optional
from dataclasses import dataclass


@dataclass
class TextChunk:
    """Representa um chunk de texto com metadados."""
    index: int
    text: str
    char_start: int
    char_end: int
    word_count: int


def split_into_sentences(text: str) -> List[str]:
    """
    Divide texto em sentenças de forma inteligente.
    """
    # Padrão para fim de sentença
    # Considera: . ! ? seguidos de espaço e letra maiúscula
    # Evita quebrar em abreviações como "Dr.", "Sr.", "etc."
    
    abbreviations = r'(?<!\b(?:Dr|Sr|Sra|Prof|Dra|Jr|Mr|Mrs|Ms|St|etc|vs|viz|ex|i\.e|e\.g))'
    pattern = abbreviations + r'([.!?])\s+(?=[A-ZÁÉÍÓÚÀÈÌÒÙÃÕÂÊÎÔÛÇ])'
    
    # Substitui por marcador temporário
    marked = re.sub(pattern, r'\1|||SPLIT|||', text)
    
    # Divide pelo marcador
    sentences = marked.split('|||SPLIT|||')
    
    # Limpa e filtra sentenças vazias
    return [s.strip() for s in sentences if s.strip()]


def split_into_paragraphs(text: str) -> List[str]:
    """
    Divide texto em parágrafos.
    """
    # Divide por duas ou mais quebras de linha
    paragraphs = re.split(r'\n\s*\n', text)
    return [p.strip() for p in paragraphs if p.strip()]


def chunk_by_paragraphs(
    text: str,
    max_words: int = 500,
    min_words: int = 100,
    overlap_sentences: int = 1
) -> List[TextChunk]:
    """
    Divide o texto em chunks baseados em parágrafos.
    
    Estratégia:
    1. Divide em parágrafos
    2. Agrupa parágrafos até atingir max_words
    3. Cria overlap com última(s) sentença(s) do chunk anterior
    
    Args:
        text: Texto completo a ser dividido
        max_words: Máximo de palavras por chunk
        min_words: Mínimo de palavras por chunk
        overlap_sentences: Quantas sentenças do chunk anterior incluir no próximo
    
    Returns:
        Lista de TextChunks
    """
    paragraphs = split_into_paragraphs(text)
    chunks = []
    current_chunk = []
    current_word_count = 0
    char_position = 0
    
    for para in paragraphs:
        para_words = len(para.split())
        
        # Se adicionar este parágrafo excede o limite
        if current_word_count + para_words > max_words and current_chunk:
            # Salva o chunk atual
            chunk_text = "\n\n".join(current_chunk)
            chunks.append(TextChunk(
                index=len(chunks),
                text=chunk_text,
                char_start=char_position - len(chunk_text),
                char_end=char_position,
                word_count=current_word_count
            ))
            
            # Overlap: pega as últimas sentenças do chunk anterior
            if overlap_sentences > 0:
                last_chunk = current_chunk[-1]
                sentences = split_into_sentences(last_chunk)
                overlap_text = " ".join(sentences[-overlap_sentences:])
                current_chunk = [overlap_text]
                current_word_count = len(overlap_text.split())
            else:
                current_chunk = []
                current_word_count = 0
        
        # Adiciona o parágrafo ao chunk atual
        current_chunk.append(para)
        current_word_count += para_words
        char_position += len(para) + 2  # +2 para \n\n
    
    # Último chunk
    if current_chunk:
        chunk_text = "\n\n".join(current_chunk)
        
        # Se muito pequeno e existe chunk anterior, merge
        if current_word_count < min_words and chunks:
            last_chunk = chunks.pop()
            merged_text = last_chunk.text + "\n\n" + chunk_text
            chunks.append(TextChunk(
                index=len(chunks),
                text=merged_text,
                char_start=last_chunk.char_start,
                char_end=char_position,
                word_count=last_chunk.word_count + current_word_count
            ))
        else:
            chunks.append(TextChunk(
                index=len(chunks),
                text=chunk_text,
                char_start=char_position - len(chunk_text),
                char_end=char_position,
                word_count=current_word_count
            ))
    
    return chunks


def chunk_document(text: str, strategy: str = "paragraph") -> List[dict]:
    """
    Função principal de chunking.
    
    Args:
        text: Texto a ser dividido
        strategy: "paragraph" (padrão) ou "sentence"
    
    Returns:
        Lista de dicts com chunks
    """
    if strategy == "paragraph":
        chunks = chunk_by_paragraphs(text)
    else:
        # Fallback para parágrafo
        chunks = chunk_by_paragraphs(text)
    
    return [
        {
            "index": c.index,
            "text": c.text,
            "word_count": c.word_count,
            "preview": c.text[:200] + "..." if len(c.text) > 200 else c.text
        }
        for c in chunks
    ]
