@echo off
echo Installing backend dependencies...
cd "order-backend"
call npm install

echo.
echo Starting the backend server...
echo Your website will be available at: http://localhost:3001
echo Admin panel will be at: http://localhost:3001/admin.html
echo.
echo Press Ctrl+C to stop the server
echo.
call npm start

pause
