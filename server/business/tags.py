
"""
Luna Business Tags Module
-------------------------
Handles transaction categories (tags) persistence.
"""

import json
from pathlib import Path
from typing import List, Dict
from .storage import get_user_data_dir

DEFAULT_TAGS = [
    {"id": "mensalidade", "label": "Mensalidade", "color": "#22c55e"},
    {"id": "despesa", "label": "Despesa", "color": "#ef4444"},
    {"id": "material", "label": "Material", "color": "#3b82f6"},
    {"id": "salario", "label": "Salário", "color": "#f59e0b"},
    {"id": "servico", "label": "Serviço", "color": "#a855f7"},
    {"id": "outro", "label": "Outro", "color": "#6b7280"},
]

def get_tags_file(user_id: str) -> Path:
    return get_user_data_dir(user_id) / "tags.json"

def load_tags(user_id: str) -> List[Dict]:
    """Load tags from storage or return defaults."""
    file_path = get_tags_file(user_id)
    if not file_path.exists():
        # Initialize with defaults if not exists
        save_tags(user_id, DEFAULT_TAGS)
        return DEFAULT_TAGS
    try:
        data = json.loads(file_path.read_text(encoding="utf-8"))
        # Ensure it's a list
        if not isinstance(data, list):
            return DEFAULT_TAGS
        return data
    except:
        return DEFAULT_TAGS

def save_tags(user_id: str, tags: List[Dict]) -> None:
    """Save tags to storage."""
    file_path = get_tags_file(user_id)
    file_path.write_text(json.dumps(tags, ensure_ascii=False, indent=2), encoding="utf-8")

def add_tag(user_id: str, label: str, color: str = None) -> Dict:
    """Add a new tag."""
    tags = load_tags(user_id)
    
    # Generate ID from label
    tag_id = label.lower().strip().replace(" ", "_")
    
    # Check duplicate
    if any(t["id"] == tag_id for t in tags):
        return next(t for t in tags if t["id"] == tag_id)

    # Pick random color if not provided? Or default?
    # For now default to a nice color or allow argument
    if not color:
        # Cycle through some colors or pick random
        import random
        COLORS = ["#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6", "#8b5cf6"]
        color = random.choice(COLORS)
        
    new_tag = {"id": tag_id, "label": label, "color": color}
    tags.append(new_tag)
    save_tags(user_id, tags)
    return new_tag

def delete_tag(user_id: str, tag_id: str) -> bool:
    """Delete a tag (unless default maybe? user allows deleting anything)."""
    tags = load_tags(user_id)
    new_tags = [t for t in tags if t["id"] != tag_id]
    
    if len(new_tags) < len(tags):
        save_tags(user_id, new_tags)
        return True
    return False
