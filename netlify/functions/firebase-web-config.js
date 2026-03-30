const axios = require('axios');
const { GoogleAuth } = require('google-auth-library');
const { resolveServiceAccountConfig } = require('./utils/firebase-admin-config');

let cachedConfig = null;

async function getAccessToken(serviceAccount) {
    const auth = new GoogleAuth({
        credentials: serviceAccount,
        scopes: [
            'https://www.googleapis.com/auth/firebase',
            'https://www.googleapis.com/auth/cloud-platform.read-only'
        ]
    });

    const client = await auth.getClient();
    const tokenResponse = await client.getAccessToken();
    return typeof tokenResponse === 'string' ? tokenResponse : tokenResponse && tokenResponse.token;
}

async function fetchFirebaseWebConfig() {
    if (cachedConfig) {
        return cachedConfig;
    }

    const { serviceAccount } = resolveServiceAccountConfig();
    if (!serviceAccount || !serviceAccount.project_id) {
        throw new Error('Firebase Admin credentials are not configured.');
    }

    const accessToken = await getAccessToken(serviceAccount);
    if (!accessToken) {
        throw new Error('Could not obtain a Google access token for Firebase Management.');
    }

    const headers = {
        Authorization: `Bearer ${accessToken}`
    };

    const projectId = serviceAccount.project_id;
    const appsResponse = await axios.get(
        `https://firebase.googleapis.com/v1beta1/projects/${projectId}/webApps`,
        { headers, timeout: 10000 }
    );

    const apps = (appsResponse.data && appsResponse.data.apps) || [];
    if (!apps.length) {
        throw new Error(`No Firebase web apps found for project ${projectId}.`);
    }

    const selectedApp = apps.find(app => app.appId) || apps[0];
    const configResponse = await axios.get(
        `https://firebase.googleapis.com/v1beta1/${selectedApp.name}/config`,
        { headers, timeout: 10000 }
    );

    const config = configResponse.data || {};
    cachedConfig = {
        apiKey: config.apiKey,
        appId: config.appId,
        authDomain: config.authDomain,
        projectId,
        storageBucket: config.storageBucket,
        messagingSenderId: config.messagingSenderId,
        measurementId: config.measurementId || null
    };

    return cachedConfig;
}

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

    try {
        const config = await fetchFirebaseWebConfig();
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, config })
        };
    } catch (error) {
        console.error('firebase-web-config error:', error.message);
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: error.message })
        };
    }
};