# 🗺️ Roadmap - Luna Mobile

Roadmap completo de desenvolvimento do app mobile Luna, baseado nas funcionalidades do app desktop.

**Plataforma:** React Native (Expo SDK 54)  
**Última atualização:** 2025-01-14  
**Status atual:** MVP Core em desenvolvimento

---

## 📊 Visão Geral

### O que já foi feito ✅
- ✅ Estrutura base do projeto (Expo SDK 54)
- ✅ Autenticação Firebase (Login/Logout)
- ✅ Navegação (Bottom Tabs + Stack Navigator)
- ✅ Tela de Chats (lista de conversas)
- ✅ Tela de Perfil (edição básica)
- ✅ Integração WebSocket (useChat hook)
- ✅ Interface de Chat (ChatScreen completa)
- ✅ Carregamento de histórico de mensagens

### O que falta fazer 🚧
- 🚧 Salvar chats automaticamente
- 🚧 Criar novo chat
- 🚧 Funcionalidades avançadas (Business, Health, Study)
- 🚧 Canvas/Artifacts
- 🚧 Notificações push
- 🚧 Polimento e otimizações

---

## 🎯 Fase 1: MVP Core - Chat Funcional (PRIORIDADE ALTA)

**Objetivo:** Ter um chat completamente funcional, similar ao desktop, com persistência.

### 1.1 Persistência de Chats ⏳
- [ ] Salvar chat automaticamente após enviar mensagem (`POST /chats`)
- [x] Carregar histórico de mensagens (`GET /chats/{id}`)
- [ ] Atualizar título do chat automaticamente (baseado na primeira mensagem)
- [ ] Deletar chat (`DELETE /chats/{id}`)
- [ ] Sincronização com Firestore (backup)

**Estimativa:** 2-3 dias

### 1.2 Criar Novo Chat ⏳
- [ ] Botão "Novo Chat" na ChatsScreen (FAB ou header)
- [ ] Criar novo chat vazio no backend
- [ ] Navegar para ChatScreen com novo chatId
- [ ] Foco automático no input ao criar novo chat
- [ ] Atualizar lista de chats após criar

**Estimativa:** 1 dia

### 1.3 Melhorias no Chat ⏳
- [ ] Melhorar renderização de markdown (biblioteca dedicada)
- [ ] Suporte a code blocks com syntax highlighting
- [ ] Scroll para mensagem específica
- [ ] Ações nas mensagens (copiar, deletar)
- [ ] Indicador de mensagem sendo enviada

**Estimativa:** 2-3 dias

---

## 🎯 Fase 2: Funcionalidades Essenciais (PRIORIDADE MÉDIA)

### 2.1 Perfil Completo ⏳
- [x] Visualizar informações básicas (nome, email, plano)
- [x] Editar nome do perfil
- [ ] Exibir energia atual (se disponível)
- [ ] Exibir plano atual com badge visual
- [ ] Histórico de uso (futuro)
- [ ] Foto de perfil (futuro)

**Estimativa:** 1-2 dias

### 2.2 Configurações ⏳
- [ ] Tela de configurações completa
- [ ] Preferências de notificações
- [ ] Configurações de privacidade
- [ ] Sobre o app
- [ ] Versão e changelog

**Estimativa:** 1-2 dias

### 2.3 Upload de Arquivos ⏳
- [ ] Seletor de arquivos (expo-document-picker)
- [ ] Upload de imagens (expo-image-picker)
- [ ] Preview de imagens no chat
- [ ] Suporte a PDF/TXT
- [ ] Indicador de progresso de upload

**Estimativa:** 2-3 dias

---

## 🎯 Fase 3: Modos Especializados (PRIORIDADE MÉDIA)

### 3.1 Business Mode 💼
**Baseado em:** `src/components/business/BusinessMode.jsx`

- [ ] Nova tab "Business" ou acesso via Perfil
- [ ] Dashboard financeiro (resumo)
- [ ] Lista de transações
- [ ] Adicionar transação (via chat ou formulário)
- [ ] Gráficos e analytics básicos
- [ ] Chat especializado para Business Mode
- [ ] Integração com endpoints `/business/*`

**Prioridade:** Média  
**Estimativa:** 5-7 dias

### 3.2 Health Mode 🏥
**Baseado em:** `src/components/health/HealthMode.jsx`

- [ ] Nova tab "Health" ou acesso via Perfil
- [ ] Dashboard de saúde (resumo do dia)
- [ ] Registrar refeições
- [ ] Visualizar histórico
- [ ] Metas nutricionais
- [ ] Chat especializado para Health Mode
- [ ] Integração com endpoints `/health/*`

**Prioridade:** Média  
**Estimativa:** 5-7 dias

### 3.3 Study Mode 📚
**Baseado em:** `src/components/StudyMode.jsx`

- [ ] Acesso via Perfil ou nova tab
- [ ] Upload de documentos (PDF, TXT, EPUB)
- [ ] Lista de documentos carregados
- [ ] Chat com contexto dos documentos
- [ ] Citações nas respostas
- [ ] Integração com endpoints `/study/*`

**Prioridade:** Baixa  
**Estimativa:** 3-4 dias

---

## 🎯 Fase 4: Canvas e Artifacts (PRIORIDADE BAIXA)

**Baseado em:** `src/components/Canvas.jsx` e `src/hooks/useArtifacts.js`

### 4.1 Visualização de Artifacts
- [ ] Lista de artifacts criados
- [ ] Preview de artifacts (código, markdown)
- [ ] Abrir artifact em tela dedicada
- [ ] Compartilhar artifact
- [ ] Deletar artifact

**Estimativa:** 2-3 dias

### 4.2 Integração com Chat
- [ ] Detectar criação de artifact no chat
- [ ] Abrir Canvas automaticamente quando artifact é criado
- [ ] Preview inline de artifacts no chat
- [ ] Editar artifact via chat

**Estimativa:** 2-3 dias

---

## 🎯 Fase 5: UX e Polimento (PRIORIDADE MÉDIA)

### 5.1 Melhorias de Interface
- [ ] Animações suaves entre telas
- [ ] Feedback háptico (vibração)
- [ ] Loading states melhorados (skeletons)
- [ ] Empty states mais informativos
- [ ] Error states amigáveis
- [ ] Pull-to-refresh visual melhorado
- [ ] Swipe gestures (deletar chat, ações rápidas)

**Estimativa:** 3-4 dias

### 5.2 Performance
- [ ] Otimização de listas (considerar FlashList)
- [ ] Lazy loading de mensagens antigas
- [ ] Cache de mensagens local
- [ ] Cache de imagens
- [ ] Memoização de componentes pesados
- [ ] Otimização de re-renders

**Estimativa:** 2-3 dias

### 5.3 Notificações Push
- [ ] Configurar Expo Notifications
- [ ] Notificações de novas mensagens
- [ ] Configurações de notificação
- [ ] Badges nos ícones das tabs
- [ ] Notificações locais (quando app está em background)

**Prioridade:** Média  
**Estimativa:** 2-3 dias

---

## 🎯 Fase 6: Funcionalidades Premium (PRIORIDADE BAIXA)

### 6.1 Sistema de Energia/Planos
- [ ] Exibir energia atual no Perfil
- [ ] Indicador visual de plano (spark/nexus/eclipse)
- [ ] Cooldown visual quando energia está baixa
- [ ] Integração com sistema de planos do backend
- [ ] Upgrade de plano (futuro - integração com pagamento)

**Estimativa:** 1-2 dias

### 6.2 Ações Avançadas no Chat
- [ ] Regenerar resposta
- [ ] Editar mensagem (futuro)
- [ ] Favoritar mensagem
- [ ] Buscar dentro do chat
- [ ] Exportar conversa

**Estimativa:** 2-3 dias

---

## 📋 Estrutura de Navegação Atual

### Tab "Início" 🏠
- ✅ Tela de boas-vindas
- ✅ Dashboard básico
- ✅ Informações do usuário

### Tab "Chats" 💬
- ✅ Lista de conversas
- ✅ Pull-to-refresh
- ✅ Navegação para chat
- ⏳ Criar novo chat
- ⏳ Buscar chats

### Tab "Perfil" 👤
- ✅ Informações do perfil
- ✅ Editar nome
- ✅ Configurações básicas
- ✅ Logout
- ⏳ Configurações completas

---

## 🔗 Integração com Desktop

### Funcionalidades do Desktop que DEVEM estar no Mobile
1. ✅ Chat básico (WebSocket, streaming)
2. ✅ Persistência de chats
3. ⏳ Business Mode (dashboard básico)
4. ⏳ Health Mode (dashboard básico)
5. ⏳ Study Mode (upload de documentos)

### Funcionalidades do Desktop que são OPCIONAIS no Mobile
1. Canvas completo (pode ser simplificado)
2. IDE Mode (não necessário no mobile)
3. Analytics avançados (pode ser simplificado)
4. Configurações muito avançadas

---

## 📦 Dependências Necessárias

### Já Instaladas ✅
- Firebase (Auth + Firestore)
- React Navigation (Stack + Bottom Tabs)
- Expo SDK 54
- @expo/vector-icons
- react-native-gesture-handler
- react-native-safe-area-context

### A Instalar
- [ ] `react-native-markdown-display` - Renderização de markdown
- [ ] `react-native-syntax-highlighter` - Syntax highlighting em code blocks
- [ ] `expo-notifications` - Notificações push
- [ ] `expo-document-picker` - Upload de arquivos
- [ ] `expo-image-picker` - Seleção de imagens
- [ ] `@react-native-community/netinfo` - Status de rede
- [ ] `@shopify/flash-list` - Lista otimizada (opcional)

---

## 🎯 Priorização por Fases

### 🔴 Fase 1: MVP Crítico (1-2 semanas)
**Objetivo:** Chat completamente funcional com persistência

1. ✅ Interface de chat
2. ✅ WebSocket funcionando
3. ✅ Carregar histórico
4. ⏳ Salvar chats automaticamente
5. ⏳ Criar novo chat
6. ⏳ Melhorias básicas

### 🟡 Fase 2-3: Funcionalidades Essenciais (2-3 semanas)
**Objetivo:** App funcional com features principais

1. Perfil completo
2. Configurações
3. Upload de arquivos
4. Business Mode básico
5. Health Mode básico

### 🟢 Fase 4-6: Features Avançadas (3-4 semanas)
**Objetivo:** Paridade parcial com desktop

1. Canvas/Artifacts
2. Study Mode
3. Notificações
4. Polimento e otimizações

---

## 📝 Notas Técnicas

### WebSocket
- ✅ Implementado com reconexão automática
- ✅ Streaming de mensagens funcionando
- ✅ Estados de conexão gerenciados

### API Integration
- ✅ Cliente HTTP básico implementado
- ✅ Autenticação com Firebase token
- ⏳ Tratamento de erros centralizado
- ⏳ Retry logic

### Performance
- ✅ FlatList otimizada
- ✅ Memoização de componentes
- ⏳ Cache de mensagens
- ⏳ Lazy loading

---

## 🚀 Próximos Passos Imediatos

1. **Salvar chats automaticamente** após enviar mensagem
2. **Criar novo chat** com botão na ChatsScreen
3. **Melhorar markdown** com biblioteca dedicada
4. **Testar fluxo completo:** Criar chat → Enviar mensagem → Salvar → Recarregar

---

**Status atual:** MVP Core em desenvolvimento (60% completo)  
**Próxima fase:** Finalizar persistência e criação de chats
