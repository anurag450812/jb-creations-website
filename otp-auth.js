/**
 * Demo OTP Authentication System for JB Creations
 * Handles phone number verification, user registration, and login
 */

class OTPAuth {
    constructor() {
        this.apiEndpoint = 'https://jsonplaceholder.typicode.com/posts'; // Demo API
        this.users = JSON.parse(localStorage.getItem('jb_users')) || {};
        this.currentOTP = null;
        this.currentPhone = null;
        this.otpTimer = null;
        this.otpExpiryTime = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Generate a 6-digit OTP for demo purposes
     * In production, this would be handled by SMS service
     */
    generateOTP() {
        // Demo OTPs for testing - cycle through them
        const demoOTPs = ['123456', '654321', '111111'];
        return demoOTPs[Math.floor(Math.random() * demoOTPs.length)];
    }

    /**
     * Send OTP to phone number (Demo implementation)
     * @param {string} phoneNumber - Phone number to send OTP
     * @param {Object} userData - User data for registration (signup only)
     * @returns {Promise<Object>} - Result of OTP sending
     */
    async sendOTP(phoneNumber, userData = null) {
        try {
            console.log('📱 Sending OTP to:', phoneNumber);

            // Validate phone number
            if (!this.validatePhoneNumber(phoneNumber)) {
                throw new Error('Please enter a valid 10-digit phone number');
            }

            // Generate OTP
            this.currentOTP = this.generateOTP();
            this.currentPhone = phoneNumber;
            
            // Set expiry timer
            this.startOTPTimer();

            // Demo: Show OTP in console and popup
            console.log('🔐 Demo OTP:', this.currentOTP);
            
            // For signup, save user data to Firebase immediately
            if (userData) {
                console.log('💾 Saving user data to Firebase during OTP send:', userData);
                
                // Normalize phone number for consistent storage
                const normalizedPhone = phoneNumber.startsWith('+91') ? phoneNumber : '+91' + phoneNumber;
                
                // Also save user data temporarily to localStorage for OTP verification
                const userObj = {
                    id: this.generateUserId(),
                    phone: normalizedPhone,
                    name: userData.name,
                    email: userData.email || '',
                    registrationDate: new Date().toISOString(),
                    lastLogin: new Date().toISOString(),
                    loginCount: 1,
                    isVerified: false, // Will be set to true after OTP verification
                    tempOTP: this.currentOTP // Store OTP temporarily for verification
                };
                
                // Store with both formats to ensure compatibility
                this.users[phoneNumber] = userObj;
                this.users[normalizedPhone] = userObj;
                this.saveUsers(); // Save to localStorage
                
                await this.saveUserToFirebase({
                    phone: normalizedPhone,
                    name: userData.name,
                    email: userData.email || '',
                    registrationDate: new Date().toISOString(),
                    isVerified: false, // Will be set to true after OTP verification
                    tempOTP: this.currentOTP // Store OTP temporarily for verification
                });
            }
            
            // Show OTP popup for demo purposes
            setTimeout(() => {
                alert(`🔐 Demo OTP Code: ${this.currentOTP}\n\nPhone: ${phoneNumber}\n\n📝 Note: This is for demo purposes. In production, you would receive this via SMS.`);
            }, 500);

            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));

            return {
                success: true,
                message: `OTP sent to ${phoneNumber}`,
                otp: this.currentOTP, // Return OTP for demo purposes
                phoneNumber: phoneNumber,
                expiryTime: Date.now() + this.otpExpiryTime
            };

        } catch (error) {
            console.error('❌ Error sending OTP:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verify the entered OTP
     * @param {string} phoneNumber - Phone number being verified 
     * @param {string} enteredOTP - OTP entered by user
     * @returns {Promise<Object>} - Verification result
     */
    async verifyOTP(phoneNumber, enteredOTP) {
        try {
            console.log('🔍 Verifying OTP for:', phoneNumber, 'OTP:', enteredOTP);

            if (!this.currentOTP || !this.currentPhone) {
                throw new Error('No active OTP session. Please request a new OTP.');
            }

            if (phoneNumber !== this.currentPhone) {
                throw new Error('Phone number mismatch. Please request a new OTP.');
            }

            if (this.isOTPExpired()) {
                throw new Error('OTP has expired. Please request a new one.');
            }

            if (enteredOTP !== this.currentOTP) {
                throw new Error('Invalid OTP. Please check and try again.');
            }

            // OTP is valid - update user as verified in Firebase
            let user = null;
            try {
                if (window.jbAPI && window.jbAPI.getUserByPhone) {
                    user = await window.jbAPI.getUserByPhone(phoneNumber);
                    if (user) {
                        // Update user as verified
                        await window.jbAPI.createUser({
                            ...user,
                            isVerified: true,
                            lastLogin: new Date().toISOString(),
                            loginCount: (user.loginCount || 0) + 1
                        });
                        console.log('✅ User verified in Firebase:', phoneNumber);
                    }
                }
            } catch (firebaseError) {
                console.warn('⚠️ Could not update user in Firebase:', firebaseError);
            }

            // Also save to localStorage for backward compatibility
            let localUser = this.users[phoneNumber];
            let isNewUser = !localUser;

            if (isNewUser) {
                // If user doesn't exist locally but exists in Firebase, create local copy
                if (user) {
                    localUser = {
                        id: user.id || this.generateUserId(),
                        phone: phoneNumber,
                        name: user.name || 'User',
                        email: user.email || '',
                        registrationDate: user.registrationDate || new Date().toISOString(),
                        lastLogin: new Date().toISOString(),
                        loginCount: (user.loginCount || 0) + 1,
                        isVerified: true
                    };
                    this.users[phoneNumber] = localUser;
                } else {
                    // Check if we have temporary user data stored during sendOTP
                    let tempUser = this.users[phoneNumber];
                    if (tempUser && tempUser.name) {
                        // Use the temporary user data saved during sendOTP
                        localUser = {
                            ...tempUser,
                            isVerified: true,
                            lastLogin: new Date().toISOString(),
                            loginCount: 1
                        };
                        this.users[phoneNumber] = localUser;
                    } else {
                        // Fallback: create basic user profile
                        const result = await this.registerNewUser({
                            name: 'User',
                            phone: phoneNumber
                        });
                        if (result.success) {
                            localUser = result.user;
                        } else {
                            throw new Error('Failed to register user');
                        }
                    }
                }
            } else {
                // Update existing local user
                localUser.lastLogin = new Date().toISOString();
                localUser.loginCount = (localUser.loginCount || 0) + 1;
                localUser.isVerified = true;
            }
            
            this.saveUsers();

            // Clear OTP session
            this.clearOTPSession();
            
            // Set as current user for session - use normalized phone
            const normalizedPhone = phoneNumber.startsWith('+91') ? phoneNumber : '+91' + phoneNumber;
            this.setCurrentUser(normalizedPhone);

            return {
                success: true,
                isNewUser: isNewUser,
                user: localUser,
                message: isNewUser ? 'Registration successful!' : `Welcome back, ${localUser.name || 'User'}!`
            };

        } catch (error) {
            console.error('❌ OTP verification failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Register a new user
     * @param {string} phoneNumber - User's phone number
     * @param {Object} userData - User registration data
     * @returns {Object} - User object
     */
    registerNewUser(phoneNumber, userData) {
        const user = {
            id: this.generateUserId(),
            phone: phoneNumber,
            name: userData.name || 'User',
            email: userData.email || '',
            registrationDate: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            loginCount: 1,
            orderHistory: []
        };

        this.users[phoneNumber] = user;
        this.saveUsers();

        // Also save to Firebase if available
        this.saveUserToFirebase(user);

        return user;
    }

    /**
     * Check if user exists
     * @param {string} phoneNumber - Phone number to check
     * @returns {Object|null} - User object or null
     */
    getUser(phoneNumber) {
        return this.users[phoneNumber] || null;
    }

    /**
     * Get welcome message for user
     * @param {string} phoneNumber - Phone number
     * @returns {Object} - Welcome message info
     */
    getWelcomeMessage(phoneNumber) {
        const user = this.getUser(phoneNumber);
        
        if (!user) {
            return {
                isReturningUser: false,
                message: 'Enter your phone number to get started',
                user: null
            };
        }

        const loginCount = user.loginCount || 1;
        let welcomeMessage;

        if (loginCount === 1) {
            welcomeMessage = `Welcome to JB Creations, ${user.name}! 🎉`;
        } else if (loginCount < 5) {
            welcomeMessage = `Welcome back, ${user.name}! 😊`;
        } else {
            welcomeMessage = `Great to see you again, ${user.name}! 🌟`;
        }

        return {
            isReturningUser: true,
            message: welcomeMessage,
            user: user,
            loginCount: loginCount,
            lastLogin: user.lastLogin
        };
    }

    /**
     * Get user by phone number from Firebase
     * @param {string} phoneNumber - Phone number to search for
     * @returns {Promise<Object|null>} - User object or null
     */
    async getUserByPhone(phoneNumber) {
        try {
            if (window.jbAPI && window.jbAPI.getUserByPhone) {
                const user = await window.jbAPI.getUserByPhone(phoneNumber);
                return user;
            }
            return null;
        } catch (error) {
            console.warn('⚠️ Could not fetch user from Firebase:', error);
            // Fallback to localStorage
            return this.users[phoneNumber] || null;
        }
    }

    /**
     * Register a new user and save to both localStorage and Firebase
     * @param {Object} userData - User registration data
     * @returns {Promise<Object>} - Registration result
     */
    async registerNewUser(userData) {
        try {
            const user = {
                id: this.generateUserId(),
                phone: userData.phone,
                name: userData.name || 'User',
                email: userData.email || '',
                registrationDate: new Date().toISOString(),
                lastLogin: new Date().toISOString(),
                loginCount: 1,
                isVerified: false
            };

            // Save to localStorage
            this.users[userData.phone] = user;
            this.saveUsers();

            // Save to Firebase
            await this.saveUserToFirebase(user);

            console.log('✅ New user registered:', user.phone);
            return {
                success: true,
                user: user
            };

        } catch (error) {
            console.error('❌ Error registering user:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Save user to Firebase (if available)
     */
    async saveUserToFirebase(user) {
        try {
            if (window.jbAPI && window.jbAPI.createUser) {
                await window.jbAPI.createUser(user);
                console.log('✅ User saved to Firebase:', user.phone);
            }
        } catch (error) {
            console.warn('⚠️ Could not save user to Firebase:', error);
        }
    }

    /**
     * Utility functions
     */
    validatePhoneNumber(phone) {
        const phoneRegex = /^[6-9]\d{9}$/; // Indian mobile number format
        return phoneRegex.test(phone.replace(/\D/g, ''));
    }

    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    startOTPTimer() {
        this.clearOTPTimer();
        this.otpTimer = setTimeout(() => {
            console.log('⏰ OTP expired');
            this.clearOTPSession();
        }, this.otpExpiryTime);
    }

    clearOTPTimer() {
        if (this.otpTimer) {
            clearTimeout(this.otpTimer);
            this.otpTimer = null;
        }
    }

    isOTPExpired() {
        // For demo, we'll use the timer
        return !this.currentOTP || !this.otpTimer;
    }

    clearOTPSession() {
        this.currentOTP = null;
        this.currentPhone = null;
        this.clearOTPTimer();
    }

    saveUsers() {
        localStorage.setItem('jb_users', JSON.stringify(this.users));
    }

    /**
     * Get current authenticated user
     */
    getCurrentUser() {
        const currentUserPhone = localStorage.getItem('jb_current_user');
        return currentUserPhone ? this.getUser(currentUserPhone) : null;
    }

    /**
     * Set current authenticated user
     */
    setCurrentUser(phoneNumber) {
        localStorage.setItem('jb_current_user', phoneNumber);
    }

    /**
     * Logout current user
     */
    logout() {
        localStorage.removeItem('jb_current_user');
        this.clearOTPSession();
    }

    /**
     * Get all users (for admin purposes)
     */
    getAllUsers() {
        return this.users;
    }
}

// Create global instance
window.otpAuth = new OTPAuth();

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = OTPAuth;
}