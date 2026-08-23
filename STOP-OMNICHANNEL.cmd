@echo off
setlocal

cd /d "%~dp0"
title Omnichannel Stopper

echo.
echo =========================================
echo  Stopping Omnichannel Marketplace System
echo =========================================
echo.

for %%P in (3000 3001 3003) do (
  for /f "tokens=5" %%A in ('netstat -ano ^| findstr ":%%P " ^| findstr "LISTENING"') do (
    echo Stopping process on port %%P, PID %%A...
    taskkill /PID %%A /F >nul 2>nul
  )
)

echo.
echo Stopping Redis Docker container...
docker compose -f docker\docker-compose.yml stop redis

echo.
echo Done.
pause
