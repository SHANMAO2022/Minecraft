@echo off
setlocal

:: 设置备份文件夹名称
set "BACKUP_DIR=backups"

:: 如果备份文件夹不存在，则创建它
if not exist "%BACKUP_DIR%" mkdir "%BACKUP_DIR%"

:: 获取当前时间来作为备份文件名的后缀
for /f "delims=" %%a in ('wmic OS Get localdatetime ^| find "."') do set dt=%%a
set "YYYY=%dt:~0,4%"
set "MM=%dt:~4,2%"
set "DD=%dt:~6,2%"
set "HH=%dt:~8,2%"
set "Min=%dt:~10,2%"
set "Sec=%dt:~12,2%"

set "TIMESTAMP=%YYYY%%MM%%DD%_%HH%%Min%%Sec%"

:: 复制并重命名文件
copy "Minecraft.html" "%BACKUP_DIR%\Minecraft_%TIMESTAMP%.html"

echo.
echo 备份成功！
echo 备份文件位置: %BACKUP_DIR%\Minecraft_%TIMESTAMP%.html
echo.
pause
