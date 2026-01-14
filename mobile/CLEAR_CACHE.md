# 🧹 Como Limpar Cache do Expo/Metro

Se você encontrar erros como "Unable to deserialize cloned data" ou problemas com cache, siga estes passos:

## Método 1: Usando flag --clear (Recomendado)

```bash
cd mobile
npx expo start --clear
```

## Método 2: Limpar cache manualmente

No PowerShell:
```powershell
cd mobile
# Limpar cache do Expo
if (Test-Path ".expo") { Remove-Item -Path ".expo" -Recurse -Force }
# Limpar cache do Metro
if (Test-Path "node_modules/.cache") { Remove-Item -Path "node_modules/.cache" -Recurse -Force }
# Limpar cache do npm (opcional)
npm cache clean --force
```

No Bash (Mac/Linux):
```bash
cd mobile
rm -rf .expo
rm -rf node_modules/.cache
npm cache clean --force
```

## Método 3: Limpar tudo e reinstalar (se nada funcionar)

```bash
cd mobile
# Limpar caches
rm -rf .expo node_modules/.cache
rm -rf node_modules
npm cache clean --force
# Reinstalar
npm install
```

Depois de limpar, inicie novamente:
```bash
npx expo start --clear
# ou para tunnel
npx expo start --tunnel --clear
```
