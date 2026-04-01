const { v2: cloudinary } = require('cloudinary');

let configured = false;

function getRequiredCloudinaryConfig() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    const missing = [
        ['CLOUDINARY_CLOUD_NAME', cloudName],
        ['CLOUDINARY_API_KEY', apiKey],
        ['CLOUDINARY_API_SECRET', apiSecret]
    ].filter(([, value]) => !value).map(([name]) => name);

    if (missing.length > 0) {
        const error = new Error(`Missing required Cloudinary environment variables: ${missing.join(', ')}`);
        error.statusCode = 500;
        throw error;
    }

    return {
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret
    };
}

function getCloudinaryClient() {
    if (!configured) {
        cloudinary.config(getRequiredCloudinaryConfig());
        configured = true;
    }

    return cloudinary;
}

module.exports = {
    getCloudinaryClient,
    getRequiredCloudinaryConfig
};