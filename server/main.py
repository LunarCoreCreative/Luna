"""
Luna Memory Server - Main Entry Point
--------------------------------------
FastAPI application with all routes and WebSocket handlers.
"""

import json
import os
import sys
import io
import tempfile
import uuid
import asyncio
from typing import Optional

# Force UTF-8 for Windows Console to avoid charmap errors with emojis
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')
sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8')

from fastapi import FastAPI, HTTPException, UploadFile, File, WebSocket, WebSocketDisconnect, Request
from fastapi.responses import StreamingResponse, FileResponse
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from .config import DB_PATH, CHAT_DIR, IDE_CHAT_DIR
from .memory import preload_models, is_ready, save_technical_knowledge
from .chat import ChatManager, Message, ChatRequest, SaveChatRequest, CreateThreadRequest
from .agent import unified_generator
from .artifacts import save_artifact, list_artifacts, get_artifact, delete_artifact, update_artifact_content

# Study Mode
from .study.routes import router as study_router

# Luna Link (Remote Agent Tunnel)
from . import link_manager

# =============================================================================
# APP INITIALIZATION
# =============================================================================

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Inicialização (Equivalente ao Startup)
    asyncio.create_task(preload_models())
    yield
    # Limpeza (se necessário) pode ser feita aqui

app = FastAPI(title="Luna Memory Server", version="2.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173", "*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

# Register Study Mode routes
app.include_router(study_router)

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
async def memory_count(user_id: Optional[str] = None):
    if not user_id: return {"count": 0}
    try:
        from .memory import get_user_memory_col
        col = get_user_memory_col(user_id)
        # Firestore count is efficient for small-medium collections
        count = len(list(col.limit(100).stream())) # Simplified for now, or use aggregation query
        return {"count": count}
    except:
        return {"count": 0}

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
async def get_chats(user_id: Optional[str] = None):
    return {"success": True, "chats": ChatManager.list_chats(user_id=user_id)}

@app.get("/chats/{chat_id}")
async def get_chat_details(chat_id: str, thread_id: Optional[str] = None, user_id: Optional[str] = None):
    data = ChatManager.load_chat(chat_id, user_id=user_id)
    if data:
        return {"success": True, "chat": data}
    return {"success": False, "error": "Chat não encontrado"}

@app.post("/chats")
async def save_chat_endpoint(req: SaveChatRequest):
    data = ChatManager.save_chat(req.chat_id, req.messages, req.title, req.thread_id, user_id=req.user_id)
    return {"success": True, "chat": data}

@app.delete("/chats/{chat_id}")
async def delete_chat_endpoint(chat_id: str, user_id: Optional[str] = None):
    success = ChatManager.delete_chat(chat_id, user_id=user_id)
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
async def get_artifacts(user_id: Optional[str] = None):
    """List all artifacts."""
    return {"success": True, "artifacts": list_artifacts(user_id=user_id)}

@app.get("/artifacts/{artifact_id}")
async def get_artifact_endpoint(artifact_id: str, user_id: Optional[str] = None):
    """Get a single artifact by ID."""
    artifact = get_artifact(artifact_id, user_id=user_id)
    if artifact:
        return {"success": True, "artifact": artifact}
    raise HTTPException(status_code=404, detail="Artifact not found")

@app.put("/artifacts/{artifact_id}")
async def update_artifact_endpoint(artifact_id: str, content: dict, user_id: Optional[str] = None):
    """Update artifact content."""
    result = update_artifact_content(artifact_id, content.get("content", ""), user_id=user_id)
    return result

@app.delete("/artifacts/{artifact_id}")
async def delete_artifact_endpoint(artifact_id: str, user_id: Optional[str] = None):
    """Delete an artifact."""
    result = delete_artifact(artifact_id, user_id=user_id)
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
# CODE AGENT (IDE MODE)
# =============================================================================

from .code_agent import CodeAgentState, code_agent_generator

# Estado global do code agent (um por servidor por enquanto)
code_agent_state = CodeAgentState()

@app.post("/system/pick-folder")
async def system_pick_folder(request: Request):
    """
    Opens a native folder picker dialog.
    - In production: Uses Luna Link to trigger dialog in user's Electron app
    - In local dev: Uses local PowerShell dialog (Windows only)
    """
    import platform
    
    # Try to get user ID from request header (for Luna Link routing)
    uid = request.headers.get("X-User-ID")
    
    # Check if Luna Link is available for this user
    if uid and link_manager.has_active_link(uid):
        # Route via Luna Link (Electron client)
        result = await link_manager.link_pick_folder(uid)
        return result
    
    # Fallback: Local mode (only works on Windows in local dev)
    if platform.system() != "Windows":
        return {
            "success": False, 
            "error": "Luna Link não conectado. Abra o app Luna Desktop para usar o IDE."
        }
    
    # Local Windows fallback (development mode)
    import subprocess
    
    ps_script = """
    Add-Type -AssemblyName System.Windows.Forms
    $f = New-Object System.Windows.Forms.FolderBrowserDialog
    $f.Description = "Selecione a pasta do projeto Luna"
    $f.ShowNewFolderButton = $true
    if ($f.ShowDialog() -eq [System.Windows.Forms.DialogResult]::OK) {
        Write-Output $f.SelectedPath
    }
    """
    
    try:
        result = subprocess.run(
            ["powershell", "-Command", ps_script], 
            capture_output=True, 
            text=True, 
            creationflags=subprocess.CREATE_NO_WINDOW
        )
        
        path = result.stdout.strip()
        if path:
            return {"success": True, "path": path}
        return {"success": False, "error": "Nenhuma pasta selecionada"}
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@app.post("/system/create-folder")
async def system_create_folder(data: dict):
    """Creates a new folder."""
    try:
        path = data.get("path")
        if not path:
            return {"success": False, "error": "Caminho não especificado"}
        
        if os.path.exists(path):
            return {"success": False, "error": "A pasta já existe"}
            
        os.makedirs(path)
        return {"success": True, "path": path}
    except Exception as e:
        return {"success": False, "error": str(e)}
_code_agent_state: CodeAgentState = None

def get_code_agent_state() -> CodeAgentState:
    global _code_agent_state
    if _code_agent_state is None:
        _code_agent_state = CodeAgentState()
    return _code_agent_state

@app.post("/code-agent/set-workspace")
async def set_workspace(data: dict):
    """Define o workspace para o code agent."""
    path = data.get("path")
    if not path:
        return {"success": False, "error": "Caminho não especificado"}
    
    state = get_code_agent_state()
    if state.set_workspace(path):
        return {
            "success": True,
            "workspace": str(state.security.workspace)
        }
    return {"success": False, "error": f"Não foi possível acessar: {path}"}

@app.get("/code-agent/workspace")
async def get_workspace():
    """Retorna o workspace atual do code agent."""
    state = get_code_agent_state()
    if state.is_configured:
        return {
            "success": True,
            "workspace": str(state.security.workspace),
            "cwd": str(state.terminal.cwd)
        }
    return {"success": False, "configured": False}

@app.post("/code-agent/approve")
async def approve_command(data: dict):
    """Aprova um comando pendente."""
    state = get_code_agent_state()
    if not state.pending_approval:
        return {"success": False, "error": "Nenhum comando pendente"}
    
    approved = data.get("approved", False)
    
    if approved:
        # Executa o comando com força
        pending = state.pending_approval
        result = state.terminal.execute_command(
            pending["args"]["command"],
            requires_approval=False  # Já aprovado
        )
        state.pending_approval = None
        return {"success": True, "result": result}
    else:
        state.pending_approval = None
        return {"success": True, "cancelled": True}

@app.post("/code-agent/list-directory")
async def list_directory(data: dict):
    """Lista arquivos de um diretório para o FileExplorer."""
    state = get_code_agent_state()
    if not state.is_configured:
        return {"success": False, "error": "Workspace não configurado"}
    
    path = data.get("path", ".")
    return state.filesystem.list_directory(path)

@app.post("/code-agent/read-file")
async def read_file(data: dict):
    """Lê conteúdo de um arquivo."""
    state = get_code_agent_state()
    if not state.is_configured:
        return {"success": False, "error": "Workspace não configurado"}
    
    path = data.get("path")
    if not path:
        return {"success": False, "error": "Caminho não especificado"}
    
    return state.filesystem.read_file(path)

@app.post("/code-agent/execute")
async def execute_terminal_command(data: dict):
    """Executa um comando de terminal."""
    state = get_code_agent_state()
    if not state.is_configured:
        return {"success": False, "error": "Workspace não configurado"}
    
    command = data.get("command")
    if not command:
        return {"success": False, "error": "Comando não especificado"}
    
    # Para o terminal manual, permite execução direta (usuário está interagindo)
    return state.terminal.execute_command(command, requires_approval=False)

# =============================================================================
# CODE AGENT CHAT MANAGEMENT
# =============================================================================

@app.get("/code-agent/chats")
async def get_ide_chats(user_id: Optional[str] = None):
    return {"success": True, "chats": ChatManager.list_chats(storage_dir=IDE_CHAT_DIR, user_id=user_id)}

@app.get("/code-agent/chats/{chat_id}")
async def get_ide_chat_details(chat_id: str, user_id: Optional[str] = None):
    data = ChatManager.load_chat(chat_id, user_id=user_id, storage_dir=IDE_CHAT_DIR)
    if data:
        return {"success": True, "chat": data}
    return {"success": False, "error": "Chat de IDE não encontrado"}

@app.post("/code-agent/chats")
async def save_ide_chat_endpoint(req: SaveChatRequest):
    data = ChatManager.save_chat(req.chat_id, req.messages, req.title, req.thread_id, user_id=req.user_id, storage_dir=IDE_CHAT_DIR)
    return {"success": True, "chat": data}

@app.delete("/code-agent/chats/{chat_id}")
async def delete_ide_chat_endpoint(chat_id: str, user_id: Optional[str] = None):
    success = ChatManager.delete_chat(chat_id, user_id=user_id, storage_dir=IDE_CHAT_DIR)
    return {"success": success}

@app.post("/code-agent/chats/load")
async def load_ide_chat_endpoint(data: dict):
    """Carrega um chat específico para o estado ativo do agente."""
    chat_id = data.get("chat_id")
    user_id = data.get("user_id")
    if not chat_id:
        return {"success": False, "error": "chat_id não especificado"}
        
    chat_data = ChatManager.load_chat(chat_id, user_id=user_id, storage_dir=IDE_CHAT_DIR)
    if not chat_data:
        return {"success": False, "error": "Chat não encontrado"}
        
    state = get_code_agent_state()
    state.load_session(chat_data)
    
    return {"success": True, "chat": chat_data}

@app.post("/code-agent/chats/new")
async def new_ide_chat_endpoint(data: dict = None):
    """Cria uma nova sessão limpa para o agente."""
    state = get_code_agent_state()
    state.messages = []
    state.active_chat_id = str(uuid.uuid4())
    
    # Set user_id if provided
    if data and data.get("user_id"):
        state.user_id = data.get("user_id")
    
    return {
        "success": True, 
        "chat_id": state.active_chat_id,
        "workspace": str(state.security.workspace) if state.security.workspace else None
    }

# =============================================================================
# PAYMENT ENDPOINTS (ASAAS)
# =============================================================================

from .payments import create_payment_link, process_webhook, sync_payment_status
from .firebase_config import verify_id_token

@app.get("/payments/sync")
async def sync_user_payment(token: str):
    """Verifica manualmente se o usuário tem pagamentos confirmados no Asaas."""
    if not token:
        raise HTTPException(status_code=400, detail="Token ausente")
        
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Não autorizado")
        
    uid = decoded["uid"]
    plan_found = await sync_payment_status(uid)
    
    if plan_found:
        # Atualizar Firestore
        from .firebase_config import update_user_profile
        update_user_profile(uid, {
            "plan": plan_found,
            "is_premium": True
        })
        return {"success": True, "plan": plan_found}
        
    return {"success": False, "message": "Nenhum pagamento confirmado encontrado"}

@app.post("/payments/create-checkout")
async def create_checkout(data: dict):
    """Gera um link de pagamento para upgrade de plano."""
    token = data.get("token")
    plan_type = data.get("plan_type")
    
    if not token or not plan_type:
        raise HTTPException(status_code=400, detail="Token ou Plano ausentes")
        
    # Verificar token
    decoded = verify_id_token(token)
    if not decoded:
        raise HTTPException(status_code=401, detail="Não autorizado")
        
    uid = decoded["uid"]
    email = decoded.get("email", "")
    name = decoded.get("name", email.split("@")[0])
    
    result = await create_payment_link(uid, plan_type, email, name)
    if "error" in result:
        return {"success": False, "error": result["error"]}
        
    return result

@app.post("/payments/webhook")
async def asaas_webhook(payload: dict):
    """Recebe notificações de pagamento do Asaas."""
    print(f"[ASAAS-WEBHOOK] Evento recebido: {payload.get('event')}")
    success = await process_webhook(payload)
    return {"success": success}

# =============================================================================
# WEBSOCKET HANDLERS
# =============================================================================

@app.websocket("/ws/link")
async def ws_link(websocket: WebSocket):
    """Luna Link: Secure tunnel for remote agent operations on local files."""
    await websocket.accept()
    uid = None
    
    try:
        # First message must be authentication
        auth_msg = await websocket.receive_json()
        if auth_msg.get("type") != "auth":
            await websocket.send_json({"error": "First message must be auth"})
            await websocket.close()
            return
        
        token = auth_msg.get("token")
        decoded = verify_id_token(token)
        if not decoded:
            await websocket.send_json({"error": "Invalid token"})
            await websocket.close()
            return
        
        uid = decoded["uid"]
        await link_manager.register_link(uid, websocket)
        await websocket.send_json({"type": "connected", "uid": uid})
        
        # Main loop: wait for responses from the client
        while True:
            data = await websocket.receive_json()
            await link_manager.handle_link_response(data)
            
    except WebSocketDisconnect:
        print(f"[LUNA-LINK] Disconnected: {uid}")
    except Exception as e:
        print(f"[LUNA-LINK] Error: {e}")
    finally:
        if uid:
            await link_manager.unregister_link(uid)

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
                    active_artifact_id=active_artifact_id,
                    user_id=req_data.get("user_id"),
                    user_name=req_data.get("user_name", "Usuário")
                )
                
                print(f"[WS] Starting stream for {len(messages)} messages")
                # Debug: verificar se última mensagem tem imagens
                if messages:
                    last = messages[-1]
                    print(f"[WS] Last message role={last.role}, has images={len(last.images) if last.images else 0}")
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


@app.websocket("/ws/code-agent")
async def ws_code_agent(websocket: WebSocket):
    """WebSocket handler para o Code Agent (modo IDE)."""
    await websocket.accept()
    print("[WS-CODE] Connection open")
    
    state = get_code_agent_state()
    
    try:
        while True:
            raw = await websocket.receive_text()
            msg = json.loads(raw)
            
            if msg.get("type") == "set-workspace":
                path = msg.get("path")
                if state.set_workspace(path):
                    await websocket.send_json({
                        "type": "workspace-set",
                        "success": True,
                        "workspace": str(state.security.workspace)
                    })
                else:
                    await websocket.send_json({
                        "type": "workspace-set",
                        "success": False,
                        "error": f"Não foi possível acessar: {path}"
                    })
            
            elif msg.get("type") == "new-chat":
                state.messages = []
                state.active_chat_id = str(uuid.uuid4())
                await websocket.send_json({
                    "type": "chat-started",
                    "chat_id": state.active_chat_id,
                    "success": True
                })
                print(f"[WS-CODE] Novo chat iniciado: {state.active_chat_id}")

            elif msg.get("type") == "resume-chat":
                chat_id = msg.get("chat_id")
                if chat_id:
                    chat_data = ChatManager.load_chat(chat_id)
                    if chat_data:
                        state.load_session(chat_data)
                        await websocket.send_json({
                            "type": "chat-resumed",
                            "success": True,
                            "chat_id": chat_id,
                            "messages": state.messages
                        })
                        print(f"[WS-CODE] Chat retomado: {chat_id}")
                    else:
                        # Se não encontrar, avisa o front para limpar
                        await websocket.send_json({
                            "type": "chat-resumed",
                            "success": False,
                            "error": "Chat not found"
                        })
            
            elif msg.get("type") == "message":
                user_message = msg.get("content", "")
                images = msg.get("images", [])
                
                # Update identity if provided
                if msg.get("user_id"):
                    state.user_id = msg.get("user_id")
                if msg.get("user_name"):
                    state.user_name = msg.get("user_name")
                
                print(f"[WS-CODE] Processing message: {user_message[:50]}... (Images: {len(images)})")
                
                async for chunk in code_agent_generator(state, user_message, images):
                    chunk = chunk.strip()
                    if chunk.startswith("data: "):
                        data_str = chunk[6:]
                        try:
                            data = json.loads(data_str)
                            await websocket.send_json(data)
                        except json.JSONDecodeError:
                            pass
                
                print("[WS-CODE] Stream complete")
                
                # LEARNING: Dispara a consolidação de aprendizado em background
                # "Continuous Learning" conforme pedido pelo usuário
                asyncio.create_task(consolidate_learning(state.messages))

                # PERSISTÊNCIA AUTOMÁTICA: Salva o chat após cada interação se houver um ID ativo
                if state.active_chat_id:
                    try:
                        ChatManager.save_chat(
                            chat_id=state.active_chat_id,
                            messages=state.messages,
                            storage_dir=IDE_CHAT_DIR,
                            title=state.messages[0]["content"][:40] if state.messages else "Chat IDE",
                        )
                        # Salva o workspace nos metadados do arquivo JSON para recarga automática
                        file_path = IDE_CHAT_DIR / f"{state.active_chat_id}.json"
                        if file_path.exists():
                            data = json.loads(file_path.read_text(encoding="utf-8"))
                            data["workspace"] = str(state.security.workspace) if state.security.workspace else None
                            file_path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")
                            
                        print(f"[WS-CODE] Chat {state.active_chat_id} persistido com sucesso.")
                    except Exception as e:
                        print(f"[WS-CODE] Erro ao persistir chat: {e}")
            
            elif msg.get("type") == "approve":
                approved = msg.get("approved", False)
                if state.pending_approval:
                    pending = state.pending_approval
                    state.pending_approval = None # Limpa o estado pendente
                    
                    if approved:
                        # Se for um comando de terminal, executa
                        if pending["name"] == "execute_command":
                            result = state.terminal.execute_command(
                                pending["args"]["command"],
                                requires_approval=False
                            )
                            await websocket.send_json({
                                "type": "approval-result",
                                "success": True,
                                "result": result
                            })
                        # Se for um plano de implementação, apenas confirma
                        elif pending["name"] == "manage_artifact" and pending.get("result", {}).get("type") == "implementation_plan":
                            # Injeta confirmação de aprovação no estado para o agente saber
                            state.messages.append({
                                "role": "system", 
                                "content": "[SISTEMA: Plano de implementação aprovado pelo usuário. Comece a execução seguindo os subitens do task.md imediatamente.]"
                            })
                            
                            # Avisa o frontend da aprovação
                            await websocket.send_json({
                                "type": "approval-result",
                                "success": True,
                                "message": "Plano aprovado! Luna iniciando execução..."
                            })
                            
                            # DISPARA A RETOMADA AUTOMÁTICA (Modelo Deep Agent)
                            print("[WS-CODE] Plano aprovado. Retomando loop agêntico automaticamente...")
                            async for chunk in code_agent_generator(state, "O plano foi aprovado. Por favor, inicie a execução."):
                                chunk = chunk.strip()
                                if chunk.startswith("data: "):
                                    data_str = chunk[6:]
                                    try:
                                        data = json.loads(data_str)
                                        await websocket.send_json(data)
                                    except:
                                        pass
                    else:
                        await websocket.send_json({
                            "type": "approval-result",
                            "success": True,
                            "cancelled": True
                        })
    
    except WebSocketDisconnect:
        print("[WS-CODE] Client disconnected")
    except Exception as e:
        err_msg = str(e).encode('ascii', 'replace').decode('ascii')
        print(f"[WS-CODE] Error: {err_msg}")
        try:
            await websocket.send_json({"error": str(e)})
        except:
            pass

# =============================================================================
# STATIC FILES (FRONTEND)
# =============================================================================

# Servir o frontend construído (Vite)
# O ideal é que a pasta 'dist' exista antes de rodar em produção
if os.path.exists("dist"):
    app.mount("/assets", StaticFiles(directory="dist/assets"), name="assets")
    
    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        # Se o caminho for um arquivo real em dist, serve ele
        file_path = os.path.join("dist", full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        # Caso contrário, serve o index.html (SPA routing)
        return FileResponse("dist/index.html")

# =============================================================================
# MAIN
# =============================================================================

if __name__ == "__main__":
    import uvicorn
    # Railway injeta PORT via variável de ambiente
    port = int(os.environ.get("PORT", 8001))
    host = "0.0.0.0"  # MUST be 0.0.0.0 for Railway
    print(f"[LUNA] Starting server on {host}:{port}")
    uvicorn.run(app, host=host, port=port)
