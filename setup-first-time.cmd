@echo off
setlocal EnableExtensions DisableDelayedExpansion
cd /d "%~dp0"
set "ROOT=%CD%"
set "BACKEND=%ROOT%\backend"
set "FRONTEND=%ROOT%\frontend"
set "VENV_PY=%BACKEND%\.venv\Scripts\python.exe"
set "FAROMID_ROOT=%CD%"
title FAROMID - First Time Setup (No Docker) - FIXED v3

echo.
echo ===============================================
echo  FAROMID - First Time Setup FIXED v4 (No Docker)
echo ===============================================
echo.

if not exist "%BACKEND%\manage.py" (
  echo [ERROR] backend\manage.py was not found.
  echo Put this CMD file next to the backend and frontend folders.
  goto failed
)
if not exist "%BACKEND%\requirements.txt" (
  echo [ERROR] backend\requirements.txt was not found.
  goto failed
)
if not exist "%FRONTEND%\package.json" (
  echo [ERROR] frontend\package.json was not found.
  goto failed
)
if not exist "%BACKEND%\.env.example" (
  echo [ERROR] backend\.env.example was not found.
  goto failed
)
if not exist "%FRONTEND%\.env.local.example" (
  echo [ERROR] frontend\.env.local.example was not found.
  goto failed
)

rem Requirements: Node.js 20+, Python 3.12+ (recommended for Faromid backend).
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 20 ? 0 : 1)" >nul 2>&1
if errorlevel 1 (
  echo [ERROR] Node.js 20 or newer is required. Install Node.js LTS.
  goto failed
)
where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo [ERROR] npm.cmd was not found in PATH.
  goto failed
)

if not exist "%VENV_PY%" (
  echo [1/7] Creating the Python virtual environment...
  py -3 -c "import sys; assert sys.version_info >= (3, 12)" >nul 2>&1
  if not errorlevel 1 (
    py -3 -m venv "%BACKEND%\.venv"
  ) else (
    python -c "import sys; assert sys.version_info >= (3, 12)" >nul 2>&1
    if errorlevel 1 (
      echo [ERROR] Python 3.12 or newer is required.
      goto failed
    )
    python -m venv "%BACKEND%\.venv"
  )
  if not exist "%VENV_PY%" (
    echo [ERROR] Virtual environment was not created.
    goto failed
  )
) else (
  echo [1/7] Existing Python virtual environment found.
)
echo [2/7] Installing the backend dependencies...
"%VENV_PY%" -m pip install --disable-pip-version-check -r "%BACKEND%\requirements.txt"
if errorlevel 1 goto failed

echo [3/7] Creating local .env files and matching the API secrets...
echo [INFO] Configuration uses the project root without a trailing backslash.
rem The setup is self-contained: scripts\configure_local_env.py is NOT required.
if not exist "%BACKEND%\.env" (
  copy /Y "%BACKEND%\.env.example" "%BACKEND%\.env" >nul
  if errorlevel 1 goto failed
)
if not exist "%FRONTEND%\.env.local" (
  copy /Y "%FRONTEND%\.env.local.example" "%FRONTEND%\.env.local" >nul
  if errorlevel 1 goto failed
)
"%VENV_PY%" -c "import os,pathlib,secrets,re; root=pathlib.Path(os.environ['FAROMID_ROOT']); be=root/'backend'/'.env'; fe=root/'frontend'/'.env.local'; a=be.read_text(encoding='utf-8-sig'); b=fe.read_text(encoding='utf-8-sig'); get=lambda s,k:next((x.split('=',1)[1].strip() for x in s.splitlines() if x.startswith(k+'=')),''); put=lambda s,k,v:re.sub(r'(?m)^'+re.escape(k)+r'=.*$',lambda m:k+'='+v,s) if re.search(r'(?m)^'+re.escape(k)+r'=',s) else s.rstrip('\r\n')+'\n'+k+'='+v+'\n'; key=get(a,'DJANGO_SECRET_KEY'); key=secrets.token_urlsafe(48) if not key or any(x in key.upper() for x in ('CHANGE_ME','LOCAL_DEV_ONLY','INSECURE','REPLACE_ME')) else key; proxy=get(a,'API_PROXY_SECRET'); proxy=secrets.token_hex(32) if not proxy or any(x in proxy.upper() for x in ('CHANGE_ME','LOCAL_DEV_ONLY','REPLACE_ME')) else proxy; a=put(put(a,'DJANGO_SECRET_KEY',key),'API_PROXY_SECRET',proxy); a=put(a,'DJANGO_DEBUG','1'); b=put(put(put(b,'API_PROXY_SECRET',proxy),'API_INTERNAL_URL','http://127.0.0.1:8000'),'NEXT_PUBLIC_SITE_URL','http://localhost:1255'); be.write_text(a,encoding='utf-8'); fe.write_text(b,encoding='utf-8'); print('Local configuration ready. API proxy secrets match.')"
if errorlevel 1 goto failed

echo [4/7] Checking Django and preparing the database...
pushd "%BACKEND%"
"%VENV_PY%" manage.py check
if errorlevel 1 goto failed_in_backend
"%VENV_PY%" manage.py makemigrations accounts catalog crm communications content analytics
if errorlevel 1 goto failed_in_backend
"%VENV_PY%" manage.py migrate
if errorlevel 1 goto failed_in_backend

echo [5/7] Creating staff roles and initial catalog data...
"%VENV_PY%" manage.py seed_roles
if errorlevel 1 goto failed_in_backend
"%VENV_PY%" manage.py seed_catalog
if errorlevel 1 goto failed_in_backend
"%VENV_PY%" manage.py seed_site_pages
if errorlevel 1 goto failed_in_backend
popd

echo [6/7] Installing the Next.js dependencies...
pushd "%FRONTEND%"
if exist "node_modules\next\package.json" goto npm_done
if exist package-lock.json goto npm_clean_install
call npm.cmd install
if errorlevel 1 goto failed_in_frontend
goto npm_done
:npm_clean_install
call npm.cmd ci
if errorlevel 1 goto failed_in_frontend
:npm_done
popd

echo [7/7] Checking for a Django superuser...
pushd "%BACKEND%"
"%VENV_PY%" manage.py shell -c "from django.contrib.auth import get_user_model; import sys; sys.exit(0 if get_user_model().objects.filter(is_superuser=True).exists() else 3)" >nul 2>&1
set "ADMIN_STATUS=%ERRORLEVEL%"
if "%ADMIN_STATUS%"=="0" goto admin_exists
if not "%ADMIN_STATUS%"=="3" goto failed_in_backend
echo.
echo Create your Django Admin account (username, email and password).
"%VENV_PY%" manage.py createsuperuser
if errorlevel 1 goto failed_in_backend
goto admin_done
:admin_exists
echo Admin account already exists. Skipping account creation.
:admin_done
popd

echo.
echo ===============================================
echo  Setup complete. Starting Django and Next.js...
echo ===============================================
echo  Website: http://localhost:1255
echo  Admin:   http://localhost:1255/panel
echo ===============================================
echo.
call "%ROOT%\start-dev.cmd"
if errorlevel 1 goto failed
echo.
echo [DONE] Setup finished.
pause
exit /b 0

:failed_in_backend
popd
goto failed
:failed_in_frontend
popd
goto failed
:failed
echo.
echo [SETUP FAILED] Review the error messages above.
echo It is safe to rerun this setup after correcting the issue.
echo.
pause
exit /b 1
