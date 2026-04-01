// upload-api.js
// This file contains the API endpoint for handling image uploads to Cloudinary

const express = require('express');
const router = express.Router();
const cloudinaryService = require('../services/cloudinary-service');
const { getAllowedOrigins } = require('../netlify/functions/utils/http');
const { verifyCheckoutUploadPermit } = require('../netlify/functions/utils/upload-permit');
const { normalizeBase64Image, validateCloudinaryPublicId } = require('../netlify/functions/utils/upload-validation');

const allowedOrigins = new Set(getAllowedOrigins());

function validateOrigin(req, res) {
  const origin = req.headers.origin;
  if (origin && !allowedOrigins.has(origin)) {
    res.status(403).json({ success: false, error: 'Origin not allowed' });
    return null;
  }

  return origin || null;
}

// Endpoint for uploading an image to Cloudinary
router.post('/upload-to-cloudinary', async (req, res) => {
  try {
    const origin = validateOrigin(req, res);
    if (origin === null && req.headers.origin) {
      return;
    }

    const { image, imageData, publicId, uploadPermit } = req.body;
    const normalizedImage = normalizeBase64Image(imageData || image, imageData ? 'imageData' : 'image');
    const permit = verifyCheckoutUploadPermit(uploadPermit, {
      origin,
      byteLength: normalizedImage.byteLength
    });
    const normalizedPublicId = validateCloudinaryPublicId(publicId, permit.folderPrefix);

    // Upload the image
    const result = await cloudinaryService.uploadBase64Image(
      `data:${normalizedImage.mimeType};base64,${normalizedImage.base64Payload}`,
      normalizedPublicId
    );
    
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
    res.status(error.statusCode || 500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;