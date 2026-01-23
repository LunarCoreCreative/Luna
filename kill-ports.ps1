# Script para matar processos nas portas 3001 e 5173
Write-Host "Procurando processos nas portas 3001 e 5173..." -ForegroundColor Yellow

$ports = @(3001, 5173)
$killed = $false

foreach ($port in $ports) {
    Write-Host ""
    Write-Host "Verificando porta $port..." -ForegroundColor Cyan
    
    # Encontrar processos usando a porta
    $portStr = ":" + $port
    $connections = netstat -ano | findstr $portStr
    
    if ($connections) {
        Write-Host "Processos encontrados na porta ${port}:" -ForegroundColor Yellow
        $connections | ForEach-Object {
            $parts = $_ -split '\s+'
            $processId = $parts[-1]
            
            if ($processId -match '^\d+$') {
                try {
                    $process = Get-Process -Id $processId -ErrorAction SilentlyContinue
                    if ($process) {
                        Write-Host "  PID $processId - $($process.ProcessName) - $($process.Path)" -ForegroundColor Red
                        Write-Host "  Matando processo $processId..." -ForegroundColor Yellow
                        taskkill /PID $processId /F | Out-Null
                        Start-Sleep -Milliseconds 500
                        Write-Host "  Processo $processId encerrado" -ForegroundColor Green
                        $killed = $true
                    }
                } catch {
                    Write-Host "  Nao foi possivel encerrar PID $processId" -ForegroundColor Yellow
                }
            }
        }
    } else {
        Write-Host "  Nenhum processo encontrado na porta $port" -ForegroundColor Green
    }
}

# Tambem verificar processos Python/Node que possam estar travados
Write-Host ""
Write-Host "Verificando processos Python/Node travados..." -ForegroundColor Cyan
$pythonProcs = Get-Process python -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*Luna*" -or $_.Path -like "*server*" }
$nodeProcs = Get-Process node -ErrorAction SilentlyContinue | Where-Object { $_.Path -notlike "*cursor*" -and $_.Path -notlike "*electron*" }

if ($pythonProcs) {
    Write-Host "Processos Python encontrados:" -ForegroundColor Yellow
    $pythonProcs | ForEach-Object {
        Write-Host "  PID $($_.Id) - $($_.Path)" -ForegroundColor Red
        taskkill /PID $_.Id /F | Out-Null
        $killed = $true
    }
}

if ($nodeProcs) {
    Write-Host "Processos Node encontrados:" -ForegroundColor Yellow
    $nodeProcs | ForEach-Object {
        Write-Host "  PID $($_.Id) - $($_.Path)" -ForegroundColor Red
        taskkill /PID $_.Id /F | Out-Null
        $killed = $true
    }
}

Write-Host ""
if ($killed) {
    Write-Host "Processos encerrados! Aguarde alguns segundos antes de iniciar o servidor." -ForegroundColor Green
} else {
    Write-Host "Nenhum processo encontrado nas portas. Voce pode iniciar o servidor agora." -ForegroundColor Green
}
