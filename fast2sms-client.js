/**
 * Fast2SMS OTP Client for Xidlz Frontend
 * Handles OTP authentication with backend Fast2SMS integration
 */

class Fast2SMSOTPClient {
    constructor(apiBaseURL = null) {
        // Dynamically determine the API base URL based on current site
        const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        
        // Use the current origin's Netlify functions (works for any Netlify site)
        // This ensures the API calls go to the same site that's hosting the page
        const currentSiteURL = `${window.location.origin}/.netlify/functions`;
        
        // For local development, use the production site
        const productionURL = 'https://jbcreationss.netlify.app/.netlify/functions';
        
        // Use provided URL, or current site URL, or production URL for localhost
        this.apiBaseURL = apiBaseURL || (isLocalhost ? productionURL : currentSiteURL);
        this.currentPhone = null;
        this.otpExpiresAt = null;
        
        console.log('📱 Fast2SMS Client initialized with URL:', this.apiBaseURL);
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
     * Send OTP
     * @param {string} phoneNumber - Phone number to send OTP to
     * @param {string} type - 'login' or 'register'
     * @returns {Promise<Object>} - Result of OTP sending
     */
    async sendOTP(phoneNumber, type = 'login') {
        try {
            // Validate phone number
            if (!this.validatePhoneNumber(phoneNumber)) {
                throw new Error('Please enter a valid 10-digit phone number');
            }

            console.log('📱 Sending OTP to:', phoneNumber, 'Type:', type);

            const response = await fetch(`${this.apiBaseURL}/send-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phoneNumber: phoneNumber,
                    type: type
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to send OTP');
            }

            // Store current phone, expiry, and OTP token for verification
            this.currentPhone = data.phone || phoneNumber;
            this.otpExpiresAt = data.expiresAt;
            this.otpToken = data.otpToken; // Store the JWT token for verification

            console.log('✅ OTP sent successfully:', data);

            // In development mode, show OTP if provided
            if (data.otp || data.demo_otp) {
                const devOtp = data.otp || data.demo_otp;
                console.log('🔐 Development OTP:', devOtp);
                // Show alert with OTP for testing
                setTimeout(() => {
                    alert(`🔐 Development Mode OTP: ${devOtp}\n\nThis OTP is only shown in development mode.`);
                }, 500);
            }

            return {
                success: true,
                message: data.message,
                phone: data.phone || phoneNumber,
                expiresAt: data.expiresAt,
                otpToken: data.otpToken, // Return token for storage
                otp: data.otp || data.demo_otp // Only in development
            };

        } catch (error) {
            console.error('❌ Send OTP Error:', error);
            throw error;
        }
    }

    /**
     * Verify OTP
     * @param {string} phoneNumber - Phone number
     * @param {string} otp - OTP to verify
     * @param {string} otpToken - Optional OTP token (uses stored token if not provided)
     * @returns {Promise<Object>} - Verification result
     */
    async verifyOTP(phoneNumber, otp, otpToken = null) {
        try {
            if (!otp || otp.length !== 6) {
                throw new Error('Please enter a valid 6-digit OTP');
            }

            // Use provided token or the stored token from sendOTP
            const tokenToUse = otpToken || this.otpToken;
            
            if (!tokenToUse) {
                throw new Error('OTP session expired. Please request a new OTP.');
            }

            console.log('🔍 Verifying OTP for:', phoneNumber);

            const response = await fetch(`${this.apiBaseURL}/verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phoneNumber: phoneNumber,
                    otp: otp,
                    otpToken: tokenToUse
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'OTP verification failed');
            }

            console.log('✅ OTP verified successfully');
            
            // Clear the stored token after successful verification
            this.otpToken = null;

            return {
                success: true,
                message: data.message,
                phone: data.phone,
                user: data.user,
                token: data.token
            };

        } catch (error) {
            console.error('❌ Verify OTP Error:', error);
            throw error;
        }
    }

    /**
     * Resend OTP
     * @param {string} phoneNumber - Phone number
     * @returns {Promise<Object>} - Result of OTP resending
     */
    async resendOTP(phoneNumber) {
        try {
            console.log('🔄 Resending OTP to:', phoneNumber);

            // Use the send-otp endpoint for resending
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
                throw new Error(data.message || 'Failed to resend OTP');
            }

            // Update expiry time
            this.otpExpiresAt = data.expiresAt;

            console.log('✅ OTP resent successfully:', data);

            // In development mode, show OTP if provided
            if (data.otp) {
                console.log('🔐 Development OTP:', data.otp);
                setTimeout(() => {
                    alert(`🔐 Development Mode OTP: ${data.otp}\n\nThis OTP is only shown in development mode.`);
                }, 500);
            }

            return {
                success: true,
                message: data.message,
                phone: data.phone,
                expiresAt: data.expiresAt,
                otp: data.otp // Only in development
            };

        } catch (error) {
            console.error('❌ Resend OTP Error:', error);
            throw error;
        }
    }

    /**
     * Register new user
     * @param {Object} userData - User data (name, phone, email, otp)
     * @returns {Promise<Object>} - Registration result
     */
    async register(userData) {
        try {
            const { name, phone, email, otp } = userData;

            if (!name || !phone || !otp) {
                throw new Error('Name, phone number, and OTP are required');
            }

            console.log('📝 Registering user:', phone);

            // Use verify-otp endpoint which also creates/updates user
            const response = await fetch(`${this.apiBaseURL}/verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phoneNumber: phone,
                    otp: otp,
                    name: name,
                    email: email,
                    action: 'register'
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            console.log('✅ Registration successful:', data);

            // Store user data and token
            if (data.token) {
                localStorage.setItem('jb_auth_token', data.token);
                localStorage.setItem('jb_user', JSON.stringify(data.user));
            }

            return {
                success: true,
                message: data.message,
                user: data.user,
                token: data.token
            };

        } catch (error) {
            console.error('❌ Registration Error:', error);
            throw error;
        }
    }

    /**
     * Login user
     * @param {string} phone - Phone number
     * @param {string} otp - OTP
     * @returns {Promise<Object>} - Login result
     */
    async login(phone, otp) {
        try {
            if (!phone || !otp) {
                throw new Error('Phone number and OTP are required');
            }

            console.log('🔐 Logging in user:', phone);

            // Use verify-otp endpoint which handles login
            const response = await fetch(`${this.apiBaseURL}/verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phoneNumber: phone,
                    otp: otp,
                    action: 'login'
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Login failed');
            }

            console.log('✅ Login successful:', data);

            // Store user data and token
            if (data.token) {
                localStorage.setItem('jb_auth_token', data.token);
                localStorage.setItem('jb_user', JSON.stringify(data.user));
            }

            return {
                success: true,
                message: data.message,
                user: data.user,
                token: data.token
            };

        } catch (error) {
            console.error('❌ Login Error:', error);
            throw error;
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
     * Get current user
     * @returns {Object|null} - User object or null
     */
    getCurrentUser() {
        const userStr = localStorage.getItem('jb_user');
        return userStr ? JSON.parse(userStr) : null;
    }

    /**
     * Logout user
     */
    logout() {
        localStorage.removeItem('jb_auth_token');
        localStorage.removeItem('jb_user');
        this.currentPhone = null;
        this.otpExpiresAt = null;
        console.log('👋 User logged out');
    }
}

// Export for use in other files
if (typeof window !== 'undefined') {
    window.Fast2SMSOTPClient = Fast2SMSOTPClient;
}
