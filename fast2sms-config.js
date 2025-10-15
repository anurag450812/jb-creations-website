/**
 * Fast2SMS DLT OTP Configuration for JB Creations Website
 * 
 * Setup Instructions:
 * 1. Get your API key from https://www.fast2sms.com/dashboard
 * 2. Create DLT template on https://www.fast2sms.com/dashboard/dev-api
 * 3. Register your DLT template with Jio True Connect
 * 4. Replace YOUR_FAST2SMS_API_KEY with your actual API key
 * 5. Replace YOUR_DLT_TEMPLATE_ID with your registered DLT template ID
 * 
 * DLT Template Format Example:
 * "Your OTP for JB Creations is {#var#}. Valid for 5 minutes. Do not share with anyone."
 */

const fast2smsConfig = {
    // Your Fast2SMS API Key (get from dashboard)
    apiKey: '9EgVuLYNlo0skRw46pq3Tvy7SZ5PcWJniz2rGCAmbeUfDBhxXMs80pKcFeEdNLRqkfv34TPa7tjgWiQx',
    
    // Your DLT registered template ID
    templateId: '200214',
    
    // Sender ID (registered with DLT)
    senderId: 'JBCREA',  // Update with your registered sender ID
    
    // API endpoint
    apiEndpoint: 'https://www.fast2sms.com/dev/bulkV2',
    
    // OTP Configuration
    otpConfig: {
        length: 6,              // OTP length (6 digits)
        expiryMinutes: 5,       // OTP validity period
        maxAttempts: 3,         // Maximum verification attempts
        resendCooldown: 60      // Cooldown period in seconds before resend
    },
    
    // Message Configuration
    messageConfig: {
        route: 'dlt',           // Use DLT route for regulatory compliance
        flash: '0',             // 0 for normal SMS, 1 for flash SMS
        unicode: '0'            // 0 for English, 1 for Unicode languages
    }
};

// Validate configuration on load
function validateFast2SMSConfig() {
    const errors = [];
    
    if (!fast2smsConfig.apiKey || fast2smsConfig.apiKey === 'YOUR_FAST2SMS_API_KEY') {
        errors.push('Fast2SMS API Key not configured');
    }
    
    if (!fast2smsConfig.templateId || fast2smsConfig.templateId === 'YOUR_DLT_TEMPLATE_ID') {
        errors.push('Fast2SMS DLT Template ID not configured');
    }
    
    if (errors.length > 0) {
        console.warn('⚠️ Fast2SMS Configuration Issues:', errors);
        return false;
    }
    
    return true;
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { fast2smsConfig, validateFast2SMSConfig };
}
