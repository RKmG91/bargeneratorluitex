@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Instale o Node.js 22 ou superior e execute novamente.
  pause
  exit /b 1
)
if not exist node_modules\bwip-js (
  call npm install --omit=dev --ignore-scripts
  if errorlevel 1 (
    pause
    exit /b 1
  )
)
echo Acesse http://localhost:3000 quando o servidor iniciar.
node servidor.js
pause
