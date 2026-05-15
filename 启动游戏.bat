@echo off
setlocal
title Minecraft 绿色便携启动器
chcp 65001 >nul

set "LOCAL_PYTHON=%~dp0python\python.exe"
set "USE_PYTHON=python"

echo --------------------------------------------------------
echo [Minecraft 启动器] 正在检查运行环境...
echo --------------------------------------------------------

REM 1. 优先检查当前文件夹下的 python 子目录
if exist "%LOCAL_PYTHON%" (
    echo [状态] 发现内置 Python 环境。
    set "USE_PYTHON=%LOCAL_PYTHON%"
    goto :START_SERVER
)

REM 2. 检查系统是否已安装 Python
python --version >nul 2>&1
if %errorlevel% equ 0 (
    echo [状态] 发现系统安装的 Python。
    set "USE_PYTHON=python"
    goto :START_SERVER
)

REM 3. 环境缺失处理
cls
echo --------------------------------------------------------
echo [提示] 未检测到 Python 环境 (内置或系统)
echo --------------------------------------------------------
echo.
echo 游戏需要 Python 来支持“完整纹理”和“文件存档”。
echo.
echo 您可以选择：
echo [1] 自动下载便携版 Python 到本文件夹 (推荐，约 10MB)
echo [2] 使用系统 winget 安装 Python
echo [3] 兼容模式直接启动 (无纹理，存档在浏览器)
echo.
set /p choice=请输入数字序号 [1, 2 或 3] 并回车: 

if "%choice%"=="1" goto :DOWNLOAD_PORTABLE
if "%choice%"=="2" goto :INSTALL_SYSTEM
if "%choice%"=="3" start msedge -inprivate "%~dp0index.html" & exit
exit

:DOWNLOAD_PORTABLE
echo.
echo 正在为您下载便携版 Python 3.12...
echo 请稍候 (这取决于您的网速)...
echo.
powershell -Command "& {Invoke-WebRequest -Uri 'https://www.python.org/ftp/python/3.12.3/python-3.12.3-embed-amd64.zip' -OutFile 'python_portable.zip'; Expand-Archive -Path 'python_portable.zip' -DestinationPath 'python' -Force; Remove-Item 'python_portable.zip'}"
if %errorlevel% equ 0 (
    echo.
    echo [成功] Python 已下载并解压到 'python' 文件夹！
    set "USE_PYTHON=%LOCAL_PYTHON%"
    echo 正在准备启动...
    timeout /t 2 >nul
    goto :START_SERVER
) else (
    echo.
    echo [错误] 下载失败，请检查网络连接或尝试手动下载。
    pause
    exit
)

:INSTALL_SYSTEM
echo.
echo 正在尝试安装系统 Python...
winget install Python.Python.3 --silent --accept-package-agreements --accept-source-agreements
echo.
echo 安装命令已发送，请等待安装完成后重新运行此脚本。
pause
exit

:START_SERVER
REM 检查服务器脚本是否存在
if not exist "server.py" (
    echo [错误] 找不到 server.py 文件，请确保此脚本放在游戏根目录。
    pause
    exit
)

echo [1/2] 正在启动后台引擎...
start /min "MinecraftServer" "%USE_PYTHON%" server.py

echo [3/3] 正在进入游戏...
timeout /t 2 >nul
start msedge -inprivate "http://localhost:8000"

echo --------------------------------------------------------
echo [完成] 游戏已启动！
echo --------------------------------------------------------
timeout /t 5 >nul

