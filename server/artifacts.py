"""
Artifact Storage Service
-------------------------
Persistent storage for artifacts using JSON files.
"""

import json
import os
from pathlib import Path
from typing import Dict, List, Optional, Any
from datetime import datetime

# Storage path
ARTIFACTS_DIR = Path(os.path.expanduser("~/.luna/artifacts"))
ARTIFACTS_FILE = ARTIFACTS_DIR / "artifacts.json"

# Ensure directory exists
ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)

def _load_artifacts() -> Dict[str, Any]:
    """Load artifacts from JSON file."""
    if not ARTIFACTS_FILE.exists():
        return {}
    try:
        with open(ARTIFACTS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except (json.JSONDecodeError, IOError):
        return {}

def _save_artifacts(artifacts: Dict[str, Any]) -> None:
    """Save artifacts to JSON file."""
    with open(ARTIFACTS_FILE, "w", encoding="utf-8") as f:
        json.dump(artifacts, f, ensure_ascii=False, indent=2)

def save_artifact(artifact: Dict[str, Any]) -> Dict[str, Any]:
    """
    Save an artifact to persistent storage.
    
    Args:
        artifact: Dict with id, title, type, content, language
    
    Returns:
        The saved artifact with added metadata
    """
    artifacts = _load_artifacts()
    
    artifact_id = artifact.get("id")
    if not artifact_id:
        return {"success": False, "error": "Artifact ID is required"}
    
    # Add metadata
    artifact["updated_at"] = datetime.now().isoformat()
    if artifact_id not in artifacts:
        artifact["created_at"] = artifact["updated_at"]
    else:
        artifact["created_at"] = artifacts[artifact_id].get("created_at", artifact["updated_at"])
    
    # Store previous content for diff (if editing)
    if artifact_id in artifacts:
        artifact["previous_content"] = artifacts[artifact_id].get("content", "")
    
    artifacts[artifact_id] = artifact
    _save_artifacts(artifacts)
    
    return {"success": True, "artifact": artifact}

def get_artifact(artifact_id: str) -> Optional[Dict[str, Any]]:
    """Get a single artifact by ID."""
    artifacts = _load_artifacts()
    return artifacts.get(artifact_id)

def list_artifacts() -> List[Dict[str, Any]]:
    """List all artifacts, sorted by update time (most recent first)."""
    artifacts = _load_artifacts()
    result = list(artifacts.values())
    result.sort(key=lambda x: x.get("updated_at", ""), reverse=True)
    return result

def delete_artifact(artifact_id: str) -> Dict[str, Any]:
    """Delete an artifact by ID."""
    artifacts = _load_artifacts()
    
    if artifact_id not in artifacts:
        return {"success": False, "error": "Artifact not found"}
    
    deleted = artifacts.pop(artifact_id)
    _save_artifacts(artifacts)
    
    return {"success": True, "deleted": deleted}

def update_artifact_content(artifact_id: str, new_content: str) -> Dict[str, Any]:
    """Update just the content of an artifact (for user edits)."""
    artifacts = _load_artifacts()
    
    if artifact_id not in artifacts:
        return {"success": False, "error": "Artifact not found"}
    
    artifact = artifacts[artifact_id]
    artifact["previous_content"] = artifact.get("content", "")
    artifact["content"] = new_content
    artifact["updated_at"] = datetime.now().isoformat()
    
    artifacts[artifact_id] = artifact
    _save_artifacts(artifacts)
    
    return {"success": True, "artifact": artifact}
