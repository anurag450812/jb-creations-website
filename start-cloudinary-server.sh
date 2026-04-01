#!/bin/bash
if [ -z "$CLOUDINARY_CLOUD_NAME" ] || [ -z "$CLOUDINARY_API_KEY" ] || [ -z "$CLOUDINARY_API_SECRET" ] || [ -z "$UPLOAD_PERMIT_SECRET" ]; then
	echo "Missing required environment variables. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET, and UPLOAD_PERMIT_SECRET before starting the server."
	exit 1
fi

echo "Starting server with Cloudinary support..."
cd order-backend
node minimal-server.js