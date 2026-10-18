@echo off
setlocal EnableExtensions
chcp 65001 >nul
set "ROOT=%~dp0"
set "PY=%ROOT%backend\.venv\Scripts\python.exe"
if not exist "%PY%" set "PY=python"
if not exist "%ROOT%backend\manage.py" (
  echo [ERROR] Place this script alongside backend and frontend.
  pause
  exit /b 1
)
if not exist "%ROOT%frontend\public\assets\home\home-organizational-values.png" (
  echo [ERROR] New image asset is missing. Extract the complete ZIP first.
  pause
  exit /b 1
)
pushd "%ROOT%backend" || exit /b 1
if exist "db.sqlite3" (
  if not exist "db.sqlite3.before-v55.bak" (
    copy /y "db.sqlite3" "db.sqlite3.before-v55.bak" >nul
    if errorlevel 1 goto fail
    echo [OK] Existing SQLite database backed up.
  )
)
echo [1/4] Django system checks...
"%PY%" manage.py check
if errorlevel 1 goto fail
echo [2/4] Applying pending migrations without deleting records...
"%PY%" manage.py migrate --noinput
if errorlevel 1 goto fail
echo [3/4] Adding missing CMS sections and media references...
"%PY%" manage.py seed_site_pages
if errorlevel 1 goto fail
echo [4/4] Checking CMS and catalog APIs...
"%PY%" manage.py check_panel_errors
if errorlevel 1 goto fail
popd
echo.
echo [OK] Faromid v5.5 upgrade completed. Restart Django and Next.js.
pause
exit /b 0
:fail
popd
echo.
echo [ERROR] Upgrade stopped. Existing database has not been deleted.
pause
exit /b 1
