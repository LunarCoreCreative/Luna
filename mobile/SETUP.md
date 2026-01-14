# 🚀 Setup do Luna Mobile

## ✅ O que foi criado

1. **Estrutura base do Expo**
   - `package.json` com dependências necessárias
   - `app.json` configurado
   - `babel.config.js` para transpilação

2. **Configurações**
   - Firebase configurado (`src/config/firebase.js`)
   - API client configurado (`src/config/api.js`)
   - Cliente HTTP para backend (`src/services/api.js`)

3. **Telas básicas**
   - `LoginScreen` - Autenticação com Firebase
   - `HomeScreen` - Tela inicial após login
   - `App.js` - Componente raiz com navegação de auth

## 📦 Próximos passos

1. **Instalar/Atualizar dependências:**
   ```bash
   cd mobile
   npm install
   ```

   **Recomendado**: Após instalar, ajuste as versões automaticamente:
   ```bash
   npx expo install --fix
   ```

2. **Iniciar o app:**
   ```bash
   npm start              # Modo LAN (mesma rede Wi-Fi)
   npm run start:tunnel   # Modo Tunnel (funciona de qualquer lugar)
   # ou
   npm run android  # para Android
   npm run ios      # para iOS (requer Mac)
   ```
   
   **💡 Dica**: Use `start:tunnel` se você não estiver na mesma rede Wi-Fi que o computador, ou se tiver problemas de conexão.

3. **Testar no Expo Go:**
   - Instale o app Expo Go no seu dispositivo
   - Escaneie o QR code que aparece no terminal
   - O app deve abrir no seu dispositivo

## 🔧 Configuração do Backend

Se quiser testar com o backend local:

1. Edite `src/config/api.js`
2. Altere `LOCAL_API_URL` para o IP da sua máquina na rede:
   ```javascript
   const LOCAL_API_URL = "http://192.168.1.XXX:8001";
   ```
3. Descubra seu IP:
   - Windows: `ipconfig` no CMD
   - Mac/Linux: `ifconfig` no terminal

## 📝 Notas

- O app está configurado para funcionar com Expo Go
- Firebase já está configurado e funcionando
- A estrutura está pronta para adicionar mais funcionalidades (chat, navegação, etc)
- Assets (ícones, splash) podem ser adicionados depois em `assets/`

## 🐛 Troubleshooting

- **Erro "Unable to deserialize cloned data" (Cache corrompido)**:
  - Limpe o cache: `npx expo start --clear`
  - Ou limpe manualmente: `rm -rf .expo node_modules/.cache`
  - Veja mais em `CLEAR_CACHE.md`

- **Erro ao instalar dependências**: 
  - Tente `npm install --legacy-peer-deps` se houver conflitos
  - Ou `npm install --force` como última alternativa

- **Comando 'expo' não encontrado**: 
  - Isso é normal antes de instalar as dependências
  - Execute `npm install` primeiro para instalar o Expo
  - Após instalar, o comando `expo` estará disponível via `npm start` ou `npm run start:tunnel`

- **Erro de conexão com backend**: Verifique se o backend está rodando e acessível

- **Expo Go não conecta**: 
  - Certifique-se de que o dispositivo está na mesma rede Wi-Fi (modo LAN)
  - Ou use `npm run start:tunnel` para modo tunnel (funciona de qualquer lugar)
  - O modo tunnel é mais lento, mas funciona mesmo em redes diferentes