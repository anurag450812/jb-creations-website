const { resolveServiceAccountConfig } = require('./firebase-admin-config');

let adminModule = null;
let adminApp = null;
let adminAuth = null;
let adminDb = null;

async function initFirebaseAdmin() {
    if (adminApp && adminAuth && adminDb && adminModule) {
        return { admin: adminModule, app: adminApp, auth: adminAuth, db: adminDb };
    }

    const admin = require('firebase-admin');
    const { serviceAccount } = resolveServiceAccountConfig();
    if (!serviceAccount) {
        const error = new Error('Firebase Admin credentials are not configured. Set FIREBASE_SERVICE_ACCOUNT or add firebase-service-account.json in the project root.');
        error.statusCode = 500;
        throw error;
    }

    if (!admin.apps.length) {
        adminApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else {
        adminApp = admin.app();
    }

    adminModule = admin;
    adminAuth = admin.auth();
    adminDb = admin.firestore();

    return { admin: adminModule, app: adminApp, auth: adminAuth, db: adminDb };
}

module.exports = {
    initFirebaseAdmin
};