@echo off
echo ========================================
echo JB Creations - OTP Production Setup
echo ========================================
echo.

echo Step 1: Installing Netlify Functions dependencies...
cd netlify\functions
call npm install
cd ..\..
echo ✅ Dependencies installed
echo.

echo Step 2: Checking Netlify CLI...
where netlify >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo ⚠️ Netlify CLI not found. Installing...
    call npm install -g netlify-cli
    echo ✅ Netlify CLI installed
) else (
    echo ✅ Netlify CLI already installed
)
echo.

echo Step 3: Creating .env file for local testing...
if not exist .env (
    echo Creating .env file...
    (
        echo # Fast2SMS Configuration
        echo FAST2SMS_API_KEY=9EgVuLYNlo0skRw46pq3Tvy7SZ5PcWJniz2rGCAmbeUfDBhxXMs80pKcFeEdNLRqkfv34TPa7tjgWiQx
        echo FAST2SMS_TEMPLATE_ID=200214
        echo FAST2SMS_SENDER_ID=JBCREA
        echo.
        echo # JWT Secret (change this in production!)
        echo JWT_SECRET=jb-creations-secret-key-change-in-production
    ) > .env
    echo ✅ .env file created
) else (
    echo ✅ .env file already exists
)
echo.

echo ========================================
echo Setup Complete! ✅
echo ========================================
echo.
echo Next steps:
echo 1. Set environment variables in Netlify Dashboard
echo 2. Run: netlify dev (to test locally)
echo 3. Run: netlify deploy --prod (to deploy)
echo.
echo For detailed instructions, see OTP-PRODUCTION-SETUP.md
echo.
pause
