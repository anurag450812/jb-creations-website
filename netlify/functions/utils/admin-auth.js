const { initFirebaseAdmin } = require('./firebase-admin');

function extractBearerToken(authHeader) {
    if (!authHeader || typeof authHeader !== 'string') {
        const error = new Error('Authorization header is required.');
        error.statusCode = 401;
        throw error;
    }

    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match || !match[1]) {
        const error = new Error('Authorization header must be a Bearer token.');
        error.statusCode = 401;
        throw error;
    }

    return match[1].trim();
}

async function requireAdminUser(event) {
    const authHeader = event?.headers?.authorization || event?.headers?.Authorization;
    const idToken = extractBearerToken(authHeader);
    const { auth } = await initFirebaseAdmin();
    const decodedToken = await auth.verifyIdToken(idToken);

    if (decodedToken.admin !== true) {
        const error = new Error('Admin privileges are required.');
        error.statusCode = 403;
        throw error;
    }

    return decodedToken;
}

module.exports = {
    requireAdminUser
};