/**
 * Serviço de integração com a API Tavily para pesquisa na web
 * Usa o backend Python como proxy para segurança
 * Retorna dados estruturados com fontes para exibição na UI
 */

const API_URL = 'http://localhost:3001/api/search';

/**
 * Pesquisa na web e retorna resultado estruturado
 * @param {string} query - Termo de pesquisa
 * @returns {Object} { context: string, sources: Array<{title, url, content}> }
 */
export const searchWeb = async (query) => {
    try {
        console.log('[Tavily] Searching:', query);

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ detail: response.statusText }));
            throw new Error(error.detail || `Search API Error: ${response.status}`);
        }

        const data = await response.json();

        // Preparar fontes estruturadas para UI
        const sources = (data.results || []).map(result => ({
            title: result.title || 'Sem título',
            url: result.url || '',
            content: result.content || '',
            favicon: result.url ? `https://www.google.com/s2/favicons?domain=${new URL(result.url).hostname}&sz=32` : null
        }));

        // Formatar contexto para a LLM
        let context = "";

        if (data.answer) {
            context += `**Resumo da pesquisa:** ${data.answer}\n\n`;
        }

        if (sources.length > 0) {
            context += "**Fontes encontradas:**\n";
            sources.forEach((source, index) => {
                context += `${index + 1}. [${source.title}](${source.url})\n   ${source.content.slice(0, 200)}...\n\n`;
            });
        }

        if (!context) {
            return {
                context: `Nenhum resultado encontrado para: "${query}"`,
                sources: []
            };
        }

        return {
            context,
            sources,
            query
        };

    } catch (error) {
        console.error('[Tavily] Search Error:', error);
        return {
            context: `Erro ao realizar pesquisa: ${error.message}. Por favor, tente novamente.`,
            sources: [],
            error: true
        };
    }
};
