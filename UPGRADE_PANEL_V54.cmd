@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "ROOT=%~dp0"
if not exist "%ROOT%backend\manage.py" (
  echo [ERROR] Run this file from the Faromid project root, next to backend and frontend.
  pause
  exit /b 1
)
set "PY=%ROOT%backend\.venv\Scripts\python.exe"
if not exist "%PY%" set "PY=python"
pushd "%ROOT%backend" || exit /b 1
if exist "db.sqlite3" (
  if not exist "db.sqlite3.before-v54.bak" (
    copy /y "db.sqlite3" "db.sqlite3.before-v54.bak" >nul
    if errorlevel 1 goto fail
    echo [OK] Backup saved: backend\db.sqlite3.before-v54.bak
  ) else echo [INFO] Existing SQLite backup preserved.
) else echo [INFO] No local SQLite file; external database or first installation.
echo [1/5] Checking Python and backend...
"%PY%" manage.py check
if errorlevel 1 goto fail
echo [2/5] Checking Excel import dependency...
"%PY%" -c "import openpyxl"
if errorlevel 1 (
  echo Installing openpyxl into active Python environment...
  "%PY%" -m pip install "openpyxl>=3.1.4,<4"
  if errorlevel 1 goto fail
)
echo [3/5] Applying pending Django migrations (includes partners profiles)...
"%PY%" manage.py migrate --noinput
if errorlevel 1 goto fail
echo [4/5] Seeding missing site pages and original-media references; existing data is not overwritten...
"%PY%" manage.py seed_site_pages
if errorlevel 1 goto fail
echo [5/5] Verifying routes and profiles table...
"%PY%" manage.py check_panel_errors
if errorlevel 1 goto fail
popd
echo.
echo [OK] Backend upgraded. Start Django and Next.js again.
echo [INFO] Open /panel/pages/home, /panel/media and /representatives on the Next.js port.
pause
exit /b 0
:fail
popd
echo.
echo [ERROR] Upgrade stopped. Your original database and backup were not deleted.
echo [ACTION] Read the error above; do not delete or recreate db.sqlite3.
pause
exit /b 1
