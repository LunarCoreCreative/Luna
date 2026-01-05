@echo off
title Luna AI - Startup
echo ============================================
echo           LUNA AI - Starting Up
echo ============================================
echo.

:: Get the directory where this script is located
cd /d "%~dp0"

:: Check if virtual environment exists
if exist ".venv\Scripts\activate.bat" (
    echo [1/4] Activating virtual environment...
    call .venv\Scripts\activate.bat
) else if exist "venv\Scripts\activate.bat" (
    echo [1/4] Activating virtual environment...
    call venv\Scripts\activate.bat
) else (
    echo [1/4] No virtual environment found, using system Python...
)

:: Start the Python server in background
echo [2/4] Starting Luna Server (port 8001)...
start "Luna Server" /min cmd /c "python -m server.main"

:: Start Vite dev server in background
echo [3/4] Starting Vite Dev Server (port 5173)...
start "Vite Dev" /min cmd /c "npm run dev"

:: Wait for both servers to be ready
echo     Waiting for servers to initialize...
timeout /t 5 /nobreak > nul

:: Start Electron app
echo [4/4] Starting Luna Desktop App...
start "" npx electron .

echo.
echo ============================================
echo    Luna started! You can close this window.
echo ============================================
timeout /t 2 /nobreak > nul
exit
