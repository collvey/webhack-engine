@echo off
REM WebHack WASM Launcher - Pure Client-Side Mode
REM No server needed - runs entirely in browser!

echo ========================================
echo   Starting WebHack (WASM Mode)
echo ========================================
echo.
echo This will start the Vite dev server.
echo NetHack runs entirely in your browser!
echo.

REM Get the script directory and project root
set SCRIPT_DIR=%~dp0
set PROJECT_ROOT=%SCRIPT_DIR%..

echo Project root: %PROJECT_ROOT%
echo.

REM Check if WASM files exist
if not exist "%PROJECT_ROOT%\webhack-client\public\nethack.wasm" (
    echo WARNING: nethack.wasm not found!
    echo Please build WASM first:
    echo   scripts\build_wasm_simple.cmd
    echo.
    pause
    exit /b 1
)

REM Start Vite dev server
echo Starting Vite Dev Server (port 3000)...
echo.
cd /d "%PROJECT_ROOT%\webhack-client"
start "WebHack WASM" cmd /k "npm run dev"

REM Wait for server to start
timeout /t 3 /nobreak >nul

echo.
echo ========================================
echo   WebHack Started (WASM Mode)!
echo ========================================
echo.
echo Web Client: http://localhost:3000
echo.
echo Game runs entirely in browser - no server needed!
echo To stop: Close the terminal window or press Ctrl+C
echo.
echo Opening browser in 2 seconds...
timeout /t 2 /nobreak >nul

REM Open browser
start http://localhost:3000

echo.
echo Browser opened. Happy hacking!
echo.
echo NOTE: After first load, game works OFFLINE!
echo       Saves persist in browser IndexedDB
pause
