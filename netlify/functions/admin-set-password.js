/**
 * Netlify Function: Admin — Set Password
 * Called after first-time OTP verification to store a bcrypt-hashed password.
 * Requires a valid setupToken issued by admin-verify-otp (proves OTP was verified).
 * Password rules: minimum 8 characters, must contain at least one letter and one digit.
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'jb-creations-secret-key-change-in-production';
const SALT_ROUNDS = 12;

// Firebase Admin SDK — lazy-initialized, cached across warm invocations
let adminApp = null;
let adminDb = null;

async function initFirebaseAdmin() {
    if (adminDb) return adminDb;

    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set.');

    const admin = require('firebase-admin');
    const serviceAccount = JSON.parse(serviceAccountJson);

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
            setupData = jwt.verify(setupToken, JWT_SECRET);
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

        // Hash the password (bcrypt — one-way, cannot be reversed)
        const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

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
