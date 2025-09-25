# Cloudinary Integration for JB Creations

This document explains how to set up and use Cloudinary for storing order images in your JB Creations website.

## Why Cloudinary?

Cloudinary offers several advantages over storing images directly in Firebase:

1. **Cost-Effective**: Cloudinary's free tier includes 25GB of storage and 25GB of monthly bandwidth
2. **Performance**: Faster image loading and automatic optimization
3. **Transformations**: Easily resize, crop, and manipulate images on the fly
4. **CDN Delivery**: Global content delivery network for fast loading worldwide
5. **Scalability**: Easy to scale as your business grows

## Setup Instructions

### 1. Create a Cloudinary Account

1. Sign up for a free account at [cloudinary.com](https://cloudinary.com/users/register/free)
2. After signing up, you'll get access to your dashboard

### 2. Get Your Cloudinary Credentials

From your Cloudinary dashboard, collect the following information:
- **Cloud Name**: Found in the "Account Details" section
- **API Key**: Found in the "Account Details" section
- **API Secret**: Found in the "Account Details" section

### 3. Configure Your Environment

You need to add these Cloudinary credentials as environment variables for your server:

For local development:
```
export CLOUDINARY_CLOUD_NAME=your_cloud_name
export CLOUDINARY_API_KEY=your_api_key
export CLOUDINARY_API_SECRET=your_api_secret
```

For production deployment (Railway/Render/etc.):
- Add these same environment variables in your hosting platform's dashboard

### 4. Update Client Configuration

Open the `cloudinary-config.js` file and update the following values:
```javascript
const CLOUDINARY_CLOUD_NAME = 'your_cloud_name';
const CLOUDINARY_API_KEY = 'your_api_key';
// Note: API Secret is only used server-side and should not be in client code
```

## How It Works

1. When a customer places an order, the images are uploaded to Cloudinary first
2. The Cloudinary URLs are then stored in Firebase instead of the raw image data
3. The admin panel displays images from Cloudinary URLs
4. This dramatically reduces your Firebase storage usage and costs

## Troubleshooting

If images aren't uploading to Cloudinary:

1. Check if your environment variables are set correctly
2. Verify your Cloudinary account is active
3. Check browser console for any error messages
4. Make sure your server has the `/api/upload-to-cloudinary` endpoint working

## Need Help?

If you need assistance with the Cloudinary integration, please contact support.