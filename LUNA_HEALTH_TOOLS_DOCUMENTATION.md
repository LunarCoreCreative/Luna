# Documentação das Tools do Luna Health

## 📚 Visão Geral

Este documento fornece documentação completa de todas as tools disponíveis para a Luna no sistema Health, incluindo exemplos de uso, parâmetros, retornos esperados e casos de uso.

---

## 📦 Categoria: Gerenciamento de Alimentos (Foods)

### 1. `search_food`

**Descrição**: Busca alimentos no banco de dados.

**Quando usar**: Quando o usuário perguntar sobre informações nutricionais de um alimento específico (ex: "quantas calorias tem linguiça?", "informações de frango").

**Parâmetros**:
- `query` (obrigatório): Termo de busca (nome do alimento)
- `limit` (opcional): Número máximo de resultados (padrão: 10)

**Exemplo de uso**:
```json
{
  "query": "frango",
  "limit": 5
}
```

**Retorno de sucesso**:
```json
{
  "success": true,
  "foods": [
    {
      "name": "frango grelhado",
      "calories": 165,
      "protein": 31,
      "carbs": 0,
      "fats": 3.6
    }
  ],
  "count": 1
}
```

**Retorno de erro**:
```json
{
  "success": false,
  "error": "❌ Erro ao buscar alimentos: [mensagem]"
}
```

---

### 2. `get_food_nutrition`

**Descrição**: Obtém informações nutricionais detalhadas de um alimento específico. Se não encontrar no banco de dados, pesquisa automaticamente na internet e adiciona ao banco.

**Quando usar**: Quando o usuário perguntar sobre valores nutricionais específicos de um alimento.

**Parâmetros**:
- `food_name` (obrigatório): Nome do alimento
- `search_online` (opcional): Se deve pesquisar na internet se não encontrar (padrão: true)

**Exemplo de uso**:
```json
{
  "food_name": "linguiça",
  "search_online": true
}
```

**Retorno de sucesso**:
```json
{
  "success": true,
  "food": {
    "name": "linguiça",
    "calories": 301,
    "protein": 12.5,
    "carbs": 2.5,
    "fats": 27.5
  }
}
```

---

### 3. `add_food`

**Descrição**: Adiciona um novo alimento ao banco de dados. Se o alimento não existir e os valores nutricionais não forem fornecidos, pesquisa automaticamente na internet.

**Quando usar**: Quando o usuário mencionar um alimento que não está no banco ou pedir para adicionar um alimento.

**Parâmetros**:
- `food_name` (obrigatório): Nome do alimento
- `calories` (opcional): Calorias por 100g
- `protein` (opcional): Proteínas em gramas por 100g
- `carbs` (opcional): Carboidratos em gramas por 100g
- `fats` (opcional): Gorduras em gramas por 100g

**Exemplo de uso**:
```json
{
  "food_name": "hambúrguer caseiro",
  "calories": 295,
  "protein": 17,
  "carbs": 25,
  "fats": 14
}
```

**Retorno de sucesso**:
```json
{
  "success": true,
  "food": {
    "name": "hambúrguer caseiro",
    "calories": 295,
    "protein": 17,
    "carbs": 25,
    "fats": 14
  },
  "message": "✅ Alimento adicionado com sucesso!"
}
```

---

## 🍽️ Categoria: Gerenciamento de Refeições (Meals)

### 4. `add_meal`

**Descrição**: Registra uma REFEIÇÃO consumida pelo usuário. Use APENAS quando o usuário mencionar que COMEU uma refeição completa.

**Quando usar**: Quando o usuário mencionar que COMEU algo (ex: "comi linguiça no almoço", "jantei arroz e feijão").

**Parâmetros**:
- `name` (obrigatório): Nome da refeição ou descrição dos alimentos
- `meal_type` (obrigatório): Tipo de refeição ("breakfast", "lunch", "dinner", "snack")
- `calories` (opcional): Calorias da refeição
- `protein` (opcional): Proteínas em gramas
- `carbs` (opcional): Carboidratos em gramas
- `fats` (opcional): Gorduras em gramas
- `date` (opcional): Data no formato YYYY-MM-DD (padrão: hoje)
- `grams` (opcional): Quantidade em gramas
- `portion_type` (opcional): Tipo de porção (ex: "fatia", "xícara")
- `portion_quantity` (opcional): Quantidade de porções (padrão: 1.0)
- `notes` (opcional): Observações adicionais

**Exemplo de uso**:
```json
{
  "name": "Arroz, feijão e frango grelhado",
  "meal_type": "lunch",
  "calories": 650,
  "protein": 45,
  "carbs": 75,
  "fats": 12
}
```

**Exemplo com porções**:
```json
{
  "name": "2 fatias de pão integral",
  "meal_type": "breakfast",
  "portion_type": "fatia",
  "portion_quantity": 2
}
```

**Retorno de sucesso**:
```json
{
  "success": true,
  "message": "✅ Refeição registrada com sucesso!",
  "meal": {
    "id": "meal-123",
    "name": "Arroz, feijão e frango grelhado",
    "meal_type": "lunch",
    "calories": 650,
    "protein": 45,
    "carbs": 75,
    "fats": 12,
    "date": "2025-01-27"
  }
}
```

---

### 5. `edit_meal`

**Descrição**: Edita uma refeição já registrada. Use quando o usuário quiser corrigir informações de uma refeição.

**Quando usar**: Quando o usuário quiser corrigir informações de uma refeição (nome, tipo, valores nutricionais, etc). Necessita do meal_id da refeição (obtido via list_meals).

**Parâmetros**:
- `meal_id` (obrigatório): ID da refeição a ser editada
- `name` (opcional): Novo nome/descrição
- `meal_type` (opcional): Novo tipo de refeição
- `calories` (opcional): Novas calorias
- `protein` (opcional): Novas proteínas em gramas
- `carbs` (opcional): Novos carboidratos em gramas
- `fats` (opcional): Novas gorduras em gramas
- `notes` (opcional): Novas observações

**Exemplo de uso**:
```json
{
  "meal_id": "meal-123",
  "calories": 700,
  "protein": 50
}
```

**Retorno de sucesso**:
```json
{
  "success": true,
  "message": "✅ Refeição atualizada com sucesso!",
  "meal": {
    "id": "meal-123",
    "calories": 700,
    "protein": 50
  }
}
```

---

### 6. `delete_meal`

**Descrição**: Remove uma refeição registrada incorretamente.

**Quando usar**: Quando o usuário quiser remover uma refeição que foi registrada incorretamente.

**Parâmetros**:
- `meal_id` (obrigatório): ID da refeição a remover

**Exemplo de uso**:
```json
{
  "meal_id": "meal-123"
}
```

**Retorno de sucesso**:
```json
{
  "success": true,
  "message": "✅ Refeição removida com sucesso"
}
```

**Retorno de erro (refeição não encontrada)**:
```json
{
  "success": false,
  "error": "❌ Refeição não encontrada. O ID 'meal-123' não corresponde a nenhuma refeição registrada."
}
```

---

### 7. `list_meals`

**Descrição**: Lista refeições recentes do usuário. Pode filtrar por data específica ou limitar número de resultados. Use para mostrar histórico de refeições ou obter IDs para edição/remoção.

**Quando usar**: Quando o usuário quiser ver seu histórico de refeições ou quando precisar obter IDs para edição/remoção.

**Parâmetros**:
- `limit` (opcional): Número máximo de refeições a retornar (padrão: 10)
- `date` (opcional): Filtrar por data no formato YYYY-MM-DD

**Exemplo de uso**:
```json
{
  "limit": 5,
  "date": "2025-01-27"
}
```

**Retorno de sucesso**:
```json
{
  "success": true,
  "meals": [
    {
      "id": "meal-123",
      "name": "Café da manhã",
      "meal_type": "breakfast",
      "calories": 350,
      "date": "2025-01-27"
    }
  ],
  "count": 1
}
```

---

## 📊 Categoria: Resumo Nutricional

### 8. `get_nutrition_summary`

**Descrição**: Retorna o resumo nutricional do dia (calorias, macros consumidos, metas, etc). Use para análises do dia atual ou de um dia específico.

**Quando usar**: Quando o usuário perguntar "como estou indo?", "quanto comi hoje?", "estou no caminho certo?".

**Parâmetros**:
- `date` (opcional): Data no formato YYYY-MM-DD (padrão: hoje)

**Exemplo de uso**:
```json
{
  "date": "2025-01-27"
}
```

**Retorno de sucesso**:
```json
{
  "success": true,
  "summary": {
    "date": "2025-01-27",
    "total_calories": 1850,
    "total_protein": 120,
    "total_carbs": 200,
    "total_fats": 65,
    "meals_count": 3,
    "goals": {
      "daily_calories": 2000,
      "daily_protein": 150,
      "daily_carbs": 250,
      "daily_fats": 67
    },
    "progress": {
      "calories_percentage": 92.5,
      "protein_percentage": 80,
      "carbs_percentage": 80,
      "fats_percentage": 97
    }
  },
  "message": "📊 Resumo nutricional do dia 2025-01-27: 3 refeição(ões) registrada(s)"
}
```

---

### 9. `get_nutrition_history`

**Descrição**: Retorna resumos nutricionais de múltiplos dias (histórico). Use quando o usuário perguntar sobre progresso de longo prazo, como "como estou indo?", "como foi minha semana?", "estou melhorando?".

**Quando usar**: Para análises de longo prazo, calcular médias, contar dias que atingiu metas, identificar tendências.

**Parâmetros**:
- `start_date` (obrigatório): Data inicial no formato YYYY-MM-DD
- `end_date` (obrigatório): Data final no formato YYYY-MM-DD (inclusiva)

**Exemplo de uso**:
```json
{
  "start_date": "2025-01-20",
  "end_date": "2025-01-27"
}
```

**Retorno de sucesso**:
```json
{
  "success": true,
  "summaries": [
    {
      "date": "2025-01-27",
      "total_calories": 1850,
      "total_protein": 120
    }
  ],
  "count": 8,
  "averages": {
    "avg_calories": 1820,
    "avg_protein": 115
  }
}
```

---

## 🎯 Categoria: Metas (Goals)

### 10. `get_goals`

**Descrição**: Retorna as metas nutricionais atuais do usuário.

**Quando usar**: Quando o usuário quiser ver suas metas atuais ou quando precisar verificar se metas estão definidas.

**Parâmetros**: Nenhum

**Exemplo de uso**:
```json
{}
```

**Retorno de sucesso**:
```json
{
  "success": true,
  "goals": {
    "daily_calories": 2000,
    "daily_protein": 150,
    "daily_carbs": 250,
    "daily_fats": 67,
    "target_weight": 70,
    "current_weight": 75
  }
}
```

---

### 11. `update_goals`

**Descrição**: Define ou atualiza metas nutricionais do usuário (calorias diárias, macros, peso, etc).

**Quando usar**: Quando o usuário mencionar objetivos, peso desejado, ou quando não houver metas definidas.

**Parâmetros**:
- `daily_calories` (opcional): Meta de calorias diárias
- `daily_protein` (opcional): Meta de proteínas diárias em gramas
- `daily_carbs` (opcional): Meta de carboidratos diários em gramas
- `daily_fats` (opcional): Meta de gorduras diárias em gramas
- `target_weight` (opcional): Peso alvo em kg
- `current_weight` (opcional): Peso atual em kg

**Exemplo de uso**:
```json
{
  "daily_calories": 2000,
  "daily_protein": 150,
  "daily_carbs": 250,
  "daily_fats": 67
}
```

**Retorno de sucesso**:
```json
{
  "success": true,
  "message": "Metas atualizadas com sucesso!",
  "goals": {
    "daily_calories": 2000,
    "daily_protein": 150,
    "daily_carbs": 250,
    "daily_fats": 67
  }
}
```

---

### 12. `suggest_goals`

**Descrição**: Sugere metas nutricionais baseadas em dados pessoais do usuário (peso, altura, idade, gênero, objetivo). Usa fórmulas científicas (Mifflin-St Jeor para BMR) para calcular calorias e macros ideais.

**Quando usar**: Quando o usuário pedir para calcular, sugerir ou criar metas nutricionais baseadas em suas informações.

**Parâmetros**:
- `weight` (obrigatório): Peso atual em kg
- `height` (obrigatório): Altura em cm
- `age` (obrigatório): Idade em anos
- `gender` (obrigatório): "male" ou "female"
- `goal` (obrigatório): Objetivo ("lose", "maintain", "gain", etc)
- `activity_level` (opcional): Nível de atividade ("sedentary", "light", "moderate", "active", "very_active") - padrão: "moderate"
- `target_weight` (opcional): Peso alvo em kg

**Exemplo de uso**:
```json
{
  "weight": 75,
  "height": 175,
  "age": 30,
  "gender": "male",
  "goal": "lose",
  "activity_level": "moderate",
  "target_weight": 70
}
```

**Retorno de sucesso**:
```json
{
  "success": true,
  "suggested_goals": {
    "daily_calories": 1950,
    "daily_protein": 150,
    "daily_carbs": 195,
    "daily_fats": 65,
    "bmr": 1705.5,
    "tdee": 2643.5
  },
  "message": "✅ Metas sugeridas calculadas:\n   • Calorias diárias: 1950 kcal\n   • Proteínas: 150.0g\n   • Carboidratos: 195.0g\n   • Gorduras: 65.0g"
}
```

---

## 📋 Categoria: Plano Alimentar (Meal Plans/Presets)

### 13. `list_meal_presets`

**Descrição**: Lista todos os presets de refeições do plano alimentar do usuário.

**Quando usar**: Quando o usuário perguntar sobre seu plano alimentar, refeições programadas, ou quiser ver os presets disponíveis.

**Parâmetros**: Nenhum

**Exemplo de uso**:
```json
{}
```

**Retorno de sucesso**:
```json
{
  "success": true,
  "presets": [
    {
      "id": "preset-123",
      "name": "Café da manhã com ovos e aveia",
      "meal_type": "breakfast",
      "total_calories": 450,
      "total_protein": 25,
      "foods": [...]
    }
  ],
  "count": 5
}
```

---

### 14. `create_meal_preset`

**Descrição**: Cria um novo preset de refeição no plano alimentar.

**Quando usar**: Quando o usuário pedir para criar uma refeição planejada ou adicionar algo ao plano alimentar.

**Parâmetros**:
- `name` (obrigatório): Nome descritivo do preset
- `meal_type` (obrigatório): Tipo de refeição
- `foods` (obrigatório): Lista de alimentos do preset
- `suggested_time` (opcional): Horário sugerido (ex: "07:00")
- `notes` (opcional): Observações adicionais

**Exemplo de uso**:
```json
{
  "name": "Café da manhã com ovos e aveia",
  "meal_type": "breakfast",
  "foods": [
    {
      "food_name": "ovo cozido",
      "quantity": 100,
      "calories": 155,
      "protein": 13,
      "carbs": 1.1,
      "fats": 11
    },
    {
      "food_name": "aveia",
      "quantity": 50,
      "calories": 194.5,
      "protein": 8.45,
      "carbs": 33,
      "fats": 3.45
    }
  ],
  "suggested_time": "07:00"
}
```

**Retorno de sucesso**:
```json
{
  "success": true,
  "preset": {
    "id": "preset-123",
    "name": "Café da manhã com ovos e aveia",
    "total_calories": 349.5,
    "total_protein": 21.45
  }
}
```

---

### 15. `use_meal_preset`

**Descrição**: Registra uma refeição baseada em um preset do plano alimentar.

**Quando usar**: Quando o usuário disser que comeu algo do plano alimentar ou quiser usar um preset.

**Parâmetros**:
- `preset_id` (opcional): ID do preset a usar
- `preset_name` (opcional): Nome do preset (alternativa ao ID)
- `date` (opcional): Data no formato YYYY-MM-DD (padrão: hoje)

**Exemplo de uso**:
```json
{
  "preset_id": "preset-123",
  "date": "2025-01-27"
}
```

**Retorno de sucesso**:
```json
{
  "success": true,
  "meal": {
    "id": "meal-456",
    "name": "Café da manhã com ovos e aveia",
    "calories": 349.5
  },
  "message": "✅ Refeição registrada usando preset!"
}
```

---

### 16. `edit_meal_preset`

**Descrição**: Edita um preset de refeição existente.

**Quando usar**: Quando o usuário quiser modificar um preset do plano alimentar.

**Parâmetros**:
- `preset_id` (obrigatório): ID do preset a editar
- `name` (opcional): Novo nome do preset
- `meal_type` (opcional): Novo tipo de refeição
- `foods` (opcional): Nova lista de alimentos
- `suggested_time` (opcional): Novo horário sugerido
- `notes` (opcional): Novas observações

**Exemplo de uso**:
```json
{
  "preset_id": "preset-123",
  "name": "Café da manhã completo"
}
```

---

### 17. `delete_meal_preset`

**Descrição**: Remove um preset de refeição do plano alimentar.

**Quando usar**: Quando o usuário quiser excluir um preset.

**Parâmetros**:
- `preset_id` (obrigatório): ID do preset a remover

**Exemplo de uso**:
```json
{
  "preset_id": "preset-123"
}
```

---

### 18. `create_meal_plan`

**Descrição**: 🚨 FERRAMENTA OBRIGATÓRIA: Cria um plano alimentar completo com múltiplos presets e SALVA no banco de dados.

**Quando usar**: SEMPRE quando o usuário pedir para 'criar', 'montar', 'implementar' ou 'aplicar' um plano alimentar, dieta ou cardápio.

**Parâmetros**:
- `presets` (obrigatório): Lista de presets a criar. Cada preset deve ter name, meal_type, foods, e opcionalmente suggested_time e notes.

**Exemplo de uso**:
```json
{
  "presets": [
    {
      "name": "Café da Manhã",
      "meal_type": "breakfast",
      "foods": [
        {
          "food_name": "ovo cozido",
          "quantity": 100,
          "calories": 155,
          "protein": 13,
          "carbs": 1.1,
          "fats": 11
        }
      ]
    },
    {
      "name": "Almoço",
      "meal_type": "lunch",
      "foods": [
        {
          "food_name": "frango grelhado",
          "quantity": 150,
          "calories": 247.5,
          "protein": 46.5,
          "carbs": 0,
          "fats": 5.4
        }
      ]
    }
  ]
}
```

**Retorno de sucesso**:
```json
{
  "success": true,
  "presets": [...],
  "count": 2,
  "totals": {
    "calories": 402.5,
    "protein": 59.5,
    "carbs": 1.1,
    "fats": 16.4
  },
  "message": "🍽️ Plano alimentar criado com 2 refeições!\n   Totais do dia:\n   • Calorias: 403 kcal\n   • Proteínas: 59.5g\n   • Carboidratos: 1.1g\n   • Gorduras: 16.4g"
}
```

---

## ⚖️ Categoria: Gerenciamento de Peso (Weights)

### 19. `add_weight`

**Descrição**: Registra o peso do usuário. Se já existir um registro para a data, atualiza o peso.

**Quando usar**: Quando o usuário mencionar que pesou-se ou quiser registrar seu peso atual.

**Parâmetros**:
- `weight` (obrigatório): Peso em kg
- `date` (opcional): Data no formato YYYY-MM-DD (padrão: hoje)

**Exemplo de uso**:
```json
{
  "weight": 75.5,
  "date": "2025-01-27"
}
```

**Retorno de sucesso**:
```json
{
  "success": true,
  "weight": {
    "id": "weight-123",
    "date": "2025-01-27",
    "weight": 75.5
  },
  "message": "✅ Peso registrado: 75.5 kg na data 2025-01-27"
}
```

**Retorno de erro (validação)**:
```json
{
  "success": false,
  "error": "⚠️ Peso deve estar entre 1 e 500 kg"
}
```

---

### 20. `get_weights`

**Descrição**: Lista o histórico de pesos do usuário.

**Quando usar**: Quando o usuário perguntar sobre seu progresso de peso, histórico de pesagem, ou gráfico de peso.

**Parâmetros**:
- `limit` (opcional): Número máximo de registros a retornar (ordenado por data mais recente primeiro)

**Exemplo de uso**:
```json
{
  "limit": 10
}
```

**Retorno de sucesso**:
```json
{
  "success": true,
  "weights": [
    {
      "id": "weight-123",
      "date": "2025-01-27",
      "weight": 75.5
    },
    {
      "id": "weight-122",
      "date": "2025-01-26",
      "weight": 75.8
    }
  ],
  "count": 2,
  "message": "📊 Histórico de pesos: 2 registro(s) encontrado(s)"
}
```

---

### 21. `delete_weight`

**Descrição**: Remove um registro de peso.

**Quando usar**: Quando o usuário quiser deletar uma pesagem incorreta.

**Parâmetros**:
- `weight_id` (obrigatório): ID do registro de peso a remover (obtido via get_weights)

**Exemplo de uso**:
```json
{
  "weight_id": "weight-123"
}
```

**Retorno de sucesso**:
```json
{
  "success": true,
  "message": "✅ Registro de peso removido com sucesso"
}
```

**Retorno de erro (não encontrado)**:
```json
{
  "success": false,
  "error": "❌ Registro de peso não encontrado"
}
```

---

## 🔔 Categoria: Notificações (Notifications)

### 22. `get_notifications`

**Descrição**: Lista notificações do usuário.

**Quando usar**: Quando o usuário perguntar sobre notificações, alertas, ou quiser ver notificações não lidas.

**Parâmetros**:
- `unread_only` (opcional): Se True, retorna apenas notificações não lidas (padrão: false)
- `limit` (opcional): Número máximo de notificações a retornar

**Exemplo de uso**:
```json
{
  "unread_only": true,
  "limit": 10
}
```

**Retorno de sucesso**:
```json
{
  "success": true,
  "notifications": [
    {
      "id": "notif-123",
      "title": "Meta de proteína atingida!",
      "message": "Você atingiu sua meta de proteína hoje! 🎉",
      "read": false,
      "created_at": "2025-01-27T10:00:00"
    }
  ],
  "count": 1,
  "unread_count": 1,
  "message": "🔔 1 notificação(ões) encontrada(s) (1 não lida(s))"
}
```

---

### 23. `mark_notification_read`

**Descrição**: Marca uma notificação como lida.

**Quando usar**: Quando o usuário quiser marcar uma notificação específica como lida.

**Parâmetros**:
- `notification_id` (obrigatório): ID da notificação a marcar como lida (obtido via get_notifications)

**Exemplo de uso**:
```json
{
  "notification_id": "notif-123"
}
```

**Retorno de sucesso**:
```json
{
  "success": true,
  "message": "✅ Notificação marcada como lida"
}
```

**Retorno de erro (não encontrada)**:
```json
{
  "success": false,
  "error": "❌ Notificação não encontrada"
}
```

---

## 📝 Padrões de Retorno

### Formato de Sucesso

Todas as tools seguem o padrão:
```json
{
  "success": true,
  // Dados específicos da tool
  "message": "Mensagem opcional"  // Nem todas têm
}
```

### Formato de Erro

Todas as tools seguem o padrão:
```json
{
  "success": false,
  "error": "Mensagem de erro amigável"
}
```

---

## 🧪 Casos de Uso Comuns

### Caso 1: Registrar Refeição Simples

**Cenário**: Usuário diz "comi arroz e feijão no almoço"

**Fluxo**:
1. Usar `add_meal` com informações básicas
2. Sistema tenta buscar nutrição automaticamente se não fornecida
3. Retorna meal criado

### Caso 2: Criar Plano Alimentar Completo

**Cenário**: Usuário pede "crie um plano de 2000 calorias para mim"

**Fluxo**:
1. Usar `get_goals` para verificar metas atuais
2. Usar `suggest_goals` se necessário
3. Usar `create_meal_plan` com múltiplos presets
4. Retorna plano completo com totais

### Caso 3: Análise de Progresso

**Cenário**: Usuário pergunta "como estou indo?"

**Fluxo**:
1. Usar `get_nutrition_summary` para o dia atual
2. Se perguntar sobre longo prazo, usar `get_nutrition_history`
3. Calcular médias e tendências
4. Fornecer análise contextual

### Caso 4: Onboarding

**Cenário**: Novo usuário sem metas definidas

**Fluxo**:
1. Usar `get_goals` para verificar se tem metas
2. Coletar informações (peso, altura, idade, gênero, objetivo)
3. Usar `suggest_goals` para calcular metas
4. Usar `update_goals` para salvar
5. Sugerir primeira refeição

---

## ⚠️ Tratamento de Erros

### Erros de Validação

Quando parâmetros obrigatórios estão faltando ou inválidos:
```json
{
  "success": false,
  "error": "Por favor, forneça [parâmetro]"
}
```

### Erros de Recursos Não Encontrados

Quando um recurso (refeição, preset, peso, etc) não é encontrado:
```json
{
  "success": false,
  "error": "❌ [Recurso] não encontrado. O ID '[id]' não corresponde a nenhum [recurso] registrado."
}
```

### Erros Genéricos

Para erros inesperados:
```json
{
  "success": false,
  "error": "❌ Erro ao [ação]: [mensagem de erro]"
}
```

---

## ✅ Checklist de Validação

- [x] Todas as 23 tools documentadas
- [x] Exemplos de uso para cada tool
- [x] Parâmetros documentados com tipos e obrigatoriedade
- [x] Exemplos de retorno de sucesso
- [x] Exemplos de retorno de erro
- [x] Casos de uso comuns documentados
- [x] Padrões de retorno explicados
- [x] Tratamento de erros documentado
