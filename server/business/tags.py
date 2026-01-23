import json
import os
import hashlib
import colorsys
from typing import List, Dict, Optional
from .models import Tag
from . import storage

def get_tags_file() -> str:
    return os.path.join(storage.get_user_data_dir(), 'tags.json')

DEFAULT_TAGS = [
    {"id": "mensalidade", "label": "Mensalidade", "color": "#22c55e"},
    {"id": "despesa", "label": "Despesa", "color": "#ef4444"},
    {"id": "material", "label": "Material", "color": "#3b82f6"},
    {"id": "salario", "label": "Salário", "color": "#f59e0b"},
    {"id": "servico", "label": "Serviço", "color": "#a855f7"},
    {"id": "geral", "label": "Geral", "color": "#6b7280"},
]

COLOR_PALETTE = [
    "#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#a855f7",
    "#ec4899", "#14b8a6", "#8b5cf6", "#f97316", "#06b6d4",
    "#84cc16", "#eab308", "#f43f5e", "#10b981", "#6366f1",
    "#d946ef", "#0ea5e9", "#64748b", "#f97316",
]

def load_tags() -> List[Dict]:
    path = get_tags_file()
    if not os.path.exists(path):
        save_tags(DEFAULT_TAGS)
        return DEFAULT_TAGS
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except:
        return DEFAULT_TAGS

def save_tags(tags: List[Dict]):
    path = get_tags_file()
    with open(path, 'w', encoding='utf-8') as f:
        json.dump(tags, f, indent=4, ensure_ascii=False)

def get_unique_color(existing_tags: List[Dict], tag_id: str) -> str:
    used_colors = {tag.get("color", "").lower() for tag in existing_tags if tag.get("color")}
    for color in COLOR_PALETTE:
        if color.lower() not in used_colors:
            return color
    
    # Fallback to hash based color
    hash_int = int(hashlib.md5(tag_id.encode()).hexdigest()[:8], 16)
    hue = (hash_int % 360) / 360.0
    r, g, b = colorsys.hls_to_rgb(hue, 0.5, 0.6)
    return f"#{int(r*255):02x}{int(g*255):02x}{int(b*255):02x}"

def add_tag(label: str, color: Optional[str] = None) -> Tag:
    tags = load_tags()
    tag_id = label.lower().strip().replace(" ", "_")
    
    # Check if exists
    for t in tags:
        if t["id"] == tag_id:
            return Tag(**t)
            
    if not color:
        color = get_unique_color(tags, tag_id)
        
    new_tag = {"id": tag_id, "label": label, "color": color}
    tags.append(new_tag)
    save_tags(tags)
    return Tag(**new_tag)

def delete_tag(tag_id: str) -> bool:
    tags = load_tags()
    original_len = len(tags)
    tags = [t for t in tags if t["id"] != tag_id]
    if len(tags) < original_len:
        save_tags(tags)
        return True
    return False

def get_or_create_tag(category: str) -> Tag:
    tags = load_tags()
    tag_id = category.lower().strip().replace(" ", "_")
    
    for t in tags:
        if t["id"] == tag_id:
            return Tag(**t)
            
    label = " ".join(word.capitalize() for word in category.split())
    return add_tag(label)

def sync_tags_from_transactions():
    """
    Sync tags from all transactions, bills, and recurring items.
    Creates tags for any category that doesn't exist yet.
    """
    from .storage import get_transactions, get_bills, get_recurring
    
    # Get all items with categories
    transactions = get_transactions()
    bills = get_bills()
    recurring = get_recurring()
    
    tags = load_tags()
    existing_ids = {t["id"] for t in tags}
    
    # Sync from transactions
    for tx in transactions:
        cat = tx.get("category", "geral")
        if cat:  # Only process non-empty categories
            cat_id = cat.lower().strip().replace(" ", "_")
            if cat_id not in existing_ids:
                get_or_create_tag(cat)
                existing_ids.add(cat_id)
    
    # Sync from bills
    for bill in bills:
        cat = bill.get("category", "geral")
        if cat:
            cat_id = cat.lower().strip().replace(" ", "_")
            if cat_id not in existing_ids:
                get_or_create_tag(cat)
                existing_ids.add(cat_id)
    
    # Sync from recurring items
    for item in recurring:
        cat = item.get("category", "fixo")
        if cat:
            cat_id = cat.lower().strip().replace(" ", "_")
            if cat_id not in existing_ids:
                get_or_create_tag(cat)
                existing_ids.add(cat_id)
    
    # Reload tags to return updated list
    return load_tags()
