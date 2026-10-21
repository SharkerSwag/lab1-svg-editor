@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo 请先安装 Node.js 24 或更新版本，然后重新打开本文件。
  pause
  exit /b 1
)
node -e "process.exit(Number(process.versions.node.split('.')[0]) >= 24 ? 0 : 1)"
if errorlevel 1 (
  echo 当前 Node.js 版本过旧，需要 Node.js 24 或更新版本。
  pause
  exit /b 1
)
if not exist "node_modules\.package-lock.json" (
  echo 首次启动，正在安装依赖...
  call npm ci
  if errorlevel 1 (
    echo 依赖安装失败，请检查网络后重试。
    pause
    exit /b 1
  )
)
call npm start -- %*
if errorlevel 1 (
  echo 编辑器启动失败，请查看上方错误。
  pause
  exit /b 1
)
endlocal
