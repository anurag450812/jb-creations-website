const { createSignedToken, verifySignedToken } = require('./token-utils');
const { MAX_IMAGE_BYTES } = require('./upload-validation');

const UPLOAD_PERMIT_PURPOSE = 'checkout_cloudinary_upload';
const UPLOAD_PERMIT_TTL = '10m';

function getUploadPermitSecret() {
    const secret = process.env.UPLOAD_PERMIT_SECRET || process.env.JWT_SECRET;
    if (!secret) {
        const error = new Error('UPLOAD_PERMIT_SECRET or JWT_SECRET must be configured.');
        error.statusCode = 500;
        throw error;
    }

    return secret;
}

function normalizeOrderNumber(orderNumber) {
    if (typeof orderNumber !== 'string' || !orderNumber.trim()) {
        const error = new Error('orderNumber is required.');
        error.statusCode = 400;
        throw error;
    }

    const normalized = orderNumber.trim();
    if (!/^JB[A-Za-z0-9_-]{6,64}$/.test(normalized)) {
        const error = new Error('orderNumber format is invalid.');
        error.statusCode = 400;
        throw error;
    }

    return normalized;
}

function getFolderPrefix(orderNumber) {
    return `jb-creations-orders/${normalizeOrderNumber(orderNumber)}`;
}

function createCheckoutUploadPermit({ orderNumber, origin, maxBytes = MAX_IMAGE_BYTES }) {
    const normalizedOrderNumber = normalizeOrderNumber(orderNumber);
    const folderPrefix = getFolderPrefix(normalizedOrderNumber);
    const secret = getUploadPermitSecret();

    return {
        permit: createSignedToken({
            purpose: UPLOAD_PERMIT_PURPOSE,
            orderNumber: normalizedOrderNumber,
            folderPrefix,
            origin: origin || null,
            maxBytes
        }, secret, { expiresIn: UPLOAD_PERMIT_TTL }),
        folderPrefix,
        maxBytes
    };
}

function verifyCheckoutUploadPermit(token, options = {}) {
    const secret = getUploadPermitSecret();
    const payload = verifySignedToken(token, secret);

    if (payload.purpose !== UPLOAD_PERMIT_PURPOSE) {
        const error = new Error('Upload permit purpose is invalid.');
        error.statusCode = 403;
        throw error;
    }

    const normalizedOrderNumber = normalizeOrderNumber(payload.orderNumber);
    const folderPrefix = getFolderPrefix(normalizedOrderNumber);
    if (payload.folderPrefix !== folderPrefix) {
        const error = new Error('Upload permit folder scope is invalid.');
        error.statusCode = 403;
        throw error;
    }

    if (payload.origin && options.origin && payload.origin !== options.origin) {
        const error = new Error('Upload permit origin does not match this request.');
        error.statusCode = 403;
        throw error;
    }

    if (options.byteLength && payload.maxBytes && options.byteLength > payload.maxBytes) {
        const error = new Error('Image exceeds the permitted upload size.');
        error.statusCode = 413;
        throw error;
    }

    return {
        ...payload,
        orderNumber: normalizedOrderNumber,
        folderPrefix
    };
}

module.exports = {
    MAX_IMAGE_BYTES,
    UPLOAD_PERMIT_TTL,
    createCheckoutUploadPermit,
    getFolderPrefix,
    normalizeOrderNumber,
    verifyCheckoutUploadPermit
};