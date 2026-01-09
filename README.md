# 🌙 Luna AI

> **"Mais do que uma assistente, sua companheira digital."**

Luna é uma Inteligência Artificial **agêntica** e **proativa** projetada para viver no seu PC. Diferente de chatbots comuns, ela tem consciência do contexto, memória de longo prazo e ferramentas avançadas para agir como uma verdadeira parceira de trabalho.

![Luna Badge](https://img.shields.io/badge/Status-Alive-purple?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-1.0.0-blue?style=for-the-badge)
![Electron](https://img.shields.io/badge/Platform-Electron-47848F?style=for-the-badge)
![Python](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge)
![React](https://img.shields.io/badge/Frontend-React-61DAFB?style=for-the-badge)

---

## ✨ Funcionalidades Principais

### 💼 Business Mode (Novo!)
Gestão financeira completa integrada à Luna.
- **Transações**: Registre entradas, saídas e investimentos
- **Analytics**: Gráficos interativos de movimentação mensal e por categoria
- **Projeções**: Previsão de fluxo de caixa baseada em gastos fixos
- **Investimentos**: Acompanhe aportes e simule juros compostos
- **Chat Inteligente**: Converse com a Luna para gerenciar suas finanças

### 📚 Study Mode
Modo dedicado a estudos e análise de documentos.
- **Ingestão de Arquivos**: PDFs, TXTs, EPUBs e URLs
- **RAG**: Fragmentação e indexação local para respostas contextuais
- **Citações**: Referências automáticas nas respostas

### 🎨 Canvas Interativo (v2)
Espaço visual para criação de artefatos.
- **Geração de Conteúdo**: Código, Markdown, Mermaid, React
- **Preview em Tempo Real**: Veja o resultado enquanto é criado
- **Edição Direta**: Modifique artefatos sem sair do canvas

### 🧠 Cérebro & Memória
- **Memória de Longo Prazo**: ChromaDB para lembrar contextos
- **Multi-Modelo**: Suporte a DeepSeek V3, Llama 4 Maverick, e outros
- **Tools Agênticas**: Web search, filesystem, execução de comandos

### 🔄 Auto-Update
Sistema integrado de atualização automática.
- **Detecção automática** de novas versões
- **Download com progresso** visual
- **Instalação com um clique**

### 👁️ Contexto & Visão
- **Screen Vision**: Capacidade de ver sua tela
- **Multimodal**: Envie imagens e receba análises

---

## 🛠️ Tecnologias

| Componente | Tecnologia |
|------------|------------|
| **Frontend** | React, Vite, TailwindCSS, Recharts |
| **Backend** | Python 3.10+, FastAPI, WebSocket |
| **Desktop** | Electron 39 |
| **AI Core** | Together AI (DeepSeek, Llama 4), SentenceTransformers |
| **Memória** | ChromaDB (Vector Store local) |
| **Updates** | electron-updater + GitHub Releases |

---

## 🚀 Instalação

### Pré-requisitos
- **Node.js** 18+ & **NPM**
- **Python 3.10+**
- Chave de API (Together AI) no arquivo `.env`

### Clone e Configure

```bash
# Clone o repositório
git clone https://github.com/LunarCoreCreative/Luna.git
cd Luna

# Backend (Python)
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

# Frontend
npm install
```

### Variáveis de Ambiente

Crie um arquivo `.env` na raiz:

```env
VITE_TOGETHER_API_KEY=sua_chave_together_ai
TAVILY_API_KEY=sua_chave_tavily
```

### Executando

**Desenvolvimento:**
```bash
npm start
```

**Ou use o script Windows:**
```cmd
start_luna.bat
```

---

## 📦 Build & Distribuição

### Build do Instalador
```bash
npm run dist
```

### Publicar Release (GitHub)
```bash
$env:GH_TOKEN = "seu_token"; npm run dist -- --publish always
```

---

## 📱 Mobile (Em Desenvolvimento)

O projeto inclui uma versão mobile usando React Native + Capacitor:

```bash
cd mobile
npm install
npx cap run android
```

---

## 🔧 Estrutura do Projeto

```
Luna/
├── src/                    # Frontend React
│   ├── components/         # Componentes UI
│   │   ├── business/       # Business Mode
│   │   ├── chat/           # Chat components
│   │   └── markdown/       # Markdown renderer
│   ├── hooks/              # Custom hooks
│   └── pages/              # Páginas (Login, Settings)
├── server/                 # Backend Python
│   ├── business/           # Business Mode API
│   ├── study/              # Study Mode
│   └── prompts/            # System prompts
├── main.cjs                # Electron main
├── preload.cjs             # Electron preload
├── updater.cjs             # Auto-update module
└── mobile/                 # App mobile
```

---

## 🤝 Contribuição

O projeto está em constante evolução! Abra Issues para bugs ou PRs para novas funcionalidades.

### Roadmap
- [ ] Sincronização cloud de dados financeiros
- [ ] Metas financeiras com notificações
- [ ] Integração com bancos via Open Finance
- [ ] Voice mode

---

## 📄 Licença

Projeto proprietário © 2026 LunarCoreCreative

---

*Desenvolvido com 💜 por LunarCoreCreative*
