"""
Luna Chat Manager (Cloud Sync)
-----------------
Persistent chat storage using Firebase Firestore (primary) and local JSON (cache/dev).
"""

import json
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Optional
from pydantic import BaseModel

from .config import CHAT_DIR
from .firebase_config import (
    save_chat_to_firebase, 
    get_user_chats, 
    get_chat_detail, 
    delete_chat_from_firebase
)

# =============================================================================
# PYDANTIC MODELS
# =============================================================================

class Message(BaseModel):
    role: str
    content: str
    images: List[str] = []
    artifact: Optional[Dict] = None

class ChatRequest(BaseModel):
    messages: List[Message]
    agent_mode: bool = True
    deep_thinking: bool = False
    canvas_mode: bool = False # Controle explícito de ferramentas de Canvas
    business_mode: bool = False # Modo Business Advisor
    health_mode: bool = False # Modo Health/Nutrition
    active_artifact_id: Optional[str] = None
    user_id: Optional[str] = None
    user_name: Optional[str] = "Usuário"
    view_as_student_id: Optional[str] = None # Para avaliadores visualizarem dados de alunos

class SaveChatRequest(BaseModel):
    chat_id: Optional[str] = None
    thread_id: Optional[str] = None
    messages: List[Dict]
    title: Optional[str] = None
    user_id: Optional[str] = None

class CreateThreadRequest(BaseModel):
    title: Optional[str] = None

# =============================================================================
# CHAT MANAGER
# =============================================================================

class ChatManager:
    """Manages persistent chat storage."""
    
    @staticmethod
    def list_chats(storage_dir: Path = CHAT_DIR, user_id: str = None) -> List[Dict]:
        """List all saved chats."""
        if user_id:
            return get_user_chats(user_id)
            
        # Fallback local
        chats = []
        for f in storage_dir.glob("*.json"):
            try:
                data = json.loads(f.read_text(encoding="utf-8"))
                chats.append({
                    "id": data.get("id"),
                    "title": data.get("title", "Sem título"),
                    "updated_at": data.get("updated_at", ""),
                    "preview": data.get("messages", [])[-1].get("content", "")[:60] if data.get("messages") else ""
                })
            except: continue
        return sorted(chats, key=lambda x: x["updated_at"], reverse=True)
    
    @staticmethod
    def load_chat(chat_id: str, user_id: str = None, storage_dir: Path = CHAT_DIR) -> Optional[Dict]:
        """Load a specific chat."""
        if user_id:
            return get_chat_detail(user_id, chat_id)
            
        # Fallback local
        file_path = storage_dir / f"{chat_id}.json"
        if not file_path.exists(): return None
        return json.loads(file_path.read_text(encoding="utf-8"))
    
    @staticmethod
    def save_chat(chat_id: str, messages: List[Dict], title: str = None, thread_id: str = None, user_id: str = None, storage_dir: Path = CHAT_DIR) -> Dict:
        """Save or update a chat."""
        if not chat_id:
            chat_id = str(uuid.uuid4())
            
        if not title and messages:
            title = messages[0].get("content", "Nova Conversa")[:30]
            
        now = datetime.now().isoformat()
        
        # Save to Cloud if user logged in
        if user_id:
            save_chat_to_firebase(user_id, chat_id, title, messages)
            
        # Local Sync/Fallback
        data = {
            "id": chat_id,
            "title": title,
            "messages": messages,
            "updated_at": now,
            "user_id": user_id
        }
        
        try:
            file_path = storage_dir / f"{chat_id}.json"
            file_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        except: pass
        
        return data

    @staticmethod
    def delete_chat(chat_id: str, user_id: str = None, storage_dir: Path = CHAT_DIR) -> bool:
        """Delete a chat."""
        if user_id:
            delete_chat_from_firebase(user_id, chat_id)
            
        # Local cleanup
        file_path = storage_dir / f"{chat_id}.json"
        if file_path.exists():
            file_path.unlink()
        return True
