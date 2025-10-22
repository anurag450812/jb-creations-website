/**
 * Netlify Function: Send OTP via Fast2SMS
 * Production-ready serverless OTP sender
 */

const axios = require('axios');

// In-memory OTP store (use Firebase in production for persistence)
const otpStore = new Map();

// Configuration
const FAST2SMS_API_KEY = process.env.FAST2SMS_API_KEY;
const FAST2SMS_TEMPLATE_ID = process.env.FAST2SMS_TEMPLATE_ID;
const FAST2SMS_SENDER_ID = process.env.FAST2SMS_SENDER_ID || 'JBCREA';
const OTP_EXPIRY_MINUTES = 5;

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
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
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
        const lastSent = otpStore.get(`last_${formattedPhone}`);
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

        // Check if Fast2SMS is configured
        if (!FAST2SMS_API_KEY || FAST2SMS_API_KEY === 'YOUR_FAST2SMS_API_KEY') {
            console.warn('⚠️ Fast2SMS not configured. Using demo mode.');
            
            // Demo mode - store OTP but don't send SMS
            otpStore.set(formattedPhone, { otp, expiresAt });
            otpStore.set(`last_${formattedPhone}`, Date.now());
            
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'OTP sent successfully!',
                    expiresIn: OTP_EXPIRY_MINUTES * 60,
                    demo_mode: true,
                    demo_otp: otp // Remove this in production!
                })
            };
        }

        // Send OTP via Fast2SMS
        await sendOTPViaSMS(formattedPhone, otp);

        // Store OTP in memory (consider using Firebase Firestore for persistence)
        otpStore.set(formattedPhone, { otp, expiresAt, attempts: 0 });
        otpStore.set(`last_${formattedPhone}`, Date.now());

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'OTP sent successfully to ' + formattedPhone,
                expiresIn: OTP_EXPIRY_MINUTES * 60
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
