@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
set "ROOT=%CD%"
set "BACKEND=%ROOT%\backend"
set "FRONTEND=%ROOT%\frontend"
set "VENV_PY=%BACKEND%\.venv\Scripts\python.exe"
title FAROMID - Development Launcher

if not exist "%BACKEND%\manage.py" goto not_ready
if not exist "%FRONTEND%\package.json" goto not_ready
if not exist "%VENV_PY%" goto not_ready
if not exist "%BACKEND%\.env" goto not_ready
if not exist "%FRONTEND%\.env.local" goto not_ready
if not exist "%FRONTEND%\node_modules" goto not_ready
where npm.cmd >nul 2>&1
if errorlevel 1 goto not_ready

echo.
echo Launching Django and Next.js in separate CMD windows...
echo.
start "FAROMID - Django :8000" /D "%BACKEND%" cmd /k ""%VENV_PY%" manage.py runserver 127.0.0.1:8000"
if errorlevel 1 goto failed
start "FAROMID - Next.js :3000" /D "%FRONTEND%" cmd /k "npm.cmd run dev"
if errorlevel 1 goto failed

echo.
echo  Website: http://localhost:3000
echo  Admin:   http://localhost:3000/panel
echo  Health:  http://127.0.0.1:8000/health/
echo.
echo Two terminal windows were launched. Wait for both servers to be ready.
echo To stop the servers, press Ctrl+C in EACH terminal window.
echo.
exit /b 0

:not_ready
echo.
echo [ERROR] Setup is incomplete or files are missing.
echo Run setup-first-time.cmd once from the Faromid project root.
echo.
pause
exit /b 1

:failed
echo.
echo [ERROR] Could not launch one of the development terminals.
echo.
pause
exit /b 1
