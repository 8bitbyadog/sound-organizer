#!/bin/bash

# Sound Organizer Setup Script

echo "Setting up Sound Organizer..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "Node.js is not installed. Please install Node.js (v14+) and try again."
    exit 1
fi

# Check if Python is installed
if ! command -v python3 &> /dev/null; then
    echo "Python 3 is not installed. Please install Python (v3.8+) and try again."
    exit 1
fi

# Setup Electron app
echo "Setting up Electron app..."
cd electron-app
npm install
cd ..

# Setup Python backend
echo "Setting up Python backend..."
cd python-backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
cd ..

echo "Setup complete! You can now run the application with:"
echo "cd electron-app && npm start" 