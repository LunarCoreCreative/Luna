param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [Parameter(Mandatory=$false)]
    [switch]$Prerelease,
    
    [Parameter(Mandatory=$false)]
    [string]$Channel = "beta"
)

Write-Host "Iniciando release manual: $Version" -ForegroundColor Cyan

# 1. Verificar se está no branch correto
$branch = git branch --show-current
if ($Prerelease -and $branch -ne "staging") {
    Write-Warning "Pre-release deve ser feita no branch staging!"
    Write-Host "Branch atual: $branch" -ForegroundColor Yellow
    $continue = Read-Host "Continuar mesmo assim? (s/N)"
    if ($continue -ne "s" -and $continue -ne "S") {
        exit 1
    }
}
if (-not $Prerelease -and $branch -ne "main") {
    Write-Warning "Release estavel deve ser feita no branch main!"
    Write-Host "Branch atual: $branch" -ForegroundColor Yellow
    $continue = Read-Host "Continuar mesmo assim? (s/N)"
    if ($continue -ne "s" -and $continue -ne "S") {
        exit 1
    }
}

# 2. Verificar se há mudanças não commitadas
$status = git status --porcelain
if ($status) {
    Write-Warning "Ha mudancas nao commitadas!"
    Write-Host $status -ForegroundColor Yellow
    $continue = Read-Host "Continuar mesmo assim? (s/N)"
    if ($continue -ne "s" -and $continue -ne "S") {
        exit 1
    }
}

# 3. Atualizar package.json
Write-Host ""
Write-Host "Atualizando package.json..." -ForegroundColor Yellow
$pkg = Get-Content package.json -Raw | ConvertFrom-Json
$oldVersion = $pkg.version
$pkg.version = $Version

# Usar formatação mais compacta e preservar estrutura
$jsonSettings = @{
    Depth = 100
    Compress = $false
    EscapeHandling = [Newtonsoft.Json.EscapeHandling]::Default
} -ErrorAction SilentlyContinue

# Tentar usar formatação melhor
try {
    # Ler o arquivo original para preservar formatação
    $originalContent = Get-Content package.json -Raw
    $json = $pkg | ConvertTo-Json -Depth 100
    
    # Substituir apenas a linha da versão usando regex
    $updatedContent = $originalContent -replace "(`"version`":\s*)`"[^`"]*`"", "`$1`"$Version`""
    
    # Se a substituição não funcionou, usar o JSON convertido mas formatado melhor
    if ($updatedContent -eq $originalContent) {
        # Usar node para formatar o JSON corretamente
        $tempJson = $pkg | ConvertTo-Json -Depth 100
        $tempJson | Out-File -FilePath "package.json.tmp" -Encoding UTF8 -NoNewline
        
        # Tentar usar node para formatar (se disponível)
        if (Get-Command node -ErrorAction SilentlyContinue) {
            node -e "const fs = require('fs'); const pkg = JSON.parse(fs.readFileSync('package.json.tmp', 'utf8')); fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2) + '\n', 'utf8');" 2>$null
            Remove-Item "package.json.tmp" -ErrorAction SilentlyContinue
        } else {
            # Fallback: usar o JSON convertido mas com formatação manual melhor
            $json = $pkg | ConvertTo-Json -Depth 100
            # Remover espaços excessivos e formatar melhor
            $json = $json -replace '  +', '  '  # Normalizar espaços
            $json | Set-Content package.json -Encoding UTF8
        }
    } else {
        $updatedContent | Set-Content package.json -Encoding UTF8 -NoNewline
    }
} catch {
    # Fallback simples
    $json = $pkg | ConvertTo-Json -Depth 100
    $json | Set-Content package.json -Encoding UTF8
}

Write-Host "Versao atualizada: $oldVersion -> $Version" -ForegroundColor Green

# 4. Verificar se CHANGELOG tem entrada para esta versão
Write-Host ""
Write-Host "Verificando CHANGELOG.md..." -ForegroundColor Yellow
if (Test-Path CHANGELOG.md) {
    $changelog = Get-Content CHANGELOG.md -Raw
    $versionPattern = "\[$Version\]"
    if ($changelog -notmatch $versionPattern) {
        Write-Warning "CHANGELOG.md nao tem entrada para versao $Version"
        Write-Host "Certifique-se de atualizar o CHANGELOG antes de continuar!" -ForegroundColor Yellow
    } else {
        Write-Host "CHANGELOG.md tem entrada para $Version" -ForegroundColor Green
    }
} else {
    Write-Warning "CHANGELOG.md nao encontrado!"
}

# 5. Commit
Write-Host ""
Write-Host "Fazendo commit..." -ForegroundColor Yellow
git add package.json
if (Test-Path CHANGELOG.md) {
    git add CHANGELOG.md
}
if ($Prerelease) {
    $commitMsg = "chore: Pre-release $Version"
} else {
    $commitMsg = "chore: Release $Version"
}
git commit -m $commitMsg
if ($LASTEXITCODE -ne 0) {
    Write-Error "Commit falhou!"
    exit 1
}
Write-Host "Commit criado" -ForegroundColor Green

# 6. Criar tag
Write-Host ""
Write-Host "Criando tag..." -ForegroundColor Yellow
$tag = "v$Version"
git tag -a $tag -m "Release $tag"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Criacao de tag falhou!"
    exit 1
}
Write-Host "Tag criada: $tag" -ForegroundColor Green

# 7. Push
Write-Host ""
Write-Host "Fazendo push..." -ForegroundColor Yellow
Write-Host "Pushing branch..." -ForegroundColor Gray
git push origin $branch
if ($LASTEXITCODE -ne 0) {
    Write-Error "Push do branch falhou!"
    exit 1
}
Write-Host "Pushing tag..." -ForegroundColor Gray
git push origin $tag
if ($LASTEXITCODE -ne 0) {
    Write-Error "Push da tag falhou!"
    exit 1
}
Write-Host "Push concluido" -ForegroundColor Green

# 8. Build
Write-Host ""
Write-Host "Fazendo build..." -ForegroundColor Yellow
Write-Host "Isso pode levar alguns minutos..." -ForegroundColor Gray
npm run dist:desktop
if ($LASTEXITCODE -ne 0) {
    Write-Error "Build falhou!"
    exit 1
}
Write-Host "Build concluido" -ForegroundColor Green

# 9. Verificar se os arquivos foram gerados
Write-Host ""
Write-Host "Verificando arquivos gerados..." -ForegroundColor Yellow
$installerPath = "release\Luna-$Version-Setup.exe"
$latestYmlPath = "release\latest.yml"

if (-not (Test-Path $installerPath)) {
    Write-Error "Instalador nao encontrado: $installerPath"
    exit 1
}
Write-Host "Instalador encontrado: $installerPath" -ForegroundColor Green

if (-not (Test-Path $latestYmlPath)) {
    Write-Warning "latest.yml nao encontrado: $latestYmlPath"
} else {
    Write-Host "latest.yml encontrado: $latestYmlPath" -ForegroundColor Green
}

# 10. Instruções finais
Write-Host ""
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host "Release preparada com sucesso!" -ForegroundColor Green
Write-Host ("=" * 60) -ForegroundColor Cyan
Write-Host ""
Write-Host "Proximos passos:" -ForegroundColor Yellow
Write-Host "1. Acesse: https://github.com/LunarCoreCreative/Luna/releases/new" -ForegroundColor White
Write-Host "2. Selecione a tag: $tag" -ForegroundColor White
if ($Prerelease) {
    Write-Host "3. Titulo: Pre-Release $tag" -ForegroundColor White
} else {
    Write-Host "3. Titulo: Release $tag" -ForegroundColor White
}
Write-Host "4. Descricao: Copie a secao do CHANGELOG.md para esta versao" -ForegroundColor White
Write-Host "5. Faca upload dos arquivos:" -ForegroundColor White
Write-Host "   - $installerPath" -ForegroundColor Gray
Write-Host "   - $latestYmlPath" -ForegroundColor Gray
Write-Host "6. Marque como pre-release: $Prerelease" -ForegroundColor White
if (-not $Prerelease) {
    Write-Host "7. Marque como 'Latest release'" -ForegroundColor White
}
Write-Host "8. Clique em 'Publish release'" -ForegroundColor White
Write-Host ""
Write-Host "Dica: Voce pode usar o GitHub CLI para automatizar:" -ForegroundColor Cyan
if ($Prerelease) {
    Write-Host "   gh release create $tag --title 'Pre-Release $tag' --notes-file CHANGELOG.md --prerelease $installerPath $latestYmlPath" -ForegroundColor Gray
} else {
    Write-Host "   gh release create $tag --title 'Release $tag' --notes-file CHANGELOG.md $installerPath $latestYmlPath" -ForegroundColor Gray
}
Write-Host ""
