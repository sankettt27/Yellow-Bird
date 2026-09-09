@echo off
title YellowBird Launcher
echo ===================================================
echo     Starting YellowBird Backend & Frontend
echo ===================================================
echo.

echo [1/2] Starting Backend (FastAPI)...
start "YellowBird Backend (FastAPI)" cmd /k "cd /d %~dp0backend && call venv\Scripts\activate.bat && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload"

echo [2/2] Starting Frontend (Vite)...
start "YellowBird Frontend (Vite)" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo ===================================================
echo  Both servers have been launched!
echo  Backend Docs:    http://localhost:8000/docs
echo  Mobile / Web:    http://localhost:5173/
echo  Admin Portal:    http://localhost:5173/admin/login
echo ===================================================
echo.
pause
