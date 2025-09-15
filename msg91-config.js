// MSG91 SMS Configuration for JB Creations Website
// Replace these values with your actual MSG91 credentials

const msg91Config = {
    authKey: '469234A1behIiauk9368c8254dP1',  // Your Auth Key - UPDATED ✅
    templateId: '68c823845b18de42d563fbf3',   // Your Template ID - UPDATED ✅
    senderId: 'MSGIND',                      // Default sender ID or your custom one
    route: '4',                              // Route 4 for Transactional SMS
    country: '91'                            // Country code for India
};

// MSG91 API endpoints
const msg91Endpoints = {
    sendOTP: 'https://control.msg91.com/api/v5/otp',
    verifyOTP: 'https://control.msg91.com/api/v5/otp/verify',
    resendOTP: 'https://control.msg91.com/api/v5/otp/retry'
};

// Store OTP data temporarily
let otpData = {
    currentPhone: null,
    otpSent: false,
    attempts: 0,
    maxAttempts: 3
};

// Send OTP using MSG91
async function sendOTPViaMSG91(phoneNumber) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log('📱 Sending OTP via MSG91 to:', phoneNumber);
            
            // Validate configuration
            if (msg91Config.authKey === 'YOUR_MSG91_AUTH_KEY') {
                throw new Error('MSG91 configuration not set. Please update msg91-config.js with your credentials.');
            }
            
            // Format phone number (remove +91 if present)
            const cleanPhone = phoneNumber.replace('+91', '').replace(/\s+/g, '');
            
            // Validate Indian phone number
            if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
                throw new Error('Invalid Indian mobile number. Please enter a 10-digit number starting with 6, 7, 8, or 9.');
            }
            
            // Prepare API request
            const apiUrl = msg91Endpoints.sendOTP;
            const requestBody = {
                template_id: msg91Config.templateId,
                mobile: cleanPhone,
                authkey: msg91Config.authKey,
                extra_param: {
                    brand_name: "JB Creations"
                }
            };
            
            console.log('🚀 Sending API request to MSG91...');
            
            // Send API request
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authkey': msg91Config.authKey
                },
                body: JSON.stringify(requestBody)
            });
            
            const result = await response.json();
            console.log('📨 MSG91 Response:', result);
            
            if (result.type === 'success') {
                // Store OTP data
                otpData.currentPhone = cleanPhone;
                otpData.otpSent = true;
                otpData.attempts = 0;
                
                console.log('✅ OTP sent successfully via MSG91');
                resolve({
                    success: true,
                    message: `OTP sent to +91${cleanPhone}`,
                    requestId: result.request_id
                });
            } else {
                console.error('❌ MSG91 Error:', result.message);
                reject(new Error(result.message || 'Failed to send OTP via MSG91'));
            }
            
        } catch (error) {
            console.error('❌ MSG91 Send OTP Error:', error);
            reject(error);
        }
    });
}

// Verify OTP using MSG91
async function verifyOTPViaMSG91(phoneNumber, otpCode) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log('🔍 Verifying OTP via MSG91...');
            
            // Validate inputs
            if (!otpCode || otpCode.length !== 6) {
                throw new Error('Please enter a valid 6-digit OTP');
            }
            
            if (otpData.attempts >= otpData.maxAttempts) {
                throw new Error('Maximum verification attempts exceeded. Please request a new OTP.');
            }
            
            // Format phone number
            const cleanPhone = phoneNumber.replace('+91', '').replace(/\s+/g, '');
            
            // Prepare API request
            const apiUrl = msg91Endpoints.verifyOTP;
            const requestBody = {
                authkey: msg91Config.authKey,
                mobile: cleanPhone,
                otp: otpCode
            };
            
            console.log('🔍 Sending verification request to MSG91...');
            
            // Send verification request
            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'authkey': msg91Config.authKey
                },
                body: JSON.stringify(requestBody)
            });
            
            const result = await response.json();
            console.log('📋 MSG91 Verification Response:', result);
            
            otpData.attempts++;
            
            if (result.type === 'success') {
                console.log('✅ OTP verified successfully');
                
                // Reset OTP data
                otpData = {
                    currentPhone: null,
                    otpSent: false,
                    attempts: 0,
                    maxAttempts: 3
                };
                
                resolve({
                    success: true,
                    message: 'OTP verified successfully',
                    verified: true
                });
            } else {
                console.error('❌ OTP Verification Failed:', result.message);
                resolve({
                    success: false,
                    message: result.message || 'Invalid OTP. Please try again.',
                    verified: false,
                    attemptsLeft: otpData.maxAttempts - otpData.attempts
                });
            }
            
        } catch (error) {
            console.error('❌ MSG91 Verify OTP Error:', error);
            otpData.attempts++;
            reject(error);
        }
    });
}

// Resend OTP using MSG91
async function resendOTPViaMSG91(phoneNumber) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log('🔄 Resending OTP via MSG91...');
            
            const cleanPhone = phoneNumber.replace('+91', '').replace(/\s+/g, '');
            
            // Use the retry endpoint
            const apiUrl = `${msg91Endpoints.resendOTP}?authkey=${msg91Config.authKey}&mobile=${cleanPhone}`;
            
            const response = await fetch(apiUrl, {
                method: 'GET',
                headers: {
                    'authkey': msg91Config.authKey
                }
            });
            
            const result = await response.json();
            console.log('🔄 MSG91 Resend Response:', result);
            
            if (result.type === 'success') {
                console.log('✅ OTP resent successfully');
                resolve({
                    success: true,
                    message: 'OTP resent successfully'
                });
            } else {
                reject(new Error(result.message || 'Failed to resend OTP'));
            }
            
        } catch (error) {
            console.error('❌ MSG91 Resend Error:', error);
            reject(error);
        }
    });
}

// Utility function to get remaining SMS balance
async function getMSG91Balance() {
    try {
        const apiUrl = `https://control.msg91.com/api/balance.php?authkey=${msg91Config.authKey}&type=4`;
        const response = await fetch(apiUrl);
        const balance = await response.text();
        console.log('💰 MSG91 Balance:', balance, 'SMS credits');
        return balance;
    } catch (error) {
        console.error('Error checking MSG91 balance:', error);
        return 'Unknown';
    }
}

console.log('📱 MSG91 SMS service initialized');
console.log('🔧 Remember to update your credentials in msg91-config.js');