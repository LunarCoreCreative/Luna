"""
Luna Health Foods Database
---------------------------
Food database with nutritional information per 100g.
Uses web search to populate database automatically.
"""

import json
import os
import re
from pathlib import Path
from typing import List, Dict, Optional, Any
import time

# Try to import httpx for API calls
try:
    import httpx
    HTTPX_AVAILABLE = True
except ImportError:
    HTTPX_AVAILABLE = False
    print("[HEALTH-FOODS] ⚠️ httpx não disponível, usando apenas cache local.")

# Import web_search and LLM API
try:
    import sys
    sys.path.append(str(Path(__file__).parent.parent))
    from tools import web_search
    WEB_SEARCH_AVAILABLE = True
except ImportError:
    WEB_SEARCH_AVAILABLE = False
    print("[HEALTH-FOODS] ⚠️ web_search não disponível, não será possível pesquisar na internet.")

try:
    from ..api import call_api_json
    from ..config import MODEL, API_KEY
    LLM_AVAILABLE = bool(API_KEY)
except ImportError:
    LLM_AVAILABLE = False
    print("[HEALTH-FOODS] ⚠️ LLM API não disponível, não será possível extrair informações nutricionais automaticamente.")

# Database file path
DB_FILE = Path(__file__).parent.parent.parent / "data" / "health" / "foods_database.json"

# Cache directory
CACHE_DIR = Path(__file__).parent.parent.parent / "data" / "health" / "food_cache"
CACHE_DIR.mkdir(parents=True, exist_ok=True)

# Cache TTL (30 days - foods don't change often)
CACHE_TTL = 30 * 24 * 60 * 60

# =============================================================================
# PORTION HELPERS (T3.1)
# =============================================================================

# Porções padrão em gramas (valores médios brasileiros)
DEFAULT_PORTIONS = {
    # Pães e massas
    "fatia": 25,  # Fatia de pão
    "fatias": 25,
    "unidade": 50,  # Unidade genérica (pão, bolo, etc)
    "unidades": 50,
    "xícara": 130,  # Xícara de arroz/macarrão cozido
    "xicara": 130,
    "xícaras": 130,
    "xicaras": 130,
    "colher de sopa": 15,  # Colher de sopa
    "colher de sopa cheia": 20,
    "colher de sopa rasa": 10,
    "colher": 15,
    "colheres": 15,
    "colher de chá": 5,
    "colher de cha": 5,
    "colheres de chá": 5,
    "colheres de cha": 5,
    "copo": 200,  # Copo americano
    "copos": 200,
    "prato": 150,  # Prato raso
    "pratos": 150,
    "porção": 100,  # Porção genérica
    "porcoes": 100,
    "porções": 100,
    "porcao": 100,
}

def convert_portion_to_grams(food_name: str, portion_type: str, quantity: float = 1.0) -> Optional[float]:
    """
    Converte uma porção (ex: "2 fatias de pão") para gramas.
    
    Args:
        food_name: Nome do alimento (ex: "pão integral")
        portion_type: Tipo de porção (ex: "fatia", "xícara", "colher de sopa")
        quantity: Quantidade da porção (ex: 2.0 para "2 fatias")
    
    Returns:
        Gramas equivalentes ou None se não conseguir converter
    """
    # Normalizar tipo de porção
    portion_lower = portion_type.lower().strip()
    
    # Carregar banco de dados para verificar se o alimento tem porções específicas
    database = load_database()
    food_key = food_name.lower().strip()
    
    # Se o alimento tem porções definidas no banco, usar essas
    if food_key in database:
        food_data = database[food_key]
        if "servings" in food_data and isinstance(food_data["servings"], dict):
            servings = food_data["servings"]
            if portion_lower in servings:
                grams_per_portion = servings[portion_lower]
                return grams_per_portion * quantity
    
    # Caso contrário, usar porções padrão
    if portion_lower in DEFAULT_PORTIONS:
        grams_per_portion = DEFAULT_PORTIONS[portion_lower]
        return grams_per_portion * quantity
    
    # Se não encontrou, retornar None
    return None

def parse_portion_string(text: str) -> Optional[Dict[str, Any]]:
    """
    Tenta extrair informação de porção de uma string como "2 fatias de pão integral".
    
    Args:
        text: Texto contendo informação de porção (ex: "2 fatias de pão", "1 xícara de arroz")
    
    Returns:
        Dict com "quantity", "portion_type", "food_name" ou None se não conseguir parsear
    """
    import re
    
    # Padrões comuns
    patterns = [
        # "2 fatias de pão integral"
        (r'(\d+(?:\.\d+)?)\s+(fatias?|unidades?|xícaras?|xicaras?|colheres?\s+de\s+(?:sopa|chá)|colheres?|copos?|pratos?|porções?|porcoes?)\s+(?:de\s+)?(.+)', re.IGNORECASE),
        # "1 xícara de arroz"
        (r'(\d+(?:\.\d+)?)\s+(fatia|unidade|xícara|xicara|colher\s+de\s+(?:sopa|chá)|colher|copo|prato|porção|porcao)\s+(?:de\s+)?(.+)', re.IGNORECASE),
        # "pão integral, 2 fatias"
        (r'(.+?),\s*(\d+(?:\.\d+)?)\s+(fatias?|unidades?|xícaras?|xicaras?|colheres?\s+de\s+(?:sopa|chá)|colheres?|copos?|pratos?|porções?|porcoes?)', re.IGNORECASE),
    ]
    
    for pattern, flags in patterns:
        match = re.search(pattern, text, flags)
        if match:
            if len(match.groups()) == 3:
                if match.group(1).replace('.', '').isdigit():
                    # Formato: "2 fatias de pão"
                    quantity = float(match.group(1))
                    portion_type = match.group(2).strip()
                    food_name = match.group(3).strip()
                else:
                    # Formato: "pão, 2 fatias"
                    food_name = match.group(1).strip()
                    quantity = float(match.group(2))
                    portion_type = match.group(3).strip()
                
                return {
                    "quantity": quantity,
                    "portion_type": portion_type,
                    "food_name": food_name
                }
    
    return None

# =============================================================================
# DATABASE MANAGEMENT
# =============================================================================

def load_database() -> Dict[str, Dict]:
    """Load foods database from JSON file."""
    if not DB_FILE.exists():
        return {}
    try:
        data = json.loads(DB_FILE.read_text(encoding="utf-8"))
        return data if isinstance(data, dict) else {}
    except Exception as e:
        print(f"[HEALTH-FOODS] Erro ao carregar banco de dados: {e}")
        return {}

def save_database(database: Dict[str, Dict]):
    """Save foods database to JSON file."""
    try:
        DB_FILE.parent.mkdir(parents=True, exist_ok=True)
        DB_FILE.write_text(json.dumps(database, ensure_ascii=False, indent=2), encoding="utf-8")
    except Exception as e:
        print(f"[HEALTH-FOODS] Erro ao salvar banco de dados: {e}")

def add_food_to_database(food_name: str, nutrition: Dict):
    """Add a food to the database."""
    database = load_database()
    food_key = food_name.lower().strip()
    database[food_key] = {
        "name": food_name,
        "calories": nutrition.get("calories", 0),
        "protein": nutrition.get("protein", 0),
        "carbs": nutrition.get("carbs", 0),
        "fats": nutrition.get("fats", 0),
        "added_at": time.time()
    }
    save_database(database)
    # Also update cache
    save_to_cache(food_key, nutrition)

# =============================================================================
# LOCAL CACHE
# =============================================================================

def get_cache_file(food_name: str) -> Path:
    """Get cache file path for a food."""
    safe_name = "".join(c if c.isalnum() or c in (' ', '-', '_') else '_' for c in food_name.lower())
    safe_name = safe_name.replace(' ', '_')[:100]
    return CACHE_DIR / f"{safe_name}.json"

def load_from_cache(food_name: str) -> Optional[Dict]:
    """Load food data from cache if valid."""
    cache_file = get_cache_file(food_name)
    if not cache_file.exists():
        return None
    
    try:
        data = json.loads(cache_file.read_text(encoding="utf-8"))
        if time.time() - data.get("cached_at", 0) < CACHE_TTL:
            return data.get("nutrition")
        cache_file.unlink()
        return None
    except:
        return None

def save_to_cache(food_name: str, nutrition: Dict):
    """Save food data to cache."""
    cache_file = get_cache_file(food_name)
    try:
        cache_file.write_text(json.dumps({
            "food_name": food_name,
            "nutrition": nutrition,
            "cached_at": time.time()
        }, ensure_ascii=False, indent=2), encoding="utf-8")
    except:
        pass

# =============================================================================
# WEB SEARCH & LLM EXTRACTION
# =============================================================================

async def search_nutrition_online(food_name: str, timeout: float = 30.0) -> Optional[Dict]:
    """
    Search for nutritional information online and extract structured data using LLM.
    
    Args:
        food_name: Name of the food (Portuguese)
        timeout: Timeout in seconds for the search operation
    
    Returns:
        Nutritional info per 100g or None if not found
    """
    if not WEB_SEARCH_AVAILABLE:
        return None
    
    # Check cache first to avoid duplicate searches
    cached = load_from_cache(food_name.lower().strip())
    if cached:
        print(f"[HEALTH-FOODS] Using cached data for '{food_name}'")
        return cached
    
    try:
        import asyncio
        
        # Search online for nutritional information with timeout
        query = f"informação nutricional {food_name} 100g calorias proteínas carboidratos gorduras"
        
        try:
            # Wrap web_search in timeout (web_search is sync, so we use to_thread)
            search_result = await asyncio.wait_for(
                asyncio.to_thread(web_search, query),
                timeout=timeout
            )
        except asyncio.TimeoutError:
            print(f"[HEALTH-FOODS] ⏱️ Timeout ao pesquisar '{food_name}' (>{timeout}s)")
            return None
        except Exception as e:
            print(f"[HEALTH-FOODS] ❌ Erro na pesquisa web para '{food_name}': {e}")
            return None
        
        if not search_result.get("success") or not search_result.get("content"):
            print(f"[HEALTH-FOODS] Pesquisa não retornou resultados para '{food_name}'")
            return None
        
        search_content = search_result["content"]
        
        # Extract nutrition info using LLM
        if LLM_AVAILABLE:
            try:
                prompt = f"""Você precisa extrair informações nutricionais do seguinte texto sobre "{food_name}".

Texto pesquisado:
{search_content[:2000]}

Extraia APENAS os valores nutricionais para 100g do alimento. Responda APENAS com JSON no seguinte formato:
{{
  "calories": <número>,
  "protein": <número>,
  "carbs": <número>,
  "fats": <número>
}}

Se não conseguir encontrar informações claras, retorne apenas {{"error": "não encontrado"}}.
Use apenas números (sem unidades). Use 0 se não encontrar algum valor."""

                messages = [
                    {"role": "system", "content": "Você é um assistente que extrai informações nutricionais estruturadas de textos. Responda APENAS com JSON válido."},
                    {"role": "user", "content": prompt}
                ]
                
                try:
                    response = await asyncio.wait_for(
                        call_api_json(messages, model=MODEL, max_tokens=200, temperature=0.1),
                        timeout=timeout
                    )
                except asyncio.TimeoutError:
                    print(f"[HEALTH-FOODS] Timeout ao extrair informações com LLM para '{food_name}'")
                    return None
                
                if "error" in response:
                    print(f"[HEALTH-FOODS] LLM error: {response['error']}")
                    return None
                
                content = response.get("choices", [{}])[0].get("message", {}).get("content", "")
                
                # Try to extract JSON from response
                json_match = re.search(r'\{[^{}]*"calories"[^{}]*\}', content)
                if json_match:
                    try:
                        nutrition_data = json.loads(json_match.group())
                        if "error" not in nutrition_data:
                            nutrition = {
                                "name": food_name.lower(),
                                "calories": round(float(nutrition_data.get("calories", 0)), 1),
                                "protein": round(float(nutrition_data.get("protein", 0)), 1),
                                "carbs": round(float(nutrition_data.get("carbs", 0)), 1),
                                "fats": round(float(nutrition_data.get("fats", 0)), 1)
                            }
                            
                            # Validate nutrition data (basic sanity check)
                            if nutrition["calories"] > 0 or nutrition["protein"] > 0 or nutrition["carbs"] > 0 or nutrition["fats"] > 0:
                                # Save to database and cache
                                add_food_to_database(food_name, nutrition)
                                print(f"[HEALTH-FOODS] ✅ Alimento '{food_name}' pesquisado e adicionado ao banco")
                                return nutrition
                            else:
                                print(f"[HEALTH-FOODS] ⚠️ Dados nutricionais inválidos para '{food_name}' (todos zeros)")
                    except json.JSONDecodeError as e:
                        print(f"[HEALTH-FOODS] Erro ao parsear JSON extraído: {e}")
            except Exception as e:
                print(f"[HEALTH-FOODS] LLM extraction error: {e}")
        
        return None
        
    except Exception as e:
        print(f"[HEALTH-FOODS] Online search error: {e}")
        return None

# Note: search_nutrition_online is async - use it with await in async contexts
# For sync contexts, we'll need to call it differently

# =============================================================================
# INITIAL DATABASE (Default Brazilian foods)
# =============================================================================

def init_default_database():
    """Initialize database with default Brazilian foods if empty."""
    database = load_database()
    if database:
        return  # Already has data
    
    default_foods = {
        # Cereais e Grãos
        "arroz branco cozido": {
            "name": "arroz branco cozido", 
            "calories": 130, "protein": 2.7, "carbs": 28.0, "fats": 0.3,
            "servings": {"xícara": 130, "colher de sopa": 15, "prato": 150}
        },
        "arroz integral cozido": {
            "name": "arroz integral cozido", 
            "calories": 111, "protein": 2.6, "carbs": 22.8, "fats": 0.9,
            "servings": {"xícara": 130, "colher de sopa": 15, "prato": 150}
        },
        "feijão cozido": {
            "name": "feijão cozido", 
            "calories": 76, "protein": 4.8, "carbs": 14.0, "fats": 0.5,
            "servings": {"xícara": 130, "colher de sopa": 15, "prato": 120}
        },
        "feijão preto cozido": {
            "name": "feijão preto cozido", 
            "calories": 77, "protein": 4.5, "carbs": 14.0, "fats": 0.5,
            "servings": {"xícara": 130, "colher de sopa": 15, "prato": 120}
        },
        "macarrão cozido": {
            "name": "macarrão cozido", 
            "calories": 131, "protein": 5.0, "carbs": 25.0, "fats": 1.1,
            "servings": {"xícara": 130, "colher de sopa": 15, "prato": 150}
        },
        "pão integral": {
            "name": "pão integral", 
            "calories": 247, "protein": 12.0, "carbs": 41.0, "fats": 4.2,
            "servings": {"fatia": 25, "unidade": 50}
        },
        "pão branco": {
            "name": "pão branco", 
            "calories": 265, "protein": 9.0, "carbs": 49.0, "fats": 3.2,
            "servings": {"fatia": 25, "unidade": 50}
        },
        
        # Proteínas
        "frango grelhado": {
            "name": "frango grelhado", 
            "calories": 165, "protein": 31.0, "carbs": 0.0, "fats": 3.6,
            "servings": {"porção": 100, "unidade": 100}
        },
        "peito de frango": {
            "name": "peito de frango", 
            "calories": 165, "protein": 31.0, "carbs": 0.0, "fats": 3.6,
            "servings": {"porção": 100, "unidade": 100}
        },
        "carne bovina grelhada": {
            "name": "carne bovina grelhada", 
            "calories": 250, "protein": 26.0, "carbs": 0.0, "fats": 15.0,
            "servings": {"porção": 100, "unidade": 100}
        },
        "ovo cozido": {
            "name": "ovo cozido", 
            "calories": 155, "protein": 13.0, "carbs": 1.1, "fats": 10.6,
            "servings": {"unidade": 50}
        },
        
        # Laticínios
        "leite integral": {
            "name": "leite integral", 
            "calories": 61, "protein": 3.2, "carbs": 4.8, "fats": 3.2,
            "servings": {"copo": 200, "xícara": 200, "colher de sopa": 15}
        },
        "leite desnatado": {
            "name": "leite desnatado", 
            "calories": 34, "protein": 3.4, "carbs": 5.0, "fats": 0.1,
            "servings": {"copo": 200, "xícara": 200, "colher de sopa": 15}
        },
        "queijo mussarela": {
            "name": "queijo mussarela", 
            "calories": 300, "protein": 22.0, "carbs": 2.0, "fats": 22.0,
            "servings": {"fatia": 20, "porção": 30, "colher de sopa": 15}
        },
        
        # Frutas
        "banana": {
            "name": "banana", 
            "calories": 89, "protein": 1.1, "carbs": 23.0, "fats": 0.3,
            "servings": {"unidade": 100}
        },
        "maçã": {
            "name": "maçã", 
            "calories": 52, "protein": 0.3, "carbs": 14.0, "fats": 0.2,
            "servings": {"unidade": 150}
        },
        "laranja": {
            "name": "laranja", 
            "calories": 47, "protein": 0.9, "carbs": 12.0, "fats": 0.1,
            "servings": {"unidade": 150}
        },
    }
    
    # Add timestamp to each food
    for food_key, food_data in default_foods.items():
        food_data["added_at"] = time.time()
    
    save_database(default_foods)

# Initialize database on import
init_default_database()

# =============================================================================
# PUBLIC API
# =============================================================================

def search_foods(query: str, limit: int = 10) -> List[Dict]:
    """
    Search foods in database.
    If query is empty, returns all foods (up to limit).
    
    Args:
        query: Search term (Portuguese). If empty, returns all foods.
        limit: Maximum number of results
    
    Returns:
        List of matching foods with their nutritional info
    """
    database = load_database()
    results = []
    
    # If query is empty, return all foods
    if not query or len(query.strip()) == 0:
        for food_key, food_data in database.items():
            nutrition = {
                "name": food_data.get("name", food_key),
                "calories": food_data.get("calories", 0),
                "protein": food_data.get("protein", 0),
                "carbs": food_data.get("carbs", 0),
                "fats": food_data.get("fats", 0)
            }
            results.append(nutrition)
            if len(results) >= limit:
                break
        return results
    
    # If query is too short (less than 2 chars), return empty
    if len(query.strip()) < 2:
        return []
    
    query_lower = query.lower().strip()
    
    # 1. Check cache first
    cached = load_from_cache(query_lower)
    if cached:
        results.append(cached)
        if len(results) >= limit:
            return results
    
    # 2. Search in database
    for food_key, food_data in database.items():
        if query_lower in food_key or food_key in query_lower:
            nutrition = {
                "name": food_data.get("name", food_key),
                "calories": food_data.get("calories", 0),
                "protein": food_data.get("protein", 0),
                "carbs": food_data.get("carbs", 0),
                "fats": food_data.get("fats", 0)
            }
            results.append(nutrition)
            save_to_cache(food_key, nutrition)
            if len(results) >= limit:
                break
    
    return results[:limit]


async def get_food_nutrition(food_name: str, search_online: bool = True) -> Optional[Dict]:
    """
    Get nutritional information for a specific food (Portuguese).
    If not found in database and search_online=True, searches online.
    
    Args:
        food_name: Name of the food (Portuguese)
        search_online: If True, search online if not found in database
    
    Returns:
        Nutritional info per 100g or None if not found
    """
    food_lower = food_name.lower().strip()
    database = load_database()
    
    # 1. Check cache
    cached = load_from_cache(food_lower)
    if cached:
        return cached
    
    # 2. Check database
    if food_lower in database:
        food_data = database[food_lower]
        nutrition = {
            "name": food_data.get("name", food_lower),
            "calories": food_data.get("calories", 0),
            "protein": food_data.get("protein", 0),
            "carbs": food_data.get("carbs", 0),
            "fats": food_data.get("fats", 0)
        }
        save_to_cache(food_lower, nutrition)
        return nutrition
    
    # 3. Search online if enabled
    if search_online:
        nutrition = await search_nutrition_online(food_name)
        if nutrition:
            return nutrition
    
    return None


async def calculate_nutrition(food_name: str, grams: float = None, portion_type: str = None, portion_quantity: float = 1.0, search_online: bool = True) -> Optional[Dict]:
    """
    Calculate nutrition for a specific amount of food.
    Supports both direct grams and portion-based calculations.
    
    Args:
        food_name: Name of the food (Portuguese)
        grams: Amount in grams (optional if portion_type is provided)
        portion_type: Type of portion (ex: "fatia", "xícara", "colher de sopa") - optional
        portion_quantity: Quantity of portions (default: 1.0) - optional
        search_online: If True, search online if not found in database
    
    Returns:
        Calculated nutritional values for the specified amount
    """
    nutrition = await get_food_nutrition(food_name, search_online=search_online)
    if not nutrition:
        return None
    
    # Se portion_type foi fornecido, converter para gramas
    if portion_type and grams is None:
        grams = convert_portion_to_grams(food_name, portion_type, portion_quantity)
        if grams is None:
            return None  # Não conseguiu converter porção
    
    # Se grams ainda não foi definido, retornar None
    if grams is None:
        return None
    
    multiplier = grams / 100.0
    
    return {
        "calories": round(nutrition["calories"] * multiplier, 1),
        "protein": round(nutrition["protein"] * multiplier, 1),
        "carbs": round(nutrition["carbs"] * multiplier, 1),
        "fats": round(nutrition["fats"] * multiplier, 1)
    }


async def try_find_or_add_food(food_name: str, search_online: bool = True) -> Optional[Dict]:
    """
    Helper function to find or automatically add a food to the database.
    Tries to find in database first, then searches online if not found.
    
    Args:
        food_name: Name of the food to find/add
        search_online: If True, search online if not found in database
    
    Returns:
        Nutritional info per 100g or None if not found
    """
    # Try to get nutrition info (will search online if not found and search_online=True)
    nutrition = await get_food_nutrition(food_name, search_online=search_online)
    return nutrition


def add_food_manually(food_name: str, calories: float, protein: float, carbs: float, fats: float) -> Dict:
    """
    Add a food manually to the database.
    
    Args:
        food_name: Name of the food
        calories: Calories per 100g
        protein: Protein per 100g (grams)
        carbs: Carbohydrates per 100g (grams)
        fats: Fats per 100g (grams)
    
    Returns:
        Added food data
    """
    nutrition = {
        "calories": round(calories, 1),
        "protein": round(protein, 1),
        "carbs": round(carbs, 1),
        "fats": round(fats, 1)
    }
    
    add_food_to_database(food_name, nutrition)
    
    return {
        "name": food_name,
        **nutrition
    }
