@echo off
title JB Creations Auth Server (Development)

echo =====================================
echo  JB Creations Auth Server (Dev Mode)
echo =====================================
echo.

REM Check if node is installed
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  No .env file found. Creating from template...
    copy .env.example .env
    echo ✅ Created .env file
)

echo.
echo 🔧 Starting Auth Server in Development Mode...
echo 🔄 Auto-restart enabled (nodemon)
echo.

REM Start the auth server with nodemon for development
call npm run auth-dev

pause