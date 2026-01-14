# Changelog

Todas as mudanças notáveis neste projeto serão documentadas neste arquivo.

## [1.1.7] - 2025-01-29

### 🐛 Correções de Bugs

- **Business Mode - Saldo Incorreto ao Filtrar por Período**:
  - Corrigido problema onde o saldo mostrado no resumo estava sendo filtrado por período
  - Saldo e Net Worth agora sempre mostram o total acumulado (todas as transações)
  - Income/Expenses/Invested continuam sendo filtrados por período quando selecionado
  - Saldo agora está consistente entre o resumo e as metas financeiras

- **Business Mode - Precisão de Cálculos e Inconsistências de Saldo**:
  - Substituído cálculo com `float` por `Decimal` para evitar erros de arredondamento
  - Corrigido cálculo de integridade para incluir investimentos na fórmula de saldo
  - Implementada remoção automática de transações duplicadas ao carregar dados
  - Adicionados logs detalhados mostrando quantas transações de cada tipo foram processadas
  - Validação melhorada para ignorar transações com valores negativos ou tipos inválidos
  - Cálculos agora são consistentes entre backend, Luna Advisor e verificação de integridade
  - Resolvido problema de duplicatas entre Firebase e armazenamento local causando saldos incorretos

### 🔧 Melhorias

- **Precisão de Cálculos**:
  - Uso de `Decimal` para todos os cálculos financeiros (evita erros de ponto flutuante)
  - Arredondamento consistente com 2 casas decimais em todos os valores
  - Validação robusta de tipos e valores de transações

- **Sincronização de Dados**:
  - Merge inteligente entre Firebase e armazenamento local
  - Remoção automática de duplicatas baseada em ID de transação
  - Logs informativos quando duplicatas são encontradas e removidas

---

## [1.1.6] - 2025-01-29

### 🐛 Correções de Bugs

- **Boot Sequence**:
  - Corrigido problema de boot sequence executando múltiplas vezes causando travamentos e lentidão
  - Adicionada ref para garantir execução única do boot
  - Removida dependência do useEffect que causava reexecuções desnecessárias
  - App agora carrega corretamente sem travar na inicialização

- **Firebase Quota Exceeded (Erro 429)**:
  - Implementado tratamento robusto para erros de quota excedida do Firebase
  - Adicionado sistema de retry com backoff exponencial (2s, 4s, 8s)
  - Reduzidos limites de transações de 2000 para 500 para evitar sobrecarga
  - Adicionados delays entre batches de requisições (100ms)
  - Implementada função helper para detecção de erros de quota
  - App agora lida graciosamente com limites do Firebase sem travar

### 🔧 Melhorias

- **Performance**:
  - Otimização de requisições ao Firestore para reduzir carga
  - Batches menores (300 em vez de 500) para evitar quota exceeded
  - Contagem de documentos agora opcional para economizar quota
  - Melhor gerenciamento de timeouts e abort controllers

- **Estabilidade**:
  - Melhor tratamento de erros em todas as operações do Firebase
  - Mensagens de erro mais claras e informativas
  - Fallback automático quando quota é excedida

---

## [1.1.5] - 2025-01-28

### 🔧 Melhorias

- **Responsividade**:
  - Correções de layout para melhor adaptação em telas menores que FullHD
  - Ajustes em componentes do Business Mode para melhor visualização em diferentes resoluções
  - Melhorias na organização de elementos em telas menores
  - Otimização de espaçamentos e tamanhos de fonte para diferentes tamanhos de tela

---

## [1.1.4] - 2025-01-28

### ✨ Novas Funcionalidades

#### 💳 Sistema de Cartões de Crédito

- **Nova Aba de Cartões de Crédito**:
  - Gerenciamento completo de cartões de crédito
  - Cadastro de cartões com: nome, limite, dia de vencimento, últimos 4 dígitos, bandeira e cor personalizada
  - Cálculo automático de métricas:
    - Fatura atual (baseada em transações do período)
    - Limite disponível
    - Limite utilizado
    - Dias até vencimento
    - Status (OK, Warning, Overdue)
  - Visualização de cartões em cards coloridos
  - Resumo geral com totais de todos os cartões
  - Sistema de pagamento de faturas com criação automática de transação

- **Integração com Transações**:
  - Campo para vincular transações de despesa a cartões de crédito
  - Seleção de cartão ao criar/editar despesas
  - Seleção de cartão em itens fixos/recorrentes
  - Exibição visual na coluna "Extra" da tabela de transações
  - Transações geradas a partir de itens fixos herdam o cartão selecionado

#### 💰 Melhorias em Investimentos

- **Campos de Juros e Tipo de Investimento**:
  - Campo para definir taxa de juros anual (%) em investimentos
  - Seleção entre "Investimento (com juros)" e "Caixinha/Poupança"
  - Exibição do tipo e taxa de juros na coluna "Extra" da tabela
  - Suporte completo no backend para armazenar e processar esses dados

#### 🔍 Melhorias em Filtros Avançados

- **Correções e Melhorias**:
  - Corrigido problema de filtros "quebrando" a UI
  - Painel de filtros avançados reorganizado para melhor layout
  - Validações de segurança para evitar erros com arrays vazios
  - Filtros funcionando corretamente com múltiplas categorias, faixa de valores e regex

### 🔧 Melhorias

- **UI/UX**:
  - Nova coluna "Extra" na tabela de transações para informações adicionais
  - Melhor organização visual dos campos condicionais (cartão de crédito, juros)
  - Mensagens informativas quando não há cartões cadastrados
  - Exibição do nome do cartão e últimos 4 dígitos nas transações vinculadas

- **Backend**:
  - Novos campos opcionais em transações: `credit_card_id`, `interest_rate`, `investment_type`
  - Suporte completo para cartões de crédito em itens recorrentes
  - Validação e processamento de novos campos em todas as operações CRUD

### 🐛 Correções de Bugs

- Corrigido erro de sintaxe JSX (elementos adjacentes) que impedia compilação
- Corrigido problema de filtros avançados causando erros na UI
- Corrigido carregamento de cartões de crédito (chave correta da API)
- Corrigido exibição de informações de cartão nas transações
- Melhorada validação de arrays e objetos em hooks do React

---

## [1.1.0] - 2025-01-28

### ✨ Novas Funcionalidades

#### 🏥 Luna Health - Sistema Completo de Perfis e Avaliação

- **Sistema de Perfis de Saúde**:
  - Usuários podem escolher entre perfil "Aluno" ou "Avaliador"
  - Gerenciamento de perfis integrado ao AuthContext
  - Suporte a Firebase Firestore com fallback local

- **Códigos de Vinculação para Avaliadores**:
  - Geração automática de códigos únicos (formato: `EVAL-XXXXXX`)
  - Dashboard integrado para gerenciar código e alunos vinculados
  - Compartilhamento fácil com botão de copiar
  - Geração de novo código quando necessário

- **Vinculação de Alunos**:
  - Interface dedicada para alunos vincularem-se a avaliadores
  - Validação de código em tempo real
  - Exibição de informações do avaliador (nome, email)
  - Prevenção de auto-vinculação

- **Sistema de Permissões e Acesso**:
  - Validação robusta de permissões no backend
  - Avaliadores podem visualizar dados de alunos vinculados
  - Prevenção de acesso não autorizado entre usuários
  - Sistema de "view_as" para contexto de visualização

- **Chat Contextual para Avaliadores**:
  - Sistema de prompts diferenciado para avaliadores
  - Contexto automático quando visualizando dados de aluno
  - Linguagem adaptada (referências ao aluno, não ao avaliador)
  - Reconhecimento de nomes de alunos no chat

- **Chat Especializado para Avaliadores (EvaluatorChat)**:
  - Chat dedicado quando avaliador não está visualizando aluno específico
  - Ferramentas especializadas para análise profissional:
    - `get_student_data`: Busca dados completos de aluno por nome/ID
    - `list_all_students`: Lista todos os alunos com resumo
    - `compare_students`: Compara dados entre múltiplos alunos
    - `get_student_summary`: Resumo detalhado de período específico
    - `generate_student_report`: Relatório profissional formatado
  - UI diferenciada com tema roxo/índigo
  - Banner indicando modo de análise profissional

- **Busca de Alunos**:
  - Campo de busca por nome no header (substitui dropdown)
  - Busca em tempo real com filtro local
  - Exibe nome e email dos alunos
  - Seleção rápida para visualizar dados

- **Sistema de Notificações**:
  - Notificações automáticas quando aluno se vincula
  - Painel de notificações dedicado (nova aba)
  - Marcar notificações como lidas (individual ou todas)
  - Formatação de data relativa ("2h atrás", "3 dias atrás")
  - Contador de não lidas

- **Estatísticas Agregadas para Avaliadores**:
  - Dashboard com métricas consolidadas de todos os alunos
  - Média de calorias, proteínas e aderência às metas
  - Total de alunos e alunos ativos
  - Identificação de alunos sem atividade (últimos 30 dias)
  - Período configurável para análise

- **Dashboard do Avaliador Melhorado**:
  - Cards de estatísticas com métricas principais
  - Alertas visuais para alunos sem atividade
  - Integração completa com sistema de busca
  - Performance otimizada (carregamento sob demanda)

#### 🎨 Sistema de Temas Refatorado

- **Remoção de Temas Antigos**:
  - Removidos todos os temas com problemas de contraste
  - Limpeza completa do sistema de temas
  - Remoção de temas premium e light antigos

- **3 Novos Temas Dark** (com contraste WCAG AA+):
  - **Dark Deep**: Tema escuro clássico com acentos azuis (#0a0a0f)
  - **Dark Ocean**: Tema escuro azul oceano com acentos ciano (#0c1220)
  - **Dark Forest**: Tema escuro verde floresta com acentos verdes (#0d1412)

- **3 Novos Temas Light** (com contraste WCAG AA+):
  - **Light Clean**: Tema claro puro com acentos azuis (#ffffff)
  - **Light Sky**: Tema claro azul céu suave (#f0f9ff)
  - **Light Mint**: Tema claro verde menta fresco (#f0fdfa)

- **Melhorias de Contraste**:
  - Todos os temas testados e aprovados para contraste WCAG AA+
  - Textos primários e secundários com contraste adequado
  - Bordas e elementos visuais com melhor definição
  - Backgrounds otimizados para legibilidade

#### 💼 Business Mode - Correções Críticas

- **Sincronização Firebase**:
  - Corrigido problema de transações não aparecendo após salvamento
  - Sincronização automática entre Firebase e cache local
  - Carregamento em batches para grandes volumes de dados
  - Limite aumentado para suportar mais transações (até 2000)

- **Validação e Salvamento**:
  - Validação robusta de valores numéricos
  - Conversão explícita para float em todos os pontos
  - Salvamento local primeiro (garantia de persistência)
  - Logs detalhados para diagnóstico

- **Cálculos Corretos**:
  - Cálculo unificado do summary usando dados sincronizados
  - Consideração correta de investimentos
  - Arredondamento para 2 casas decimais
  - Logs detalhados do processo de cálculo

### 🔧 Melhorias

- **Performance**:
  - Otimização do carregamento da aba de alunos (90% mais rápido)
  - Carregamento sob demanda de detalhes de alunos
  - Debounce em requisições de estatísticas
  - Requisições paralelas onde possível

- **UX/UI**:
  - Design minimalista e compacto
  - Consistência visual em todos os componentes
  - Animações suaves e feedback visual claro
  - Remoção de modais de sucesso desnecessários

- **Integração**:
  - HealthMode integrado com sistema de perfis
  - Tabs contextuais (aparecem apenas quando relevante)
  - Navegação fluida entre modos de visualização

### 🐛 Correções de Bugs

- Corrigido problema de dropdown coberto por blur effect
- Corrigido erro ao tentar vincular ao próprio código
- Corrigido contexto de AI (referências corretas ao aluno vs avaliador)
- Corrigido carregamento de dados quando visualizando como aluno
- Corrigido reconhecimento de nomes de alunos no chat
- Corrigido imports e dependências circulares
- Corrigido problema de transações não aparecendo no Business Mode
- Corrigido valores numéricos não sendo salvos corretamente
- Corrigido cálculos do summary que não correspondiam à UI
- Corrigido problema de usuários não conseguindo registrar transações

---

## [1.0.4] - 2025-01-27

### ✨ Novas Funcionalidades

#### 💼 Business Mode
- **Sistema de Períodos Mensais**: Histórico completo organizado por mês/ano
  - Seletor de período no header para navegar entre meses
  - Visualização de transações filtradas por período
  - Resumo financeiro específico para cada período
  - Fechamento de mês com salvamento automático do resumo
  - Histórico completo preservado - não há mais necessidade de resetar manualmente

- **Melhorias no Sistema de Tags**:
  - Criação automática de tags quando uma categoria é usada em transações
  - Sincronização automática: todas as tags usadas aparecem na aba de tags
  - Sistema de cores distintas: cada tag recebe uma cor única automaticamente
  - Paleta expandida com 20 cores distintas para melhor visualização

### 🔧 Melhorias

- **Business Mode**: Organização mais eficiente com histórico por período
- **Tags**: Interface mais consistente com todas as categorias visíveis
- **Navegação**: Fácil acesso a qualquer mês através do seletor de período

---

## [1.0.3] - 2025-01-27

### ✨ Novas Funcionalidades

#### 💼 Business Mode
- **Nova aba de Contas em Atraso**: Sistema completo de gerenciamento de contas a pagar
  - Visualização de contas pendentes e vencidas
  - Filtros por status (todas, pendentes, pagas)
  - Criação e edição de contas com categoria e observações
  - Cálculo automático de dias em atraso
  - Marcação de pagamento com criação automática de transação
  - Resumo com totais e contadores

#### 🎨 Temas
- **6 Novos Temas Premium**:
  - Premium Glass (Ultra Glassmorphism)
  - Premium Dark (Elegant Gradient)
  - Premium Purple (Royal Violet)
  - Premium Gold (Luxury Amber)
  - Premium Light (Elegant Glass Light)
  - Premium Cyan (Electric Blue Glass)

- **7 Novos Temas Light**:
  - Light (Clean & Minimal)
  - Light Blue (Sky)
  - Light Green (Mint)
  - Light Pink (Rose)
  - Warm Light (Cream)
  - Nord Light (Arctic)
  - Paper (Off-white)

### 🐛 Correções de Bugs

- **Input**: Corrigidos problemas de entrada de texto que causavam comportamentos inesperados
- **Estabilidade**: Corrigidos bugs que causavam travamentos durante o uso
- **Tool Calls**: Corrigido problema de tool calls "vazias" ou malformadas no chat
- **Filtragem de Tool Calls**: Melhorado o sistema de remoção de tool calls vazias nas mensagens

### 🔧 Melhorias

- Sistema mais estável e confiável
- Melhor experiência de uso do chat
- Interface de temas mais polida e consistente
- Performance aprimorada no Business Mode

---

## [1.1.1] - 2024-12-19

### 🐛 Correções de Bugs

- **React forwardRef Error**: Corrigido erro "Cannot read properties of undefined (reading 'forwardRef')" que ocorria no console
- **Configuração do Vite**: Adicionado `dedupe` para garantir que React seja sempre uma instância única, resolvendo problemas de múltiplas instâncias
- **Importações**: Simplificada a importação do React no ChatInput.jsx

### 🔧 Melhorias

- Melhor resolução de módulos do React no Vite
- Cache do Vite otimizado para evitar problemas de resolução

---

## [1.1.2] - 2024-12-19

### 🐛 Correções de Bugs

- **React forwardRef Error (Produção)**: Corrigido erro "Cannot read properties of undefined (reading 'forwardRef')" no build de produção
- **Configuração do Vite**: React, React-DOM e bibliotecas React-dependentes (lucide-react, react-markdown, etc.) agora estão no mesmo chunk, garantindo ordem de carregamento correta
- **Modo Dev**: Corrigido problema de servidor Python duplicado que causava conflito de porta 8001
- **Importações React**: Otimizadas importações do React no main.jsx

### 🔧 Melhorias

- Melhor separação de chunks no build de produção
- Configuração do Vite otimizada para evitar problemas de resolução de módulos
- Scripts de desenvolvimento simplificados

---

## [1.0.2] - Versão Anterior

[Notas das versões anteriores serão adicionadas conforme necessário]
