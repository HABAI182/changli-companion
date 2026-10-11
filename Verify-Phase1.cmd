@echo off
setlocal
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0Verify-Phase1.ps1" %*
exit /b %ERRORLEVEL%
