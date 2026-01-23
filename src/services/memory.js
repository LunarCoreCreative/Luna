/**
 * Serviço de Memória para Luna
 * Conecta com o backend para salvar e buscar memórias semânticas
 */

const BACKEND_URL = 'http://localhost:3001';

/**
 * Salva uma memória para o usuário
 * @param {string} userId - ID do usuário
 * @param {string} content - Conteúdo da memória
 * @param {string} memoryType - Tipo: conversation, preference, fact, instruction
 * @returns {Object} { success, memory_id }
 */
export const saveMemory = async (userId, content, memoryType = 'conversation') => {
    if (!userId) {
        console.warn('[Memory] ⚠️ userId não fornecido');
        return { success: false, error: 'User ID não fornecido' };
    }
    
    console.log(`[Memory] Saving: "${content.slice(0, 50)}..." (${memoryType}) para userId: ${userId.slice(0, 8)}...`);

    try {
        const response = await fetch(`${BACKEND_URL}/api/memory/save`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                user_id: userId,
                content: content,
                memory_type: memoryType
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Memory] ❌ HTTP ${response.status}:`, errorText);
            throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log('[Memory] ✅ Saved:', data.memory_id?.slice(0, 8));
        return data;

    } catch (error) {
        console.error('[Memory] ❌ Save error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Busca memórias semanticamente relevantes
 * @param {string} userId - ID do usuário
 * @param {string} query - Texto de busca
 * @param {number} nResults - Número máximo de resultados
 * @returns {Object} { results, count }
 */
export const searchMemories = async (userId, query, nResults = 5) => {
    console.log(`[Memory] Searching: "${query.slice(0, 50)}..."`);

    try {
        const response = await fetch(`${BACKEND_URL}/api/memory/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                query: query,
                n_results: nResults
            })
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log(`[Memory] Found ${data.count} memories`);
        return data;

    } catch (error) {
        console.error('[Memory] ❌ Search error:', error);
        return { results: [], count: 0, error: error.message };
    }
};

/**
 * Busca memórias e formata como contexto para o LLM
 * @param {string} userId - ID do usuário
 * @param {string} query - Query atual do usuário
 * @returns {string} Contexto formatado para injetar no prompt
 */
export const getMemoryContext = async (userId, query) => {
    const result = await searchMemories(userId, query, 5);

    if (!result.results || result.results.length === 0) {
        return '';
    }

    // Filtrar apenas memórias com alta relevância
    const relevant = result.results.filter(m => m.similarity > 0.35);

    if (relevant.length === 0) {
        return '';
    }

    let context = '[MEMÓRIAS SOBRE O USUÁRIO]\n';
    relevant.forEach((mem, i) => {
        context += `${i + 1}. [${mem.type.toUpperCase()}] ${mem.content}\n`;
    });

    return context;
};

/**
 * Lista todas as memórias de um usuário
 * @param {string} userId - ID do usuário
 * @param {number} limit - Limite de resultados
 * @returns {Object} { memories, total }
 */
export const listMemories = async (userId, limit = 50) => {
    if (!userId) {
        console.warn('[Memory] ⚠️ userId não fornecido');
        return { memories: [], total: 0, error: 'User ID não fornecido' };
    }
    
    console.log(`[Memory] Listing memories for userId: ${userId.slice(0, 8)}... (limit: ${limit})`);
    
    try {
        const url = `${BACKEND_URL}/api/memory/list/${userId}?limit=${limit}`;
        console.log(`[Memory] Fetching: ${url}`);
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error(`[Memory] ❌ HTTP ${response.status}:`, errorText);
            throw new Error(`Erro HTTP: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        console.log(`[Memory] ✅ Listed ${data.memories?.length || 0} memories`);
        return data;

    } catch (error) {
        console.error('[Memory] ❌ List error:', error);
        return { memories: [], total: 0, error: error.message };
    }
};

/**
 * Atualiza uma memória existente
 * @param {string} userId - ID do usuário
 * @param {string} memoryId - ID da memória
 * @param {string} content - Novo conteúdo (opcional)
 * @param {string} memoryType - Novo tipo (opcional)
 * @param {Object} metadata - Novos metadados (opcional)
 * @returns {Object} { success }
 */
export const updateMemory = async (userId, memoryId, content = null, memoryType = null, metadata = null) => {
    console.log(`[Memory] Updating: ${memoryId.slice(0, 8)}...`);

    try {
        const response = await fetch(`${BACKEND_URL}/api/memory/update`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                memory_id: memoryId,
                content: content,
                memory_type: memoryType,
                metadata: metadata
            })
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        const data = await response.json();
        console.log('[Memory] ✅ Updated:', memoryId.slice(0, 8));
        return data;

    } catch (error) {
        console.error('[Memory] ❌ Update error:', error);
        return { success: false, error: error.message };
    }
};

/**
 * Deleta uma memória específica
 * @param {string} userId - ID do usuário
 * @param {string} memoryId - ID da memória
 * @returns {Object} { success }
 */
export const deleteMemory = async (userId, memoryId) => {
    try {
        const response = await fetch(`${BACKEND_URL}/api/memory/delete`, {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                memory_id: memoryId
            })
        });

        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }

        return await response.json();

    } catch (error) {
        console.error('[Memory] ❌ Delete error:', error);
        return { success: false, error: error.message };
    }
};
