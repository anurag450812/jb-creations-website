/**
 * Firebase Configuration for JB Creations
 * Complete backend solution - Database, Storage, Authentication
 * Fixed for non-module usage
 */

// Firebase configuration - Your actual project details
const firebaseConfig = {
    apiKey: "AIzaSyC0j3MFVGeOMCKZnot8DmoXYkBYKlPjHsT",
    authDomain: "jb-creations-backend.firebaseapp.com",
    projectId: "jb-creations-backend",
    storageBucket: "jb-creations-backend.firebasestorage.app",
    messagingSenderId: "774184516486",
    appId: "1:774128154860:web:c22384c401bd6838ab4d2f"
};

// Initialize Firebase when DOM is loaded
let app, db;

function initializeFirebase() {
    try {
        if (typeof firebase === 'undefined') {
            console.error('❌ Firebase SDK not loaded');
            return false;
        }
        
        // Initialize Firebase
        app = firebase.initializeApp(firebaseConfig);
        db = firebase.firestore();
        
        console.log('🔥 Firebase initialized successfully');
        return true;
    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
        return false;
    }
}

//JB Creations API Client powered by Firebase
class JBCreationsAPI {
    constructor() {
        if (!db) {
            if (!initializeFirebase()) {
                throw new Error('Firebase initialization failed');
            }
        }
        this.db = db;
        console.log('🚀 JB Creations API powered by Firebase initialized');
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
            
            const ordersSnapshot = await this.db.collection('orders')
                .where('customer.phone', '==', phoneNumber)
                .orderBy('createdAt', 'desc')
                .get();
            
            const orders = [];
            ordersSnapshot.forEach(doc => {
                orders.push({
                    orderId: doc.id,
                    ...doc.data()
                });
            });
            
            console.log(`📋 Found ${orders.length} orders for phone:`, phoneNumber);
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
}

// Global API instance
let jbAPI = null;

// Initialize API when Firebase is ready
function initializeJBAPI() {
    try {
        if (!jbAPI) {
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
    setTimeout(() => {
        try {
            jbAPI = initializeJBAPI();
            if (jbAPI) {
                console.log('🚀 JB Creations Firebase integration loaded successfully!');
                
                // Set global reference
                window.jbAPI = jbAPI;
                
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