@echo off
echo Fechando processos nas portas 3001 e 5173...
powershell -ExecutionPolicy Bypass -File kill-ports.ps1
pause
