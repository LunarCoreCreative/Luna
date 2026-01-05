"""
Luna API Client
---------------
Functions for calling the Together AI API.
"""

import json
import httpx
from typing import List, Optional, AsyncGenerator, Dict, Any

from .config import API_URL, API_KEY, MODEL, VISION_MODEL, DEFAULT_TIMEOUT, VISION_TIMEOUT

# =============================================================================
# API CALLS
# =============================================================================

async def call_api_json(
    messages: list,
    tools: list = None,
    tool_choice: str = "auto",
    max_tokens: int = 4000,
    model: str = MODEL,
    temperature: float = 0.6
) -> Dict[str, Any]:
    """Make a non-streaming API call."""
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "stream": False
    }
    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = tool_choice
    
    timeout = VISION_TIMEOUT if "vision" in model.lower() or "vl" in model.lower() else DEFAULT_TIMEOUT
    
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            if not API_KEY:
                return {"error": "API KEY ausente."}
            
            response = await client.post(
                API_URL,
                headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
                json=payload
            )
            
            if response.status_code != 200:
                return {"error": f"API Error {response.status_code}: {response.text}"}
            
            return response.json()
        except Exception as e:
            return {"error": str(e)}

async def call_api_stream(
    messages: list,
    tools: list = None,
    tool_choice: str = "auto",
    max_tokens: int = 8192,
    model: str = MODEL,
    temperature: float = 0.6
) -> AsyncGenerator[Dict[str, Any], None]:
    """Make a streaming API call, yielding chunks."""
    payload = {
        "model": model,
        "messages": messages,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "stream": True
    }
    if tools:
        payload["tools"] = tools
        payload["tool_choice"] = tool_choice
    
    timeout = VISION_TIMEOUT if "vision" in model.lower() or "vl" in model.lower() else DEFAULT_TIMEOUT
    print(f"[DEBUG] Chamando API (Stream): model={model}")
    
    async with httpx.AsyncClient(timeout=timeout) as client:
        try:
            if not API_KEY:
                yield {"error": "API KEY ausente."}
                return
            
            async with client.stream(
                "POST",
                API_URL,
                headers={"Authorization": f"Bearer {API_KEY}", "Content-Type": "application/json"},
                json=payload
            ) as response:
                if response.status_code != 200:
                    err_body = await response.aread()
                    yield {"error": f"API Error {response.status_code}: {err_body.decode()}"}
                    return
                
                async for line in response.aiter_lines():
                    if not line or not line.startswith("data: "):
                        continue
                    data_str = line[6:].strip()
                    if data_str == "[DONE]":
                        break
                    try:
                        yield json.loads(data_str)
                    except json.JSONDecodeError:
                        continue
        except Exception as e:
            yield {"error": str(e)}

async def get_vision_description(image_base64: str, user_msg: str = "") -> str:
    """Analyze an image using vision model."""
    clean_image = image_base64.split(",")[-1] if "," in image_base64 else image_base64
    prompt = "Analise esta imagem. "
    if user_msg:
        prompt += f"Contexto: '{user_msg}'."
    
    messages = [
        {"role": "user", "content": [
            {"type": "text", "text": prompt},
            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{clean_image}"}}
        ]}
    ]
    
    try:
        response = await call_api_json(messages, model=VISION_MODEL)
        if "error" in response:
            return f"[Erro visão: {response['error']}]"
        return response["choices"][0]["message"]["content"]
    except Exception as e:
        return f"[Falha imagem: {str(e)}]"
