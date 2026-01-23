# Diretrizes de Arquitetura - Projeto Luna (V2)

Este documento define a estrutura de pastas e os padrões de desenvolvimento para a reescrita do Luna. O objetivo é garantir escalabilidade, manutenção fácil e uma separação clara de responsabilidades através de uma **Arquitetura Modular**.

## Princípios Fundamentais
1.  **Modularização por Funcionalidade**: Recursos distintos (Chat, Auth, Study, etc.) devem viver em seus próprios módulos autocontidos em `src/modules`.
2.  **Componentes Atômicos**: Componentes visuais reutilizáveis (botões, inputs, cards) ficam em `src/components/ui` e não devem conter lógica de negócio complexa.
3.  **Separação de Lógica e View**: Use Custom Hooks (`useChat`, `useAuth`) para separar a lógica de estado da interface visual.
4.  **Injeção de Dependência (Serviços)**: A comunicação com APIs (Firebase, Backend Python) deve ser feita através de serviços em `src/services` ou dentro dos módulos, nunca diretamente nos componentes.

## Estrutura de Diretórios Proposta

```
src/
├── assets/                 # Arquivos estáticos (imagens, ícones, fontes)
├── components/             # Componentes COMPARTILHADOS globais
│   ├── ui/                 # UI Kit base (Button, Input, Modal, Card) - Estilo puro
│   ├── layout/             # Estruturas de layout (Sidebar, Header, MainLayout)
│   └── shared/             # Componentes complexos reutilizáveis entre módulos (ex: LoadingScreen)
├── contexts/               # Estados Globais (AuthContext, ThemeContext, ToastContext)
├── hooks/                  # Hooks Globais genéricos (useLocalStorage, useMediaQuery)
├── lib/                    # Configurações de bibliotecas (firebase.js, axios.js)
├── modules/                # NÚCLEO DA APLICAÇÃO - Funcionalidades isoladas
│   ├── Auth/               # Módulo de Autenticação
│   │   ├── components/     # Componentes exclusivos do Auth (LoginForm, RegisterForm)
│   │   ├── hooks/          # Lógica do Auth (useLogin, useRegister)
│   │   ├── pages/          # Páginas do Auth (LoginPage, RegisterPage)
│   │   ├── services/       # Chamadas de API do Auth
│   │   └── index.js        # Exporta o que é público deste módulo
│   ├── Chat/               # Módulo Principal (Chat)
│   │   ├── components/     # (MessageList, ChatInput, Balloon)
│   │   ├── hooks/          # (useChatStream, useMessages)
│   │   └── services/       # (chatService.js - conecta com API/Firebase)
│   ├── Core/               # Funcionalidades centrais (Dashboard, Home)
│   └── [Outros Módulos]/   # (Study, Health, Professionals - adicionar conforme necessidade)
├── routes/                 # Definição e proteção de rotas (AppRoutes.jsx)
├── services/               # Serviços globais/genéricos (api.js, logger.js)
├── styles/                 # Estilos globais e configuração do Tailwind
├── utils/                  # Funções utilitárias puras (formatDate, validators)
├── App.jsx                 # Componente Raiz
└── main.jsx                # Ponto de entrada
```

## Padrões de Código

### 1. Componentes
Devemos preferir componentes funcionais com Hooks.
```jsx
// Bom
export const Button = ({ children, variant = 'primary', ...props }) => {
  return <button className={`btn-${variant}`} {...props}>{children}</button>;
}
```

### 2. Importações
Usar caminhos absolutos (alias `@/`) configurados no Vite para evitar `../../../`.
*Exemplo: `import { Button } from '@/components/ui/Button'`*

### 3. Módulos
Um módulo deve ser o mais independente possível. Se o módulo "Chat" precisa de algo do "Auth", ele deve consumir via Contexto Global ou Props, evitando importações profundas cruzadas (`../Auth/components/LoginForm` = ruim).

## Diretrizes de UI / UX
**Estilo**: "Flat, Sólido, Moderno e Minimalista".
*   **Cores**: Use cores sólidas e profundas. Evite degradês excessivos como fundo principal; use-os apenas para acentos (botões, destaques).
*   **Design System**:
    *   **Flat**: Evite sombras pesadas ou efeitos 3D exagerados (exceto glassmorphism sutil onde necessário).
    *   **Sólido**: Contraste alto e formas bem definidas.
    *   **Minimalista**: Espaçamento generoso (whitespace), tipografia clara, sem "poluição" visual.
*   **Componentes**:
    *   Bordas sutis (`border-slate-800`).
    *   Arredondamento consistente (`rounded-xl` ou `rounded-2xl`).
    *   Fundo escuro profundo (`bg-slate-950` ou similar) para sensação premium.

## Estratégia Mobile & Responsividade
A arquitetura foi desenhada para ser "Mobile First" e adaptável:

1.  **Responsividade (Web Mobile)**:
    *   Todos os componentes usam classes utilitárias do Tailwind (`w-full`, `max-w-md`, `md:grid-cols-2`) para se adaptar a qualquer tamanho de tela automaticamente.
    *   Targets de toque (botões/inputs) devem ter altura mínima de 44px (padrão Apple/Google).

2.  **Portabilidade (PWA / React Native)**:
    *   **Lógica Separada (Hooks/Services)**: Como nossa lógica de negócio (`useAuth`, `chatService`) está 100% separada da UI, podemos reutilizar **toda** a camada de lógica em um futuro app React Native sem reescrever código.
    *   **PWA**: O projeto web será configurado como Progressive Web App, permitindo instalação na home screen e funcionamento offline básico.

## Stack Tecnológico
*   **Runtime**: React 19
*   **Build**: Vite
*   **Estilização**: TailwindCSS v4
*   **Backend/Data**: Firebase (Firestore, Auth) + API Python (para IA)
*   **Router**: React Router Dom
