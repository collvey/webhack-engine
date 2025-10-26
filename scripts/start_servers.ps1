#!/usr/bin/env pwsh
# WebHack Development Servers Launcher (PowerShell)
# Starts bridge.js and serve.js in separate windows

Write-Host ""
Write-Host "Starting WebHack Development Servers..." -ForegroundColor Cyan
Write-Host ""

# Get the script directory and project root
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$ProjectRoot = Split-Path -Parent $ScriptDir

Write-Host "Project root: $ProjectRoot"
Write-Host ""

# Start bridge server in new window
Write-Host "[1/2] Starting Bridge Server (port 8080)..." -ForegroundColor Green
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "Set-Location '$ProjectRoot\bridge'; node bridge.js" -WindowStyle Normal

# Wait a moment for bridge to start
Start-Sleep -Seconds 2

# Start web client server in new window
Write-Host "[2/2] Starting Web Client Server (port 3000)..." -ForegroundColor Green
Start-Process -FilePath "powershell" -ArgumentList "-NoExit", "-Command", "Set-Location '$ProjectRoot\webhack-client'; node serve.js" -WindowStyle Normal

Write-Host ""
Write-Host "=======================================" -ForegroundColor Yellow
Write-Host "  WebHack Servers Started!" -ForegroundColor Yellow
Write-Host "=======================================" -ForegroundColor Yellow
Write-Host ""
Write-Host "Bridge Server:  ws://localhost:8080" -ForegroundColor Cyan
Write-Host "Web Client:     http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Two new terminal windows have been opened."
Write-Host "To stop servers: Close both terminal windows or press Ctrl+C in each."
Write-Host ""
Write-Host "Opening browser in 3 seconds..." -ForegroundColor Magenta
Start-Sleep -Seconds 3

# Open browser
Start-Process "http://localhost:3000"

Write-Host ""
Write-Host "Browser opened. Happy hacking!" -ForegroundColor Green
Write-Host ""
Write-Host "Press any key to exit this window..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
