"""
Study Mode - API Routes
Endpoints para o Modo de Estudo.
"""

import os
import uuid
import json
from typing import Optional
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from pydantic import BaseModel

from .ingest import ingest_document
from .chunk import chunk_document

# Router
router = APIRouter(prefix="/api/study", tags=["Study Mode"])

# Diretório para armazenar documentos estudados
STUDY_DIR = Path(__file__).parent.parent.parent / "data" / "study"
STUDY_DIR.mkdir(parents=True, exist_ok=True)


class URLIngestRequest(BaseModel):
    url: str


class StudyDocument(BaseModel):
    id: str
    title: str
    author: str
    word_count: int
    chunk_count: int
    preview: str


# Storage em memória (pode ser migrado para DB posteriormente)
_documents_cache = {}


def save_document(doc_id: str, data: dict):
    """Salva documento no disco."""
    doc_path = STUDY_DIR / f"{doc_id}.json"
    with open(doc_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    _documents_cache[doc_id] = data


def load_document(doc_id: str) -> Optional[dict]:
    """Carrega documento do disco."""
    if doc_id in _documents_cache:
        return _documents_cache[doc_id]
    
    doc_path = STUDY_DIR / f"{doc_id}.json"
    if doc_path.exists():
        with open(doc_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
        _documents_cache[doc_id] = data
        return data
    return None


def list_documents() -> list:
    """Lista todos os documentos salvos."""
    docs = []
    for file in STUDY_DIR.glob("*.json"):
        try:
            with open(file, 'r', encoding='utf-8') as f:
                data = json.load(f)
            docs.append({
                "id": data.get("id"),
                "title": data.get("title"),
                "author": data.get("author"),
                "word_count": data.get("word_count"),
                "chunk_count": len(data.get("chunks", []))
            })
        except:
            continue
    return docs


@router.post("/ingest/file")
async def ingest_file(file: UploadFile = File(...)):
    """
    Ingere um arquivo (PDF, TXT, EPUB) para estudo.
    """
    # Salva arquivo temporariamente
    temp_path = STUDY_DIR / f"temp_{uuid.uuid4()}{Path(file.filename).suffix}"
    
    try:
        content = await file.read()
        with open(temp_path, 'wb') as f:
            f.write(content)
        
        # Processa o documento
        result = ingest_document(file_path=str(temp_path))
        
        # Chunking
        chunks = chunk_document(result["text"])
        result["chunks"] = chunks
        result["chunk_count"] = len(chunks)
        
        # Remove texto completo para economizar espaço (mantemos apenas chunks)
        full_text = result.pop("text")
        result["preview"] = full_text[:500] + "..." if len(full_text) > 500 else full_text
        
        # Salva
        save_document(result["id"], result)
        
        return {
            "success": True,
            "document": {
                "id": result["id"],
                "title": result["title"],
                "author": result["author"],
                "word_count": result["word_count"],
                "chunk_count": result["chunk_count"],
                "preview": result["preview"][:200] + "..."
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    
    finally:
        # Remove arquivo temporário
        if temp_path.exists():
            temp_path.unlink()


@router.post("/ingest/url")
async def ingest_url(request: URLIngestRequest):
    """
    Ingere uma URL para estudo.
    """
    try:
        # Processa a URL
        result = ingest_document(url=request.url)
        
        # Chunking
        chunks = chunk_document(result["text"])
        result["chunks"] = chunks
        result["chunk_count"] = len(chunks)
        
        # Remove texto completo
        full_text = result.pop("text")
        result["preview"] = full_text[:500] + "..." if len(full_text) > 500 else full_text
        
        # Salva
        save_document(result["id"], result)
        
        return {
            "success": True,
            "document": {
                "id": result["id"],
                "title": result["title"],
                "author": result["author"],
                "word_count": result["word_count"],
                "chunk_count": result["chunk_count"],
                "preview": result["preview"][:200] + "..."
            }
        }
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/documents")
async def get_documents():
    """
    Lista todos os documentos estudados.
    """
    return {"success": True, "documents": list_documents()}


@router.get("/documents/{doc_id}")
async def get_document(doc_id: str):
    """
    Retorna detalhes de um documento específico.
    """
    doc = load_document(doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Documento não encontrado")
    
    return {"success": True, "document": doc}


@router.delete("/documents/{doc_id}")
async def delete_document(doc_id: str):
    """
    Remove um documento estudado.
    """
    doc_path = STUDY_DIR / f"{doc_id}.json"
    
    if doc_path.exists():
        doc_path.unlink()
        if doc_id in _documents_cache:
            del _documents_cache[doc_id]
        return {"success": True, "message": "Documento removido"}
    
    raise HTTPException(status_code=404, detail="Documento não encontrado")
