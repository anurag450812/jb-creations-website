@echo off
echo Setting up Photo Framing Website Order Backend...
echo.

echo Installing Node.js dependencies...
npm install

echo.
echo Creating required directories...
if not exist "orders" mkdir orders
if not exist "images" mkdir images

echo.
echo Setup complete! 
echo.
echo To start the server:
echo   npm start
echo.
echo To start with auto-reload (development):
echo   npm run dev
echo.
echo Admin Panel will be available at: http://localhost:3001/admin-enhanced.html
echo API will be available at: http://localhost:3001/api/
echo.
pause
