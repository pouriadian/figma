@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title FAROMID - Panel Login Diagnostic

echo.
echo ===========================================
echo  FAROMID - Panel Login Diagnostic
echo ===========================================
echo.
if not exist "backend\.venv\Scripts\python.exe" (
  echo [ERROR] Run setup-first-time.cmd first.
  goto end
)
if not exist "backend\scripts\check_panel_login.py" (
  echo [ERROR] The diagnostic Python script is missing.
  goto end
)
pushd "backend"
".venv\Scripts\python.exe" "scripts\check_panel_login.py"
popd
:end
echo.
pause
endlocal
