@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "ROOT=%~dp0"
set "PY=%ROOT%backend\.venv\Scripts\python.exe"
if not exist "%PY%" set "PY=python"
if not exist "%ROOT%backend\manage.py" (
  echo [ERROR] Project root missing backend\manage.py
  pause
  exit /b 1
)
if not exist "%ROOT%frontend\src\app\panel\(console)\media\page.tsx" (
  echo [ERROR] Missing /panel/media Next.js route. Apply patch in the project root.
  pause
  exit /b 1
)
pushd "%ROOT%backend" || exit /b 1
echo [1/5] Django configuration check...
"%PY%" manage.py check
if errorlevel 1 goto fail
echo [2/5] Database migration status...
"%PY%" manage.py showmigrations partners
if errorlevel 1 goto fail
echo [3/5] API endpoints and tables (read-only)...
"%PY%" manage.py check_panel_errors
if errorlevel 1 goto fail
echo [4/5] Automated integration tests (isolated test database)...
"%PY%" manage.py test tests.test_panel_v54 tests.test_panel_v53 tests.test_page_cms --verbosity 1
if errorlevel 1 goto fail
popd
pushd "%ROOT%frontend" || exit /b 1
echo [5/5] Checking frontend TypeScript and page routes...
call npm run lint
if errorlevel 1 goto fail_frontend
call npm run build
if errorlevel 1 goto fail_frontend
popd
echo.
echo [OK] All configured checks passed.
pause
exit /b 0
:fail_frontend
popd
echo.
echo [ERROR] Frontend check failed. Inspect messages above.
pause
exit /b 1
:fail
popd
echo.
echo [ERROR] Backend checks failed. Inspect messages above.
pause
exit /b 1
