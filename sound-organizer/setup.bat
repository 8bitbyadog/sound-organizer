@echo off
echo Setting up Sound Organizer...

REM Check if Node.js is installed
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Node.js is not installed. Please install Node.js (v14+) and try again.
    exit /b 1
)

REM Check if Python is installed
where python >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo Python 3 is not installed. Please install Python (v3.8+) and try again.
    exit /b 1
)

REM Setup Electron app
echo Setting up Electron app...
cd electron-app
call npm install
cd ..

REM Setup Python backend
echo Setting up Python backend...
cd python-backend
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt
call deactivate
cd ..

echo Setup complete! You can now run the application with:
echo cd electron-app ^&^& npm start 