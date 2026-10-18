@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "ROOT=%~dp0"
set "PY=%ROOT%backend\.venv\Scripts\python.exe"
if not exist "%PY%" set "PY=python"
pushd "%ROOT%backend" || exit /b 1
echo [1/5] Django system checks...
"%PY%" manage.py check
if errorlevel 1 goto fail_backend
echo [2/5] Django regression tests on isolated test database...
"%PY%" manage.py test tests.test_home_improvements_v55 tests.test_page_cms tests.test_panel_v54 --verbosity 1
if errorlevel 1 goto fail_backend
popd
pushd "%ROOT%frontend" || exit /b 1
echo [3/5] Checking original and new assets...
call node scripts/verify-assets.mjs
if errorlevel 1 goto fail_frontend
call node scripts/verify-source.mjs
if errorlevel 1 goto fail_frontend
call node scripts/verify-v55.mjs
if errorlevel 1 goto fail_frontend
echo [4/5] TypeScript type check...
call npm run lint
if errorlevel 1 goto fail_frontend
echo [5/5] Next.js production build...
call npm run build
if errorlevel 1 goto fail_frontend
popd
echo.
echo [OK] All configured validation checks passed.
pause
exit /b 0
:fail_frontend
popd
echo.
echo [ERROR] Frontend check failed. Inspect errors above.
pause
exit /b 1
:fail_backend
popd
echo.
echo [ERROR] Django check failed. Inspect errors above.
pause
exit /b 1
