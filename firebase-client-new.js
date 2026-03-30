/**
 * Firebase Configuration for Xidlz
 * Complete backend solution - Database, Storage, Authentication
 * Fixed for non-module usage
 */

// Firebase configuration - Your actual project details
const fallbackFirebaseConfig = {
    apiKey: "AIzaSyCQjSWFvoEQHCKZnot8DmcXYk8YKlPiHsI",
    authDomain: "jb-creations-backend.firebaseapp.com",
    projectId: "jb-creations-backend",
    storageBucket: "jb-creations-backend.firebasestorage.app",
    messagingSenderId: "774712815486",
    appId: "1:774712815486:web:c22384c401bd6838ab4d2f"
};

let firebaseConfig = { ...fallbackFirebaseConfig };
let firebaseConfigLoadPromise = null;

// Initialize Firebase when DOM is loaded
let app, db;

const REVIEW_VARIANTS = [
    '13x19-portrait',
    '13x19-landscape',
    '13x10-portrait',
    '13x10-landscape'
];

const DEFAULT_REVIEW_STATS = {
    '13x19-portrait': { totalRatings: 587, totalReviews: 11, avgRating: 4.6, lastIncrementDate: null },
    '13x19-landscape': { totalRatings: 456, totalReviews: 9, avgRating: 4.5, lastIncrementDate: null },
    '13x10-portrait': { totalRatings: 398, totalReviews: 8, avgRating: 4.4, lastIncrementDate: null },
    '13x10-landscape': { totalRatings: 321, totalReviews: 6, avgRating: 4.1, lastIncrementDate: null }
};

const DEFAULT_STOREFRONT_SIZE_PRICING = {
    '13x19-portrait': { size: '13x19', orientation: 'portrait', label: '13x19 Portrait', price: 499, mrp: 999 },
    '13x19-landscape': { size: '13x19', orientation: 'landscape', label: '13x19 Landscape', price: 499, mrp: 999 },
    '13x10-portrait': { size: '13x10', orientation: 'portrait', label: '13x10 Portrait', price: 349, mrp: 799 },
    '13x10-landscape': { size: '13x10', orientation: 'landscape', label: '13x10 Landscape', price: 349, mrp: 799 }
};

const DEFAULT_STOREFRONT_COUPONS = [
    {
        id: 'SAVE100',
        discount: 100,
        minOrder: 500,
        description: '₹100 OFF on orders above ₹500',
        emoji: '🎁',
        accentColor: '#16697A',
        active: true
    },
    {
        id: 'SAVE250',
        discount: 250,
        minOrder: 1000,
        description: '₹250 OFF on orders above ₹1000',
        emoji: '🎉',
        accentColor: '#489FB5',
        active: true
    },
    {
        id: 'SAVE300',
        discount: 300,
        minOrder: 1500,
        description: '₹300 OFF on orders above ₹1500',
        emoji: '💎',
        accentColor: '#FFA62B',
        active: true
    }
];

function getDefaultStorefrontSettings() {
    return {
        sizePricing: JSON.parse(JSON.stringify(DEFAULT_STOREFRONT_SIZE_PRICING)),
        coupons: JSON.parse(JSON.stringify(DEFAULT_STOREFRONT_COUPONS))
    };
}

function normalizeStorefrontSettings(data = {}) {
    const defaults = getDefaultStorefrontSettings();
    const normalizedSizePricing = {};

    Object.keys(defaults.sizePricing).forEach(key => {
        normalizedSizePricing[key] = {
            ...defaults.sizePricing[key],
            ...((data.sizePricing && data.sizePricing[key]) || {})
        };

        normalizedSizePricing[key].price = Number(normalizedSizePricing[key].price) || defaults.sizePricing[key].price;
        normalizedSizePricing[key].mrp = Number(normalizedSizePricing[key].mrp) || defaults.sizePricing[key].mrp;
    });

    const normalizedCoupons = Array.isArray(data.coupons) && data.coupons.length
        ? data.coupons.map((coupon, index) => {
            const fallback = defaults.coupons[index % defaults.coupons.length] || defaults.coupons[0];
            return {
                id: String(coupon.id || fallback.id).trim().toUpperCase(),
                discount: Number(coupon.discount) || fallback.discount,
                minOrder: Number(coupon.minOrder) || fallback.minOrder,
                description: String(coupon.description || fallback.description).trim(),
                emoji: String(coupon.emoji || fallback.emoji).trim() || fallback.emoji,
                accentColor: String(coupon.accentColor || fallback.accentColor).trim() || fallback.accentColor,
                active: coupon.active !== false
            };
        })
        : defaults.coupons;

    return {
        sizePricing: normalizedSizePricing,
        coupons: normalizedCoupons
    };
}

const REVIEW_POOL_NAMES = [
    'Aarav Mehta', 'Aditi Sharma', 'Akash Yadav', 'Akriti Jain', 'Ananya Gupta', 'Ankit Verma', 'Arjun Saini', 'Ayushi Bansal',
    'Bhavna Singh', 'Chetan Kumar', 'Deepika Nair', 'Divya Arora', 'Gaurav Bhatia', 'Harshita Rao', 'Ishaan Kapoor', 'Jatin Malhotra',
    'Kajal Mishra', 'Karan Sood', 'Khushi Agarwal', 'Lakshya Seth', 'Mahima Joshi', 'Manav Arora', 'Megha Tiwari', 'Mohit Saini',
    'Muskan Patel', 'Naina Thakur', 'Neha Rathi', 'Nikhil Chauhan', 'Pallavi Das', 'Parth Singhal', 'Pooja Khatri', 'Pranav Khanna',
    'Priya Sharma', 'Rahul Verma', 'Rashi Jain', 'Ritika Malhotra', 'Rohit Dubey', 'Sakshi Mehra', 'Sameer Bedi', 'Sana Khan',
    'Shivani Tyagi', 'Shubham Rawat', 'Sneha Kulkarni', 'Sonal Chawla', 'Tanmay Saxena', 'Tanya Bhat', 'Varun Bansal', 'Yashika Goyal'
];

const REVIEW_OPENERS = [
    'Frame dekhte hi mood ban gaya.',
    'Honestly expected normal quality but this surprised me.',
    'Delivery ke baad same day wall pe laga diya.',
    'Photo print itna clean aayega socha nahi tha.',
    'Packaging dekh ke hi laga brand serious hai.',
    'Gift ke liye order kiya tha and result solid nikla.',
    'First time order kiya tha and experience smooth raha.',
    'Room ka pura vibe change ho gaya after this frame.'
];

const REVIEW_QUALITY_LINES = [
    'wood finish classy lag rahi hai',
    'glass clean tha and print sharp tha',
    'corners proper packed the so kuch damage nahi hua',
    'frame bilkul premium feel de raha hai',
    'colors photo se dull nahi huye',
    'mounting simple thi aur fitting strong lagi',
    'photo crop bhi decent tha',
    'size bilkul room ke hisab se sahi laga'
];

const REVIEW_CLOSERS = [
    'overall paisa vasool.',
    'definitely firse order karunga.',
    'guests bhi pooch rahe the kahan se liya.',
    'agar gift dena hai toh safe option hai.',
    'small typo bhi nahi tha, clean finish.',
    'team ne achha kaam kiya.',
    'ab dusri wall ke liye bhi order soch raha hoon.',
    'recommend karunga without doubt.'
];

const REVIEW_VARIANT_LINES = {
    '13x19-portrait': [
        'portrait photo bahut elegant lag rahi hai',
        'vertical layout family photo ke liye perfect hai',
        'hallway wall pe bahut clean dikhta hai',
        'single portrait ke liye yeh size standout karta hai'
    ],
    '13x19-landscape': [
        'couple photo landscape me bahut balanced lag rahi hai',
        'bed ke upar horizontal frame mast lag raha hai',
        'travel photo ka wide look preserve raha',
        'landscape crop natural laga, forced nahi'
    ],
    '13x10-portrait': [
        'compact wall ke liye yeh size best nikla',
        'study table ke side me neat lag raha hai',
        'portrait shot small room me overpower nahi karta',
        'budget friendly hote hue bhi premium feel diya'
    ],
    '13x10-landscape': [
        'small horizontal setup ke liye perfect choice hai',
        'desk area me cute aur clean lagta hai',
        'landscape memory collage ke saath achha blend hua',
        'niche space me bhi proper noticeable hai'
    ]
};

function normalizeReviewDate(dateValue) {
    if (!dateValue) return null;
    if (typeof dateValue.toDate === 'function') {
        return dateValue.toDate();
    }
    if (dateValue.seconds) {
        return new Date(dateValue.seconds * 1000);
    }
    return new Date(dateValue);
}

function getReviewDateKey(dateValue) {
    const date = dateValue ? new Date(dateValue) : new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function clampRating(value) {
    return Math.max(1, Math.min(5, Number(value) || 5));
}

function getDefaultReviewSettings() {
    return {
        autoReviewsEnabled: true,
        stats: JSON.parse(JSON.stringify(DEFAULT_REVIEW_STATS)),
        usedAutoReviewKeys: []
    };
}

function createGeneratedReviewPool() {
    const pool = [];
    REVIEW_VARIANTS.forEach((sizeKey, variantIndex) => {
        for (let i = 0; i < 600; i++) {
            const name = REVIEW_POOL_NAMES[(i + (variantIndex * 7)) % REVIEW_POOL_NAMES.length];
            const opener = REVIEW_OPENERS[i % REVIEW_OPENERS.length];
            const quality = REVIEW_QUALITY_LINES[(i * 3 + variantIndex) % REVIEW_QUALITY_LINES.length];
            const variantLine = REVIEW_VARIANT_LINES[sizeKey][i % REVIEW_VARIANT_LINES[sizeKey].length];
            const closer = REVIEW_CLOSERS[(i * 5 + variantIndex) % REVIEW_CLOSERS.length];
            const ratingRoll = i % 20;
            let rating = 5;
            if (ratingRoll >= 12 && ratingRoll < 17) {
                rating = 4;
            } else if (ratingRoll >= 17 && ratingRoll < 19) {
                rating = 3;
            } else if (ratingRoll === 19) {
                rating = 2;
            }

            pool.push({
                poolKey: `${sizeKey}-${i + 1}`,
                sizeKey,
                name,
                rating,
                text: `${opener} ${variantLine}, ${quality}, ${closer}`
            });
        }
    });
    return pool;
}

const GENERATED_REVIEW_POOL = createGeneratedReviewPool();

function pickAutoReviewCandidate(sizeKey, usedKeys) {
    const available = GENERATED_REVIEW_POOL.filter(review => review.sizeKey === sizeKey && !usedKeys.includes(review.poolKey));
    const pool = available.length ? available : GENERATED_REVIEW_POOL.filter(review => review.sizeKey === sizeKey);
    if (!pool.length) {
        return null;
    }
    return pool[Math.floor(Math.random() * pool.length)];
}

function buildRatingRollup(previousStats, reviewRating, ratingsIncrement) {
    const previousTotalRatings = Number(previousStats.totalRatings) || 0;
    const previousAverage = Number(previousStats.avgRating) || 0;
    const previousRatingSum = previousTotalRatings * previousAverage;
    const safeIncrement = Math.max(1, Number(ratingsIncrement) || 1);
    const additionalRatings = [];

    additionalRatings.push(clampRating(reviewRating));
    while (additionalRatings.length < safeIncrement) {
        const roll = Math.random();
        if (roll < 0.62) {
            additionalRatings.push(5);
        } else if (roll < 0.87) {
            additionalRatings.push(4);
        } else if (roll < 0.96) {
            additionalRatings.push(3);
        } else {
            additionalRatings.push(2);
        }
    }

    const newRatingSum = previousRatingSum + additionalRatings.reduce((sum, value) => sum + value, 0);
    const totalRatings = previousTotalRatings + safeIncrement;
    return {
        totalRatings,
        avgRating: totalRatings > 0 ? Math.round((newRatingSum / totalRatings) * 10) / 10 : 0
    };
}

function mergeFirebaseConfig(nextConfig) {
    if (!nextConfig || !nextConfig.apiKey) {
        return firebaseConfig;
    }

    firebaseConfig = { ...firebaseConfig, ...nextConfig };
    window.__JB_FIREBASE_DYNAMIC_CONFIG__ = { ...firebaseConfig };
    return firebaseConfig;
}

async function loadRuntimeFirebaseConfig() {
    if (window.__JB_FIREBASE_DYNAMIC_CONFIG__) {
        return mergeFirebaseConfig(window.__JB_FIREBASE_DYNAMIC_CONFIG__);
    }

    if (!firebaseConfigLoadPromise) {
        firebaseConfigLoadPromise = fetch('/.netlify/functions/firebase-web-config')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Firebase web config endpoint unavailable');
                }
                return response.json();
            })
            .then(data => {
                if (data && data.success && data.config) {
                    return mergeFirebaseConfig(data.config);
                }
                return firebaseConfig;
            })
            .catch(error => {
                console.warn('Runtime Firebase config unavailable:', error);
                return firebaseConfig;
            });
    }

    return firebaseConfigLoadPromise;
}

async function initializeFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            console.error('❌ Firebase SDK not loaded');
            return false;
        }

        await loadRuntimeFirebaseConfig();
        
        // Initialize Firebase
        app = firebase.apps.length ? firebase.app() : firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        
        console.log('🔥 Firebase initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
        return false;
    }
}

//Xidlz API Client powered by Firebase
class JBCreationsAPI {
    constructor() {
        if (!db) {
            throw new Error('Firebase initialization has not completed yet');
        }
        this.db = db;
        console.log('🚀 Xidlz API powered by Firebase initialized');
    }

    async waitForAuthenticatedUser(timeoutMs = 10000) {
        if (typeof firebase === 'undefined' || !firebase.auth) {
            throw new Error('Firebase Auth is not available yet. Please refresh and try again.');
        }

        const existingUser = firebase.auth().currentUser;
        if (existingUser) {
            return existingUser;
        }

        return new Promise((resolve, reject) => {
            let settled = false;
            let unsubscribe = function() {};

            function finish(callback, value) {
                if (settled) {
                    return;
                }
                settled = true;
                clearTimeout(timeout);
                unsubscribe();
                callback(value);
            }

            const timeout = setTimeout(() => {
                finish(reject, new Error('Admin session is not ready yet. Please wait a moment and try again.'));
            }, timeoutMs);

            unsubscribe = firebase.auth().onAuthStateChanged(function(user) {
                if (!user) {
                    return;
                }
                finish(resolve, user);
            }, function(error) {
                finish(reject, error);
            });
        });
    }

    async ensureAdminSession(forceRefresh = false) {
        const user = await this.waitForAuthenticatedUser();
        const tokenResult = await user.getIdTokenResult(forceRefresh);
        const hasAdminClaim = !!(tokenResult && tokenResult.claims && tokenResult.claims.admin);
        const hasAdminUid = /^admin_[6-9]\d{9}$/.test(user.uid || '');

        if (!hasAdminClaim && !hasAdminUid) {
            throw new Error('Your account is signed in, but admin access is not available for this session. Please sign in again.');
        }

        return { user, tokenResult };
    }

    async withAdminSiteConfigAccess(operation) {
        await this.ensureAdminSession(true);

        try {
            return await operation();
        } catch (error) {
            const message = (error && error.message) || '';
            const isPermissionError = error && (error.code === 'permission-denied' || /Missing or insufficient permissions/i.test(message));

            if (!isPermissionError) {
                throw error;
            }

            await this.ensureAdminSession(true);
            return operation();
        }
    }

    // Create customer record
    async createCustomer(customerData) {
        try {
            const customerRef = await this.db.collection('customers').add({
                name: customerData.name,
                email: customerData.email,
                phone: customerData.phone,
                address: customerData.address,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                orderHistory: []
            });
            
            console.log('✅ Customer created with ID:', customerRef.id);
            return { success: true, customerId: customerRef.id };
        } catch (error) {
            console.error('❌ Error creating customer:', error);
            return { success: false, error: error.message };
        }
    }

    // Create or update user (for OTP authentication)
    async createUser(userData) {
        try {
            console.log('👤 Creating/updating user in Firebase:', userData.phone);
            
            // Check if user already exists
            const existingUserResult = await this.getUserByPhone(userData.phone);
            
            if (existingUserResult.success && existingUserResult.user) {
                const existingUser = existingUserResult.user;
                console.log('👤 User exists, updating:', existingUser.docId);
                // Update existing user
                await this.db.collection('users').doc(existingUser.docId).update({
                    name: userData.name, // Update with new name
                    email: userData.email,
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    signInMethod: userData.signInMethod || 'phone',
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                return { success: true, userId: existingUser.docId, isNewUser: false };
            } else {
                console.log('👤 Creating new user in Firebase');
                // Create new user
                const userRef = await this.db.collection('users').add({
                    name: userData.name,
                    email: userData.email,
                    phone: userData.phone,
                    signInMethod: userData.signInMethod || 'phone',
                    registrationDate: firebase.firestore.FieldValue.serverTimestamp(),
                    lastLogin: firebase.firestore.FieldValue.serverTimestamp(),
                    isActive: true,
                    orders: [],
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
                
                console.log('✅ New user created with ID:', userRef.id);
                return { success: true, userId: userRef.id, isNewUser: true };
            }
        } catch (error) {
            console.error('❌ Error creating/updating user:', error);
            return { success: false, error: error.message };
        }
    }

    // Get user by phone number
    async getUserByPhone(phoneNumber) {
        try {
            console.log('🔍 Searching for user by phone:', phoneNumber);
            
            const usersSnapshot = await this.db.collection('users')
                .where('phone', '==', phoneNumber)
                .get();
            
            if (usersSnapshot.empty) {
                console.log('👤 No user found with phone:', phoneNumber);
                return { success: false, user: null, message: 'User not found' };
            }
            
            const userDoc = usersSnapshot.docs[0];
            const userData = userDoc.data();
            
            console.log('👤 User found:', userData);
            return {
                success: true,
                user: {
                    docId: userDoc.id,
                    ...userData
                }
            };
        } catch (error) {
            console.error('❌ Error getting user by phone:', error);
            return { success: false, user: null, error: error.message };
        }
    }

    // Get all users
    async getAllUsers() {
        try {
            console.log('👥 Fetching all users from Firebase');
            
            const usersSnapshot = await this.db.collection('users')
                .orderBy('registrationDate', 'desc')
                .get();
            
            const users = [];
            usersSnapshot.forEach(doc => {
                users.push({
                    docId: doc.id,
                    ...doc.data()
                });
            });
            
            console.log(`👥 Found ${users.length} users`);
            return users;
        } catch (error) {
            console.error('❌ Error fetching users:', error);
            return [];
        }
    }

    // Create order
    async createOrder(orderData) {
        try {
            console.log('📝 Creating order in Firebase');
            
            const orderRef = await this.db.collection('orders').add({
                ...orderData,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('✅ Order created with ID:', orderRef.id);
            return { success: true, orderId: orderRef.id };
        } catch (error) {
            console.error('❌ Error creating order:', error);
            return { success: false, error: error.message };
        }
    }

    // Get orders by user phone
    async getOrdersByPhone(phoneNumber) {
        try {
            console.log('📋 Fetching orders for phone:', phoneNumber);
            
            // Normalize phone number for matching (handle with/without +91 prefix)
            const normalizedPhone = phoneNumber.replace(/^\+91/, '').replace(/^\+/, '');
            const phoneVariants = [
                phoneNumber,                    // Original: +918269909774
                normalizedPhone,                // Without prefix: 8269909774
                '+91' + normalizedPhone,        // With +91: +918269909774
                '91' + normalizedPhone,         // With 91: 918269909774
            ];
            
            console.log('📋 Searching with phone variants:', phoneVariants);
            
            let orders = [];
            
            // Try the indexed query first (requires composite index)
            try {
                const ordersSnapshot = await this.db.collection('orders')
                    .where('customer.phone', '==', phoneNumber)
                    .orderBy('createdAt', 'desc')
                    .get();
                
                ordersSnapshot.forEach(doc => {
                    orders.push({
                        orderId: doc.id,
                        ...doc.data()
                    });
                });
            } catch (indexError) {
                // If composite index doesn't exist, try without orderBy and sort client-side
                console.log('⚠️ Composite index not available, using fallback query...');
                
                // Try each phone variant
                for (const phone of phoneVariants) {
                    try {
                        const ordersSnapshot = await this.db.collection('orders')
                            .where('customer.phone', '==', phone)
                            .get();
                        
                        ordersSnapshot.forEach(doc => {
                            // Avoid duplicates
                            if (!orders.find(o => o.orderId === doc.id)) {
                                orders.push({
                                    orderId: doc.id,
                                    ...doc.data()
                                });
                            }
                        });
                    } catch (e) {
                        console.log(`Query failed for phone ${phone}:`, e.message);
                    }
                }
                
                // Sort client-side by createdAt (newest first)
                orders.sort((a, b) => {
                    const dateA = a.createdAt?.toDate?.() || a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(a.createdAt || 0);
                    const dateB = b.createdAt?.toDate?.() || b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(b.createdAt || 0);
                    return dateB - dateA;
                });
            }
            
            console.log(`📋 Found ${orders.length} orders for phone:`, phoneNumber);
            
            // If still no orders found, try fetching all and filtering (last resort)
            if (orders.length === 0) {
                console.log('⚠️ No orders found with direct query, trying full scan...');
                try {
                    const allOrdersSnapshot = await this.db.collection('orders').get();
                    const normalizedInput = phoneNumber.replace(/[^0-9]/g, '').slice(-10);
                    
                    allOrdersSnapshot.forEach(doc => {
                        const data = doc.data();
                        const orderPhone = data.customer?.phone || '';
                        const normalizedOrderPhone = orderPhone.replace(/[^0-9]/g, '').slice(-10);
                        
                        if (normalizedOrderPhone === normalizedInput) {
                            orders.push({
                                orderId: doc.id,
                                ...data
                            });
                        }
                    });
                    
                    // Sort by createdAt
                    orders.sort((a, b) => {
                        const dateA = a.createdAt?.toDate?.() || (a.createdAt?.seconds ? new Date(a.createdAt.seconds * 1000) : new Date(a.createdAt || 0));
                        const dateB = b.createdAt?.toDate?.() || (b.createdAt?.seconds ? new Date(b.createdAt.seconds * 1000) : new Date(b.createdAt || 0));
                        return dateB - dateA;
                    });
                    
                    console.log(`📋 Found ${orders.length} orders via full scan`);
                } catch (scanError) {
                    console.error('❌ Full scan failed:', scanError);
                }
            }
            
            return orders;
        } catch (error) {
            console.error('❌ Error fetching orders:', error);
            return [];
        }
    }

    // Update order status
    async updateOrderStatus(orderId, status) {
        try {
            await this.db.collection('orders').doc(orderId).update({
                status: status,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('✅ Order status updated:', orderId, status);
            return { success: true };
        } catch (error) {
            console.error('❌ Error updating order status:', error);
            return { success: false, error: error.message };
        }
    }

    // Update order with any data (for Shiprocket integration, etc.)
    async updateOrder(orderId, updateData) {
        try {
            console.log('📦 Updating order in Firebase:', orderId, Object.keys(updateData));
            
            await this.db.collection('orders').doc(orderId).update({
                ...updateData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('✅ Order updated successfully:', orderId);
            return { success: true, orderId };
        } catch (error) {
            console.error('❌ Error updating order:', error);
            return { success: false, error: error.message };
        }
    }

    async ensureReviewSettings() {
        try {
            const settingsRef = this.db.collection('siteConfig').doc('reviewSettings');
            const snapshot = await this.withAdminSiteConfigAccess(() => settingsRef.get());

            if (!snapshot.exists) {
                const defaults = getDefaultReviewSettings();
                await this.withAdminSiteConfigAccess(() => settingsRef.set({
                    ...defaults,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }));
                return defaults;
            }

            const data = snapshot.data() || {};
            const defaults = getDefaultReviewSettings();
            const mergedSettings = {
                autoReviewsEnabled: data.autoReviewsEnabled !== false,
                stats: { ...defaults.stats, ...(data.stats || {}) },
                usedAutoReviewKeys: Array.isArray(data.usedAutoReviewKeys) ? data.usedAutoReviewKeys : []
            };

            const needsRepair = !data.stats || !Array.isArray(data.usedAutoReviewKeys) || typeof data.autoReviewsEnabled !== 'boolean';
            if (needsRepair) {
                await this.withAdminSiteConfigAccess(() => settingsRef.set({
                    ...mergedSettings,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true }));
            }

            return mergedSettings;
        } catch (error) {
            console.error('❌ Error ensuring review settings:', error);
            throw error;
        }
    }

    async getReviewSettings() {
        try {
            const settings = await this.ensureReviewSettings();
            return { success: true, settings };
        } catch (error) {
            console.error('❌ Error getting review settings:', error);
            return { success: false, error: error.message, settings: getDefaultReviewSettings() };
        }
    }

    async updateReviewSettings(updateData) {
        try {
            await this.ensureReviewSettings();
            await this.withAdminSiteConfigAccess(() => this.db.collection('siteConfig').doc('reviewSettings').set({
                ...updateData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }));
            return { success: true };
        } catch (error) {
            console.error('❌ Error updating review settings:', error);
            return { success: false, error: error.message };
        }
    }

    async ensureStorefrontSettings() {
        try {
            const settingsRef = this.db.collection('siteConfig').doc('storefrontSettings');
            const snapshot = await this.withAdminSiteConfigAccess(() => settingsRef.get());

            if (!snapshot.exists) {
                const defaults = getDefaultStorefrontSettings();
                await this.withAdminSiteConfigAccess(() => settingsRef.set({
                    ...defaults,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }));
                return defaults;
            }

            const mergedSettings = normalizeStorefrontSettings(snapshot.data() || {});
            const data = snapshot.data() || {};
            const needsRepair = !data.sizePricing || !Array.isArray(data.coupons);

            if (needsRepair) {
                await this.withAdminSiteConfigAccess(() => settingsRef.set({
                    ...mergedSettings,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                }, { merge: true }));
            }

            return mergedSettings;
        } catch (error) {
            console.error('❌ Error ensuring storefront settings:', error);
            throw error;
        }
    }

    async getStorefrontSettings() {
        try {
            const settings = await this.ensureStorefrontSettings();
            return { success: true, settings };
        } catch (error) {
            console.error('❌ Error getting storefront settings:', error);
            return { success: false, error: error.message, settings: getDefaultStorefrontSettings() };
        }
    }

    async updateStorefrontSettings(updateData) {
        try {
            const currentSettings = await this.ensureStorefrontSettings();
            const nextSettings = normalizeStorefrontSettings({
                ...currentSettings,
                ...updateData,
                sizePricing: updateData.sizePricing || currentSettings.sizePricing,
                coupons: updateData.coupons || currentSettings.coupons
            });

            await this.withAdminSiteConfigAccess(() => this.db.collection('siteConfig').doc('storefrontSettings').set({
                ...nextSettings,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            }, { merge: true }));

            return { success: true, settings: nextSettings };
        } catch (error) {
            console.error('❌ Error updating storefront settings:', error);
            return { success: false, error: error.message };
        }
    }

    async getApprovedReviewsBySize(sizeKey, limitCount = 50) {
        try {
            const snapshot = await this.db.collection('reviews')
                .where('sizeKey', '==', sizeKey)
                .where('status', '==', 'approved')
                .limit(limitCount)
                .get();

            const reviews = [];
            snapshot.forEach(doc => {
                const data = doc.data() || {};
                if (data.hidden) {
                    return;
                }
                const publishedDate = normalizeReviewDate(data.publishedAt || data.submittedAt || data.createdAt);
                reviews.push({
                    id: doc.id,
                    ...data,
                    submittedAt: data.submittedAt || null,
                    publishedAt: data.publishedAt || null,
                    publishedDate,
                    daysAgo: publishedDate ? Math.max(0, Math.floor((Date.now() - publishedDate.getTime()) / 86400000)) : null
                });
            });

            reviews.sort((left, right) => {
                if (!!left.pinned !== !!right.pinned) {
                    return left.pinned ? -1 : 1;
                }
                const leftTime = left.publishedDate ? left.publishedDate.getTime() : 0;
                const rightTime = right.publishedDate ? right.publishedDate.getTime() : 0;
                return rightTime - leftTime;
            });

            return { success: true, reviews };
        } catch (error) {
            console.error('❌ Error getting approved reviews:', error);
            return { success: false, error: error.message, reviews: [] };
        }
    }

    async getAllReviews() {
        try {
            const snapshot = await this.db.collection('reviews').get();
            const reviews = [];
            snapshot.forEach(doc => {
                const data = doc.data() || {};
                reviews.push({
                    id: doc.id,
                    ...data,
                    submittedDate: normalizeReviewDate(data.submittedAt || data.createdAt),
                    publishedDate: normalizeReviewDate(data.publishedAt || data.submittedAt || data.createdAt)
                });
            });

            reviews.sort((left, right) => {
                const leftTime = left.submittedDate ? left.submittedDate.getTime() : 0;
                const rightTime = right.submittedDate ? right.submittedDate.getTime() : 0;
                return rightTime - leftTime;
            });

            return { success: true, reviews };
        } catch (error) {
            console.error('❌ Error getting all reviews:', error);
            return { success: false, error: error.message, reviews: [] };
        }
    }

    async hasReviewForOrder(orderNumber) {
        try {
            if (!orderNumber) {
                return { success: true, hasReview: false };
            }

            const snapshot = await this.db.collection('reviews')
                .where('orderNumber', '==', orderNumber)
                .limit(1)
                .get();

            return { success: true, hasReview: !snapshot.empty };
        } catch (error) {
            console.error('❌ Error checking review for order:', error);
            return { success: false, error: error.message, hasReview: false };
        }
    }

    async getReviewForOrder(orderNumber) {
        try {
            if (!orderNumber) {
                return { success: true, review: null };
            }

            const snapshot = await this.db.collection('reviews')
                .where('orderNumber', '==', orderNumber)
                .limit(1)
                .get();

            if (snapshot.empty) {
                return { success: true, review: null };
            }

            const doc = snapshot.docs[0];
            return {
                success: true,
                review: {
                    id: doc.id,
                    ...doc.data()
                }
            };
        } catch (error) {
            console.error('❌ Error getting review for order:', error);
            return { success: false, error: error.message, review: null };
        }
    }

    async submitUserReview(reviewData) {
        try {
            const payload = {
                name: (reviewData.name || 'Anonymous').trim(),
                rating: clampRating(reviewData.rating),
                text: (reviewData.text || '').trim(),
                sizeKey: reviewData.sizeKey,
                orderNumber: reviewData.orderNumber || null,
                source: 'user',
                status: 'pending',
                verified: false,
                pinned: false,
                hidden: false,
                submittedAt: firebase.firestore.FieldValue.serverTimestamp(),
                publishedAt: null,
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            const reviewRef = await this.db.collection('reviews').add(payload);
            return { success: true, reviewId: reviewRef.id };
        } catch (error) {
            console.error('❌ Error submitting user review:', error);
            return { success: false, error: error.message };
        }
    }

    async createAdminReview(reviewData) {
        try {
            const publishDate = reviewData.publishedAt || new Date().toISOString();
            const payload = {
                name: (reviewData.name || 'Anonymous').trim(),
                rating: clampRating(reviewData.rating),
                text: (reviewData.text || '').trim(),
                sizeKey: reviewData.sizeKey,
                orderNumber: reviewData.orderNumber || null,
                source: reviewData.source || 'admin',
                status: reviewData.status || 'approved',
                verified: reviewData.verified !== false,
                pinned: !!reviewData.pinned,
                hidden: !!reviewData.hidden,
                submittedAt: firebase.firestore.Timestamp.fromDate(new Date(publishDate)),
                publishedAt: firebase.firestore.Timestamp.fromDate(new Date(publishDate)),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            const reviewRef = await this.db.collection('reviews').add(payload);
            return { success: true, reviewId: reviewRef.id };
        } catch (error) {
            console.error('❌ Error creating admin review:', error);
            return { success: false, error: error.message };
        }
    }

    async updateReview(reviewId, updateData) {
        try {
            const payload = {
                ...updateData,
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (updateData.status === 'approved' && !updateData.publishedAt) {
                payload.publishedAt = firebase.firestore.FieldValue.serverTimestamp();
            }

            await this.db.collection('reviews').doc(reviewId).set(payload, { merge: true });
            return { success: true };
        } catch (error) {
            console.error('❌ Error updating review:', error);
            return { success: false, error: error.message };
        }
    }

    async deleteReview(reviewId) {
        try {
            await this.db.collection('reviews').doc(reviewId).delete();
            return { success: true };
        } catch (error) {
            console.error('❌ Error deleting review:', error);
            return { success: false, error: error.message };
        }
    }

    async tryRunDailyReviewIncrement(sizeKey = null) {
        try {
            const targetVariants = sizeKey ? [sizeKey] : REVIEW_VARIANTS;
            const results = [];

            await this.ensureReviewSettings();

            for (const variant of targetVariants) {
                const incrementResult = await this.db.runTransaction(async transaction => {
                    const settingsRef = this.db.collection('siteConfig').doc('reviewSettings');
                    const settingsSnap = await transaction.get(settingsRef);
                    const defaults = getDefaultReviewSettings();
                    const settings = settingsSnap.exists ? settingsSnap.data() || {} : defaults;
                    const autoReviewsEnabled = settings.autoReviewsEnabled !== false;
                    if (!autoReviewsEnabled) {
                        return { skipped: true, reason: 'disabled', sizeKey: variant };
                    }

                    const stats = { ...defaults.stats, ...(settings.stats || {}) };
                    const variantStats = { ...defaults.stats[variant], ...(stats[variant] || {}) };
                    const todayKey = getReviewDateKey();
                    if (variantStats.lastIncrementDate === todayKey) {
                        return { skipped: true, reason: 'already-run', sizeKey: variant };
                    }

                    const usedKeys = Array.isArray(settings.usedAutoReviewKeys) ? settings.usedAutoReviewKeys.slice() : [];
                    const selectedReview = pickAutoReviewCandidate(variant, usedKeys);
                    if (!selectedReview) {
                        return { skipped: true, reason: 'no-pool-review', sizeKey: variant };
                    }

                    const ratingsIncrement = Math.floor(Math.random() * 10) + 1;
                    const rollup = buildRatingRollup(variantStats, selectedReview.rating, ratingsIncrement);
                    stats[variant] = {
                        totalRatings: rollup.totalRatings,
                        totalReviews: (Number(variantStats.totalReviews) || 0) + 1,
                        avgRating: rollup.avgRating,
                        lastIncrementDate: todayKey
                    };

                    const reviewRef = this.db.collection('reviews').doc();
                    transaction.set(reviewRef, {
                        name: selectedReview.name,
                        rating: selectedReview.rating,
                        text: selectedReview.text,
                        sizeKey: variant,
                        orderNumber: null,
                        source: 'auto',
                        status: 'approved',
                        verified: true,
                        pinned: false,
                        hidden: false,
                        poolKey: selectedReview.poolKey,
                        submittedAt: firebase.firestore.Timestamp.fromDate(new Date()),
                        publishedAt: firebase.firestore.Timestamp.fromDate(new Date()),
                        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    transaction.set(settingsRef, {
                        autoReviewsEnabled,
                        stats,
                        usedAutoReviewKeys: [...usedKeys, selectedReview.poolKey],
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    }, { merge: true });

                    return {
                        skipped: false,
                        sizeKey: variant,
                        ratingsIncrement,
                        reviewId: reviewRef.id,
                        stats: stats[variant]
                    };
                });

                results.push(incrementResult);
            }

            return { success: true, results };
        } catch (error) {
            console.error('❌ Error running daily review increment:', error);
            return { success: false, error: error.message, results: [] };
        }
    }

    // Get all orders (admin)
    async getAllOrders() {
        try {
            const ordersSnapshot = await this.db.collection('orders')
                .orderBy('createdAt', 'desc')
                .get();
            
            const orders = [];
            ordersSnapshot.forEach(doc => {
                orders.push({
                    orderId: doc.id,
                    ...doc.data()
                });
            });
            
            console.log('✅ Orders fetched successfully:', orders.length);
            return { success: true, orders: orders };
        } catch (error) {
            console.error('❌ Error fetching all orders:', error);
            return { success: false, error: error.message, orders: [] };
        }
    }

    // Delete user data (for testing)
    async deleteUserByPhone(phoneNumber) {
        try {
            const userSnapshot = await this.db.collection('users')
                .where('phone', '==', phoneNumber)
                .get();
            
            if (!userSnapshot.empty) {
                await userSnapshot.docs[0].ref.delete();
                console.log('🗑️ User deleted:', phoneNumber);
                return { success: true };
            }
            
            return { success: false, message: 'User not found' };
        } catch (error) {
            console.error('❌ Error deleting user:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete order by order ID (document ID)
    async deleteOrder(orderId) {
        try {
            console.log('🗑️ Deleting order:', orderId);
            await this.db.collection('orders').doc(orderId).delete();
            console.log('✅ Order deleted successfully:', orderId);
            return { success: true };
        } catch (error) {
            console.error('❌ Error deleting order:', error);
            return { success: false, error: error.message };
        }
    }

    // Delete multiple orders by order IDs (document IDs)
    async deleteMultipleOrders(orderIds) {
        try {
            console.log('🗑️ Deleting multiple orders:', orderIds.length);
            const batch = this.db.batch();
            
            orderIds.forEach(orderId => {
                const orderRef = this.db.collection('orders').doc(orderId);
                batch.delete(orderRef);
            });
            
            await batch.commit();
            console.log('✅ Multiple orders deleted successfully:', orderIds.length);
            return { success: true, deletedCount: orderIds.length };
        } catch (error) {
            console.error('❌ Error deleting multiple orders:', error);
            return { success: false, error: error.message };
        }
    }

    // ==================== SUPPORT CHAT METHODS ====================

    // Create or get support chat for user
    async getOrCreateSupportChat(userPhone, userName, userEmail) {
        try {
            console.log('💬 Getting or creating support chat for:', userPhone);
            
            // Normalize phone number - remove all non-digits and country code variations
            let normalizedPhone = userPhone.replace(/\D/g, ''); // Remove all non-digits
            if (normalizedPhone.startsWith('91') && normalizedPhone.length > 10) {
                normalizedPhone = normalizedPhone.substring(2); // Remove 91 country code
            }
            // Keep only last 10 digits
            if (normalizedPhone.length > 10) {
                normalizedPhone = normalizedPhone.slice(-10);
            }
            
            console.log('💬 Normalized phone:', normalizedPhone);
            
            // Check for existing chat with any status except closed
            // First try with normalized phone
            let existingChat = await this.db.collection('supportChats')
                .where('userPhone', '==', normalizedPhone)
                .where('status', 'in', ['open', 'pending'])
                .limit(1)
                .get();
            
            // If not found, try with original phone format
            if (existingChat.empty && userPhone !== normalizedPhone) {
                existingChat = await this.db.collection('supportChats')
                    .where('userPhone', '==', userPhone)
                    .where('status', 'in', ['open', 'pending'])
                    .limit(1)
                    .get();
            }
            
            // Also try with +91 prefix
            if (existingChat.empty) {
                existingChat = await this.db.collection('supportChats')
                    .where('userPhone', '==', '+91' + normalizedPhone)
                    .where('status', 'in', ['open', 'pending'])
                    .limit(1)
                    .get();
            }
            
            if (!existingChat.empty) {
                const chatDoc = existingChat.docs[0];
                console.log('💬 Found existing chat:', chatDoc.id);
                
                // Update user info if changed
                if (userName || userEmail) {
                    await this.db.collection('supportChats').doc(chatDoc.id).update({
                        userName: userName || chatDoc.data().userName || 'Customer',
                        userEmail: userEmail || chatDoc.data().userEmail || '',
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    });
                }
                
                return { success: true, chatId: chatDoc.id, chat: { id: chatDoc.id, ...chatDoc.data() } };
            }
            
            // Create new chat with normalized phone
            const chatRef = await this.db.collection('supportChats').add({
                userPhone: normalizedPhone,
                userName: userName || 'Customer',
                userEmail: userEmail || '',
                status: 'open',
                unreadByAdmin: 0,
                unreadByUser: 0,
                lastMessage: null,
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('✅ New support chat created:', chatRef.id);
            return { success: true, chatId: chatRef.id, chat: { id: chatRef.id }, isNew: true };
        } catch (error) {
            console.error('❌ Error getting/creating support chat:', error);
            return { success: false, error: error.message };
        }
    }

    // Send a message in support chat
    async sendChatMessage(chatId, message, senderType = 'user', senderName = 'Customer') {
        try {
            console.log('📤 Sending chat message:', { chatId, senderType });
            
            // Add message to subcollection
            const messageRef = await this.db.collection('supportChats').doc(chatId)
                .collection('messages').add({
                    text: message,
                    senderType: senderType, // 'user' or 'admin'
                    senderName: senderName,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
                    read: false
                });
            
            // Update chat metadata
            const updateData = {
                lastMessage: message.substring(0, 100),
                lastMessageTime: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            };
            
            if (senderType === 'user') {
                updateData.unreadByAdmin = firebase.firestore.FieldValue.increment(1);
                updateData.unreadByUser = 0;
            } else {
                updateData.unreadByUser = firebase.firestore.FieldValue.increment(1);
                updateData.unreadByAdmin = 0;
            }
            
            await this.db.collection('supportChats').doc(chatId).update(updateData);
            
            console.log('✅ Message sent:', messageRef.id);
            return { success: true, messageId: messageRef.id };
        } catch (error) {
            console.error('❌ Error sending message:', error);
            return { success: false, error: error.message };
        }
    }

    // Get chat messages (with optional real-time listener)
    async getChatMessages(chatId, callback = null) {
        try {
            const messagesRef = this.db.collection('supportChats').doc(chatId)
                .collection('messages')
                .orderBy('createdAt', 'asc');
            
            if (callback) {
                // Real-time listener
                return messagesRef.onSnapshot(snapshot => {
                    const messages = snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        createdAt: doc.data().createdAt?.toDate()
                    }));
                    callback(messages);
                });
            } else {
                // One-time fetch
                const snapshot = await messagesRef.get();
                return {
                    success: true,
                    messages: snapshot.docs.map(doc => ({
                        id: doc.id,
                        ...doc.data(),
                        createdAt: doc.data().createdAt?.toDate()
                    }))
                };
            }
        } catch (error) {
            console.error('❌ Error getting chat messages:', error);
            return { success: false, error: error.message };
        }
    }

    // Get all support chats (for admin)
    async getAllSupportChats(status = null) {
        try {
            console.log('💬 Fetching all support chats');
            
            let query = this.db.collection('supportChats').orderBy('lastMessageTime', 'desc');
            
            if (status) {
                query = query.where('status', '==', status);
            }
            
            const snapshot = await query.get();
            
            const chats = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                createdAt: doc.data().createdAt?.toDate(),
                lastMessageTime: doc.data().lastMessageTime?.toDate()
            }));
            
            console.log('✅ Found', chats.length, 'support chats');
            return { success: true, chats };
        } catch (error) {
            console.error('❌ Error getting support chats:', error);
            return { success: false, error: error.message, chats: [] };
        }
    }

    // Mark chat messages as read
    async markChatAsRead(chatId, readerType = 'user') {
        try {
            // Update unread counter
            const updateData = readerType === 'user' 
                ? { unreadByUser: 0 }
                : { unreadByAdmin: 0 };
            
            await this.db.collection('supportChats').doc(chatId).update(updateData);
            
            // Mark individual messages as read
            const messagesRef = this.db.collection('supportChats').doc(chatId)
                .collection('messages');
            
            const unreadMessages = await messagesRef
                .where('senderType', '!=', readerType)
                .where('read', '==', false)
                .get();
            
            const batch = this.db.batch();
            unreadMessages.docs.forEach(doc => {
                batch.update(doc.ref, { read: true });
            });
            await batch.commit();
            
            return { success: true };
        } catch (error) {
            console.error('❌ Error marking chat as read:', error);
            return { success: false, error: error.message };
        }
    }

    // Close support chat
    async closeSupportChat(chatId) {
        try {
            await this.db.collection('supportChats').doc(chatId).update({
                status: 'closed',
                closedAt: firebase.firestore.FieldValue.serverTimestamp(),
                updatedAt: firebase.firestore.FieldValue.serverTimestamp()
            });
            
            console.log('✅ Support chat closed:', chatId);
            return { success: true };
        } catch (error) {
            console.error('❌ Error closing chat:', error);
            return { success: false, error: error.message };
        }
    }

    // Listen for new chats (for admin notification)
    listenForNewChats(callback) {
        return this.db.collection('supportChats')
            .where('status', 'in', ['open', 'pending'])
            .orderBy('lastMessageTime', 'desc')
            .onSnapshot(snapshot => {
                const chats = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate(),
                    lastMessageTime: doc.data().lastMessageTime?.toDate()
                }));
                callback(chats);
            });
    }
    
    // ==================== CHAT CLEANUP METHODS ====================
    
    /**
     * Delete chats older than the specified number of days
     * @param {number} daysOld - Number of days after which chats should be deleted (default: 15)
     * @returns {Promise<{success: boolean, deletedCount: number}>}
     */
    async cleanupOldChats(daysOld = 15) {
        try {
            console.log(`🧹 Cleaning up chats older than ${daysOld} days...`);
            
            // Calculate the cutoff date
            const cutoffDate = new Date();
            cutoffDate.setDate(cutoffDate.getDate() - daysOld);
            
            // Find old chats
            const oldChatsQuery = await this.db.collection('supportChats')
                .where('createdAt', '<', cutoffDate)
                .get();
            
            if (oldChatsQuery.empty) {
                console.log('✅ No old chats to clean up');
                return { success: true, deletedCount: 0 };
            }
            
            let deletedCount = 0;
            const batch = this.db.batch();
            
            // Process each old chat
            for (const chatDoc of oldChatsQuery.docs) {
                // First, delete all messages in the chat
                const messagesQuery = await this.db.collection('supportChats')
                    .doc(chatDoc.id)
                    .collection('messages')
                    .get();
                
                // Delete messages in batches
                for (const messageDoc of messagesQuery.docs) {
                    await messageDoc.ref.delete();
                }
                
                // Delete the chat document
                batch.delete(chatDoc.ref);
                deletedCount++;
            }
            
            await batch.commit();
            
            console.log(`✅ Cleaned up ${deletedCount} old chats`);
            return { success: true, deletedCount };
        } catch (error) {
            console.error('❌ Error cleaning up old chats:', error);
            return { success: false, error: error.message, deletedCount: 0 };
        }
    }
    
    /**
     * Schedule automatic cleanup of old chats
     * This runs once when the API is initialized and then daily
     */
    scheduleAutoCleanup() {
        // Run cleanup immediately on initialization
        this.cleanupOldChats(15).then(result => {
            if (result.success && result.deletedCount > 0) {
                console.log(`🧹 Auto-cleanup: Deleted ${result.deletedCount} old chats`);
            }
        });
        
        // Also merge duplicates on initialization
        this.mergeDuplicateChats().then(result => {
            if (result.success && result.mergedCount > 0) {
                console.log(`🔄 Auto-merge: Merged ${result.mergedCount} duplicate chats`);
            }
        });
        
        // Schedule daily cleanup (runs every 24 hours)
        // Note: This will only run while the page is open
        setInterval(() => {
            this.cleanupOldChats(15).then(result => {
                if (result.success && result.deletedCount > 0) {
                    console.log(`🧹 Scheduled cleanup: Deleted ${result.deletedCount} old chats`);
                }
            });
        }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds
    }
    
    /**
     * Merge duplicate chats for the same phone number
     * Keeps the oldest chat and moves all messages from newer chats into it
     */
    async mergeDuplicateChats() {
        try {
            console.log('🔄 Checking for duplicate chats to merge...');
            
            // Get all open/pending chats
            const chatsSnapshot = await this.db.collection('supportChats')
                .where('status', 'in', ['open', 'pending'])
                .get();
            
            if (chatsSnapshot.empty) {
                return { success: true, mergedCount: 0 };
            }
            
            // Group chats by normalized phone number
            const chatsByPhone = {};
            
            for (const doc of chatsSnapshot.docs) {
                const data = doc.data();
                const phone = data.userPhone || '';
                
                // Normalize phone - keep only last 10 digits
                const normalizedPhone = phone.replace(/\D/g, '').slice(-10);
                
                if (!normalizedPhone || normalizedPhone.length < 10) continue;
                
                if (!chatsByPhone[normalizedPhone]) {
                    chatsByPhone[normalizedPhone] = [];
                }
                chatsByPhone[normalizedPhone].push({
                    id: doc.id,
                    ...data,
                    createdAt: data.createdAt?.toDate() || new Date()
                });
            }
            
            let mergedCount = 0;
            
            // For each phone with duplicates, merge them
            for (const phone of Object.keys(chatsByPhone)) {
                const chats = chatsByPhone[phone];
                
                if (chats.length <= 1) continue; // No duplicates
                
                console.log(`🔄 Found ${chats.length} duplicate chats for phone ${phone}`);
                
                // Sort by createdAt - oldest first
                chats.sort((a, b) => a.createdAt - b.createdAt);
                
                // Keep the oldest chat as the main one
                const mainChat = chats[0];
                const duplicateChats = chats.slice(1);
                
                // Move messages from duplicate chats to main chat
                for (const duplicateChat of duplicateChats) {
                    // Get all messages from duplicate chat
                    const messagesSnapshot = await this.db.collection('supportChats')
                        .doc(duplicateChat.id)
                        .collection('messages')
                        .orderBy('createdAt', 'asc')
                        .get();
                    
                    // Copy messages to main chat
                    for (const msgDoc of messagesSnapshot.docs) {
                        await this.db.collection('supportChats')
                            .doc(mainChat.id)
                            .collection('messages')
                            .add(msgDoc.data());
                        
                        // Delete original message
                        await msgDoc.ref.delete();
                    }
                    
                    // Update main chat with latest info from duplicate
                    if (duplicateChat.lastMessageTime > mainChat.lastMessageTime) {
                        await this.db.collection('supportChats').doc(mainChat.id).update({
                            lastMessage: duplicateChat.lastMessage,
                            lastMessageTime: duplicateChat.lastMessageTime,
                            unreadByAdmin: firebase.firestore.FieldValue.increment(duplicateChat.unreadByAdmin || 0)
                        });
                    }
                    
                    // Delete the duplicate chat
                    await this.db.collection('supportChats').doc(duplicateChat.id).delete();
                    
                    mergedCount++;
                    console.log(`✅ Merged chat ${duplicateChat.id} into ${mainChat.id}`);
                }
                
                // Update the main chat's phone to normalized format
                await this.db.collection('supportChats').doc(mainChat.id).update({
                    userPhone: phone,
                    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            }
            
            console.log(`✅ Merged ${mergedCount} duplicate chats`);
            return { success: true, mergedCount };
        } catch (error) {
            console.error('❌ Error merging duplicate chats:', error);
            return { success: false, error: error.message, mergedCount: 0 };
        }
    }
}

// Global API instance
let jbAPI = null;

// Initialize API when Firebase is ready
async function initializeJBAPI() {
    try {
        if (!jbAPI) {
            const initialized = await initializeFirebase();
            if (!initialized) {
                return null;
            }
            jbAPI = new JBCreationsAPI();
        }
        return jbAPI;
    } catch (error) {
        console.error('❌ Error initializing JB API:', error);
        return null;
    }
}

// Wait for Firebase to be loaded, then initialize
document.addEventListener('DOMContentLoaded', function() {
    // Wait a bit for Firebase to load
    setTimeout(async () => {
        try {
            jbAPI = await initializeJBAPI();
            if (jbAPI) {
                console.log('🚀 Xidlz Firebase integration loaded successfully!');
                
                // Set global reference
                window.jbAPI = jbAPI;
                
                // Schedule automatic cleanup of old chats (15 days)
                jbAPI.scheduleAutoCleanup();
                
                // Dispatch ready event
                window.dispatchEvent(new Event('firebaseReady'));
                console.log('✅ Firebase ready event dispatched');
            }
        } catch (error) {
            console.error('❌ Error during Firebase initialization:', error);
        }
    }, 100);
});

// Export to global scope
window.JBCreationsAPI = JBCreationsAPI;