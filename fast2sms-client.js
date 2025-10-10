/**
 * Fast2SMS OTP Client for JB Creations Frontend
 * Handles OTP authentication with backend Fast2SMS integration
 */

class Fast2SMSOTPClient {
    constructor(apiBaseURL = 'http://localhost:3001') {
        this.apiBaseURL = apiBaseURL;
        this.currentPhone = null;
        this.otpExpiresAt = null;
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

            const response = await fetch(`${this.apiBaseURL}/api/auth/send-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone: phoneNumber,
                    type: type
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to send OTP');
            }

            // Store current phone and expiry
            this.currentPhone = data.phone || phoneNumber;
            this.otpExpiresAt = data.expiresAt;

            console.log('✅ OTP sent successfully:', data);

            // In development mode, show OTP if provided
            if (data.otp) {
                console.log('🔐 Development OTP:', data.otp);
                // Show alert with OTP for testing
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
            console.error('❌ Send OTP Error:', error);
            throw error;
        }
    }

    /**
     * Verify OTP
     * @param {string} phoneNumber - Phone number
     * @param {string} otp - OTP to verify
     * @returns {Promise<Object>} - Verification result
     */
    async verifyOTP(phoneNumber, otp) {
        try {
            if (!otp || otp.length !== 6) {
                throw new Error('Please enter a valid 6-digit OTP');
            }

            console.log('🔍 Verifying OTP for:', phoneNumber);

            const response = await fetch(`${this.apiBaseURL}/api/auth/verify-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone: phoneNumber,
                    otp: otp
                })
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'OTP verification failed');
            }

            console.log('✅ OTP verified successfully');

            return {
                success: true,
                message: data.message,
                phone: data.phone
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

            const response = await fetch(`${this.apiBaseURL}/api/auth/resend-otp`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone: phoneNumber
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

            const response = await fetch(`${this.apiBaseURL}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name,
                    phone,
                    email,
                    otp
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

            const response = await fetch(`${this.apiBaseURL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    phone,
                    otp
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
