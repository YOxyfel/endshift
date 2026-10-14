@echo off
rem Double-click to run the ENDSHIFT site at http://localhost:4321 (needs Node.js 18+).
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js isn't installed, so the dev server can't start.
  echo Opening the static preview instead. To get the dev server, install Node.js from https://nodejs.org
  start "" "%~dp0dist-preview\index.html"
  pause
  exit /b 0
)
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:4321"
node scripts\dev.mjs
