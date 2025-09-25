// cloudinary-service.js
// This file contains server-side functions for Cloudinary integration

const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const path = require('path');

// Configure Cloudinary with your credentials
// These will be replaced with actual values from environment variables
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME || 'dfhxnpp9m',
  api_key: process.env.CLOUDINARY_API_KEY || '629699618349166',
  api_secret: process.env.CLOUDINARY_API_SECRET || '-8gGXZCe-4ORvEQSPcdajA38yQQ'
});

// Helper function to generate a unique folder name for each order
function getCloudinaryOrderFolder(orderId) {
  return `jb-creations-orders/${orderId}`;
}

// Function to upload an image to Cloudinary from a base64 string
async function uploadBase64Image(base64Image, publicId) {
  try {
    // Remove the data:image/jpeg;base64, part if it exists
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(`data:image/jpeg;base64,${base64Data}`, {
      public_id: publicId,
      resource_type: 'image',
      overwrite: true
    });
    
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Function to upload an image to Cloudinary from a file path
async function uploadImageFile(filePath, publicId) {
  try {
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(filePath, {
      public_id: publicId,
      resource_type: 'image',
      overwrite: true
    });
    
    return {
      success: true,
      url: result.secure_url,
      publicId: result.public_id
    };
  } catch (error) {
    console.error('Error uploading to Cloudinary:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Function to get a signed URL for a Cloudinary image
function getSignedUrl(publicId, options = {}) {
  const defaults = {
    resource_type: 'image',
    type: 'upload',
    expires_at: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
  };
  
  const params = { ...defaults, ...options };
  
  return cloudinary.utils.api_sign_request(
    { public_id: publicId, ...params },
    cloudinary.config().api_secret
  );
}

// Function to delete an image from Cloudinary
async function deleteImage(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return {
      success: result.result === 'ok',
      result
    };
  } catch (error) {
    console.error('Error deleting from Cloudinary:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  uploadBase64Image,
  uploadImageFile,
  getSignedUrl,
  deleteImage,
  getCloudinaryOrderFolder
};