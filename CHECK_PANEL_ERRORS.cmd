@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
echo.
echo ===================================
echo  FAROMID PANEL API DIAGNOSTICS v5.2
 echo ===================================
if not exist "backend\.venv\Scripts\python.exe" (
  echo [ERROR] backend\.venv\Scripts\python.exe not found.
  echo Run this from the Faromid project folder after setup.
  pause
  exit /b 1
)
cd backend
".venv\Scripts\python.exe" manage.py check_panel_errors
set "RESULT=%ERRORLEVEL%"
echo.
if not "%RESULT%"=="0" echo [ERROR] Diagnostic did not complete successfully.
pause
exit /b %RESULT%
