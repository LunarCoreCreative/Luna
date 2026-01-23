"""
Firebase Sync Module for Business Data
Handles synchronization between local storage and Firestore.
"""
from datetime import datetime
from typing import Dict, List, Optional
import os
import sys

# Add server directory to path for imports
server_dir = os.path.join(os.path.dirname(__file__), '..')
if server_dir not in sys.path:
    sys.path.insert(0, server_dir)

# Import Firebase config
FIREBASE_AVAILABLE = False
get_firestore = None
initialize_firebase = None

try:
    # Try relative import first (when used as package)
    from ..firebase_config import get_firestore, initialize_firebase
    FIREBASE_AVAILABLE = True
    print("[Firebase Sync] Firebase loaded via relative import")
except ImportError:
    try:
        # Try absolute import (when server is run directly)
        from firebase_config import get_firestore, initialize_firebase
        FIREBASE_AVAILABLE = True
        print("[Firebase Sync] Firebase loaded via absolute import")
    except ImportError as e:
        print(f"[Firebase Sync] Firebase not available - running in offline mode: {e}")

from . import storage

# =============================================================================
# SYNC CONFIGURATION
# =============================================================================

COLLECTIONS = [
    'transactions',
    'tags',
    'bills',
    'budget',
    'goals',
    'cards',
    'recurring',
    'notifications',
    'piggy_banks',
    'piggy_bank_transactions'
]

# =============================================================================
# CORE SYNC FUNCTIONS
# =============================================================================

def is_firebase_available() -> bool:
    """Check if Firebase is initialized and available."""
    if not FIREBASE_AVAILABLE:
        return False
    try:
        db = get_firestore()
        return db is not None
    except:
        return False

def sync_collection_to_firebase(uid: str, collection_name: str, data: List[Dict]) -> int:
    """
    Sync a collection to Firestore.
    Returns number of documents synced.
    """
    if not is_firebase_available():
        return 0
    
    try:
        db = get_firestore()
        collection_ref = db.collection("users").document(uid).collection(f"business_{collection_name}")
        
        count = 0
        for item in data:
            item_id = item.get('id')
            if not item_id:
                continue
            
            # Add sync timestamp
            item['synced_at'] = datetime.now().isoformat()
            
            collection_ref.document(item_id).set(item, merge=True)
            count += 1
        
        print(f"[Firebase Sync] Synced {count} {collection_name} to Firebase for user {uid[:8]}...")
        return count
    
    except Exception as e:
        print(f"[Firebase Sync] Error syncing {collection_name}: {e}")
        return 0

def sync_collection_from_firebase(uid: str, collection_name: str) -> List[Dict]:
    """
    Pull a collection from Firestore.
    Returns list of documents.
    """
    if not is_firebase_available():
        return []
    
    try:
        db = get_firestore()
        collection_ref = db.collection("users").document(uid).collection(f"business_{collection_name}")
        
        docs = collection_ref.stream()
        data = []
        for doc in docs:
            item = doc.to_dict()
            item['id'] = doc.id
            data.append(item)
        
        print(f"[Firebase Sync] Pulled {len(data)} {collection_name} from Firebase for user {uid[:8]}...")
        return data
    
    except Exception as e:
        print(f"[Firebase Sync] Error pulling {collection_name}: {e}")
        return []

def sync_all_to_firebase(uid: str) -> Dict[str, int]:
    """
    Sync all collections to Firebase.
    Returns dict with counts per collection.
    """
    # Set user context
    storage.set_user_context(uid)
    
    results = {}
    for collection_name in COLLECTIONS:
        try:
            data = storage._load_json(collection_name)
            count = sync_collection_to_firebase(uid, collection_name, data)
            results[collection_name] = count
        except Exception as e:
            print(f"[Firebase Sync] Error with {collection_name}: {e}")
            results[collection_name] = 0
    
    # Update sync metadata
    update_sync_metadata(uid, 'push')
    
    return results

def sync_all_from_firebase(uid: str) -> Dict[str, int]:
    """
    Pull all collections from Firebase and save locally.
    Returns dict with counts per collection.
    """
    # Set user context
    storage.set_user_context(uid)
    
    results = {}
    for collection_name in COLLECTIONS:
        try:
            data = sync_collection_from_firebase(uid, collection_name)
            if data:
                storage._save_json(collection_name, data)
            results[collection_name] = len(data)
        except Exception as e:
            print(f"[Firebase Sync] Error with {collection_name}: {e}")
            results[collection_name] = 0
    
    # Update sync metadata
    update_sync_metadata(uid, 'pull')
    
    return results

# =============================================================================
# SYNC METADATA
# =============================================================================

def get_sync_metadata(uid: str) -> Dict:
    """Get sync metadata for a user."""
    if not is_firebase_available():
        return {}
    
    try:
        db = get_firestore()
        doc = db.collection("users").document(uid).collection("business_metadata").document("sync").get()
        if doc.exists:
            return doc.to_dict()
        return {}
    except Exception as e:
        print(f"[Firebase Sync] Error getting metadata: {e}")
        return {}

def update_sync_metadata(uid: str, sync_type: str):
    """Update sync metadata after a sync operation."""
    if not is_firebase_available():
        return
    
    try:
        db = get_firestore()
        metadata = {
            f"last_{sync_type}": datetime.now().isoformat(),
            "last_sync": datetime.now().isoformat()
        }
        db.collection("users").document(uid).collection("business_metadata").document("sync").set(
            metadata, merge=True
        )
    except Exception as e:
        print(f"[Firebase Sync] Error updating metadata: {e}")

# =============================================================================
# LEGACY MIGRATION
# =============================================================================

def check_legacy_data_exists(uid: str) -> bool:
    """Check if legacy data exists for a user."""
    legacy_dir = os.path.join(os.getcwd(), '_legacy', 'data', 'business', uid)
    return os.path.exists(legacy_dir) and os.path.isdir(legacy_dir)

def migrate_legacy_data(uid: str) -> Dict[str, int]:
    """
    Migrate data from legacy system to new structure.
    Returns dict with counts of migrated items.
    """
    legacy_dir = os.path.join(os.getcwd(), '_legacy', 'data', 'business', uid)
    
    if not os.path.exists(legacy_dir):
        print(f"[Migration] No legacy data found for user {uid[:8]}...")
        return {}
    
    # Set user context for new storage
    storage.set_user_context(uid)
    
    results = {}
    
    # Migrate transactions
    legacy_tx_path = os.path.join(legacy_dir, 'transactions.json')
    if os.path.exists(legacy_tx_path):
        try:
            import json
            with open(legacy_tx_path, 'r', encoding='utf-8') as f:
                legacy_data = json.load(f)
            
            # Normalize date formats
            normalized = []
            for tx in legacy_data:
                normalized_tx = normalize_legacy_transaction(tx)
                normalized.append(normalized_tx)
            
            # Save to new structure
            storage._save_json('transactions', normalized)
            results['transactions'] = len(normalized)
            print(f"[Migration] Migrated {len(normalized)} transactions for user {uid[:8]}...")
        except Exception as e:
            print(f"[Migration] Error migrating transactions: {e}")
            results['transactions'] = 0
    
    # Migrate tags
    legacy_tags_path = os.path.join(legacy_dir, 'tags.json')
    if os.path.exists(legacy_tags_path):
        try:
            import json
            with open(legacy_tags_path, 'r', encoding='utf-8') as f:
                legacy_tags = json.load(f)
            
            storage._save_json('tags', legacy_tags)
            results['tags'] = len(legacy_tags)
            print(f"[Migration] Migrated {len(legacy_tags)} tags for user {uid[:8]}...")
        except Exception as e:
            print(f"[Migration] Error migrating tags: {e}")
            results['tags'] = 0

    # Migrate recurring
    legacy_recurring_path = os.path.join(legacy_dir, 'recurring.json')
    if os.path.exists(legacy_recurring_path):
        try:
            with open(legacy_recurring_path, 'r', encoding='utf-8') as f:
                legacy_recurring = json.load(f)
            storage._save_json('recurring', legacy_recurring)
            results['recurring'] = len(legacy_recurring)
            print(f"[Migration] Migrated {len(legacy_recurring)} recurring items for user {uid[:8]}...")
        except Exception as e:
            print(f"[Migration] Error migrating recurring: {e}")
            results['recurring'] = 0

    # Migrate budgets
    legacy_budget_path = os.path.join(legacy_dir, 'budget.json')
    if os.path.exists(legacy_budget_path):
        try:
            with open(legacy_budget_path, 'r', encoding='utf-8') as f:
                legacy_budget = json.load(f)
            storage._save_json('budget', legacy_budget)
            results['budget'] = len(legacy_budget)
            print(f"[Migration] Migrated {len(legacy_budget)} budgets for user {uid[:8]}...")
        except Exception as e:
            print(f"[Migration] Error migrating budgets: {e}")
            results['budget'] = 0

    # Migrate goals
    legacy_goals_path = os.path.join(legacy_dir, 'goals.json')
    if os.path.exists(legacy_goals_path):
        try:
            with open(legacy_goals_path, 'r', encoding='utf-8') as f:
                legacy_goals = json.load(f)
            storage._save_json('goals', legacy_goals)
            results['goals'] = len(legacy_goals)
            print(f"[Migration] Migrated {len(legacy_goals)} goals for user {uid[:8]}...")
        except Exception as e:
            print(f"[Migration] Error migrating goals: {e}")
            results['goals'] = 0

    # Migrate cards
    legacy_cards_path = os.path.join(legacy_dir, 'credit_cards.json')
    if os.path.exists(legacy_cards_path):
        try:
            with open(legacy_cards_path, 'r', encoding='utf-8') as f:
                legacy_cards = json.load(f)
            storage._save_json('cards', legacy_cards)
            results['cards'] = len(legacy_cards)
            print(f"[Migration] Migrated {len(legacy_cards)} cards for user {uid[:8]}...")
        except Exception as e:
            print(f"[Migration] Error migrating cards: {e}")
            results['cards'] = 0

    # Mark migration as complete
    mark_migration_complete(uid)
    
    return results

def normalize_legacy_transaction(tx: Dict) -> Dict:
    """Normalize a legacy transaction to the new format."""
    # Normalize date format
    date_str = tx.get('date', '')
    if date_str:
        # Handle various date formats
        try:
            if 'T' in date_str and 'Z' in date_str:
                # ISO format with Z: 2026-01-14T01:25:47.342051Z
                date_str = date_str.split('T')[0]
            elif 'T' in date_str:
                # ISO format: 2026-01-14T01:25:47.342051
                date_str = date_str.split('T')[0]
            # else: already in YYYY-MM-DD format
            tx['date'] = date_str
        except:
            pass
    
    # Ensure required fields
    if 'type' not in tx:
        tx['type'] = 'expense'
    if 'category' not in tx:
        tx['category'] = 'geral'
    
    # Add migration marker
    tx['migrated_from_legacy'] = True
    
    return tx

def mark_migration_complete(uid: str):
    """Mark that migration is complete for a user."""
    # Create local flag file
    user_dir = storage.get_user_data_dir()
    flag_file = os.path.join(user_dir, '.migrated')
    try:
        with open(flag_file, 'w') as f:
            f.write(datetime.now().isoformat())
        print(f"[Migration] Local flag created for {uid[:8]}")
    except Exception as e:
        print(f"[Migration] Error creating flag: {e}")

    if not is_firebase_available():
        return
    
    try:
        db = get_firestore()
        db.collection("users").document(uid).set({
            "business_migrated": True,
            "business_migrated_at": datetime.now().isoformat()
        }, merge=True)
        print(f"[Migration] Marked migration complete for user {uid[:8]} in Firebase...")
    except Exception as e:
        print(f"[Migration] Error marking complete in Firebase: {e}")

def is_migration_complete(uid: str) -> bool:
    """Check if migration is complete for a user."""
    # Check local flag first
    user_dir = storage.get_user_data_dir()
    if os.path.exists(os.path.join(user_dir, '.migrated')):
        return True

    if not is_firebase_available():
        return False # If not available and no local flag, assume NOT complete
    
    try:
        db = get_firestore()
        doc = db.collection("users").document(uid).get()
        if doc.exists:
            return doc.to_dict().get('business_migrated', False)
        return False
    except:
        return False

# =============================================================================
# AUTO SYNC ON DATA CHANGE
# =============================================================================

def auto_sync_collection(uid: str, collection_name: str):
    """
    Automatically sync a specific collection after data change.
    Called by storage functions after mutations.
    """
    if not is_firebase_available():
        return
    
    try:
        # Ensure user context is set before loading data
        storage.set_user_context(uid)
        data = storage._load_json(collection_name)
        sync_collection_to_firebase(uid, collection_name, data)
        print(f"[Firebase Sync] ✅ Auto-synced {len(data)} {collection_name} for user {uid[:8]}...")
    except Exception as e:
        print(f"[Firebase Sync] ❌ Auto-sync error for {collection_name}: {e}")
