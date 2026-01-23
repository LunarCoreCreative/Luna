# Script para limpar cache de ícones do Windows
Write-Host "Limpando cache de ícones do Windows..." -ForegroundColor Cyan

# Parar o processo explorer temporariamente
Write-Host "Reiniciando Explorer para atualizar cache..." -ForegroundColor Yellow
Stop-Process -Name explorer -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 2
Start-Process explorer

Write-Host "✅ Cache de ícones limpo! O Explorer foi reiniciado." -ForegroundColor Green
Write-Host "💡 Se o ícone ainda não aparecer, tente:" -ForegroundColor Yellow
Write-Host "   1. Fechar e reabrir o Explorer" -ForegroundColor Yellow
Write-Host "   2. Rebuildar o app (npm run dist:desktop)" -ForegroundColor Yellow
Write-Host "   3. Verificar se o arquivo logo.ico tem todos os tamanhos (16, 32, 48, 64, 128, 256)" -ForegroundColor Yellow
