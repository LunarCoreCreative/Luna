"""
Artifact Storage Service (Cloud Sync)
-------------------------------------
Persistent storage for artifacts using Firebase Firestore.
"""

import json
import os
from datetime import datetime, timezone
from typing import Dict, List, Optional, Any
from .firebase_config import get_firestore

def get_artifact_col(user_id: str):
    """Get the user-specific Firestore collection for artifacts."""
    db = get_firestore()
    if not db or not user_id:
        return None
    return db.collection("users").document(user_id).collection("artifacts")

def save_artifact(artifact: Dict[str, Any], user_id: str = None) -> Dict[str, Any]:
    """
    Save an artifact to Firestore.
    """
    if not user_id:
        return {"success": False, "error": "Login necessário para salvar artefatos na nuvem."}
        
    col = get_artifact_col(user_id)
    if not col:
        return {"success": False, "error": "Banco de dados não disponível."}
        
    art_id = artifact.get("id")
    if not art_id:
        return {"success": False, "error": "ID do artefato é obrigatório."}
        
    # Check for existing artifact to preserve creation date
    doc_ref = col.document(art_id)
    existing = doc_ref.get()
    
    now = datetime.now(timezone.utc)
    
    if existing.exists:
        data = existing.to_dict()
        artifact["created_at"] = data.get("created_at")
        artifact["previous_content"] = data.get("content")
    else:
        artifact["created_at"] = now.isoformat()
        
    artifact["updated_at"] = now.isoformat()
    
    doc_ref.set(artifact)
    return {"success": True, "artifact": artifact}

def get_artifact(artifact_id: str, user_id: str = None) -> Optional[Dict[str, Any]]:
    """Retrieve an artifact from Firestore."""
    if not user_id:
        return None
        
    col = get_artifact_col(user_id)
    if not col:
        return None
        
    doc = col.document(artifact_id).get()
    if doc.exists:
        return doc.to_dict()
    return None

def list_artifacts(user_id: str = None) -> List[Dict[str, Any]]:
    """List all artifacts for a user."""
    if not user_id:
        return []
        
    col = get_artifact_col(user_id)
    if not col:
        return []
        
    try:
        docs = col.order_by("updated_at", direction="DESCENDING").limit(50).stream()
        return [doc.to_dict() for doc in docs]
    except Exception as e:
        # Fallback if index is not ready
        print(f"[ARTIFACTS] Warning: {e}")
        docs = col.limit(50).stream()
        return [doc.to_dict() for doc in docs]

def delete_artifact(artifact_id: str, user_id: str = None) -> Dict[str, Any]:
    """Delete an artifact from Firestore."""
    if not user_id:
        return {"success": False, "error": "Login necessário."}
        
    col = get_artifact_col(user_id)
    if not col:
        return {"success": False, "error": "Banco de dados não disponível."}
        
    col.document(artifact_id).delete()
    return {"success": True}

def update_artifact_content(artifact_id: str, new_content: str, user_id: str = None) -> Dict[str, Any]:
    """Update artifact content in Firestore."""
    if not user_id:
        return {"success": False, "error": "Login necessário."}
        
    col = get_artifact_col(user_id)
    if not col:
        return {"success": False, "error": "Banco de dados não disponível."}
        
    doc_ref = col.document(artifact_id)
    doc = doc_ref.get()
    
    if not doc.exists:
        return {"success": False, "error": "Artefato não encontrado."}
        
    data = doc.to_dict()
    old_content = data.get("content", "")
    
    if old_content == new_content:
        return {"success": True, "artifact": data}
        
    data["previous_content"] = old_content
    data["content"] = new_content
    data["updated_at"] = datetime.now(timezone.utc).isoformat()
    
    doc_ref.set(data)
    return {"success": True, "artifact": data}
