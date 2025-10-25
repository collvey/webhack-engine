@echo off
setlocal enableextensions

rem Try common VS2022 editions to locate VsDevCmd.bat
set VSDEV=
for %%E in (Community Professional Enterprise) do (
  if exist "C:\Program Files\Microsoft Visual Studio\2022\%%E\Common7\Tools\VsDevCmd.bat" (
    set "VSDEV=C:\Program Files\Microsoft Visual Studio\2022\%%E\Common7\Tools\VsDevCmd.bat"
    goto :found
  )
)

:found
if not defined VSDEV (
  echo ERROR: Could not find VsDevCmd.bat for Visual Studio 2022.^>
  echo Looked in Community/Professional/Enterprise under C:\Program Files\Microsoft Visual Studio\2022\^>
  echo Please install VS 2022 with "Desktop development with C++" or update this script to your path.
  exit /b 1
)

call "%VSDEV%" -arch=amd64
if errorlevel 1 (
  echo ERROR: Failed to initialize VS Dev environment.
  exit /b 1
)

pushd "%~dp0..\src"
if errorlevel 1 (
  echo ERROR: Could not change directory to src.
  exit /b 1
)

echo Building headless web stub (Web M0)...
nmake -f ..\sys\winnt\Makefile.msc WIN64=Y HEADLESS_BUILD=Y headlessweb
set BUILDERR=%ERRORLEVEL%

popd
exit /b %BUILDERR%
