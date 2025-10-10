/**
 * Fast2SMS DLT OTP Service for JB Creations
 * Handles OTP generation, sending, and verification using Fast2SMS API
 */

const axios = require('axios');
const { fast2smsConfig, validateFast2SMSConfig } = require('../fast2sms-config');

// In-memory OTP storage (use Redis or database in production)
const otpStore = new Map();

/**
 * Generate a random OTP
 * @param {number} length - Length of OTP (default: 6)
 * @returns {string} Generated OTP
 */
function generateOTP(length = 6) {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
        otp += digits[Math.floor(Math.random() * 10)];
    }
    return otp;
}

/**
 * Format phone number to standard format
 * @param {string} phone - Phone number
 * @returns {string} Formatted phone number
 */
function formatPhoneNumber(phone) {
    // Remove all non-digit characters
    let cleaned = phone.replace(/\D/g, '');
    
    // Remove leading +91 or 91 if present
    if (cleaned.startsWith('91') && cleaned.length === 12) {
        cleaned = cleaned.substring(2);
    }
    
    // Validate Indian mobile number (10 digits starting with 6-9)
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
        throw new Error('Invalid Indian mobile number');
    }
    
    return cleaned;
}

/**
 * Send OTP via Fast2SMS
 * @param {string} phoneNumber - Recipient phone number
 * @param {string} otp - OTP to send (optional, will generate if not provided)
 * @returns {Promise<Object>} Result of OTP sending
 */
async function sendOTP(phoneNumber, otp = null) {
    try {
        // Validate configuration
        if (!validateFast2SMSConfig()) {
            throw new Error('Fast2SMS not configured properly. Please check fast2sms-config.js');
        }
        
        // Format phone number
        const formattedPhone = formatPhoneNumber(phoneNumber);
        
        // Generate OTP if not provided
        const otpCode = otp || generateOTP(fast2smsConfig.otpConfig.length);
        
        // Prepare API request
        const apiUrl = fast2smsConfig.apiEndpoint;
        const headers = {
            'authorization': fast2smsConfig.apiKey,
            'Content-Type': 'application/json'
        };
        
        // Prepare request body for DLT route
        const requestBody = {
            route: fast2smsConfig.messageConfig.route,
            sender_id: fast2smsConfig.senderId,
            message: fast2smsConfig.templateId,
            variables_values: otpCode,  // OTP value for template variable
            flash: fast2smsConfig.messageConfig.flash,
            numbers: formattedPhone
        };
        
        console.log('📱 Sending OTP via Fast2SMS to:', formattedPhone);
        
        // Send API request
        const response = await axios.post(apiUrl, requestBody, { headers });
        
        // Check response
        if (response.data && response.data.return === true) {
            // Store OTP with expiry
            const expiryTime = Date.now() + (fast2smsConfig.otpConfig.expiryMinutes * 60 * 1000);
            otpStore.set(formattedPhone, {
                otp: otpCode,
                expiresAt: expiryTime,
                attempts: 0,
                createdAt: Date.now()
            });
            
            // Clean up expired OTPs
            cleanupExpiredOTPs();
            
            console.log('✅ OTP sent successfully:', response.data);
            
            return {
                success: true,
                message: 'OTP sent successfully',
                messageId: response.data.message_id || null,
                phone: formattedPhone,
                expiresAt: expiryTime,
                // Only include OTP in development mode
                ...(process.env.NODE_ENV === 'development' && { otp: otpCode })
            };
        } else {
            throw new Error(response.data.message || 'Failed to send OTP');
        }
        
    } catch (error) {
        console.error('❌ Fast2SMS Error:', error.message);
        
        // Handle specific error cases
        if (error.response) {
            const status = error.response.status;
            const data = error.response.data;
            
            if (status === 401) {
                throw new Error('Invalid Fast2SMS API key');
            } else if (status === 400) {
                throw new Error(data.message || 'Invalid request parameters');
            } else {
                throw new Error(`Fast2SMS API error: ${data.message || 'Unknown error'}`);
            }
        }
        
        throw error;
    }
}

/**
 * Verify OTP
 * @param {string} phoneNumber - Phone number
 * @param {string} otp - OTP to verify
 * @returns {Object} Verification result
 */
function verifyOTP(phoneNumber, otp) {
    try {
        const formattedPhone = formatPhoneNumber(phoneNumber);
        const storedData = otpStore.get(formattedPhone);
        
        if (!storedData) {
            return {
                success: false,
                message: 'OTP not found or expired. Please request a new OTP.'
            };
        }
        
        // Check if OTP has expired
        if (Date.now() > storedData.expiresAt) {
            otpStore.delete(formattedPhone);
            return {
                success: false,
                message: 'OTP has expired. Please request a new OTP.'
            };
        }
        
        // Check attempts
        if (storedData.attempts >= fast2smsConfig.otpConfig.maxAttempts) {
            otpStore.delete(formattedPhone);
            return {
                success: false,
                message: 'Maximum verification attempts exceeded. Please request a new OTP.'
            };
        }
        
        // Verify OTP
        if (storedData.otp === otp) {
            // OTP is valid
            otpStore.delete(formattedPhone);
            console.log('✅ OTP verified successfully for:', formattedPhone);
            return {
                success: true,
                message: 'OTP verified successfully',
                phone: formattedPhone
            };
        } else {
            // Invalid OTP - increment attempts
            storedData.attempts++;
            otpStore.set(formattedPhone, storedData);
            
            const remainingAttempts = fast2smsConfig.otpConfig.maxAttempts - storedData.attempts;
            return {
                success: false,
                message: `Invalid OTP. ${remainingAttempts} attempt(s) remaining.`,
                remainingAttempts
            };
        }
        
    } catch (error) {
        console.error('❌ OTP Verification Error:', error.message);
        return {
            success: false,
            message: 'OTP verification failed'
        };
    }
}

/**
 * Resend OTP
 * @param {string} phoneNumber - Phone number
 * @returns {Promise<Object>} Result of OTP resending
 */
async function resendOTP(phoneNumber) {
    try {
        const formattedPhone = formatPhoneNumber(phoneNumber);
        const storedData = otpStore.get(formattedPhone);
        
        // Check cooldown period
        if (storedData) {
            const timeSinceCreation = (Date.now() - storedData.createdAt) / 1000;
            if (timeSinceCreation < fast2smsConfig.otpConfig.resendCooldown) {
                const remainingTime = Math.ceil(fast2smsConfig.otpConfig.resendCooldown - timeSinceCreation);
                return {
                    success: false,
                    message: `Please wait ${remainingTime} seconds before requesting a new OTP`
                };
            }
        }
        
        // Send new OTP
        return await sendOTP(phoneNumber);
        
    } catch (error) {
        console.error('❌ Resend OTP Error:', error.message);
        throw error;
    }
}

/**
 * Clean up expired OTPs from store
 */
function cleanupExpiredOTPs() {
    const now = Date.now();
    for (const [phone, data] of otpStore.entries()) {
        if (now > data.expiresAt) {
            otpStore.delete(phone);
            console.log('🧹 Cleaned up expired OTP for:', phone);
        }
    }
}

/**
 * Get OTP info (for debugging)
 * @param {string} phoneNumber - Phone number
 * @returns {Object|null} OTP info or null
 */
function getOTPInfo(phoneNumber) {
    if (process.env.NODE_ENV !== 'development') {
        return null;
    }
    
    try {
        const formattedPhone = formatPhoneNumber(phoneNumber);
        const storedData = otpStore.get(formattedPhone);
        
        if (!storedData) {
            return null;
        }
        
        return {
            phone: formattedPhone,
            expiresIn: Math.max(0, Math.floor((storedData.expiresAt - Date.now()) / 1000)),
            attempts: storedData.attempts,
            maxAttempts: fast2smsConfig.otpConfig.maxAttempts
        };
    } catch (error) {
        return null;
    }
}

// Run cleanup every minute
setInterval(cleanupExpiredOTPs, 60000);

module.exports = {
    sendOTP,
    verifyOTP,
    resendOTP,
    getOTPInfo,
    formatPhoneNumber
};
