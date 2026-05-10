@echo off
setlocal
title Minecraft 自动环境修复启动器
chcp 65001 >nul

echo --------------------------------------------------------
echo [Minecraft 启动器] 正在检查运行环境...
echo --------------------------------------------------------

REM 1. 检查 Python 是否已安装
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [状态] 未检测到 Python，准备启动自动安装程序...
    echo 请在弹出的窗口中允许安装。
    
    REM 使用 winget 自动安装 Python 3
    winget install Python.Python.3 --silent --accept-package-agreements --accept-source-agreements
    
    if %errorlevel% neq 0 (
        echo [错误] 自动安装失败，可能是系统版本过低。
        echo 请手动访问 https://www.python.org/ 下载安装。
        start https://www.python.org/downloads/
        pause
        exit
    )
    
    echo [成功] Python 已安装！
    echo 请“关闭此窗口”并“重新运行”一次 [启动游戏.bat] 即可进入游戏。
    pause
    exit
)

REM 2. 检查服务器脚本是否存在
if not exist "server.py" (
    echo [错误] 找不到 server.py 文件，请确保此脚本放在游戏根目录。
    pause
    exit
)

REM 3. 启动后台服务器 (最小化运行)
echo [1/2] 正在启动后台引擎...
start /min "MinecraftServer" python server.py

REM 4. 启动游戏页面
echo [2/2] 正在启动游戏主程序...
timeout /t 2 >nul
start "" "index.html"

echo --------------------------------------------------------
echo [完成] 游戏已启动！
echo 注意：请保持后台黑窗口运行，否则无法正常存档。
echo --------------------------------------------------------
timeout /t 5 >nul
exit
