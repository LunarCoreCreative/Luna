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

// Helper para limpar tags de pensamento vazadas e tokens internos + formatar texto
export const cleanContent = (content) => {
    if (!content) return "";

    // Normalização inicial
    let cleaned = content.replace(/\r\n/g, "\n"); // Garantir line endings consistentes

    // Remove blocos <think>...</think> (incluindo quebras de linha)
    cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, "");

    // Remove tokens de controle da Together/DeepSeek
    cleaned = cleaned.replace(/<\|.*?\|>/g, "");
    cleaned = cleaned.replace(/<\s*\|\s*tool_calls_begin\s*\|\s*>/g, "");
    cleaned = cleaned.replace(/<\s*\|\s*tool_calls_end\s*\|\s*>/g, "");
    cleaned = cleaned.replace(/<\s*\|\s*tool_call_begin\s*\|\s*>/g, "");
    cleaned = cleaned.replace(/<\s*\|\s*tool_call_end\s*\|\s*>/g, "");

    // === NORMALIZAÇÃO DE MARKDOWN ABSOLUTA ===

    // 1. Corrigir headers grudados no texto acima: "Texto###" -> "Texto\n\n###"
    cleaned = cleaned.replace(/([^\n])(#{1,4}\s+)/g, '$1\n\n$2');

    // 2. Corrigir headers grudados no texto abaixo: "### Header\nTexto" -> "### Header\n\nTexto"
    cleaned = cleaned.replace(/^(#{1,4}\s+[^\n]+)\n([^\n#\s-])/gm, '$1\n\n$2');

    // 3. Corrigir indentação acidental de headers: "  ###" -> "###"
    cleaned = cleaned.replace(/^[ \t]+(#{1,4}\s)/gm, '$1');

    // 4. Corrigir falta de espaço após hashes: "###Header" -> "### Header"
    cleaned = cleaned.replace(/^(#{1,4})([^#\s\n])/gm, '$1 $2');

    // 5. Corrigir falta de espaço APÓS o fechamento de itálico/negrito (apenas se houver texto grudado depois)
    // Mas NUNCA adicionar espaço após o asterisco de abertura.
    cleaned = cleaned.replace(/(\*[^* \n][^*]*\*)([a-zA-ZÁÉÍÓÚÇ0-9])/g, '$1 $2');
    cleaned = cleaned.replace(/(\*\*[^* \n][^*]*\*\*)([a-zA-ZÁÉÍÓÚÇ0-9])/g, '$1 $2');

    // === FORMATAÇÃO DE TEXTO (para legibilidade) ===

    // 1. Quebra antes de bullet points: "Texto- **" -> "Texto\n\n- **"
    cleaned = cleaned.replace(/([^\n\-])(\s*[\-\*]\s+\*\*)/g, '$1\n\n$2');

    // 2. Quebra após parênteses fechado seguido de letra maiúscula: ")Frase" -> ")\n\nFrase"
    cleaned = cleaned.replace(/\)([A-ZÁÉÍÓÚÇ])/g, ')\n\n$1');

    // 3. Quebra após pontuação forte e emojis
    const emojis = "✨💖🌙🎯📚🔧💡🎉⚡🌟❤️💕🌸☀️🌈🎨📝🚀💫🌺🔮✏️📖💻📱🎵🎶🌷📂🗂️🌍🌎🎭🌱";
    const emojiRegex = new RegExp(`\\.([\\s]*[${emojis}])`, 'g');
    cleaned = cleaned.replace(emojiRegex, '.\n\n$1');

    const dotsEmojiRegex = new RegExp(`\\.\\.\\.([\\s]*[${emojis}])`, 'g');
    cleaned = cleaned.replace(dotsEmojiRegex, '...\n\n$1');

    // 4. Limita quebras de linha consecutivas a máximo 2
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

    // 5. Garantir espaço após pontuação (.), (!), (?) se seguido por letra/número ou emoji
    // Mas evita números (ex: v1.0) e abreviações comuns (ex: Sr.)
    // Padrão: pontuação + letra maiúscula/número sem espaço -> pontuação + espaço + letra/número
    cleaned = cleaned.replace(/([.!?])([A-ZÁÉÍÓÚÇ0-9])/g, '$1 $2');

    // 6. Caso específico para diálogos: "fala.Saori" -> "fala. Saori"
    cleaned = cleaned.replace(/([a-zàéíóúç])\.([A-ZÁÉÍÓÚÇ])/g, '$1. $2');

    // 7. Garantir que símbolos de status (⚡, 🔍, 📖, ✅, ❌) tenham espaço ou quebra antes de texto
    cleaned = cleaned.replace(/([⚡🔍📖✅❌])([a-zA-ZÁÉÍÓÚÇ])/g, '$1 $2');

    return cleaned.trim();
};
