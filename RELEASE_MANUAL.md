# 🚀 Guia de Release Manual - Luna

Este guia mostra como fazer releases manualmente pelo PC, sem usar o workflow do GitHub Actions.

## 📋 Pré-requisitos

1. Git instalado e configurado
2. Node.js e npm instalados
3. Python instalado (para o backend)
4. Acesso ao repositório GitHub (com permissões de push e criar releases)

## 🔄 Processo Completo

### 1. Preparar o Ambiente

```bash
# Certifique-se de estar no branch correto
git checkout staging  # Para pre-release
# ou
git checkout main    # Para release estável

# Atualizar dependências
npm install
```

### 2. Atualizar o CHANGELOG.md

Edite o arquivo `CHANGELOG.md` e mova as mudanças da seção "Não Publicado" para uma nova versão:

```markdown
## [1.0.0-beta.2] - 2025-01-29

### 🔧 Melhorias
- Suas mudanças aqui...

---

## [Não Publicado]
```

### 3. Atualizar a Versão no package.json

Edite o `package.json` e atualize a versão:

```json
{
  "version": "1.0.0-beta.2"  // Para pre-release
  // ou
  "version": "1.0.0"         // Para release estável
}
```

### 4. Fazer Commit das Mudanças

```bash
git add CHANGELOG.md package.json
git commit -m "chore: Release v1.0.0-beta.2"
```

### 5. Criar a Tag

```bash
# Para pre-release
git tag -a v1.0.0-beta.2 -m "Pre-release v1.0.0-beta.2"

# Para release estável
git tag -a v1.0.0 -m "Release v1.0.0"
```

### 6. Fazer Push do Commit e da Tag

```bash
# Push do commit
git push origin staging  # ou main

# Push da tag
git push origin v1.0.0-beta.2
```

### 7. Fazer o Build da Aplicação

```bash
# Build do frontend e do Electron
npm run dist:desktop
```

Isso vai:
- Fazer build do frontend (Vite)
- Compilar o Electron com electron-builder
- Gerar o instalador em `release/Luna-{version}-Setup.exe`
- Gerar o `release/latest.yml` (metadados para autoupdater)

### 8. Criar a Release no GitHub

#### Opção A: Via Interface Web do GitHub

1. Acesse: https://github.com/LunarCoreCreative/Luna/releases/new
2. Selecione a tag que você criou (ex: `v1.0.0-beta.2`)
3. Título: `Pre-Release v1.0.0-beta.2` (ou `Release v1.0.0`)
4. Descrição: Copie o conteúdo do CHANGELOG para a versão
5. Marque como **Pre-release** (se for beta/alpha) ou deixe desmarcado (se for release estável)
6. Clique em **"Set as the latest release"** apenas se for release estável
7. Clique em **"Publish release"**

#### Opção B: Via GitHub CLI (gh)

Se você tem o GitHub CLI instalado:

```bash
# Instalar GitHub CLI (se não tiver)
# Windows: winget install GitHub.cli
# ou baixe de: https://cli.github.com/

# Autenticar
gh auth login

# Criar release
gh release create v1.0.0-beta.2 \
  --title "Pre-Release v1.0.0-beta.2" \
  --notes-file CHANGELOG.md \
  --prerelease \
  ./release/Luna-1.0.0-beta.2-Setup.exe \
  ./release/latest.yml
```

#### Opção C: Via API do GitHub (PowerShell)

```powershell
# Definir variáveis
$VERSION = "1.0.0-beta.2"
$TAG = "v$VERSION"
$GITHUB_TOKEN = "seu_token_aqui"  # Criar em: https://github.com/settings/tokens
$OWNER = "LunarCoreCreative"
$REPO = "Luna"

# Ler changelog
$changelog = Get-Content CHANGELOG.md -Raw
# Extrair seção da versão (ajuste conforme necessário)

# Criar release
$headers = @{
    "Authorization" = "token $GITHUB_TOKEN"
    "Accept" = "application/vnd.github.v3+json"
}

$body = @{
    tag_name = $TAG
    name = "Pre-Release $TAG"
    body = $changelog
    draft = $false
    prerelease = $true
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "https://api.github.com/repos/$OWNER/$REPO/releases" `
    -Method Post -Headers $headers -Body $body

$releaseId = $response.id
Write-Host "Release criada: $releaseId"

# Upload do installer
$installerPath = "release\Luna-$VERSION-Setup.exe"
$installerBytes = [System.IO.File]::ReadAllBytes($installerPath)
$installerBase64 = [Convert]::ToBase64String($installerBytes)

$uploadHeaders = @{
    "Authorization" = "token $GITHUB_TOKEN"
    "Accept" = "application/vnd.github.v3+json"
    "Content-Type" = "application/octet-stream"
}

$uploadUrl = "https://uploads.github.com/repos/$OWNER/$REPO/releases/$releaseId/assets?name=Luna-$VERSION-Setup.exe"
Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers $uploadHeaders -Body $installerBytes

# Upload do latest.yml
$latestYmlPath = "release\latest.yml"
$latestYmlContent = Get-Content $latestYmlPath -Raw
$latestYmlBytes = [System.Text.Encoding]::UTF8.GetBytes($latestYmlContent)

$uploadUrl = "https://uploads.github.com/repos/$OWNER/$REPO/releases/$releaseId/assets?name=latest.yml"
Invoke-RestMethod -Uri $uploadUrl -Method Post -Headers $uploadHeaders -Body $latestYmlBytes

Write-Host "✓ Release publicada com sucesso!"
```

### 9. Verificar a Release

Acesse: https://github.com/LunarCoreCreative/Luna/releases

Verifique se:
- ✅ A release está publicada (não draft)
- ✅ Os assets foram enviados (installer + latest.yml)
- ✅ A descrição está correta
- ✅ Está marcada como pre-release (se for beta/alpha)

## 📝 Scripts Auxiliares

### Script PowerShell Completo (release-manual.ps1)

Crie um arquivo `scripts/release-manual.ps1`:

```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [Parameter(Mandatory=$false)]
    [switch]$Prerelease,
    
    [Parameter(Mandatory=$false)]
    [string]$Channel = "beta"
)

Write-Host "🚀 Iniciando release manual: $Version" -ForegroundColor Cyan

# 1. Verificar se está no branch correto
$branch = git branch --show-current
if ($Prerelease -and $branch -ne "staging") {
    Write-Warning "Pre-release deve ser feita no branch staging!"
    exit 1
}
if (-not $Prerelease -and $branch -ne "main") {
    Write-Warning "Release estável deve ser feita no branch main!"
    exit 1
}

# 2. Atualizar package.json
Write-Host "📝 Atualizando package.json..." -ForegroundColor Yellow
$pkg = Get-Content package.json -Raw | ConvertFrom-Json
$pkg.version = $Version
$pkg | ConvertTo-Json -Depth 100 | Set-Content package.json -Encoding UTF8
Write-Host "✓ Versão atualizada para $Version" -ForegroundColor Green

# 3. Commit
Write-Host "💾 Fazendo commit..." -ForegroundColor Yellow
git add package.json CHANGELOG.md
git commit -m "chore: Release $Version"
Write-Host "✓ Commit criado" -ForegroundColor Green

# 4. Criar tag
Write-Host "🏷️  Criando tag..." -ForegroundColor Yellow
$tag = "v$Version"
git tag -a $tag -m "Release $tag"
Write-Host "✓ Tag criada: $tag" -ForegroundColor Green

# 5. Push
Write-Host "📤 Fazendo push..." -ForegroundColor Yellow
git push origin $branch
git push origin $tag
Write-Host "✓ Push concluído" -ForegroundColor Green

# 6. Build
Write-Host "🔨 Fazendo build..." -ForegroundColor Yellow
npm run dist:desktop
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build falhou!"
    exit 1
}
Write-Host "✓ Build concluído" -ForegroundColor Green

# 7. Instruções finais
Write-Host "`n✅ Pronto! Agora:" -ForegroundColor Green
Write-Host "1. Acesse: https://github.com/LunarCoreCreative/Luna/releases/new" -ForegroundColor Cyan
Write-Host "2. Selecione a tag: $tag" -ForegroundColor Cyan
Write-Host "3. Faça upload dos arquivos:" -ForegroundColor Cyan
Write-Host "   - release\Luna-$Version-Setup.exe" -ForegroundColor White
Write-Host "   - release\latest.yml" -ForegroundColor White
Write-Host "4. Marque como pre-release: $Prerelease" -ForegroundColor Cyan
Write-Host "5. Publique a release!" -ForegroundColor Cyan
```

**Uso:**
```powershell
# Pre-release
.\scripts\release-manual.ps1 -Version "1.0.0-beta.2" -Prerelease

# Release estável
.\scripts\release-manual.ps1 -Version "1.0.0"
```

## ⚠️ Dicas Importantes

1. **Sempre atualize o CHANGELOG.md antes de fazer release**
2. **Teste o build localmente antes de publicar**
3. **Verifique se os assets foram gerados corretamente**
4. **Para releases estáveis, marque como "Latest release"**
5. **Para pre-releases, marque como "Pre-release" (não marque como latest)**

## 🔍 Verificação Pós-Release

Após publicar, verifique:

1. **Release está publicada?**
   - https://github.com/LunarCoreCreative/Luna/releases

2. **Assets foram enviados?**
   - Deve ter `Luna-{version}-Setup.exe`
   - Deve ter `latest.yml`

3. **Autoupdater funciona?**
   - Instale uma versão anterior
   - Abra o app
   - Deve detectar a nova versão

## 🆘 Troubleshooting

**Erro: "Tag already exists"**
```bash
git tag -d v1.0.0-beta.2  # Deletar localmente
git push origin :refs/tags/v1.0.0-beta.2  # Deletar no remoto
# Depois criar novamente
```

**Erro: "Asset already exists"**
- Delete o asset antigo na release do GitHub
- Ou use um nome diferente

**Build falha**
- Verifique se todas as dependências estão instaladas
- Verifique logs do build
- Tente limpar: `rm -rf node_modules dist release` e reinstalar
