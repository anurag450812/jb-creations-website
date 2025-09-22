@echo off
REM JB Creations Backend Deployment Setup Script for Windows
REM This script automates the deployment process for your backend server

echo 🚀 JB Creations Backend Deployment Setup
echo ========================================

REM Check if we're in the right directory
if not exist "package.json" (
    echo ❌ This script must be run from the order-backend directory
    pause
    exit /b 1
)

echo ℹ️  Starting deployment setup...

REM Step 1: Install dependencies
echo ℹ️  Installing dependencies...
call npm install
if %ERRORLEVEL% neq 0 (
    echo ❌ Failed to install dependencies
    pause
    exit /b 1
)
echo ✅ Dependencies installed successfully

REM Step 2: Create necessary directories
echo ℹ️  Creating necessary directories...
if not exist "images" mkdir images
if not exist "orders" mkdir orders
if not exist "logs" mkdir logs
if not exist "backups" mkdir backups
echo ✅ Directories created

REM Step 3: Check for environment file
if not exist ".env" (
    echo ⚠️  No .env file found. Creating from example...
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo ℹ️  Please edit the .env file with your actual configuration values
    ) else (
        echo ⚠️  No .env.example found. You'll need to create .env manually
    )
)

REM Step 4: Generate JWT secret if not set
echo ℹ️  Checking JWT secret...
findstr /C:"JWT_SECRET=your-super-secret" .env >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo ⚠️  Generating new JWT secret...
    for /f %%i in ('node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"') do set JWT_SECRET=%%i
    powershell -Command "(gc .env) -replace 'JWT_SECRET=.*', 'JWT_SECRET=%JWT_SECRET%' | Out-File -encoding ASCII .env"
    echo ✅ JWT secret generated and saved
)

REM Step 5: Run database migrations
echo ℹ️  Running database migrations...
call node scripts/migrate-database.js migrate
if %ERRORLEVEL% equ 0 (
    echo ✅ Database migrations completed
) else (
    echo ⚠️  Database migrations failed or not available
)

REM Step 6: Create initial backup
echo ℹ️  Creating initial database backup...
call node scripts/enhanced-backup.js create initial-setup
if %ERRORLEVEL% equ 0 (
    echo ✅ Initial backup created
) else (
    echo ⚠️  Backup creation failed or not available
)

REM Step 7: Display deployment instructions
echo.
echo ℹ️  Setup completed! Next steps:
echo.
echo 1. Edit your .env file with actual values:
echo    - EMAIL_USER and EMAIL_PASS for email notifications
echo    - MSG91_API_KEY for SMS notifications
echo    - RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET for payments
echo    - CORS_ORIGIN with your Netlify URL
echo.
echo 2. Choose a deployment platform:
echo    🚀 Railway (Recommended): railway.app
echo    🌐 Heroku: heroku.com
echo    🔹 Render: render.com
echo    🌊 DigitalOcean: digitalocean.com
echo.
echo 3. Deploy your backend:
echo    - Connect your GitHub repository
echo    - Set environment variables in the platform
echo    - Deploy from the order-backend folder
echo.
echo 4. Update your frontend:
echo    - Edit api-client.js with your backend URL
echo    - Redeploy your Netlify site
echo.
echo 5. Test your deployment:
echo    - Visit your-backend-url/health
echo    - Test user registration and order creation
echo    - Access admin panel at your-backend-url/admin
echo.
echo ✅ Deployment setup complete! 🎉
echo.
echo 📖 For detailed instructions, see DEPLOYMENT.md
echo ❓ Need help? Check the troubleshooting section in the deployment guide

pause