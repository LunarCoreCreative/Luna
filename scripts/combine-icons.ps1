# Script PowerShell para combinar múltiplos arquivos ICO em um único ICO
# Usa ImageMagick se disponível

Write-Host "Combinando ícones em um único arquivo ICO..." -ForegroundColor Cyan

$resourceDir = Join-Path $PSScriptRoot "..\resource"
$outputPath = Join-Path $resourceDir "logo.ico"

# Verificar se ImageMagick está disponível
$magick = Get-Command magick -ErrorAction SilentlyContinue

if ($null -ne $magick) {
    Write-Host "ImageMagick encontrado!" -ForegroundColor Green
    
    # Encontrar todos os arquivos ICO
    $iconFiles = Get-ChildItem -Path $resourceDir -Filter "logo*.ico" | Sort-Object Name
    
    if ($iconFiles.Count -eq 0) {
        Write-Host "Nenhum arquivo ICO encontrado!" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Arquivos encontrados: $($iconFiles.Count)" -ForegroundColor Yellow
    
    # Criar arquivo temporário com lista de arquivos
    $tempList = Join-Path $env:TEMP "icon-list.txt"
    $iconFiles.FullName | Out-File -FilePath $tempList -Encoding ASCII
    
    # Combinar usando ImageMagick
    Write-Host "Combinando ícones..." -ForegroundColor Yellow
    & magick convert @$tempList -background none $outputPath
    
    Remove-Item $tempList -ErrorAction SilentlyContinue
    
    if (Test-Path $outputPath) {
        $fileSize = (Get-Item $outputPath).Length / 1KB
        Write-Host "Ícone combinado criado com sucesso!" -ForegroundColor Green
        Write-Host "Arquivo: $outputPath" -ForegroundColor Cyan
        Write-Host "Tamanho: $([math]::Round($fileSize, 2)) KB" -ForegroundColor Cyan
    } else {
        Write-Host "Erro ao criar arquivo combinado" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "ImageMagick não encontrado!" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Opções:" -ForegroundColor Cyan
    Write-Host "  1. Instalar ImageMagick: https://imagemagick.org/script/download.php" -ForegroundColor White
    Write-Host "  2. Usar uma ferramenta online para combinar ICOs" -ForegroundColor White
    Write-Host "  3. Usar o script Node.js: npm run combine-icons-node" -ForegroundColor White
    Write-Host ""
    exit 1
}
