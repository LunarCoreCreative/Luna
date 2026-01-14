/**
 * Message Utilities
 * ==================
 * Funções auxiliares para processamento de mensagens
 */

/**
 * Limpa tokens de tool calls e outros artefatos de LLM do conteúdo.
 * Função centralizada para garantir limpeza consistente em todo o código.
 * 
 * @param {string} content - Conteúdo a ser limpo
 * @returns {string} - Conteúdo limpo
 */
export const cleanContent = (content) => {
    if (!content || typeof content !== 'string') return "";

    let cleaned = content;

    // ============================================================================
    // FASE 1: Tokens de tool calls explícitos (formato: < | token | >)
    // ============================================================================
    
    // Tokens padrão: tool_calls_begin, tool_calls_end, tool_call_begin, tool_call_end, tool_sep
    // Aceita espaços e quebras de linha flexíveis
    cleaned = cleaned.replace(/<\s*\|\s*tool_calls?_(begin|end)\s*\|\s*>/gi, "");
    cleaned = cleaned.replace(/<\s*\|\s*tool_call_(begin|end)\s*\|\s*>/gi, "");
    cleaned = cleaned.replace(/<\s*\|\s*tool_sep\s*\|\s*>/gi, "");

    // ============================================================================
    // FASE 2: Tokens quebrados por newlines (ex: < | tool_call_begin |\n >)
    // ============================================================================
    
    // Captura qualquer sequência que comece com < | tool e termine com | >
    cleaned = cleaned.replace(/<\s*\|\s*tool_[\s\S]*?\|\s*>/gi, "");

    // ============================================================================
    // FASE 3: Tokens malformados ou incompletos
    // ============================================================================
    
    // Fallback para pipes residuais
    cleaned = cleaned.replace(/<\|[\s\S]*?\|>/g, '');
    
    // Tokens sem pipes
    cleaned = cleaned.replace(/<tool_calls?_(begin|end)>/gi, "");
    cleaned = cleaned.replace(/<tool_call_(begin|end)>/gi, "");
    cleaned = cleaned.replace(/<tool_sep>/gi, "");
    
    // Tokens com apenas um pipe
    cleaned = cleaned.replace(/<\|\s*tool_[\s\S]*?>/gi, "");
    cleaned = cleaned.replace(/tool_[\s\S]*?\|\s*>/gi, "");

    // Remove tool calls in format: tool_name{...}
    const knownTools = "edit_artifact|create_artifact|get_artifact|web_search|run_command|add_knowledge|think|add_transaction|edit_transaction|update_transaction|delete_transaction|add_tag|get_balance|list_transactions|get_transactions|add_client|get_recurring_items|get_expenses_by_category|get_expenses|get_summary|search_clients";
    cleaned = cleaned.replace(new RegExp(`\\b(${knownTools})\\s*\\{[^{}]*(?:\\{[^{}]*\\}[^{}]*)*\\}`, "g"), "");
    
    // Also capture generic pattern: word followed by {} (empty tool call)
    cleaned = cleaned.replace(/\b[a-zA-Z_][a-zA-Z0-9_]*\s*\{\s*\}/g, "");

    // Remove malformed LLM responses that leak role names and function calls
    cleaned = cleaned.replace(/^(assistant|user|system|tool)\s*$/gim, "");
    
    // Remove function call patterns like "tool_name()" or "tool_name(args)"
    const healthTools = "list_all_students|get_student_data|compare_students|get_student_summary|generate_student_report|get_weight_history|add_weight|delete_weight|get_insights|add_meal|edit_meal|delete_meal|get_meals|add_goal|get_goals|delete_goal|suggest_goals|add_preset|get_presets|delete_preset|search_foods|calculate_nutrition";
    const allTools = `${knownTools}|${healthTools}`;
    cleaned = cleaned.replace(new RegExp(`^\\s*(${allTools})\\s*\\([^)]*\\)\\s*$`, "gim"), "");
    
    // Clean up multiple consecutive newlines
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
    
    return cleaned.trim();
};
