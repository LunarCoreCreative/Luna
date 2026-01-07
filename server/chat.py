"""
Luna Chat Manager
-----------------
Persistent chat storage and management.
"""

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional
from pydantic import BaseModel

from .config import CHAT_DIR

# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class Message(BaseModel):
    role: str
    content: str
    images: List[str] = []
    artifact: Optional[Dict] = None  # Suporte para artefatos do Canvas

class ChatRequest(BaseModel):
    messages: List[Message]
    agent_mode: bool = True
    deep_thinking: bool = False
    active_artifact_id: Optional[str] = None

class SaveChatRequest(BaseModel):
    chat_id: Optional[str] = None
    thread_id: Optional[str] = None
    messages: List[Dict]
    title: Optional[str] = None

class CreateThreadRequest(BaseModel):
    title: Optional[str] = None

# =============================================================================
# CHAT MANAGER
# =============================================================================

class ChatManager:
    """Manages persistent chat storage."""
    
    @staticmethod
    def list_chats(storage_dir: Path = CHAT_DIR) -> List[Dict]:
        """List all saved chats."""
        chats = []
        for f in storage_dir.glob("*.json"):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                threads = data.get("threads", [])
                chats.append({
                    "id": data.get("id"),
                    "title": data.get("title", "Sem título"),
                    "updated_at": data.get("updated_at", ""),
                    "thread_count": len(threads),
                    "threads": [{"id": t["id"], "title": t.get("title", "Thread")} for t in threads],
                    "preview": data.get("messages", [])[-1].get("content", "")[:60] if data.get("messages") else ""
                })
            except Exception:
                continue
        return sorted(chats, key=lambda x: x["updated_at"], reverse=True)
    
    @staticmethod
    def load_chat(chat_id: str, thread_id: str = None, storage_dir: Path = CHAT_DIR) -> Optional[Dict]:
        """Load a specific chat or thread."""
        file_path = storage_dir / f"{chat_id}.json"
        if not file_path.exists():
            return None
        
        data = json.loads(file_path.read_text(encoding="utf-8"))
        if thread_id:
            for t in data.get("threads", []):
                if t["id"] == thread_id:
                    return {"chat_id": chat_id, "thread": t}
            return None
        return data
    
    @staticmethod
    def save_chat(chat_id: str, messages: List[Dict], title: str = None, thread_id: str = None, storage_dir: Path = CHAT_DIR) -> Dict:
        """Save or update a chat."""
        if not chat_id:
            chat_id = str(uuid.uuid4())
        
        file_path = storage_dir / f"{chat_id}.json"
        now = datetime.now().isoformat()
        current_data = {"threads": []}
        
        if file_path.exists():
            try:
                current_data = json.loads(file_path.read_text(encoding="utf-8"))
                if "threads" not in current_data:
                    current_data["threads"] = []
            except Exception:
                pass
        
        if thread_id:
            threads = current_data.get("threads", [])
            found = False
            for i, t in enumerate(threads):
                if t["id"] == thread_id:
                    threads[i]["messages"] = messages
                    threads[i]["updated_at"] = now
                    if title:
                        threads[i]["title"] = title
                    found = True
                    break
            if not found:
                threads.append({
                    "id": thread_id,
                    "title": title or f"Thread {len(threads)+1}",
                    "messages": messages,
                    "created_at": now,
                    "updated_at": now
                })
            current_data["threads"] = threads
            current_data["updated_at"] = now
        else:
            final_title = title or current_data.get("title") or (messages[0].get("content", "Novo Chat")[:30] if messages else "Novo Chat")
            current_data.update({
                "id": chat_id,
                "title": final_title,
                "messages": messages,
                "created_at": current_data.get("created_at", now),
                "updated_at": now
            })
        
        file_path.write_text(json.dumps(current_data, indent=2, ensure_ascii=False), encoding="utf-8")
        return current_data
    
    @staticmethod
    def delete_chat(chat_id: str, storage_dir: Path = CHAT_DIR) -> bool:
        """Delete a chat."""
        file_path = storage_dir / f"{chat_id}.json"
        if file_path.exists():
            file_path.unlink()
            return True
        return False
    
    @staticmethod
    def create_thread(chat_id: str, title: str = None, storage_dir: Path = CHAT_DIR) -> Optional[Dict]:
        """Create a new thread in a chat."""
        file_path = storage_dir / f"{chat_id}.json"
        if not file_path.exists():
            return None
        
        data = json.loads(file_path.read_text(encoding="utf-8"))
        now = datetime.now().isoformat()
        thread_id = str(uuid.uuid4())
        
        if "threads" not in data:
            data["threads"] = []
        
        new_thread = {
            "id": thread_id,
            "title": title or f"Thread {len(data['threads'])+1}",
            "messages": [],
            "created_at": now,
            "updated_at": now
        }
        data["threads"].append(new_thread)
        data["updated_at"] = now
        
        file_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        return new_thread
    
    @staticmethod
    def delete_thread(chat_id: str, thread_id: str, storage_dir: Path = CHAT_DIR) -> bool:
        """Delete a thread from a chat."""
        file_path = storage_dir / f"{chat_id}.json"
        if not file_path.exists():
            return False
        
        data = json.loads(file_path.read_text(encoding="utf-8"))
        data["threads"] = [t for t in data.get("threads", []) if t["id"] != thread_id]
        data["updated_at"] = datetime.now().isoformat()
        
        file_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
        return True
