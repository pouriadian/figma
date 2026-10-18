@echo off
setlocal EnableExtensions
cd /d "%~dp0"
echo [Faromid v5.3] Checking Django + Next.js...
if not exist "backend\.venv\Scripts\python.exe" (
  echo [ERROR] The Django virtual environment does not exist in backend\.venv
  echo Please use your existing setup-first-time.cmd first.
  pause
  exit /b 1
)
call "backend\.venv\Scripts\activate.bat"
set "DJANGO_DEBUG=1"
set "DJANGO_SECURE_SSL_REDIRECT=0"
pushd backend
python manage.py check
if errorlevel 1 goto :fail_backend
python manage.py check_panel_errors
if errorlevel 1 goto :fail_backend
python manage.py test tests --verbosity 1
if errorlevel 1 goto :fail_backend
popd
if not exist "frontend\node_modules\next\package.json" (
  echo [WARN] Frontend packages are not installed. Run npm ci inside frontend.
  pause
  exit /b 1
)
pushd frontend
call npm run lint
if errorlevel 1 goto :fail_frontend
call npm run build
if errorlevel 1 goto :fail_frontend
popd
echo.
echo [SUCCESS] All v5.3 checks passed.
pause
exit /b 0
:fail_frontend
popd
echo [FAILED] Next.js TypeScript/build check failed.
pause
exit /b 1
:fail_backend
popd
echo [FAILED] Django checks failed. See traceback above.
pause
exit /b 1
