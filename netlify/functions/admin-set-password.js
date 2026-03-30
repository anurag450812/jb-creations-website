/**
 * Netlify Function: Admin — Set Password
 * Called after first-time OTP verification to store a one-way hashed password.
 * Requires a valid setupToken issued by admin-verify-otp (proves OTP was verified).
 * Password rules: minimum 8 characters, must contain at least one letter and one digit.
 */

const { resolveServiceAccountConfig } = require('./utils/firebase-admin-config');
const { verifySignedToken } = require('./utils/token-utils');
const { hashPassword } = require('./utils/password-utils');

const JWT_SECRET = process.env.JWT_SECRET || 'jb-creations-secret-key-change-in-production';

// Firebase Admin SDK — lazy-initialized, cached across warm invocations
let adminApp = null;
let adminDb = null;

async function initFirebaseAdmin() {
    if (adminDb) return adminDb;

    const admin = require('firebase-admin');
    const { serviceAccount } = resolveServiceAccountConfig();
    if (!serviceAccount) {
        throw new Error('Firebase Admin credentials are not configured. Set FIREBASE_SERVICE_ACCOUNT or add firebase-service-account.json in the project root.');
    }

    if (!admin.apps.length) {
        adminApp = admin.initializeApp({ credential: admin.credential.cert(serviceAccount) });
    } else {
        adminApp = admin.app();
    }

    adminDb = admin.firestore();
    return adminDb;
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' };
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Method not allowed' }) };
    }

    try {
        const { setupToken, password } = JSON.parse(event.body || '{}');

        if (!setupToken || !password) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, message: 'setupToken and password are required.' })
            };
        }

        // Validate password strength before anything else
        if (password.length < 8) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, message: 'Password must be at least 8 characters long.' })
            };
        }
        if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, message: 'Password must contain at least one letter and one number.' })
            };
        }

        // Verify the setupToken to confirm OTP was verified
        let setupData;
        try {
            setupData = verifySignedToken(setupToken, JWT_SECRET);
        } catch (e) {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ success: false, message: 'Setup session has expired. Please verify your OTP again.' })
            };
        }

        if (setupData.purpose !== 'admin_setup') {
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({ success: false, message: 'Invalid setup token.' })
            };
        }

        const formattedPhone = setupData.phone;
        const phoneKey = '+91' + formattedPhone;

        // Hash the password using a local-friendly one-way scheme.
        const passwordHash = await hashPassword(password);

        const db = await initFirebaseAdmin();

        await db.collection('adminConfig').doc('credentials').set(
            {
                [phoneKey]: {
                    passwordHash,
                    failedAttempts: 0,
                    otpOnly: false,
                    updatedAt: new Date().toISOString()
                }
            },
            { merge: true }
        );

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, message: 'Password set successfully.' })
        };

    } catch (error) {
        console.error('admin-set-password error:', error.message);
        return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Failed to set password. Please try again.' }) };
    }
};
