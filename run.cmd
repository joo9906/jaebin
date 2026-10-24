@echo off
setlocal
cd /d "%~dp0"
if not exist "venv\Scripts\python.exe" (
    python -m venv venv
    if errorlevel 1 exit /b 1
)
"venv\Scripts\python.exe" -c "import importlib.util, sys; sys.exit(0 if all(importlib.util.find_spec(m) for m in ('fastapi', 'uvicorn', 'httpx', 'bs4', 'dotenv')) else 1)"
if errorlevel 1 (
    "venv\Scripts\python.exe" -m pip install -r requirements.txt
    if errorlevel 1 exit /b 1
)
"venv\Scripts\python.exe" -m uvicorn app.main:app --host 127.0.0.1 --port 8000
