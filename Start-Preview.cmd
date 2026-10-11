@echo off
cd /d "%~dp0"
if not exist node_modules call npm ci
call npm run dev
pause
