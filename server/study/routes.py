"""
Study Mode - API Routes (Cloud Sync)
------------------------------------
Endpoints for Study Mode documents and chunks, synced via Firebase.
"""

import os
import uuid
import json
from datetime import datetime, timezone
from typing import Optional, List, Dict
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Header
from pydantic import BaseModel

from .ingest import ingest_document
from .chunk import chunk_document
from ..memory import save_study_chunk, delete_study_document
from ..firebase_config import get_firestore

# Router
router = APIRouter(prefix="/api/study", tags=["Study Mode"])

def get_metadata_col(user_id: str):
    db = get_firestore()
    if not db or not user_id: return None
    return db.collection("users").document(user_id).collection("study_metadata")

def save_document(user_id: str, doc_id: str, data: dict):
    """Save document metadata to Firestore."""
    col = get_metadata_col(user_id)
    if not col: return
    
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    if "chunks" in data:
        # We don't save full chunks in metadata to avoid size limits
        data["chunk_count"] = len(data["chunks"])
        del data["chunks"]
        
    col.document(doc_id).set(data)

def load_document(user_id: str, doc_id: str) -> Optional[dict]:
    """Load document metadata from Firestore."""
    col = get_metadata_col(user_id)
    if not col: return None
    
    doc = col.document(doc_id).get()
    return doc.to_dict() if doc.exists else None

def list_documents(user_id: str) -> list:
    """List all saved study documents for a user."""
    col = get_metadata_col(user_id)
    if not col: return []
    
    try:
        docs = col.order_by("updated_at", direction="DESCENDING").stream()
        return [doc.to_dict() for doc in docs]
    except:
        return [doc.to_dict() for doc in col.stream()]

class URLIngestRequest(BaseModel):
    url: str

@router.post("/ingest/file")
async def ingest_file(
    file: UploadFile = File(...),
    x_user_id: Optional[str] = Header(None)
):
    """Ingest file for study."""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-ID header required for cloud sync")
        
    # Local temp path for processing
    temp_dir = Path("data/temp")
    temp_dir.mkdir(parents=True, exist_ok=True)
    temp_path = temp_dir / f"temp_{uuid.uuid4()}{Path(file.filename).suffix}"
    
    try:
        content = await file.read()
        with open(temp_path, 'wb') as f:
            f.write(content)
        
        result = ingest_document(file_path=str(temp_path))
        
        # Chunking
        chunks = chunk_document(result["content"])
        doc_id = str(uuid.uuid4())
        
        # Index chunks in Vector Search (Firestore)
        for i, chunk in enumerate(chunks):
            metadata = {
                "title": result.get("title", file.filename),
                "author": result.get("author", "Desconhecido"),
                "chunk_index": i
            }
            save_study_chunk(doc_id, chunk, metadata, user_id=x_user_id)
            
        # Save Metadata
        doc_data = {
            "id": doc_id,
            "title": result.get("title", file.filename),
            "author": result.get("author", "Desconhecido"),
            "word_count": len(result["content"].split()),
            "chunk_count": len(chunks),
            "preview": result["content"][:200]
        }
        save_document(x_user_id, doc_id, doc_data)
        
        return {"success": True, "doc_id": doc_id, "title": doc_data["title"]}
        
    finally:
        if temp_path.exists():
            os.unlink(temp_path)

@router.post("/ingest/url")
async def ingest_url(
    req: URLIngestRequest,
    x_user_id: Optional[str] = Header(None)
):
    """Ingest URL for study."""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="X-User-ID header required")
        
    try:
        result = ingest_document(url=req.url)
        chunks = chunk_document(result["content"])
        doc_id = str(uuid.uuid4())
        
        for i, chunk in enumerate(chunks):
            metadata = {"title": result.get("title", req.url), "chunk_index": i}
            save_study_chunk(doc_id, chunk, metadata, user_id=x_user_id)
            
        doc_data = {
            "id": doc_id,
            "title": result.get("title", req.url),
            "author": "Web Page",
            "word_count": len(result["content"].split()),
            "chunk_count": len(chunks),
            "preview": result["content"][:200]
        }
        save_document(x_user_id, doc_id, doc_data)
        
        return {"success": True, "doc_id": doc_id, "title": doc_data["title"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/documents")
async def get_documents(x_user_id: Optional[str] = Header(None)):
    """List documents."""
    if not x_user_id: return []
    return list_documents(x_user_id)

@router.get("/documents/{doc_id}")
async def get_document(doc_id: str, x_user_id: Optional[str] = Header(None)):
    """Get document details."""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="User ID required")
    doc = load_document(x_user_id, doc_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc

@router.delete("/documents/{doc_id}")
async def delete_document_route(doc_id: str, x_user_id: Optional[str] = Header(None)):
    """Delete document and its chunks."""
    if not x_user_id:
        raise HTTPException(status_code=401, detail="User ID required")
        
    # Delete metadata
    col = get_metadata_col(x_user_id)
    if col:
        col.document(doc_id).delete()
        
    # Delete chunks from Vector Store
    delete_study_document(x_user_id, doc_id)
    
    return {"success": True}
