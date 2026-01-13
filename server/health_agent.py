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
    from .health.permissions import validate_data_access
    from .health.profiles import get_health_profile
except ImportError:
    get_health_summary = None
    load_meals = None
    get_goals = None
    validate_data_access = None
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
    
    Supports view_as_student_id for evaluators to view student data.
    """
    user_msg = request.messages[-1].content
    yield f"data: {json.dumps({'start': True, 'mode': 'health'})}\n\n"
    
    # Resolve target user_id (for view_as_student_id support)
    actual_user_id = request.user_id or "local"
    target_user_id = actual_user_id
    view_as_context = ""
    student_name = None  # Initialize for use in prompt construction
    students_list = []  # Initialize students list for evaluators
    
    # Check if user is evaluator (to show students list even when no student is selected)
    is_evaluator = False
    if get_health_profile:
        try:
            user_profile = get_health_profile(actual_user_id)
            if user_profile and user_profile.get("type") == "evaluator":
                is_evaluator = True
                # Get list of all students for this evaluator
                try:
                    from .profiles import get_evaluator_students
                    from ..firebase_config import get_user_profile, get_user_info
                    
                    student_ids = get_evaluator_students(actual_user_id)
                    for sid in student_ids:
                        student_info = {"id": sid, "name": "Aluno"}
                        try:
                            # Try Firestore first
                            profile = get_user_profile(sid)
                            if profile and profile.get("name"):
                                student_info["name"] = profile.get("name")
                            else:
                                # Fallback to Auth
                                info = get_user_info(sid)
                                if info:
                                    student_info["name"] = info.get("display_name") or info.get("name") or "Aluno"
                        except:
                            pass
                        students_list.append(student_info)
                except Exception as e:
                    safe_print(f"[DEBUG-HEALTH] Could not load students list: {e}")
        except:
            pass
    
    # If view_as_student_id is provided, validate permissions and use it
    if request.view_as_student_id:
        # CRITICAL: Always validate permissions, even if functions are not imported
        if not validate_data_access or not get_health_profile:
            yield f"data: {json.dumps({'error': 'Sistema de permissões não disponível. Acesso negado por segurança.'})}\n\n"
            return
        
        try:
            # CRITICAL SECURITY CHECK: Validate that user is an evaluator trying to view a student
            # This prevents students or non-evaluators from accessing other users' data
            allowed, error_msg = validate_data_access(actual_user_id, request.view_as_student_id, "view")
            if not allowed:
                safe_print(f"[SECURITY] Acesso negado: user_id={actual_user_id} tentou acessar dados de view_as_student_id={request.view_as_student_id}, erro: {error_msg}")
                yield f"data: {json.dumps({'error': f'Acesso negado: {error_msg}'})}\n\n"
                return
            
            # Additional check: Verify user is actually an evaluator
            user_profile = get_health_profile(actual_user_id)
            if not user_profile or user_profile.get("type") != "evaluator":
                safe_print(f"[SECURITY] Tentativa de acesso não autorizada: user_id={actual_user_id} não é avaliador")
                yield f"data: {json.dumps({'error': 'Acesso negado: apenas avaliadores podem visualizar dados de alunos'})}\n\n"
                return
            
            # Get student name from Firebase (Firestore first, then Auth)
            student_name = "aluno"
            try:
                from ..firebase_config import get_user_profile, get_user_info
                
                # Try Firestore first (where "name" field is stored)
                user_profile = get_user_profile(request.view_as_student_id)
                if user_profile and user_profile.get("name"):
                    student_name = user_profile.get("name")
                else:
                    # Fallback to Auth display_name
                    user_info = get_user_info(request.view_as_student_id)
                    if user_info:
                        student_name = user_info.get("display_name") or user_info.get("name") or "aluno"
            except Exception as e:
                safe_print(f"[DEBUG-HEALTH] Could not fetch student name: {e}")
                # Try to get from health profile as fallback
                student_profile = get_health_profile(request.view_as_student_id)
                if student_profile and student_profile.get("user_name"):
                    student_name = student_profile.get("user_name")
            
            # Use student's user_id for data loading
            target_user_id = request.view_as_student_id
            
            # Get list of all students for this evaluator (for name matching)
            students_list = []
            try:
                from .profiles import get_evaluator_students
                from ..firebase_config import get_user_profile, get_user_info
                
                student_ids = get_evaluator_students(actual_user_id)
                for sid in student_ids:
                    student_info = {"id": sid, "name": "Aluno"}
                    try:
                        # Try Firestore first
                        profile = get_user_profile(sid)
                        if profile and profile.get("name"):
                            student_info["name"] = profile.get("name")
                        else:
                            # Fallback to Auth
                            info = get_user_info(sid)
                            if info:
                                student_info["name"] = info.get("display_name") or info.get("name") or "Aluno"
                    except:
                        pass
                    students_list.append(student_info)
            except Exception as e:
                safe_print(f"[DEBUG-HEALTH] Could not load students list: {e}")
            
            # Build students list text for prompt
            students_list_text = ""
            if students_list:
                students_list_text = f"\n**ALUNOS VINCULADOS AO AVALIADOR:**\n"
                for s in students_list:
                    is_current = s['id'] == request.view_as_student_id
                    marker = " ← VOCÊ ESTÁ ANALISANDO ESTE ALUNO AGORA" if is_current else ""
                    students_list_text += f"- {s['name']} (ID: {s['id']}){marker}\n"
                students_list_text += f"\n**⚠️ ATENÇÃO:** Você está atualmente analisando {student_name} (ID: {request.view_as_student_id}).\n"
                students_list_text += f"Quando o avaliador mencionar '{student_name}', 'o aluno', 'ele', 'ela', ou qualquer referência ao aluno, você DEVE usar os dados de {student_name} (ID: {request.view_as_student_id}).\n"
                students_list_text += f"**TODAS as ferramentas DEVEM usar user_id={request.view_as_student_id} (dados de {student_name}).**\n"
            
            # Add comprehensive evaluator context to prompt
            view_as_context = f"""

## 👨‍⚕️ CONTEXTO DE AVALIADOR - LEIA COM ATENÇÃO!

**VOCÊ É UM AVALIADOR/NUTRICIONISTA analisando os dados do aluno {student_name} (ID: {request.view_as_student_id}).**

**⚠️ REGRA CRÍTICA - TODAS AS FERRAMENTAS DEVEM USAR OS DADOS DO ALUNO:**
- **SEMPRE** use user_id={request.view_as_student_id} em TODAS as ferramentas (add_meal, get_nutrition_summary, get_goals, list_meals, etc.)
- **NUNCA** use os dados do avaliador (user_id={actual_user_id})
- Quando o avaliador mencionar "{student_name}" ou "o aluno" ou "ele/ela", você DEVE buscar os dados do aluno {student_name} (ID: {request.view_as_student_id})
- Quando o avaliador perguntar sobre refeições, metas, progresso, calorias, etc., você DEVE retornar os dados do aluno, NÃO do avaliador

**REGRA CRÍTICA DE LINGUAGEM:**
- NUNCA use "você" se referindo ao avaliador. Use "o aluno", "{student_name}", "ele/ela" ou "seu paciente"
- Quando mencionar refeições, diga "O aluno registrou..." ou "{student_name} registrou..." NÃO diga "Você registrou..."
- Quando mencionar metas, diga "As metas do aluno são..." NÃO diga "Suas metas são..."
- Quando mencionar progresso, diga "O progresso do aluno..." NÃO diga "Seu progresso..."

**EXEMPLOS CORRETOS:**
- ✅ "O aluno ainda não registrou nenhuma refeição hoje"
- ✅ "{student_name} consumiu X calorias hoje"
- ✅ "As metas nutricionais do aluno são..."
- ✅ "Vamos analisar o progresso do aluno"
- ❌ "Você ainda não registrou nenhuma refeição" (ERRADO - você é o avaliador, não o aluno!)
- ❌ "Suas refeições de hoje são..." (ERRADO - você não comeu, o aluno comeu!)

{students_list_text}
**QUANDO O AVALIADOR MENCIONAR O NOME DO ALUNO:**
- Se o avaliador disser "{student_name}", "o aluno", "ele", "ela", ou qualquer referência ao aluno, você DEVE:
  1. Reconhecer que está se referindo ao aluno {student_name} (ID: {request.view_as_student_id})
  2. Usar TODAS as ferramentas com user_id={request.view_as_student_id}
  3. Retornar APENAS os dados do aluno, nunca os dados do avaliador
- **Se o avaliador mencionar o nome de OUTRO aluno** (diferente de {student_name}), você DEVE informar que está atualmente visualizando {student_name} e que precisa selecionar o aluno correto no dropdown primeiro

**SUA FUNÇÃO:**
- Analisar os dados nutricionais do aluno {student_name}
- Fornecer insights profissionais sobre o progresso do aluno
- Sugerir melhorias baseadas nos dados do aluno
- Registrar refeições ou atualizar metas PARA O ALUNO (não para você)
- **TODAS as ferramentas DEVEM usar user_id={request.view_as_student_id} (dados do aluno)**

**TOM:**
- Profissional mas carinhoso
- Foque em insights práticos e acionáveis
- Seja claro que está analisando dados de um paciente/aluno

"""
            safe_print(f"[DEBUG-HEALTH] View as mode: evaluator {actual_user_id} viewing student {target_user_id} ({student_name})")
        except Exception as e:
            safe_print(f"[DEBUG-HEALTH] Error validating view_as: {e}")
            yield f"data: {json.dumps({'error': f'Erro ao validar acesso: {str(e)}'})}\n\n"
            return
    
    # Build system prompt
    # If evaluator without student selected, use evaluator mode
    # If evaluator with student selected, use student mode (but with evaluator context)
    use_evaluator_mode = is_evaluator and not request.view_as_student_id
    
    base_prompt = get_system_prompt(
        user_id=target_user_id,
        user_name=request.user_name or "Usuário",
        health_mode=True,
        evaluator_mode=use_evaluator_mode
    )
    
    # If evaluator but no student selected, add list of students to context
    # Note: When evaluator_mode=True, the prompt already includes evaluator-specific instructions
    # We just need to add the list of students for reference
    if is_evaluator and not request.view_as_student_id and students_list:
        students_list_text = "\n**ALUNOS VINCULADOS AO AVALIADOR:**\n"
        for s in students_list:
            students_list_text += f"- {s['name']} (ID: {s['id']})\n"
        students_list_text += "\n**DICA:** Você pode usar as ferramentas `get_student_data`, `list_all_students`, `compare_students`, etc. para analisar os dados dos alunos.\n"
        students_list_text += "Quando o avaliador mencionar um nome de aluno, você pode usar `get_student_data` com o nome para buscar os dados automaticamente.\n"
        
        # Append students list to evaluator prompt
        prompt = base_prompt + "\n\n" + students_list_text
    # If in evaluator mode with student selected, prepend the evaluator context (so it has priority)
    elif view_as_context:
        # Add evaluator context FIRST (highest priority)
        # Add explicit instruction at the very top
        critical_instruction = f"""
🚨 INSTRUÇÃO CRÍTICA - LEIA PRIMEIRO! 🚨

Você está analisando os dados do aluno {student_name} (ID: {request.view_as_student_id}).
TODAS as ferramentas devem usar user_id={request.view_as_student_id}.
NUNCA use os dados do avaliador (user_id={actual_user_id}).

Quando o avaliador perguntar sobre refeições, metas, progresso, calorias, ou qualquer dado nutricional,
você DEVE retornar os dados do aluno {student_name}, NÃO os dados do avaliador.

{students_list_text if 'students_list_text' in locals() else ''}

"""
        prompt = critical_instruction + view_as_context + "\n\n" + base_prompt
        # Replace "você" with "o aluno" in key sections when in evaluator mode
        # This ensures the AI understands it's analyzing student data, not evaluator data
        prompt = prompt.replace("você registrou", "o aluno registrou")
        prompt = prompt.replace("Você registrou", "O aluno registrou")
        prompt = prompt.replace("você consumiu", "o aluno consumiu")
        prompt = prompt.replace("Você consumiu", "O aluno consumiu")
        prompt = prompt.replace("suas refeições", "as refeições do aluno")
        prompt = prompt.replace("Suas refeições", "As refeições do aluno")
        prompt = prompt.replace("suas metas", "as metas do aluno")
        prompt = prompt.replace("Suas metas", "As metas do aluno")
        prompt = prompt.replace("seu progresso", "o progresso do aluno")
        prompt = prompt.replace("Seu progresso", "O progresso do aluno")
    else:
        prompt = base_prompt
    
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
                    # Use target_user_id (view_as_student_id if provided, otherwise request.user_id)
                    try:
                        safe_print(f"[DEBUG-HEALTH] 🚀 Executing {name} with user_id={target_user_id}")
                        result = await execute_health_tool(name, args, user_id=target_user_id)
                        safe_print(f"[DEBUG-HEALTH] ✅ Result success: {result.get('success', False)}")
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
