# Task 0.1: Mapeamento Completo de Código a Remover

**Status**: ✅ Completo  
**Data**: 2024  
**Objetivo**: Identificar e documentar TODO o código relacionado ao sistema de avaliador atual que precisa ser removido antes da refatoração.

---

## 📋 Sumário Executivo

Este documento mapeia **todos** os arquivos, funções, métodos, parâmetros e dependências relacionados ao sistema atual de avaliador que devem ser removidos na Fase 0 da refatoração.

**Total de arquivos afetados**: 18  
**Total de funções/métodos a remover/modificar**: ~45  
**Arquivos a remover completamente**: 5  

---

## 🔴 BACKEND - Arquivos a Modificar/Remover

### 1. `server/health/tools.py` ⚠️ MODIFICAR

#### Funções/Métodos a Remover:

1. ✅ **`_resolve_student_id(evaluator_id: str, student_name_or_id: str)`** (linhas ~662-702) **REMOVIDO**
   - Helper function para resolver student_id a partir de nome ou ID
   - Usada apenas por tools de avaliador
   - **Dependências**: `get_evaluator_students`, Firebase (`get_user_profile`, `get_user_info`)
   - **Usada por**: `get_student_data` tool

2. ✅ **Parâmetro `evaluator_id` da função `execute_health_tool()`** (linha ~749) **REMOVIDO**
   - Assinatura atual: `async def execute_health_tool(name: str, args: Dict, user_id: str = "local", evaluator_id: str = None)`
   - Remover parâmetro `evaluator_id` completamente
   - Remover toda lógica condicional que usa `evaluator_id`

3. ✅ **Tools de Avaliador no schema `HEALTH_TOOLS_SCHEMA`** **REMOVIDO**:
   - ✅ `get_student_data` (linhas ~350-362) **REMOVIDO**
   - ✅ `list_all_students` (linhas ~367-374) **REMOVIDO**
   - ✅ `compare_students` (linhas ~379-412) **REMOVIDO**
   - ✅ `get_student_summary` (linhas ~403-431) **REMOVIDO** (adicional identificado)
   - ✅ `generate_student_report` (linhas ~435-456) **REMOVIDO**

4. **Implementações das Tools de Avaliador**: ✅ REMOVIDO
   - `get_student_data` (linhas ~1220-1275) ✅
   - `list_all_students` (linhas ~1277-1332) ✅
   - `compare_students` (linhas ~1334-1549) ✅
   - `get_student_summary` ✅
   - `generate_student_report` (linhas ~1552-1643) ✅

5. **Lógica de `evaluator_id` em `create_meal_plan`**: ✅ REMOVIDO
   - Parâmetro `for_student_id` removido do schema ✅
   - Parâmetro `for_student_id` removido da função ✅
   - Lógica `created_for=for_student_id or user_id` simplificada (agora usa padrão `user_id`) ✅

6. **Lógica de `evaluator_id` em `list_meal_presets`**: ✅ REMOVIDO
   - ✅ Removido `include_evaluator=True` de `get_presets()` (agora usa padrão)
   - ✅ Removida separação entre `own_presets` e `evaluator_presets`
   - ✅ Simplificada mensagem e retorno

7. **Lógica de `evaluator_id` em `create_meal_preset`**: ✅ REMOVIDO
   - ✅ Parâmetro `for_student_id` removido do schema
   - ✅ Parâmetro `for_student_id` removido da função
   - ✅ Removido `created_for=for_student_id` da chamada `create_preset()`

8. **Imports relacionados**: ✅ REMOVIDO
   - ✅ `get_evaluator_students` removido do import (não usado em tools.py)

#### Dependências:
- Usa `get_evaluator_students` de `profiles.py`
- Usa Firebase para buscar informações de usuários

---

### 2. `server/health/routes.py` ⚠️ MODIFICAR

#### Funções/Métodos a Remover:

1. **`resolve_user_id(user_id: str, view_as: Optional[str] = None)`** (linhas ~328-382)
   - Função helper que resolve user_id baseado em `view_as`
   - **Dependências**: `validate_data_access` de `permissions.py`, `get_health_profile` de `profiles.py`
   - **Usada por**: TODOS os endpoints que aceitam `view_as`

2. **Parâmetro `view_as` dos seguintes endpoints**:
   - `get_meals()` (linha ~440)
   - `create_meal()` (linha ~490)
   - `edit_meal()` (linha ~532)
   - `remove_meal()` (linha ~583)
   - `get_user_goals()` (linha ~623)
   - `update_user_goals()` (linha ~651)
   - `list_meal_presets()` (linha ~1028)
   - `create_meal_preset()` (linha ~1079)
   - `update_meal_preset()` (linha ~1137)
   - `delete_meal_preset()` (linha ~1184)
   - `get_history()` (linha ~1219)
   - `get_weights_endpoint()` (linha ~1299)
   - `create_weight()` (linha ~1337)
   - `delete_weight_endpoint()` (linha ~1386)
   - `get_daily_overview()` (linha ~1427)
   - `get_nutrition_summary()` (linha ~1501)

3. **Chamadas a `resolve_user_id()`** dentro dos endpoints acima
   - Todas as chamadas `target_user_id = resolve_user_id(user_id, view_as)` devem ser removidas
   - Substituir por usar `user_id` diretamente

4. **Endpoints relacionados a perfis de avaliador** (decidir se manter ou remover):
   - `get_evaluator_code()` (linha ~1784) - **MANTER** (será usado no novo sistema)
   - `link_to_evaluator()` (linha ~1821) - **MANTER** (será usado no novo sistema)
   - `get_evaluator_students()` (linha ~1984) - **MANTER** (será usado no novo sistema)
   - `get_evaluator()` (linha ~2009) - **MANTER** (será usado no novo sistema)
   - `unlink_from_evaluator()` (linha ~2064) - **MANTER** (será usado no novo sistema)

#### Dependências:
- Usa `validate_data_access` de `permissions.py`
- Usa `get_health_profile` de `profiles.py`

---

### 3. `server/health/permissions.py` 🔴 REMOVER COMPLETAMENTE ✅ REMOVIDO

**Arquivo inteiro foi removido** - será refeito na Fase 1.

#### Funções que foram removidas: ✅
- ✅ `can_view_student_data(evaluator_id: str, student_id: str)` (linhas ~24-67)
- ✅ `get_accessible_students(evaluator_id: str)` (linhas ~69-97)
- ✅ `validate_data_access(user_id: str, target_user_id: str, action: str)` (linhas ~99-154)
- ✅ `is_evaluator(user_id: str)` (linhas ~156-171)
- ✅ `is_student(user_id: str)` (linhas ~173-188)

#### Dependências:
- Usava `get_health_profile`, `get_evaluator_students`, `get_student_evaluator` de `profiles.py`

#### Arquivos que importavam este módulo: ✅ REMOVIDOS
- ✅ `server/health/routes.py` (import `validate_data_access`) - já removido na seção 2
- ✅ `server/health_agent.py` (import `validate_data_access`) - removido
- ✅ `server/health/tools.py` - verificado, não tinha imports

---

### 4. `server/health/profiles.py` ⚠️ MANTER (mas algumas funções serão usadas no novo sistema)

**ATENÇÃO**: Este arquivo NÃO deve ser removido completamente. Ele contém funções que serão necessárias no novo sistema (criação de perfis, vinculação, etc.).

#### Funções que PODEM ser mantidas (serão usadas no novo sistema):
- `get_health_profile()` - MANTER
- `create_health_profile()` - MANTER
- `update_health_profile()` - MANTER
- `generate_evaluator_code()` - MANTER
- `validate_code()` - MANTER
- `link_student_to_evaluator()` - MANTER
- `get_evaluator_students()` - MANTER
- `get_student_evaluator()` - MANTER
- `unlink_student()` - MANTER

#### Nenhuma função de `profiles.py` deve ser removida agora
- Todas serão necessárias no novo sistema
- A diferença será como elas são usadas (não mais com `view_as`, mas com endpoints dedicados)

---

### 5. `server/health/meal_presets.py` ⚠️ MODIFICAR

#### Funções/Métodos a Modificar:

1. **`get_presets(user_id: str, include_evaluator: bool = True)`** (linha ~154)
   - Remover parâmetro `include_evaluator`
   - Remover lógica que busca presets de avaliador
   - Simplificar para retornar apenas presets do próprio usuário

2. **`_get_presets_for_student(evaluator_id: str, student_id: str)`** (linha ~198)
   - **REMOVER COMPLETAMENTE** - função helper privada que busca presets criados por avaliador

3. **Lógica de `evaluator_id` e `created_by_evaluator` em `create_preset()`**
   - Remover parâmetro `evaluator_id` (se existir)
   - Remover campo `created_by_evaluator` dos presets
   - Simplificar criação de presets

4. **Filtros relacionados a avaliador em outras funções**
   - Verificar outras funções que filtram por `created_by_evaluator` ou `evaluator_id`

#### Dependências:
- Pode usar `get_evaluator_students` - remover essas dependências

---

### 6. `server/health_agent.py` ✅ MODIFICADO

#### Código Removido:

1. ✅ **Lógica de `view_as_student_id`** (linhas ~52-200+)
   - ✅ Todo o bloco que valida e processa `request.view_as_student_id`
   - ✅ Validações de permissão usando `validate_data_access`
   - ✅ Construção de contexto `view_as_context`
   - ✅ Busca de lista de alunos para avaliadores
   - ✅ Código órfão após return removido

2. ✅ **Variáveis relacionadas**:
   - ✅ `view_as_context` removida
   - ✅ `student_name` removida
   - ✅ `students_list` removida
   - ✅ `is_evaluator` removida
   - ✅ `actual_user_id` simplificada para `target_user_id`
   - ✅ Lógica de construção de `students_list` removida

3. ✅ **Parâmetro `evaluator_id` na chamada de `execute_health_tool()`**
   - ✅ Já estava correto (sem `evaluator_id`)
   - ✅ Simplificado para: `result = await execute_health_tool(name, args, user_id=target_user_id)`

4. ✅ **Imports relacionados**:
   - ✅ `validate_data_access` já havia sido removido anteriormente
   - ✅ Imports de `get_evaluator_students` removidos

5. ✅ **System prompt modifications para avaliadores**
   - ✅ Removido todo o texto que adiciona contexto de avaliador ao prompt
   - ✅ Simplificado prompt para apenas modo aluno
   - ✅ Removido `evaluator_mode` de `get_system_prompt()`
   - ✅ Removida lógica condicional de construção de prompt

6. ✅ **Docstring atualizada**:
   - ✅ Removida referência a `view_as_student_id`

#### Dependências:
- ✅ `validate_data_access` já removido (permissions.py deletado)
- ✅ `get_evaluator_students` não é mais usado

---

### 7. `server/chat.py` ✅ MODIFICADO

#### Código Removido:

1. ✅ **Parâmetro `view_as_student_id` em `ChatRequest`**
   - ✅ Campo `view_as_student_id` removido do modelo `ChatRequest`

#### Dependências:
- ✅ Nenhuma dependência encontrada

---

### 8. `server/config.py` ✅ MODIFICADO

#### Código Removido:

1. ✅ **Parâmetro `evaluator_mode` na função `get_system_prompt()`**
   - ✅ Parâmetro removido da assinatura da função
   - ✅ Documentação do parâmetro removida

2. ✅ **Constante `EVALUATOR_SYSTEM_PROMPT`**
   - ✅ Bloco completo removido (linhas 608-745)

3. ✅ **Lógica condicional que usa `evaluator_mode`**
   - ✅ Condição `if health_mode and evaluator_mode:` removida

---

## 🟡 FRONTEND - Arquivos a Modificar/Remover

### 9. `src/components/health/EvaluatorChat.jsx` ✅ REMOVIDO

**Arquivo removido completamente** - será refeito na Fase 2.

#### Código Removido:
- ✅ Arquivo `EvaluatorChat.jsx` deletado
- ✅ Import removido de `HealthMode.jsx`
- ✅ Renderização condicional removida (substituída por `HealthChat`)

#### Dependências:
- ✅ Referências removidas de `HealthMode.jsx`

---

### 10. `src/components/health/EvaluatorDashboard.jsx` ✅ REMOVIDO

**Arquivo removido completamente** - será refeito na Fase 2.

#### Código Removido:
- ✅ Arquivo `EvaluatorDashboard.jsx` deletado
- ✅ Import removido de `HealthMode.jsx`
- ✅ Import removido de `usePreloader.js`
- ✅ Renderização condicional da tab "dashboard" removida

#### Dependências:
- ✅ Referências removidas de `HealthMode.jsx`
- ✅ Referência removida de `usePreloader.js`

---

### 11. `src/components/health/ProfileSelector.jsx` ✅ REMOVIDO

**Arquivo removido completamente** - será refeito na Fase 2 com abordagem diferente.

#### Código Removido:
- ✅ Arquivo `ProfileSelector.jsx` deletado
- ✅ Import removido de `HealthMode.jsx`
- ✅ Import removido de `usePreloader.js`
- ✅ Estado `showProfileSelector` removido
- ✅ Função `handleProfileSelected` removida
- ✅ Função `handleOpenProfileSelector` removida
- ✅ Renderização condicional do ProfileSelector removida
- ✅ Botão "Trocar perfil" removido

#### Dependências:
- ✅ Referências removidas de `HealthMode.jsx`
- ✅ Referência removida de `usePreloader.js`

---

### 12. `src/components/health/StudentLink.jsx` ✅ REMOVIDO

**Arquivo removido completamente** - será refeito no novo sistema.

#### Código Removido:
- ✅ Arquivo `StudentLink.jsx` deletado
- ✅ Import removido de `HealthMode.jsx`
- ✅ Import removido de `usePreloader.js`
- ✅ Renderização condicional da tab "link" removida

#### Dependências:
- ✅ Referências removidas de `HealthMode.jsx`
- ✅ Referência removida de `usePreloader.js`

---

### 13. `src/components/health/StudentSearch.jsx` ⚠️ DECIDIR (Provavelmente REMOVER)

**Avaliar se deve ser removido ou mantido para uso futuro.**

#### O que este arquivo contém:
- Busca de alunos para avaliadores
- Componente de busca/filtro

#### Decisão:
- Provavelmente será refeito no novo sistema
- **Recomendação**: REMOVER

---

### 14. `src/components/health/HealthMode.jsx` ⚠️ MODIFICAR SIGNIFICATIVAMENTE

#### Estado a Remover:

1. **`viewAsStudentId`** (linha ~50)
   - Estado: `const [viewAsStudentId, setViewAsStudentId] = useState(null);`
   - Todas as referências a este estado

2. **`showProfileSelector`** (linha ~51)
   - Estado: `const [showProfileSelector, setShowProfileSelector] = useState(false);`
   - Se o ProfileSelector for removido, remover este estado

3. **`evaluatorStudents`** (linha ~52)
   - Estado: `const [evaluatorStudents, setEvaluatorStudents] = useState([]);`

4. **`evaluatorStudentsInfo`** (linha ~53)
   - Estado: `const [evaluatorStudentsInfo, setEvaluatorStudentsInfo] = useState({});`

5. **`loadingStudents`** (linha ~54)
   - Estado: `const [loadingStudents, setLoadingStudents] = useState(false);`

#### Funções/Métodos a Remover:

1. **`loadEvaluatorStudents()`** (linhas ~159-188)
   - Função completa que carrega lista de alunos

2. **`handleStudentSearchSelect()`** (linhas ~192-206)
   - Função que trata seleção de aluno na busca

3. **`handleOpenProfileSelector()`** (linhas ~208-213)
   - Função que abre seletor de perfil

4. **`handleProfileSelected()`** (linhas ~147-157)
   - Ou modificar para remover lógica de avaliador

#### Hooks/Imports a Remover:

1. **`useHealthData(userId, viewAsStudentId)`** (linha ~57)
   - Mudar para: `useHealthData(userId)` (remover segundo parâmetro)

2. **Imports de componentes de avaliador**:
   - `EvaluatorChat` (linha ~22)
   - `EvaluatorDashboard` (linha ~28)
   - `ProfileSelector` (linha ~27)
   - `StudentLink` (linha ~29) - se for removido
   - `StudentSearch` (linha ~30) - se for removido

#### Lógica Condicional a Remover:

1. **Verificação de tipo de perfil para carregar alunos** (linhas ~140-142)
   - `if (healthProfile.type === "evaluator") { loadEvaluatorStudents(); }`

2. **Renderização condicional de componentes de avaliador**
   - Toda lógica que renderiza `EvaluatorChat`, `EvaluatorDashboard`, `ProfileSelector` baseado em `healthProfile.type === "evaluator"`

3. **Lógica de tabs/views para avaliadores**
   - Qualquer lógica especial para avaliadores nas tabs

#### Dependências:
- Usa `useHealthData` hook (que também precisa ser modificado)
- Renderiza componentes de avaliador condicionalmente

---

### 15. `src/components/health/HealthChat.jsx` ⚠️ VERIFICAR

#### Código a Verificar:

1. **Parâmetro `view_as_student_id` nas requisições** (se houver)
   - Verificar se há lógica que passa `view_as_student_id` para API
   - Remover se existir

2. **Lógica relacionada a avaliador** (se houver)
   - Verificar imports ou referências a avaliador

#### Dependências:
- Pode não ter código relacionado, apenas verificar

---

### 16. `src/components/health/tabs/MealPlanTab.jsx` ⚠️ VERIFICAR

#### Código a Verificar:

1. **Lógica de presets de avaliador** (se houver)
   - Verificar se há filtros ou lógica que diferencia presets de avaliador
   - Remover se existir

---

### 17. `src/hooks/useHealthData.js` ⚠️ MODIFICAR

#### Parâmetros a Remover:

1. **`viewAsStudentId` do hook** (linha ~9)
   - Assinatura atual: `export function useHealthData(userId, viewAsStudentId = null)`
   - Mudar para: `export function useHealthData(userId)`

#### Código a Remover:

1. **Parâmetro `view_as` em todas as requisições** (linhas ~72, ~104, ~131, ~163)
   - Remover: `const viewAsParam = viewAsStudentId ? `&view_as=${viewAsStudentId}` : '';`
   - Remover: `${viewAsParam}` de todas as URLs de fetch

2. **Dependências do `useCallback` e `useEffect`** (linhas ~98, ~112, ~154, ~180, ~190, ~212)
   - Remover `viewAsStudentId` das arrays de dependências

3. **Refs relacionadas** (linhas ~186, ~190, ~193)
   - `lastViewAsRef` - remover se existir

#### Dependências:
- Usado por: `HealthMode.jsx`

---

### 18. `src/contexts/AuthContext.jsx` ⚠️ VERIFICAR

#### Código a Verificar:

1. **Lógica relacionada a perfil de avaliador** (se houver)
   - Verificar se há estado ou lógica que armazena tipo de perfil
   - Provavelmente não há, mas verificar

---

## 📊 Tabela de Dependências

### Dependências entre Arquivos

```
server/health/tools.py
  └─> server/health/profiles.py (get_evaluator_students)
  └─> server/health/permissions.py (se houver imports)

server/health/routes.py
  └─> server/health/permissions.py (validate_data_access)
  └─> server/health/profiles.py (get_health_profile)

server/health_agent.py
  └─> server/health/permissions.py (validate_data_access)
  └─> server/health/profiles.py (get_health_profile, get_evaluator_students)
  └─> server/health/tools.py (execute_health_tool)

src/components/health/HealthMode.jsx
  └─> src/components/health/EvaluatorChat.jsx
  └─> src/components/health/EvaluatorDashboard.jsx
  └─> src/components/health/ProfileSelector.jsx
  └─> src/components/health/StudentLink.jsx (se usado)
  └─> src/components/health/StudentSearch.jsx (se usado)
  └─> src/hooks/useHealthData.js

src/hooks/useHealthData.js
  └─> API endpoints com parâmetro view_as
```

---

## 🎯 Ordem Recomendada de Remoção

Para evitar quebrar dependências, seguir esta ordem:

### Fase 0.3.1: Backend - Remover Imports e Dependências
1. Remover imports de `permissions.py` de todos os arquivos
2. Remover função `resolve_user_id()` de `routes.py`
3. Remover função `_resolve_student_id()` de `tools.py`

### Fase 0.3.2: Backend - Remover Tools de Avaliador
4. Remover tools de avaliador do schema em `tools.py`
5. Remover implementações das tools de avaliador em `tools.py`
6. Remover parâmetro `evaluator_id` de `execute_health_tool()`

### Fase 0.3.3: Backend - Simplificar Endpoints
7. Remover parâmetro `view_as` de todos os endpoints em `routes.py`
8. Remover chamadas a `resolve_user_id()` nos endpoints
9. Simplificar `meal_presets.py`

### Fase 0.3.4: Backend - Simplificar Agent
10. Remover lógica de `view_as_student_id` de `health_agent.py`
11. Remover parâmetro `evaluator_id` das chamadas de tools

### Fase 0.3.5: Backend - Remover Módulo de Permissões
12. Deletar arquivo `server/health/permissions.py`

### Fase 0.4.1: Frontend - Remover Componentes
13. Deletar `EvaluatorChat.jsx`
14. Deletar `EvaluatorDashboard.jsx`
15. Deletar `ProfileSelector.jsx`
16. Deletar `StudentLink.jsx` (se decidido)
17. Deletar `StudentSearch.jsx` (se decidido)

### Fase 0.4.2: Frontend - Simplificar HealthMode
18. Remover estado relacionado a avaliador de `HealthMode.jsx`
19. Remover funções relacionadas a avaliador de `HealthMode.jsx`
20. Remover imports de componentes de avaliador de `HealthMode.jsx`
21. Remover renderização condicional de componentes de avaliador

### Fase 0.4.3: Frontend - Simplificar Hook
22. Remover parâmetro `viewAsStudentId` de `useHealthData.js`
23. Remover lógica de `view_as` das requisições
24. Atualizar dependências de hooks

---

## ⚠️ Cuidados e Validações

### Antes de Remover:

1. **Verificar que modo aluno ainda funciona**
   - Testar todas as funcionalidades básicas do health mode
   - Verificar que não há erros de compilação

2. **Verificar imports quebrados**
   - Garantir que todos os imports sejam atualizados
   - Remover imports não utilizados

3. **Verificar testes** (se existirem)
   - Atualizar ou remover testes relacionados a avaliador

4. **Backup do código**
   - Criar branch de backup antes de começar
   - Commits frequentes durante remoção

### Após Remover:

1. **Testar compilação**
   - Frontend: `npm run build` (ou equivalente)
   - Backend: Verificar imports Python

2. **Testar funcionalidades básicas**
   - Criar perfil de aluno
   - Adicionar refeição
   - Visualizar metas
   - Ver histórico

3. **Verificar logs**
   - Não deve haver erros relacionados a código removido
   - Verificar console do navegador

---

## 📝 Notas Adicionais

1. **Arquivos de Teste**: Há vários arquivos de teste relacionados a avaliador:
   - `test_health_profiles_p*.py`
   - `test_health_phase5_evaluator.py`
   - `test_health_phase6_backend.py`
   - Estes podem ser removidos ou atualizados conforme necessário

2. **Documentação**: 
   - `LUNA_HEALTH_PROFILES_ROADMAP.md` - Documento antigo, pode ser mantido como referência ou removido

3. **Dados Existentes**:
   - Perfis de avaliador no banco de dados não precisam ser removidos
   - Dados de alunos vinculados podem ser mantidos
   - O novo sistema usará a mesma estrutura de dados básica

---

## ✅ Checklist de Validação Final

Após completar a remoção, verificar:

- [ ] Nenhum arquivo importa `permissions.py`
- [ ] Nenhum arquivo usa `view_as` como parâmetro
- [ ] Nenhum arquivo usa `evaluator_id` como parâmetro
- [ ] Nenhum arquivo usa `view_as_student_id`
- [ ] Nenhum componente React renderiza `EvaluatorChat`, `EvaluatorDashboard`, `ProfileSelector`
- [ ] Frontend compila sem erros
- [ ] Backend inicia sem erros
- [ ] Modo aluno funciona corretamente
- [ ] Não há referências a código removido em logs/console
- [ ] Imports estão todos corretos

---

## 📊 Progresso da Remoção

### ✅ Etapas Concluídas:

1. ✅ **Função `_resolve_student_id` removida** de `server/health/tools.py`
2. ✅ **Tools de avaliador removidas do schema** (`HEALTH_TOOLS_SCHEMA`):
   - ✅ `get_student_data`
   - ✅ `list_all_students`
   - ✅ `compare_students`
   - ✅ `get_student_summary` (adicional identificado)
   - ✅ `generate_student_report`
3. ✅ **Implementações das Tools de Avaliador removidas** (blocos `elif` em `execute_health_tool`):
   - ✅ `get_student_data`
   - ✅ `list_all_students`
   - ✅ `compare_students`
   - ✅ `get_student_summary`
   - ✅ `generate_student_report`
4. ✅ **Lógica de `evaluator_id` em `create_meal_plan` removida**:
   - ✅ Parâmetro `for_student_id` removido do schema
   - ✅ Parâmetro `for_student_id` removido da função
   - ✅ Lógica simplificada para sempre usar `user_id`
5. ✅ **Lógica de `evaluator_id` em `list_meal_presets` removida**:
   - ✅ Removido `include_evaluator=True` de `get_presets()`
   - ✅ Removida separação entre `own_presets` e `evaluator_presets`
   - ✅ Simplificada mensagem e retorno
6. ✅ **Lógica de `evaluator_id` em `create_meal_preset` removida**:
   - ✅ Parâmetro `for_student_id` removido do schema
   - ✅ Parâmetro `for_student_id` removido da função
   - ✅ Removido `created_for=for_student_id` da chamada `create_preset()`
7. ✅ **Imports relacionados removidos**:
   - ✅ `get_evaluator_students` removido do import em `tools.py`
8. ✅ **Seção 2 completa - `server/health/routes.py` MODIFICADO**:
   - ✅ Função `resolve_user_id()` removida completamente
   - ✅ Import de `validate_data_access` removido
   - ✅ Parâmetro `view_as` removido de todos os endpoints listados
   - ✅ Todas as chamadas `resolve_user_id()` substituídas por uso direto de `user_id`
   - ✅ Endpoints de perfis de avaliador mantidos (serão usados no novo sistema)
9. ✅ **Seção 3 completa - `server/health/permissions.py` REMOVIDO**:
   - ✅ Arquivo `permissions.py` deletado completamente
   - ✅ Import de `validate_data_access` removido de `health_agent.py`
   - ✅ Lógica que usa `validate_data_access` em `health_agent.py` removida/substituída
10. ✅ **Seção 5 completa - `server/health/meal_presets.py` MODIFICADO**:
   - ✅ Parâmetro `include_evaluator` removido de `get_presets()`
   - ✅ Função `_get_presets_for_student()` removida completamente
   - ✅ Parâmetros `evaluator_id` e `created_for` removidos de `create_preset()`
   - ✅ Campos `created_by_evaluator` e `evaluator_id` removidos dos presets
   - ✅ `get_preset_by_id()` atualizado para não usar `include_evaluator`
   - ✅ `tools.py` atualizado para não usar `include_evaluator`
11. ✅ **Seção 6 completa - `server/health_agent.py` MODIFICADO**:
   - ✅ Lógica de `view_as_student_id` removida (código órfão também removido)
   - ✅ Variáveis relacionadas a avaliador removidas (`view_as_context`, `student_name`, `students_list`, `is_evaluator`)
   - ✅ Lógica de construção de prompt para avaliadores removida
   - ✅ Simplificado `get_system_prompt()` para não usar `evaluator_mode`
   - ✅ Docstring atualizada
   - ✅ Chamada de `execute_health_tool()` já estava correta (sem `evaluator_id`)
12. ✅ **Seção 7 completa - `server/chat.py` MODIFICADO**:
   - ✅ Campo `view_as_student_id` removido do modelo `ChatRequest`
13. ✅ **Seção 8 completa - `server/config.py` MODIFICADO**:
   - ✅ Parâmetro `evaluator_mode` removido de `get_system_prompt()`
   - ✅ Constante `EVALUATOR_SYSTEM_PROMPT` removida completamente
   - ✅ Lógica condicional `if health_mode and evaluator_mode:` removida
14. ✅ **Seção 9 completa - `src/components/health/EvaluatorChat.jsx` REMOVIDO**:
   - ✅ Arquivo deletado completamente
   - ✅ Import removido de `HealthMode.jsx`
   - ✅ Renderização condicional removida (substituída por `HealthChat`)
15. ✅ **Seção 10 completa - `src/components/health/EvaluatorDashboard.jsx` REMOVIDO**:
   - ✅ Arquivo deletado completamente
   - ✅ Import removido de `HealthMode.jsx` e `usePreloader.js`
   - ✅ Renderização condicional da tab "dashboard" removida
16. ✅ **Seção 11 completa - `src/components/health/ProfileSelector.jsx` REMOVIDO**:
   - ✅ Arquivo deletado completamente
   - ✅ Import removido de `HealthMode.jsx` e `usePreloader.js`
   - ✅ Estado `showProfileSelector` removido
   - ✅ Funções `handleProfileSelected` e `handleOpenProfileSelector` removidas
   - ✅ Renderização condicional removida
   - ✅ Botão "Trocar perfil" removido
17. ✅ **Seção 12 completa - `src/components/health/StudentLink.jsx` REMOVIDO**:
   - ✅ Arquivo deletado completamente
   - ✅ Import removido de `HealthMode.jsx` e `usePreloader.js`
   - ✅ Renderização condicional da tab "link" removida
   - ✅ Botão da aba "Avaliador" removido
18. ✅ **Seção 13 completa - `src/components/health/StudentSearch.jsx` REMOVIDO**:
   - ✅ Arquivo deletado completamente
   - ✅ Import removido de `HealthMode.jsx`
19. ✅ **Seção 14 completa - `src/components/health/HealthMode.jsx` MODIFICADO**:
   - ✅ Estados removidos: `viewAsStudentId`, `evaluatorStudents`, `evaluatorStudentsInfo`, `loadingStudents`
   - ✅ Import de `StudentSearch` removido
   - ✅ Renderização do `StudentSearch` removida
   - ✅ Renderização condicional de perfil simplificada
   - ✅ `useHealthData` modificado para não usar `viewAsStudentId`
   - ✅ Funções `loadEvaluatorStudents` e `handleStudentSearchSelect` removidas
   - ✅ Referências a `viewAsStudentId` removidas das props das tabs (TodayTab, GoalsTab, MealPlanTab)
   - ✅ Tabs de avaliador removidas (dashboard, notifications)
   - ✅ Condicionais `healthProfile?.type === "evaluator"` removidas
   - ✅ `viewAsStudentId` removido do array de dependências do useEffect
   - ✅ `targetUserId = viewAsStudentId || userId` substituído por uso direto de `userId`
20. ✅ **Hook `src/hooks/useHealthData.js` MODIFICADO**:
   - ✅ Parâmetro `viewAsStudentId` removido da função
   - ✅ Parâmetros `view_as` removidos de todas as requisições
   - ✅ Dependências de `viewAsStudentId` removidas dos useCallback e useEffect
   - ✅ Ref `lastViewAsRef` removido

### 🔄 Em Progresso:

- Nenhuma no momento

### ⏳ Pendentes:
- Remover lógica de `evaluator_id` em outras funções (já simplificado em create_meal_preset e create_meal_plan)
- Remover `resolve_user_id()` de `routes.py`
- Remover parâmetro `view_as` dos endpoints
- E mais... (ver checklist completo acima)

---

**Próximo Passo**: Continuar com remoção das implementações das tools de avaliador
