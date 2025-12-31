import sys
import os

try:
    from duckduckgo_search import DDGS
    print(f"DDGS imported successfully.")
    
    # Tenta uso simples sem context manager primeiro, que é o padrão em algumas versões
    results = list(DDGS().text("python", max_results=3))
    print(f"Results sample: {results}")

except ImportError:
    print("Failed to import DDGS")
except Exception as e:
    print(f"Error: {e}")
