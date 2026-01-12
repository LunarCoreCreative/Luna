# 🥗 Luna Health - Roadmap e Tasklist

## 📋 Visão Geral

Este documento organiza o desenvolvimento do **Luna Health** (modo de nutrição da Luna) em fases incrementais, desde o MVP até funcionalidades avançadas de um app de nutrição completo.

---

## 🎯 Fase 0 - Consolidar o que já existe (Hardening Rápido)

**Objetivo**: Garantir que o que já funciona está robusto e pronto para evoluir.

### Backend
- [x] **T0.1 - Revisar Health Storage local**
  - Garantir tratamento de arquivos vazios/corrompidos em `meals.json` e `goals.json`
  - Adicionar locks simples para evitar concorrência em escrita
  - Validar formato de dados ao carregar

- [x] **T0.2 - Melhorar logs e debug**
  - Adicionar logs claros nas rotas `/health/*` (erros, user_id, data)
  - Facilitar rastreamento de problemas

### Agente & UX de Chat
- [x] **T0.3 - Ajustar prompt do `health_agent`**
  - Garantir que o sistema incentiva uso de ferramentas (`add_meal`, `update_goals`, `get_nutrition_summary`)
  - Melhorar respostas educativas (não só números, mas explicações)

- [x] **T0.4 - Mensagens de erro amigáveis**
  - Revisar respostas dos tools (`execute_health_tool`) para retornar mensagens legíveis no chat
  - Exemplos: "Alimento não encontrado", "Refeição não encontrada", etc.

- [x] **T0.5 - Melhorar pesquisa e adição automática de alimentos**
  - Garantir que quando o usuário menciona um alimento não registrado, a Luna pesquisa automaticamente e adiciona ao banco
  - Melhorar o fluxo: ao registrar refeição com alimento desconhecido, primeiro pesquisar/adicionar o alimento, depois registrar a refeição
  - Adicionar feedback claro quando um alimento é pesquisado e adicionado automaticamente
  - Melhorar tratamento de erros na pesquisa online (timeout, falha de conexão, etc.)
  - Otimizar cache de pesquisas para evitar pesquisas duplicadas

---

## 🚀 Fase 1 - MVP "App de Nutrição Usável"

**Objetivo**: Ter uma **UI clara** para o diário alimentar + chat funcionando bem.

### Backend
- [x] **T1.1 - Endpoints de suporte ao diário (confirmar/estabilizar)**
  - Garantir que `GET /health/meals` com filtros por `date` e `limit` funciona bem
  - Garantir que `GET /health/summary` retorna totais + metas + saldo corretamente

- [x] **T1.2 - Endpoint de "resumo curto" (opcional)** ✅
  - Criar `GET /health/daily_overview` que agrega:
    - Resumo do dia (calorias, macros, metas)
    - Últimas N refeições
  - Facilita uma chamada única no frontend

### Frontend (HealthMode / HealthChat)
- [x] **T1.3 - Tela de "Hoje" (Diário visual)** ✅
  - **Sessão "Resumo do Dia"**:
    - Mostrar calorias consumidas / meta (barra de progresso)
    - Mostrar proteína / meta, carbo / meta, gorduras / meta
    - Chamar `GET /health/daily_overview` ao abrir e ao atualizar refeição/metas
  
  - **Lista de refeições do dia**:
    - Chamar `GET /health/daily_overview` (agrega resumo + refeições)
    - Exibir cards por refeição:
      - Tipo (ícone: café, almoço, jantar, lanche)
      - Nome
      - Kcal e macros (quando existirem)
      - Botão "Editar" / "Apagar"
  
  - **Ação "Adicionar refeição"**:
    - Abrir modal simples (form) com: nome, tipo, macros, notas, data
    - Usar `POST /health/meals`

- [x] **T1.4 - Integração com o chat** ✅
  - Deixar fácil: botões "Perguntar para Luna" embaixo do resumo do dia
  - Mostrar na UI quando a Luna registra uma refeição (trigger de refresh via `onUpdate` que já existe em `HealthChat.jsx`)

### Agente & UX
- [x] **T1.5 - Onboarding leve no chat** ✅
  - Primeira mensagem da Luna Health:
    - Perguntar se o usuário quer configurar metas básicas
    - Sugerir registrar a primeira refeição
  - Instruir a IA a explicar **onde o usuário vê o diário** na UI (nome da aba, ícone, etc.)

---

## 📊 Fase 1.5 - Metas e Onboarding mais Inteligentes

**Objetivo**: Tornar a configuração de metas mais intuitiva e personalizada.

### Backend
- [x] **T1.6 - Campos extra de metas (já existem, mas usar de verdade)** ✅
  - Usar `target_weight` e `current_weight` em `goals.json` para:
    - Exibir no resumo
    - Calcular diferença de peso

- [x] **T1.7 - Endpoint auxiliar de metas sugeridas (opcional)** ✅
  - Criar `POST /health/suggest_goals` com:
    - Peso, altura, idade, sexo, objetivo (emagrecer/manter/ganhar massa)
    - Retorna: calorias, proteína, carbo, gorduras sugeridas
  - Usar fórmulas básicas (ex: Harris-Benedict ou Mifflin-St Jeor)

### Frontend
- [x] **T1.8 - Tela / Seção "Metas Nutricionais"** ✅
  - Form para:
    - Meta de calorias/dia
    - Metas de macros (proteína, carbo, gorduras)
    - Peso atual e peso alvo
  - Botão "Usar sugestão da Luna" (chama endpoint de sugestão ou pede via chat)

### Agente & UX
- [x] **T1.9 - Fluxo de perguntas sobre o usuário** ✅
  - No primeiro uso:
    - Perguntar peso, objetivo, etc.
    - Propor metas e já chamar `update_goals`
  - Instruir o agente a, periodicamente, sugerir revisão de metas ("você quer ajustar a meta de proteína?")

---

## 📈 Fase 2 - Evolução: Histórico, Gráficos e Progresso

**Objetivo**: Permitir que o usuário veja sua evolução ao longo do tempo.

### Backend
- [x] **T2.1 - Resumos por intervalo** ✅
  - Criar função para agrupar `get_summary` por faixa de datas (ex: últimos 7/30 dias)
  - Endpoint: `GET /health/history?start=YYYY-MM-DD&end=YYYY-MM-DD`
    - Retorna lista de summaries diários

- [x] **T2.2 - Registro de peso ao longo do tempo** ✅
  - Criar storage simples: `weights.json` por usuário
  - Endpoints:
    - `GET /health/weights` (lista com data + peso)
    - `POST /health/weights` (registrar peso do dia)

### Frontend
- [x] **T2.3 - Tela "Histórico"** ✅
  - Gráfico de:
    - Calorias por dia (últimos 7/30)
    - Peso ao longo do tempo
  - Resumos:
    - Média de calorias
    - Dias em que bateu a meta de proteína, etc.

### Agente & UX
- [x] **T2.4 - Insights automáticos** ✅
  - Instruir o `health_agent` a:
    - Quando o usuário perguntar "como estou indo?", usar tools de resumo/histórico
    - Responder com análise: "você bateu sua meta de proteína em 5 de 7 dias", etc.

---

## 🍽️ Fase 3 - Porções, Lembretes e Qualidade de Vida

**Objetivo**: Melhorar a experiência do dia a dia (porções mais naturais, lembretes).

### Backend
- [x] **T3.1 - Porções no banco de alimentos** ✅
  - Extender `foods_database.json` para ter:
    - Porções comuns (campo ex: `servings: { "fatia": 25, "xícara": 130 }`)
  - Helpers:
    - Dado (alimento, tipo de porção, quantidade), converter para gramas e usar `calculate_nutrition`

### Frontend
- [x] **T3.2 - UI de porções ao adicionar refeição** ✅
  - Ao escolher alimento:
    - Dropdown de porção (gramas / fatia / xícara / colher / unidade)
    - Cálculo automático de macros
  - **Nota**: Implementado no backend (ferramentas aceitam `portion_type` e `portion_quantity`)

- [x] **T3.3 - Lembretes básicos (web)** ✅
  - Configuração simples:
    - Ativar notificações tipo:
      - Lembrar de registrar café da manhã, almoço, jantar
      - Lembrar de beber água X vezes
  - Usar `Notification API` no navegador + `localStorage` (nada de backend ainda)

### Agente & UX
- [x] **T3.4 - Conversas sobre porções** ✅
  - Instruir o agente a:
    - Aceitar frases tipo "comi 2 fatias de pão integral"
    - Internamente mapear "fatia" para o peso médio (usando o helper)

---

## ☁️ Fase 4 - Sincronização e Mobile-Friendly

**Objetivo**: Permitir que o usuário use o Luna Health em múltiplos dispositivos.

### Backend
- [x] **T4.1 - Implementar Firebase (ou outro backend remoto) de verdade** ✅
  - Concretizar os TODOs em `server/health/storage.py`:
    - Salvar refeições/metas/peso em coleção remota por `user_id`
    - Manter fallback local
  - Garantir:
    - Consistência entre dispositivos
    - Resolução simples de conflitos (last write wins ou similar)

### Frontend (web + desktop + futuro mobile)
- [x] **T4.2 - Garantir que tudo usa `user_id`** ✅
  - Em `HealthChat` e no `HealthMode`:
    - Sempre passar `userId` correto vindo do `AuthContext`
    - Evitar "user_id = local" quando o usuário está logado

---

## 📝 Tasklist Consolidado (para organizar em issues/cards)

### EPIC 1 - Diário Visual e Metas Básicas

| ID | Tarefa | Prioridade | Estimativa | Status |
|----|--------|------------|------------|--------|
| T0.1 | Hardening de storage local | Alta | 2h | ⬜ |
| T0.2 | Melhorar logs e debug | Média | 1h | ⬜ |
| T0.3 | Ajustar prompt do `health_agent` | Alta | 2h | ⬜ |
| T0.4 | Mensagens de erro amigáveis | Média | 1h | ⬜ |
| T1.1 | Confirmar endpoints de diário | Alta | 1h | ⬜ |
| T1.2 | Endpoint de overview diário (opcional) | Baixa | 2h | ⬜ |
| T1.3 | Tela "Hoje" (diário) no `HealthMode` | **Crítica** | 8h | ⬜ |
| T1.4 | Modal de adicionar/editar/apagar refeição | **Crítica** | 4h | ⬜ |
| T1.5 | Integração com o chat | Alta | 2h | ⬜ |
| T1.6 | Onboarding leve no chat | Média | 2h | ⬜ |
| T1.7 | Usar campos de peso nas metas | Média | 1h | ⬜ |
| T1.8 | Endpoint de metas sugeridas (opcional) | Baixa | 4h | ⬜ |
| T1.9 | Tela/Seção de "Metas Nutricionais" | Alta | 4h | ⬜ |
| T1.10 | Fluxo de perguntas sobre o usuário | Média | 3h | ⬜ |

### EPIC 2 - Histórico, Gráficos e Progresso

| ID | Tarefa | Prioridade | Estimativa | Status |
|----|--------|------------|------------|--------|
| T2.1 | Endpoint de histórico diário | Alta | 4h | ⬜ |
| T2.2 | Storage de peso e endpoints | Alta | 3h | ⬜ |
| T2.3 | Tela "Histórico" | Alta | 8h | ⬜ |
| T2.4 | Ajuste do agente para insights de longo prazo | Média | 2h | ⬜ |

### EPIC 3 - Porções e Lembretes

| ID | Tarefa | Prioridade | Estimativa | Status |
|----|--------|------------|------------|--------|
| T3.1 | Extensão do banco de alimentos com porções | Alta | 4h | ⬜ |
| T3.2 | Helper de conversão porção → gramas | Alta | 2h | ⬜ |
| T3.3 | UI de porções no formulário de refeição | Alta | 4h | ⬜ |
| T3.4 | Sistema de lembretes local (web) | Média | 6h | ⬜ |
| T3.5 | Conversas sobre porções no agente | Média | 2h | ⬜ |

### EPIC 4 - Sincronização e Infra

| ID | Tarefa | Prioridade | Estimativa | Status |
|----|--------|------------|------------|--------|
| T4.1 | Implementar camada Firebase para Health | **Crítica** (futuro) | 16h | ⬜ |
| T4.2 | Garantir uso consistente de `user_id` no front | Alta | 2h | ⬜ |

---

## 🎯 Priorização Sugerida

### Sprint 1 (MVP - 2 semanas)
- **Foco**: Diário visual funcional
- **Tarefas**: T0.1, T0.3, T1.1, T1.3, T1.4, T1.5, T4.2
- **Resultado**: Usuário consegue ver e adicionar refeições visualmente + chat funciona

### Sprint 2 (Metas - 1 semana)
- **Foco**: Configuração de metas
- **Tarefas**: T1.7, T1.9, T1.10
- **Resultado**: Usuário configura metas facilmente e vê progresso no resumo

### Sprint 3 (Histórico - 1 semana)
- **Foco**: Visualização de progresso
- **Tarefas**: T2.1, T2.2, T2.3
- **Resultado**: Usuário vê gráficos de calorias e peso ao longo do tempo

### Sprint 4 (Qualidade - 1 semana)
- **Foco**: Melhorias de UX
- **Tarefas**: T3.1, T3.2, T3.3, T3.4
- **Resultado**: Porções mais naturais + lembretes básicos

### Sprint 5+ (Sincronização - futuro)
- **Foco**: Multi-dispositivo
- **Tarefas**: T4.1
- **Resultado**: Dados sincronizados entre web/desktop/mobile

---

## 📚 Notas Técnicas

### Arquivos Principais

**Backend:**
- `server/health/routes.py` - Rotas REST
- `server/health/storage.py` - Armazenamento local
- `server/health/foods.py` - Banco de alimentos
- `server/health/tools.py` - Ferramentas do agente
- `server/health_agent.py` - Agente especializado

**Frontend:**
- `src/components/health/HealthMode.jsx` - Componente principal
- `src/components/health/HealthChat.jsx` - Chat integrado
- `src/App.jsx` - Integração no app principal

**Dados:**
- `data/health/<user_id>/meals.json` - Refeições
- `data/health/<user_id>/goals.json` - Metas
- `data/health/foods_database.json` - Banco de alimentos

### Dependências Importantes

- FastAPI para rotas REST
- Firebase (futuro) para sincronização
- Notification API (browser) para lembretes
- Chart.js ou Recharts para gráficos (futuro)

---

## ✅ Checklist de Validação

Antes de considerar cada fase completa:

- [ ] **Fase 0**: Storage robusto, logs claros, agente responde bem
- [ ] **Fase 1**: Diário visual funciona, chat integrado, onboarding básico
- [ ] **Fase 1.5**: Metas configuráveis, sugestões funcionam
- [ ] **Fase 2**: Histórico e gráficos exibem dados corretos
- [ ] **Fase 3**: Porções funcionam, lembretes aparecem
- [ ] **Fase 4**: Sincronização entre dispositivos funciona

---

## 👥 Fase 5 - Sistema de Perfis e Vinculação (Avaliador/Aluno)

**Objetivo**: Permitir que nutricionistas/profissionais gerenciem e analisem dados de seus pacientes através de códigos de vinculação.

**Status**: 📋 Planejado

Esta fase está detalhada em um documento separado: **`LUNA_HEALTH_PROFILES_ROADMAP.md`**

### Resumo Rápido:
- Sistema de perfis (Aluno/Avaliador)
- Códigos de vinculação únicos
- Avaliador visualiza dados do aluno
- Chat contextual para avaliador analisar aluno específico

---

**Última atualização**: 2025-01-27  
**Versão do documento**: 1.1
