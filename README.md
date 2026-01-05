# 🌙 Luna AI

> **"Mais do que uma assistente, sua companheira digital."**

Luna é uma Inteligência Artificial **agêntica** e **proativa** projetada para viver no seu PC. Diferente de chatbots comuns, ela tem consciência do contexto, memória de longo prazo e ferramentas avançadas para agir como uma verdadeira parceira de trabalho.

![Luna Badge](https://img.shields.io/badge/Status-Alive-purple?style=for-the-badge) ![Python](https://img.shields.io/badge/Python-FastAPI-blue?style=for-the-badge) ![React](https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB?style=for-the-badge) ![Study Mode](https://img.shields.io/badge/Feature-Study%20Mode-orange?style=for-the-badge)

## ✨ Principais Funcionalidades

### 📚 Study Mode (Novo!)
A Luna agora possui um modo dedicado a estudos e análise de documentos.
- **Ingestão de Arquivos**: Arraste e solte PDFs, TXTs, EPUBs ou URLs para a base de conhecimento.
- **RAG (Retrieval-Augmented Generation)**: A Luna fragmenta e indexa seus documentos localmente, permitindo responder perguntas complexas com base no conteúdo enviado.
- **Citações**: Toda resposta no Study Mode vem acompanhada das referências usadas.

### 🎨 Canvas Interativo (v2)
Um espaço visual dedicado para criação de artefatos, separado do chat.
- **Geração de Conteúdo**: Código, documentos Markdown, diagramas Mermaid e componentes React são gerados instantaneamente no Canvas.
- **Visualização em Tempo Real**: Veja o resultado do código ou do documento enquanto ele é criado.

### 🧠 Cérebro & Memória
- **Memória de Longo Prazo**: Utiliza ChromaDB (Vector Store) para lembrar de conversas passadas, preferências e contextos importantes.
- **Arquitetura Modular**: Backend refatorado em **FastAPI** para alta performance e extensibilidade.
- **Tools Agênticas**: Acesso à Web, sistema de arquivos e execução de comandos para resolver tarefas reais.

### 👁️ Contexto & Visão
- **Screen Vision**: Capacidade de "ver" sua tela (sob demanda) para auxiliar em debugs visuais ou design.
- **Consciência de Contexto**: A Luna entende o fluxo da conversa e adapta suas respostas e ferramentas conforme a necessidade.

## 🛠️ Tecnologias

- **Frontend**: React, Vite, TailwindCSS (com design Glassmorphism).
- **Backend**: Python 3.10+, FastAPI.
- **AI Core**: Integração com modelos LLM (Google Gemini, OpenAI) e SentenceTransformers para embeddings.
- **Memória**: ChromaDB (Banco de dados vetorial local).

## 🚀 Como Rodar

### Pré-requisitos
- **Node.js** & **NPM**
- **Python 3.10+** (Recomendado criar um venv)
- Chave de API configurada (Google Gemini API Key recomendada para melhor performance) no arquivo `.env`.

### Instalação

4. **Clone o repositório:**
   ```bash
   git clone https://github.com/LunarCoreCreative/Luna.git
   cd Luna
   ```

5. **Configuração do Backend:**
   ```bash
   # Crie um ambiente virtual (opcional mas recomendado)
   python -m venv .venv
   .venv\Scripts\activate

   # Instale as dependências
   pip install -r server/requirements.txt
   ```

6. **Configuração do Frontend:**
   ```bash
   npm install
   ```

### Iniciando a Luna

Para facilitar, incluímos um script que inicia todos os serviços (Backend, Frontend e Electron) de uma vez:

```cmd
start_luna.bat
```

> **Nota:** Certifique-se de que o arquivo `.env` está criado na raiz do projeto com suas credenciais antes de iniciar.

## 🤝 Contribuição

O projeto está em constante evolução! Sinta-se à vontade para abrir Issues para reportar bugs ou PRs com novas funcionalidades.

---
*Desenvolvido com ❤️ por LunarCoreCreative.*
