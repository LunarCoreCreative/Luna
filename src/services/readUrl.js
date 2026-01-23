/**
 * Serviço para leitura de conteúdo de URLs específicas
 * Usa o backend Python como proxy para evitar CORS
 */

const BACKEND_URL = 'http://localhost:3001';

/**
 * Lê e extrai o conteúdo de uma URL específica
 * @param {string} url - URL para ler
 * @returns {Object} { title, content, url, success }
 */
export const readUrl = async (url) => {
    console.log('[ReadURL] Reading:', url);

    try {
        const response = await fetch(`${BACKEND_URL}/api/read-url`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ url })
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.detail || `Erro HTTP: ${response.status}`);
        }

        const data = await response.json();

        // Formatar contexto para o LLM
        let context = `**Conteúdo da página: ${data.title || url}**\n\n`;
        context += `URL: ${url}\n\n`;
        context += `---\n\n`;
        context += data.content || 'Não foi possível extrair o conteúdo.';

        return {
            context,
            title: data.title || 'Página',
            url: data.url,
            content: data.content,
            success: true
        };

    } catch (error) {
        console.error('[ReadURL] Error:', error);
        return {
            context: `Erro ao ler a URL "${url}": ${error.message}`,
            title: null,
            url: url,
            content: null,
            success: false,
            error: error.message
        };
    }
};
