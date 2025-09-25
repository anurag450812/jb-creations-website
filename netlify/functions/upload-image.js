// Netlify Function for Cloudinary uploads
const cloudinary = require('cloudinary').v2;

// Configure Cloudinary (these would be environment variables in Netlify)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

exports.handler = async (event, context) => {
    // Enable CORS
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ error: 'Method not allowed' })
        };
    }

    try {
        const { imageData, publicId, folder } = JSON.parse(event.body);

        if (!imageData) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'No image data provided' })
            };
        }

        console.log('Uploading image to Cloudinary...');

        const uploadResult = await cloudinary.uploader.upload(imageData, {
            public_id: publicId,
            folder: folder || 'jb-creations-orders',
            resource_type: 'auto'
        });

        console.log('Upload successful:', uploadResult.secure_url);

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                secure_url: uploadResult.secure_url,
                public_id: uploadResult.public_id
            })
        };

    } catch (error) {
        console.error('Upload failed:', error);

        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                error: error.message
            })
        };
    }
};