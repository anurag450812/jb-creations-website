const { getFirebaseAdminConfigStatus } = require('./utils/firebase-admin-config');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'GET') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, message: 'Method not allowed' })
        };
    }

    const firebaseAdmin = getFirebaseAdminConfigStatus();
    const smsConfigured = !!(
        process.env.FAST2SMS_API_KEY &&
        process.env.FAST2SMS_API_KEY !== 'YOUR_FAST2SMS_API_KEY'
    );

    return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
            success: true,
            firebaseAdminConfigured: firebaseAdmin.configured,
            firebaseCredentialSource: firebaseAdmin.credentialSource,
            firebaseAdminProjectId: firebaseAdmin.projectId,
            smsConfigured,
            localAdminLoginReady: firebaseAdmin.configured,
            recommendedCredentialFile: firebaseAdmin.recommendedFileName,
            message: firebaseAdmin.configured
                ? 'Admin auth functions are ready.'
                : 'Admin auth needs Firebase Admin credentials. Set FIREBASE_SERVICE_ACCOUNT or add firebase-service-account.json in the project root.'
        })
    };
};