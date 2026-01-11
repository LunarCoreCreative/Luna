
"""
Luna Business Tags Module
-------------------------
Handles transaction categories (tags) persistence.
"""

import json
import hashlib
import colorsys
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

# Palette of distinct colors (HSL-based to ensure visual distinction)
COLOR_PALETTE = [
    "#22c55e", "#ef4444", "#3b82f6", "#f59e0b", "#a855f7",
    "#ec4899", "#14b8a6", "#8b5cf6", "#f97316", "#06b6d4",
    "#84cc16", "#eab308", "#f43f5e", "#10b981", "#6366f1",
    "#8b5cf6", "#d946ef", "#0ea5e9", "#64748b", "#f97316",
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

def get_unique_color(existing_tags: List[Dict], tag_id: str) -> str:
    """Generate a unique color that is distinct from existing tag colors."""
    # Get all existing colors
    used_colors = {tag.get("color", "").lower() for tag in existing_tags if tag.get("color")}
    
    # First, try to find an unused color from the palette
    for color in COLOR_PALETTE:
        if color.lower() not in used_colors:
            return color
    
    # If all palette colors are used, generate a color based on tag_id hash
    # This ensures deterministic colors for the same tag_id
    hash_obj = hashlib.md5(tag_id.encode())
    hash_int = int(hash_obj.hexdigest()[:8], 16)
    
    # Generate HSL colors with good separation
    # Use golden ratio for better color distribution
    golden_ratio = 0.618033988749895
    hue_value = (hash_int * golden_ratio) % 360
    saturation_value = 0.6 + (hash_int % 20) / 100  # 0.6-0.8 saturation
    lightness_value = 0.45 + (hash_int % 15) / 100   # 0.45-0.60 lightness
    
    # Convert HSL to RGB (colorsys uses HLS: hue, lightness, saturation)
    r, g, b = colorsys.hls_to_rgb(hue_value / 360, lightness_value, saturation_value)
    color = f"#{int(r * 255):02x}{int(g * 255):02x}{int(b * 255):02x}"
    
    # Ensure minimum distance from existing colors
    # If too close, adjust slightly
    attempts = 0
    while color.lower() in used_colors and attempts < 10:
        hue_value = (hue_value + 30) % 360  # Shift hue by 30 degrees
        r, g, b = colorsys.hls_to_rgb(hue_value / 360, lightness_value, saturation_value)
        color = f"#{int(r * 255):02x}{int(g * 255):02x}{int(b * 255):02x}"
        attempts += 1
    
    return color

def add_tag(user_id: str, label: str, color: str = None) -> Dict:
    """Add a new tag."""
    tags = load_tags(user_id)
    
    # Generate ID from label
    tag_id = label.lower().strip().replace(" ", "_")
    
    # Check duplicate
    if any(t["id"] == tag_id for t in tags):
        return next(t for t in tags if t["id"] == tag_id)

    # Generate unique color if not provided
    if not color:
        color = get_unique_color(tags, tag_id)
    else:
        # If color is provided, ensure it's unique
        used_colors = {tag.get("color", "").lower() for tag in tags if tag.get("color")}
        if color.lower() in used_colors:
            # If color is already used, generate a unique one
            color = get_unique_color(tags, tag_id)
        
    new_tag = {"id": tag_id, "label": label, "color": color}
    tags.append(new_tag)
    save_tags(user_id, tags)
    return new_tag

def get_or_create_tag(user_id: str, category: str) -> Dict:
    """Get existing tag by category or create a new one if it doesn't exist."""
    tags = load_tags(user_id)
    
    # Normalize category to tag_id
    tag_id = category.lower().strip().replace(" ", "_")
    
    # Check if tag exists
    for tag in tags:
        if tag["id"] == tag_id:
            return tag
    
    # Create new tag
    # Use category as label (capitalize first letter of each word)
    label = " ".join(word.capitalize() for word in category.split())
    return add_tag(user_id, label)

def delete_tag(user_id: str, tag_id: str) -> bool:
    """Delete a tag (unless default maybe? user allows deleting anything)."""
    tags = load_tags(user_id)
    new_tags = [t for t in tags if t["id"] != tag_id]
    
    if len(new_tags) < len(tags):
        save_tags(user_id, new_tags)
        return True
    return False

def sync_tags_from_transactions(user_id: str, transactions: List[Dict]) -> None:
    """Synchronize tags: create tags for categories used in transactions that don't exist."""
    tags = load_tags(user_id)
    existing_tag_ids = {tag["id"] for tag in tags}
    
    # Extract all categories from transactions
    categories = set()
    for tx in transactions:
        category = tx.get("category", "").strip()
        if category:
            tag_id = category.lower().strip().replace(" ", "_")
            categories.add(tag_id)
    
    # Create tags for missing categories
    for category_id in categories:
        if category_id not in existing_tag_ids:
            # Create label from category_id (replace _ with spaces and capitalize)
            label = " ".join(word.capitalize() for word in category_id.split("_"))
            add_tag(user_id, label)
