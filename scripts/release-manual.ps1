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
    Write-Warning "⚠️  Pre-release deve ser feita no branch staging!"
    Write-Host "Branch atual: $branch" -ForegroundColor Yellow
    $continue = Read-Host "Continuar mesmo assim? (s/N)"
    if ($continue -ne "s" -and $continue -ne "S") {
        exit 1
    }
}
if (-not $Prerelease -and $branch -ne "main") {
    Write-Warning "⚠️  Release estável deve ser feita no branch main!"
    Write-Host "Branch atual: $branch" -ForegroundColor Yellow
    $continue = Read-Host "Continuar mesmo assim? (s/N)"
    if ($continue -ne "s" -and $continue -ne "S") {
        exit 1
    }
}

# 2. Verificar se há mudanças não commitadas
$status = git status --porcelain
if ($status) {
    Write-Warning "⚠️  Há mudanças não commitadas!"
    Write-Host $status -ForegroundColor Yellow
    $continue = Read-Host "Continuar mesmo assim? (s/N)"
    if ($continue -ne "s" -and $continue -ne "S") {
        exit 1
    }
}

# 3. Atualizar package.json
Write-Host "`n📝 Atualizando package.json..." -ForegroundColor Yellow
$pkg = Get-Content package.json -Raw | ConvertFrom-Json
$oldVersion = $pkg.version
$pkg.version = $Version
$pkg | ConvertTo-Json -Depth 100 | Set-Content package.json -Encoding UTF8
Write-Host "✓ Versão atualizada: $oldVersion → $Version" -ForegroundColor Green

# 4. Verificar se CHANGELOG tem entrada para esta versão
Write-Host "`n📋 Verificando CHANGELOG.md..." -ForegroundColor Yellow
if (Test-Path CHANGELOG.md) {
    $changelog = Get-Content CHANGELOG.md -Raw
    if ($changelog -notmatch "\[$Version\]") {
        Write-Warning "⚠️  CHANGELOG.md não tem entrada para versão $Version"
        Write-Host "Certifique-se de atualizar o CHANGELOG antes de continuar!" -ForegroundColor Yellow
    } else {
        Write-Host "✓ CHANGELOG.md tem entrada para $Version" -ForegroundColor Green
    }
} else {
    Write-Warning "⚠️  CHANGELOG.md não encontrado!"
}

# 5. Commit
Write-Host "`n💾 Fazendo commit..." -ForegroundColor Yellow
git add package.json
if (Test-Path CHANGELOG.md) {
    git add CHANGELOG.md
}
$commitMsg = if ($Prerelease) { "chore: Pre-release $Version" } else { "chore: Release $Version" }
git commit -m $commitMsg
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Commit falhou!"
    exit 1
}
Write-Host "✓ Commit criado" -ForegroundColor Green

# 6. Criar tag
Write-Host "`n🏷️  Criando tag..." -ForegroundColor Yellow
$tag = "v$Version"
git tag -a $tag -m "Release $tag"
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Criação de tag falhou!"
    exit 1
}
Write-Host "✓ Tag criada: $tag" -ForegroundColor Green

# 7. Push
Write-Host "`n📤 Fazendo push..." -ForegroundColor Yellow
Write-Host "Pushing branch..." -ForegroundColor Gray
git push origin $branch
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Push do branch falhou!"
    exit 1
}
Write-Host "Pushing tag..." -ForegroundColor Gray
git push origin $tag
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Push da tag falhou!"
    exit 1
}
Write-Host "✓ Push concluído" -ForegroundColor Green

# 8. Build
Write-Host "`n🔨 Fazendo build..." -ForegroundColor Yellow
Write-Host "Isso pode levar alguns minutos..." -ForegroundColor Gray
npm run dist:desktop
if ($LASTEXITCODE -ne 0) {
    Write-Error "❌ Build falhou!"
    exit 1
}
Write-Host "✓ Build concluído" -ForegroundColor Green

# 9. Verificar se os arquivos foram gerados
Write-Host "`n📦 Verificando arquivos gerados..." -ForegroundColor Yellow
$installerPath = "release\Luna-$Version-Setup.exe"
$latestYmlPath = "release\latest.yml"

if (-not (Test-Path $installerPath)) {
    Write-Error "❌ Instalador não encontrado: $installerPath"
    exit 1
}
Write-Host "✓ Instalador encontrado: $installerPath" -ForegroundColor Green

if (-not (Test-Path $latestYmlPath)) {
    Write-Warning "⚠️  latest.yml não encontrado: $latestYmlPath"
} else {
    Write-Host "✓ latest.yml encontrado: $latestYmlPath" -ForegroundColor Green
}

# 10. Instruções finais
Write-Host "`n" -NoNewline
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "✅ Release preparada com sucesso!" -ForegroundColor Green
Write-Host "=" * 60 -ForegroundColor Cyan
Write-Host "`n📋 Próximos passos:" -ForegroundColor Yellow
Write-Host "1. Acesse: https://github.com/LunarCoreCreative/Luna/releases/new" -ForegroundColor White
Write-Host "2. Selecione a tag: $tag" -ForegroundColor White
Write-Host "3. Título: $(if ($Prerelease) { 'Pre-Release' } else { 'Release' }) $tag" -ForegroundColor White
Write-Host "4. Descrição: Copie a seção do CHANGELOG.md para esta versão" -ForegroundColor White
Write-Host "5. Faça upload dos arquivos:" -ForegroundColor White
Write-Host "   📎 $installerPath" -ForegroundColor Gray
Write-Host "   📎 $latestYmlPath" -ForegroundColor Gray
Write-Host "6. Marque como pre-release: $Prerelease" -ForegroundColor White
if (-not $Prerelease) {
    Write-Host "7. Marque como 'Latest release'" -ForegroundColor White
}
Write-Host "8. Clique em 'Publish release'" -ForegroundColor White
Write-Host "`n💡 Dica: Você pode usar o GitHub CLI para automatizar:" -ForegroundColor Cyan
Write-Host "   gh release create $tag --title '$(if ($Prerelease) { 'Pre-Release' } else { 'Release' }) $tag' --notes-file CHANGELOG.md $(if ($Prerelease) { '--prerelease' }) $installerPath $latestYmlPath" -ForegroundColor Gray
Write-Host ""
