// cloudinary-config.js
// Client-side Cloudinary helpers. Secrets must never be exposed here.

const CLOUDINARY_CLOUD_NAME = 'dfhxnpp9m';

function resolveCloudinaryApiBase() {
  const hostname = window.location.hostname;
  const isLocalHost = hostname === 'localhost' || hostname === '127.0.0.1';

  if (window.otpClient && window.otpClient.apiBaseURL) {
    return window.otpClient.apiBaseURL.replace(/\/$/, '');
  }

  if (isLocalHost) {
    return 'https://jbcreationss.netlify.app/.netlify/functions';
  }

  return `${window.location.origin}/api`;
}

function getCloudinaryApiUrl(path) {
  return `${resolveCloudinaryApiBase()}/${path}`;
}

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
    
    fetch(getCloudinaryApiUrl('create-upload-permit'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        orderNumber: orderId
      })
    })
    .then(response => response.json())
    .then(data => {
      if (!data.success || !data.uploadPermit) {
        throw new Error(data.error || 'Failed to create upload permit');
      }

      return fetch(getCloudinaryApiUrl('upload-image'), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          imageData: imageData,
          publicId: publicId,
          uploadPermit: data.uploadPermit
        })
      });
    })
    .then(response => response.json())
    .then(data => {
      if (!data.success || !data.secure_url) {
        reject(new Error(data.error || 'Failed to upload image to Cloudinary'));
        return;
      }

      resolve({
        url: data.secure_url,
        publicId: data.public_id
      });
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
  uploadImage: uploadImageToCloudinary,
  getUrl: getCloudinaryUrl,
  getOrderFolder: getCloudinaryOrderFolder
};