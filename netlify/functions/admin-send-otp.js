/**
 * Netlify Function: Admin — Send OTP
 * Sends an OTP exclusively to whitelisted admin phone numbers.
 * The bootstrap admin (8269909774) is always allowed.
 * Additional numbers can be added via the ADMIN_PHONES env var (comma-separated).
 */

const axios = require('axios');
const { createSignedToken } = require('./utils/token-utils');

const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;
const FAST2SMS_TEMPLATE_ID = process.env.FAST2SMS_TEMPLATE_ID;
const FAST2SMS_SENDER_ID = process.env.FAST2SMS_SENDER_ID || 'JBCREA';
const JWT_SECRET = process.env.JWT_SECRET || 'jb-creations-secret-key-change-in-production';
const OTP_EXPIRY_MINUTES = 5;

// Bootstrap admin — hardcoded as the primary allowed number
const BOOTSTRAP_ADMIN = '8269909774';

// In-memory rate limiting (resets on function cold-start)
const rateLimitStore = new Map();

function formatPhoneNumber(phone) {
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.startsWith('91') && cleaned.length === 12) {
        cleaned = cleaned.substring(2);
    }
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
        throw new Error('Invalid Indian mobile number. Must be 10 digits starting with 6-9.');
    }
    return cleaned;
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function getRequestHost(event) {
    const headers = event.headers || {};
    return String(headers['x-forwarded-host'] || headers.host || '').toLowerCase();
}

function isLocalAdminDevelopment(event) {
    const host = getRequestHost(event);
    return process.env.NETLIFY_DEV === 'true'
        || host.startsWith('localhost:')
        || host.startsWith('127.0.0.1:');
}

async function sendOTPViaSMS(phone, otp) {
    const response = await axios.post('https://www.fast2sms.com/dev/bulkV2', {
        route: 'dlt',
        sender_id: FAST2SMS_SENDER_ID,
        message: FAST2SMS_TEMPLATE_ID,
        variables_values: otp,
        numbers: phone
    }, {
        headers: {
            'authorization': FAST2SMS_API_KEY,
            'Content-Type': 'application/json'
        },
        timeout: 10000
    });
    return response.data.return === true;
}

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, headers, body: JSON.stringify({ success: false, message: 'Method not allowed' }) };
    }

    try {
        const { phoneNumber } = JSON.parse(event.body || '{}');
        const isLocalDevelopment = isLocalAdminDevelopment(event);

        if (!phoneNumber) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: 'Phone number is required.' }) };
        }

        let formattedPhone;
        try {
            formattedPhone = formatPhoneNumber(phoneNumber);
        } catch (e) {
            return { statusCode: 400, headers, body: JSON.stringify({ success: false, message: e.message }) };
        }

        // Build allowed admin phone list
        const allowedPhones = [BOOTSTRAP_ADMIN];
        const envExtra = (process.env.ADMIN_PHONES || '')
            .split(',')
            .map(p => p.replace(/\D/g, '').replace(/^91/, '').trim())
            .filter(Boolean);
        allowedPhones.push(...envExtra);

        if (!allowedPhones.includes(formattedPhone)) {
            // Return generic 403 without revealing why, to prevent enumeration
            return { statusCode: 403, headers, body: JSON.stringify({ success: false, message: 'Access denied. This number is not authorized for admin access.' }) };
        }

        // Rate limiting: 60-second cooldown per phone outside local dev
        const rateLimitKey = 'admin_otp_' + formattedPhone;
        if (!isLocalDevelopment) {
            const lastSent = rateLimitStore.get(rateLimitKey);
            if (lastSent && Date.now() - lastSent < 60000) {
                const remaining = Math.ceil((60000 - (Date.now() - lastSent)) / 1000);
                return {
                    statusCode: 429,
                    headers,
                    body: JSON.stringify({
                        success: false,
                        message: `Please wait ${remaining} second${remaining === 1 ? '' : 's'} before requesting another OTP.`,
                        remainingTime: remaining
                    })
                };
            }
        }

        const otp = generateOTP();
        const expiresAt = Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000;

        // Sign OTP into a token so no server-side storage is needed
        const otpToken = createSignedToken(
            { phone: formattedPhone, otp, expiresAt },
            JWT_SECRET,
            { expiresIn: OTP_EXPIRY_MINUTES * 60 }
        );

        // Localhost testing should not depend on the external SMS provider.
        if (isLocalDevelopment || !FAST2SMS_API_KEY || FAST2SMS_API_KEY === 'YOUR_FAST2SMS_API_KEY') {
            console.warn('⚠️ Admin OTP local/demo mode active. OTP:', otp);
            if (!isLocalDevelopment) {
                rateLimitStore.set(rateLimitKey, Date.now());
            }
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: isLocalDevelopment
                        ? 'Local test OTP generated. Use the code shown in the admin login page.'
                        : 'OTP sent successfully (demo mode — check server logs).',
                    otpToken,
                    expiresIn: OTP_EXPIRY_MINUTES * 60,
                    demo: true,
                    debugOtp: isLocalDevelopment ? otp : undefined,
                    localDebug: isLocalDevelopment
                })
            };
        }

        await sendOTPViaSMS(formattedPhone, otp);
        rateLimitStore.set(rateLimitKey, Date.now());

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'OTP sent to your registered number.',
                otpToken,
                expiresIn: OTP_EXPIRY_MINUTES * 60
            })
        };

    } catch (error) {
        console.error('admin-send-otp error:', error.message);
        return { statusCode: 500, headers, body: JSON.stringify({ success: false, message: 'Failed to send OTP. Please try again.' }) };
    }
};
