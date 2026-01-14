# 🌙 Luna Mobile

Versão mobile do Luna AI usando Expo Go.

## 🚀 Como Começar

### Pré-requisitos

- Node.js instalado
- Expo CLI: `npm install -g expo-cli` (opcional, mas recomendado)
- Expo Go instalado no seu dispositivo (iOS ou Android)

### Instalação

1. Instale as dependências:
```bash
cd mobile
npm install
```

   Se houver conflitos de dependências, tente:
```bash
npm install --legacy-peer-deps
```

2. Inicie o servidor de desenvolvimento:
```bash
npm start
```

   Para usar tunnel (útil quando não está na mesma rede Wi-Fi):
```bash
npm run start:tunnel
```

   **Nota**: O comando `expo` só estará disponível após instalar as dependências com `npm install`.

3. Escaneie o QR code com:
   - **iOS**: Câmera do iPhone
   - **Android**: App Expo Go

### Desenvolvimento

- `npm start` - Inicia o servidor Expo
- `npm run android` - Abre no Android (requer Android Studio/emulador)
- `npm run ios` - Abre no iOS (requer Mac e Xcode)
- `npm run web` - Abre no navegador

## 📱 Estrutura do Projeto

```
mobile/
├── src/
│   ├── config/          # Configurações (Firebase, API)
│   ├── screens/         # Telas do app
│   ├── components/      # Componentes reutilizáveis
│   ├── hooks/           # Custom hooks
│   ├── contexts/        # Context API
│   └── services/        # Serviços (API, WebSocket)
├── App.js               # Componente raiz
├── app.json             # Configuração do Expo
└── package.json
```

## 🔧 Configuração

### Backend Local

Para conectar com o backend local, você precisa usar o IP da sua máquina na rede local (não `127.0.0.1`).

Edite `src/config/api.js` e altere `LOCAL_API_URL` para:
```javascript
const LOCAL_API_URL = "http://SEU_IP_LOCAL:8001";
```

Para descobrir seu IP:
- **Windows**: `ipconfig` no CMD
- **Mac/Linux**: `ifconfig` no terminal

### Firebase

A configuração do Firebase já está pronta. As credenciais são as mesmas do app web.

## 📝 Próximos Passos

- [ ] Implementar autenticação
- [ ] Criar tela de chat
- [ ] Integrar WebSocket
- [ ] Adicionar navegação
- [ ] Implementar persistência local

---

**Nota**: Este é um projeto em desenvolvimento inicial. Funcionalidades serão adicionadas progressivamente.