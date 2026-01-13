# 🔄 Luna Health - Refatoração do Sistema de Avaliador

## 📋 Visão Geral

Este documento apresenta uma análise do sistema atual de avaliador, identifica problemas, e propõe uma refatoração completa com uma nova arquitetura mais limpa, performática e escalável.

---

## 🔍 Análise do Sistema Atual

### Problemas Identificados

1. **Acoplamento Excessivo**
   - O modo de avaliador está completamente acoplado ao modo de aluno
   - Usa as mesmas tabs, componentes e fluxos
   - Parâmetro `view_as` espalhado por todo o código
   - Parâmetro `evaluator_id` usado em múltiplas camadas

2. **Complexidade de Estado**
   - Estado compartilhado entre modo aluno e avaliador
   - Lógica condicional complexa (`if evaluator_id`, `if view_as`)
   - Dificuldade de rastrear quem está visualizando o quê

3. **Performance**
   - Validações de permissão em cada requisição
   - Resolução de `user_id` vs `target_user_id` em múltiplos pontos
   - Queries duplicadas ao verificar permissões
   - Processamento de contexto misto (aluno + avaliador)

4. **Manutenibilidade**
   - Código difícil de entender e modificar
   - Bugs difíceis de rastrear (como o problema de `create_meal_plan`)
   - Testes complexos devido ao acoplamento
   - Difícil adicionar novas funcionalidades específicas para avaliadores

5. **UX/UI Confusa**
   - Interface misturada (aluno + avaliador na mesma tela)
   - Difícil distinguir quando está visualizando como avaliador
   - Navegação confusa entre alunos
   - Falta de um dashboard dedicado para avaliadores

---

## 🎯 Proposta de Nova Arquitetura

### Princípios de Design

1. **Separação Completa**
   - Módulo de avaliador completamente separado
   - API endpoints dedicados para avaliadores
   - Componentes React específicos para avaliador
   - Estado isolado

2. **Dashboard Dedicado**
   - Aba/modo separado para avaliadores
   - Interface otimizada para gerenciar múltiplos alunos
   - Visualizações agregadas e comparativas

3. **Performance**
   - Cache de permissões
   - Queries otimizadas
   - Lazy loading de dados de alunos
   - Paginação quando necessário

4. **Clareza**
   - Código mais simples e direto
   - Menos condicionais
   - Responsabilidades bem definidas

### Arquitetura Proposta

```
┌─────────────────────────────────────────────────────────────┐
│                    Luna Health - Frontend                    │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐          ┌──────────────────┐        │
│  │  Modo Aluno      │          │ Modo Avaliador   │        │
│  │  (Existente)     │          │  (Novo)          │        │
│  │                  │          │                  │        │
│  │  - TodayTab      │          │  - Dashboard     │        │
│  │  - GoalsTab      │          │  - StudentList   │        │
│  │  - HistoryTab    │          │  - StudentView   │        │
│  │  - HealthChat    │          │  - EvaluatorChat │        │
│  └──────────────────┘          └──────────────────┘        │
│                                                               │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    Luna Health - Backend                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌──────────────────┐          ┌──────────────────┐        │
│  │  Routes Aluno    │          │ Routes Avaliador │        │
│  │  /health/*       │          │ /health/evaluator│        │
│  │                  │          │      /*          │        │
│  └──────────────────┘          └──────────────────┘        │
│                                                               │
│  ┌──────────────────┐          ┌──────────────────┐        │
│  │  Tools Aluno     │          │ Tools Avaliador  │        │
│  │  (Simplificadas) │          │  (Dedicadas)     │        │
│  └──────────────────┘          └──────────────────┘        │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

### Estrutura de Dados Simplificada

```python
# Backend - Rotas separadas
GET  /health/evaluator/dashboard          # Estatísticas agregadas
GET  /health/evaluator/students           # Lista de alunos
GET  /health/evaluator/students/:id       # Dados de um aluno específico
POST /health/evaluator/students/:id/plan  # Criar plano para aluno
GET  /health/evaluator/students/:id/report # Relatório do aluno

# Frontend - Componentes separados
src/components/health/
  ├── student/              # Componentes do modo aluno (já existem)
  └── evaluator/            # NOVO - Componentes do avaliador
      ├── EvaluatorMode.jsx          # Componente principal
      ├── EvaluatorDashboard.jsx     # Dashboard com estatísticas
      ├── StudentList.jsx            # Lista de alunos
      ├── StudentDetail.jsx          # Detalhes de um aluno
      └── EvaluatorChat.jsx          # Chat específico (refatorado)
```

---

## 🗺️ Roadmap de Refatoração

### Fase 0: Preparação e Limpeza ⚠️ CRÍTICO

**Objetivo**: Remover todo o código do sistema atual de avaliador antes de implementar o novo.

#### Task 0.1: Identificar e Documentar Código a Remover
- [ ] Mapear todos os arquivos que contêm código relacionado a avaliador
- [ ] Criar lista de funções/métodos a remover
- [ ] Documentar dependências entre código a remover
- [ ] **Arquivos identificados**:
  - `server/health/tools.py` - Funções `_resolve_student_id`, tools de avaliador
  - `server/health/routes.py` - Parâmetros `view_as` em endpoints
  - `server/health/permissions.py` - Todo o arquivo (será refeito)
  - `server/health_agent.py` - Lógica de `evaluator_id` e `view_as_student_id`
  - `src/components/health/EvaluatorChat.jsx` - Remover (será refeito)
  - `src/components/health/EvaluatorDashboard.jsx` - Remover (será refeito)
  - `src/components/health/ProfileSelector.jsx` - Remover ou simplificar
  - `src/components/health/HealthMode.jsx` - Remover lógica de avaliador
  - `src/components/health/StudentLink.jsx` - Avaliar se mantém
  - `src/components/health/StudentSearch.jsx` - Avaliar se mantém

#### Task 0.2: Backup e Versionamento
- [ ] Criar branch `backup/evaluator-old-system`
- [ ] Commit do estado atual antes de remover código
- [ ] Criar tags para referência futura se necessário

#### Task 0.3: Remover Código do Backend
- [ ] Remover parâmetro `view_as` de todas as rotas em `server/health/routes.py`
- [ ] Remover função `resolve_user_id()` de `server/health/routes.py`
- [ ] Remover tools de avaliador de `server/health/tools.py`:
  - `get_student_data`
  - `list_all_students`
  - `generate_student_report`
  - `compare_students`
  - `create_meal_plan` (versão com `evaluator_id`)
- [ ] Remover parâmetro `evaluator_id` de `execute_health_tool()`
- [ ] Simplificar `create_preset()` removendo lógica de `evaluator_id`
- [ ] Remover `server/health/permissions.py` (será refeito na Fase 2)
- [ ] Remover lógica de `evaluator_id` e `view_as_student_id` de `server/health_agent.py`
- [ ] Atualizar imports e dependências

#### Task 0.4: Remover Código do Frontend
- [ ] Remover `src/components/health/EvaluatorChat.jsx`
- [ ] Remover `src/components/health/EvaluatorDashboard.jsx` (atual)
- [ ] Remover `src/components/health/ProfileSelector.jsx`
- [ ] Remover `src/components/health/StudentLink.jsx` (ou manter se for útil)
- [ ] Limpar `src/components/health/HealthMode.jsx`:
  - Remover estado `viewAsStudentId`
  - Remover lógica de avaliador
  - Remover imports de componentes de avaliador
  - Simplificar para apenas modo aluno
- [ ] Remover referências a avaliador de outros componentes

#### Task 0.5: Limpeza de Perfis (Opcional)
- [ ] Decidir: manter dados de perfis existentes ou limpar?
- [ ] Se limpar: criar script de migração/limpeza
- [ ] Documentar decisão

#### Task 0.6: Testes Pós-Remoção
- [ ] Testar modo aluno ainda funciona corretamente
- [ ] Verificar que não há erros de compilação
- [ ] Verificar que não há imports quebrados
- [ ] Testar endpoints básicos do health
- [ ] Verificar logs para erros

---

### Fase 1: Nova API Backend para Avaliador

**Objetivo**: Criar endpoints dedicados e limpos para avaliadores.

#### Task 1.1: Novo Módulo de Permissões Simplificado
- [ ] Criar `server/health/evaluator_permissions.py`
- [ ] Função simples: `is_evaluator(user_id) -> bool`
- [ ] Função simples: `can_access_student(evaluator_id, student_id) -> bool`
- [ ] Cache de permissões (opcional, mas recomendado)
- [ ] Testes unitários

#### Task 1.2: Novos Endpoints de Avaliador
- [ ] Criar `server/health/evaluator_routes.py`
- [ ] Endpoint: `GET /health/evaluator/dashboard`
  - Estatísticas agregadas de todos os alunos
  - Total de alunos, média de calorias, proteínas, etc.
  - Alunos com baixa aderência
- [ ] Endpoint: `GET /health/evaluator/students`
  - Lista todos os alunos vinculados
  - Informações básicas (nome, email, última atualização)
  - Opcional: filtros e paginação
- [ ] Endpoint: `GET /health/evaluator/students/:student_id`
  - Dados completos de um aluno específico
  - Refeições, metas, histórico, etc.
  - Formato simplificado e otimizado
- [ ] Endpoint: `POST /health/evaluator/students/:student_id/meal-plan`
  - Criar plano alimentar para aluno específico
  - Sem lógica complexa de `evaluator_id`
- [ ] Endpoint: `GET /health/evaluator/students/:student_id/report`
  - Gerar relatório completo do aluno
- [ ] Endpoint: `GET /health/evaluator/compare`
  - Comparar múltiplos alunos
  - Parâmetros: `?students=id1,id2,id3`

#### Task 1.3: Integrar Novas Rotas
- [ ] Registrar `evaluator_routes` no router principal
- [ ] Adicionar prefixo `/health/evaluator`
- [ ] Configurar middleware de autenticação
- [ ] Adicionar validação de permissões em cada endpoint

#### Task 1.4: Tools Simplificadas para Avaliador
- [ ] Criar `server/health/evaluator_tools.py`
- [ ] Tools específicas:
  - `get_evaluator_dashboard()` - Dashboard agregado
  - `list_evaluator_students()` - Lista alunos
  - `get_student_full_data(student_id)` - Dados completos
  - `create_student_meal_plan(student_id, presets)` - Criar plano
  - `generate_student_report(student_id)` - Relatório
  - `compare_students(student_ids)` - Comparação
- [ ] Sem parâmetros confusos como `evaluator_id` ou `view_as`
- [ ] Sempre recebe `user_id` do contexto (já validado como avaliador)

#### Task 1.5: Atualizar Health Agent para Avaliador
- [ ] Criar `server/health_evaluator_agent.py` (novo arquivo)
- [ ] Versão simplificada do health_agent apenas para avaliadores
- [ ] Sem lógica de `view_as` ou resolução de IDs
- [ ] Tools específicas de avaliador
- [ ] Prompt do sistema otimizado para avaliadores

#### Task 1.6: Testes da Nova API
- [ ] Testes unitários dos endpoints
- [ ] Testes de permissões
- [ ] Testes de integração
- [ ] Testes de performance (comparar com sistema antigo)

---

### Fase 2: Novo Frontend para Avaliador

**Objetivo**: Criar interface dedicada e limpa para avaliadores.

#### Task 2.1: Estrutura de Componentes
- [ ] Criar diretório `src/components/health/evaluator/`
- [ ] Planejar estrutura de componentes
- [ ] Criar arquivos base (vazios inicialmente)

#### Task 2.2: Componente Principal - EvaluatorMode
- [ ] Criar `src/components/health/evaluator/EvaluatorMode.jsx`
- [ ] Similar ao `HealthMode`, mas dedicado para avaliadores
- [ ] Gerenciar estado isolado
- [ ] Navegação entre dashboard, lista de alunos, e chat
- [ ] Integração com AuthContext para identificar avaliador

#### Task 2.3: Dashboard do Avaliador
- [ ] Criar `src/components/health/evaluator/EvaluatorDashboard.jsx`
- [ ] Cards com estatísticas agregadas:
  - Total de alunos
  - Média de calorias/proteínas
  - Alunos ativos
  - Alunos com baixa aderência
- [ ] Gráficos (opcional):
  - Distribuição de progresso
  - Tendências agregadas
- [ ] Lista rápida de alunos (últimos atualizados)
- [ ] Integração com API `/health/evaluator/dashboard`

#### Task 2.4: Lista de Alunos
- [ ] Criar `src/components/health/evaluator/StudentList.jsx`
- [ ] Tabela/lista de alunos vinculados
- [ ] Informações: nome, email, última atualização, status
- [ ] Busca/filtros
- [ ] Ação: "Ver detalhes" → navega para StudentDetail
- [ ] Integração com API `/health/evaluator/students`

#### Task 2.5: Detalhes do Aluno
- [ ] Criar `src/components/health/evaluator/StudentDetail.jsx`
- [ ] Visualização completa dos dados de um aluno
- [ ] Tabs: Resumo, Refeições, Metas, Histórico, Relatórios
- [ ] Ações: Criar plano, Gerar relatório, etc.
- [ ] Integração com API `/health/evaluator/students/:id`

#### Task 2.6: Chat do Avaliador (Refatorado)
- [ ] Criar `src/components/health/evaluator/EvaluatorChat.jsx`
- [ ] Chat dedicado para avaliadores
- [ ] Contexto claro: "Você está conversando como avaliador"
- [ ] Integração com `health_evaluator_agent`
- [ ] Tools específicas de avaliador disponíveis
- [ ] Seleção de aluno no contexto (opcional, pode ser via menção)

#### Task 2.7: Integração no HealthMode Principal
- [ ] Modificar `src/components/health/HealthMode.jsx` ou App principal
- [ ] Detectar se usuário é avaliador
- [ ] Se avaliador: mostrar opção "Modo Avaliador" (nova aba/modo)
- [ ] Se aluno: mostrar modo aluno normal
- [ ] Navegação clara entre modos

#### Task 2.8: Estilização e UX
- [ ] Design consistente com o restante da aplicação
- [ ] Diferenciar visualmente modo avaliador do modo aluno
- [ ] Feedback claro de ações
- [ ] Loading states apropriados
- [ ] Tratamento de erros

#### Task 2.9: Testes do Frontend
- [ ] Testes de componentes (opcional, mas recomendado)
- [ ] Testes de integração com API
- [ ] Testes manuais de fluxo completo

---

### Fase 3: Migração e Limpeza Final

**Objetivo**: Migrar dados existentes (se necessário) e limpar código antigo.

#### Task 3.1: Migração de Dados (Se Necessário)
- [ ] Avaliar se há dados de avaliador que precisam ser migrados
- [ ] Criar script de migração se necessário
- [ ] Executar migração em ambiente de teste
- [ ] Validar dados migrados

#### Task 3.2: Limpeza Final
- [ ] Remover código comentado
- [ ] Remover imports não utilizados
- [ ] Atualizar documentação
- [ ] Atualizar README se necessário
- [ ] Remover arquivos de backup se não forem mais necessários

#### Task 3.3: Documentação
- [ ] Documentar nova arquitetura
- [ ] Documentar APIs do avaliador
- [ ] Criar guia de uso para avaliadores
- [ ] Atualizar CHANGELOG

#### Task 3.4: Testes Finais
- [ ] Testes end-to-end completos
- [ ] Testes de performance
- [ ] Testes de segurança (permissões)
- [ ] Validação com usuários (se possível)

---

## 📊 Comparação: Antes vs Depois

### Antes (Sistema Atual)
- ❌ Código acoplado e confuso
- ❌ Parâmetros `view_as` e `evaluator_id` espalhados
- ❌ Performance ruim (validações repetidas)
- ❌ Difícil de manter e debugar
- ❌ UX confusa (modo misto)

### Depois (Sistema Proposto)
- ✅ Código separado e limpo
- ✅ Endpoints dedicados e claros
- ✅ Performance melhorada (cache, queries otimizadas)
- ✅ Fácil de manter e estender
- ✅ UX clara (dashboard dedicado)

---

## 🎯 Benefícios Esperados

1. **Performance**
   - Redução de validações redundantes
   - Queries mais eficientes
   - Cache de permissões
   - Menos processamento por requisição

2. **Manutenibilidade**
   - Código mais simples e direto
   - Responsabilidades claras
   - Fácil adicionar novas funcionalidades
   - Testes mais fáceis

3. **Experiência do Usuário**
   - Interface dedicada para avaliadores
   - Navegação clara
   - Feedback melhor
   - Dashboard útil e informativo

4. **Escalabilidade**
   - Fácil adicionar novos recursos
   - Estrutura preparada para crescimento
   - Separação permite otimizações específicas

---

## ⚠️ Riscos e Considerações

1. **Breaking Changes**
   - Sistema atual será completamente removido
   - Usuários avaliadores existentes precisarão usar nova interface
   - Mitigação: Comunicar mudanças e fornecer guia de migração

2. **Tempo de Desenvolvimento**
   - Refatoração completa leva tempo
   - Fase 0 (remoção) é crítica e deve ser feita com cuidado
   - Mitigação: Fazer em fases, testando cada uma

3. **Dados Existentes**
   - Perfis de avaliador existentes continuarão funcionando
   - Dados de alunos não serão afetados
   - Mitigação: Testar migração em ambiente de desenvolvimento

---

## 📝 Notas Finais

- Este roadmap é um guia e pode ser ajustado conforme necessário
- Priorizar Fase 0 (remoção) para limpar o código atual
- Fazer commits frequentes e bem descritos
- Testar cada fase antes de prosseguir
- Documentar decisões importantes durante o processo

---

**Data de Criação**: 2024
**Status**: 📋 Planejamento
**Última Atualização**: 2024
