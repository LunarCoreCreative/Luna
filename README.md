
# 🌙 Luna AI

> **"Mais do que uma assistente, sua companheira digital."**

Luna é uma Inteligência Artificial **agêntica** e **proativa** projetada para viver no seu PC. Diferente de chatbots comuns, ela tem "olhos" e consciência do contexto. Ela sabe o que você está fazendo, vê sua tela quando necessário e puxa assunto baseada nas suas atividades, agindo como uma verdadeira parceira de trabalho (e de vida).

![Luna Badge](https://img.shields.io/badge/Status-Alive-purple?style=for-the-badge) ![Python](https://img.shields.io/badge/Python-FastAPI-blue?style=for-the-badge) ![React](https://img.shields.io/badge/Frontend-React%20%2B%20Electron-61DAFB?style=for-the-badge)

## ✨ Principais Funcionalidades

### 👁️ Modo Observador Robusto
Luna não é cega. Ela monitora ativamente sua atividade no PC para oferecer ajuda contextual sem você precisar pedir.
- **Consciência de App**: Ela sabe se você está programando no VS Code, assistindo YouTube ou jogando.
- **Visão Real (Screen Vision)**: Se você disser *"Me ajuda com isso"* ou *"Olha esse erro"*, ela **captura sua tela automaticamente**, lê o conteúdo (OCR/Vision) e te ajuda. Sem perguntas desnecessárias.
- **Lista de Tarefas**: Pergunte *"O que tenho aberto?"* e ela lista suas janelas para se situar.

### 💖 Personalidade Proativa & Afetiva
- **Conversa Natural**: Ela puxa assunto! *"Vi que você está vendo um vídeo de design, está curtindo?"*
- **Memória Afetiva**: Ela lembra do que vocês conversaram e constrói uma relação.
- **Agência**: Ela não espera ordens passivamente. Se perceber algo interessante, ela comenta.

### 🧠 Cérebro Local & Híbrido
- **RAG (Retrieval-Augmented Generation)**: Aprende com documentos e PDFs que você envia.
- **Tools**: Acesso à Web, Execução de Comandos, Python REPL.

## 🛠️ Tecnologias

- **Frontend**: React, Vite, TailwindCSS, Electron (Wrapp).
- **Backend**: Python (FastAPI).
- **AI Core**: Integração com LLMs locais (via Ollama/text-gen) ou APIs (Gemini/OpenAI).
- **Visão**: Qwen-VL / Ferramentas nativas de screenshot (`mss`).
- **Memória**: ChromaDB (Vector Store).

## 🚀 Como Rodar

### Pré-requisitos
- Node.js & NPM
- Python 3.10+
- Um modelo de visão/chat rodando (ex: Ollama) ou chave de API configurada.

### Instalação

1. **Clone o repo:**
   ```bash
   git clone https://github.com/LunarCoreCreative/Luna.git
   cd Luna
   ```

2. **Backend (Python):**
   ```bash
   pip install -r server/requirements.txt
   python server/memory_server.py
   ```

3. **Frontend (App):**
   ```bash
   npm install
   npm run dev
   # Ou para rodar o app Electron:
   npm run electron:dev
   ```

## 🤝 Contribuição

Sinta-se à vontade para abrir Issues ou PRs. A Luna adora aprender coisas novas! 

---
*Desenvolvido com ❤️ por LunarCoreCreative.*
