# Script para iniciar o servidor backend
Write-Host "Iniciando servidor backend na porta 3001..." -ForegroundColor Cyan

Set-Location $PSScriptRoot\server

# Verificar se Python está instalado
$pythonCmd = Get-Command python -ErrorAction SilentlyContinue
if (-not $pythonCmd) {
    Write-Host "ERRO: Python nao encontrado no PATH" -ForegroundColor Red
    exit 1
}

Write-Host "Python encontrado: $($pythonCmd.Path)" -ForegroundColor Green
Write-Host "Diretorio: $(Get-Location)" -ForegroundColor Yellow

# Iniciar servidor
Write-Host ""
Write-Host "Iniciando servidor..." -ForegroundColor Yellow
python app.py
