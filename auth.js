/*
 * Mobile OTP Authentication JavaScript with Firebase
 * Handles mobile number sign up, sign in with Firebase OTP verification
 */

// Authentication state management
const authState = {
    isAuthenticated: false,
    user: null,
    currentPhone: null,
    otpTimer: null,
    signupData: null
};

// Initialize authentication on page load
document.addEventListener('DOMContentLoaded', function() {
    checkAuthState();
    setupOtpInputs();
    setupPhoneValidation();
    
    // Don't initialize reCAPTCHA immediately to avoid conflicts
    // It will be initialized when needed (when user tries to send OTP)
    console.log('🔥 Auth system ready - reCAPTCHA will initialize on demand');
});

// Reset authentication state (useful for retrying)
function resetAuthState() {
    console.log('🔄 Resetting authentication state...');
    
    // Clear reCAPTCHA
    if (recaptchaVerifier) {
        try {
            recaptchaVerifier.clear();
            console.log('🧹 Cleared reCAPTCHA verifier');
        } catch (error) {
            console.log('🧹 reCAPTCHA clear error (safe to ignore):', error.message);
        }
        recaptchaVerifier = null;
    }
    
    // Clear confirmation result
    confirmationResult = null;
    
    // Remove all reCAPTCHA containers
    const oldContainers = document.querySelectorAll('[id^="recaptcha-container"]');
    oldContainers.forEach(container => {
        container.remove();
        console.log('🗑️ Removed old reCAPTCHA container during reset');
    });
    
    // Re-initialize reCAPTCHA with fresh container
    setTimeout(() => {
        initializeRecaptcha();
        console.log('✅ Authentication state reset complete');
    }, 500);
}

// Check if user is already authenticated
function checkAuthState() {
    const storedUser = localStorage.getItem('jb_user') || sessionStorage.getItem('jb_user');
    if (storedUser) {
        try {
            authState.user = JSON.parse(storedUser);
            authState.isAuthenticated = true;
            
            // Only redirect if we're on auth.html and there's a redirect URL
            const currentPage = window.location.pathname.split('/').pop() || 'index.html';
            if (currentPage === 'auth.html') {
                // If coming from a specific page, redirect back
                const redirectUrl = sessionStorage.getItem('auth_redirect') || 'index.html';
                sessionStorage.removeItem('auth_redirect');
                window.location.href = redirectUrl;
            }
        } catch (error) {
            console.error('Error parsing stored user data:', error);
            clearAuthData();
        }
    }
}

// Switch between sign in and sign up tabs
function switchTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.auth-tab').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    // Update forms
    document.querySelectorAll('.auth-form').forEach(form => form.classList.remove('active'));
    
    if (tab === 'signin') {
        document.getElementById('signinForm').classList.add('active');
        // Reset to phone step
        document.getElementById('phoneStep').style.display = 'block';
        document.getElementById('otpStep').style.display = 'none';
    } else {
        document.getElementById('signupForm').classList.add('active');
        // Reset to phone step
        document.getElementById('signupPhoneStep').style.display = 'block';
        document.getElementById('signupOtpStep').style.display = 'none';
    }
    
    // Clear any errors
    clearAllErrors();
}

// Setup OTP input functionality
function setupOtpInputs() {
    setupOtpInput('.otp-input');
    setupOtpInput('.signup-otp-input');
}

function setupOtpInput(selector) {
    const inputs = document.querySelectorAll(selector);
    
    inputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            
            // Only allow numbers
            if (!/^\d$/.test(value)) {
                e.target.value = '';
                return;
            }
            
            // Add filled class
            e.target.classList.add('filled');
            
            // Move to next input
            if (value && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });
        
        input.addEventListener('keydown', (e) => {
            // Handle backspace
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                inputs[index - 1].focus();
                inputs[index - 1].classList.remove('filled');
            }
        });
        
        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const paste = e.clipboardData.getData('text');
            const numbers = paste.replace(/\D/g, '').slice(0, inputs.length);
            
            numbers.split('').forEach((num, i) => {
                if (inputs[i]) {
                    inputs[i].value = num;
                    inputs[i].classList.add('filled');
                }
            });
            
            // Focus next empty input or last input
            const nextEmpty = Array.from(inputs).find(input => !input.value);
            if (nextEmpty) {
                nextEmpty.focus();
            } else {
                inputs[inputs.length - 1].focus();
            }
        });
    });
}

// Setup phone number validation
function setupPhoneValidation() {
    const phoneInputs = document.querySelectorAll('input[type="tel"]');
    
    phoneInputs.forEach(input => {
        input.addEventListener('input', (e) => {
            // Only allow numbers
            e.target.value = e.target.value.replace(/\D/g, '');
            
            // Validate length
            if (e.target.value.length === 10) {
                clearError(e.target.id + 'Error');
            }
        });
    });
}

// Send OTP for login
async function sendOtp(event) {
    event.preventDefault();
    
    const phone = document.getElementById('loginPhone').value;
    const termsChecked = document.getElementById('termsCheckbox').checked;
    
    // Validate phone
    if (!validatePhone(phone)) {
        showError('loginPhoneError', 'Please enter a valid 10-digit mobile number');
        return;
    }
    
    if (!termsChecked) {
        alert('Please accept the terms and conditions to continue');
        return;
    }
    
    // Show loading
    showLoading(true);
    
    try {
        // Use MSG91 OTP sending
        const result = await simulateOtpSend(phone);
        
        // Store phone number
        authState.currentPhone = '+91' + phone;
        
        // Show OTP step
        showOtpStep(phone);
        
        showLoading(false);
        showSuccess('OTP sent successfully to +91' + phone);
        
    } catch (error) {
        showLoading(false);
        
        // Show user-friendly error message if available
        const errorMessage = error.message || 'Failed to send OTP. Please try again.';
        showError('loginPhoneError', errorMessage);
        
        console.error('OTP send error:', error);
    }
}

// Send OTP for signup
async function sendSignupOtp(event) {
    event.preventDefault();
    
    const name = document.getElementById('signupName').value;
    const phone = document.getElementById('signupPhone').value;
    const email = document.getElementById('signupEmail').value;
    const termsChecked = document.getElementById('signupTermsCheckbox').checked;
    
    // Validate inputs
    if (!name.trim()) {
        showError('signupNameError', 'Please enter your full name');
        return;
    }
    
    if (!validatePhone(phone)) {
        showError('signupPhoneError', 'Please enter a valid 10-digit mobile number');
        return;
    }
    
    if (email && !validateEmail(email)) {
        showError('signupEmailError', 'Please enter a valid email address');
        return;
    }
    
    if (!termsChecked) {
        alert('Please accept the terms and conditions to continue');
        return;
    }
    
    // Check if user already exists
    const existingUser = getUserByPhone(phone);
    if (existingUser) {
        showError('signupPhoneError', 'An account with this mobile number already exists. Please login instead.');
        return;
    }
    
    // Show loading
    showLoading(true);
    
    try {
        // Use Firebase OTP sending
        await simulateOtpSend(phone);
        
        // Store signup data
        authState.signupData = {
            name: name.trim(),
            phone: '+91' + phone,
            email: email.trim() || null
        };
        
        // Show OTP step
        showSignupOtpStep(phone);
        
        showLoading(false);
        showSuccess('OTP sent successfully to +91' + phone);
        
    } catch (error) {
        showLoading(false);
        
        // Show user-friendly error message if available
        const errorMessage = error.userMessage || 'Failed to send OTP. Please try again.';
        showError('signupPhoneError', errorMessage);
        
        console.error('OTP send error:', error);
    }
}

// Show OTP verification step for login
function showOtpStep(phone) {
    document.getElementById('phoneStep').style.display = 'none';
    document.getElementById('otpStep').style.display = 'block';
    document.getElementById('phoneDisplay').textContent = '+91' + phone;
    
    // Start timer
    startTimer('timer', 'resendBtn');
    
    // Focus first OTP input
    document.querySelector('.otp-input').focus();
}

// Show OTP verification step for signup
function showSignupOtpStep(phone) {
    document.getElementById('signupPhoneStep').style.display = 'none';
    document.getElementById('signupOtpStep').style.display = 'block';
    document.getElementById('signupPhoneDisplay').textContent = '+91' + phone;
    
    // Start timer
    startTimer('signupTimer', 'signupResendBtn');
    
    // Focus first OTP input
    document.querySelector('.signup-otp-input').focus();
}

// Go back to phone step from OTP
function goBackToPhone() {
    document.getElementById('otpStep').style.display = 'none';
    document.getElementById('phoneStep').style.display = 'block';
    
    // Clear OTP inputs
    document.querySelectorAll('.otp-input').forEach(input => {
        input.value = '';
        input.classList.remove('filled');
    });
    
    // Clear timer
    if (authState.otpTimer) {
        clearInterval(authState.otpTimer);
    }
}

// Go back to signup phone step from OTP
function goBackToSignupPhone() {
    document.getElementById('signupOtpStep').style.display = 'none';
    document.getElementById('signupPhoneStep').style.display = 'block';
    
    // Clear OTP inputs
    document.querySelectorAll('.signup-otp-input').forEach(input => {
        input.value = '';
        input.classList.remove('filled');
    });
    
    // Clear timer
    if (authState.otpTimer) {
        clearInterval(authState.otpTimer);
    }
}

// Verify OTP for login
async function verifyOtp(event) {
    event.preventDefault();
    
    const otpInputs = document.querySelectorAll('.otp-input');
    const otp = Array.from(otpInputs).map(input => input.value).join('');
    
    if (otp.length !== 6) {
        showError('otpError', 'Please enter the complete 6-digit OTP');
        return;
    }
    
    showLoading(true);
    
    try {
        // Use MSG91 OTP verification
        const result = await simulateOtpVerify(otp);
        
        if (result && result.verified) {
            // Get or create user
            let user = getUserByPhone(authState.currentPhone.replace('+91', ''));
            
            if (!user) {
                // Create new user with minimal info for login
                user = {
                    id: generateUserId(),
                    phone: authState.currentPhone,
                    name: `User ${authState.currentPhone.slice(-4)}`,
                    email: null,
                    signInMethod: 'phone'
                };
                saveUser(user);
            }
            
            // Set authentication state
            authState.user = user;
            authState.isAuthenticated = true;
            
            // Store in localStorage
            localStorage.setItem('jb_user', JSON.stringify(user));
            
            showLoading(false);
            showSuccess('Login successful! Redirecting...');
            
            // Redirect after short delay
            setTimeout(() => {
                const redirectUrl = sessionStorage.getItem('auth_redirect') || 'index.html';
                sessionStorage.removeItem('auth_redirect');
                window.location.href = redirectUrl;
            }, 1500);
            
        } else {
            showLoading(false);
            const errorMsg = result && result.message ? result.message : 'Invalid OTP. Please try again.';
            showError('otpError', errorMsg);
        }
        
    } catch (error) {
        showLoading(false);
        const errorMsg = error.message || 'Failed to verify OTP. Please try again.';
        showError('otpError', errorMsg);
        console.error('OTP verification error:', error);
    }
}

// Verify OTP for signup
async function verifySignupOtp(event) {
    event.preventDefault();
    
    const otpInputs = document.querySelectorAll('.signup-otp-input');
    const otp = Array.from(otpInputs).map(input => input.value).join('');
    
    if (otp.length !== 6) {
        showError('signupOtpError', 'Please enter the complete 6-digit OTP');
        return;
    }
    
    showLoading(true);
    
    try {
        // Use MSG91 OTP verification
        const result = await simulateOtpVerify(otp);
        
        if (result && result.verified) {
            // Create new user
            const user = {
                id: generateUserId(),
                name: authState.signupData.name,
                phone: authState.signupData.phone,
                email: authState.signupData.email,
                signInMethod: 'phone',
                createdAt: new Date().toISOString()
            };
            
            // Save user
            saveUser(user);
            
            // Set authentication state
            authState.user = user;
            authState.isAuthenticated = true;
            
            // Store in localStorage
            localStorage.setItem('jb_user', JSON.stringify(user));
            
            showLoading(false);
            showSuccess('Account created successfully! Welcome to JB Creations!');
            
            // Redirect after short delay
            setTimeout(() => {
                const redirectUrl = sessionStorage.getItem('auth_redirect') || 'index.html';
                sessionStorage.removeItem('auth_redirect');
                window.location.href = redirectUrl;
            }, 2000);
            
        } else {
            showLoading(false);
            showError('signupOtpError', 'Invalid OTP. Please try again.');
        }
        
    } catch (error) {
        showLoading(false);
        showError('signupOtpError', 'Failed to verify OTP. Please try again.');
        console.error('OTP verification error:', error);
    }
}

// Resend OTP for login
async function resendOtp() {
    try {
        const phone = authState.currentPhone.replace('+91', '');
        await simulateOtpSend(phone);
        
        // Restart timer
        startTimer('timer', 'resendBtn');
        
        showSuccess('OTP sent again to ' + authState.currentPhone);
        
    } catch (error) {
        showError('otpError', 'Failed to resend OTP. Please try again.');
        console.error('OTP resend error:', error);
    }
}

// Resend OTP for signup
async function resendSignupOtp() {
    try {
        const phone = authState.signupData.phone.replace('+91', '');
        await simulateOtpSend(phone);
        
        // Restart timer
        startTimer('signupTimer', 'signupResendBtn');
        
        showSuccess('OTP sent again to ' + authState.signupData.phone);
        
    } catch (error) {
        showError('signupOtpError', 'Failed to resend OTP. Please try again.');
        console.error('OTP resend error:', error);
    }
}

// Start countdown timer
function startTimer(timerId, buttonId) {
    let seconds = 30;
    const timerElement = document.getElementById(timerId);
    const buttonElement = document.getElementById(buttonId);
    
    buttonElement.disabled = true;
    timerElement.parentElement.style.display = 'inline';
    
    authState.otpTimer = setInterval(() => {
        seconds--;
        timerElement.textContent = seconds;
        
        if (seconds <= 0) {
            clearInterval(authState.otpTimer);
            buttonElement.disabled = false;
            timerElement.parentElement.style.display = 'none';
        }
    }, 1000);
}

// Utility functions
function validatePhone(phone) {
    return /^[6-9]\d{9}$/.test(phone);
}

function validateEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function getUserByPhone(phone) {
    const users = JSON.parse(localStorage.getItem('jb_users') || '[]');
    return users.find(user => user.phone === '+91' + phone || user.phone === phone);
}

function saveUser(user) {
    const users = JSON.parse(localStorage.getItem('jb_users') || '[]');
    
    // Remove existing user with same phone
    const filteredUsers = users.filter(u => u.phone !== user.phone);
    
    // Add new user
    filteredUsers.push(user);
    
    localStorage.setItem('jb_users', JSON.stringify(filteredUsers));
}

// Firebase Authentication Functions
let recaptchaVerifier = null;
let confirmationResult = null;
let recaptchaContainerId = 'recaptcha-container';
let recaptchaCounter = 0;

// Initialize reCAPTCHA verifier (required for Firebase phone auth)
function initializeRecaptcha() {
    // Always create a fresh container with unique ID
    recaptchaCounter++;
    recaptchaContainerId = `recaptcha-container-${recaptchaCounter}`;
    
    console.log(`🔧 Creating fresh reCAPTCHA container: ${recaptchaContainerId}`);
    
    // Remove any existing containers
    const oldContainers = document.querySelectorAll('[id^="recaptcha-container"]');
    oldContainers.forEach(container => {
        container.remove();
        console.log('🗑️ Removed old reCAPTCHA container');
    });
    
    // Create new container
    const newContainer = document.createElement('div');
    newContainer.id = recaptchaContainerId;
    newContainer.style.display = 'none';
    document.body.appendChild(newContainer);
    console.log(`✅ Created new reCAPTCHA container: ${recaptchaContainerId}`);
    
    // Clear any existing reCAPTCHA verifier
    if (recaptchaVerifier) {
        try {
            recaptchaVerifier.clear();
            console.log('🧹 Cleared existing reCAPTCHA verifier');
        } catch (error) {
            console.log('🧹 reCAPTCHA clear error (safe to ignore):', error.message);
        }
        recaptchaVerifier = null;
    }
    
    if (window.firebase) {
        try {
            console.log(`🔧 Initializing fresh reCAPTCHA on container: ${recaptchaContainerId}`);
            recaptchaVerifier = new firebase.auth.RecaptchaVerifier(recaptchaContainerId, {
                'size': 'invisible',
                'callback': function (response) {
                    console.log('✅ reCAPTCHA solved successfully');
                },
                'expired-callback': function () {
                    console.log('⚠️ reCAPTCHA expired, will reinitialize');
                    recaptchaVerifier = null;
                }
            });
            console.log('✅ reCAPTCHA initialized successfully');
        } catch (error) {
            console.error('❌ reCAPTCHA initialization failed:', error);
            recaptchaVerifier = null;
        }
    }
}

// Send OTP using Firebase
async function firebaseSendOtp(phoneNumber) {
    return new Promise(async (resolve, reject) => {
        try {
            console.log('🔥 Starting Firebase OTP send process...');
            console.log('📞 Phone number received:', phoneNumber);
            
            // Check if Firebase is loaded
            if (!window.firebase) {
                console.error('❌ Firebase SDK not loaded');
                throw new Error('Firebase SDK not loaded. Please check internet connection.');
            }
            
            if (!window.firebaseAuth) {
                console.error('❌ Firebase Auth not initialized');
                throw new Error('Firebase Auth not initialized. Please refresh the page.');
            }
            
            console.log('✅ Firebase SDK loaded successfully');
            
            // Initialize reCAPTCHA if not already done
            if (!recaptchaVerifier) {
                console.log('🔧 Initializing reCAPTCHA...');
                initializeRecaptcha();
                
                // Wait a moment for reCAPTCHA to initialize
                await new Promise(resolve => setTimeout(resolve, 500));
                
                if (!recaptchaVerifier) {
                    throw new Error('reCAPTCHA initialization failed. Please disable ad blockers and try again.');
                }
            }
            
            console.log('✅ reCAPTCHA ready');
            
            // Format phone number for Firebase (+91xxxxxxxxxx)
            const formattedPhone = phoneNumber.startsWith('+91') ? phoneNumber : '+91' + phoneNumber;
            console.log('📱 Formatted phone number:', formattedPhone);
            
            // Validate phone number format
            if (!/^\+91[6-9]\d{9}$/.test(formattedPhone)) {
                throw new Error('Invalid phone number format. Please enter a valid 10-digit Indian mobile number.');
            }
            
            console.log('🚀 Sending OTP via Firebase...');
            
            // Send OTP using Firebase
            confirmationResult = await firebase.auth().signInWithPhoneNumber(formattedPhone, recaptchaVerifier);
            console.log('✅ OTP sent successfully to', formattedPhone);
            console.log('🔑 Confirmation result received');
            resolve();
            
        } catch (error) {
            console.error('❌ Firebase OTP send error:', error);
            console.error('❌ Error code:', error.code);
            console.error('❌ Error message:', error.message);
            
            // Reset reCAPTCHA on error - create completely fresh instance
            console.log('🔄 Resetting reCAPTCHA due to error...');
            if (recaptchaVerifier) {
                try {
                    recaptchaVerifier.clear();
                } catch (clearError) {
                    console.log('🧹 reCAPTCHA clear error (safe to ignore):', clearError.message);
                }
                recaptchaVerifier = null;
            }
            
            // Remove old containers and create fresh one for next attempt
            const oldContainers = document.querySelectorAll('[id^="recaptcha-container"]');
            oldContainers.forEach(container => {
                container.remove();
                console.log('🗑️ Removed old reCAPTCHA container after error');
            });
            
            // Provide specific error messages
            let userFriendlyMessage = 'Failed to send OTP. ';
            
            switch (error.code) {
                case 'auth/invalid-phone-number':
                    userFriendlyMessage += 'Invalid phone number format. Please enter a valid 10-digit number.';
                    break;
                case 'auth/missing-phone-number':
                    userFriendlyMessage += 'Phone number is required.';
                    break;
                case 'auth/quota-exceeded':
                    userFriendlyMessage += 'SMS quota exceeded. Please try again later.';
                    break;
                case 'auth/captcha-check-failed':
                    userFriendlyMessage += 'reCAPTCHA verification failed. Please refresh and try again.';
                    break;
                case 'auth/too-many-requests':
                    userFriendlyMessage += 'Too many requests. Please wait and try again later.';
                    break;
                default:
                    userFriendlyMessage += 'Please check your internet connection and try again.';
            }
            
            error.userMessage = userFriendlyMessage;
            reject(error);
        }
    });
}

// Verify OTP using Firebase
async function firebaseVerifyOtp(otp) {
    return new Promise(async (resolve, reject) => {
        try {
            if (!confirmationResult) {
                throw new Error('No confirmation result found. Please send OTP first.');
            }
            
            console.log('Verifying OTP:', otp);
            
            // Confirm the OTP
            const result = await confirmationResult.confirm(otp);
            const user = result.user;
            
            console.log('OTP verified successfully:', user.phoneNumber);
            resolve(true);
            
        } catch (error) {
            console.error('Firebase OTP verification error:', error);
            resolve(false);
        }
    });
}

// Legacy functions for backward compatibility (now use MSG91)
async function simulateOtpSend(phone) {
    return await sendOTPViaMSG91(phone);
}

async function simulateOtpVerify(otp) {
    return await verifyOTPViaMSG91(authState.currentPhone, otp);
}

// UI Helper functions
function showLoading(show) {
    const overlay = document.getElementById('loadingOverlay');
    if (show) {
        overlay.classList.add('show');
    } else {
        overlay.classList.remove('show');
    }
}

function showSuccess(message) {
    const successElement = document.getElementById('successMessage');
    successElement.textContent = message;
    successElement.classList.add('show');
    
    setTimeout(() => {
        successElement.classList.remove('show');
    }, 5000);
}

function showError(elementId, message) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.add('show');
    }
}

function clearError(elementId) {
    const errorElement = document.getElementById(elementId);
    if (errorElement) {
        errorElement.textContent = '';
        errorElement.classList.remove('show');
    }
}

function clearAllErrors() {
    document.querySelectorAll('.form-error').forEach(error => {
        error.textContent = '';
        error.classList.remove('show');
    });
}

function clearAuthData() {
    localStorage.removeItem('jb_user');
    sessionStorage.removeItem('jb_user');
    authState.user = null;
    authState.isAuthenticated = false;
}
