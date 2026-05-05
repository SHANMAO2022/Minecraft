@echo off
setlocal
title Minecraft Web Launcher
chcp 65001 >nul

echo --------------------------------------------------------
echo [Minecraft Local Server]
echo.
echo Please do NOT close this window.
echo The game is running at: http://127.0.0.1:8000/
echo.
echo --------------------------------------------------------

REM Try to open Google Chrome
start chrome http://127.0.0.1:8000/

REM Start Server
echo Starting Custom Python Server...
python server.py
if %errorlevel% neq 0 (
    echo Python server failed to start. Please check if Python is installed.
    pause
)

pause
