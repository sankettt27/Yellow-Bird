@echo off
title Creating YellowBird Desktop and Start Menu Shortcuts...
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0create-shortcuts.ps1"
echo.
echo Press any key to close this window...
pause >nul
