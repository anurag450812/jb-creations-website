@echo off
echo Starting JB Creations Enhanced Admin Server...
echo.

rem Check if node is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or not in PATH
    echo Please install Node.js from https://nodejs.org
    pause
    exit /b 1
)

rem Check if we're in the right directory
if not exist "package.json" (
    echo ERROR: package.json not found
    echo Please run this script from the order-backend directory
    pause
    exit /b 1
)

rem Install dependencies if node_modules doesn't exist
if not exist "node_modules" (
    echo Installing dependencies...
    npm install
    if errorlevel 1 (
        echo ERROR: Failed to install dependencies
        pause
        exit /b 1
    )
    echo.
)

echo Starting enhanced admin server...
echo.
echo The admin panel will be available at:
echo - Enhanced Admin Panel: http://localhost:3001/admin
echo - Legacy Admin Panel: http://localhost:3001/admin-legacy
echo - API Health Check: http://localhost:3001/api/health
echo.
echo Press Ctrl+C to stop the server
echo.

node admin-server.js

pause
