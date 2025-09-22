@echo off
title JB Creations Auth Server

echo ================================
echo  JB Creations Auth Server Setup
echo ================================
echo.

REM Check if node is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo ✅ Node.js is installed

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
    echo ✅ Dependencies installed successfully
)

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  No .env file found. Creating from template...
    copy .env.example .env
    echo ✅ Created .env file. You may want to customize it later.
)

echo.
echo 🚀 Starting JB Creations Auth Server...
echo.
echo Server will be available at: http://localhost:3001
echo Health check: http://localhost:3001/health
echo Admin users: http://localhost:3001/api/admin/users
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the auth server
node auth-server.js

pause