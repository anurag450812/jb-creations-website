@echo off
echo Setting up Cloudinary environment variables...
set CLOUDINARY_CLOUD_NAME=dfhxnpp9m
set CLOUDINARY_API_KEY=629699618349166
set CLOUDINARY_API_SECRET=-8gGXZCe-4ORvEQSPcdajA38yQQ

echo Starting server with Cloudinary support...
cd order-backend
node minimal-server.js