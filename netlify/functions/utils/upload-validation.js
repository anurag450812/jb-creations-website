const MAX_IMAGE_BYTES = Number(process.env.MAX_UPLOAD_IMAGE_BYTES || (12 * 1024 * 1024));
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function normalizeBase64Image(imageData, fieldName = 'imageData') {
    if (typeof imageData !== 'string' || !imageData.trim()) {
        const error = new Error(`${fieldName} is required.`);
        error.statusCode = 400;
        throw error;
    }

    const match = imageData.trim().match(/^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/i);
    if (!match) {
        const error = new Error('Image data must be a JPEG, PNG, or WebP base64 data URL.');
        error.statusCode = 400;
        throw error;
    }

    const mimeType = match[1].toLowerCase() === 'image/jpg' ? 'image/jpeg' : match[1].toLowerCase();
    if (!ALLOWED_MIME_TYPES.has(mimeType)) {
        const error = new Error('Unsupported image type.');
        error.statusCode = 400;
        throw error;
    }

    const base64Payload = match[2].replace(/\s+/g, '');
    const byteLength = Buffer.from(base64Payload, 'base64').length;
    if (!byteLength || byteLength > MAX_IMAGE_BYTES) {
        const error = new Error(`Image exceeds the ${Math.round(MAX_IMAGE_BYTES / (1024 * 1024))} MB upload limit.`);
        error.statusCode = 413;
        throw error;
    }

    return { mimeType, byteLength, base64Payload };
}

function validateCloudinaryPublicId(publicId, folderPrefix) {
    if (typeof publicId !== 'string' || !publicId.trim()) {
        const error = new Error('publicId is required.');
        error.statusCode = 400;
        throw error;
    }

    const normalized = publicId.trim();
    if (!normalized.startsWith(`${folderPrefix}/`)) {
        const error = new Error('publicId is outside the permitted upload folder.');
        error.statusCode = 403;
        throw error;
    }

    const suffix = normalized.slice(folderPrefix.length + 1);
    if (!/^item\d+_\d+$/.test(suffix)) {
        const error = new Error('publicId must follow the expected item naming pattern.');
        error.statusCode = 400;
        throw error;
    }

    return normalized;
}

module.exports = {
    MAX_IMAGE_BYTES,
    normalizeBase64Image,
    validateCloudinaryPublicId
};