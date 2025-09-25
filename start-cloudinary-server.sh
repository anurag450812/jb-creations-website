#!/bin/bash
echo "Setting up Cloudinary environment variables..."
export CLOUDINARY_CLOUD_NAME=dfhxnpp9m
export CLOUDINARY_API_KEY=629699618349166
export CLOUDINARY_API_SECRET=-8gGXZCe-4ORvEQSPcdajA38yQQ

echo "Starting server with Cloudinary support..."
cd order-backend
node minimal-server.js