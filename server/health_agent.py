"""
Luna Health Agent
------------------
Agent for Health Mode using Llama 4 Maverick with native tool calling.
Nutrition-focused assistant for meal tracking and health goals.
"""

import json
import re
from typing import AsyncGenerator, List, Dict, Any

from .config import get_system_prompt
from .api import call_api_json
from .chat import ChatRequest
from .health.tools import HEALTH_TOOLS_SCHEMA, execute_health_tool
from .agent import filter_tool_call_tokens

# Use Llama 4 Maverick for Health Mode (native tool calling)
HEALTH_MODEL = "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8"

# Health Mode imports
try:
    from .health.storage import get_summary as get_health_summary, load_meals, get_goals
    from .health.profiles import get_health_profile
except ImportError:
    get_health_summary = None
    load_meals = None
    get_goals = None
    get_health_profile = None


def safe_print(msg: str):
    """Prints a message to stdout in a unicode-safe way."""
    try:
        print(msg)
    except UnicodeEncodeError:
        print(msg.encode('ascii', 'replace').decode('ascii'))


async def health_generator(request: ChatRequest) -> AsyncGenerator[str, None]:
    """
    Agent for Health Mode using Llama 4 Maverick.
    Uses native tool calling - no parsing needed!
    """
    user_msg = request.messages[-1].content
    yield f"data: {json.dumps({'start': True, 'mode': 'health'})}\n\n"
    
    # Resolve target user_id
    target_user_id = request.user_id or "local"
    
    # Build system prompt
    prompt = get_system_prompt(
        user_id=target_user_id,
        user_name=request.user_name or "Usuário",
        health_mode=True
    )
    
    # Load health context (using target_user_id)
    recent_meals = []
    if get_health_summary and load_meals:
        try:
            summary = get_health_summary(target_user_id)
            recent_meals = load_meals(target_user_id, limit=10)
            goals = get_goals(target_user_id)
            
            health_context = f"""

## 🥗 ESTADO NUTRICIONAL ATUAL
- **Data:** {summary.get('date', 'Hoje')}
- **Refeições registradas hoje:** {summary.get('meals_count', 0)}
- **Calorias consumidas:** {summary.get('total_calories', 0):.0f} kcal
- **Proteínas:** {summary.get('total_protein', 0):.1f}g
- **Carboidratos:** {summary.get('total_carbs', 0):.1f}g
- **Gorduras:** {summary.get('total_fats', 0):.1f}g

### Metas Nutricionais:
"""
            if goals.get("daily_calories"):
                health_context += f"- **Meta de calorias:** {goals['daily_calories']:.0f} kcal/dia\n"
            if goals.get("daily_protein"):
                health_context += f"- **Meta de proteínas:** {goals['daily_protein']:.1f}g/dia\n"
            
            health_context += "\n### Últimas Refeições (IDs para edição):\n"
            for meal in recent_meals[:5]:
                meal_id = meal.get('id', 'unknown')
                meal_type = meal.get('meal_type', 'unknown')
                meal_name = meal.get('name', 'Sem nome')
                calories = meal.get('calories')
                emoji = {"breakfast": "🌅", "lunch": "🌞", "dinner": "🌙", "snack": "🍎"}.get(meal_type, "🍽️")
                cal_str = f" ({calories:.0f} kcal)" if calories else ""
                health_context += f"- ID:`{meal_id}` {emoji} {meal_name}{cal_str}\n"
            
            prompt += health_context
            safe_print(f"[DEBUG-HEALTH] Context: {summary.get('meals_count', 0)} meals, {summary.get('total_calories', 0):.0f} kcal")
        except Exception as e:
            safe_print(f"[DEBUG-HEALTH] Context error: {e}")
    
    # Build message history
    final_messages = []
    for m in request.messages[-10:]:
        content = m.content or ""
        final_messages.append({"role": m.role, "content": content})
    
    msgs = [{"role": "system", "content": prompt}] + final_messages
    
    # Get tools schema
    tools = HEALTH_TOOLS_SCHEMA
    
    full_response = ""
    max_iterations = 5
    
    try:
        for iteration in range(max_iterations):
            if iteration > 0:
                yield f"data: {json.dumps({'status': f'Processando (etapa {iteration+1})...', 'type': 'info'})}\n\n"
            
            # Always provide tools for the model to use
            # (Removed restriction that disabled tools after first call)
            current_tools = tools
            current_tool_choice = "auto"
            
            yield f"data: {json.dumps({'status': 'Pensando...', 'type': 'info'})}\n\n"
            
            # API CALL with native tool calling
            response = await call_api_json(
                msgs, 
                tools=current_tools,
                tool_choice=current_tool_choice,
                model=HEALTH_MODEL,
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
                filtered = filter_tool_call_tokens(content)
                filtered = re.sub(r'\{"name"\s*:\s*"[^"]*"[\s\S]*?(?=\n\n|\n[A-ZÁÉÍÓÚÇ]|$)', '', filtered)
                
                if filtered:
                    yield f"data: {json.dumps({'content': filtered})}\n\n"
            
            # Native Tool Calls from API
            tool_calls = message.get("tool_calls", [])
            
            safe_print(f"[DEBUG-HEALTH] Content: {len(content)} chars, Tool calls: {len(tool_calls)}")
            
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
                    
                    safe_print(f"[DEBUG-HEALTH] 🔧 Tool call: {name}")
                    safe_print(f"[DEBUG-HEALTH] 📋 Args: {args_str[:500] if args_str else 'empty'}")
                    yield f"data: {json.dumps({'tool_call': {'name': name, 'args': {}}})}\n\n"
                    
                    try:
                        args = json.loads(args_str)
                    except json.JSONDecodeError as je:
                        safe_print(f"[DEBUG-HEALTH] ⚠️ JSON decode error: {je}")
                        args = {}
                    
                    # Execute health tool (now async)
                    try:
                        safe_print(f"[DEBUG-HEALTH] 🚀 Executing {name} with user_id={target_user_id}")
                        if name == "create_meal_plan":
                            safe_print(f"[DEBUG-HEALTH] 📋 Creating meal plan with {len(args.get('presets', []))} presets")
                            safe_print(f"[DEBUG-HEALTH] 👤 User ({target_user_id}) creating plan")
                        result = await execute_health_tool(name, args, user_id=target_user_id)
                        safe_print(f"[DEBUG-HEALTH] ✅ Result success: {result.get('success', False)}")
                        if name == "create_meal_plan" and result.get('success'):
                            safe_print(f"[DEBUG-HEALTH] 🎉 Meal plan created: {result.get('count', 0)} presets saved")
                        if not result.get('success'):
                            safe_print(f"[DEBUG-HEALTH] ⚠️ Error: {result.get('error', 'unknown')}")
                    except Exception as e:
                        import traceback
                        safe_print(f"[DEBUG-HEALTH] ❌ Exception: {e}")
                        traceback.print_exc()
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
        safe_print(f"[DEBUG-HEALTH-ERROR] {str(e)}")
        yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    yield f"data: {json.dumps({'done': True})}\n\n"
