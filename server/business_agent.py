"""
Luna Business Agent
--------------------
Agent for Business Mode using Llama 4 Maverick with native tool calling.
No parsing needed - Together AI handles tool calls natively.
"""

import json
import re
from typing import AsyncGenerator, List, Dict, Any

from .config import get_system_prompt
from .api import call_api_json
from .chat import ChatRequest
from .business.tools import BUSINESS_TOOLS_SCHEMA, execute_business_tool
from .agent import filter_tool_call_tokens

# Use Llama 4 Maverick for Business Mode (native tool calling)
BUSINESS_MODEL = "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8"

# Business Mode imports
try:
    from .business.storage import get_summary as get_business_summary, load_transactions
except ImportError:
    get_business_summary = None
    load_transactions = None


def safe_print(msg: str):
    """Prints a message to stdout in a unicode-safe way."""
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))


async def business_generator(request: ChatRequest) -> AsyncGenerator[str, None]:
    """
    Agent for Business Mode using Llama 4 Maverick.
    Uses native tool calling - no parsing needed!
    """
    user_msg = request.messages[-1].content
    yield f"data: {json.dumps({'start': True, 'mode': 'business'})}\n\n"
    
    # Build system prompt
    prompt = get_system_prompt(
        user_id=request.user_id,
        user_name=request.user_name or "Usuário",
        business_mode=True
    )
    # Regras extras específicas para Business Mode (evitar alucinações)
    prompt += """

Regras CRÍTICAS para informações financeiras:
- Você NUNCA deve inventar ou chutar valores numéricos de saldo, receitas, despesas, investimentos, metas ou totais.
- Sempre que precisar de QUALQUER número financeiro atual (saldo, total de entradas/saídas, etc.), você DEVE usar as tools de negócio apropriadas:
  - Use a tool `get_balance` para obter saldo atual, total de entradas, saídas e quantidade de transações.
  - Use a tool `list_transactions` quando precisar listar ou conferir transações.
- Após chamar uma tool, use EXCLUSIVAMENTE os valores retornados por ela para responder. Não altere nem arredonde para números diferentes.
- Se uma tool falhar ou não estiver disponível, explique claramente o erro para o usuário e diga que não consegue acessar os dados no momento. NÃO invente números.
- Evite responder com JSON puro; prefira sempre respostas em texto natural em português, mencionando os valores retornados pelas tools.
"""
    
    # Load business context
    recent_tx = []
    if get_business_summary and load_transactions:
        try:
            user_id = request.user_id or "local"
            summary = get_business_summary(user_id)
            recent_tx = load_transactions(user_id)[:10]
            
            business_context = f"""

## 📊 ESTADO ATUAL DO NEGÓCIO
- **Saldo Atual:** R$ {summary.get('balance', 0):.2f}
- **Total Entradas:** R$ {summary.get('income', 0):.2f}
- **Total Saídas:** R$ {summary.get('expenses', 0):.2f}

### Últimas Transações (IDs para edição):
"""
            for tx in recent_tx:
                emoji = "⬆️" if tx.get('type') == 'income' else "⬇️"
                tx_id = tx.get('id', 'unknown')
                business_context += f"- ID:`{tx_id}` {emoji} R${tx.get('value', 0):.2f} | {tx.get('description', '')} | categoria: {tx.get('category', 'geral')}\n"
            
            prompt += business_context
            safe_print(f"[DEBUG-BUSINESS] Context: Balance R$ {summary.get('balance', 0):.2f}, {len(recent_tx)} transactions")
        except Exception as e:
            safe_print(f"[DEBUG-BUSINESS] Context error: {e}")
    
    # Build message history
    final_messages = []
    for m in request.messages[-10:]:
        content = m.content or ""
        final_messages.append({"role": m.role, "content": content})
    
    msgs = [{"role": "system", "content": prompt}] + final_messages
    
    # Get tools schema
    tools = BUSINESS_TOOLS_SCHEMA
    
    full_response = ""
    max_iterations = 5
    
    try:
        for iteration in range(max_iterations):
            if iteration > 0:
                yield f"data: {json.dumps({'status': f'Processando (etapa {iteration+1})...', 'type': 'info'})}\n\n"
            
            # Check if we have tool results already
            has_tool_result = any(m.get("role") == "tool" for m in msgs)
            
            # Tool choice strategy
            current_tools = tools if not has_tool_result else None
            current_tool_choice = "auto" if not has_tool_result else None
            
            yield f"data: {json.dumps({'status': 'Pensando...', 'type': 'info'})}\n\n"
            
            # API CALL with native tool calling
            response = await call_api_json(
                msgs, 
                tools=current_tools,
                tool_choice=current_tool_choice,
                model=BUSINESS_MODEL,
                max_tokens=4096
            )
            
            if "error" in response:
                err = response.get("error")
                yield f"data: {json.dumps({'content': f'Error: {err}'})}\n\n"
                return
            
            if not response.get("choices"):
                yield f"data: {json.dumps({'content': 'Resposta vazia.'})}\n\n"
                return
            
            message = response["choices"][0].get("message", {})
            
            # Content
            content = message.get("content") or ""
            if content:
                # Filtro rigoroso de tokens de tool calls que possam vazar
                # Together API não deveria retornar esses tokens, mas filtramos por segurança
                filtered = filter_tool_call_tokens(content)
                # Remove blocos JSON malformados que possam ser tentativas de tool calls no texto
                filtered = re.sub(r'\{"name"\s*:\s*"[^"]*"[\s\S]*?(?=\n\n|\n[A-ZÁÉÍÓÚÇ]|$)', '', filtered)
                
                if filtered:
                    yield f"data: {json.dumps({'content': filtered})}\n\n"
            
            # Native Tool Calls from API
            tool_calls = message.get("tool_calls", [])
            
            safe_print(f"[DEBUG-BUSINESS] Content: {len(content)} chars, Tool calls: {len(tool_calls)}")
            
            if tool_calls:
                # Add assistant message with tool calls to history
                msgs.append({
                    "role": "assistant",
                    "content": content or None,
                    "tool_calls": tool_calls
                })
                
                for tc in tool_calls:
                    tc_id = tc.get("id", "")
                    func = tc.get("function", {})
                    name = func.get("name", "")
                    args_str = func.get("arguments", "{}")
                    
                    safe_print(f"[DEBUG-BUSINESS] 🔧 Tool call: {name}")
                    yield f"data: {json.dumps({'tool_call': {'name': name, 'args': {}}})}\n\n"
                    
                    try:
                        args = json.loads(args_str)
                    except json.JSONDecodeError:
                        args = {}
                    
                    # Execute business tool
                    try:
                        result = execute_business_tool(name, args, user_id=request.user_id)
                        safe_print(f"[DEBUG-BUSINESS] ✅ Result: {result.get('success', False)}")
                    except Exception as e:
                        safe_print(f"[DEBUG-BUSINESS] ❌ Error: {e}")
                        result = {"success": False, "error": str(e)}
                    
                    yield f"data: {json.dumps({'tool_result': result})}\n\n"
                    
                    # Add tool result to history (standard format)
                    msgs.append({
                        "tool_call_id": tc_id,
                        "role": "tool",
                        "name": name,
                        "content": json.dumps(result, ensure_ascii=False)
                    })
                
                full_response += content
                continue  # Loop to get summary after tool execution
            else:
                full_response += content
                break
    
    except Exception as e:
        import traceback
        traceback.print_exc()
        safe_print(f"[DEBUG-BUSINESS-ERROR] {str(e)}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    yield f"data: {json.dumps({'done': True})}\n\n"
