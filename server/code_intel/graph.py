"""
Code Agent Cognitive Graph
---------------------------
Implementa um grafo cognitivo usando LangGraph para orquestrar o Code Agent.
"""

import json
from typing import List, Dict, Any, TypedDict, Annotated, Sequence, Union
import operator
from .repo_map import RepoMapper

# Tentar importar langgraph
try:
    from langgraph.graph import StateGraph, END
    LANGGRAPH_AVAILABLE = True
except ImportError:
    LANGGRAPH_AVAILABLE = False


class AgentState(TypedDict):
    """Estado do agente no grafo."""
    messages: Annotated[Sequence[Dict[str, Any]], operator.add]
    plan: List[str]
    next_step: int
    current_workspace: str
    tool_history: List[Dict[str, Any]]
    tool_calls: List[Dict[str, Any]]
    errors: List[str]
    is_finished: bool
    repo_map: str  # Contexto resumido do projeto


class CodeAgentGraph:
    """Orquestrador de comportamento do agente via LangGraph."""
    
    def __init__(self, model_caller):
        """
        Args:
            model_caller: Função para chamar a API do LLM
        """
        self.model_caller = model_caller
        self.workflow = self._create_workflow()
    
    def _create_workflow(self):
        """Define a estrutura do grafo."""
        if not LANGGRAPH_AVAILABLE:
            return None
            
        workflow = StateGraph(AgentState)
        
        # Adiciona os nós
        workflow.add_node("planner", self.node_planner)
        workflow.add_node("executor", self.node_executor)
        workflow.add_node("debugger", self.node_debugger)
        workflow.add_node("responder", self.node_responder)
        
        # Define as conexões
        workflow.set_entry_point("planner")
        
        workflow.add_edge("planner", "executor")
        workflow.add_edge("executor", "debugger")
        
        # Condicional: continua executando se houver mais passos, senão responde
        workflow.add_conditional_edges(
            "debugger",
            self.should_continue,
            {
                "continue": "executor",
                "replan": "planner",
                "finish": "responder"
            }
        )
        
        workflow.add_edge("responder", END)
        
        return workflow.compile()

    # --- NÓS DO GRAFO ---

    async def node_planner(self, state: AgentState):
        """Analisa o contexto e cria/atualiza o plano de ação."""
        print("[Graph] Nó: Planner")
        
        # Constrói prompt para o planner
        last_message = state["messages"][-1]["content"] if state["messages"] else ""
        
        prompt = f"""Como planejador do Code Agent, sua tarefa é criar um plano passo a passo para: {last_message}
        
Contexto do Projeto:
{state.get('repo_map', 'Não disponível')}

Responda APENAS com um objeto JSON no formato:
{{
  "plan": ["passo 1", "passo 2", ...],
  "rationale": "breve explicação"
}}"""

        try:
            # Chama o modelo (via model_caller passado no init)
            response = await self.model_caller(
                messages=[{"role": "system", "content": prompt}],
                response_format={"type": "json_object"}
            )
            data = json.loads(response)
            return {
                "plan": data.get("plan", []),
                "next_step": 0
            }
        except Exception as e:
            return {"errors": [f"Erro no planejamento: {str(e)}"]}

    async def node_executor(self, state: AgentState):
        """Decide quais ferramentas chamar para o passo atual do plano."""
        next_step_idx = state["next_step"]
        if next_step_idx >= len(state["plan"]):
            return {"is_finished": True}
            
        current_step = state["plan"][next_step_idx]
        print(f"[Graph] Nó: Executor (Passo: {current_step})")
        
        # Constrói prompt para o executor
        msgs = [
            {"role": "system", "content": f"Você é o Executor. Seu objetivo agora é realizar este passo do plano: {current_step}"},
        ] + list(state["messages"][-5:])
        
        try:
            # Aqui chamamos o modelo pedindo tool_calls
            # O model_caller deve suportar passagem de tools
            response = await self.model_caller(
                messages=msgs,
                use_tools=True # Indica que queremos tool_calls
            )
            
            if isinstance(response, list): # Assume que retorna lista de tool_calls
                return {
                    "tool_calls": response,
                    "next_step": next_step_idx + 1
                }
            return {"next_step": next_step_idx + 1}
        except Exception as e:
            return {"errors": [f"Erro na execução: {str(e)}"]}

    async def node_debugger(self, state: AgentState):
        """Verifica resultados e decide o próximo caminho."""
        print("[Graph] Nó: Debugger")
        # Se houve erro na última execução, adicionamos ao log
        last_tool_results = [r for r in state.get("tool_history", []) if r.get("success") is False]
        
        if last_tool_results:
            return {"errors": [f"Erro na ferramenta: {r.get('error')}" for r in last_tool_results]}
            
        return {}

    async def node_responder(self, state: AgentState):
        """Gera a resposta final para o usuário."""
        print("[Graph] Nó: Responder")
        prompt = "Gere uma resposta amigável resumindo o que você fez."
        response = await self.model_caller(messages=[{"role": "user", "content": prompt}])
        return {"is_finished": True, "messages": [{"role": "assistant", "content": response}]}

    def should_continue(self, state: AgentState):
        """Direciona o fluxo do grafo."""
        if state["is_finished"] or state["next_step"] >= len(state["plan"]):
            return "finish"
        
        if state.get("errors"):
            return "replan"
            
        return "continue"
