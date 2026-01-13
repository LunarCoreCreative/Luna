# 🗺️ Luna Health - Roadmap: Sistema de Profissionais (Modo Separado)

## 📋 Visão Geral

Este roadmap detalha a implementação de um **sistema completamente separado** para profissionais de saúde (nutricionistas, personal trainers) gerenciarem seus pacientes. Diferente do Luna Health (para alunos), este será um **modo independente** similar ao BusinessMode.

**Status Atual**: ✅ Backend completo | ⚠️ Frontend não existe  
**Objetivo**: Criar **ProfessionalsMode** - interface completa e separada para profissionais  
**Prazo Estimado**: 8 semanas (ou 3 semanas para MVP)

---

## 🎯 Arquitetura: Modo Separado

### Conceito
O sistema de profissionais será um **componente separado** (como BusinessMode), não uma aba dentro do HealthMode:

```
App.jsx
├── Chat Principal
├── BusinessMode (separado)
├── HealthMode (separado - para alunos)
└── ProfessionalsMode (separado - NOVO - para profissionais)
```

### Diferenças Fundamentais

| Aspecto | HealthMode (Aluno) | ProfessionalsMode (Profissional) |
|---------|-------------------|----------------------------------|
| **Acesso** | Qualquer usuário | Apenas avaliadores |
| **Foco** | Próprios dados nutricionais | Dados de múltiplos alunos |
| **Interface** | Diário, metas, histórico | Dashboard, análise, relatórios |
| **Chat** | Chat pessoal | Chat profissional especializado |
| **Abertura** | Botão no App.jsx | Botão no App.jsx (apenas para avaliadores) |

---

## 🔍 Análise do Estado Atual

### ✅ Backend (100% Completo)
- Sistema de perfis (student/evaluator)
- Códigos de vinculação
- Endpoints REST completos
- Sistema de permissões
- Ferramentas de chat para profissionais

### ❌ Frontend (Não Existe)
- Não existe ProfessionalsMode
- Não existe interface separada
- Componentes antigos foram removidos

---

## 🎯 Objetivos do Roadmap

### Objetivo Principal
Criar **ProfessionalsMode** - um modo completamente separado e independente para profissionais de saúde gerenciarem seus pacientes.

### Objetivos Específicos
- ✅ Criar componente ProfessionalsMode separado (como BusinessMode)
- ✅ Interface completa e independente
- ✅ Chat especializado da Luna para profissionais
- ✅ Dashboard profissional com métricas e visualizações
- ✅ Gerenciamento completo de alunos
- ✅ Sistema de relatórios profissionais
- ✅ Comparação e análise entre alunos

---

## 📊 Estrutura do Roadmap

```
FASE 1: Estrutura Base (2 semanas)
  ├── Criar ProfessionalsMode (componente separado)
  ├── Integrar no App.jsx
  └── Navegação e layout base

FASE 2: Funcionalidades Core (2 semanas)
  ├── Dashboard Profissional
  ├── Gerenciamento de Alunos
  ├── Análise Individual
  └── Chat Especializado

FASE 3: Visualizações (2 semanas)
  ├── Setup de gráficos
  ├── Componentes de gráficos
  └── Dashboard visual

FASE 4: Funcionalidades Avançadas (2 semanas)
  ├── Comparação de Alunos
  ├── Geração de Relatórios
  └── Backend de relatórios
```

---

## 🚀 FASE 1: Estrutura Base

**Duração**: 2 semanas  
**Objetivo**: Criar ProfessionalsMode como componente separado e integrar no App.jsx

### Tarefas

#### T1.1 - Criar Componente ProfessionalsMode
- **Arquivo**: `src/components/professionals/ProfessionalsMode.jsx`
- **Descrição**: Componente principal separado (similar a BusinessMode)
- **Estrutura**:
  - Modal/tela fullscreen
  - Header com logo e título "Luna Health - Profissionais"
  - Navegação interna (tabs)
  - Área de conteúdo
  - Botão fechar
- **Funcionalidades**:
  - Layout fullscreen (fixed inset-0)
  - Navegação entre seções (Dashboard, Alunos, Análise, Chat, etc.)
  - Carregamento de dados básicos
  - Estados de loading/error
- **Estimativa**: 8 horas
- **Dependências**: Nenhuma
- **Status**: ⬜ Pendente

#### T1.2 - Criar Estrutura de Pastas
- **Descrição**: Organizar componentes em estrutura de pastas
- **Estrutura**:
  ```
  components/
    └── professionals/
        ├── ProfessionalsMode.jsx (componente principal)
        ├── tabs/
        │   ├── DashboardTab.jsx
        │   ├── AlunosTab.jsx
        │   ├── AnaliseTab.jsx
        │   ├── ChatTab.jsx
        │   ├── ComparacaoTab.jsx
        │   ├── RelatoriosTab.jsx
        │   └── ConfiguracoesTab.jsx
        └── charts/
            ├── CaloriesChart.jsx
            ├── WeightChart.jsx
            └── ...
  ```
- **Estimativa**: 1 hora
- **Dependências**: Nenhuma
- **Status**: ⬜ Pendente

#### T1.3 - Integrar ProfessionalsMode no App.jsx
- **Arquivo**: `src/App.jsx`
- **Descrição**: Adicionar ProfessionalsMode como modo separado
- **Funcionalidades**:
  - Estado `professionalsModeOpen`
  - Botão para abrir (apenas para avaliadores)
  - Renderização condicional do componente
  - Fechar outros modos ao abrir (BusinessMode, HealthMode)
- **Código Exemplo**:
  ```jsx
  // No App.jsx
  const [professionalsModeOpen, setProfessionalsModeOpen] = useState(false);
  
  // Verificar se usuário é avaliador
  const isEvaluator = healthProfile?.type === "evaluator";
  
  // Botão para abrir (apenas para avaliadores)
  {isEvaluator && (
      <button onClick={() => {
          setProfessionalsModeOpen(true);
          setBusinessModeOpen(false);
          setHealthModeOpen(false);
      }}>
          Profissionais
      </button>
  )}
  
  // Renderização
  {professionalsModeOpen && (
      <ProfessionalsMode
          isOpen={professionalsModeOpen}
          onClose={() => setProfessionalsModeOpen(false)}
          userId={user?.uid}
      />
  )}
  ```
- **Estimativa**: 4 horas
- **Dependências**: T1.1
- **Status**: ⬜ Pendente

#### T1.4 - Criar Hook useProfessionalsData
- **Arquivo**: `src/hooks/useProfessionalsData.js`
- **Descrição**: Hook para gerenciar dados do modo profissional
- **Funcionalidades**:
  - Carregar lista de alunos
  - Carregar estatísticas agregadas
  - Gerenciar estado de loading/error
  - Função de refresh
  - Cache de dados
- **Estimativa**: 4 horas
- **Dependências**: Nenhuma
- **Status**: ⬜ Pendente

#### T1.5 - Detecção Automática de Perfil
- **Arquivo**: `src/App.jsx` e `src/components/professionals/ProfessionalsMode.jsx`
- **Descrição**: Detectar perfil de avaliador e mostrar botão automaticamente
- **Funcionalidades**:
  - Verificar perfil ao carregar App
  - Mostrar botão "Profissionais" apenas para avaliadores
  - Esconder botão para alunos
- **Estimativa**: 2 horas
- **Dependências**: T1.3
- **Status**: ⬜ Pendente

#### T1.6 - Testes da Fase 1
- **Descrição**: Testar estrutura básica
- **Testes**:
  - ProfessionalsMode abre e fecha corretamente
  - Botão aparece apenas para avaliadores
  - Navegação interna funciona
  - Dados carregam corretamente
- **Estimativa**: 3 horas
- **Dependências**: T1.1, T1.3, T1.4
- **Status**: ⬜ Pendente

**Total Fase 1**: ~22 horas (2 semanas com buffer)

---

## 📈 FASE 2: Funcionalidades Core

**Duração**: 2 semanas  
**Objetivo**: Implementar funcionalidades principais

### 💬 Chat Especializado para Profissionais

O ProfessionalsMode terá um **chat dedicado da Luna** com system prompt específico para profissionais. Este chat será diferente do chat normal de alunos, com:

- **System Prompt Profissional**: Contexto de nutricionista/avaliador, foco em análise profissional
- **Ferramentas Específicas**: Acesso a ferramentas como `get_student_data`, `compare_students`, `generate_student_report`
- **Busca Inteligente**: Profissional pode mencionar nome de aluno e Luna busca automaticamente
- **Contexto de Múltiplos Alunos**: Luna tem visão de todos os alunos vinculados
- **Análise Profissional**: Respostas focadas em insights, recomendações e relatórios profissionais

### Tarefas

#### T2.1 - Dashboard Tab
- **Arquivo**: `src/components/professionals/tabs/DashboardTab.jsx`
- **Descrição**: Dashboard com métricas e visão geral
- **Funcionalidades**:
  - Cards de métricas (total alunos, ativos, médias)
  - Lista de alunos sem atividade
  - Acesso rápido a alunos mais ativos
  - Notificações não lidas
- **Estimativa**: 8 horas
- **Dependências**: T1.4
- **Status**: ⬜ Pendente

#### T2.2 - Alunos Tab
- **Arquivo**: `src/components/professionals/tabs/AlunosTab.jsx`
- **Descrição**: Interface para gerenciar alunos vinculados
- **Funcionalidades**:
  - Lista de todos os alunos
  - Busca por nome/email
  - Filtros (ativos, inativos, com metas)
  - Ordenação (nome, data, atividade)
  - Ações rápidas (ver detalhes, desvincular)
  - Cards informativos de cada aluno
- **Estimativa**: 10 horas
- **Dependências**: T1.4
- **Status**: ⬜ Pendente

#### T2.3 - Análise Tab
- **Arquivo**: `src/components/professionals/tabs/AnaliseTab.jsx`
- **Descrição**: Visualização completa dos dados de um aluno específico
- **Funcionalidades**:
  - Seletor de aluno (dropdown/busca)
  - Resumo nutricional atual
  - Histórico de refeições
  - Metas e aderência
  - Botão para gerar relatório
- **Estimativa**: 12 horas
- **Dependências**: T1.4
- **Status**: ⬜ Pendente

#### T2.4 - Chat Tab (Especializado)
- **Arquivo**: `src/components/professionals/tabs/ChatTab.jsx`
- **Descrição**: Chat dedicado da Luna para profissionais
- **Funcionalidades**:
  - Chat integrado no ProfessionalsMode
  - System prompt específico para profissionais (via backend - `professional_mode=True`)
  - Contexto de múltiplos alunos disponível
  - Pode mencionar nomes de alunos e Luna busca automaticamente
  - Ferramentas específicas para profissionais
  - UI diferenciada com banner profissional (roxo/índigo)
  - Lista de alunos colapsável no chat
  - Mensagem inicial específica para profissionais
  - Integração com WebSocket (mesmo sistema do HealthChat)
  - Não envia `view_as_student_id` (modo profissional geral)
- **UI/UX**:
  - Header: "Luna Health - Modo Profissional"
  - Banner: Gradiente roxo/índigo com ícone Sparkles
  - Badge "Avaliador" no header
  - Lista de alunos com nome e email
- **Estimativa**: 10 horas
- **Dependências**: T2.7 (Backend)
- **Status**: ⬜ Pendente

#### T2.5 - Configurações Tab
- **Arquivo**: `src/components/professionals/tabs/ConfiguracoesTab.jsx`
- **Descrição**: Configurações e preferências do avaliador
- **Funcionalidades**:
  - Gerenciamento de código de vinculação
  - Configurações de notificações
  - Preferências de visualização
- **Estimativa**: 6 horas
- **Dependências**: T1.4
- **Status**: ⬜ Pendente

#### T2.6 - Melhorias no Backend - Estatísticas
- **Arquivo**: `server/health/routes.py`
- **Descrição**: Melhorar endpoint de estatísticas
- **Funcionalidades**:
  - Adicionar mais métricas
  - Suportar diferentes períodos
  - Incluir percentis e rankings
  - Alertas automáticos
- **Estimativa**: 4 horas
- **Dependências**: Nenhuma
- **Status**: ⬜ Pendente

#### T2.7 - Chat Especializado (Backend)
- **Arquivo**: `server/config.py` e `server/health_agent.py`
- **Descrição**: Criar system prompt dedicado para profissionais de saúde
- **Funcionalidades**:
  - Criar `PROFESSIONAL_HEALTH_SYSTEM_PROMPT` com contexto de nutricionista/avaliador
  - Adicionar parâmetro `professional_mode` ao `get_system_prompt()`
  - Prompt focado em análise profissional, insights e relatórios
  - Linguagem profissional mas carinhosa
  - Instruções sobre uso de ferramentas específicas para profissionais
  - Contexto sobre múltiplos alunos e comparações
  - Instruções para identificar alunos por nome (busca automática)
  - Diretrizes para análises profissionais e éticas
  - Exemplos de respostas profissionais
- **Conteúdo do Prompt**:
  ```
  Você é Luna Health Professional, uma assistente nutricional especializada 
  em auxiliar nutricionistas e profissionais de saúde a gerenciar e analisar 
  os dados nutricionais de seus pacientes.

  SUA IDENTIDADE:
  - Assistente nutricional profissional
  - Especialista em análise de dados nutricionais
  - Consultora para profissionais de saúde

  SEU CONTEXTO:
  Você está auxiliando um nutricionista/avaliador que gerencia múltiplos alunos/pacientes.
  Você tem acesso a dados de todos os alunos vinculados ao profissional.

  FERRAMENTAS ESPECÍFICAS PARA PROFISSIONAIS:
  - get_student_data: Buscar dados completos de um aluno (por nome ou ID)
  - compare_students: Comparar dados de múltiplos alunos
  - generate_student_report: Gerar relatório profissional de um aluno
  - list_all_students: Listar todos os alunos com resumo rápido
  - get_student_summary: Resumo completo de um aluno em um período

  PROTOCOLO DE IDENTIFICAÇÃO DE ALUNOS:
  - Quando o profissional mencionar um nome de aluno, você DEVE usar get_student_data
  - Busque automaticamente o aluno pelo nome
  - Se houver ambiguidade (múltiplos alunos com nome similar), liste opções
  - Sempre confirme qual aluno está sendo analisado

  DIRETRIZES DE RESPOSTA:
  - Seja profissional mas carinhosa
  - Foque em insights práticos e acionáveis
  - Use dados concretos nas análises
  - Forneça recomendações baseadas em evidências
  - Seja ética e respeite a privacidade dos alunos
  ```
- **Modificações no health_agent.py**:
  ```python
  # Detectar modo profissional
  is_professional_mode = (
      not request.view_as_student_id and 
      get_health_profile(request.user_id)?.get("type") == "evaluator"
  )

  # Usar prompt profissional
  prompt = get_system_prompt(
      user_id=request.user_id,
      user_name=request.user_name,
      health_mode=True,
      professional_mode=is_professional_mode
  )

  # Adicionar contexto de alunos
  if is_professional_mode:
      students = get_evaluator_students(request.user_id)
      prompt += f"\n\n## 👥 ALUNOS VINCULADOS ({len(students)}):\n"
      for student_id in students:
          student_name = get_student_name(student_id)
          prompt += f"- {student_name} (ID: {student_id})\n"
  ```
- **Estimativa**: 4 horas
- **Dependências**: Nenhuma
- **Status**: ⬜ Pendente

#### T2.8 - Testes da Fase 2
- **Descrição**: Testar funcionalidades core
- **Testes**:
  - Dashboard carrega dados corretos
  - Busca e filtros funcionam
  - Análise individual mostra dados corretos
  - Configurações salvam corretamente
  - Chat profissional funciona com system prompt correto
  - Chat consegue buscar alunos por nome
  - Ferramentas de profissional funcionam no chat
- **Estimativa**: 6 horas
- **Dependências**: T2.1, T2.2, T2.3, T2.4, T2.5, T2.7
- **Status**: ⬜ Pendente

**Total Fase 2**: ~60 horas (2 semanas com buffer)

---

## 📊 FASE 3: Visualizações

**Duração**: 2 semanas  
**Objetivo**: Adicionar gráficos e visualizações profissionais

### Tarefas

#### T3.1 - Setup Biblioteca de Gráficos
- **Descrição**: Instalar e configurar biblioteca de gráficos
- **Decisão**: Recharts ou Chart.js
- **Ações**:
  - Instalar biblioteca escolhida
  - Configurar tema e estilos
  - Criar wrapper básico
- **Estimativa**: 4 horas
- **Dependências**: Nenhuma
- **Status**: ⬜ Pendente

#### T3.2 - Componente CaloriesChart
- **Arquivo**: `src/components/professionals/charts/CaloriesChart.jsx`
- **Descrição**: Gráfico de calorias ao longo do tempo
- **Funcionalidades**:
  - Linha temporal de calorias
  - Meta de calorias como referência
  - Tooltip com detalhes
  - Filtro de período
- **Estimativa**: 3 horas
- **Dependências**: T3.1
- **Status**: ⬜ Pendente

#### T3.3 - Componente WeightChart
- **Arquivo**: `src/components/professionals/charts/WeightChart.jsx`
- **Descrição**: Gráfico de progresso de peso
- **Funcionalidades**:
  - Linha temporal de peso
  - Peso alvo como referência
  - Tooltip com detalhes
  - Zoom e pan
- **Estimativa**: 3 horas
- **Dependências**: T3.1
- **Status**: ⬜ Pendente

#### T3.4 - Componente MacrosChart
- **Arquivo**: `src/components/professionals/charts/MacrosChart.jsx`
- **Descrição**: Distribuição de macros
- **Funcionalidades**:
  - Gráfico de pizza/rosquinha
  - Proteína, carboidratos, gorduras
  - Comparação com metas
  - Legenda interativa
- **Estimativa**: 3 horas
- **Dependências**: T3.1
- **Status**: ⬜ Pendente

#### T3.5 - Componente AdherenceChart
- **Arquivo**: `src/components/professionals/charts/AdherenceChart.jsx`
- **Descrição**: Taxa de aderência às metas
- **Funcionalidades**:
  - Gráfico de barras de aderência
  - Por dia/semana/mês
  - Indicadores visuais (verde/amarelo/vermelho)
- **Estimativa**: 3 horas
- **Dependências**: T3.1
- **Status**: ⬜ Pendente

#### T3.6 - Componente ComparisonChart
- **Arquivo**: `src/components/professionals/charts/ComparisonChart.jsx`
- **Descrição**: Comparação entre múltiplos alunos
- **Funcionalidades**:
  - Gráfico de barras comparativo
  - Múltiplas séries (um por aluno)
  - Legenda clara
  - Exportação
- **Estimativa**: 4 horas
- **Dependências**: T3.1
- **Status**: ⬜ Pendente

#### T3.7 - Integrar Gráficos no Dashboard
- **Arquivo**: `src/components/professionals/tabs/DashboardTab.jsx`
- **Descrição**: Adicionar gráficos ao dashboard
- **Funcionalidades**:
  - Gráfico de tendência de calorias (últimos 30 dias)
  - Gráfico de distribuição de macros (média)
  - Gráfico de aderência geral
- **Estimativa**: 6 horas
- **Dependências**: T3.2, T3.4, T3.5
- **Status**: ⬜ Pendente

#### T3.8 - Integrar Gráficos na Análise
- **Arquivo**: `src/components/professionals/tabs/AnaliseTab.jsx`
- **Descrição**: Adicionar gráficos na análise
- **Funcionalidades**:
  - Gráfico de calorias do aluno
  - Gráfico de peso do aluno
  - Gráfico de macros do aluno
  - Gráfico de aderência do aluno
- **Estimativa**: 6 horas
- **Dependências**: T3.2, T3.3, T3.4, T3.5
- **Status**: ⬜ Pendente

#### T3.9 - Testes da Fase 3
- **Descrição**: Testar gráficos e visualizações
- **Testes**:
  - Gráficos renderizam corretamente
  - Dados estão corretos
  - Interatividade funciona
  - Responsividade funciona
- **Estimativa**: 4 horas
- **Dependências**: T3.7, T3.8
- **Status**: ⬜ Pendente

**Total Fase 3**: ~36 horas (2 semanas com buffer)

---

## 🔄 FASE 4: Funcionalidades Avançadas

**Duração**: 2 semanas  
**Objetivo**: Implementar comparação, relatórios e funcionalidades avançadas

### Tarefas

#### T4.1 - Comparação Tab
- **Arquivo**: `src/components/professionals/tabs/ComparacaoTab.jsx`
- **Descrição**: Interface para comparar múltiplos alunos
- **Funcionalidades**:
  - Seleção múltipla de alunos (checkboxes)
  - Gráficos comparativos
  - Tabela comparativa
  - Exportação da comparação
- **Estimativa**: 10 horas
- **Dependências**: T3.6
- **Status**: ⬜ Pendente

#### T4.2 - Endpoint de Comparação (Backend)
- **Arquivo**: `server/health/routes.py`
- **Descrição**: Criar endpoint para comparação
- **Funcionalidades**:
  - `POST /health/students/compare`
  - Receber lista de student_ids
  - Calcular métricas comparativas
  - Retornar dados agregados
- **Estimativa**: 6 horas
- **Dependências**: Nenhuma
- **Status**: ⬜ Pendente

#### T4.3 - Relatórios Tab
- **Arquivo**: `src/components/professionals/tabs/RelatoriosTab.jsx`
- **Descrição**: Interface para gerar relatórios
- **Funcionalidades**:
  - Seleção de aluno(s)
  - Seleção de período
  - Templates de relatório
  - Preview do relatório
  - Exportação (PDF, Excel)
- **Estimativa**: 14 horas
- **Dependências**: T4.4
- **Status**: ⬜ Pendente

#### T4.4 - Sistema de Templates de Relatórios (Backend)
- **Arquivo**: `server/health/reports.py` (novo)
- **Descrição**: Sistema de templates e geração de relatórios
- **Funcionalidades**:
  - Templates configuráveis
  - Sistema de variáveis
  - Geração de PDF com gráficos
  - Suporte a múltiplos formatos
- **Estimativa**: 10 horas
- **Dependências**: Nenhuma
- **Status**: ⬜ Pendente

#### T4.5 - Endpoint de Relatórios (Backend)
- **Arquivo**: `server/health/routes.py`
- **Descrição**: Criar endpoint para gerar relatórios
- **Funcionalidades**:
  - `POST /health/reports/generate`
  - Gerar PDF profissional
  - Suportar múltiplos templates
  - Retornar PDF como base64 ou URL
- **Estimativa**: 8 horas
- **Dependências**: T4.4
- **Status**: ⬜ Pendente

#### T4.6 - Melhorias de Performance
- **Descrição**: Otimizar carregamento e renderização
- **Ações**:
  - Lazy loading de componentes pesados
  - Memoização de cálculos
  - Otimização de re-renders
  - Cache de dados
- **Estimativa**: 6 horas
- **Dependências**: T4.1, T4.3
- **Status**: ⬜ Pendente

#### T4.7 - Testes da Fase 4
- **Descrição**: Testar funcionalidades avançadas
- **Testes**:
  - Comparação funciona corretamente
  - Relatórios são gerados corretamente
  - PDFs têm formato correto
  - Exportação funciona
- **Estimativa**: 4 horas
- **Dependências**: T4.1, T4.3, T4.5
- **Status**: ⬜ Pendente

**Total Fase 4**: ~58 horas (2 semanas com buffer)

---

## ✨ FASE 5: Polimento

**Duração**: 1 semana  
**Objetivo**: Refinar design, responsividade e acessibilidade

### Tarefas

#### T5.1 - Design System para Profissionais
- **Descrição**: Definir e aplicar design system
- **Elementos**:
  - Paleta de cores profissional (diferente do HealthMode)
  - Tipografia consistente
  - Ícones padronizados
  - Espaçamento e hierarquia
- **Estimativa**: 4 horas
- **Dependências**: Todas as fases anteriores
- **Status**: ⬜ Pendente

#### T5.2 - Responsividade
- **Descrição**: Garantir funcionamento em diferentes tamanhos de tela
- **Breakpoints**:
  - Desktop (1920x1080, 1366x768)
  - Tablet (768x1024)
  - Mobile (375x667, 414x896) - futuro
- **Estimativa**: 6 horas
- **Dependências**: Todas as fases anteriores
- **Status**: ⬜ Pendente

#### T5.3 - Animações e Transições
- **Descrição**: Adicionar animações suaves
- **Elementos**:
  - Transições entre tabs
  - Loading states elegantes
  - Feedback visual em ações
  - Animações de entrada/saída
- **Estimativa**: 4 horas
- **Dependências**: Todas as fases anteriores
- **Status**: ⬜ Pendente

#### T5.4 - Acessibilidade
- **Descrição**: Garantir acessibilidade WCAG AA
- **Elementos**:
  - Contraste adequado
  - Navegação por teclado
  - Screen reader friendly
  - Labels descritivos
- **Estimativa**: 4 horas
- **Dependências**: Todas as fases anteriores
- **Status**: ⬜ Pendente

#### T5.5 - Documentação
- **Descrição**: Documentar funcionalidades
- **Conteúdo**:
  - README do ProfessionalsMode
  - Guia de uso para profissionais
  - Documentação de componentes
- **Estimativa**: 4 horas
- **Dependências**: Todas as fases anteriores
- **Status**: ⬜ Pendente

#### T5.6 - Testes Finais
- **Descrição**: Testes completos de integração
- **Testes**:
  - Fluxo completo de uso
  - Testes de regressão
  - Testes de performance
  - Testes de acessibilidade
- **Estimativa**: 6 horas
- **Dependências**: Todas as fases anteriores
- **Status**: ⬜ Pendente

**Total Fase 5**: ~28 horas (1 semana com buffer)

---

## 📅 Cronograma Consolidado

### Opção 1: Implementação Completa (8 semanas)

| Semana | Fase | Foco | Horas | Status |
|--------|------|------|-------|--------|
| 1-2 | Fase 1 | Estrutura Base (Modo Separado) | 22h | ⬜ |
| 3-4 | Fase 2 | Funcionalidades Core | 60h | ⬜ |
| 5-6 | Fase 3 | Visualizações | 36h | ⬜ |
| 7-8 | Fase 4 | Funcionalidades Avançadas | 58h | ⬜ |
| 9 | Fase 5 | Polimento | 28h | ⬜ |
| **Total** | | | **204h** | |

### Opção 2: MVP Rápido (3 semanas)

| Semana | Fase | Foco | Horas | Status |
|--------|------|------|-------|--------|
| 1 | MVP-1 | ProfessionalsMode + Dashboard | 20h | ⬜ |
| 2 | MVP-2 | Alunos + Análise + Chat | 24h | ⬜ |
| 3 | MVP-3 | Polimento + Testes | 16h | ⬜ |
| **Total** | | | **60h** | |

**Funcionalidades MVP**:
- ✅ ProfessionalsMode separado e funcional
- ✅ Dashboard básico (sem gráficos)
- ✅ Lista e busca de alunos
- ✅ Análise individual básica
- ✅ **Chat especializado integrado**
- ✅ Configurações básicas

**Funcionalidades para depois**:
- ⏳ Gráficos avançados
- ⏳ Comparação entre alunos
- ⏳ Relatórios em PDF
- ⏳ Templates personalizados

---

## 🎯 Milestones

### Milestone 1: Modo Separado Funcional
**Prazo**: Semana 2  
**Critérios**:
- [ ] ProfessionalsMode abre e fecha corretamente
- [ ] Botão aparece apenas para avaliadores
- [ ] Navegação interna funciona
- [ ] Dados básicos carregam corretamente

### Milestone 2: Funcionalidades Core
**Prazo**: Semana 4  
**Critérios**:
- [ ] Dashboard mostra estatísticas
- [ ] Gerenciamento de alunos funciona
- [ ] Análise individual funciona
- [ ] **Chat profissional funciona com system prompt correto**

### Milestone 3: Visualizações
**Prazo**: Semana 6  
**Critérios**:
- [ ] Gráficos renderizam corretamente
- [ ] Gráficos integrados no dashboard
- [ ] Gráficos integrados na análise

### Milestone 4: Funcionalidades Avançadas
**Prazo**: Semana 8  
**Critérios**:
- [ ] Comparação entre alunos funciona
- [ ] Relatórios são gerados
- [ ] Exportação funciona

### Milestone 5: Lançamento
**Prazo**: Semana 9  
**Critérios**:
- [ ] Design polido
- [ ] Responsividade funcionando
- [ ] Acessibilidade validada
- [ ] Testes completos passando

---

## 📊 Métricas de Sucesso

### Métricas Técnicas
- ✅ 100% das funcionalidades planejadas implementadas
- ✅ 0 bugs críticos
- ✅ Performance: < 2s para carregar dashboard
- ✅ Acessibilidade: WCAG AA compliance

### Métricas de UX
- ✅ Profissionais conseguem encontrar alunos em < 3 cliques
- ✅ Geração de relatório em < 30 segundos
- ✅ Interface intuitiva (testes de usabilidade)
- ✅ Chat profissional responde corretamente a menções de alunos

### Métricas de Negócio
- ✅ Aumento no uso do modo avaliador
- ✅ Feedback positivo de profissionais
- ✅ Redução de tempo para análise de alunos

---

## 🔄 Dependências e Riscos

### Dependências Externas
- ✅ Backend já está completo (sem dependências)
- ⚠️ Biblioteca de gráficos (Recharts ou Chart.js)
- ⚠️ Biblioteca de PDF (jsPDF ou react-pdf)
- ⚠️ Biblioteca de Excel (xlsx ou exceljs)

### Riscos Identificados

| Risco | Probabilidade | Impacto | Mitigação |
|-------|---------------|---------|-----------|
| Biblioteca de gráficos não funciona bem | Baixa | Médio | Testar antes de implementar |
| Performance com muitos alunos | Média | Alto | Implementar paginação e lazy loading |
| Complexidade de relatórios | Média | Médio | Começar com templates simples |
| System prompt profissional não funciona bem | Baixa | Alto | Testar extensivamente com exemplos reais |
| Mudanças de requisitos | Baixa | Médio | Manter comunicação constante |

---

## 📝 Notas de Implementação

### Arquitetura: Modo Separado

**Estrutura de Arquivos**:
```
src/
├── App.jsx (modificar - adicionar professionalsModeOpen)
├── components/
│   ├── business/
│   │   └── BusinessMode.jsx (referência)
│   ├── health/
│   │   └── HealthMode.jsx (referência)
│   └── professionals/ (NOVO)
│       ├── ProfessionalsMode.jsx (componente principal)
│       ├── tabs/
│       │   ├── DashboardTab.jsx
│       │   ├── AlunosTab.jsx
│       │   ├── AnaliseTab.jsx
│       │   ├── ChatTab.jsx
│       │   ├── ComparacaoTab.jsx
│       │   ├── RelatoriosTab.jsx
│       │   └── ConfiguracoesTab.jsx
│       └── charts/
│           ├── CaloriesChart.jsx
│           ├── WeightChart.jsx
│           └── ...
└── hooks/
    └── useProfessionalsData.js (NOVO)
```

**Integração no App.jsx**:
```jsx
// Estado
const [professionalsModeOpen, setProfessionalsModeOpen] = useState(false);

// Verificar perfil (carregar do backend ou contexto)
const [healthProfile, setHealthProfile] = useState(null);
const isEvaluator = healthProfile?.type === "evaluator";

// Botão para abrir (apenas para avaliadores)
{isEvaluator && (
    <button onClick={() => {
        setProfessionalsModeOpen(true);
        setBusinessModeOpen(false);
        setHealthModeOpen(false);
    }}>
        Profissionais
    </button>
)}

// Renderização
{professionalsModeOpen && (
    <ProfessionalsMode
        isOpen={professionalsModeOpen}
        onClose={() => setProfessionalsModeOpen(false)}
        userId={user?.uid}
    />
)}
```

### Priorização
1. **Alta**: Estrutura base, ProfessionalsMode separado, Dashboard, Gerenciamento de Alunos, **Chat Profissional**
2. **Média**: Análise Individual, Gráficos básicos
3. **Baixa**: Comparação, Relatórios avançados, Templates

### Decisões Técnicas Pendentes
- [ ] Escolher biblioteca de gráficos (Recharts vs Chart.js)
- [ ] Escolher biblioteca de PDF (jsPDF vs react-pdf)
- [ ] Definir formato de templates de relatórios
- [ ] Decidir sobre paginação vs scroll infinito

### Próximos Passos Imediatos
1. Revisar este roadmap com stakeholders
2. Decidir entre MVP rápido ou implementação completa
3. Escolher bibliotecas (gráficos, PDF)
4. Criar issues/tasks no sistema de gerenciamento
5. Iniciar Fase 1 - Estrutura Base (Modo Separado)

---

## ✅ Checklist de Validação Final

### Funcionalidades
- [ ] ProfessionalsMode abre e fecha corretamente
- [ ] Botão aparece apenas para avaliadores
- [ ] Dashboard mostra dados corretos
- [ ] Busca e filtros funcionam
- [ ] Análise individual funciona
- [ ] **Chat profissional funciona com system prompt correto**
- [ ] **Chat consegue buscar alunos por nome automaticamente**
- [ ] Gráficos renderizam corretamente
- [ ] Comparação funciona
- [ ] Relatórios são gerados
- [ ] Exportação funciona

### Qualidade
- [ ] Código revisado
- [ ] Testes passando
- [ ] Sem bugs críticos
- [ ] Performance adequada
- [ ] Acessibilidade validada

### Documentação
- [ ] README atualizado
- [ ] Guia de uso criado
- [ ] Documentação de componentes
- [ ] Changelog atualizado

---

## 📚 Referências

### Documentos Relacionados
- `LUNA_HEALTH_PROFILES_ROADMAP.md` - Roadmap de perfis
- `LUNA_HEALTH_ROADMAP.md` - Roadmap geral
- `LUNA_HEALTH_TOOLS_DOCUMENTATION.md` - Documentação de tools

### Bibliotecas Sugeridas
- **Gráficos**: Recharts (React-friendly) ou Chart.js (mais popular)
- **PDF**: jsPDF (simples) ou react-pdf (mais React-friendly)
- **Excel**: xlsx (leve) ou exceljs (mais recursos)

### Referências de Código
- `src/components/business/BusinessMode.jsx` - Exemplo de modo separado
- `src/components/health/HealthMode.jsx` - Exemplo de modo separado
- `src/App.jsx` - Integração de modos separados

---

## 💬 Exemplos de Uso do Chat Profissional

### Exemplo 1: Busca Automática de Aluno
```
Profissional: "Como está o progresso da Maria?"

Luna: "Analisando os dados da Maria, vejo que:
- Ela está consumindo em média 1800 kcal/dia (meta: 2000 kcal)
- Taxa de aderência: 75% nos últimos 30 dias
- Peso: 68kg (meta: 65kg)
- Progresso: -2kg nos últimos 2 meses

Recomendações:
- Aumentar consumo de proteínas (atual: 90g, recomendado: 120g)
- Melhorar aderência às metas (focar em refeições consistentes)
..."
```

### Exemplo 2: Comparação entre Alunos
```
Profissional: "Compare o João com a Maria"

Luna: "Comparando João e Maria:

📊 Calorias Médias (últimos 30 dias):
- João: 2200 kcal/dia (meta: 2500) - 88% da meta
- Maria: 1800 kcal/dia (meta: 2000) - 90% da meta

💪 Proteínas:
- João: 150g/dia (meta: 180g) - precisa aumentar
- Maria: 90g/dia (meta: 120g) - precisa aumentar

📈 Progresso de Peso:
- João: -1kg (meta: -3kg) - progresso lento
- Maria: -2kg (meta: -5kg) - progresso consistente

💡 Insights:
- Maria tem melhor aderência às metas
- João precisa aumentar consumo de proteínas
- Ambos estão abaixo das metas de calorias
..."
```

### Exemplo 3: Geração de Relatório
```
Profissional: "Gere um relatório completo do João dos últimos 30 dias"

Luna: "📋 RELATÓRIO NUTRICIONAL - João Silva
Período: Últimos 30 dias

📊 RESUMO EXECUTIVO:
- Consumo médio: 2200 kcal/dia
- Aderência: 75%
- Progresso de peso: -1kg
- Status: Progresso moderado

📈 ANÁLISE DETALHADA:
[Relatório completo gerado...]

💡 RECOMENDAÇÕES:
[Recomendações específicas...]
"
```

---

**Última atualização**: 2025-01-27  
**Versão**: 3.0 (Modo Separado)  
**Status**: 📋 Planejado
