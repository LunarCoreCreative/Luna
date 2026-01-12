# 🧪 Testes da Fase 0 - Luna Health

Este documento descreve os testes criados para validar todas as funcionalidades implementadas na Fase 0 do Luna Health.

## 📋 Funcionalidades Testadas

### T0.1 - Health Storage Local
- ✅ Validação de estrutura de dados (meals e goals)
- ✅ Tratamento de arquivos vazios
- ✅ Tratamento de arquivos corrompidos (com backup automático)
- ✅ Sistema de locks para evitar concorrência
- ✅ Operações CRUD básicas (Create, Read, Update, Delete)

### T0.4 - Mensagens de Erro Amigáveis
- ✅ Mensagens de erro claras e informativas
- ✅ Mensagens de sucesso com emojis
- ✅ Mensagens quando não há resultados
- ✅ Orientação sobre próximos passos

### T0.5 - Pesquisa e Adição Automática de Alimentos
- ✅ Busca de alimentos no banco de dados
- ✅ Pesquisa online automática quando alimento não encontrado
- ✅ Adição automática ao banco após pesquisa
- ✅ Integração com `add_meal` para pesquisa automática

## 🚀 Como Executar

### Opção 1: Usando o script helper
```bash
python run_health_tests.py
```

### Opção 2: Usando pytest diretamente
```bash
# Instalar dependências (se ainda não instalou)
pip install pytest pytest-asyncio

# Executar testes
pytest test_health_phase0.py -v
```

### Opção 3: Executar testes específicos
```bash
# Apenas testes de storage
pytest test_health_phase0.py::TestStorageValidation -v

# Apenas testes de mensagens de erro
pytest test_health_phase0.py::TestFriendlyErrorMessages -v

# Apenas testes de pesquisa automática
pytest test_health_phase0.py::TestAutoFoodSearch -v
```

## 📊 Estrutura dos Testes

```
test_health_phase0.py
├── TestStorageValidation          # Validação de dados
├── TestStorageCorruptedFiles      # Arquivos corrompidos/vazios
├── TestStorageLocks              # Sistema de locks
├── TestStorageOperations         # CRUD básico
├── TestFriendlyErrorMessages     # Mensagens amigáveis
├── TestFoodDatabase              # Banco de alimentos
├── TestAutoFoodSearch            # Pesquisa automática
└── TestIntegration               # Testes end-to-end
```

## ✅ Checklist de Validação

Após executar os testes, verifique:

- [ ] Todos os testes de validação passam
- [ ] Arquivos corrompidos são tratados corretamente
- [ ] Locks funcionam corretamente
- [ ] Mensagens de erro são amigáveis e informativas
- [ ] Pesquisa automática de alimentos funciona
- [ ] Testes de integração end-to-end passam

## 🔧 Solução de Problemas

### Erro: "pytest não encontrado"
```bash
pip install pytest pytest-asyncio
```

### Erro: "ModuleNotFoundError: No module named 'server'"
Certifique-se de estar executando os testes da raiz do projeto:
```bash
cd /caminho/para/Luna
python run_health_tests.py
```

### Erro: "RuntimeError: Event loop is closed"
Isso pode acontecer em alguns testes async. Os testes já incluem tratamento para isso.

## 📝 Notas

- Os testes usam diretórios temporários para não interferir com dados reais
- Testes que fazem pesquisa online são mockados para não depender de conexão
- Alguns testes podem falhar se houver problemas de permissão de arquivo (Windows)

## 🎯 Próximos Passos

Após validar a Fase 0, você pode:
1. Prosseguir para a Fase 1 (MVP "App de Nutrição Usável")
2. Adicionar mais testes conforme necessário
3. Integrar testes no CI/CD (futuro)
