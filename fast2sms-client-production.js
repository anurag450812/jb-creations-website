/**
 * Fast2SMS OTP Client for JB Creations Frontend - PRODUCTION VERSION
 * Handles OTP authentication with Netlify Functions (serverless)
 * 
 * USAGE:
 * const otpClient = new Fast2SMSOTPClient();
 * await otpClient.sendOTP('+919876543210');
 * await otpClient.verifyOTP('+919876543210', '123456');
 */

class Fast2SMSOTPClient {
    constructor() {
        // Automatically detect if running on localhost or production
        this.apiBaseURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
            ? 'http://localhost:8888/.netlify/functions'  // Netlify Dev
            : '/.netlify/functions';  // Production
        
        this.currentPhone = null;
        this.otpExpiresAt = null;
        
        console.log('🚀 Fast2SMS Client initialized with API:', this.apiBaseURL);
    }

    /**
     * Validate phone number
     * @param {string} phoneNumber - Phone number to validate
     * @returns {boolean} - True if valid
     */
    validatePhoneNumber(phoneNumber) {
        // Remove all non-digit characters
        const cleaned = phoneNumber.replace(/\D/g, '');
        
        // Remove leading +91 or 91 if present
        let phone = cleaned;
        if (phone.startsWith('91') && phone.length === 12) {
            phone = phone.substring(2);
        }
        
        // Validate Indian mobile number (10 digits starting with 6-9)
        return /^[6-9]\d{9}$/.test(phone);
    }

    /**
     * Format phone number for display
     * @param {string} phoneNumber - Phone number to format
     * @returns {string} - Formatted phone number
     */
    formatPhoneForDisplay(phoneNumber) {
        const cleaned = phoneNumber.replace(/\D/g, '');
        let phone = cleaned;
        
        if (phone.startsWith('91') && phone.length === 12) {
            phone = phone.substring(2);
        }
        
        return `+91 ${phone}`;
    }

    /**
     * Send OTP via Netlify Function
     * @param {string} phoneNumber - Phone number to send OTP to
     * @returns {Promise<Object>} - Result of OTP sending
     */
    async sendOTP(phoneNumber) {
        try {
            // Validate phone number
            if (!this.validatePhoneNumber(phoneNumber)) {
                throw new Error('Please enter a valid 10-digit phone number');
            }

            console.log('📱 Sending OTP to:', phoneNumber);

            const response = await fetch(`${this.apiBaseURL}/send-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phoneNumber: phoneNumber
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to send OTP');
            }

            // Store current phone and expiry
            this.currentPhone = phoneNumber;
            
            if (data.expiresIn) {
                this.otpExpiresAt = Date.now() + (data.expiresIn * 1000);
            }

            // Store OTP token for verification
            if (data.otpToken) {
                this.otpToken = data.otpToken;
                // Also store in sessionStorage for persistence
                sessionStorage.setItem('jb_otp_token', data.otpToken);
                sessionStorage.setItem('jb_otp_phone', phoneNumber);
            }

            console.log('✅ OTP sent successfully:', data.message);

            // In development/demo mode, show OTP if provided
            if (data.demo_otp) {
                console.log('🔐 Demo Mode OTP:', data.demo_otp);
                // Show alert with OTP for testing
                setTimeout(() => {
                    alert(`🔐 Demo Mode OTP: ${data.demo_otp}\n\nThis is only shown when Fast2SMS is not configured.`);
                }, 500);
            }

            return {
                success: true,
                message: data.message,
                phone: phoneNumber,
                expiresIn: data.expiresIn,
                otpToken: data.otpToken,
                demo_otp: data.demo_otp // Only in demo mode
            };

        } catch (error) {
            console.error('❌ Send OTP Error:', error);
            
            // Check if it's a rate limit error
            if (error.message.includes('wait')) {
                throw new Error(error.message);
            }
            
            throw new Error(error.message || 'Failed to send OTP. Please try again.');
        }
    }

    /**
     * Verify OTP via Netlify Function
     * @param {string} phoneNumber - Phone number
     * @param {string} otp - OTP to verify
     * @returns {Promise<Object>} - Verification result with user data and token
     */
    async verifyOTP(phoneNumber, otp) {
        try {
            if (!otp || otp.length !== 6) {
                throw new Error('Please enter a valid 6-digit OTP');
            }

            console.log('🔍 Verifying OTP for:', phoneNumber);

            // Get OTP token from instance or sessionStorage
            const otpToken = this.otpToken || sessionStorage.getItem('jb_otp_token');
            
            if (!otpToken) {
                throw new Error('OTP session expired. Please request a new OTP.');
            }

            const response = await fetch(`${this.apiBaseURL}/verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phoneNumber: phoneNumber,
                    otp: otp,
                    otpToken: otpToken
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'OTP verification failed');
            }

            console.log('✅ OTP verified successfully');

            // Clear OTP token after successful verification
            this.otpToken = null;
            sessionStorage.removeItem('jb_otp_token');
            sessionStorage.removeItem('jb_otp_phone');

            // Store user data and token in localStorage
            if (data.token) {
                localStorage.setItem('jb_auth_token', data.token);
            }
            
            if (data.user) {
                localStorage.setItem('jb_user_data', JSON.stringify(data.user));
                localStorage.setItem('jb_user_phone', data.user.phone);
                localStorage.setItem('jb_user_name', data.user.name);
            }

            return {
                success: true,
                message: data.message,
                user: data.user,
                token: data.token
            };

        } catch (error) {
            console.error('❌ Verify OTP Error:', error);
            throw new Error(error.message || 'OTP verification failed. Please try again.');
        }
    }

    /**
     * Check if user is logged in
     * @returns {boolean} - True if logged in
     */
    isLoggedIn() {
        return !!localStorage.getItem('jb_auth_token');
    }

    /**
     * Get current user data
     * @returns {Object|null} - User data or null
     */
    getCurrentUser() {
        const userData = localStorage.getItem('jb_user_data');
        return userData ? JSON.parse(userData) : null;
    }

    /**
     * Get auth token
     * @returns {string|null} - Auth token or null
     */
    getAuthToken() {
        return localStorage.getItem('jb_auth_token');
    }

    /**
     * Logout user
     */
    logout() {
        localStorage.removeItem('jb_auth_token');
        localStorage.removeItem('jb_user_data');
        localStorage.removeItem('jb_user_phone');
        localStorage.removeItem('jb_user_name');
        this.currentPhone = null;
        this.otpExpiresAt = null;
        console.log('👋 User logged out');
    }

    /**
     * Get remaining time for OTP expiry
     * @returns {number} - Seconds remaining, or 0 if expired
     */
    getRemainingTime() {
        if (!this.otpExpiresAt) return 0;
        
        const remaining = Math.max(0, Math.floor((this.otpExpiresAt - Date.now()) / 1000));
        return remaining;
    }

    /**
     * Check if OTP is expired
     * @returns {boolean} - True if expired
     */
    isOTPExpired() {
        return this.getRemainingTime() === 0;
    }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.Fast2SMSOTPClient = Fast2SMSOTPClient;
}
