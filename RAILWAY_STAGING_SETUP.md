# Configuração do Ambiente Staging no Railway

Este documento explica como configurar o ambiente de staging no Railway para testes e homologação.

## 🚀 Setup no Railway

### 1. Criar Novo Projeto/Service no Railway

1. Acesse [Railway Dashboard](https://railway.app)
2. Crie um novo projeto ou adicione um novo service ao projeto existente
3. Nome sugerido: `luna-staging` ou `Luna Staging`

### 2. Conectar ao Repositório

1. No service criado, vá em **Settings** → **Source**
2. Conecte ao repositório GitHub `LunarCoreCreative/Luna`
3. **IMPORTANTE**: Configure a branch para `staging` (não `main`)
   - Em **Branch**, selecione ou digite: `staging`

### 3. Configurar Variáveis de Ambiente

No Railway, vá em **Variables** e adicione:

```bash
# Identifica que este é o ambiente de staging
VITE_STAGING=true
STAGING=true

# Firebase (use as mesmas credenciais ou crie um projeto separado para staging)
FIREBASE_PROJECT_ID=seu-projeto-firebase
FIREBASE_PRIVATE_KEY=...
FIREBASE_CLIENT_EMAIL=...

# Together AI (pode usar a mesma key ou uma separada)
TOGETHER_API_KEY=sua-api-key

# Outras variáveis necessárias
PORT=8001
```

### 4. Configurar Domínio Customizado (Opcional)

1. Vá em **Settings** → **Domains**
2. Adicione o domínio: `luna-staging.up.railway.app`
3. Railway vai gerar automaticamente ou você pode usar um domínio customizado

### 5. Build Command (Opcional)

O Railway vai detectar automaticamente o `railway.toml`, mas você pode configurar manualmente:

- **Build Command**: (deixe vazio ou use `npm install` se necessário)
- **Start Command**: `python -m server.main`
- **Health Check Path**: `/health`

## 📦 Build Local para Staging

Para testar o build de staging localmente:

```bash
# Build web (staging)
npm run build:staging

# Build Electron (staging)
npm run dist:staging
```

## 🔍 Verificação

Após o deploy, verifique:

1. **URL do Servidor**: `https://luna-staging.up.railway.app`
2. **Health Check**: `https://luna-staging.up.railway.app/health`
3. **Frontend**: Deve conectar automaticamente ao servidor de staging quando `VITE_STAGING=true`

## 🔄 Workflow Recomendado

```
1. Desenvolvimento → Branch `staging`
2. Push para `staging` → Deploy automático no Railway Staging
3. Testes e Homologação → Validação com usuários beta
4. Merge `staging` → `main` → Deploy em Produção
```

## ⚠️ Importante

- **Staging usa a mesma branch `staging` do Git**
- **Produção usa a branch `main` do Git**
- **Variável `VITE_STAGING=true` diferencia os ambientes**
- **Staging pode usar Firebase separado ou o mesmo (recomendado: separado para testes)**

## 🐛 Troubleshooting

### Build falha
- Verifique se todas as dependências estão no `package.json`
- Confirme que o Python 3.11 está disponível (Railway usa Nixpacks)

### Frontend não conecta ao staging
- Verifique se `VITE_STAGING=true` está definida
- Confirme que o build foi feito com `npm run build:staging`
- Verifique o console do navegador para erros de conexão

### Health check falha
- Verifique se o servidor está rodando na porta correta
- Confirme que `/health` retorna `{"status": "ready"}`
