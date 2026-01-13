# Análise das Tools da Luna Health

## 📊 Resumo

Este documento analisa todas as tools disponíveis para a Luna no sistema Health, identifica gaps e sugere melhorias.

---

## ✅ Tools Existentes (17 tools)

### 1. **Refeições (Meals)**

#### 1.1. `add_meal`
- **Descrição atual**: "Registra uma REFEIÇÃO consumida pelo usuário. Use APENAS quando o usuário mencionar que COMEU uma refeição completa..."
- **Status**: ✅ Boa descrição, clara sobre quando usar
- **Funcionalidade**: POST /health/meals

#### 1.2. `edit_meal`
- **Descrição atual**: "Edita uma refeição já registrada."
- **Status**: ⚠️ Muito curta, poderia ser mais específica
- **Funcionalidade**: PUT /health/meals/{meal_id}

#### 1.3. `delete_meal`
- **Descrição atual**: "Remove uma refeição registrada incorretamente."
- **Status**: ✅ Adequada
- **Funcionalidade**: DELETE /health/meals/{meal_id}

#### 1.4. `list_meals`
- **Descrição atual**: "Lista refeições recentes do usuário."
- **Status**: ⚠️ Poderia mencionar filtros disponíveis (data, limite)
- **Funcionalidade**: GET /health/meals

---

### 2. **Resumo Nutricional**

#### 2.1. `get_nutrition_summary`
- **Descrição atual**: "Retorna o resumo nutricional do dia (calorias, macros consumidos, metas, etc). Use para análises do dia atual ou de um dia específico."
- **Status**: ✅ Boa descrição
- **Funcionalidade**: GET /health/summary

#### 2.2. `get_nutrition_history`
- **Descrição atual**: "Retorna resumos nutricionais de múltiplos dias (histórico). Use quando o usuário perguntar sobre progresso de longo prazo..."
- **Status**: ✅ Excelente descrição com exemplos
- **Funcionalidade**: GET /health/history

---

### 3. **Metas (Goals)**

#### 3.1. `update_goals`
- **Descrição atual**: "Define ou atualiza metas nutricionais do usuário (calorias diárias, macros, peso, etc)."
- **Status**: ✅ Adequada
- **Funcionalidade**: PUT /health/goals

#### 3.2. `get_goals`
- **Descrição atual**: "Retorna as metas nutricionais atuais do usuário."
- **Status**: ✅ Adequada
- **Funcionalidade**: GET /health/goals

---

### 4. **Alimentos (Foods)**

#### 4.1. `search_food`
- **Descrição atual**: "Busca alimentos no banco de dados. Use quando o usuário perguntar sobre informações nutricionais de um alimento específico..."
- **Status**: ✅ Boa descrição com exemplos
- **Funcionalidade**: GET /health/foods/search

#### 4.2. `get_food_nutrition`
- **Descrição atual**: "Obtém informações nutricionais detalhadas de um alimento específico. Se não encontrar no banco de dados, pesquisa automaticamente na internet e adiciona ao banco..."
- **Status**: ✅ Excelente, menciona funcionalidade de busca online
- **Funcionalidade**: GET /health/foods/{food_name}

#### 4.3. `add_food`
- **Descrição atual**: "Adiciona um novo alimento ao banco de dados. Se o alimento não existir e os valores nutricionais não forem fornecidos, pesquisa automaticamente na internet..."
- **Status**: ✅ Boa descrição
- **Funcionalidade**: POST /health/foods/add

---

### 5. **Plano Alimentar (Meal Plans/Presets)**

#### 5.1. `list_meal_presets`
- **Descrição atual**: "Lista todos os presets de refeições do plano alimentar do usuário. Use quando o usuário perguntar sobre seu plano alimentar..."
- **Status**: ⚠️ Menciona "do avaliador (se houver)" - código morto, já que não há mais modo avaliador
- **Funcionalidade**: GET /health/meal-presets

#### 5.2. `create_meal_preset`
- **Descrição atual**: "Cria um novo preset de refeição no plano alimentar. Use quando o usuário pedir para criar uma refeição planejada..."
- **Status**: ⚠️ Menciona "ou quando o avaliador quiser criar um preset para um aluno" - código morto
- **Funcionalidade**: POST /health/meal-presets

#### 5.3. `use_meal_preset`
- **Descrição atual**: "Registra uma refeição baseada em um preset do plano alimentar. Use quando o usuário disser que comeu algo do plano alimentar..."
- **Status**: ✅ Boa descrição
- **Funcionalidade**: (Usa create_meal internamente)

#### 5.4. `edit_meal_preset`
- **Descrição atual**: "Edita um preset de refeição existente. Use quando o usuário quiser modificar um preset do plano alimentar."
- **Status**: ✅ Adequada
- **Funcionalidade**: PUT /health/meal-presets/{preset_id}

#### 5.5. `delete_meal_preset`
- **Descrição atual**: "Remove um preset de refeição do plano alimentar. Use quando o usuário quiser excluir um preset."
- **Status**: ✅ Adequada
- **Funcionalidade**: DELETE /health/meal-presets/{preset_id}

#### 5.6. `create_meal_plan`
- **Descrição atual**: "🚨 FERRAMENTA OBRIGATÓRIA: Cria um plano alimentar completo com múltiplos presets e SALVA no banco de dados..."
- **Status**: ✅ Excelente, muito clara sobre uso obrigatório e formato
- **Funcionalidade**: (Usa create_preset múltiplas vezes)

---

## ❌ Gaps Identificados (Funcionalidades sem Tools)

### 1. **Pesos (Weights)** 🚨 IMPORTANTE
- **Rotas**: 
  - GET /health/weights
  - POST /health/weights
  - DELETE /health/weights/{weight_id}
- **Impacto**: Alto - gerenciar peso é funcionalidade core do sistema
- **Tools necessárias**:
  - `add_weight` - Registrar peso do usuário
  - `get_weights` - Listar histórico de pesos
  - `delete_weight` - Remover registro de peso

### 2. **Notificações (Notifications)** ⚠️ MÉDIO
- **Rotas**:
  - GET /health/profile/notifications
  - PUT /health/profile/notifications/{notification_id}/read
  - PUT /health/profile/notifications/read-all
- **Impacto**: Médio - útil para a Luna informar sobre notificações
- **Tools necessárias**:
  - `get_notifications` - Listar notificações do usuário
  - `mark_notification_read` - Marcar notificação como lida

### 3. **Sugestão de Metas (Suggest Goals)** ⚠️ MÉDIO
- **Rota**: POST /health/suggest_goals
- **Impacto**: Médio - útil para a Luna sugerir metas baseadas em perfil
- **Tool necessária**:
  - `suggest_goals` - Sugerir metas nutricionais baseadas em perfil

### 4. **Listar Metas Disponíveis** ⚠️ BAIXO
- **Rota**: GET /health/goals/list
- **Impacto**: Baixo - útil para a Luna mostrar opções de metas
- **Tool necessária**:
  - `list_available_goals` - Listar tipos de metas disponíveis

---

## 🔍 Melhorias Sugeridas nas Descrições

### 1. **`edit_meal`**
**Atual**: "Edita uma refeição já registrada."
**Sugerido**: "Edita uma refeição já registrada. Use quando o usuário quiser corrigir informações de uma refeição (nome, tipo, valores nutricionais, etc). Necessita do meal_id da refeição (obtido via list_meals)."

### 2. **`list_meals`**
**Atual**: "Lista refeições recentes do usuário."
**Sugerido**: "Lista refeições recentes do usuário. Pode filtrar por data específica ou limitar número de resultados. Use para mostrar histórico de refeições ou obter IDs para edição/remoção."

### 3. **`list_meal_presets`**
**Atual**: "Lista todos os presets de refeições do plano alimentar do usuário. Use quando o usuário perguntar sobre seu plano alimentar, refeições programadas, ou quiser ver os presets disponíveis. Retorna presets do próprio usuário e do avaliador (se houver)."
**Sugerido**: "Lista todos os presets de refeições do plano alimentar do usuário. Use quando o usuário perguntar sobre seu plano alimentar, refeições programadas, ou quiser ver os presets disponíveis."

### 4. **`create_meal_preset`**
**Atual**: "...ou quando o avaliador quiser criar um preset para um aluno."
**Sugerido**: Remover referência ao avaliador

---

## 📋 Checklist de Implementação

### Prioridade Alta (Crítico)
- [x] Adicionar tool `add_weight`
- [x] Adicionar tool `get_weights`
- [x] Adicionar tool `delete_weight`
- [x] Remover referências ao modo avaliador em `list_meal_presets` e `create_meal_preset`

### Prioridade Média (Importante)
- [x] Melhorar descrição de `edit_meal`
- [x] Melhorar descrição de `list_meals`
- [x] Adicionar tool `get_notifications`
- [x] Adicionar tool `mark_notification_read`
- [x] Adicionar tool `suggest_goals`

### Prioridade Baixa (Melhorias)
- [ ] Adicionar tool `list_available_goals`

---

## 🎯 Resultado Esperado

Após as melhorias:
1. ✅ Todas as funcionalidades principais terão tools correspondentes
2. ✅ Descrições das tools serão claras e específicas sobre quando e como usar
3. ✅ Não haverá referências a código morto (modo avaliador) nas descrições
4. ✅ A Luna terá acesso completo a todas as funcionalidades do sistema
