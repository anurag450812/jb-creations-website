/**
 * Fast2SMS OTP Authentication System v3.0
 * PRODUCTION VERSION - Real SMS OTP via Fast2SMS DLT API
 * NO DEMO CODE - ALL OTPs ARE REAL
 */

class OTPAuthRealSMS {
    constructor() {
        this.currentPhone = null;
        this.pendingUserData = null;
        this.otpClient = typeof otpClient !== 'undefined' ? otpClient : null;
        
        if (!this.otpClient) {
            console.error('❌ Fast2SMS OTP client NOT available!');
            console.error('❌ Backend server must be running on http://localhost:3001');
        } else {
            console.log('✅✅✅ Fast2SMS OTP v3.0 - REAL SMS ONLY ✅✅✅');
            console.log('📱 All OTPs will be sent via SMS to user phones');
            console.log('🚫 NO DEMO MODE - NO FAKE OTPs');
        }
    }

    /**
     * Send REAL OTP via Fast2SMS API
     */
    async sendOTP(phoneNumber, userData = null) {
        try {
            console.log('═══════════════════════════════════════');
            console.log('📱 SENDING REAL OTP VIA FAST2SMS');
            console.log('Phone:', phoneNumber);
            console.log('═══════════════════════════════════════');

            if (!this.otpClient) {
                const error = 'Fast2SMS OTP service not available. Backend server is not running!';
                console.error('❌', error);
                throw new Error(error);
            }

            // Validate phone number
            if (!this.validatePhoneNumber(phoneNumber)) {
                throw new Error('Please enter a valid 10-digit phone number');
            }

            this.currentPhone = phoneNumber;
            const type = userData ? 'register' : 'login';
            
            console.log('🔄 Calling Fast2SMS API...');
            
            // Send REAL OTP via Fast2SMS
            const result = await this.otpClient.sendOTP(phoneNumber, type);
            
            console.log('📡 Fast2SMS API Response:', result);
            
            if (!result.success) {
                const errorMsg = result.message || 'Failed to send OTP via SMS';
                console.error('❌ Fast2SMS Error:', errorMsg);
                throw new Error(errorMsg);
            }
            
            console.log('✅ REAL SMS OTP SENT SUCCESSFULLY!');
            console.log('📱 User should receive SMS within 10 seconds');
            
            // For signup, store user data temporarily
            if (userData) {
                console.log('📋 Processing user data for registration...');
                
                const normalizedPhone = phoneNumber.startsWith('+91') ? phoneNumber : '+91' + phoneNumber;
                
                // Check if user already exists
                const existingUser = await this.getUserFromFirebase(normalizedPhone);
                
                if (existingUser) {
                    console.log('👤 User already registered:', existingUser.name);
                    this.pendingUserData = {
                        phone: normalizedPhone,
                        name: existingUser.name,
                        email: existingUser.email,
                        signInMethod: 'phone',
                        isVerified: true,
                        isExistingUser: true
                    };
                } else {
                    console.log('✨ New user - will register after OTP verification');
                    this.pendingUserData = {
                        phone: normalizedPhone,
                        name: userData.name,
                        email: userData.email || '',
                        signInMethod: 'phone',
                        isVerified: false,
                        isExistingUser: false
                    };
                }
            }
            
            return {
                success: true,
                message: 'OTP sent successfully via SMS. Check your phone.',
                phoneNumber: phoneNumber,
                expiresAt: result.expiresAt
            };

        } catch (error) {
            console.error('═══════════════════════════════════════');
            console.error('❌ ERROR SENDING OTP:', error.message);
            console.error('═══════════════════════════════════════');
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Verify REAL OTP via Fast2SMS API
     */
    async verifyOTP(phoneNumber, enteredOTP) {
        try {
            console.log('═══════════════════════════════════════');
            console.log('🔍 VERIFYING OTP VIA FAST2SMS');
            console.log('Phone:', phoneNumber);
            console.log('OTP:', enteredOTP);
            console.log('═══════════════════════════════════════');

            if (!this.otpClient) {
                throw new Error('Fast2SMS OTP service not available');
            }

            if (!phoneNumber || !enteredOTP) {
                throw new Error('Phone number and OTP are required');
            }

            console.log('🔄 Calling Fast2SMS verify API...');

            // Verify OTP via Fast2SMS
            const result = await this.otpClient.verifyOTP(phoneNumber, enteredOTP);
            
            console.log('📡 Verification Response:', result);
            
            if (!result.success) {
                const errorMsg = result.message || 'Invalid OTP';
                console.error('❌ Verification Failed:', errorMsg);
                throw new Error(errorMsg);
            }

            console.log('✅ OTP VERIFIED SUCCESSFULLY!');

            const normalizedPhone = phoneNumber.startsWith('+91') ? phoneNumber : '+91' + phoneNumber;

            // Handle user registration/login
            if (this.pendingUserData) {
                if (this.pendingUserData.isExistingUser) {
                    console.log('👤 Logging in existing user...');
                    // Existing user login
                    await this.saveUserToFirebase({
                        ...this.pendingUserData,
                        lastLogin: new Date().toISOString(),
                        isVerified: true
                    });
                    
                    const userName = this.pendingUserData.name;
                    await this.setCurrentUserSession(normalizedPhone);
                    this.pendingUserData = null;
                    
                    console.log('✅ User logged in:', userName);
                    
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
                    console.log('✨ Creating new user account...');
                    // New user registration
                    this.pendingUserData.isVerified = true;
                    this.pendingUserData.registrationDate = new Date().toISOString();
                    this.pendingUserData.lastLogin = new Date().toISOString();
                    
                    await this.saveUserToFirebase(this.pendingUserData);
                    
                    const userName = this.pendingUserData.name;
                    await this.setCurrentUserSession(normalizedPhone);
                    this.pendingUserData = null;
                    
                    console.log('✅ New user registered:', userName);
                    
                    return {
                        success: true,
                        message: 'Account created successfully! Welcome to Xidlz!',
                        user: {
                            phone: normalizedPhone,
                            name: userName,
                            isNewUser: true
                        }
                    };
                }
            } else {
                // Login only - backend already verified user exists
                console.log('✅ Login successful - backend verified user and OTP');
                
                // Get user info from Firebase for session data
                const existingUser = await this.getUserFromFirebase(normalizedPhone);
                
                if (existingUser) {
                    await this.updateUserInFirebase(normalizedPhone, {
                        lastLogin: new Date().toISOString(),
                        isVerified: true
                    });
                    
                    await this.setCurrentUserSession(normalizedPhone);
                    
                    console.log('✅ User logged in:', existingUser.name);
                    
                    return {
                        success: true,
                        message: 'Login successful! Welcome back!',
                        user: {
                            phone: normalizedPhone,
                            name: existingUser.name,
                            isNewUser: false
                        }
                    };
                } else {
                    // If not in Firebase, try alternative phone formats
                    console.log('🔍 User not found with', normalizedPhone, ', trying alternative formats...');
                    
                    let alternativeUser = null;
                    const phoneWithoutPrefix = normalizedPhone.replace('+91', '');
                    const phoneWithPrefix = normalizedPhone.startsWith('+91') ? normalizedPhone : '+91' + normalizedPhone;
                    
                    // Try different phone formats
                    if (!alternativeUser && phoneWithoutPrefix !== normalizedPhone) {
                        alternativeUser = await this.getUserFromFirebase(phoneWithoutPrefix);
                        console.log('📱 Trying phone without prefix:', phoneWithoutPrefix, alternativeUser ? '✅ Found' : '❌ Not found');
                    }
                    
                    if (!alternativeUser && phoneWithPrefix !== normalizedPhone) {
                        alternativeUser = await this.getUserFromFirebase(phoneWithPrefix);
                        console.log('📱 Trying phone with prefix:', phoneWithPrefix, alternativeUser ? '✅ Found' : '❌ Not found');
                    }
                    
                    if (alternativeUser) {
                        // Found user with alternative format
                        await this.updateUserInFirebase(phoneWithPrefix, {
                            lastLogin: new Date().toISOString(),
                            isVerified: true
                        });
                        
                        await this.setCurrentUserSession(phoneWithPrefix);
                        
                        console.log('✅ User found with alternative format:', alternativeUser.name);
                        
                        return {
                            success: true,
                            message: 'Login successful! Welcome back!',
                            user: {
                                phone: phoneWithPrefix,
                                name: alternativeUser.name,
                                isNewUser: false
                            }
                        };
                    } else {
                        // Last resort: Create session with phone verification only
                        console.log('⚠️ User verified by backend but not found in Firebase, creating basic session');
                        localStorage.setItem('jb_current_user', JSON.stringify({
                            phone: normalizedPhone,
                            name: 'Verified User', // Better default name
                            signInMethod: 'phone',
                            loginTime: new Date().toISOString(),
                            isVerifiedByOTP: true
                        }));
                        
                        console.log('✅ User logged in with phone verification only');
                        
                        return {
                            success: true,
                            message: 'Login successful! Phone verified.',
                            user: {
                                phone: normalizedPhone,
                                name: 'Verified User',
                                isNewUser: false
                            }
                        };
                    }
                }
            }

        } catch (error) {
            console.error('═══════════════════════════════════════');
            console.error('❌ ERROR VERIFYING OTP:', error.message);
            console.error('═══════════════════════════════════════');
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Save or update user in Firebase
     */
    async saveUserToFirebase(userData) {
        try {
            if (typeof window.firebaseClient !== 'undefined') {
                const result = await window.firebaseClient.saveUser(userData);
                return { success: true, data: result };
            }
            return { success: true };
        } catch (error) {
            console.error('Error saving to Firebase:', error);
            return { success: false, error: error.message };
        }
    }

    /**
     * Get user from Firebase
     */
    async getUserFromFirebase(phoneNumber) {
        try {
            console.log('🔍 Looking up user in Firebase with phone:', phoneNumber);
            if (typeof window.jbAPI !== 'undefined') {
                const result = await window.jbAPI.getUserByPhone(phoneNumber);
                console.log('📱 Firebase getUserByPhone result:', result);
                
                // Check if we got a successful result with user data
                if (result && result.success && result.user) {
                    console.log('✅ Found user in Firebase:', result.user.name);
                    return result.user;
                }
                
                // Try alternative phone formats if first attempt failed
                if (!result || !result.success) {
                    if (phoneNumber.startsWith('+91')) {
                        // Try without +91 prefix
                        const phoneWithoutPrefix = phoneNumber.replace('+91', '');
                        console.log('🔄 Trying without +91 prefix:', phoneWithoutPrefix);
                        const altResult = await window.jbAPI.getUserByPhone(phoneWithoutPrefix);
                        console.log('📱 Alternative lookup result:', altResult);
                        if (altResult && altResult.success && altResult.user) {
                            return altResult.user;
                        }
                    } else if (!phoneNumber.startsWith('+91')) {
                        // Try with +91 prefix
                        const phoneWithPrefix = '+91' + phoneNumber;
                        console.log('🔄 Trying with +91 prefix:', phoneWithPrefix);
                        const altResult = await window.jbAPI.getUserByPhone(phoneWithPrefix);
                        console.log('📱 Alternative lookup result:', altResult);
                        if (altResult && altResult.success && altResult.user) {
                            return altResult.user;
                        }
                    }
                    
                    // Also try the raw 10-digit format if we have 13 digits
                    if (phoneNumber.length === 13 && phoneNumber.startsWith('91')) {
                        const phoneWithoutCountryCode = phoneNumber.substring(2);
                        console.log('🔄 Trying raw 10-digit format:', phoneWithoutCountryCode);
                        const altResult = await window.jbAPI.getUserByPhone(phoneWithoutCountryCode);
                        console.log('📱 Raw 10-digit lookup result:', altResult);
                        if (altResult && altResult.success && altResult.user) {
                            return altResult.user;
                        }
                    }
                }
                
                console.log('❌ User not found in any phone format');
                return null;
            }
            console.log('❌ jbAPI not available');
            return null;
        } catch (error) {
            console.error('Error getting user from Firebase:', error);
            return null;
        }
    }

    /**
     * Update user in Firebase
     */
    async updateUserInFirebase(phoneNumber, updateData) {
        try {
            if (typeof window.firebaseClient !== 'undefined') {
                return await window.firebaseClient.updateUser(phoneNumber, updateData);
            }
            return { success: true };
        } catch (error) {
            console.error('Error updating Firebase:', error);
            return { success: false };
        }
    }

    /**
     * Set current user session
     */
    async setCurrentUserSession(phoneNumber) {
        try {
            const user = await this.getUserFromFirebase(phoneNumber);
            if (user) {
                localStorage.setItem('jb_current_user', JSON.stringify({
                    phone: phoneNumber,
                    name: user.name,
                    email: user.email,
                    signInMethod: 'phone',
                    loginTime: new Date().toISOString()
                }));
                console.log('✅ User session created');
            }
        } catch (error) {
            console.error('Error setting session:', error);
        }
    }

    /**
     * Get current user
     */
    async getCurrentUser() {
        try {
            const userData = localStorage.getItem('jb_current_user');
            if (userData) {
                const user = JSON.parse(userData);
                
                // If we have a basic user without proper name, try to refresh from Firebase
                if (user && (user.name === 'User' || user.name === 'Verified User') && user.phone) {
                    console.log('🔄 Refreshing user data from Firebase for:', user.phone);
                    const firebaseUser = await this.getUserFromFirebase(user.phone);
                    
                    if (firebaseUser && firebaseUser.name) {
                        // Update localStorage with proper user data
                        const updatedUser = {
                            ...user,
                            name: firebaseUser.name,
                            email: firebaseUser.email || user.email
                        };
                        localStorage.setItem('jb_current_user', JSON.stringify(updatedUser));
                        console.log('✅ User data refreshed from Firebase:', firebaseUser.name);
                        return updatedUser;
                    }
                }
                
                return user;
            }
            return null;
        } catch (error) {
            console.error('Error getting current user:', error);
            return null;
        }
    }

    /**
     * Get user by phone
     */
    async getUserByPhone(phoneNumber) {
        return await this.getUserFromFirebase(phoneNumber);
    }

    /**
     * Register new user
     */
    async registerNewUser(userData) {
        return await this.sendOTP(userData.phone, userData);
    }

    /**
     * Logout user
     */
    logout() {
        localStorage.removeItem('jb_current_user');
        this.currentPhone = null;
        this.pendingUserData = null;
        console.log('👋 User logged out');
    }

    /**
     * Validate phone number
     */
    validatePhoneNumber(phone) {
        const cleaned = phone.replace(/\D/g, '');
        let phoneNum = cleaned;
        
        if (phoneNum.startsWith('91') && phoneNum.length === 12) {
            phoneNum = phoneNum.substring(2);
        }
        
        return /^[6-9]\d{9}$/.test(phoneNum);
    }
}

// Initialize and export - REAL SMS VERSION
const otpAuth = new OTPAuthRealSMS();
window.otpAuth = otpAuth;

console.log('🚀🚀🚀 FAST2SMS OTP v3.0 LOADED 🚀🚀🚀');
console.log('📱 REAL SMS OTP SYSTEM ACTIVE');
console.log('🚫 NO DEMO MODE');
console.log('✅ All OTP messages will be sent via Fast2SMS DLT');
