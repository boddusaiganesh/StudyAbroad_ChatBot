@echo off
echo Starting AI-Powered Study Abroad Assistant...
echo.

REM Check if virtual environment exists
if not exist "backend\venv" (
    echo Creating Python virtual environment...
    cd backend
    python -m venv venv
    call venv\Scripts\activate
    pip install -r requirements.txt
    cd ..
) else (
    echo Virtual environment already exists.
)

REM Start backend
echo.
echo Starting backend server...
cd backend
start cmd /k "venv\Scripts\activate && python main.py"
cd ..

REM Wait a bit for backend to start
timeout /t 3 /nobreak > nul

REM Start frontend
echo.
echo Starting frontend server...
cd frontend

REM Check if node_modules exists
if not exist "node_modules" (
    echo Installing frontend dependencies...
    npm install
)

start cmd /k "npm run dev"
cd ..

echo.
echo ==========================================
echo Application started successfully!
echo ==========================================
echo Backend:  http://localhost:8000
echo Frontend: http://localhost:3000
echo API Docs: http://localhost:8000/docs
echo.
echo Close the terminal windows to stop servers
echo ==========================================
