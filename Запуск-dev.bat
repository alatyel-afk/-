@echo off
chcp 65001 >nul
cd /d "%~dp0"
where npm >nul 2>&1 || (
  echo Не найден npm. Установите Node.js LTS: https://nodejs.org/
  pause
  exit /b 1
)
echo Запуск из корня проекта ^(npm workspaces^)…
npm run dev
pause
