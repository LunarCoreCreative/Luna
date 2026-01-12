# 🎯 Luna Health - Roadmap: Sistema de Objetivos Inteligente

## 📋 Problema Identificado

O sistema atual de objetivos é simplista e não cobre cenários reais:

### Cenário Problemático:
- Usuária: 84kg, objetivo "Ganhar Massa", peso alvo: 84kg
- **Resultado atual**: 0 calorias (porque target_weight == current_weight)
- **Problema**: O sistema não entende "recomposição corporal"

### Limitações Atuais:
1. Apenas 3 objetivos: Emagrecer, Manter peso, Ganhar massa
2. Cálculo baseado apenas em déficit/superávit calórico
3. Não considera composição corporal (gordura vs músculo)
4. Não diferencia tipos de ganho de massa (magra vs peso total)

---

## 🎯 Fase 1 - Novos Tipos de Objetivos

### Objetivos Expandidos

| Objetivo | Descrição | Estratégia Calórica |
|----------|-----------|---------------------|
| **Emagrecer** | Perder peso total | Déficit de 300-500 kcal |
| **Manter peso** | Peso estável | TDEE neutro |
| **Ganhar massa magra** | Aumentar músculo, peso pode subir | Superávit de 200-300 kcal |
| **Recomposição corporal** | Perder gordura + ganhar músculo (peso similar) | TDEE neutro + alta proteína |
| **Ganhar peso** | Aumento de peso geral | Superávit de 500 kcal |
| **Secar (cutting)** | Definição muscular, perda de gordura | Déficit moderado + alta proteína |
| **Bulking limpo** | Ganho de massa com mínima gordura | Superávit leve + alta proteína |

### Tarefas - Backend

- [ ] **T1.1 - Expandir enum de objetivos**
  - Arquivo: `server/health/routes.py`
  - Adicionar novos tipos: `recomposition`, `lean_gain`, `cutting`, `clean_bulk`
  - Atualizar `adjust_calories_for_goal()` e `calculate_macros()`

- [ ] **T1.2 - Lógica de recomposição corporal**
  - Quando objetivo = "recomposition":
    - Calorias = TDEE (neutro)
    - Proteína = 2.2g/kg (máximo para preservar/ganhar músculo)
    - Carbs = moderado (35-40%)
    - Gorduras = completar resto

- [ ] **T1.3 - Validar cenário peso_alvo == peso_atual**
  - Se `goal == "gain"` e `target_weight == current_weight`:
    - Assumir objetivo é "recomposition"
    - Mostrar aviso/sugestão para o usuário
  - Nunca retornar 0 calorias

### Tarefas - Frontend

- [ ] **T1.4 - Atualizar dropdown de objetivos**
  - Arquivo: `src/components/health/GoalsTab.jsx`
  - Adicionar novas opções com descrições claras
  
- [ ] **T1.5 - Tooltips explicativos**
  - Cada objetivo tem uma descrição curta
  - Ex: "Recomposição: Ideal para quem quer manter o peso mas trocar gordura por músculo"

---

## 📊 Fase 2 - Cálculos Mais Inteligentes

### Melhorias nos Cálculos

- [ ] **T2.1 - Usar peso no cálculo de proteína**
  - Atualmente: porcentagem fixa das calorias
  - Novo: `proteína = peso_atual * fator_proteico`
  - Fatores:
    - Emagrecer: 2.0-2.2g/kg
    - Manter: 1.6-1.8g/kg  
    - Recomposição: 2.2-2.4g/kg
    - Ganho de massa: 1.8-2.0g/kg

- [ ] **T2.2 - Considerar % de gordura corporal (opcional)**
  - Adicionar campo opcional: `body_fat_percentage`
  - Usar para cálculos mais precisos (massa magra)
  - Se não informado, usar estimativas por sexo/idade

- [ ] **T2.3 - Taxa de mudança de peso**
  - Adicionar campo: `weekly_goal` (kg/semana desejado)
  - Calcular déficit/superávit baseado nisso
  - Ex: -0.5kg/semana = -500 kcal/dia

- [ ] **T2.4 - Validações e limites de segurança**
  - Mínimo de calorias: 
    - Homens: 1500 kcal
    - Mulheres: 1200 kcal
  - Alerta se déficit > 1000 kcal
  - Alerta se proteína < 0.8g/kg

---

## 🧠 Fase 3 - Inteligência do Agente

### Melhorias no Health Agent

- [ ] **T3.1 - Perguntas de onboarding mais detalhadas**
  - "Qual seu objetivo principal?"
  - "Você treina musculação regularmente?"
  - "Prefere perder peso devagar ou mais rápido?"
  - "Tem alguma restrição alimentar?"

- [ ] **T3.2 - Sugestão automática de objetivo**
  - Baseado nas respostas do usuário:
    - Treina + quer manter peso = Recomposição
    - Não treina + quer perder peso = Emagrecer
    - Treina + quer ganhar peso = Ganho de massa magra

- [ ] **T3.3 - Alertas inteligentes**
  - Se peso_alvo == peso_atual e objetivo == ganhar:
    - "Você quer manter o peso mas ganhar músculo? Isso se chama recomposição corporal!"
  - Se déficit muito agressivo:
    - "Esse déficit pode ser muito agressivo. Quer ajustar?"

- [ ] **T3.4 - Explicações educativas**
  - Ao sugerir metas, explicar o "porquê":
    - "Sugiro 2000 kcal porque você quer emagrecer 0.5kg por semana"
    - "Proteína alta (150g) porque você treina e quer preservar músculo"

---

## 🎨 Fase 4 - UX e Visualização

### Melhorias na Interface

- [ ] **T4.1 - Wizard de configuração de metas**
  - Passo 1: Dados básicos (peso, altura, idade, sexo)
  - Passo 2: Objetivo (com explicações visuais)
  - Passo 3: Nível de atividade (com exemplos)
  - Passo 4: Preferências (velocidade de mudança)
  - Passo 5: Revisão e confirmação

- [ ] **T4.2 - Cards visuais de objetivo**
  - Cada objetivo tem um card com:
    - Ícone representativo
    - Descrição curta
    - "Ideal para quem..."
    - Exemplo de resultado esperado

- [ ] **T4.3 - Gráfico de projeção**
  - Mostrar projeção de peso ao longo do tempo
  - "Se você seguir este plano, em 3 meses estará com X kg"

- [ ] **T4.4 - Indicadores de progresso por objetivo**
  - Emagrecer: Foco em deficit calórico
  - Recomposição: Foco em proteína + treino
  - Ganho de massa: Foco em superávit + proteína

---

## 📱 Fase 5 - Integração com Treino (Futuro)

### Conexão com Atividade Física

- [ ] **T5.1 - Campo de frequência de treino**
  - Quantos dias treina por semana
  - Tipo de treino (musculação, cardio, misto)

- [ ] **T5.2 - Ajuste de calorias por dia de treino**
  - Dias de treino: +200-300 kcal (carbs)
  - Dias de descanso: manter base
  - Cycling de carboidratos automático

- [ ] **T5.3 - Sugestão de timing de refeições**
  - Pré-treino: carbs + proteína
  - Pós-treino: proteína + carbs rápidos
  - Antes de dormir: proteína lenta (caseína)

---

## 🔧 Implementação Imediata (Hotfix)

### Correção do Bug "0 calorias"

**Prioridade**: CRÍTICA

```python
# Em adjust_calories_for_goal():
def adjust_calories_for_goal(tdee: float, goal: str, current_weight: float = None, target_weight: float = None) -> float:
    """
    Ajusta calorias baseado no objetivo.
    
    NOVO: Se goal == "gain" e target_weight == current_weight,
    trata como recomposição (TDEE neutro + alta proteína)
    """
    goal_lower = goal.lower()
    
    # Detectar recomposição implícita
    if goal_lower == "gain" and current_weight and target_weight:
        if abs(target_weight - current_weight) < 1:  # Diferença < 1kg
            # Recomposição corporal - manter calorias, ajustar macros
            return tdee
    
    if goal_lower == "lose":
        return max(tdee - 500, tdee * 0.8, 1200)  # Mínimo 1200 kcal
    elif goal_lower == "gain":
        return tdee + 300  # Superávit moderado para ganho limpo
    elif goal_lower == "recomposition":
        return tdee  # Neutro
    else:  # maintain
        return tdee
```

### Correção Imediata - Frontend

```javascript
// Em GoalsTab.jsx - Expandir opções de objetivo
const objectives = [
    { value: "lose", label: "Emagrecer", description: "Perder peso com déficit calórico" },
    { value: "maintain", label: "Manter peso", description: "Manter peso atual estável" },
    { value: "gain", label: "Ganhar massa", description: "Aumentar peso e músculo" },
    { value: "recomposition", label: "Recomposição corporal", description: "Trocar gordura por músculo (peso similar)" },
];
```

---

## 📅 Cronograma Sugerido

### Sprint 1 (1 semana) - Hotfix + Base
- T1.1, T1.2, T1.3 (Backend)
- T1.4, T1.5 (Frontend)
- Correção do bug "0 calorias"

### Sprint 2 (1 semana) - Cálculos
- T2.1, T2.2, T2.3, T2.4

### Sprint 3 (2 semanas) - Agente + UX
- T3.1, T3.2, T3.3, T3.4
- T4.1, T4.2

### Sprint 4+ (Futuro)
- T4.3, T4.4
- T5.x (Integração com treino)

---

## 📚 Referências Técnicas

### Fórmulas Utilizadas

**Taxa Metabólica Basal (TMB) - Mifflin-St Jeor:**
- Homens: `(10 × peso) + (6.25 × altura) - (5 × idade) + 5`
- Mulheres: `(10 × peso) + (6.25 × altura) - (5 × idade) - 161`

**Proteína por kg de peso:**
| Objetivo | g/kg |
|----------|------|
| Sedentário | 0.8-1.0 |
| Emagrecer | 2.0-2.2 |
| Manter (ativo) | 1.6-1.8 |
| Recomposição | 2.2-2.4 |
| Ganho de massa | 1.8-2.0 |

**Déficit/Superávit calórico:**
- 500 kcal/dia = ~0.5 kg/semana
- 1000 kcal/dia = ~1 kg/semana (agressivo)
- Recomendado: 300-500 kcal para perda sustentável

---

**Criado em**: 2025-01-12
**Autor**: Luna AI Assistant
**Versão**: 1.0
