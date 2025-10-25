@echo off
setlocal enableextensions

pushd "%~dp0..\migration\tests_web"
python web_smoke_test_python.py
set TESTERR=%ERRORLEVEL%
popd
exit /b %TESTERR%
