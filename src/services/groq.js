/**
 * Serviço de integração com a API da Groq
 * Implementa Tool Use (Function Calling) com Agentic Loop
 * Suporta Múltiplas Personas (Modular)
 */
import { searchWeb } from './tavily';
import { readUrl } from './readUrl';
import { searchMemories, saveMemory } from './memory';
import { getPersona, DEFAULT_PERSONA_ID } from './personas';

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const MODEL = import.meta.env.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile';
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const BUSINESS_API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

/**
 * Envia mensagem para a Groq com suporte a Tool Use
 * @param {Array} messages - Array de mensagens do chat
 * @param {Object} options - Configurações (temperature, model, personaId, etc)
 * @param {Function} onStatusUpdate - Callback para atualizar UI (type, content)
 * @returns {Object} { role, content, sources?: Array }
 */
export const sendMessageToGroq = async (messages, options = {}, onStatusUpdate = () => { }) => {
    if (!API_KEY) {
        throw new Error('API Key da Groq não configurada.');
    }

    const {
        temperature = 0.6,
        top_p = 0.9,
        model = MODEL,
        personaId = DEFAULT_PERSONA_ID,
        userId = 'anonymous'
    } = options;

    // Carregar configurações da Persona ativa
    const currentPersona = getPersona(personaId);
    console.log(`[Groq] Usando Persona: ${currentPersona.name} (${currentPersona.id})`);

    // Ferramentas disponíveis para esta persona
    const tools = currentPersona.tools || [];
    const hasTools = tools.length > 0;

    // Loop agêntico para processar tool calls
    let currentMessages = [...messages];
    let turnCount = 0;
    const MAX_TURNS = 5;

    // Acumular fontes de todas as pesquisas realizadas
    let collectedSources = [];
    let lastSearchQuery = null; // Última query de pesquisa realizada

    while (turnCount < MAX_TURNS) {
        turnCount++;

        try {
            const requestBody = {
                model: model,
                messages: currentMessages,
                temperature: temperature,
                top_p: top_p,
                max_tokens: 2048
            };

            // Adicionar tools apenas se existirem
            if (hasTools) {
                requestBody.tools = tools;
                requestBody.tool_choice = "auto";
            }

            const response = await fetch(API_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('Groq API Error:', errorData);
                throw new Error(errorData.error?.message || `Erro na API: ${response.status}`);
            }

            const data = await response.json();
            const responseMessage = data.choices[0].message;

            // Se NÃO houver tool_calls, é a resposta final
            if (!responseMessage.tool_calls || responseMessage.tool_calls.length === 0) {
                onStatusUpdate(null, null); // Limpa status

                // Retorna a resposta com as fontes coletadas
                return {
                    ...responseMessage,
                    sources: collectedSources.length > 0 ? collectedSources : undefined,
                    searchQuery: lastSearchQuery
                };
            }

            // Processar chamadas de ferramenta
            console.log('[Tool Use] Detected tool calls:', responseMessage.tool_calls);

            // Adiciona a mensagem do assistant com tool_calls ao histórico
            currentMessages.push(responseMessage);

            // Executa cada ferramenta chamada
            for (const toolCall of responseMessage.tool_calls) {
                const functionName = toolCall.function.name;
                const args = JSON.parse(toolCall.function.arguments);

                console.log(`[Tool Use] Executing: ${functionName}(${JSON.stringify(args)})`);

                let toolResult = "";

                // Mapeamento de execução de tools

                if (functionName === 'web_search') {
                    onStatusUpdate('searching', args.query);
                    lastSearchQuery = args.query;

                    const searchResult = await searchWeb(args.query);
                    toolResult = searchResult.context;

                    if (searchResult.sources && searchResult.sources.length > 0) {
                        searchResult.sources.forEach(source => {
                            if (!collectedSources.find(s => s.url === source.url)) {
                                collectedSources.push(source);
                            }
                        });
                    }
                } else if (functionName === 'read_url') {
                    onStatusUpdate('reading', args.url);

                    const urlResult = await readUrl(args.url);
                    toolResult = urlResult.context;

                    if (urlResult.success) {
                        collectedSources.push({
                            title: urlResult.title || 'Página',
                            url: args.url,
                            content: urlResult.content?.slice(0, 200) || '',
                            favicon: `https://www.google.com/s2/favicons?domain=${new URL(args.url).hostname}&sz=32`
                        });
                    }
                } else if (functionName === 'remember') {
                    onStatusUpdate('remembering', args.query);

                    const memoryResult = await searchMemories(userId, args.query, 5);

                    if (memoryResult.results && memoryResult.results.length > 0) {
                        const relevant = memoryResult.results.filter(m => m.similarity > 0.3);
                        if (relevant.length > 0) {
                            toolResult = `[MEMÓRIAS ENCONTRADAS]\n`;
                            relevant.forEach((m, i) => {
                                toolResult += `${i + 1}. [${m.type.toUpperCase()}] ${m.content} (relevância: ${Math.round(m.similarity * 100)}%)\n`;
                            });
                        } else {
                            toolResult = "Não encontrei memórias relevantes sobre isso.";
                        }
                    } else {
                        toolResult = "Não tenho memórias sobre esse assunto ainda.";
                    }
                } else if (functionName === 'learn') {
                    onStatusUpdate('learning', args.content.slice(0, 50));

                    const saveResult = await saveMemory(userId, args.content, args.type || 'fact');

                    if (saveResult.success) {
                        toolResult = `✅ Memória salva! Vou me lembrar de: "${args.content}"`;
                    } else {
                        toolResult = `⚠️ Não consegui salvar essa memória. Erro: ${saveResult.error || 'desconhecido'}`;
                    }

                    // --- BUSINESS TOOLS ---
                } else if (functionName === 'add_transaction') {
                    onStatusUpdate('acting', 'Registrando transação...');
                    try {
                        const res = await fetch(`${BUSINESS_API_BASE}/api/business/transactions?uid=${userId}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                ...args,
                                value: Number(args.amount || args.value),
                                date: args.date || new Date().toISOString().split('T')[0]
                            })
                        });
                        if (res.ok) {
                            const data = await res.json();
                            toolResult = `✅ Transação registrada: ${data.description} - R$ ${data.value.toFixed(2)}`;
                        } else {
                            toolResult = "Erro ao registrar transação. Verifique os dados.";
                        }
                    } catch (e) {
                        toolResult = `❌ Erro de conexão: ${e.message}`;
                    }

                } else if (functionName === 'list_transactions') {
                    onStatusUpdate('acting', 'Buscando histórico...');
                    try {
                        const params = new URLSearchParams({ ...args, uid: userId });
                        const res = await fetch(`${BUSINESS_API_BASE}/api/business/transactions?${params}`);
                        const data = await res.json();
                        if (data && data.length > 0) {
                            const list = data.map(t => `- ${t.date} | ${t.description}: R$ ${t.value.toFixed(2)} (${t.type})`).join('\n');
                            toolResult = `[HISTÓRICO]\n${list}`;
                        } else {
                            toolResult = "Nenhuma transação encontrada.";
                        }
                    } catch (e) {
                        toolResult = `❌ Erro: ${e.message}`;
                    }

                } else if (functionName === 'get_balance') {
                    onStatusUpdate('acting', 'Consultando saldo...');
                    try {
                        const res = await fetch(`${BUSINESS_API_BASE}/api/business/summary?uid=${userId}`);
                        const data = await res.json();
                        toolResult = `[SALDO ATUAL] R$ ${data.balance.toFixed(2)}\n(Receitas: R$ ${data.income.toFixed(2)} | Despesas: R$ ${data.expenses.toFixed(2)})`;
                    } catch (e) {
                        toolResult = `❌ Erro: ${e.message}`;
                    }
                } else if (functionName === 'add_bill') {
                    onStatusUpdate('acting', 'Registrando conta a pagar...');
                    try {
                        const res = await fetch(`${BUSINESS_API_BASE}/api/business/bills?uid=${userId}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify(args)
                        });
                        const data = await res.json();
                        toolResult = `✅ Conta registrada: ${data.description} (Vencimento: ${data.due_date}) - R$ ${data.value.toFixed(2)}`;
                    } catch (e) {
                        toolResult = `❌ Erro: ${e.message}`;
                    }

                } else if (functionName === 'list_bills') {
                    onStatusUpdate('acting', 'Buscando contas...');
                    try {
                        const res = await fetch(`${BUSINESS_API_BASE}/api/business/bills?uid=${userId}`);
                        let data = await res.json();
                        if (args.status && args.status !== 'all') {
                            data = data.filter(b => b.status === args.status);
                        }
                        if (data && data.length > 0) {
                            const list = data.map(b => `- ID: ${b.id} | ${b.due_date} | ${b.description}: R$ ${b.value.toFixed(2)} (${b.status})`).join('\n');
                            toolResult = `[CONTAS A PAGAR]\n${list}`;
                        } else {
                            toolResult = "Nenhuma conta encontrada.";
                        }
                    } catch (e) {
                        toolResult = `❌ Erro: ${e.message}`;
                    }

                } else if (functionName === 'pay_bill') {
                    onStatusUpdate('acting', 'Processando pagamento...');
                    try {
                        const res = await fetch(`${BUSINESS_API_BASE}/api/business/bills/${args.bill_id}/pay?uid=${userId}`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({})
                        });
                        if (res.ok) {
                            toolResult = `✅ Conta marcada como paga e transação gerada com sucesso.`;
                        } else {
                            toolResult = "Erro ao processar pagamento. Verifique se a conta existe ou já foi paga.";
                        }
                    } catch (e) {
                        toolResult = `❌ Erro: ${e.message}`;
                    }

                } else if (functionName === 'get_bills_summary') {
                    onStatusUpdate('acting', 'Resumindo contas...');
                    try {
                        const res = await fetch(`${BUSINESS_API_BASE}/api/business/bills/summary?uid=${userId}`);
                        const data = await res.json();
                        toolResult = `[RESUMO DE CONTAS]\n- Pendentes: ${data.pending_count} (R$ ${data.total_pending_value.toFixed(2)})\n- Em Atraso: ${data.overdue_count} (R$ ${data.overdue_value.toFixed(2)})`;
                    } catch (e) {
                        toolResult = `❌ Erro: ${e.message}`;
                    }

                    // --- HEALTH TOOLS (Placeholder) ---
                } else if (['add_meal', 'update_goals'].some(t => functionName.includes(t))) {
                    toolResult = `[SIMULAÇÃO] A ferramenta '${functionName}' foi chamada. Módulo Health em breve.`;
                }
                else {
                    toolResult = `Ferramenta '${functionName}' não implementada ou simulada ainda.`;
                }

                // Adiciona o resultado da ferramenta ao histórico
                currentMessages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    name: functionName,
                    content: toolResult
                });
            }

            // Atualiza status para "pensando" enquanto processa resultados
            onStatusUpdate('thinking', null);

            // O loop continua para a próxima iteração

        } catch (error) {
            console.error('[Tool Use] Agent loop error:', error);
            onStatusUpdate('error', error.message);
            throw error;
        }
    }

    // Fallback se atingir limite de iterações
    console.warn('[Tool Use] Max turns reached');
    return {
        role: 'assistant',
        content: 'Desculpe, não consegui processar sua solicitação após várias tentativas. Por favor, reformule sua pergunta.'
    };
};

/**
 * Cria a mensagem de sistema dinâmica baseada na Persona ativa
 * @param {string} personaId - ID da persona
 * @returns {Object} Mensagem de sistema
 */
export const createSystemMessage = (personaId = DEFAULT_PERSONA_ID) => {
    const persona = getPersona(personaId);
    console.log(`[System Prompt] Gerando prompt para: ${persona.name}`);

    return {
        role: 'system',
        content: persona.getSystemPrompt()
    };
};
