@echo off
REM Install script for headless web build - generates all data files
REM This script finds and initializes VS2022 Developer Command Prompt

REM Auto-detect VS2022 installation
set "VSDEV="
if exist "C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\Tools\VsDevCmd.bat" (
    set "VSDEV=C:\Program Files\Microsoft Visual Studio\2022\Community\Common7\Tools\VsDevCmd.bat"
) else if exist "C:\Program Files\Microsoft Visual Studio\2022\Professional\Common7\Tools\VsDevCmd.bat" (
    set "VSDEV=C:\Program Files\Microsoft Visual Studio\2022\Professional\Common7\Tools\VsDevCmd.bat"
) else if exist "C:\Program Files\Microsoft Visual Studio\2022\Enterprise\Common7\Tools\VsDevCmd.bat" (
    set "VSDEV=C:\Program Files\Microsoft Visual Studio\2022\Enterprise\Common7\Tools\VsDevCmd.bat"
)

if "%VSDEV%"=="" (
    echo ERROR: Visual Studio 2022 not found.
    exit /b 1
)

REM Initialize VS environment (x64)
call "%VSDEV%" -arch=amd64
if errorlevel 1 (
    echo ERROR: Failed to initialize VS2022 environment.
    exit /b 1
)

REM Navigate to src directory
pushd "%~dp0..\src"

echo Building data files (utilities and dungeon)...
nmake -f ..\sys\winnt\Makefile.msc WIN64=Y ..\dat\dungeon

if errorlevel 1 (
    popd
    echo ERROR: Data file build failed.
    exit /b 1
)

REM Copy dungeon file to binary directory
if not exist ..\binary mkdir ..\binary
copy ..\dat\dungeon ..\binary\dungeon
if errorlevel 1 (
    popd
    echo ERROR: Failed to copy dungeon file.
    exit /b 1
)

popd
echo.
echo Data files generated successfully!
echo Dungeon file copied to binary\
exit /b 0
