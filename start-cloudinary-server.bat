@echo off
if "%CLOUDINARY_CLOUD_NAME%"=="" goto missing_env
if "%CLOUDINARY_API_KEY%"=="" goto missing_env
if "%CLOUDINARY_API_SECRET%"=="" goto missing_env
if "%UPLOAD_PERMIT_SECRET%"=="" goto missing_env

echo Starting server with Cloudinary support...
cd order-backend
node minimal-server.js
goto :eof

:missing_env
echo Missing required environment variables. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, and UPLOAD_PERMIT_SECRET before starting the server.
exit /b 1