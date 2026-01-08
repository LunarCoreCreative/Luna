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

// Helper para limpar conteúdo (DESATIVADO - Passthrough)
export const cleanContent = (content) => {
    if (!content) return "";
    return content;
};
