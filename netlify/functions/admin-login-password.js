/**
 * Netlify Function: Admin — Login with Password
 * Validates the admin password and issues a Firebase custom token with { admin: true } claim.
 * Tracks failed attempts per phone. After 10 failures, sets otpOnly=true —
 * only OTP login is accepted until the admin logs in via OTP (which resets the lockout).
 */

const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'jb-creations-secret-key-change-in-production';
const MAX_FAILED_ATTEMPTS = 10;
const BOOTSTRAP_ADMIN = '8269909774';

// Firebase Admin SDK — lazy-initialized, cached across warm invocations
let adminApp = null;
let adminAuth = null;
let adminDb = null;

async function initFirebaseAdmin() {
    if (adminApp) return { auth: adminAuth, db: adminDb };

    const serviceAccountJson = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!serviceAccountJson) throw new Error('FIREBASE_SERVICE_ACCOUNT environment variable is not set.');

    const admin = require('firebase-admin');
    const serviceAccount = JSON.parse(serviceAccountJson);

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
    if (!/^[6-9]\d{9}$/.test(cleaned)) throw new Error('Invalid Indian mobile number.');
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
        const { phoneNumber, password } = JSON.parse(event.body || '{}');

        if (!phoneNumber || !password) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, message: 'Phone number and password are required.' })
            };
        }

        let formattedPhone;
        try {
            formattedPhone = formatPhoneNumber(phoneNumber);
        } catch (e) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: e.message }) };
        }

        // Verify phone is in the allowed admin list
        const allowedPhones = [BOOTSTRAP_ADMIN];
        const envExtra = (process.env.ADMIN_PHONES || '')
            .split(',')
            .map(p => p.replace(/\D/g, '').replace(/^91/, '').trim())
            .filter(Boolean);
        allowedPhones.push(...envExtra);

        if (!allowedPhones.includes(formattedPhone)) {
            return { statusCode: 403, headers, body: JSON.stringify({ success: false, message: 'Access denied.' }) };
        }

        const { auth, db } = await initFirebaseAdmin();
        const phoneKey = '+91' + formattedPhone;

        // Fetch stored credential
        const credDoc = await db.collection('adminConfig').doc('credentials').get();
        if (!credDoc.exists) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, message: 'No password set for this account. Please sign in with OTP first.' })
            };
        }

        const cred = (credDoc.data() || {})[phoneKey];
        if (!cred || !cred.passwordHash) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, message: 'No password set for this number. Please sign in with OTP first.' })
            };
        }

        // Check lockout
        if (cred.otpOnly) {
            return {
                statusCode: 403,
                headers,
                body: JSON.stringify({
                    success: false,
                    otpOnly: true,
                    message: 'Password login is locked after too many failed attempts. Please use OTP to sign in — this will reset the lockout.'
                })
            };
        }

        // Compare password
        const isMatch = await bcrypt.compare(password, cred.passwordHash);

        if (!isMatch) {
            const newAttempts = (cred.failedAttempts || 0) + 1;
            const nowLocked = newAttempts >= MAX_FAILED_ATTEMPTS;

            await db.collection('adminConfig').doc('credentials').set(
                { [phoneKey]: { ...cred, failedAttempts: newAttempts, otpOnly: nowLocked } },
                { merge: true }
            );

            if (nowLocked) {
                return {
                    statusCode: 403,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        otpOnly: true,
                        message: 'Too many failed attempts. Password login is now locked. Please use OTP to sign in.'
                    })
                };
            }

            const remaining = MAX_FAILED_ATTEMPTS - newAttempts;
            return {
                statusCode: 401,
                headers,
                body: JSON.stringify({
                    success: false,
                    message: `Incorrect password. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining before lockout.`
                })
            };
        }

        // Password correct — reset failed attempts and issue custom token
        await db.collection('adminConfig').doc('credentials').set(
            { [phoneKey]: { ...cred, failedAttempts: 0, otpOnly: false } },
            { merge: true }
        );

        const uid = 'admin_' + formattedPhone;
        const customToken = await auth.createCustomToken(uid, { admin: true });

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({ success: true, customToken })
        };

    } catch (error) {
        console.error('admin-login-password error:', error.message);
        return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Login failed. Please try again.' }) };
    }
};
