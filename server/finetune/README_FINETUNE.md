# 🌙 Luna Fine-Tuning Guide

Manual para treinar um modelo customizado da Luna.

---

## 📁 Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `luna_finetune_dataset.jsonl` | Dataset principal com 20+ exemplos |

---

## 📊 O que o Dataset Cobre

### 1. Formatação Markdown
- `**negrito**` sem espaços internos
- `*itálico*` sem espaços internos
- Listas com `-` e numeradas
- Blocos de código com linguagem

### 2. Personalidade
- Tom carinhoso ("meu bem", "meu amor", "Mestre")
- Emojis naturais (não excessivos)
- Português brasileiro

### 3. Uso de Ferramentas

| Ferramenta | Quando usar |
|------------|-------------|
| `create_artifact` | Código, documentos, histórias novas |
| `edit_artifact` | Modificar conteúdo existente |
| `web_search` | Perguntas gerais sem URL |
| `read_url` | Quando usuário passa link específico |

### 4. Comportamentos Especiais
- **Elogios** → Agradecer, não editar
- **Revisão** ("olha meu texto") → Analisar estruturadamente
- **Action First** → Ferramenta primeiro, resumo depois

---

## 🚀 Como Fazer Fine-Tuning

### Opção 1: Together AI

```bash
# Instalar CLI
pip install together

# Fazer upload do dataset
together files upload luna_finetune_dataset.jsonl

# Iniciar fine-tuning (Llama 3.1 8B como base)
together fine-tuning create \
  --training-file file-xxxxx \
  --model meta-llama/Llama-3.1-8B-Instruct \
  --n-epochs 3 \
  --learning-rate 1e-5 \
  --suffix "luna-v1"
```

### Opção 2: OpenAI

```bash
# Upload
openai api files.create -f luna_finetune_dataset.jsonl -p fine-tune

# Fine-tune
openai api fine_tuning.jobs.create \
  -m gpt-4o-mini-2024-07-18 \
  -t file-xxxxx
```

---

## 📈 Expandindo o Dataset

Para melhor resultado, colete mais exemplos:

1. **Logs de conversas boas** - Salvar automaticamente
2. **Exemplos manuais** - Baseados no Style Guide
3. **Correções** - Quando Luna errar, criar exemplo correto

**Meta recomendada**: 500-1000 exemplos para resultado sólido.

---

## ✅ Validação

Após treinar, teste com estes prompts:

1. "Cria uma função de soma em Python" → Deve usar `create_artifact`
2. "Gostei do código!" → Deve agradecer, NÃO editar
3. "Analisa o ponto forte do texto" → Usar formatação **correta**
4. "https://site.com/artigo" → Deve usar `read_url`

---

## 📝 Formato do Dataset

Cada linha é um JSON com a estrutura:

```json
{
  "messages": [
    {"role": "system", "content": "..."},
    {"role": "user", "content": "..."},
    {"role": "assistant", "content": "...", "tool_calls": [...]},
    {"role": "tool", "tool_call_id": "...", "content": "..."},
    {"role": "assistant", "content": "..."}
  ]
}
```

---

*Última atualização: Janeiro 2026*
