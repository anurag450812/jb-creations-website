/**
 * Firebase Configuration for Xidlz
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

//Xidlz API Client powered by Firebase
class JBCreationsAPI {
    constructor() {
        if (!db) {
            if (!initializeFirebase()) {
                throw new Error('Firebase initialization failed');
            }
        }
        this.db = db;
        console.log('🚀 Xidlz API powered by Firebase initialized');
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