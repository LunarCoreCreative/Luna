# Roadmap - Módulo de Autenticação (Login)

Este documento define as melhorias e funcionalidades a serem implementadas na tela de Login e no fluxo de autenticação da Luna.

---

## Fase 1: Funcionalidades Core
> [!IMPORTANT]
> Essas são as funcionalidades essenciais para o fluxo funcionar.

### 1.1 Formulário de Login
- [x] Layout duas colunas (form + branding)
- [x] Inputs de Email e Senha
- [x] Toggle de visibilidade da senha
- [x] Integração com Firebase Auth
- [ ] Validação de campos (email válido, senha mínima)
- [ ] Feedback visual nos inputs (erro, sucesso)

### 1.2 Tela de Registro (Sign Up)
- [x] Criar `RegisterPage.jsx`
- [x] Campos: Nome, Email, Senha, Confirmar Senha
- [x] Validação de força de senha (indicador visual)
- [x] Termos de uso / Política de Privacidade (checkbox)
- [x] Integração com `registerWithEmail` do Firebase

### 1.3 Recuperação de Senha
- [x] Criar modal ou página `ForgotPasswordPage.jsx`
- [x] Input de email + botão "Enviar link"
- [x] Integração com `sendPasswordResetEmail` do Firebase
- [x] Feedback de sucesso/erro

### 1.4 Verificação de E-mail
- [x] Integrar `sendEmailVerification` no registro
- [x] Bloquear login de usuários não verificados
- [x] Tela/Mensagem de "E-mail não verificado" com opção de reenvio

---

## Fase 2: Melhorias de UX
> [!TIP]
> Essas melhorias tornam a experiência mais fluida e profissional.

### 2.1 Animações e Transições
- [x] Animação de entrada (fade in / slide) nos elementos do form
- [x] Transição suave entre Login ↔ Registro
- [x] Loading state animado no botão (spinner customizado)
- [x] Micro-animações nos inputs (focus/blur)

### 2.2 Validação em Tempo Real
- [x] Validar email enquanto o usuário digita (debounce)
- [x] Mostrar requisitos de senha conforme digita
- [x] Desabilitar botão até campos válidos

### 2.3 Responsividade Avançada
- [x] Testar e ajustar para tablets (breakpoint `md`)
- [x] Garantir usabilidade com teclado virtual (mobile)
- [x] Safe area para notch/status bar (PWA)

---

## Fase 3: Integrações Adicionais
> [!NOTE]
> Métodos alternativos de autenticação.

### 3.1 Login Social
- [x] Google (já implementado)
- [x] Melhorar botão do Google (ícone oficial + estilo)

### 3.2 Persistência e Sessão
- [x] "Lembrar de mim" (persistência da sessão)
- [x] Redirecionar automaticamente se já logado
- [x] Logout limpo (limpar estado + redirecionar)

---

## Fase 4: Segurança e Polimento
> [!CAUTION]
> Itens críticos de segurança.

### 4.1 Segurança
- [x] Rate limiting visual (após X tentativas, mostrar aviso)
- [x] Captcha/reCAPTCHA (opcional, se necessário)
- [x] Sanitização de inputs

### 4.2 Acessibilidade (a11y)
- [x] Labels acessíveis (aria-label)
- [x] Navegação por teclado (Tab order)
- [x] Contraste de cores (WCAG AA)
- [x] Mensagens de erro anunciadas (aria-live)

### 4.3 Internacionalização (i18n)
- [x] Preparar textos para tradução (pt-BR, en-US)
- [x] Estrutura de arquivos de idioma

---

## Prioridade Sugerida

| Prioridade | Item |
|------------|------|
| 🔴 Alta | Validação de campos, Tela de Registro |
| 🟠 Média | Animações, Recuperação de Senha |
| 🟢 Baixa | i18n, Login Apple/GitHub |

---

## Próximos Passos Imediatos
1. [ ] Implementar validação nos inputs (Fase 1.1)
2. [ ] Criar tela de Registro (Fase 1.2)
3. [ ] Adicionar animações básicas (Fase 2.1)
