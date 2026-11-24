@echo off
rem ============================================================
rem   BAT Hub - double click to open the launcher
rem   Bootstrap: locate Python, auto-install deps, silent start
rem   NOTE: keep this file ASCII-only, cmd reads .bat as ANSI,
rem         and avoid parentheses inside IF blocks.
rem ============================================================
setlocal
cd /d "%~dp0"

rem ---- 1. locate Python, prefer the py launcher ----
set "PY="
where py.exe >nul 2>nul
if %errorlevel%==0 (
  set "PY=py -3"
) else (
  where python.exe >nul 2>nul
  if %errorlevel%==0 set "PY=python"
)
if not defined PY (
  echo [BAT Hub] Python not found. Install Python 3.10+ first:
  echo        https://www.python.org/downloads/
  echo        Remember to check "Add python.exe to PATH".
  pause
  exit /b 1
)

rem ---- 2. install missing dependencies ----
%PY% -c "import webview, pystray, PIL" 2>nul
if errorlevel 1 (
  echo [BAT Hub] First run: installing dependencies...
  %PY% -m pip install -r requirements.txt
  if errorlevel 1 (
    echo [BAT Hub] Dependency install failed. Check your network.
    pause
    exit /b 1
  )
)

rem ---- 3. resolve pythonw.exe next to the interpreter ----
set "PYW="
for /f "delims=" %%i in ('%PY% -c "import sys,os;p=os.path.join(os.path.dirname(sys.executable),'pythonw.exe');print(p if os.path.exists(p) else '')"') do set "PYW=%%i"

if defined PYW (
  start "" "%PYW%" server.py
) else (
  rem fallback: minimized console window
  start "" /min %PY% server.py
)
exit
