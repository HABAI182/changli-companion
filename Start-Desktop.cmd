@echo off
setlocal
cd /d "%~dp0"
if exist "%USERPROFILE%\.cargo\bin\cargo.exe" set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
if not exist node_modules call npm ci
if errorlevel 1 exit /b %ERRORLEVEL%
call npm run desktop
pause
