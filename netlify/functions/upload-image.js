const { getCloudinaryClient } = require('./utils/cloudinary-client');
const { emptyResponse, enforceAllowedOrigin, getAllowedOrigins, getRequestOrigin, jsonResponse, parseJsonBody } = require('./utils/http');
const { normalizeBase64Image, validateCloudinaryPublicId } = require('./utils/upload-validation');
const { verifyCheckoutUploadPermit } = require('./utils/upload-permit');

function createOriginOptions() {
    return {
        allowedOrigins: getAllowedOrigins(),
        allowHeaders: ['Content-Type'],
        allowMethods: ['POST', 'OPTIONS']
    };
}

exports.handler = async (event) => {
    const origin = getRequestOrigin(event);
    const originOptions = createOriginOptions();

    if (event.httpMethod === 'OPTIONS') {
        return emptyResponse(200, origin, originOptions);
    }

    if (event.httpMethod !== 'POST') {
        return jsonResponse(405, origin, { success: false, error: 'Method not allowed' }, originOptions);
    }

    try {
        enforceAllowedOrigin(event, originOptions);
        const { imageData, image, publicId, uploadPermit } = parseJsonBody(event);
        const normalizedImage = normalizeBase64Image(imageData || image, imageData ? 'imageData' : 'image');
        const permit = verifyCheckoutUploadPermit(uploadPermit, {
            origin,
            byteLength: normalizedImage.byteLength
        });
        const normalizedPublicId = validateCloudinaryPublicId(publicId, permit.folderPrefix);

        const uploadResult = await getCloudinaryClient().uploader.upload(
            `data:${normalizedImage.mimeType};base64,${normalizedImage.base64Payload}`,
            {
                public_id: normalizedPublicId,
                resource_type: 'image',
                overwrite: true,
                folder: undefined
            }
        );

        return jsonResponse(200, origin, {
            success: true,
            secure_url: uploadResult.secure_url,
            public_id: uploadResult.public_id,
            bytes: uploadResult.bytes,
            width: uploadResult.width,
            height: uploadResult.height
        }, originOptions);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        console.error('upload-image error:', error);
        return jsonResponse(statusCode, origin, {
            success: false,
            error: error.message || 'Image upload failed.'
        }, originOptions);
    }
};