@echo off
setlocal
set "HUB_HOME=%~dp0"
cd /d "%HUB_HOME%"
if not exist "data\logs" mkdir "data\logs"
set "HUB_LOG=%HUB_HOME%data\logs\launcher.log"
set "ELECTRON_RUN_AS_NODE="
set "NODE_OPTIONS="
echo Production Hub startup %date% %time% > "%HUB_LOG%"
if not exist "node_modules\electron\dist\electron.exe" (
  echo ERROR: Electron runtime is missing. Run npm install from this folder. >> "%HUB_LOG%"
  goto failed
)
if not exist "dist\index.html" (
  echo ERROR: Built interface is missing. Run npm run build from this folder. >> "%HUB_LOG%"
  goto failed
)
"%HUB_HOME%node_modules\electron\dist\electron.exe" "%HUB_HOME%." --disable-gpu --enable-logging --log-file="%HUB_HOME%data\logs\chromium.log" %* >> "%HUB_LOG%" 2>&1
set "HUB_EXIT=%ERRORLEVEL%"
if not "%HUB_EXIT%"=="0" (
  echo ERROR: Production Hub exited with code %HUB_EXIT%. >> "%HUB_LOG%"
  goto failed
)
exit /b 0
:failed
echo.
echo Production Hub could not start or stopped unexpectedly.
type "%HUB_LOG%"
echo.
echo Logs: "%HUB_HOME%data\logs"
echo Your saved projects and original recordings have not been reset.
echo Press any key to close this launcher.
pause >nul
exit /b 1
