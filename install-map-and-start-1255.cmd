@echo off
setlocal
cd /d "%~dp0"
echo ---------------------------------------------
echo FAROMID: Install modern Iran map dependency
 echo ---------------------------------------------
where npm.cmd >nul 2>&1
if errorlevel 1 (
  echo Node.js and npm are required.
  pause
  exit /b 1
)
call npm.cmd install react-iran-map@0.1.3
if errorlevel 1 (
  echo Could not install the npm package. Check network or npm registry.
  pause
  exit /b 1
)
echo.
echo Starting Faromid frontend on http://localhost:1255
call npm.cmd run dev -- -p 1255
endlocal
