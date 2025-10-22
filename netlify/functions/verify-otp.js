/**
 * Netlify Function: Verify OTP
 * Production-ready serverless OTP verification
 */

const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const jwt = require('jsonwebtoken');

// In-memory OTP store (shared with send-otp function)
// In production, use Firebase Firestore for persistence
const otpStore = new Map();

// Configuration
const JWT_SECRET = process.env.JWT_SECRET || 'jb-creations-secret-key-change-in-production';
const MAX_ATTEMPTS = 3;

// Initialize Firebase Admin (if not already initialized)
let db;
try {
    if (process.env.FIREBASE_SERVICE_ACCOUNT) {
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
        initializeApp({
            credential: cert(serviceAccount)
        });
        db = getFirestore();
    }
} catch (error) {
    console.log('Firebase Admin not initialized:', error.message);
}

/**
 * Format phone number
 */
function formatPhoneNumber(phone) {
    let cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.startsWith('91') && cleaned.length === 12) {
        cleaned = cleaned.substring(2);
    }
    
    if (!/^[6-9]\d{9}$/.test(cleaned)) {
        throw new Error('Invalid Indian mobile number');
    }
    
    return cleaned;
}

/**
 * Generate user ID
 */
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Get or create user in Firebase
 */
async function getOrCreateUser(phone) {
    if (!db) {
        // Fallback if Firebase is not configured
        return {
            id: generateUserId(),
            phone: phone,
            name: 'User ' + phone.substring(6),
            created_at: new Date().toISOString()
        };
    }

    try {
        const usersRef = db.collection('users');
        const snapshot = await usersRef.where('phone', '==', phone).limit(1).get();

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            const userData = { id: doc.id, ...doc.data() };
            
            // Update last login
            await usersRef.doc(doc.id).update({
                last_login: new Date().toISOString()
            });
            
            return userData;
        } else {
            // Create new user
            const newUser = {
                phone: phone,
                name: 'User ' + phone.substring(6),
                sign_in_method: 'phone',
                created_at: new Date().toISOString(),
                last_login: new Date().toISOString(),
                is_active: true
            };
            
            const docRef = await usersRef.add(newUser);
            return { id: docRef.id, ...newUser };
        }
    } catch (error) {
        console.error('Firebase error:', error);
        throw error;
    }
}

/**
 * Main handler
 */
exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, message: 'Method not allowed' })
        };
    }

    try {
        const { phoneNumber, otp } = JSON.parse(event.body);

        // Validate input
        if (!phoneNumber || !otp) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Phone number and OTP are required' 
                })
            };
        }

        const formattedPhone = formatPhoneNumber(phoneNumber);

        // Get stored OTP
        const storedData = otpStore.get(formattedPhone);

        if (!storedData) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'OTP not found or expired. Please request a new OTP.' 
                })
            };
        }

        // Check if OTP is expired
        if (Date.now() > storedData.expiresAt) {
            otpStore.delete(formattedPhone);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'OTP has expired. Please request a new OTP.' 
                })
            };
        }

        // Check attempts
        if (storedData.attempts >= MAX_ATTEMPTS) {
            otpStore.delete(formattedPhone);
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Maximum verification attempts exceeded. Please request a new OTP.' 
                })
            };
        }

        // Verify OTP
        if (otp !== storedData.otp) {
            storedData.attempts = (storedData.attempts || 0) + 1;
            otpStore.set(formattedPhone, storedData);
            
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ 
                    success: false, 
                    message: 'Invalid OTP. Please try again.',
                    attemptsRemaining: MAX_ATTEMPTS - storedData.attempts
                })
            };
        }

        // OTP verified successfully - remove from store
        otpStore.delete(formattedPhone);

        // Get or create user
        const user = await getOrCreateUser(formattedPhone);

        // Generate JWT token
        const token = jwt.sign(
            { 
                userId: user.id, 
                phone: user.phone,
                name: user.name
            },
            JWT_SECRET,
            { expiresIn: '30d' }
        );

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                message: 'Login successful!',
                user: {
                    id: user.id,
                    name: user.name,
                    phone: user.phone
                },
                token: token
            })
        };

    } catch (error) {
        console.error('Verify OTP Error:', error);
        
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                message: error.message || 'Failed to verify OTP. Please try again.'
            })
        };
    }
};
