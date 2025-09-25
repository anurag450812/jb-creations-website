// upload-api.js
// This file contains the API endpoint for handling image uploads to Cloudinary

const express = require('express');
const router = express.Router();
const cloudinaryService = require('../services/cloudinary-service');

// Endpoint for uploading an image to Cloudinary
router.post('/upload-to-cloudinary', async (req, res) => {
  try {
    const { image, publicId } = req.body;
    
    if (!image || !publicId) {
      return res.status(400).json({ 
        success: false, 
        error: 'Image data and publicId are required' 
      });
    }
    
    // Upload the image
    const result = await cloudinaryService.uploadBase64Image(image, publicId);
    
    if (result.success) {
      res.json({
        success: true,
        secure_url: result.url,
        public_id: result.publicId
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.error
      });
    }
  } catch (error) {
    console.error('Error in upload endpoint:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;