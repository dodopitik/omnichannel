@echo off
setlocal

cd /d "%~dp0"
title Omnichannel Starter

echo.
echo ==========================================
echo  Starting Omnichannel Marketplace System
echo ==========================================
echo.

echo [1/5] Starting Redis Docker container...
docker compose -f docker\docker-compose.yml up -d redis
if errorlevel 1 (
  echo.
  echo Failed to start Redis. Make sure Docker Desktop is running.
  pause
  exit /b 1
)

echo.
echo [2/5] Checking admin web production build...
if not exist "apps\admin-web\.next\BUILD_ID" (
  echo Admin build not found. Building admin web first...
  npm.cmd run build --workspace @omnichannel/admin-web
  if errorlevel 1 (
    echo.
    echo Admin build failed.
    pause
    exit /b 1
  )
)

echo.
echo [3/5] Starting API, Worker, and Webhook in background...
start "Omnichannel API" /min cmd /c "cd /d %~dp0apps\api && npm.cmd run start > %~dp0api-start.log 2> %~dp0api-start.err.log"
start "Omnichannel Worker" /min cmd /c "cd /d %~dp0apps\worker && npm.cmd run start > %~dp0worker-start.log 2> %~dp0worker-start.err.log"
start "Omnichannel Webhook" /min cmd /c "cd /d %~dp0apps\webhook && npm.cmd run start > %~dp0webhook-start.log 2> %~dp0webhook-start.err.log"

echo.
echo [4/5] Starting Admin Web...
start "Omnichannel Admin Web" cmd /k "cd /d %~dp0apps\admin-web && npm.cmd run start"

echo.
echo [5/5] Done.
echo.
echo Open this URL in your browser:
echo http://localhost:3000/login
echo.
echo Login:
echo admin@omnichannel.com
echo Admin@123456
echo.
echo If the browser does not open immediately, wait 10-20 seconds.
echo This starter window can be closed.
echo.
pause
