/**
 * Firebase-based OTP Authentication System for JB Creations
 * Handles phone number verification, user registration, and login using Firebase
 */

class OTPAuth {
    constructor() {
        this.apiEndpoint = 'https://jsonplaceholder.typicode.com/posts'; // Demo API
        this.currentOTP = null;
        this.currentPhone = null;
        this.otpTimer = null;
        this.otpExpiryTime = 5 * 60 * 1000; // 5 minutes
        this.pendingUserData = null; // Store user data during OTP process
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
            
            // For signup, store user data temporarily for verification
            if (userData) {
                console.log('� Checking if phone number already exists in Firebase...');
                
                // Normalize phone number for consistent storage
                const normalizedPhone = phoneNumber.startsWith('+91') ? phoneNumber : '+91' + phoneNumber;
                
                // Check if user already exists with this phone number
                const existingUser = await this.getUserFromFirebase(normalizedPhone);
                
                if (existingUser) {
                    console.log('👤 User already exists with this phone:', existingUser.name);
                    
                    // Store existing user data instead of new signup data
                    this.pendingUserData = {
                        phone: normalizedPhone,
                        name: existingUser.name,  // Use existing name from Firebase
                        email: existingUser.email,
                        signInMethod: 'phone',
                        isVerified: true,
                        isExistingUser: true,     // Flag to identify existing user
                        existingUserName: existingUser.name
                    };
                    
                    console.log('💾 Using existing user data for OTP verification:', this.pendingUserData);
                } else {
                    console.log('✅ Phone number is new, proceeding with signup data');
                    
                    // Store new user data for verification
                    this.pendingUserData = {
                        phone: normalizedPhone,
                        name: userData.name,
                        email: userData.email || '',
                        signInMethod: 'phone',
                        isVerified: false,
                        isExistingUser: false
                    };
                    
                    console.log('💾 Storing new user data for OTP verification:', this.pendingUserData);
                }
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

            // Validate inputs
            if (!phoneNumber || !enteredOTP) {
                throw new Error('Phone number and OTP are required');
            }

            // Check if OTP matches and is not expired
            if (!this.currentOTP || this.currentOTP !== enteredOTP) {
                throw new Error('Invalid OTP. Please check and try again.');
            }

            if (this.currentPhone !== phoneNumber) {
                throw new Error('Phone number mismatch. Please request a new OTP.');
            }

            // Check if OTP has expired
            if (this.isOTPExpired()) {
                throw new Error('OTP has expired. Please request a new one.');
            }

            console.log('✅ OTP verified successfully');

            // Normalize phone for consistency
            const normalizedPhone = phoneNumber.startsWith('+91') ? phoneNumber : '+91' + phoneNumber;

            let userResult = null;

            // Check if we have pending user data
            if (this.pendingUserData) {
                // Check if it's an existing user or new user
                if (this.pendingUserData.isExistingUser) {
                    console.log('👤 Existing user verification - updating last login');
                    
                    // Update existing user's last login
                    const updateResult = await this.saveUserToFirebase({
                        ...this.pendingUserData,
                        lastLogin: new Date().toISOString(),
                        isVerified: true
                    });
                    
                    if (updateResult && updateResult.success) {
                        console.log('✅ Existing user login updated successfully');
                        
                        // Store user name BEFORE clearing pending data
                        const userName = this.pendingUserData ? this.pendingUserData.name : 'User';
                        
                        // Set current user session
                        await this.setCurrentUserSession(normalizedPhone);
                        
                        // Clear pending data and OTP data on success
                        this.pendingUserData = null;
                        this.clearOTPData();
                        
                        return {
                            success: true,
                            message: 'Welcome back! You have been logged in successfully.',
                            user: {
                                phone: normalizedPhone,
                                name: userName,
                                isNewUser: false
                            }
                        };
                    } else {
                        throw new Error('Failed to update user login');
                    }
                } else {
                    // It's a new user signup
                    console.log('👤 Creating new user in Firebase after OTP verification');
                    
                    // Ensure the pending data has the verified status
                    this.pendingUserData.isVerified = true;
                    this.pendingUserData.registrationDate = new Date().toISOString();
                    this.pendingUserData.lastLogin = new Date().toISOString();
                    
                    // Save user to Firebase
                    userResult = await this.saveUserToFirebase(this.pendingUserData);
                    
                    if (userResult && userResult.success) {
                        console.log('✅ New user created successfully in Firebase');
                        
                        // Set current user session
                        await this.setCurrentUserSession(normalizedPhone);
                        
                        // Store user name before clearing pending data
                        const userName = this.pendingUserData ? this.pendingUserData.name : 'User';
                        
                        // Clear pending data and OTP data on success
                        this.pendingUserData = null;
                        this.clearOTPData();
                        
                        return {
                            success: true,
                            message: 'Phone number verified and account created successfully!',
                            user: {
                                phone: normalizedPhone,
                                name: userName,
                                isNewUser: true
                            }
                        };
                    } else {
                        throw new Error('Failed to create user account');
                    }
                }
            } else {
                // It's a signin - check if user exists in Firebase
                console.log('🔍 Checking existing user in Firebase for signin');
                
                const existingUser = await this.getUserFromFirebase(normalizedPhone);
                
                if (existingUser) {
                    console.log('👤 Existing user found, updating last login');
                    
                    // Update last login in Firebase
                    await this.updateUserInFirebase(normalizedPhone, {
                        lastLogin: new Date().toISOString(),
                        isVerified: true
                    });
                    
                    // Set current user session
                    await this.setCurrentUserSession(normalizedPhone);
                    
                    // Clear OTP data on success
                    this.clearOTPData();
                    
                    return {
                        success: true,
                        message: 'Phone number verified successfully!',
                        user: {
                            phone: normalizedPhone,
                            name: existingUser.name,
                            isNewUser: false
                        }
                    };
                } else {
                    throw new Error('No account found with this phone number. Please sign up first.');
                }
            }

        } catch (error) {
            console.error('❌ Error verifying OTP:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Save user data to Firebase
     */
    async saveUserToFirebase(userData) {
        try {
            // Wait for Firebase API to be available
            let retries = 0;
            const maxRetries = 10;
            
            while (!window.jbAPI && retries < maxRetries) {
                console.log('⏳ Waiting for Firebase API... attempt', retries + 1);
                await new Promise(resolve => setTimeout(resolve, 500));
                retries++;
            }
            
            if (!window.jbAPI) {
                console.error('❌ Firebase API not available after waiting');
                return { success: false, error: 'Firebase API not available after waiting' };
            }
            
            console.log('💾 Saving user to Firebase:', userData);
            const result = await window.jbAPI.createUser(userData);
            
            if (result.success) {
                console.log('✅ User saved to Firebase successfully');
                return { success: true, userId: result.userId };
            } else {
                console.error('❌ Failed to save user to Firebase:', result.error);
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('❌ Error saving user to Firebase:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get user data from Firebase
     */
    async getUserFromFirebase(phoneNumber) {
        try {
            // Wait for Firebase API to be available
            let retries = 0;
            const maxRetries = 10;
            
            while (!window.jbAPI && retries < maxRetries) {
                console.log('⏳ Waiting for Firebase API for getUserFromFirebase... attempt', retries + 1);
                await new Promise(resolve => setTimeout(resolve, 500));
                retries++;
            }
            
            if (!window.jbAPI) {
                console.error('❌ Firebase API not available for getUserFromFirebase');
                return null;
            }
            
            console.log('🔍 Getting user from Firebase:', phoneNumber);
            const result = await window.jbAPI.getUserByPhone(phoneNumber);
            
            if (result.success && result.user) {
                console.log('👤 User found in Firebase:', result.user.name);
                return result.user;
            } else {
                console.log('❌ User not found in Firebase');
                return null;
            }
        } catch (error) {
            console.error('❌ Error getting user from Firebase:', error);
            return null;
        }
    }

    /**
     * Update user data in Firebase
     */
    async updateUserInFirebase(phoneNumber, updateData) {
        try {
            // Wait for Firebase API to be available
            let retries = 0;
            const maxRetries = 10;
            
            while (!window.jbAPI && retries < maxRetries) {
                console.log('⏳ Waiting for Firebase API for updateUserInFirebase... attempt', retries + 1);
                await new Promise(resolve => setTimeout(resolve, 500));
                retries++;
            }
            
            if (!window.jbAPI) {
                console.error('❌ Firebase API not available for updateUserInFirebase');
                return false;
            }
            
            // Get user first to get their document ID
            const existingUser = await this.getUserFromFirebase(phoneNumber);
            if (!existingUser) {
                console.error('❌ User not found for update');
                return false;
            }
            
            // Update user data
            await window.jbAPI.db.collection('users').doc(existingUser.docId).update(updateData);
            console.log('✅ User updated in Firebase');
            return true;
        } catch (error) {
            console.error('❌ Error updating user in Firebase:', error);
            return false;
        }
    }

    /**
     * Set current user session (Firebase-only, no localStorage)
     */
    async setCurrentUserSession(phoneNumber) {
        try {
            console.log('🔒 Setting current user session:', phoneNumber);
            
            // Only store the current user phone in localStorage for session management
            // All user data will be retrieved from Firebase when needed
            localStorage.setItem('jb_current_user', phoneNumber);
            
            // Dispatch session change event
            window.dispatchEvent(new Event('authStateChanged'));
            
            console.log('✅ User session set successfully');
        } catch (error) {
            console.error('❌ Error setting user session:', error);
        }
    }

    /**
     * Get current authenticated user from Firebase
     */
    async getCurrentUser() {
        try {
            const currentUserPhone = localStorage.getItem('jb_current_user');
            if (!currentUserPhone) {
                console.log('❌ No current user session');
                return null;
            }
            
            console.log('🔍 Getting current user from Firebase:', currentUserPhone);
            const user = await this.getUserFromFirebase(currentUserPhone);
            
            if (user) {
                console.log('👤 Current user retrieved from Firebase:', user.name);
                return {
                    phone: user.phone,
                    name: user.name,
                    email: user.email,
                    signInMethod: user.signInMethod || 'phone'
                };
            } else {
                console.log('❌ Current user not found in Firebase, clearing session');
                this.logout();
                return null;
            }
        } catch (error) {
            console.error('❌ Error getting current user:', error);
            return null;
        }
    }

    /**
     * Logout user (clear session only, keep Firebase data)
     */
    logout() {
        console.log('🚪 Logging out user');
        
        // Only clear the session, not Firebase data
        localStorage.removeItem('jb_current_user');
        
        // Dispatch session change event
        window.dispatchEvent(new Event('authStateChanged'));
        
        console.log('✅ User logged out successfully');
    }

    /**
     * Validate phone number format
     */
    validatePhoneNumber(phone) {
        // Remove any non-digit characters
        const cleanPhone = phone.replace(/\D/g, '');
        
        // Check if it's 10 digits (Indian mobile number)
        if (cleanPhone.length === 10 && cleanPhone.startsWith('9') || cleanPhone.startsWith('8') || cleanPhone.startsWith('7') || cleanPhone.startsWith('6')) {
            return true;
        }
        
        // Check if it's 12 digits with country code (91)
        if (cleanPhone.length === 12 && cleanPhone.startsWith('91')) {
            return true;
        }
        
        return false;
    }

    /**
     * Generate unique user ID
     */
    generateUserId() {
        return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Start OTP expiry timer
     */
    startOTPTimer() {
        this.clearOTPTimer();
        
        this.otpTimer = setTimeout(() => {
            console.log('⏰ OTP expired');
            this.clearOTPData();
        }, this.otpExpiryTime);
    }

    /**
     * Clear OTP timer
     */
    clearOTPTimer() {
        if (this.otpTimer) {
            clearTimeout(this.otpTimer);
            this.otpTimer = null;
        }
    }

    /**
     * Check if OTP has expired
     */
    isOTPExpired() {
        // For demo purposes, OTPs don't expire quickly
        // In production, you'd track the actual expiry time
        return false;
    }

    /**
     * Clear OTP data
     */
    clearOTPData() {
        this.currentOTP = null;
        this.currentPhone = null;
        this.clearOTPTimer();
    }

    /**
     * Clear all user data (for testing only)
     */
    async clearAllUserData() {
        try {
            console.log('🗑️ Clearing all user data');
            
            // Clear session
            localStorage.removeItem('jb_current_user');
            
            // Clear pending data
            this.pendingUserData = null;
            this.clearOTPData();
            
            console.log('✅ All user data cleared');
            
            // Dispatch session change event
            window.dispatchEvent(new Event('authStateChanged'));
            
        } catch (error) {
            console.error('❌ Error clearing user data:', error);
        }
    }
}

// Create global instance
const otpAuth = new OTPAuth();

// Export for use in other files
window.otpAuth = otpAuth;