@echo off
title JB Creations Production Auth Server

echo =========================================
echo  JB Creations Production Auth Server
echo =========================================
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

REM Check if production environment file exists
if not exist ".env.production" (
    echo ⚠️  No .env.production file found
    echo Please create .env.production with your production settings
    echo Use .env.production.example as a template
    pause
    exit /b 1
)

REM Install production dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Install additional production dependencies
echo 📦 Installing production security packages...
call npm install helmet express-rate-limit morgan compression winston twilio pm2
if %errorlevel% neq 0 (
    echo ❌ Failed to install production dependencies
    pause
    exit /b 1
)

echo ✅ Dependencies installed successfully

REM Copy production environment
copy .env.production .env

echo.
echo 🔒 Starting JB Creations Auth Server in PRODUCTION MODE...
echo.
echo IMPORTANT: Make sure you have:
echo ✅ Set a strong JWT_SECRET in .env.production
echo ✅ Configured SMS service (Twilio/MSG91)
echo ✅ Set up proper CORS origins
echo ✅ Configured SSL certificates (if using HTTPS)
echo.
echo Server will be available at: http://localhost:3001
echo Health check: http://localhost:3001/health
echo Admin panel: http://localhost:3001/api/admin/users
echo.
echo Press Ctrl+C to stop the server
echo.

REM Start the production auth server
set NODE_ENV=production
node auth-server-production.js

pause