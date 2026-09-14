@echo off
echo ===================================================
echo     YellowBird Admin Portal - Windows .exe Builder
echo ===================================================
echo.

cd /d "%~dp0"

echo [1/3] Building frontend assets...
cd frontend
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Frontend build failed!
    pause
    exit /b %errorlevel%
)

echo.
echo [2/3] Installing electron packaging tools...
cd ..\electron
if not exist "node_modules" (
    call npm install
)

echo.
echo [3/3] Packaging YellowBird Admin Windows .exe installer...
call npm run dist
if %errorlevel% neq 0 (
    echo [ERROR] Packaging failed!
    pause
    exit /b %errorlevel%
)

echo.
echo ===================================================
echo [SUCCESS] YellowBird Admin .exe created successfully!
echo Output directory: electron\dist-electron
echo ===================================================
pause
