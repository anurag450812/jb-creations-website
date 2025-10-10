// cloudinary-config.js
// This file contains configuration and helper functions for Cloudinary integration

// Replace these with your actual Cloudinary credentials
const CLOUDINARY_CLOUD_NAME = 'dfhxnpp9m';
const CLOUDINARY_API_KEY = '629699618349166';
const CLOUDINARY_API_SECRET = '-8gGXZCe-4ORvEQSPcdajA38yQQ';

// Initialize the Cloudinary client (client-side)
const cl = window.cloudinary ? new cloudinary.Cloudinary({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  secure: true
}) : null;

// Helper function to generate a unique folder name for each order
function getCloudinaryOrderFolder(orderId) {
  return `jb-creations-orders/${orderId}`;
}

// Function to upload an image to Cloudinary (client-side)
// This function uses the Upload Widget since direct uploads from browser 
// require the unsigned upload preset to be set up on Cloudinary dashboard
function uploadImageToCloudinary(imageData, orderId, itemIndex) {
  return new Promise((resolve, reject) => {
    // Create a unique public_id (filename) for the image
    const timestamp = new Date().getTime();
    const publicId = `${getCloudinaryOrderFolder(orderId)}/item${itemIndex}_${timestamp}`;
    
    // For client-side, we'll need to use a server endpoint to handle the actual upload
    // This is a placeholder for now
    fetch('/api/upload-to-cloudinary', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        image: imageData,
        publicId: publicId
      })
    })
    .then(response => response.json())
    .then(data => {
      if (data.secure_url) {
        resolve({
          url: data.secure_url,
          publicId: data.public_id
        });
      } else {
        reject(new Error('Failed to upload image to Cloudinary'));
      }
    })
    .catch(error => {
      console.error('Error uploading to Cloudinary:', error);
      reject(error);
    });
  });
}

// Function to get a Cloudinary URL from a public ID
function getCloudinaryUrl(publicId, transformation = {}) {
  if (!cl) {
    console.error('Cloudinary not initialized');
    return null;
  }
  
  return cl.url(publicId, transformation);
}

// Export the functions and configuration
window.cloudinaryConfig = {
  cloudName: CLOUDINARY_CLOUD_NAME,
  apiKey: CLOUDINARY_API_KEY,
  uploadImage: uploadImageToCloudinary,
  getUrl: getCloudinaryUrl,
  getOrderFolder: getCloudinaryOrderFolder
};