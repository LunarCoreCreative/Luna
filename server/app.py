"""
Luna Backend - Servidor de Pesquisa
FastAPI server for proxying Tavily search requests
"""
import sys
import io
import os

# Fix encoding for Windows console (only if not already wrapped)
if sys.platform == 'win32' and not isinstance(sys.stdout, io.TextIOWrapper):
    try:
        if hasattr(sys.stdout, 'buffer'):
            sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        if hasattr(sys.stderr, 'buffer'):
            sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    except (AttributeError, ValueError):
        # Se não conseguir reconfigurar, apenas definir variável de ambiente
        os.environ['PYTHONIOENCODING'] = 'utf-8'

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Luna Search Backend")

# CORS - Permitir frontend local (múltiplas portas Vite)
# Em desenvolvimento, permitir todas as origens locais
import re

def is_local_origin(origin: str) -> bool:
    """Verifica se a origem é localhost ou 127.0.0.1"""
    if not origin:
        return False
    pattern = r'^https?://(localhost|127\.0\.0\.1)(:\d+)?$'
    return bool(re.match(pattern, origin))

# CORS - Permitir todas as origens em desenvolvimento
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em desenvolvimento, permitir todas as origens
    allow_credentials=False,  # Não permitir credentials quando allow_origins=["*"]
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# Import Business Router
from business.routes import router as business_router
app.include_router(business_router, prefix="/api/business", tags=["Business"])

TAVILY_API_KEY = os.getenv("VITE_TAVILY_API_KEY")

class SearchRequest(BaseModel):
    query: str

class SearchResponse(BaseModel):
    results: list
    answer: str | None = None

@app.options("/{full_path:path}")
async def options_handler(full_path: str):
    """Handler para requisições OPTIONS (preflight CORS)"""
    from fastapi.responses import Response
    return Response(
        status_code=200,
        headers={
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS, PATCH",
            "Access-Control-Allow-Headers": "*",
        }
    )

@app.get("/health")
async def health_check():
    return {"status": "ok", "tavily_configured": bool(TAVILY_API_KEY)}

@app.post("/api/search")
async def search(request: SearchRequest):
    if not TAVILY_API_KEY:
        raise HTTPException(status_code=500, detail="Tavily API Key not configured")
    
    print(f"[Proxy] Searching for: {request.query}")
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                "https://api.tavily.com/search",
                json={
                    "api_key": TAVILY_API_KEY,
                    "query": request.query,
                    "search_depth": "basic",
                    "include_answer": True,
                    "max_results": 5,
                    "include_images": False,
                    "include_raw_content": False
                },
                timeout=30.0
            )
            response.raise_for_status()
            data = response.json()
            
            # Formatar resultados para contexto LLM
            formatted_results = []
            for result in data.get("results", []):
                formatted_results.append({
                    "title": result.get("title", ""),
                    "url": result.get("url", ""),
                    "content": result.get("content", "")
                })
            
            return {
                "results": formatted_results,
                "answer": data.get("answer")
            }
            
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Search timeout")
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=str(e))
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


# ===== READ URL ENDPOINT =====
class ReadUrlRequest(BaseModel):
    url: str

@app.post("/api/read-url")
async def read_url(request: ReadUrlRequest):
    """
    Extrai o conteúdo de texto de uma URL específica.
    Retorna o título e conteúdo principal da página.
    """
    print(f"[Proxy] Reading URL: {request.url}")
    
    async with httpx.AsyncClient() as client:
        try:
            # Fazer request com headers de navegador para evitar bloqueios
            response = await client.get(
                request.url,
                headers={
                    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                    "Accept-Language": "pt-BR,pt;q=0.9,en-US;q=0.8,en;q=0.7",
                },
                timeout=30.0,
                follow_redirects=True
            )
            response.raise_for_status()
            
            html_content = response.text
            
            # Parsing básico sem BeautifulSoup (fallback)
            # Extrair título
            title = ""
            title_start = html_content.lower().find("<title>")
            title_end = html_content.lower().find("</title>")
            if title_start != -1 and title_end != -1:
                title = html_content[title_start + 7:title_end].strip()
            
            # Remover scripts, styles e tags HTML
            import re
            
            # Remover scripts e styles
            text = re.sub(r'<script[^>]*>.*?</script>', '', html_content, flags=re.DOTALL | re.IGNORECASE)
            text = re.sub(r'<style[^>]*>.*?</style>', '', text, flags=re.DOTALL | re.IGNORECASE)
            text = re.sub(r'<nav[^>]*>.*?</nav>', '', text, flags=re.DOTALL | re.IGNORECASE)
            text = re.sub(r'<footer[^>]*>.*?</footer>', '', text, flags=re.DOTALL | re.IGNORECASE)
            text = re.sub(r'<header[^>]*>.*?</header>', '', text, flags=re.DOTALL | re.IGNORECASE)
            
            # Remover todas as tags HTML
            text = re.sub(r'<[^>]+>', ' ', text)
            
            # Limpar espaços extras e entidades HTML
            text = re.sub(r'&nbsp;', ' ', text)
            text = re.sub(r'&amp;', '&', text)
            text = re.sub(r'&lt;', '<', text)
            text = re.sub(r'&gt;', '>', text)
            text = re.sub(r'&quot;', '"', text)
            text = re.sub(r'&#\d+;', '', text)
            text = re.sub(r'\s+', ' ', text)
            text = text.strip()
            
            # Limitar tamanho do conteúdo (para não sobrecarregar o LLM)
            max_chars = 8000
            if len(text) > max_chars:
                text = text[:max_chars] + "... [conteúdo truncado]"
            
            return {
                "url": request.url,
                "title": title,
                "content": text,
                "success": True
            }
            
        except httpx.TimeoutException:
            raise HTTPException(status_code=504, detail="Timeout ao acessar URL")
        except httpx.HTTPStatusError as e:
            raise HTTPException(status_code=e.response.status_code, detail=f"Erro HTTP: {e.response.status_code}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))


# ===== MEMORY ENDPOINTS =====
from memory import save_memory, search_memories, list_memories, delete_memory, get_memory_count, update_memory

class MemorySaveRequest(BaseModel):
    user_id: str
    content: str
    memory_type: str = "conversation"  # conversation, preference, fact, instruction
    metadata: dict = None

class MemorySearchRequest(BaseModel):
    user_id: str
    query: str
    n_results: int = 5
    memory_type: str = None

class MemoryDeleteRequest(BaseModel):
    user_id: str
    memory_id: str

class MemoryUpdateRequest(BaseModel):
    user_id: str
    memory_id: str
    content: str = None
    memory_type: str = None
    metadata: dict = None


@app.post("/api/memory/save")
async def api_save_memory(request: MemorySaveRequest):
    """Salva uma nova memória para o usuário."""
    from fastapi.responses import JSONResponse
    try:
        memory_id = save_memory(
            user_id=request.user_id,
            content=request.content,
            memory_type=request.memory_type,
            metadata=request.metadata
        )
        
        if memory_id:
            return JSONResponse(
                content={"success": True, "memory_id": memory_id},
                headers={
                    "Access-Control-Allow-Origin": "*",
                    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                    "Access-Control-Allow-Headers": "*",
                }
            )
        else:
            raise HTTPException(status_code=500, detail="Falha ao salvar memória")
    except Exception as e:
        error_msg = str(e).encode('ascii', errors='replace').decode('ascii')
        print(f"[ERROR] Erro ao salvar memoria: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Erro ao salvar memoria: {error_msg}")


@app.post("/api/memory/search")
async def api_search_memories(request: MemorySearchRequest):
    """Busca memórias semanticamente similares."""
    results = search_memories(
        user_id=request.user_id,
        query=request.query,
        n_results=request.n_results,
        memory_type=request.memory_type
    )
    
    return {"results": results, "count": len(results)}


@app.get("/api/memory/list/{user_id}")
async def api_list_memories(user_id: str, limit: int = 50):
    """Lista todas as memórias de um usuário."""
    from fastapi.responses import JSONResponse
    try:
        memories = list_memories(user_id, limit=limit)
        count = get_memory_count(user_id)
        
        return JSONResponse(
            content={"memories": memories, "total": count},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "*",
            }
        )
    except Exception as e:
        error_msg = str(e).encode('ascii', errors='replace').decode('ascii')
        print(f"[ERROR] Erro ao listar memorias: {error_msg}")
        raise HTTPException(status_code=500, detail=f"Erro ao listar memorias: {error_msg}")


@app.put("/api/memory/update")
async def api_update_memory(request: MemoryUpdateRequest):
    """Atualiza uma memória existente."""
    from fastapi.responses import JSONResponse
    success = update_memory(
        user_id=request.user_id,
        memory_id=request.memory_id,
        content=request.content,
        memory_type=request.memory_type,
        metadata=request.metadata
    )
    
    if success:
        return JSONResponse(
            content={"success": True},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "*",
            }
        )
    else:
        raise HTTPException(status_code=404, detail="Memória não encontrada ou falha ao atualizar")

@app.delete("/api/memory/delete")
async def api_delete_memory(request: MemoryDeleteRequest):
    """Deleta uma memória específica."""
    from fastapi.responses import JSONResponse
    success = delete_memory(request.user_id, request.memory_id)
    
    if success:
        return JSONResponse(
            content={"success": True},
            headers={
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
                "Access-Control-Allow-Headers": "*",
            }
        )
    else:
        raise HTTPException(status_code=404, detail="Memória não encontrada")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=3001)


