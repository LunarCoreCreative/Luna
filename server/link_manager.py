"""
Luna Link Manager
-----------------
Manages WebSocket tunnels between the cloud server and local Electron clients.
This enables the agent to execute local file operations on the user's machine.
"""

import asyncio
import json
from typing import Dict, Optional
from fastapi import WebSocket

# Store active link connections: {uid: websocket}
active_links: Dict[str, WebSocket] = {}

# Pending requests waiting for response: {request_id: asyncio.Future}
pending_requests: Dict[str, asyncio.Future] = {}

async def register_link(uid: str, websocket: WebSocket):
    """Register a new Luna Link connection for a user."""
    active_links[uid] = websocket
    print(f"[LUNA-LINK] Client connected: {uid}")

async def unregister_link(uid: str):
    """Remove a disconnected Luna Link."""
    if uid in active_links:
        del active_links[uid]
        print(f"[LUNA-LINK] Client disconnected: {uid}")

def has_active_link(uid: str) -> bool:
    """Check if a user has an active Luna Link connection."""
    return uid in active_links

async def send_link_command(uid: str, command: dict, timeout: float = 30.0) -> Optional[dict]:
    """
    Send a command to the user's Electron client via Luna Link.
    
    Commands can be:
    - FS_READ: Read a file from the local filesystem
    - FS_WRITE: Write content to a local file
    - FS_LIST: List directory contents
    - TERM_EXEC: Execute a terminal command
    
    Returns the result from the client, or None if timeout/error.
    """
    if uid not in active_links:
        return {"success": False, "error": "No active Luna Link connection."}
    
    ws = active_links[uid]
    request_id = f"{uid}_{asyncio.get_event_loop().time()}"
    command["request_id"] = request_id
    
    # Create a future to wait for the response
    future = asyncio.get_event_loop().create_future()
    pending_requests[request_id] = future
    
    try:
        await ws.send_json(command)
        result = await asyncio.wait_for(future, timeout=timeout)
        return result
    except asyncio.TimeoutError:
        return {"success": False, "error": "Luna Link request timed out."}
    except Exception as e:
        return {"success": False, "error": str(e)}
    finally:
        pending_requests.pop(request_id, None)

async def handle_link_response(data: dict):
    """Process a response from an Electron client."""
    request_id = data.get("request_id")
    if request_id and request_id in pending_requests:
        pending_requests[request_id].set_result(data)

# ============================================================================
# High-level API for Agent Tools
# ============================================================================

async def link_read_file(uid: str, path: str) -> dict:
    """Read a file from the user's local machine via Luna Link."""
    return await send_link_command(uid, {
        "type": "FS_READ",
        "path": path
    })

async def link_write_file(uid: str, path: str, content: str) -> dict:
    """Write content to a file on the user's local machine via Luna Link."""
    return await send_link_command(uid, {
        "type": "FS_WRITE",
        "path": path,
        "content": content
    })

async def link_list_dir(uid: str, path: str) -> dict:
    """List directory contents on the user's local machine via Luna Link."""
    return await send_link_command(uid, {
        "type": "FS_LIST",
        "path": path
    })

async def link_exec_command(uid: str, command: str, cwd: str = None) -> dict:
    """Execute a terminal command on the user's local machine via Luna Link."""
    return await send_link_command(uid, {
        "type": "TERM_EXEC",
        "command": command,
        "cwd": cwd
    }, timeout=60.0)  # Commands may take longer
