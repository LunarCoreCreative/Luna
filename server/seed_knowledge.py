import sys
import os

# Adiciona o diretório raiz ao path para importar as funções
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from server.memory import save_technical_knowledge

def seed():
    print("🧠 Iniciando alimentação da Base de Conhecimento da Luna... 🚀")
    
    # ==========================================================================
    # TAILWIND CSS v3+
    # ==========================================================================
    
    save_technical_knowledge(
        "Tailwind CSS @apply - Uso Correto",
        """O @apply no Tailwind CSS v3+ só funciona com CLASSES utilitárias do Tailwind, NÃO com CSS arbitrário.

❌ ERRADO (causa erro de build):
.text-glow {
    @apply text-shadow: 0 0 10px rgba(0,255,255,0.7);
}

✅ CERTO (use CSS puro para propriedades não-utilitárias):
.text-glow {
    @apply text-cyan-400;
    text-shadow: 0 0 10px rgba(0, 255, 255, 0.7);
}

✅ CERTO (@apply funciona com classes utilitárias):
.btn-primary {
    @apply bg-blue-600 hover:bg-blue-500 text-white font-bold py-2 px-4 rounded;
}

REGRA: @apply = classes do Tailwind. CSS arbitrário = CSS normal.""",
        "tailwind, css, apply, build-error"
    )
    
    save_technical_knowledge(
        "Tailwind CSS com PostCSS - Configuração Correta",
        """Para usar Tailwind CSS com PostCSS, você PRECISA de:

1. postcss.config.js na raiz:
module.exports = {
    plugins: {
        tailwindcss: {},
        autoprefixer: {},
    },
};

2. tailwind.config.js na raiz:
module.exports = {
    content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
    theme: { extend: {} },
    plugins: [],
};

3. No CSS principal (index.css):
@tailwind base;
@tailwind components;
@tailwind utilities;

4. Importar o CSS no index.js/main.js:
import './index.css';

IMPORTANTE: Se usar Craco, os scripts devem usar 'craco start', não 'react-scripts start'.""",
        "tailwind, postcss, config, react, craco"
    )
    
    # ==========================================================================
    # VITE vs CREATE REACT APP
    # ==========================================================================
    
    save_technical_knowledge(
        "Vite vs Create React App - Qual Usar",
        """RECOMENDAÇÃO 2024+: Use VITE para novos projetos React.

VITE (recomendado):
- Mais rápido (ESBuild)
- Hot Module Replacement instantâneo
- Configuração simples
- Suporte nativo a TypeScript

Criar projeto:
npm create vite@latest meu-app -- --template react

CRA (legado):
- Mais lento para builds
- Ainda funcional, mas em manutenção

CRACO (para CRA customizado):
- Necessário se quiser customizar CRA sem eject
- Scripts DEVEM ser 'craco start', 'craco build', etc.
- Muitos projetos migram para Vite em vez de usar Craco.""",
        "vite, cra, react, create-react-app, build"
    )
    
    # ==========================================================================
    # REACT IMPORTS OBRIGATÓRIOS
    # ==========================================================================
    
    save_technical_knowledge(
        "React - Imports Obrigatórios no Entry Point",
        """No arquivo de entrada do React (index.js ou main.jsx), você DEVE importar:

1. O CSS global:
import './index.css';

2. O React e ReactDOM:
import React from 'react';
import ReactDOM from 'react-dom/client';

3. O componente App:
import App from './App';

EXEMPLO COMPLETO (Vite):
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>
);

ERRO COMUM: Esquecer de importar './index.css' faz com que TODO o Tailwind não funcione.""",
        "react, import, css, entry-point, index.js"
    )
    
    # ==========================================================================
    # ESTRUTURA DE PROJETO REACT MODERNA
    # ==========================================================================
    
    save_technical_knowledge(
        "Estrutura de Projeto React Moderna (2024)",
        """Estrutura recomendada para projetos React com Vite:

meu-projeto/
├── public/
│   └── favicon.ico
├── src/
│   ├── components/
│   │   ├── ui/           # Componentes reutilizáveis (Button, Card, etc)
│   │   └── layout/       # Header, Footer, Sidebar
│   ├── pages/            # Páginas/Views
│   ├── hooks/            # Custom hooks
│   ├── utils/            # Funções utilitárias
│   ├── styles/           # CSS adicional se necessário
│   ├── App.jsx
│   ├── main.jsx          # Entry point (Vite)
│   └── index.css         # Tailwind directives
├── index.html
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
└── package.json

DICA: Mantenha componentes pequenos e focados em uma responsabilidade.""",
        "react, estrutura, projeto, pastas, vite"
    )
    
    # ==========================================================================
    # CSS VARIABLES VS TAILWIND TOKENS
    # ==========================================================================
    
    save_technical_knowledge(
        "CSS Variables com Tailwind - Padrão Moderno",
        """Para temas customizados com Tailwind, use CSS variables:

1. Defina as variáveis no :root (index.css):
:root {
    --color-primary: 139 92 246;     /* violet-500 em RGB */
    --color-background: 13 14 20;    /* dark bg */
}

2. Use no tailwind.config.js:
module.exports = {
    theme: {
        extend: {
            colors: {
                primary: 'rgb(var(--color-primary) / <alpha-value>)',
                background: 'rgb(var(--color-background) / <alpha-value>)',
            }
        }
    }
};

3. Use no JSX:
<div className="bg-background text-primary">

VANTAGEM: Permite trocar temas dinamicamente via JavaScript alterando --color-primary.""",
        "tailwind, css, variables, tema, dark-mode"
    )
    
    # ==========================================================================
    # GLASSMORPHISM PATTERN
    # ==========================================================================
    
    save_technical_knowledge(
        "Glassmorphism Design Pattern (CSS)",
        """O Glassmorphism cria um efeito de vidro fosco com transparência e desfoque.

Padrão CSS:
.glass {
    background: rgba(255, 255, 255, 0.05);
    backdrop-filter: blur(10px);
    -webkit-backdrop-filter: blur(10px);
    border: 1px solid rgba(255, 255, 255, 0.1);
    border-radius: 16px;
}

Com Tailwind (classe customizada no CSS):
.glass-panel {
    @apply bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl;
}

IMPORTANTE: backdrop-filter requer -webkit-backdrop-filter para Safari.""",
        "css, glassmorphism, design, ui, blur"
    )
    
    # ==========================================================================
    # FASTAPI STREAMING
    # ==========================================================================
    
    save_technical_knowledge(
        "FastAPI - Streaming Responses com JSON Chunks",
        """Para enviar dados em tempo real no FastAPI, use StreamingResponse:

from fastapi import FastAPI
from fastapi.responses import StreamingResponse
import json

async def generator():
    for token in ["Olá", " ", "mundo", "!"]:
        yield f"data: {json.dumps({'content': token})}\\n\\n"
    yield f"data: {json.dumps({'done': True})}\\n\\n"

@app.get("/stream")
async def stream():
    return StreamingResponse(
        generator(),
        media_type="text/event-stream"
    )

CLIENTE (JavaScript):
const evtSource = new EventSource('/stream');
evtSource.onmessage = (e) => {
    const data = JSON.parse(e.data);
    console.log(data.content);
};

IMPORTANTE: Cada chunk DEVE ter 'data: ' no início e '\\n\\n' no final (formato SSE).""",
        "fastapi, streaming, sse, python, backend"
    )
    
    print("✨ Alimentação concluída! Luna agora está mais inteligente. 🧠")
    print("   - 8 guias técnicos modernos adicionados")
    print("   - Tailwind, React, Vite, CSS Variables, Glassmorphism, FastAPI")

if __name__ == "__main__":
    seed()
