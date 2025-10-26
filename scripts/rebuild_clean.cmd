@echo off
REM Clean and rebuild script - complete fresh build
REM This ensures all files are regenerated with matching versions

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

echo Cleaning all build artifacts...
nmake -f ..\sys\winnt\Makefile.msc WIN64=Y clean

echo.
echo Building utilities and data files WITH HEADLESS flag...
nmake -f ..\sys\winnt\Makefile.msc WIN64=Y HEADLESS_BUILD=Y ..\dat\dungeon

echo.
echo Building DLB archive (nhdat367)...
nmake -f ..\sys\winnt\Makefile.msc WIN64=Y HEADLESS_BUILD=Y nhdat367

echo.
echo Building headless executable...
nmake -f ..\sys\winnt\Makefile.msc WIN64=Y HEADLESS_BUILD=Y headlessweb

REM Copy DLB to binary directory
if not exist ..\binary mkdir ..\binary
copy nhdat367 ..\binary\nhdat367

REM Copy dungeon file to binary directory
copy ..\dat\dungeon ..\binary\dungeon

popd
echo.
echo Complete rebuild finished!
exit /b 0
