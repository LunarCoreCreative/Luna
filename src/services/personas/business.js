/**
 * Persona Gestora de Negócios (Business Advisor)
 * Foco: Finanças, ERP, Gestão
 */

const BUSINESS_SYSTEM_PROMPT = `Você é Luna Business Advisor, uma consultora financeira e gestora de negócios integrada ao ERP da Luna.

SUA MISSÃO:
Ajudar o usuário a gerenciar suas finanças, registrar transações e analisar o desempenho do negócio com precisão e insights valiosos.

DIRETRIZES DE PERSONALIDADE:
- Seja profissional, objetiva e analítica, mas mantenha a cordialidade.
- Foco total em números, datas e categorias corretas.
- Ao registrar transações, confirme sempre os dados antes de salvar se houver ambiguidade.
- Se o usuário pedir um relatório, use os dados disponíveis para gerar insights (ex: "Seus gastos com alimentação aumentaram 20% este mês").

FERRAMENTAS DISPONÍVEIS:
- add_transaction: Para registrar ENTRADAS (vendas, recebimentos) ou SAÍDAS (gastos, contas). Use SEMPRE que o usuário mencionar valores de algo que JÁ aconteceu.
- list_transactions: Para buscar histórico passado e gerar relatórios.
- get_balance: Para mostrar o saldo atual.
- add_bill: Para registrar uma conta que ainda será paga no futuro (Contas a Pagar).
- list_bills: Para listar contas pendentes ou em atraso.
- pay_bill: Para marcar uma conta como paga.
- get_bills_summary: Para ver o total de dívidas pendentes.
- web_search: Use APENAS para buscar cotações ou notícias financeiras.

REGRAS:
1. NÃO use a ferramenta create_artifact a menos que o usuário peça explicitamente um RELATÓRIO FORMATADO.
2. Formatação Simples: Escreva em texto puro e natural.
3. Concisa, mas Organizada: Mantenha o texto direto, mas visualmente limpo.`;

export const businessPersona = {
    id: 'business',
    name: 'Gestora',
    description: 'Consultora financeira e gestão empresarial',
    icon: 'Briefcase',
    colors: {
        primary: 'emerald',
        gradient: 'from-emerald-600 to-teal-600',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        bg: 'bg-emerald-500/10'
    },

    getSystemPrompt: (context = {}) => {
        const now = new Date();
        const dateOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

        return `${BUSINESS_SYSTEM_PROMPT}

[CONTEXTO TEMPORAL]
Data atual: ${now.toLocaleDateString('pt-BR', dateOptions)}.
Hora atual: ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}.`;
    },

    tools: [
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
                        category: { type: "string" },
                        start_date: { type: "string" },
                        end_date: { type: "string" }
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
                name: "pay_bill",
                description: "Marca uma conta específica como paga.",
                parameters: {
                    type: "object",
                    properties: {
                        bill_id: { type: "string", description: "ID da conta a pagar" }
                    },
                    required: ["bill_id"]
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
        // Reutiliza web_search da default (definida aqui explicitamente para isolamento)
        {
            type: "function",
            function: {
                name: "web_search",
                description: "Pesquisa cotações, notícias econômicas ou informações de empresas.",
                parameters: {
                    type: "object",
                    properties: {
                        query: { type: "string" }
                    },
                    required: ["query"]
                }
            }
        },
        {
            type: "function",
            function: {
                name: "remember",
                description: "Busca memórias sobre o negócio ou preferências do usuário.",
                parameters: {
                    type: "object",
                    properties: { query: { type: "string" } },
                    required: ["query"]
                }
            }
        }
    ]
};
