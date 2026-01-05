# 🚀 Luna - Roadmap de Melhorias

Este documento lista todas as melhorias sugeridas para o projeto Luna, organizadas por categoria e prioridade.

---

## 📊 Status Atual

### Refatoração Concluída ✅
| Métrica | Antes | Depois | Mudança |
|---------|-------|--------|---------|
| **App.jsx** | 1874 linhas | 1352 linhas | **-28%** |
| **Módulos** | 1 | 8 | +7 novos |

### Módulos Criados
- **Hooks**: `useChat`, `useArtifacts`, `useAttachments`
- **Utils**: `artifactUtils.js`, `messageUtils.js`
- **Components**: `CodeBlock`, `Markdown`, `TypingIndicator`

---

## 1. 🔥 Performance (Alta Prioridade)

### 1.1 Virtualização de Lista de Mensagens
- [ ] Implementar `react-window` ou `react-virtualized`
- [ ] Benefício: Conversas muito longas (100+ mensagens) ficam mais leves
- [ ] Complexidade: Média

### 1.2 Lazy Loading de Componentes
```javascript
// Exemplo de implementação
const Canvas = React.lazy(() => import('./components/Canvas'));

// No render
<Suspense fallback={<Loading />}>
  <Canvas />
</Suspense>
```
- [ ] Canvas (componente pesado)
- [ ] Sidebar (pode ser carregada depois)
- [ ] Markdown renderer

### 1.3 Debounce no Input
- [ ] Usar `useDebouncedCallback` para evitar re-renders excessivos durante digitação
- [ ] Throttle no scroll do chat
- [ ] Benefício: Menos uso de CPU durante digitação rápida

### 1.4 Service Worker & PWA
- [ ] Cache de assets estáticos
- [ ] Offline mode básico
- [ ] Instalação como app desktop

---

## 2. 🧩 Componentização (Média Prioridade)

### 2.1 Componentes a Extrair do App.jsx

```
src/
├── components/
│   ├── chat/
│   │   ├── MessageList.jsx      # Lista de mensagens
│   │   ├── MessageItem.jsx      # Item individual
│   │   ├── ChatInput.jsx        # Input com anexos
│   │   └── TypingIndicator.jsx  # ✅ Já criado
│   ├── sidebar/
│   │   ├── Sidebar.jsx          # Barra lateral completa
│   │   ├── ChatListItem.jsx     # Item de chat na lista
│   │   └── ArtifactList.jsx     # Lista de artefatos
│   ├── tooling/
│   │   ├── ToolStatusBadge.jsx  # Badge de ferramentas
│   │   └── ToolHistoryPanel.jsx # Painel de histórico
│   └── markdown/
│       ├── CodeBlock.jsx        # ✅ Já criado
│       └── Markdown.jsx         # ✅ Já criado
```

### 2.2 Estimativa de Redução
| Componente | Linhas a Extrair |
|------------|-----------------|
| MessageList | ~150 linhas |
| ChatInput | ~100 linhas |
| Sidebar | ~120 linhas |
| **Total** | **~370 linhas** |

Meta: **App.jsx < 1000 linhas**

---

## 3. 🪝 Hooks Adicionais (Média Prioridade)

### 3.1 useWebSocket
```javascript
// Encapsular toda lógica de WebSocket
const { 
  connect, 
  disconnect, 
  send, 
  isConnected,
  lastMessage 
} = useWebSocket(url);
```
- [ ] Gerenciamento de conexão
- [ ] Reconexão automática
- [ ] Cancelamento de streams

### 3.2 useToolStatus
```javascript
const { 
  toolStatus, 
  activeTool, 
  toolHistory,
  setTool,
  clearTool 
} = useToolStatus();
```

### 3.3 useTheme
```javascript
const { 
  theme, 
  toggleTheme, 
  setTheme 
} = useTheme();
```

---

## 4. 🔒 Qualidade de Código (Baixa Prioridade)

### 4.1 TypeScript
- [ ] Migrar hooks para TypeScript primeiro
- [ ] Depois componentes
- [ ] Por fim App.tsx
- [ ] Benefício: Menos bugs, melhor DX

### 4.2 Testes Unitários
```bash
npm install --save-dev vitest @testing-library/react
```
- [ ] Testes para hooks (`useChat.test.ts`)
- [ ] Testes para utils (`artifactUtils.test.ts`)
- [ ] Testes de componentes

### 4.3 ESLint Mais Estrito
```json
{
  "rules": {
    "react-hooks/exhaustive-deps": "error",
    "no-unused-vars": "error",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

### 4.4 Storybook
- [ ] Documentar componentes visualmente
- [ ] Útil para desenvolvimento isolado

---

## 5. ✨ Features Novas

### 5.1 Markdown Avançado
- [ ] Suporte a tabelas melhorado
- [ ] Diagramas Mermaid
- [ ] Highlighting de syntax para mais linguagens
- [ ] LaTeX/Math equations

### 5.2 Busca em Conversas
```
[🔍] Pesquisar em histórico...
```
- [ ] Busca por texto em mensagens
- [ ] Filtro por data
- [ ] Busca em artefatos

### 5.3 Exportar Conversas
- [ ] Exportar para Markdown
- [ ] Exportar para PDF
- [ ] Exportar para JSON
- [ ] Incluir artefatos

### 5.4 Atalhos de Teclado
| Atalho | Ação |
|--------|------|
| `Ctrl+K` | Nova conversa |
| `Ctrl+/` | Abrir sidebar |
| `Ctrl+Shift+C` | Abrir Canvas |
| `Escape` | Cancelar stream |

### 5.5 Temas Customizáveis
- [ ] Mais opções de cores
- [ ] Tema "High Contrast"
- [ ] Salvar preferências

---

## 6. 🎨 UX/UI

### 6.1 Animações
- [ ] Transições mais suaves entre views
- [ ] Micro-animações em botões
- [ ] Animação de scroll suave

### 6.2 Loading States
- [ ] Skeleton loaders para mensagens
- [ ] Placeholder para Canvas
- [ ] Shimmer effect em listas

### 6.3 Error Boundaries
```javascript
<ErrorBoundary fallback={<ErrorView />}>
  <Chat />
</ErrorBoundary>
```
- [ ] Capturar erros de componentes
- [ ] Fallback amigável
- [ ] Opção de reportar erro

### 6.4 Toast Notifications
- [ ] Feedback visual para ações
- [ ] Erros de conexão
- [ ] Sucesso ao salvar

---

## 7. 🏗️ Arquitetura

### 7.1 State Management (Se Necessário)
Se a aplicação crescer muito, considerar:
- [ ] **Zustand** - Leve e simples
- [ ] **Jotai** - Atômico, bom para React
- [ ] **Redux Toolkit** - Mais complexo, mas poderoso

### 7.2 API Layer
```javascript
// src/api/index.js
export const api = {
  chats: {
    list: () => fetch('/chats'),
    get: (id) => fetch(`/chats/${id}`),
    save: (data) => fetch('/chats', { method: 'POST', body: data }),
  },
  artifacts: {
    // ...
  }
};
```

### 7.3 Constants & Config
```javascript
// src/config/constants.js
export const MEMORY_SERVER = 'http://127.0.0.1:8001';
export const WS_URL = 'ws://127.0.0.1:8001/ws';
export const MAX_MESSAGE_LENGTH = 10000;
```

---

## 📋 Priorização Sugerida

### Sprint 1: Quick Wins
1. [ ] Extrair `ChatInput` component
2. [ ] Extrair `Sidebar` component
3. [ ] Implementar `useTheme` hook

### Sprint 2: Performance
4. [ ] Lazy loading do Canvas
5. [ ] Debounce no input
6. [ ] Virtualização de mensagens

### Sprint 3: Features
7. [ ] Atalhos de teclado
8. [ ] Exportar conversas
9. [ ] Busca em histórico

### Sprint 4: Qualidade
10. [ ] Migrar para TypeScript
11. [ ] Adicionar testes
12. [ ] Error boundaries

---

## 📈 Métricas de Sucesso

| Métrica | Atual | Meta |
|---------|-------|------|
| App.jsx linhas | 1352 | < 800 |
| Componentes | 3 | 10+ |
| Hooks | 3 | 6+ |
| Test coverage | 0% | 60%+ |
| Lighthouse Performance | ? | 90+ |

---

## 🎯 Conclusão

A refatoração inicial foi bem-sucedida, reduzindo o código em **28%** e criando uma base modular. As próximas melhorias devem focar em:

1. **Performance** - Garantir que o app continue rápido com muitas mensagens
2. **DX (Developer Experience)** - Código fácil de manter e estender
3. **UX** - Interface ainda mais polida e responsiva

**Escolha uma melhoria e vamos implementar!** 🚀
