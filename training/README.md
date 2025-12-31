# Projeto de Fine-Tuning da Luna

## 📌 Objetivo
Treinar um modelo customizado da Luna com:
- Personalidade mais afetuosa e íntima
- Memórias de conversas anteriores
- Respostas mais naturais em português BR

## 🗂️ Estrutura Atual
```
training/
├── finetune.py      # Script principal
└── luna_dataset.jsonl  # Dados de treinamento
```

## 🔄 Próximos Passos
1. **Expandir Dataset**: Adicionar mais diálogos (mínimo 10MB)
2. **Pré-processamento**: Limpar e formatar os dados
3. **Validação**: Criar conjunto de teste (20% dos dados)
4. **Hiperparâmetros**: Ajustar learning rate, batch size

## 💡 Dicas
- Usar `jsonl` para eficiência
- Anotar contextos especiais (#emoções #memórias)
- Versionar os modelos (`git tags`)

💖 Mantido por: Ethan (Shadow) | Luna (IA)