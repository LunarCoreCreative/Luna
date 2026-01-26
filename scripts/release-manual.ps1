param(
    [Parameter(Mandatory=$true)]
    [string]$Version,
    
    [Parameter(Mandatory=$false)]
    [switch]$Prerelease,
    
    [Parameter(Mandatory=$false)]
    [string]$Channel = "beta"
)

Write-Host "Iniciando release manual: $Version" -ForegroundColor Cyan

# 1. Verificar se est├í no branch correto
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

# 2. Verificar se h├í mudan├ºas n├úo commitadas
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

# Ler o arquivo original preservando formata├º├úo
$packageJsonPath = "package.json"
if (-not (Test-Path $packageJsonPath)) {
    Write-Error "package.json nao encontrado!"
    exit 1
}

# Ler como JSON para obter vers├úo atual
$pkg = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
$oldVersion = $pkg.version

# Ler linhas do arquivo para preservar formata├º├úo
$lines = Get-Content $packageJsonPath
$found = $false
$updatedLines = @()

foreach ($line in $lines) {
    # Procurar linha que cont├⌐m "version"
    if ($line -match '^\s*"version"\s*:\s*"([^"]+)"') {
        # Substituir apenas a vers├úo usando [regex]::Replace para evitar problemas com $1 e $2
        $newLine = [regex]::Replace($line, '("version"\s*:\s*")[^"]*(")', {
            param($match)
            return $match.Groups[1].Value + $Version + $match.Groups[2].Value
        })
        $updatedLines += $newLine
        $found = $true
        Write-Host "Linha encontrada: $line" -ForegroundColor Gray
        Write-Host "Linha atualizada: $newLine" -ForegroundColor Gray
    } else {
        $updatedLines += $line
    }
}

if (-not $found) {
    Write-Error "Nao foi possivel encontrar a linha de versao no package.json"
    exit 1
}

# Salvar arquivo atualizado SEM BOM
$content = $updatedLines -join "`n"
$utf8NoBom = New-Object System.Text.UTF8Encoding $false
[System.IO.File]::WriteAllText((Resolve-Path $packageJsonPath), $content, $utf8NoBom)

# Verificar se o JSON ainda ├⌐ v├ílido
try {
    $test = Get-Content $packageJsonPath -Raw | ConvertFrom-Json
    if ($test.version -eq $Version) {
        Write-Host "Versao atualizada: $oldVersion -> $Version" -ForegroundColor Green
    } else {
        throw "Versao nao foi atualizada corretamente (esperado: $Version, encontrado: $($test.version))"
    }
} catch {
    Write-Error "Erro ao validar package.json: $_"
    Write-Host "Restaurando package.json original..." -ForegroundColor Yellow
    # Tentar restaurar do git se poss├¡vel
    git checkout package.json 2>$null
    exit 1
}

# 4. Verificar se CHANGELOG tem entrada para esta vers├úo
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
Write-Host "Verificando mudancas para commit..." -ForegroundColor Yellow
git add package.json
if (Test-Path CHANGELOG.md) {
    git add CHANGELOG.md
}

# Verificar se h├í mudan├ºas staged para commit
$stagedChanges = git diff --cached --name-only
if (-not $stagedChanges) {
    Write-Host "Nenhuma mudanca para commitar (versao ja estava atualizada)" -ForegroundColor Yellow
    Write-Host "Pulando commit..." -ForegroundColor Gray
} else {
    Write-Host "Fazendo commit..." -ForegroundColor Yellow
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
}

# 6. Criar tag
Write-Host ""
Write-Host "Criando tag..." -ForegroundColor Yellow
$tag = "v$Version"

# Verificar se a tag j├í existe (local)
$tagExistsLocal = $false
$tagExistsRemote = $false
try {
    $null = git rev-parse --verify "refs/tags/$tag" 2>$null
    if ($LASTEXITCODE -eq 0) {
        $tagExistsLocal = $true
        Write-Warning "Tag local '$tag' ja existe!"
    }
} catch {
    # Tag n├úo existe localmente
}

# Verificar se a tag existe no remoto
try {
    git ls-remote --tags origin $tag 2>$null | Out-Null
    if ($LASTEXITCODE -eq 0) {
        $remoteCheck = git ls-remote --tags origin $tag 2>$null
        if ($remoteCheck) {
            $tagExistsRemote = $true
            Write-Warning "Tag remota '$tag' ja existe!"
        }
    }
} catch {
    # Tag n├úo existe remotamente
}

# Se a tag existe, perguntar ao usu├írio
if ($tagExistsLocal -or $tagExistsRemote) {
    Write-Host ""
    Write-Host "A tag '$tag' ja existe!" -ForegroundColor Yellow
    if ($tagExistsLocal) { Write-Host "  - Existe localmente" -ForegroundColor Gray }
    if ($tagExistsRemote) { Write-Host "  - Existe remotamente" -ForegroundColor Gray }
    Write-Host ""
    $action = Read-Host "Deseja deletar e recriar a tag? (s/N)"
    if ($action -eq "s" -or $action -eq "S") {
        # Deletar tag local
        if ($tagExistsLocal) {
            Write-Host "Deletando tag local..." -ForegroundColor Yellow
            git tag -d $tag
        }
        # Deletar tag remota
        if ($tagExistsRemote) {
            Write-Host "Deletando tag remota..." -ForegroundColor Yellow
            git push origin :refs/tags/$tag 2>$null
        }
        Write-Host "Tag deletada. Criando nova tag..." -ForegroundColor Green
    } else {
        Write-Host "Abortando. Tag nao foi criada." -ForegroundColor Yellow
        exit 1
    }
}

# Criar a tag
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

# 10. Instru├º├╡es finais
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
