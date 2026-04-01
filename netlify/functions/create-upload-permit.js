const { emptyResponse, enforceAllowedOrigin, getAllowedOrigins, getRequestOrigin, jsonResponse, parseJsonBody } = require('./utils/http');
const { createCheckoutUploadPermit, normalizeOrderNumber } = require('./utils/upload-permit');

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
        const body = parseJsonBody(event);
        const orderNumber = normalizeOrderNumber(body.orderNumber);
        const permit = createCheckoutUploadPermit({
            orderNumber,
            origin,
            imageType: body.imageType,
            maxBytes: body.maxBytes
        });

        return jsonResponse(200, origin, {
            success: true,
            uploadPermit: permit.permit,
            folderPrefix: permit.folderPrefix,
            maxBytes: permit.maxBytes,
            orderNumber
        }, originOptions);
    } catch (error) {
        const statusCode = error.statusCode || 500;
        console.error('create-upload-permit error:', error);
        return jsonResponse(statusCode, origin, {
            success: false,
            error: error.message || 'Unable to create upload permit.'
        }, originOptions);
    }
};