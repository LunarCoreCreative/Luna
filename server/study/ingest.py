"""
Study Mode - Document Ingestion
Módulo para ingestão e extração de texto de diversos formatos.
"""

import os
import re
import uuid
from typing import Optional, Tuple
from pathlib import Path

# PDF extraction
try:
    import pdfplumber
    HAS_PDF = True
except ImportError:
    HAS_PDF = False

# EPUB extraction
try:
    import ebooklib
    from ebooklib import epub
    from bs4 import BeautifulSoup
    HAS_EPUB = True
except ImportError:
    HAS_EPUB = False

# URL extraction
try:
    import trafilatura
    HAS_TRAFILATURA = True
except ImportError:
    HAS_TRAFILATURA = False


def clean_text(text: str) -> str:
    """
    Limpa o texto extraído removendo ruído comum.
    """
    if not text:
        return ""
    
    # Remove múltiplas quebras de linha
    text = re.sub(r'\n{3,}', '\n\n', text)
    
    # Remove espaços excessivos
    text = re.sub(r' {2,}', ' ', text)
    
    # Remove caracteres de controle (exceto newlines e tabs)
    text = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
    
    # Remove hifenização de fim de linha (comum em PDFs)
    text = re.sub(r'-\n(\w)', r'\1', text)
    
    # Junta linhas quebradas no meio de parágrafos
    text = re.sub(r'(?<=[a-záéíóúàèìòùãõâêîôûç,;])\n(?=[a-záéíóúàèìòùãõâêîôûç])', ' ', text, flags=re.IGNORECASE)
    
    return text.strip()


def extract_from_pdf(file_path: str) -> Tuple[str, dict]:
    """
    Extrai texto de um arquivo PDF.
    
    Returns:
        Tuple[text, metadata]
    """
    if not HAS_PDF:
        raise ImportError("pdfplumber não está instalado. Execute: pip install pdfplumber")
    
    full_text = []
    metadata = {
        "pages": 0,
        "title": Path(file_path).stem,
        "format": "pdf"
    }
    
    with pdfplumber.open(file_path) as pdf:
        metadata["pages"] = len(pdf.pages)
        
        # Tenta extrair título dos metadados
        if pdf.metadata:
            metadata["title"] = pdf.metadata.get("Title", metadata["title"])
            metadata["author"] = pdf.metadata.get("Author", "Desconhecido")
        
        for page in pdf.pages:
            text = page.extract_text()
            if text:
                full_text.append(text)
    
    combined = "\n\n".join(full_text)
    return clean_text(combined), metadata


def extract_from_txt(file_path: str) -> Tuple[str, dict]:
    """
    Extrai texto de um arquivo TXT.
    """
    metadata = {
        "title": Path(file_path).stem,
        "format": "txt"
    }
    
    # Tenta diferentes encodings
    encodings = ['utf-8', 'latin-1', 'cp1252']
    
    for encoding in encodings:
        try:
            with open(file_path, 'r', encoding=encoding) as f:
                text = f.read()
            return clean_text(text), metadata
        except UnicodeDecodeError:
            continue
    
    raise ValueError(f"Não foi possível decodificar o arquivo: {file_path}")


def extract_from_epub(file_path: str) -> Tuple[str, dict]:
    """
    Extrai texto de um arquivo EPUB.
    """
    if not HAS_EPUB:
        raise ImportError("ebooklib não está instalado. Execute: pip install ebooklib")
    
    book = epub.read_epub(file_path)
    
    metadata = {
        "title": book.get_metadata('DC', 'title')[0][0] if book.get_metadata('DC', 'title') else Path(file_path).stem,
        "author": book.get_metadata('DC', 'creator')[0][0] if book.get_metadata('DC', 'creator') else "Desconhecido",
        "format": "epub"
    }
    
    full_text = []
    
    for item in book.get_items_of_type(ebooklib.ITEM_DOCUMENT):
        content = item.get_content().decode('utf-8', errors='ignore')
        soup = BeautifulSoup(content, 'html.parser')
        
        # Remove scripts e styles
        for tag in soup(['script', 'style', 'nav', 'header', 'footer']):
            tag.decompose()
        
        text = soup.get_text(separator='\n')
        if text.strip():
            full_text.append(text)
    
    combined = "\n\n".join(full_text)
    return clean_text(combined), metadata


def extract_from_url(url: str) -> Tuple[str, dict]:
    """
    Extrai texto de uma URL usando trafilatura.
    """
    if not HAS_TRAFILATURA:
        raise ImportError("trafilatura não está instalado. Execute: pip install trafilatura")
    
    # Baixa e extrai o conteúdo
    downloaded = trafilatura.fetch_url(url)
    
    if not downloaded:
        raise ValueError(f"Não foi possível acessar a URL: {url}")
    
    # Extrai o texto principal
    text = trafilatura.extract(
        downloaded,
        include_comments=False,
        include_tables=False,
        no_fallback=False
    )
    
    # Extrai metadados
    meta = trafilatura.extract_metadata(downloaded)
    
    metadata = {
        "title": meta.title if meta and meta.title else url,
        "author": meta.author if meta and meta.author else "Desconhecido",
        "source_url": url,
        "format": "url"
    }
    
    if not text:
        raise ValueError(f"Não foi possível extrair texto da URL: {url}")
    
    return clean_text(text), metadata


def ingest_document(file_path: str = None, url: str = None) -> dict:
    """
    Função principal de ingestão.
    Aceita um caminho de arquivo OU uma URL.
    
    Returns:
        dict com id, title, text, metadata, chunks_count
    """
    if not file_path and not url:
        raise ValueError("Forneça um file_path ou url")
    
    text = ""
    metadata = {}
    
    if url:
        text, metadata = extract_from_url(url)
    elif file_path:
        ext = Path(file_path).suffix.lower()
        
        if ext == '.pdf':
            text, metadata = extract_from_pdf(file_path)
        elif ext == '.txt':
            text, metadata = extract_from_txt(file_path)
        elif ext == '.epub':
            text, metadata = extract_from_epub(file_path)
        else:
            raise ValueError(f"Formato não suportado: {ext}")
    
    # Gera ID único para o documento
    doc_id = str(uuid.uuid4())
    
    return {
        "id": doc_id,
        "title": metadata.get("title", "Documento Sem Título"),
        "author": metadata.get("author", "Desconhecido"),
        "text": text,
        "char_count": len(text),
        "word_count": len(text.split()),
        "metadata": metadata
    }
