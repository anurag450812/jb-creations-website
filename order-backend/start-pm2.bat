@echo off
title JB Creations PM2 Production Manager

echo =========================================
echo  JB Creations PM2 Production Manager
echo =========================================
echo.

REM Check if PM2 is installed globally
pm2 --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ PM2 is not installed globally
    echo Installing PM2 globally...
    npm install -g pm2
    if %errorlevel% neq 0 (
        echo ❌ Failed to install PM2 globally
        echo Please run as administrator or install manually: npm install -g pm2
        pause
        exit /b 1
    )
)

echo ✅ PM2 is available

REM Check if production environment file exists
if not exist ".env.production" (
    echo ⚠️  No .env.production file found
    echo Please create .env.production with your production settings
    pause
    exit /b 1
)

REM Install dependencies if needed
if not exist "node_modules" (
    echo 📦 Installing dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo ❌ Failed to install dependencies
        pause
        exit /b 1
    )
)

REM Install production dependencies
echo 📦 Ensuring production packages are installed...
call npm install helmet express-rate-limit morgan compression winston twilio
if %errorlevel% neq 0 (
    echo ❌ Failed to install production dependencies
    pause
    exit /b 1
)

REM Copy production environment
copy .env.production .env

echo.
echo 🚀 Starting JB Creations Auth Server with PM2...
echo.

REM Stop existing PM2 process if running
pm2 delete jb-auth-server 2>nul

REM Start the auth server with PM2
pm2 start auth-server-production.js --name "jb-auth-server" --env production --max-memory-restart 150M --watch false --log-date-format "YYYY-MM-DD HH:mm:ss Z"

if %errorlevel% neq 0 (
    echo ❌ Failed to start server with PM2
    pause
    exit /b 1
)

echo.
echo ✅ Server started successfully with PM2!
echo.
echo 📊 Server Status:
pm2 show jb-auth-server
echo.
echo 📋 Available Commands:
echo   pm2 status                    - View all processes
echo   pm2 logs jb-auth-server       - View server logs
echo   pm2 restart jb-auth-server    - Restart the server
echo   pm2 stop jb-auth-server       - Stop the server
echo   pm2 delete jb-auth-server     - Remove the server
echo   pm2 monit                     - Real-time monitoring
echo.
echo 🌐 Server Details:
echo   URL: http://localhost:3001
echo   Health: http://localhost:3001/health
echo   Admin: http://localhost:3001/api/admin/users
echo.
echo PM2 will automatically restart the server if it crashes.
echo The server is now running in the background.
echo.

pause