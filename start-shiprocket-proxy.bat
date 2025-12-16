@echo off
echo ========================================
echo   Starting Shiprocket Proxy Server
echo ========================================
echo.
echo This proxy is needed for local development
echo to avoid CORS issues with Shiprocket API.
echo.
echo Keep this window open while testing locally.
echo.
node shiprocket-proxy.js
pause
