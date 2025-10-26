@echo off
REM WebHack Development Servers Launcher
REM Starts bridge.js and serve.js in separate windows

echo Starting WebHack Development Servers...
echo.

REM Get the script directory and project root
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..

echo Project root: %PROJECT_ROOT%
echo.

REM Start bridge server in new window
echo [1/2] Starting Bridge Server (port 8080)...
start "WebHack Bridge" cmd /k "cd /d %PROJECT_ROOT%\bridge && node bridge.js"

REM Wait a moment for bridge to start
timeout /t 2 /nobreak >nul

REM Start web client server in new window
echo [2/2] Starting Web Client Server (port 3000)...
start "WebHack Client" cmd /k "cd /d %PROJECT_ROOT%\webhack-client && node serve.js"

echo.
echo ========================================
echo   WebHack Servers Started!
echo ========================================
echo.
echo Bridge Server:  ws://localhost:8080
echo Web Client:     http://localhost:3000
echo.
echo Two new terminal windows have been opened.
echo To stop servers: Close both terminal windows or press Ctrl+C in each.
echo.
echo Opening browser in 3 seconds...
timeout /t 3 /nobreak >nul

REM Open browser
start http://localhost:3000

echo.
echo Browser opened. Happy hacking!
pause
