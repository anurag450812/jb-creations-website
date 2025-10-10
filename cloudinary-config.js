// cloudinary-config.js
// OPTIMIZED Cloudinary configuration with performance improvements

// Replace these with your actual Cloudinary credentials
const CLOUDINARY_CLOUD_NAME = 'dfhxnpp9m';
const CLOUDINARY_API_KEY = '629699618349166';
const CLOUDINARY_API_SECRET = '-8gGXZCe-4ORvEQSPcdajA38yQQ';

// Performance optimized Cloudinary client initialization
const cl = window.cloudinary ? new cloudinary.Cloudinary({
  cloud_name: CLOUDINARY_CLOUD_NAME,
  secure: true,
  // Add performance settings
  use_cache: true,
  secure_cdn_subdomain: true
}) : null;

// Helper function to generate a unique folder name for each order
function getCloudinaryOrderFolder(orderId) {
  return `jb-creations-orders/${orderId}`;
}

// OPTIMIZED: Create image transformations for different use cases
const IMAGE_TRANSFORMATIONS = {
  thumbnail: {
    width: 200,
    height: 200,
    crop: 'fill',
    quality: 'auto:low',
    format: 'auto'
  },
  preview: {
    width: 800,
    height: 600,
    crop: 'limit',
    quality: 'auto:good',
    format: 'auto'
  },
  fullsize: {
    width: 1920,
    height: 1440,
    crop: 'limit',
    quality: 'auto:best',
    format: 'auto'
  }
};

// OPTIMIZED: Function to upload an image to Cloudinary with retry logic
function uploadImageToCloudinary(imageData, orderId, itemIndex, maxRetries = 3) {
  return new Promise((resolve, reject) => {
    const timestamp = new Date().getTime();
    const publicId = `${getCloudinaryOrderFolder(orderId)}/item${itemIndex}_${timestamp}`;
    
    // Retry function for failed uploads
    async function attemptUpload(retryCount = 0) {
      try {
        const response = await fetch('/api/upload-to-cloudinary', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            image: imageData,
            publicId: publicId,
            // Add optimization parameters
            transformations: IMAGE_TRANSFORMATIONS.preview
          })
        });

        if (!response.ok) {
          throw new Error(`Upload failed with status: ${response.status}`);
        }

        const data = await response.json();
        
        if (data.secure_url) {
          resolve({
            url: data.secure_url,
            publicId: data.public_id,
            thumbnailUrl: getOptimizedUrl(data.public_id, 'thumbnail'),
            previewUrl: getOptimizedUrl(data.public_id, 'preview')
          });
        } else {
          throw new Error('Invalid response from Cloudinary');
        }
      } catch (error) {
        console.error(`Upload attempt ${retryCount + 1} failed:`, error);
        
        if (retryCount < maxRetries) {
          // Exponential backoff: wait 1s, 2s, 4s between retries
          const delay = Math.pow(2, retryCount) * 1000;
          setTimeout(() => attemptUpload(retryCount + 1), delay);
        } else {
          reject(new Error(`Failed to upload after ${maxRetries} attempts: ${error.message}`));
        }
      }
    }
    
    attemptUpload();
  });
}

// OPTIMIZED: Function to get optimized Cloudinary URLs
function getOptimizedUrl(publicId, type = 'preview') {
  if (!cl || !publicId) {
    console.error('Cloudinary not initialized or invalid publicId');
    return null;
  }
  
  const transformation = IMAGE_TRANSFORMATIONS[type] || IMAGE_TRANSFORMATIONS.preview;
  return cl.url(publicId, transformation);
}

// OPTIMIZED: Function to preload critical images
function preloadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load image: ${url}`));
    img.src = url;
  });
}

// OPTIMIZED: Batch upload function for multiple images
function batchUploadImages(imageDataArray, orderId) {
  const uploadPromises = imageDataArray.map((imageData, index) => 
    uploadImageToCloudinary(imageData, orderId, index)
  );
  
  return Promise.allSettled(uploadPromises).then(results => {
    const successful = results.filter(result => result.status === 'fulfilled');
    const failed = results.filter(result => result.status === 'rejected');
    
    if (failed.length > 0) {
      console.warn(`${failed.length} uploads failed:`, failed);
    }
    
    return successful.map(result => result.value);
  });
}

// Export the optimized functions and configuration
window.cloudinaryConfig = {
  cloudName: CLOUDINARY_CLOUD_NAME,
  apiKey: CLOUDINARY_API_KEY,
  uploadImage: uploadImageToCloudinary,
  batchUpload: batchUploadImages,
  getUrl: getOptimizedUrl,
  getOrderFolder: getCloudinaryOrderFolder,
  preloadImage: preloadImage,
  transformations: IMAGE_TRANSFORMATIONS
};