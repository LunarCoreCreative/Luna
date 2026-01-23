/**
 * useBusinessChat - Hook para gerenciar o chat dedicado do módulo Business
 * Implementa Tool Use com ferramentas financeiras + pesquisa web integradas
 */
import { useState, useCallback, useEffect } from 'react';
import { searchWeb } from '../services/tavily';
import { readUrl } from '../services/readUrl';

const API_KEY = import.meta.env.VITE_GROQ_API_KEY;
const MODEL = import.meta.env.VITE_GROQ_MODEL || 'llama-3.3-70b-versatile';
const API_URL = 'https://api.groq.com/openai/v1/chat/completions';
const BUSINESS_API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';
const STORAGE_KEY = 'luna_business_chat_history';

// System Prompt específico para Luna Gestora
const BUSINESS_SYSTEM_PROMPT = `Você é Luna Gestora, uma assistente financeira amigável e direta.

🎯 SEU ESTILO:
- Converse de forma natural, como uma consultora financeira que fala com um amigo.
- Seja CONCISA. Respostas curtas e diretas são melhores que textos longos.
- Evite listas longas, bullet points excessivos e parágrafos enormes.
- Use no máximo 2-3 parágrafos por resposta, a menos que o usuário peça detalhes.
- Tabelas são úteis para mostrar dados financeiros, mas não abuse.

💬 COMO RESPONDER:
- Perguntas simples = respostas simples (1-2 frases).
- Relatórios = use tabelas compactas + breve análise.
- Conselhos = vá direto ao ponto principal, sem sermões.

⚠️ NÃO FAÇA:
- NÃO escreva "sermões" de educação financeira não solicitados.
- NÃO liste dezenas de dicas quando o usuário só perguntou algo simples.
- NÃO use formatação excessiva (muitos títulos, sublistas, etc).
- NÃO seja robótica ou formal demais.

🔧 FERRAMENTAS:
- add_transaction, list_transactions, get_balance: para transações
- add_bill, list_bills, get_bills_summary: para contas a pagar
- web_search, read_url: para pesquisar informações na web

📅 Data: ${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}`;


// Tool definitions
const BUSINESS_TOOLS = [
    {
        type: "function",
        function: {
            name: "add_transaction",
            description: "Registra uma nova transação financeira (receita ou despesa).",
            parameters: {
                type: "object",
                properties: {
                    type: { type: "string", enum: ["income", "expense"], description: "Tipo da transação" },
                    amount: { type: "number", description: "Valor monetário" },
                    description: { type: "string", description: "Descrição ou título da transação" },
                    category: { type: "string", description: "Categoria (ex: Alimentação, Transporte, Vendas)" },
                    date: { type: "string", description: "Data ISO (YYYY-MM-DD). Se não informado, usar hoje." }
                },
                required: ["type", "amount", "description"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "list_transactions",
            description: "Lista transações recentes com filtros opcionais.",
            parameters: {
                type: "object",
                properties: {
                    limit: { type: "number", description: "Número de itens" },
                    type: { type: "string", enum: ["income", "expense"] },
                    category: { type: "string" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_balance",
            description: "Obtém o saldo atual e resumo financeiro do mês.",
            parameters: { type: "object", properties: {} }
        }
    },
    {
        type: "function",
        function: {
            name: "add_bill",
            description: "Registra uma nova conta a pagar (vencimento futuro).",
            parameters: {
                type: "object",
                properties: {
                    description: { type: "string", description: "O que é a conta (ex: Aluguel)" },
                    value: { type: "number", description: "Valor da conta" },
                    due_date: { type: "string", description: "Data de vencimento (YYYY-MM-DD)" },
                    category: { type: "string", description: "Categoria da conta" }
                },
                required: ["description", "value", "due_date"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "list_bills",
            description: "Lista as contas a pagar, pendentes ou em atraso.",
            parameters: {
                type: "object",
                properties: {
                    status: { type: "string", enum: ["pending", "paid", "all"] }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_bills_summary",
            description: "Resumo de contas pendentes, valores e o que está em atraso.",
            parameters: { type: "object", properties: {} }
        }
    },
    {
        type: "function",
        function: {
            name: "web_search",
            description: "Pesquisa na web por cotações, notícias econômicas, informações de empresas ou qualquer outro assunto.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Termo de busca" }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "read_url",
            description: "Lê e extrai o conteúdo de uma URL específica.",
            parameters: {
                type: "object",
                properties: {
                    url: { type: "string", description: "URL completa da página a ser lida" },
                    loc: { type: "number", description: "Posição inicial opcional (para carregar partes da página)" }
                },
                required: ["url"]
            }
        }
    }
];

/**
 * Executa uma ferramenta de business
 * Retorna { result: string, sources?: Array, searchQuery?: string }
 */
async function executeTool(toolName, args, userId, setStatus) {
    const uid = userId || 'anonymous';

    try {
        switch (toolName) {
            case 'add_transaction': {
                setStatus?.('📝 Registrando transação...');
                const res = await fetch(`${BUSINESS_API_BASE}/api/business/transactions?uid=${uid}`, {
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
                    return { result: `✅ Transação registrada: ${data.description} - R$ ${data.value.toFixed(2)}` };
                }
                return { result: "Erro ao registrar transação. Verifique os dados." };
            }

            case 'list_transactions': {
                setStatus?.('📄 Buscando histórico...');
                const params = new URLSearchParams({ ...args, uid });
                const res = await fetch(`${BUSINESS_API_BASE}/api/business/transactions?${params}`);
                const data = await res.json();
                if (data && data.length > 0) {
                    const list = data.slice(0, 10).map(t =>
                        `- ${t.date} | ${t.description}: R$ ${t.value.toFixed(2)} (${t.type === 'income' ? '💰' : '💸'})`
                    ).join('\n');
                    return { result: `[HISTÓRICO]\n${list}` };
                }
                return { result: "Nenhuma transação encontrada." };
            }

            case 'get_balance': {
                setStatus?.('💰 Consultando saldo...');
                const res = await fetch(`${BUSINESS_API_BASE}/api/business/summary?uid=${uid}`);
                const data = await res.json();
                return { result: `💰 **Saldo Atual:** R$ ${data.balance.toFixed(2)}\n📈 Receitas: R$ ${data.income.toFixed(2)}\n📉 Despesas: R$ ${data.expenses.toFixed(2)}` };
            }

            case 'add_bill': {
                setStatus?.('📝 Registrando conta...');
                const res = await fetch(`${BUSINESS_API_BASE}/api/business/bills?uid=${uid}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(args)
                });
                if (res.ok) {
                    const data = await res.json();
                    return { result: `✅ Conta registrada: ${data.description} (Vencimento: ${data.due_date}) - R$ ${data.value.toFixed(2)}` };
                }
                return { result: "Erro ao registrar conta." };
            }

            case 'list_bills': {
                setStatus?.('📋 Buscando contas...');
                const res = await fetch(`${BUSINESS_API_BASE}/api/business/bills?uid=${uid}`);
                let data = await res.json();
                if (args.status && args.status !== 'all') {
                    data = data.filter(b => b.status === args.status);
                }
                if (data && data.length > 0) {
                    const list = data.map(b =>
                        `- ${b.due_date} | ${b.description}: R$ ${b.value.toFixed(2)} (${b.status === 'pending' ? '⏳' : '✅'})`
                    ).join('\n');
                    return { result: `[CONTAS A PAGAR]\n${list}` };
                }
                return { result: "Nenhuma conta encontrada." };
            }

            case 'get_bills_summary': {
                setStatus?.('📋 Calculando resumo...');
                const res = await fetch(`${BUSINESS_API_BASE}/api/business/bills/summary?uid=${uid}`);
                const data = await res.json();
                return { result: `📋 **Resumo de Contas**\n- Pendentes: ${data.pending_count} (R$ ${data.total_pending_value.toFixed(2)})\n- Em Atraso: ${data.overdue_count} (R$ ${data.overdue_value.toFixed(2)})` };
            }

            case 'web_search': {
                setStatus?.(`🔍 Pesquisando: "${args.query}"...`);
                const searchResult = await searchWeb(args.query);
                if (searchResult.context) {
                    return {
                        result: searchResult.context,
                        sources: searchResult.sources || [],
                        searchQuery: args.query
                    };
                }
                return { result: "Nenhum resultado encontrado para a pesquisa." };
            }

            case 'read_url': {
                setStatus?.(`📖 Lendo: ${new URL(args.url).hostname}...`);
                const urlResult = await readUrl(args.url);
                if (urlResult.success) {
                    return {
                        result: urlResult.content?.slice(0, 2000) || 'Conteúdo não disponível',
                        sources: [{
                            title: urlResult.title || 'Página',
                            url: args.url,
                            content: urlResult.content?.slice(0, 200) || '',
                            favicon: `https://www.google.com/s2/favicons?domain=${new URL(args.url).hostname}&sz=32`
                        }]
                    };
                }
                return { result: `Erro ao ler a URL: ${urlResult.error || 'desconhecido'}` };
            }

            default:
                return { result: `Ferramenta '${toolName}' não implementada.` };
        }
    } catch (error) {
        console.error(`[Business Tool] Error executing ${toolName}:`, error);
        return { result: `❌ Erro ao executar: ${error.message}` };
    }
}

/**
 * Hook principal do Business Chat
 */
export function useBusinessChat(userId) {
    const [messages, setMessages] = useState(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState(null);

    // Persist messages to localStorage
    useEffect(() => {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
        } catch (e) {
            console.warn('[Business Chat] Failed to save history:', e);
        }
    }, [messages]);

    const sendMessage = useCallback(async (content) => {
        if (!content.trim()) return;

        const userMessage = { role: 'user', content };
        setMessages(prev => [...prev, userMessage]);
        setIsLoading(true);
        setStatus('Pensando...');

        // Collect sources from all tool calls
        let collectedSources = [];
        let lastSearchQuery = null;

        try {
            const apiMessages = [
                { role: 'system', content: BUSINESS_SYSTEM_PROMPT },
                ...messages,
                userMessage
            ];

            let turnCount = 0;
            const MAX_TURNS = 5;
            let currentMessages = [...apiMessages];

            while (turnCount < MAX_TURNS) {
                turnCount++;

                const response = await fetch(API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${API_KEY}`
                    },
                    body: JSON.stringify({
                        model: MODEL,
                        messages: currentMessages,
                        tools: BUSINESS_TOOLS,
                        tool_choice: 'auto',
                        temperature: 0.6,
                        max_tokens: 2048
                    })
                });

                if (!response.ok) {
                    throw new Error(`API Error: ${response.status}`);
                }

                const data = await response.json();
                const assistantMessage = data.choices[0].message;

                // Se não há tool calls, é a resposta final
                if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
                    setMessages(prev => [...prev, {
                        role: 'assistant',
                        content: assistantMessage.content,
                        sources: collectedSources.length > 0 ? collectedSources : undefined,
                        searchQuery: lastSearchQuery
                    }]);
                    break;
                }

                // Processar tool calls
                currentMessages.push(assistantMessage);

                for (const toolCall of assistantMessage.tool_calls) {
                    const funcName = toolCall.function.name;
                    const args = JSON.parse(toolCall.function.arguments);

                    console.log(`[Business Chat] Tool: ${funcName}`, args);

                    const toolResult = await executeTool(funcName, args, userId, setStatus);

                    // Collect sources
                    if (toolResult.sources && toolResult.sources.length > 0) {
                        toolResult.sources.forEach(source => {
                            if (!collectedSources.find(s => s.url === source.url)) {
                                collectedSources.push(source);
                            }
                        });
                    }
                    if (toolResult.searchQuery) {
                        lastSearchQuery = toolResult.searchQuery;
                    }

                    currentMessages.push({
                        role: 'tool',
                        tool_call_id: toolCall.id,
                        name: funcName,
                        content: toolResult.result
                    });
                }

                setStatus('Processando...');
            }

        } catch (error) {
            console.error('[Business Chat] Error:', error);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `⚠️ Desculpe, ocorreu um erro: ${error.message}`
            }]);
        } finally {
            setIsLoading(false);
            setStatus(null);
        }
    }, [messages, userId]);

    const clearHistory = useCallback(() => {
        setMessages([]);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            console.warn('[Business Chat] Failed to clear history:', e);
        }
    }, []);

    return {
        messages,
        isLoading,
        status,
        sendMessage,
        clearHistory
    };
}

/**
 * Standalone function to send a message to Business Chat
 * Used by components that manage their own message state
 * @param {Array} messages - Current conversation messages
 * @param {string} userId - User ID for API calls
 * @param {Function} setStatus - Status update callback
 * @returns {Object} Assistant message with content, sources, searchQuery
 */
export async function sendBusinessMessage(messages, userId, setStatus = () => { }) {
    const collectedSources = [];
    let lastSearchQuery = null;

    // Sanitize messages - only keep role and content (API rejects extra fields)
    const sanitizedMessages = messages.map(msg => ({
        role: msg.role,
        content: msg.content
    }));

    const apiMessages = [
        { role: 'system', content: BUSINESS_SYSTEM_PROMPT },
        ...sanitizedMessages
    ];

    let turnCount = 0;
    const MAX_TURNS = 5;
    let currentMessages = [...apiMessages];

    while (turnCount < MAX_TURNS) {
        turnCount++;

        const response = await fetch(API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: MODEL,
                messages: currentMessages,
                tools: BUSINESS_TOOLS,
                tool_choice: 'auto',
                temperature: 0.6,
                max_tokens: 2048
            })
        });

        if (!response.ok) {
            throw new Error(`API Error: ${response.status}`);
        }

        const data = await response.json();
        const assistantMessage = data.choices[0].message;

        // Se não há tool calls, é a resposta final
        if (!assistantMessage.tool_calls || assistantMessage.tool_calls.length === 0) {
            return {
                role: 'assistant',
                content: assistantMessage.content,
                sources: collectedSources.length > 0 ? collectedSources : undefined,
                searchQuery: lastSearchQuery
            };
        }

        // Processar tool calls
        currentMessages.push(assistantMessage);

        for (const toolCall of assistantMessage.tool_calls) {
            const funcName = toolCall.function.name;
            const args = JSON.parse(toolCall.function.arguments);

            console.log(`[Business Chat] Tool: ${funcName}`, args);

            const toolResult = await executeTool(funcName, args, userId, setStatus);

            // Collect sources
            if (toolResult.sources && toolResult.sources.length > 0) {
                toolResult.sources.forEach(source => {
                    if (!collectedSources.find(s => s.url === source.url)) {
                        collectedSources.push(source);
                    }
                });
            }
            if (toolResult.searchQuery) {
                lastSearchQuery = toolResult.searchQuery;
            }

            currentMessages.push({
                role: 'tool',
                tool_call_id: toolCall.id,
                name: funcName,
                content: toolResult.result
            });
        }

        setStatus('Processando...');
    }

    // Fallback if max turns reached
    return {
        role: 'assistant',
        content: 'Desculpe, não consegui completar a operação. Tente novamente.',
        sources: collectedSources.length > 0 ? collectedSources : undefined,
        searchQuery: lastSearchQuery
    };
}
