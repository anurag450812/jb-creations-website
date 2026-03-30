/**
 * Netlify Function: Admin — Verify OTP
 * Verifies the admin OTP JWT and issues a Firebase custom token with { admin: true } claim.
 * Also returns whether a password is already set (to drive the first-time setup UI).
 * On successful OTP verification, any existing failed-password lockout is cleared.
 */

const { resolveServiceAccountConfig } = require('./utils/firebase-admin-config');
const { createSignedToken, verifySignedToken } = require('./utils/token-utils');

const JWT_SECRET = process.env.JWT_SECRET || 'jb-creations-secret-key-change-in-production';

// Firebase Admin SDK — lazy-initialized, cached across warm invocations
let adminApp = null;
let adminAuth = null;
let adminDb = null;

async function initFirebaseAdmin() {
    if (adminApp) return { auth: adminAuth, db: adminDb };

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

    adminAuth = admin.auth();
    adminDb = admin.firestore();
    return { auth: adminAuth, db: adminDb };
}

function formatPhoneNumber(phone) {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('91') && cleaned.length === 12) cleaned = cleaned.substring(2);
    if (!/^[6-9]\d{9}$/.test(cleaned)) throw new Error('Invalid phone number.');
    return cleaned;
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
        const { phoneNumber, otp, otpToken } = JSON.parse(event.body || '{}');

        if (!phoneNumber || !otp || !otpToken) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, message: 'phoneNumber, otp, and otpToken are all required.' })
            };
        }

        let formattedPhone;
        try {
            formattedPhone = formatPhoneNumber(phoneNumber);
        } catch (e) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: e.message }) };
        }

        // Verify the token that was issued by admin-send-otp
        let otpData;
        try {
            otpData = verifySignedToken(otpToken, JWT_SECRET);
        } catch (e) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, message: 'OTP has expired. Please request a new OTP.' })
            };
        }

        // Ensure the phone in the token matches
        if (otpData.phone !== formattedPhone) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, message: 'OTP was issued for a different phone number.' })
            };
        }

        // Double-check expiry
        if (Date.now() > otpData.expiresAt) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, message: 'OTP has expired. Please request a new OTP.' })
            };
        }

        // Check the OTP value itself
        if (otpData.otp !== otp.toString().trim()) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, message: 'Incorrect OTP. Please check your SMS and try again.' })
            };
        }

        // OTP is correct — initialize Firebase Admin
        const { auth, db } = await initFirebaseAdmin();

        // Issue Firebase custom token for the admin UID with { admin: true } claim
        const uid = 'admin_' + formattedPhone;
        const customToken = await auth.createCustomToken(uid, { admin: true });

        // Short-lived setup token anchored to this verified phone (for password setup)
        const setupToken = createSignedToken(
            { phone: formattedPhone, purpose: 'admin_setup' },
            JWT_SECRET,
            { expiresIn: '15m' }
        );

        // Check if this admin already has a password set
        let hasPassword = false;
        try {
            const credDoc = await db.collection('adminConfig').doc('credentials').get();
            if (credDoc.exists) {
                const phoneKey = '+91' + formattedPhone;
                const cred = (credDoc.data() || {})[phoneKey];
                if (cred && cred.passwordHash) {
                    hasPassword = true;
                    // Clear any failed-attempt lockout since OTP login succeeded
                    await db.collection('adminConfig').doc('credentials').set(
                        { [phoneKey]: { ...cred, failedAttempts: 0, otpOnly: false } },
                        { merge: true }
                    );
                }
            }
        } catch (e) {
            // Non-fatal — just report hasPassword as false
            console.warn('admin-verify-otp: could not check credentials:', e.message);
        }

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, customToken, hasPassword, setupToken })
        };

    } catch (error) {
        console.error('admin-verify-otp error:', error.message);
        return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Verification failed. Please try again.' }) };
    }
};
