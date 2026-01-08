/**
 * Message Utilities - Adaptado do Desktop
 * Funções auxiliares para mensagens
 */

export const parseThought = (text: string | undefined): string => {
    if (!text) return "";
    try {
        if (typeof text === 'string' && text.trim().startsWith('{')) {
            const parsed = JSON.parse(text);
            if (parsed.detailed_thought) return parsed.detailed_thought;
        }
    } catch (e) {
        // Parse failed, return original
    }
    return text;
};

export const getGreeting = (): string => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Bom dia";
    if (hour >= 12 && hour < 18) return "Boa tarde";
    return "Boa noite";
};

export const cleanContent = (content: string | undefined): string => {
    if (!content) return "";

    let cleaned = content.replace(/\r\n/g, "\n");

    // Remove <think>...</think> blocks
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, "");

    // Remove control tokens
    cleaned = cleaned.replace(/<\|.*?\|>/g, "");
    cleaned = cleaned.replace(/<\s*\|\s*tool_calls_begin\s*\|\s*>/g, "");
    cleaned = cleaned.replace(/<\s*\|\s*tool_calls_end\s*\|\s*>/g, "");
    cleaned = cleaned.replace(/<\s*\|\s*tool_call_begin\s*\|\s*>/g, "");
    cleaned = cleaned.replace(/<\s*\|\s*tool_call_end\s*\|\s*>/g, "");

    // === MARKDOWN NORMALIZATION ===

    // Fix headers stuck to text above
    cleaned = cleaned.replace(/([^\n])(#{1,4}\s+)/g, '$1\n\n$2');

    // Fix headers stuck to text below
    cleaned = cleaned.replace(/^(#{1,4}\s+[^\n]+)\n([^\n#\s-])/gm, '$1\n\n$2');

    // Fix accidental header indentation
    cleaned = cleaned.replace(/^[ \t]+(#{1,4}\s)/gm, '$1');

    // Fix missing space after hashes
    cleaned = cleaned.replace(/^(#{1,4})([^#\s\n])/gm, '$1 $2');

    // Add space after bold/italic closing
    cleaned = cleaned.replace(/(\*[^* \n][^*]*\*)([a-zA-ZÁÉÍÓÚÇ0-9])/g, '$1 $2');
    cleaned = cleaned.replace(/(\*\*[^* \n][^*]*\*\*)([a-zA-ZÁÉÍÓÚÇ0-9])/g, '$1 $2');

    // === TEXT FORMATTING ===

    // Break before bullet points
    cleaned = cleaned.replace(/([^\n\-])(\s*[\-\*]\s+\*\*)/g, '$1\n\n$2');

    // Break after closing parenthesis followed by capital
    cleaned = cleaned.replace(/\)([A-ZÁÉÍÓÚÇ])/g, ')\n\n$1');

    // Limit consecutive line breaks to max 2
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // Ensure space after punctuation
    cleaned = cleaned.replace(/([.!?])([A-ZÁÉÍÓÚÇ0-9])/g, '$1 $2');

    // Fix dialog cases
    cleaned = cleaned.replace(/([a-zàéíóúç])\.([A-ZÁÉÍÓÚÇ])/g, '$1. $2');

    return cleaned.trim();
};

export const getTimestamp = (): string => {
    return new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
};
