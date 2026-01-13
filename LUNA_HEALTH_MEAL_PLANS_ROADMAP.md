# 🍽️ Luna Health - Sistema de Plano Alimentar (Presets de Refeições)

## 📋 Visão Geral

O sistema de **Plano Alimentar** permite que tanto o **avaliador** quanto o **aluno** criem refeições pré-definidas (presets) que servem como um cardápio/guia alimentar. No "Hoje", o aluno registra o que realmente comeu, podendo usar os presets como base.

---

## 🔄 Workflow

```
┌─────────────────────────────────────────────────────────────────┐
│  AVALIADOR ou ALUNO                                             │
│  ──────────────────                                             │
│  Aba "Plano Alimentar":                                         │
│  - Cria presets de refeições                                    │
│  - Cada preset tem: nome, tipo, horário sugerido, alimentos     │
│  - Ex: "Café da manhã - Ovos com aveia" (07:00)                 │
│  - Ex: "Almoço low carb" (12:00)                                │
│  - Ex: "Lanche pré-treino" (16:00)                              │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  ALUNO - Aba "Hoje"                                             │
│  ──────────────────                                             │
│  - Vê o que já comeu hoje (diário real)                         │
│  - Pode adicionar refeição:                                     │
│    • "Usar do Plano" → escolhe um preset e registra             │
│    • "Adicionar manual" → cria refeição avulsa                  │
│  - Compara consumo real vs plano sugerido                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Estrutura de Dados

### Preset de Refeição (meal_preset)

```json
{
    "id": "uuid",
    "user_id": "firebase_uid",           // Quem criou
    "created_for": "firebase_uid",       // Para quem (pode ser o próprio ou um aluno)
    "created_by_evaluator": true,        // Se foi criado pelo avaliador
    
    "name": "Café da manhã com ovos e aveia",
    "meal_type": "breakfast",            // breakfast, lunch, dinner, snack, pre_workout, post_workout
    "suggested_time": "07:00",           // Horário sugerido (opcional)
    
    "foods": [                           // Lista de alimentos
        {
            "food_name": "Ovo cozido",
            "quantity": 2,
            "unit": "unidade",
            "calories": 140,
            "protein": 12,
            "carbs": 1,
            "fats": 10
        },
        {
            "food_name": "Aveia",
            "quantity": 40,
            "unit": "g",
            "calories": 150,
            "protein": 5,
            "carbs": 27,
            "fats": 3
        }
    ],
    
    // Totais calculados
    "total_calories": 290,
    "total_protein": 17,
    "total_carbs": 28,
    "total_fats": 13,
    
    "notes": "Pode substituir aveia por tapioca",
    "is_active": true,
    "order": 1,                          // Ordem de exibição
    
    "created_at": "2025-01-12T10:00:00",
    "updated_at": "2025-01-12T10:00:00"
}
```

---

## 🎨 Interface - Aba "Plano Alimentar"

### Visão do Aluno

```
┌─────────────────────────────────────────────────────────────────┐
│  🍽️ Plano Alimentar                          [+ Novo Preset]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📍 Criados pelo Avaliador                                      │
│  ─────────────────────────                                      │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🍳 Café da manhã - Opção 1              07:00           │   │
│  │    290 kcal • P: 17g • C: 28g • G: 13g                  │   │
│  │    Ovos cozidos, aveia, banana                          │   │
│  │                                    [Usar Hoje] [Editar] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🥗 Almoço - Frango com arroz            12:00           │   │
│  │    450 kcal • P: 40g • C: 50g • G: 10g                  │   │
│  │    Frango grelhado, arroz integral, brócolis            │   │
│  │                                    [Usar Hoje] [Editar] │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📍 Meus Presets                                                │
│  ───────────────                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🍌 Lanche rápido                        15:00           │   │
│  │    180 kcal • P: 8g • C: 20g • G: 8g                    │   │
│  │    Banana com pasta de amendoim                         │   │
│  │                            [Usar Hoje] [Editar] [🗑️]   │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Visão do Avaliador (visualizando aluno)

```
┌─────────────────────────────────────────────────────────────────┐
│  🍽️ Plano Alimentar de [Nome do Aluno]      [+ Novo Preset]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📍 Presets que você criou para este aluno                      │
│  ─────────────────────────────────────────                      │
│  (lista de presets criados pelo avaliador)                      │
│                                                                 │
│  📍 Presets criados pelo aluno                                  │
│  ─────────────────────────────                                  │
│  (lista de presets do próprio aluno - apenas visualização)      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Interface - Aba "Hoje" (Atualizada)

```
┌─────────────────────────────────────────────────────────────────┐
│  📅 Hoje - 12/01/2025                                           │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  Resumo do Dia                                          │   │
│  │  Calorias: 850/2000 kcal  ████████░░░░░░░░ 42%          │   │
│  │  Proteína: 65/150g        ████████░░░░░░░░ 43%          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  Refeições Registradas                                          │
│  ─────────────────────                                          │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🍳 Café da manhã - Ovos com aveia       07:30           │   │
│  │    290 kcal • P: 17g • C: 28g • G: 13g                  │   │
│  │    📋 Do plano: "Café opção 1"                          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │ 🥗 Almoço - Frango com batata doce      12:45           │   │
│  │    560 kcal • P: 48g • C: 55g • G: 12g                  │   │
│  │    ✏️ Adicionado manualmente                            │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │              [📋 Usar do Plano]  [+ Adicionar]          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Implementação

### Fase 1: Backend - Storage e Endpoints

- [ ] **T1.1 - Criar storage para meal_presets**
  - Arquivo: `server/health/meal_presets.py`
  - Funções: `create_preset`, `get_presets`, `update_preset`, `delete_preset`
  - Firebase collection: `users/{uid}/meal_presets`

- [ ] **T1.2 - Criar endpoints REST**
  - `POST /health/meal-presets` - Criar preset
  - `GET /health/meal-presets` - Listar presets (do usuário + do avaliador)
  - `GET /health/meal-presets/{id}` - Detalhes de um preset
  - `PUT /health/meal-presets/{id}` - Atualizar preset
  - `DELETE /health/meal-presets/{id}` - Deletar preset

- [ ] **T1.3 - Permissões**
  - Aluno pode criar/editar/deletar seus próprios presets
  - Avaliador pode criar/editar/deletar presets para seus alunos
  - Aluno pode ver presets do avaliador (read-only)

### Fase 2: Frontend - Aba "Plano Alimentar"

- [ ] **T2.1 - Renomear aba "Refeições" para "Plano Alimentar"**
  - Atualizar `HealthMode.jsx`
  - Atualizar ícone e label

- [ ] **T2.2 - Criar componente `MealPlanTab.jsx`**
  - Lista presets do avaliador (se houver)
  - Lista presets próprios
  - Botão "Novo Preset"
  - Botão "Usar Hoje" em cada preset

- [ ] **T2.3 - Modal de criação/edição de preset**
  - Nome da refeição
  - Tipo (café, almoço, jantar, lanche, pré-treino, pós-treino)
  - Horário sugerido
  - Adicionar alimentos (com busca no banco)
  - Calcular totais automaticamente
  - Notas/observações

### Fase 3: Frontend - Aba "Hoje" Atualizada

- [ ] **T3.1 - Botão "Usar do Plano"**
  - Abre modal com lista de presets disponíveis
  - Ao selecionar, cria uma refeição real baseada no preset
  - Marca a refeição como "do plano" para referência

- [ ] **T3.2 - Indicador visual**
  - Mostrar se a refeição veio de um preset ou foi manual
  - "📋 Do plano: [nome do preset]"
  - "✏️ Adicionado manualmente"

### Fase 4: Integração com Chat

- [ ] **T4.1 - Comandos de chat para presets**
  - "Criar preset de café da manhã com..."
  - "Usar meu preset de almoço"
  - "Mostrar meu plano alimentar"

---

## 📅 Cronograma

### Sprint 1 (1 semana)
- T1.1, T1.2, T1.3 (Backend completo)

### Sprint 2 (1 semana)
- T2.1, T2.2, T2.3 (Frontend - Plano Alimentar)

### Sprint 3 (1 semana)
- T3.1, T3.2 (Frontend - Hoje atualizado)
- T4.1 (Integração com chat)

---

## 📚 Tipos de Refeição (meal_type)

| ID | Nome | Ícone |
|----|------|-------|
| `breakfast` | Café da Manhã | 🍳 |
| `morning_snack` | Lanche da Manhã | 🍎 |
| `lunch` | Almoço | 🥗 |
| `afternoon_snack` | Lanche da Tarde | 🍌 |
| `pre_workout` | Pré-Treino | 💪 |
| `post_workout` | Pós-Treino | 🥤 |
| `dinner` | Jantar | 🍽️ |
| `supper` | Ceia | 🌙 |
| `snack` | Lanche (genérico) | 🥜 |

---

**Criado em**: 2025-01-12  
**Autor**: Luna AI Assistant  
**Versão**: 1.0
