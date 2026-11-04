@echo off
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
 echo Node.js is required. Install the current LTS from https://nodejs.org then try again.
 pause
 exit /b 1
)
node server.mjs --open
pause
