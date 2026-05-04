@echo off
title Minecraft Local Server
cd /d "%~dp0"

echo --------------------------------------------------------
echo [Minecraft Local Server]
echo.
echo Please do NOT close this window.
echo The game is running at: http://127.0.0.1:8000/
echo.
echo --------------------------------------------------------

REM Try to open browser
start msedge http://127.0.0.1:8000/

REM Start Server
echo Starting Python Server...
python -m http.server 8000 || py -m http.server 8000 || python3 -m http.server 8000

echo.
echo ERROR: Failed to start server.
pause
