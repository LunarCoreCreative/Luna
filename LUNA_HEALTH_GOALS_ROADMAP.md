# 🎯 Luna Health - Roadmap: Sistema de Objetivos Inteligente

## 📋 Visão Geral

O Luna Health será integrado com o sistema de treinos da academia, oferecendo objetivos nutricionais que vão além do básico (emagrecer/manter/ganhar), incluindo metas de **alta performance**, **hipertrofia**, **definição muscular** e outros objetivos específicos para atletas e praticantes de musculação.

---

## 🏋️ Categorias de Objetivos

### Categoria 1: Objetivos Básicos (Público Geral)

| ID | Objetivo | Descrição | Calorias | Proteína |
|----|----------|-----------|----------|----------|
| `lose` | **Emagrecer** | Perder peso de forma saudável | TDEE - 500 | 2.0g/kg |
| `maintain` | **Manter peso** | Estabilizar peso atual | TDEE | 1.6g/kg |
| `gain` | **Ganhar peso** | Aumento de peso geral | TDEE + 500 | 1.8g/kg |

### Categoria 2: Objetivos de Composição Corporal (Praticantes de Musculação)

| ID | Objetivo | Descrição | Calorias | Proteína |
|----|----------|-----------|----------|----------|
| `recomposition` | **Recomposição Corporal** | Trocar gordura por músculo, peso similar | TDEE | 2.4g/kg |
| `hypertrophy` | **Hipertrofia** | Foco em ganho de massa muscular máximo | TDEE + 300-500 | 2.2g/kg |
| `lean_gain` | **Lean Bulk** | Ganho de massa com mínima gordura | TDEE + 200 | 2.2g/kg |
| `cutting` | **Cutting / Secar** | Definição muscular, perder gordura preservando músculo | TDEE - 400 | 2.5g/kg |
| `definition` | **Definição** | Manter massa, reduzir % gordura | TDEE - 200 | 2.2g/kg |

### Categoria 3: Objetivos de Alta Performance (Atletas)

| ID | Objetivo | Descrição | Calorias | Proteína |
|----|----------|-----------|----------|----------|
| `performance` | **Alta Performance** | Maximizar energia e recuperação para treinos intensos | TDEE + 300 | 2.0g/kg |
| `endurance` | **Resistência / Endurance** | Foco em cardio, maratonas, ciclismo | TDEE + 500 (carbs altos) | 1.6g/kg |
| `strength` | **Força Máxima** | Powerlifting, levantamento de peso | TDEE + 400 | 2.0g/kg |
| `athletic` | **Condicionamento Atlético** | Esportes em geral, agilidade, explosão | TDEE + 200 | 1.8g/kg |
| `competition_prep` | **Preparação para Competição** | Fase final antes de competição (bodybuilding) | TDEE - 600 | 2.8g/kg |
| `off_season` | **Off-Season** | Período de recuperação e construção pós-competição | TDEE + 600 | 2.0g/kg |

### Categoria 4: Objetivos de Saúde (Especiais)

| ID | Objetivo | Descrição | Calorias | Proteína |
|----|----------|-----------|----------|----------|
| `health_improve` | **Melhorar Saúde** | Foco em qualidade nutricional, não peso | TDEE | 1.4g/kg |
| `energy_boost` | **Aumentar Energia** | Combater fadiga, melhorar disposição | TDEE + 100 (carbs) | 1.6g/kg |
| `recovery` | **Recuperação** | Pós-lesão, pós-cirurgia, recuperação muscular | TDEE + 200 | 2.0g/kg |
| `longevity` | **Longevidade** | Alimentação anti-inflamatória, saúde a longo prazo | TDEE - 100 | 1.2g/kg |

---

## 🔧 Configurações por Objetivo

### Distribuição de Macros por Objetivo

```
┌─────────────────────┬──────────┬──────────┬──────────┐
│ Objetivo            │ Proteína │ Carbs    │ Gorduras │
├─────────────────────┼──────────┼──────────┼──────────┤
│ Emagrecer           │ 30%      │ 35%      │ 35%      │
│ Manter peso         │ 25%      │ 45%      │ 30%      │
│ Ganhar peso         │ 20%      │ 50%      │ 30%      │
├─────────────────────┼──────────┼──────────┼──────────┤
│ Recomposição        │ 35%      │ 35%      │ 30%      │
│ Hipertrofia         │ 30%      │ 45%      │ 25%      │
│ Lean Bulk           │ 30%      │ 40%      │ 30%      │
│ Cutting             │ 40%      │ 30%      │ 30%      │
│ Definição           │ 35%      │ 35%      │ 30%      │
├─────────────────────┼──────────┼──────────┼──────────┤
│ Alta Performance    │ 25%      │ 50%      │ 25%      │
│ Endurance           │ 15%      │ 60%      │ 25%      │
│ Força Máxima        │ 25%      │ 45%      │ 30%      │
│ Condicionamento     │ 25%      │ 50%      │ 25%      │
│ Prep. Competição    │ 45%      │ 25%      │ 30%      │
│ Off-Season          │ 25%      │ 50%      │ 25%      │
├─────────────────────┼──────────┼──────────┼──────────┤
│ Melhorar Saúde      │ 25%      │ 40%      │ 35%      │
│ Aumentar Energia    │ 20%      │ 55%      │ 25%      │
│ Recuperação         │ 30%      │ 45%      │ 25%      │
│ Longevidade         │ 20%      │ 40%      │ 40%      │
└─────────────────────┴──────────┴──────────┴──────────┘
```

### Proteína por kg de Peso Corporal

| Objetivo | g/kg | Justificativa |
|----------|------|---------------|
| Emagrecer | 2.0-2.2 | Preservar massa muscular em déficit |
| Manter | 1.6-1.8 | Manutenção básica |
| Ganhar peso | 1.8-2.0 | Suporte ao crescimento |
| Recomposição | 2.2-2.4 | Máximo para troca de composição |
| **Hipertrofia** | **2.0-2.2** | Síntese proteica ótima |
| Lean Bulk | 2.0-2.2 | Ganho muscular limpo |
| **Cutting** | **2.4-2.6** | Preservação máxima em déficit |
| Definição | 2.2-2.4 | Manter músculo, perder gordura |
| **Alta Performance** | **1.8-2.0** | Recuperação + energia |
| Endurance | 1.4-1.6 | Foco em carbs para energia |
| Força Máxima | 2.0-2.2 | Força e recuperação |
| **Prep. Competição** | **2.6-3.0** | Preservação extrema |
| Off-Season | 1.8-2.0 | Crescimento relaxado |

---

## 🏢 Integração com Sistema de Treinos da Academia

### Fase 1: Sincronização de Dados

- [ ] **T-INT-1.1 - API de integração com sistema da academia**
  - Endpoint para receber dados de treino do usuário
  - Formato: `{ user_id, workout_type, intensity, duration, calories_burned }`

- [ ] **T-INT-1.2 - Ajuste automático de calorias**
  - Dias de treino intenso: +200-400 kcal
  - Dias de cardio longo: +300-600 kcal (principalmente carbs)
  - Dias de descanso: calorias base

- [ ] **T-INT-1.3 - Detecção automática de objetivo**
  - Baseado no programa de treino da academia:
    - Treino de hipertrofia detectado → sugerir objetivo "Hipertrofia"
    - Treino de resistência detectado → sugerir objetivo "Endurance"
    - Treino misto → sugerir objetivo "Alta Performance"

### Fase 2: Timing Nutricional

- [ ] **T-INT-2.1 - Sugestão de refeições pré/pós-treino**
  - Sincronizar com horário de treino da academia
  - Pré-treino (1-2h antes): carbs + proteína moderada
  - Pós-treino (até 2h depois): proteína + carbs rápidos

- [ ] **T-INT-2.2 - Periodização nutricional**
  - Semanas de volume alto: +10% calorias
  - Semanas de deload: calorias base
  - Fase de competição: ajuste progressivo

### Fase 3: Relatórios Integrados

- [ ] **T-INT-3.1 - Dashboard unificado**
  - Mostrar treino + nutrição lado a lado
  - Correlação: "Seu desempenho melhora quando você come X calorias"

- [ ] **T-INT-3.2 - Alertas inteligentes**
  - "Você treinou pesado ontem mas não bateu a meta de proteína"
  - "Amanhã é dia de perna, considere aumentar os carbs hoje"

---

## 🎯 Implementação dos Novos Objetivos

### Backend - Atualizar `server/health/routes.py`

```python
# Todos os objetivos disponíveis
AVAILABLE_GOALS = {
    # Básicos
    "lose": {
        "name": "Emagrecer",
        "category": "basic",
        "calorie_adjustment": -500,
        "protein_per_kg": 2.0,
        "carbs_pct": 0.35,
        "fats_pct": 0.35,
        "description": "Perder peso de forma saudável e sustentável"
    },
    "maintain": {
        "name": "Manter peso",
        "category": "basic",
        "calorie_adjustment": 0,
        "protein_per_kg": 1.6,
        "carbs_pct": 0.45,
        "fats_pct": 0.30,
        "description": "Estabilizar peso atual"
    },
    "gain": {
        "name": "Ganhar peso",
        "category": "basic",
        "calorie_adjustment": 500,
        "protein_per_kg": 1.8,
        "carbs_pct": 0.50,
        "fats_pct": 0.30,
        "description": "Aumento de peso geral"
    },
    
    # Composição Corporal
    "recomposition": {
        "name": "Recomposição Corporal",
        "category": "body_composition",
        "calorie_adjustment": 0,
        "protein_per_kg": 2.4,
        "carbs_pct": 0.35,
        "fats_pct": 0.30,
        "description": "Trocar gordura por músculo mantendo peso similar"
    },
    "hypertrophy": {
        "name": "Hipertrofia",
        "category": "body_composition",
        "calorie_adjustment": 400,
        "protein_per_kg": 2.2,
        "carbs_pct": 0.45,
        "fats_pct": 0.25,
        "description": "Foco máximo em ganho de massa muscular"
    },
    "lean_gain": {
        "name": "Lean Bulk",
        "category": "body_composition",
        "calorie_adjustment": 200,
        "protein_per_kg": 2.2,
        "carbs_pct": 0.40,
        "fats_pct": 0.30,
        "description": "Ganho de massa com mínimo acúmulo de gordura"
    },
    "cutting": {
        "name": "Cutting / Secar",
        "category": "body_composition",
        "calorie_adjustment": -400,
        "protein_per_kg": 2.5,
        "carbs_pct": 0.30,
        "fats_pct": 0.30,
        "description": "Definição muscular, perder gordura preservando músculo"
    },
    "definition": {
        "name": "Definição",
        "category": "body_composition",
        "calorie_adjustment": -200,
        "protein_per_kg": 2.2,
        "carbs_pct": 0.35,
        "fats_pct": 0.30,
        "description": "Manter massa, reduzir percentual de gordura"
    },
    
    # Alta Performance
    "performance": {
        "name": "Alta Performance",
        "category": "performance",
        "calorie_adjustment": 300,
        "protein_per_kg": 2.0,
        "carbs_pct": 0.50,
        "fats_pct": 0.25,
        "description": "Maximizar energia e recuperação para treinos intensos"
    },
    "endurance": {
        "name": "Resistência / Endurance",
        "category": "performance",
        "calorie_adjustment": 500,
        "protein_per_kg": 1.6,
        "carbs_pct": 0.60,
        "fats_pct": 0.25,
        "description": "Foco em cardio, maratonas, ciclismo - carbs altos"
    },
    "strength": {
        "name": "Força Máxima",
        "category": "performance",
        "calorie_adjustment": 400,
        "protein_per_kg": 2.0,
        "carbs_pct": 0.45,
        "fats_pct": 0.30,
        "description": "Powerlifting, levantamento de peso"
    },
    "athletic": {
        "name": "Condicionamento Atlético",
        "category": "performance",
        "calorie_adjustment": 200,
        "protein_per_kg": 1.8,
        "carbs_pct": 0.50,
        "fats_pct": 0.25,
        "description": "Esportes em geral, agilidade, explosão"
    },
    "competition_prep": {
        "name": "Preparação para Competição",
        "category": "performance",
        "calorie_adjustment": -600,
        "protein_per_kg": 2.8,
        "carbs_pct": 0.25,
        "fats_pct": 0.30,
        "description": "Fase final antes de competição de bodybuilding"
    },
    "off_season": {
        "name": "Off-Season",
        "category": "performance",
        "calorie_adjustment": 600,
        "protein_per_kg": 2.0,
        "carbs_pct": 0.50,
        "fats_pct": 0.25,
        "description": "Período de recuperação e construção pós-competição"
    },
    
    # Saúde
    "health_improve": {
        "name": "Melhorar Saúde",
        "category": "health",
        "calorie_adjustment": 0,
        "protein_per_kg": 1.4,
        "carbs_pct": 0.40,
        "fats_pct": 0.35,
        "description": "Foco em qualidade nutricional, não peso"
    },
    "energy_boost": {
        "name": "Aumentar Energia",
        "category": "health",
        "calorie_adjustment": 100,
        "protein_per_kg": 1.6,
        "carbs_pct": 0.55,
        "fats_pct": 0.25,
        "description": "Combater fadiga, melhorar disposição"
    },
    "recovery": {
        "name": "Recuperação",
        "category": "health",
        "calorie_adjustment": 200,
        "protein_per_kg": 2.0,
        "carbs_pct": 0.45,
        "fats_pct": 0.25,
        "description": "Pós-lesão, pós-cirurgia, recuperação muscular"
    },
    "longevity": {
        "name": "Longevidade",
        "category": "health",
        "calorie_adjustment": -100,
        "protein_per_kg": 1.2,
        "carbs_pct": 0.40,
        "fats_pct": 0.40,
        "description": "Alimentação anti-inflamatória, saúde a longo prazo"
    }
}
```

### Frontend - Atualizar `GoalsTab.jsx`

```javascript
const GOAL_CATEGORIES = {
    basic: {
        label: "Objetivos Básicos",
        description: "Para quem está começando ou tem metas simples",
        icon: "🎯"
    },
    body_composition: {
        label: "Composição Corporal",
        description: "Para praticantes de musculação",
        icon: "💪"
    },
    performance: {
        label: "Alta Performance",
        description: "Para atletas e treinos intensos",
        icon: "🏆"
    },
    health: {
        label: "Saúde & Bem-estar",
        description: "Foco em qualidade de vida",
        icon: "❤️"
    }
};

const GOALS = [
    // Básicos
    { id: "lose", label: "Emagrecer", category: "basic", icon: "📉", description: "Perder peso de forma saudável" },
    { id: "maintain", label: "Manter peso", category: "basic", icon: "⚖️", description: "Estabilizar peso atual" },
    { id: "gain", label: "Ganhar peso", category: "basic", icon: "📈", description: "Aumento de peso geral" },
    
    // Composição Corporal
    { id: "recomposition", label: "Recomposição", category: "body_composition", icon: "🔄", description: "Trocar gordura por músculo" },
    { id: "hypertrophy", label: "Hipertrofia", category: "body_composition", icon: "💪", description: "Máximo ganho muscular" },
    { id: "lean_gain", label: "Lean Bulk", category: "body_composition", icon: "🌱", description: "Ganho limpo de massa" },
    { id: "cutting", label: "Cutting", category: "body_composition", icon: "🔪", description: "Secar preservando músculo" },
    { id: "definition", label: "Definição", category: "body_composition", icon: "✨", description: "Reduzir % de gordura" },
    
    // Performance
    { id: "performance", label: "Alta Performance", category: "performance", icon: "🚀", description: "Energia e recuperação máximas" },
    { id: "endurance", label: "Endurance", category: "performance", icon: "🏃", description: "Resistência e cardio" },
    { id: "strength", label: "Força Máxima", category: "performance", icon: "🏋️", description: "Powerlifting, peso pesado" },
    { id: "athletic", label: "Condicionamento", category: "performance", icon: "⚡", description: "Esportes, agilidade" },
    { id: "competition_prep", label: "Prep. Competição", category: "performance", icon: "🏆", description: "Fase final de contest" },
    { id: "off_season", label: "Off-Season", category: "performance", icon: "🌴", description: "Recuperação pós-competição" },
    
    // Saúde
    { id: "health_improve", label: "Melhorar Saúde", category: "health", icon: "❤️", description: "Qualidade nutricional" },
    { id: "energy_boost", label: "Mais Energia", category: "health", icon: "⚡", description: "Combater fadiga" },
    { id: "recovery", label: "Recuperação", category: "health", icon: "🩹", description: "Pós-lesão ou cirurgia" },
    { id: "longevity", label: "Longevidade", category: "health", icon: "🧬", description: "Saúde a longo prazo" },
];
```

---

## 📅 Cronograma de Implementação

### Sprint 1 (Atual - 1 semana) ✅
- [x] Adicionar objetivo "Recomposição Corporal"
- [x] Corrigir bug de "0 calorias"
- [x] Cálculo de proteína por kg de peso

### Sprint 2 (Próxima - 1 semana)
- [ ] Adicionar todos os objetivos de Composição Corporal
- [ ] Atualizar UI para seleção por categorias
- [ ] Adicionar descrições e dicas por objetivo

### Sprint 3 (2 semanas)
- [ ] Adicionar objetivos de Alta Performance
- [ ] Adicionar objetivos de Saúde
- [ ] Criar endpoint `/health/goals/list` para listar objetivos disponíveis

### Sprint 4 (2 semanas)
- [ ] Integração inicial com sistema de treinos da academia
- [ ] API de sincronização de treinos
- [ ] Ajuste automático de calorias por dia de treino

### Sprint 5+ (Futuro)
- [ ] Timing nutricional (pré/pós-treino)
- [ ] Periodização nutricional
- [ ] Dashboard integrado treino + nutrição

---

## 📚 Referências Técnicas

### Fórmulas Utilizadas

**Taxa Metabólica Basal (TMB) - Mifflin-St Jeor:**
- Homens: `(10 × peso) + (6.25 × altura) - (5 × idade) + 5`
- Mulheres: `(10 × peso) + (6.25 × altura) - (5 × idade) - 161`

**Multiplicadores de Atividade (TDEE):**
| Nível | Multiplicador | Descrição |
|-------|---------------|-----------|
| Sedentário | 1.2 | Pouca ou nenhuma atividade |
| Leve | 1.375 | 1-3 dias/semana |
| Moderado | 1.55 | 3-5 dias/semana |
| Ativo | 1.725 | 6-7 dias/semana |
| Muito ativo | 1.9 | Atleta, 2x/dia |

### Limites de Segurança

| Parâmetro | Mínimo | Máximo | Alerta |
|-----------|--------|--------|--------|
| Calorias (♂) | 1500 | 5000 | < 1200 |
| Calorias (♀) | 1200 | 4000 | < 1000 |
| Proteína | 0.8g/kg | 3.5g/kg | > 3.0g/kg |
| Gordura | 20% cal | 45% cal | < 15% |
| Déficit | - | 1000 kcal | > 750 kcal |

---

## 🔗 Notas sobre Integração com Academia

### Dados Necessários do Sistema de Treinos

```json
{
    "user_id": "firebase_uid",
    "workout": {
        "date": "2025-01-12",
        "type": "strength",           // strength, cardio, hiit, mixed
        "muscle_groups": ["chest", "triceps"],
        "intensity": "high",          // low, medium, high, max
        "duration_minutes": 75,
        "calories_burned": 450,       // se disponível
        "program": "hypertrophy_12wk" // programa atual
    }
}
```

### Webhook de Atualização

Quando o usuário completar um treino na academia, o sistema enviará um webhook para o Luna Health:

```
POST /health/sync/workout
{
    "user_id": "...",
    "workout_completed": { ... }
}
```

O Luna Health responderá ajustando as metas do dia se necessário.

---

**Criado em**: 2025-01-12  
**Atualizado em**: 2025-01-12  
**Autor**: Luna AI Assistant  
**Versão**: 2.0 (Integração Academia)
