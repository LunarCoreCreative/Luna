"""
Luna Memory Server - Main Entry Point
--------------------------------------
FastAPI application with all routes and WebSocket handlers.
"""

import json
import os
import tempfile
from typing import Optional

from fastapi import FastAPI, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .config import DB_PATH
from .memory import preload_models, is_ready, get_collection, save_technical_knowledge
from .chat import ChatManager, Message, ChatRequest, SaveChatRequest, CreateThreadRequest
from .agent import unified_generator
from .artifacts import save_artifact, list_artifacts, get_artifact, delete_artifact, update_artifact_content

# Study Mode
from .study.routes import router as study_router

# =============================================================================
# APP INITIALIZATION
# =============================================================================

app = FastAPI(title="Luna Memory Server", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"]
)

# Register Study Mode routes
app.include_router(study_router)

@app.on_event("startup")
async def startup():
    import asyncio
    asyncio.create_task(preload_models())

# =============================================================================
# HEALTH & STATUS
# =============================================================================

@app.get("/health")
def health_check():
    return {
        "status": "ready" if is_ready() else "warming_up",
        "version": "2.0.0"
    }

@app.get("/memory/count")
async def memory_count():
    return {"count": get_collection().count()}

# =============================================================================
# FILE UPLOAD
# =============================================================================

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    try:
        filename = file.filename.lower()
        content = await file.read()
        
        if filename.endswith(".pdf"):
            try:
                import pdfplumber
                with tempfile.NamedTemporaryFile(delete=False, suffix=".pdf") as tmp:
                    tmp.write(content)
                    tmp_path = tmp.name
                
                text_parts = []
                with pdfplumber.open(tmp_path) as pdf:
                    for page in pdf.pages:
                        page_text = page.extract_text()
                        if page_text:
                            text_parts.append(page_text)
                
                os.unlink(tmp_path)
                extracted_text = "\n\n".join(text_parts)
                
                if not extracted_text.strip():
                    return {"success": False, "error": "Não foi possível extrair texto do PDF."}
                
                if len(extracted_text) > 50000:
                    extracted_text = extracted_text[:50000] + "\n\n... [Arquivo truncado]"
                
                return {"success": True, "filename": file.filename, "content": extracted_text, "type": "pdf"}
            except ImportError:
                return {"success": False, "error": "pdfplumber não instalado."}
        
        elif filename.endswith(".txt"):
            try:
                text = content.decode("utf-8")
            except UnicodeDecodeError:
                text = content.decode("latin-1")
            
            if len(text) > 50000:
                text = text[:50000] + "\n\n... [Arquivo truncado]"
            
            return {"success": True, "filename": file.filename, "content": text, "type": "txt"}
        
        else:
            return {"success": False, "error": f"Tipo não suportado: {filename}"}
    
    except Exception as e:
        return {"success": False, "error": str(e)}

# =============================================================================
# CHAT ENDPOINTS
# =============================================================================

@app.get("/chats")
async def get_chats():
    return {"success": True, "chats": ChatManager.list_chats()}

@app.get("/chats/{chat_id}")
async def get_chat_details(chat_id: str, thread_id: Optional[str] = None):
    data = ChatManager.load_chat(chat_id, thread_id)
    if data:
        return {"success": True, "chat": data}
    return {"success": False, "error": "Chat não encontrado"}

@app.post("/chats")
async def save_chat_endpoint(req: SaveChatRequest):
    data = ChatManager.save_chat(req.chat_id, req.messages, req.title, req.thread_id)
    return {"success": True, "chat": data}

@app.delete("/chats/{chat_id}")
async def delete_chat_endpoint(chat_id: str):
    success = ChatManager.delete_chat(chat_id)
    return {"success": success}

@app.post("/chats/{chat_id}/threads")
async def create_thread_endpoint(chat_id: str, req: CreateThreadRequest):
    thread = ChatManager.create_thread(chat_id, req.title)
    if thread:
        return {"success": True, "thread": thread}
    return {"success": False, "error": "Chat não encontrado"}

@app.delete("/chats/{chat_id}/threads/{thread_id}")
async def delete_thread_endpoint(chat_id: str, thread_id: str):
    success = ChatManager.delete_thread(chat_id, thread_id)
    return {"success": success}

# =============================================================================
# ARTIFACT ENDPOINTS (Global Canvas)
# =============================================================================

@app.get("/artifacts")
async def get_artifacts():
    """List all artifacts."""
    return {"success": True, "artifacts": list_artifacts()}

@app.get("/artifacts/{artifact_id}")
async def get_artifact_endpoint(artifact_id: str):
    """Get a single artifact by ID."""
    artifact = get_artifact(artifact_id)
    if artifact:
        return {"success": True, "artifact": artifact}
    raise HTTPException(status_code=404, detail="Artifact not found")

@app.put("/artifacts/{artifact_id}")
async def update_artifact_endpoint(artifact_id: str, content: dict):
    """Update artifact content."""
    result = update_artifact_content(artifact_id, content.get("content", ""))
    return result

@app.delete("/artifacts/{artifact_id}")
async def delete_artifact_endpoint(artifact_id: str):
    """Delete an artifact."""
    result = delete_artifact(artifact_id)
    if result.get("success"):
        return result
    raise HTTPException(status_code=404, detail="Artifact not found")

# =============================================================================
# AGENT STREAMING
# =============================================================================

@app.post("/chat/stream")
@app.post("/agent/stream")
async def agent_stream(request: ChatRequest):
    return StreamingResponse(unified_generator(request), media_type="text/event-stream")

# =============================================================================
# WEBSOCKET HANDLER
# =============================================================================

@app.websocket("/ws/agent")
async def ws_agent(websocket: WebSocket):
    await websocket.accept()
    print("[WS] Connection open")
    
    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            
            if msg.get("type") == "start":
                req_data = msg.get("request", {})
                messages_raw = req_data.get("messages", [])
                deep_thinking = req_data.get("deep_thinking", False)
                active_artifact_id = req_data.get("active_artifact_id")
                
                # Convert to Message objects
                messages = [
                    Message(
                        role=m.get("role", "user"),
                        content=m.get("content", ""),
                        images=m.get("images", []),
                        artifact=m.get("artifact") # CRITICAL: Ensure artifact data is passed
                    )
                    for m in messages_raw
                ]
                request = ChatRequest(
                    messages=messages, 
                    agent_mode=True, 
                    deep_thinking=deep_thinking,
                    active_artifact_id=active_artifact_id # CRITICAL: Pass active artifact ID
                )
                
                print(f"[WS] Starting stream for {len(messages)} messages")
                async for chunk in unified_generator(request):
                    chunk = chunk.strip()
                    if chunk.startswith("data: "):
                        data_str = chunk[6:]
                        try:
                            data = json.loads(data_str)
                            print(f"[WS] Sending: {list(data.keys())}")
                            await websocket.send_json(data)
                        except json.JSONDecodeError as e:
                            print(f"[WS] JSON error: {e}")
                
                print("[WS] Stream complete")
    
    except WebSocketDisconnect:
        print("[WS] Client disconnected")
    except Exception as e:
        err_msg = str(e).encode('ascii', 'replace').decode('ascii')
        print(f"[WS] Error: {err_msg}")
        try:
            await websocket.send_json({"error": str(e)})
        except:
            pass

# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)
