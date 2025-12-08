/**
 * Netlify Function: Send OTP via Fast2SMS
 * Production-ready serverless OTP sender with JWT-based OTP storage
 */

const axios = require('axios');
const jwt = require('jsonwebtoken');

// Configuration
const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;
const FAST2SMS_TEMPLATE_ID = process.env.FAST2SMS_TEMPLATE_ID;
const FAST2SMS_SENDER_ID = process.env.FAST2SMS_SENDER_ID || 'JBCREA';
const JWT_SECRET = process.env.JWT_SECRET || 'jb-creations-secret-key-change-in-production';
const OTP_EXPIRY_MINUTES = 5;

// In-memory store for rate limiting only
const rateLimitStore = new Map();

/**
 * Generate random OTP
 */
function generateOTP(length = 6) {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Format phone number
 */
function formatPhoneNumber(phone) {
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('91') && cleaned.length === 12) {
        cleaned = cleaned.substring(2);
    }
    
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
        throw new Error('Invalid Indian mobile number');
    }
    
    return cleaned;
}

/**
 * Send OTP via Fast2SMS
 */
async function sendOTPViaSMS(phone, otp) {
    try {
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
            }
        });

        return response.data.return === true;
    } catch (error) {
        console.error('Fast2SMS Error:', error.response?.data || error.message);
        throw error;
    }
}

/**
 * Main handler
 */
exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Max-Age': '86400'
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, message: 'Method not allowed' })
        };
    }

    try {
        const { phoneNumber } = JSON.parse(event.body);

        // Validate phone number
        if (!phoneNumber) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, message: 'Phone number is required' })
            };
        }

        const formattedPhone = formatPhoneNumber(phoneNumber);

        // Check rate limiting (prevent spam)
        const lastSent = rateLimitStore.get(`last_${formattedPhone}`);
        if (lastSent && Date.now() - lastSent < 60000) {
            return {
                statusCode: 429,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Please wait 60 seconds before requesting another OTP',
                    remainingTime: Math.ceil((60000 - (Date.now() - lastSent)) / 1000)
                })
            };
        }

        // Generate OTP
        const otp = generateOTP();
        const expiresAt = Date.now() + (OTP_EXPIRY_MINUTES * 60 * 1000);

        // Create JWT token containing OTP info (for verification)
        const otpToken = jwt.sign(
            { 
                phone: formattedPhone,
                otp: otp,
                expiresAt: expiresAt
            },
            JWT_SECRET,
            { expiresIn: OTP_EXPIRY_MINUTES * 60 }
        );

        // Check if Fast2SMS is configured
        if (!FAST2SMS_API_KEY || FAST2SMS_API_KEY === 'YOUR_FAST2SMS_API_KEY') {
            console.warn('⚠️ Fast2SMS not configured. Using demo mode.');
            
            // Demo mode - return OTP token
            rateLimitStore.set(`last_${formattedPhone}`, Date.now());
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'OTP sent successfully!',
                    expiresIn: OTP_EXPIRY_MINUTES * 60,
                    otpToken: otpToken,
                    demo_mode: true,
                    demo_otp: otp // Remove this in production!
                })
            };
        }

        // Send OTP via Fast2SMS
        await sendOTPViaSMS(formattedPhone, otp);

        // Update rate limit tracker
        rateLimitStore.set(`last_${formattedPhone}`, Date.now());

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'OTP sent successfully to ' + formattedPhone,
                expiresIn: OTP_EXPIRY_MINUTES * 60,
                otpToken: otpToken // Token to verify OTP later
            })
        };

    } catch (error) {
        console.error('Send OTP Error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                message: error.message || 'Failed to send OTP. Please try again.'
            })
        };
    }
};
