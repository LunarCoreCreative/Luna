/**
 * Message Utilities - Funções auxiliares para mensagens
 */

export const parseThought = (text) => {
    if (!text) return "";
    try {
        // Se parecer JSON (começa com {), tenta parsear
        if (typeof text === 'string' && text.trim().startsWith('{')) {
            const parsed = JSON.parse(text);
            if (parsed.detailed_thought) return parsed.detailed_thought;
        }
    } catch (e) {
        // Se falhar o parse, retorna o original (pode estar incompleto durante stream)
    }
    return text;
};


export const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
};

// Helper para limpar conteúdo (Filtro de tokens interno)
export const cleanContent = (content) => {
    if (!content) return "";

    // Robust Regex for Tool Call Tokens (handles spaces AND NEWLINES)
    // Using [\s\S]*? approach or just explicit \s including newlines
    let cleaned = content.replace(/<\s*\|\s*tool_calls?_(begin|end)\s*\|\s*>/gi, "");
    cleaned = cleaned.replace(/<\s*\|\s*tool_sep\s*\|\s*>/gi, "");
    cleaned = cleaned.replace(/<\s*\|\s*tool_call_(begin|end)\s*\|\s*>/gi, "");

    // Catch tokens interrupted by newlines (e.g. < | tool_call_begin |\n >)
    // \s matches newlines in JS regex. 
    // The previous regex used \s*, which matches newlines.
    // BUT the debug script in Python showed failure on split.
    // In Python \s also matches newline.
    // Wait, debug_regex.py output: 
    // "tool_call_\nend | >" was NOT matched by pattern "...tool_calls?_(begin|end)..."
    // Because the newline was INSIDE "tool_call_\nend".
    // "tool_call_begin" -> "tool_call_\nbegin" ?
    // No, the debug script text was "< | tool_call_begin | \n >".
    // The previous regex `\s*` SHOULD match `\n`.
    // Ah! Javascript regex `.` does NOT match newline. But `\s` does.

    // Let's broaden the matching to ensure NO broken tokens survive.
    // We match any sequence starting with < | tool and ending with >
    cleaned = cleaned.replace(/<\s*\|\s*tool_[\s\S]*?\|\s*>/gi, "");

    // Fallback for residual pipes
    cleaned = cleaned.replace(/<\|.*?\|>/g, '');

    // Remove tool calls in format: tool_name{...} (simple regex for basic cases)
    // This is a simple regex that works for most cases; complex cases are handled by filterToolCallLeaks
    const knownTools = "edit_artifact|create_artifact|get_artifact|web_search|run_command|add_knowledge|think|add_transaction|edit_transaction|update_transaction|delete_transaction|add_tag|get_balance|list_transactions|get_transactions|add_client|get_recurring_items|get_expenses_by_category|get_expenses|get_summary|search_clients";
    cleaned = cleaned.replace(new RegExp(`\\b(${knownTools})\\s*\\{[^{}]*(?:\\{[^{}]*\\}[^{}]*)*\\}`, "g"), "");
    
    // Also capture generic pattern: word followed by {} (empty tool call)
    cleaned = cleaned.replace(/\b[a-zA-Z_][a-zA-Z0-9_]*\s*\{\s*\}/g, "");

    return cleaned;
};
