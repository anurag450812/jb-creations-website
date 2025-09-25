/**
 * Firebase Configuration for JB Creations
 * Complete backend solution - Database, Storage, Authentication
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

// Firebase modules will be loaded from CDN scripts in HTML
// This file will use the global Firebase object

// Initialize Firebase (Storage removed - requires billing upgrade)
// Wait for Firebase to be loaded from CDN
let app, db;

function initializeFirebase() {
    if (typeof firebase === 'undefined') {
        console.error('❌ Firebase SDK not loaded');
        return false;
    }
    
    app = firebase.initializeApp(firebaseConfig);
    db = firebase.firestore();
    
    console.log('🔥 Firebase initialized successfully');
    return true;
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
            const customerRef = await addDoc(collection(this.db, 'customers'), {
                name: customerData.name,
                email: customerData.email,
                phone: customerData.phone,
                address: customerData.address,
                createdAt: serverTimestamp(),
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
            const existingUser = await this.getUserByPhone(userData.phone);
            
            if (existingUser) {
                // Update existing user
                await updateDoc(doc(this.db, 'users', existingUser.docId), {
                    name: userData.name,
                    email: userData.email,
                    lastLogin: serverTimestamp(),
                    loginCount: (userData.loginCount || existingUser.loginCount || 0) + 1,
                    updatedAt: serverTimestamp()
                });
                
                console.log('✅ User updated successfully');
                return { success: true, userId: existingUser.docId, isNew: false };
            } else {
                // Create new user
                const userRef = await addDoc(collection(this.db, 'users'), {
                    id: userData.id,
                    name: userData.name,
                    email: userData.email || '',
                    phone: userData.phone,
                    registrationDate: serverTimestamp(),
                    lastLogin: serverTimestamp(),
                    loginCount: 1,
                    orderHistory: [],
                    createdAt: serverTimestamp()
                });
                
                console.log('✅ New user created with ID:', userRef.id);
                return { success: true, userId: userRef.id, isNew: true };
            }
        } catch (error) {
            console.error('❌ Error creating/updating user:', error);
            return { success: false, error: error.message };
        }
    }

    // Get user by phone number
    async getUserByPhone(phoneNumber) {
        try {
            const usersQuery = query(
                collection(this.db, 'users'),
                where('phone', '==', phoneNumber)
            );
            
            const querySnapshot = await getDocs(usersQuery);
            
            if (querySnapshot.empty) {
                return null;
            }
            
            const userDoc = querySnapshot.docs[0];
            return {
                docId: userDoc.id,
                ...userDoc.data()
            };
        } catch (error) {
            console.error('❌ Error getting user by phone:', error);
            return null;
        }
    }

    // Get all users (for admin)
    async getAllUsers() {
        try {
            const usersQuery = query(
                collection(this.db, 'users'),
                orderBy('registrationDate', 'desc')
            );
            
            const querySnapshot = await getDocs(usersQuery);
            const users = [];
            
            querySnapshot.forEach((doc) => {
                users.push({
                    docId: doc.id,
                    ...doc.data()
                });
            });
            
            console.log('✅ Retrieved all users:', users.length);
            return { success: true, users: users };
        } catch (error) {
            console.error('❌ Error getting all users:', error);
            return { success: false, error: error.message };
        }
    }

    // Create customer record
    async createCustomer(customerData) {
        try {
            const customerRef = await addDoc(collection(this.db, 'customers'), {
                name: customerData.name,
                email: customerData.email,
                phone: customerData.phone,
                address: customerData.address,
                createdAt: serverTimestamp(),
                orderHistory: []
            });
            
            console.log('✅ Customer created with ID:', customerRef.id);
            return { success: true, customerId: customerRef.id };
        } catch (error) {
            console.error('❌ Error creating customer:', error);
            return { success: false, error: error.message };
        }
    }

    // Convert images to Base64 and prepare for Firestore storage
    async processOrderImages(customerId, images) {
        try {
            console.log('📸 Processing images for Firestore storage...');
            const imageData = [];
            
            for (let i = 0; i < images.length; i++) {
                const image = images[i];
                const fileName = `${customerId}_item${i + 1}_${Date.now()}`;
                
                // Convert image to Base64
                const base64Data = await this.fileToBase64(image);
                
                imageData.push({
                    fileName: fileName,
                    data: base64Data,
                    type: image.type,
                    size: image.size,
                    uploadTime: new Date().toISOString()
                });
            }

            console.log('✅ Images processed successfully:', imageData.length);
            return { success: true, images: imageData };
        } catch (error) {
            console.error('❌ Error processing images:', error);
            return { success: false, error: error.message };
        }
    }

    // Helper function to convert File to Base64
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }

    // Create complete order with customer and images
    async createOrder(orderData) {
        try {
            // 🚨 DEBUG: Add unique call ID to track multiple calls
            const callId = Date.now() + '-' + Math.random().toString(36).substr(2, 9);
            console.log(`🔄 Creating order... (Call ID: ${callId})`);
            
            console.log('🔍 Order data structure:', {
                hasCustomer: !!orderData.customer,
                hasImages: !!orderData.images && orderData.images.length > 0,
                hasItems: !!orderData.items && orderData.items.length > 0,
                hasCloudinaryImages: !!orderData.cloudinaryImages && orderData.cloudinaryImages.length > 0,
                imageType: orderData.images?.[0]?.constructor?.name,
                usingCloudinary: orderData.usingCloudinary,
                callId: callId
            });
            
            // Enhanced debugging for Cloudinary data
            if (orderData.cloudinaryImages && orderData.cloudinaryImages.length > 0) {
                console.log('🌥️ Cloudinary images found:', orderData.cloudinaryImages.length);
                orderData.cloudinaryImages.forEach((img, index) => {
                    console.log(`   Image ${index + 1}:`, {
                        hasUrls: !!img.urls,
                        originalUrl: img.urls?.original?.substring(0, 50) + '...',
                        itemIndex: img.itemIndex
                    });
                });
            } else {
                console.log('❌ No Cloudinary images in order data');
            }
            
            // Enhanced debugging for regular images
            if (orderData.images && orderData.images.length > 0) {
                console.log('📸 Regular images found:', orderData.images.length);
            } else {
                console.log('❌ No regular images in order data');
            }

            // Validate image data with stronger enforcement
            const hasImages = (orderData.images && orderData.images.length > 0) || 
                             (orderData.cloudinaryImages && orderData.cloudinaryImages.length > 0) ||
                             (orderData.items && orderData.items.some(item => 
                                item.originalImage || item.printImage || item.displayImage
                             ));

            if (!hasImages) {
                console.warn('⚠️ WARNING: Order being created without any image data!');
                console.warn('📋 This order will not have displayable images in the admin panel');
                console.warn('🔍 Order creation source - check call stack to identify origin');
                console.trace('Order creation trace');
                
                // ENHANCED VALIDATION: Check if this is from a test page
                const isTestOrder = orderData.customer?.name?.includes('Test') || 
                                  orderData.customer?.email?.includes('test') ||
                                  orderData.customer?.email?.includes('debug') ||
                                  orderData.customer?.name === 'Guest Customer';
                
                if (isTestOrder) {
                    console.error('🚫 BLOCKING: Test order creation without images is disabled');
                    console.error('💡 Use test-cloudinary-flow.html for proper testing with images');
                    return {
                        success: false,
                        error: 'Test orders without images are not allowed. Use proper Cloudinary integration for testing.',
                        blocked: true
                    };
                }
                
                // Allow production orders but warn strongly
                console.warn('⚠️ PRODUCTION ORDER WITHOUT IMAGES - This will cause display issues!');
            }

            // Generate a unique order number in yearmonthdatetimeseconds+phone format if not provided
            const generateOrderNumber = (customerPhone = '') => {
                const now = new Date();
                const year = now.getFullYear();
                const month = String(now.getMonth() + 1).padStart(2, '0');
                const date = String(now.getDate()).padStart(2, '0');
                const hours = String(now.getHours()).padStart(2, '0');
                const minutes = String(now.getMinutes()).padStart(2, '0');
                const seconds = String(now.getSeconds()).padStart(2, '0');
                
                // Extract last 4 digits of phone number, default to random if not available
                let phoneLastFour = '0000';
                if (customerPhone) {
                    // Remove all non-digit characters
                    const digitsOnly = customerPhone.replace(/\D/g, '');
                    if (digitsOnly.length >= 4) {
                        phoneLastFour = digitsOnly.slice(-4);
                    } else if (digitsOnly.length > 0) {
                        // Pad with zeros if less than 4 digits
                        phoneLastFour = digitsOnly.padStart(4, '0');
                    }
                } else {
                    // Generate random 4 digits if no phone number
                    phoneLastFour = Math.floor(1000 + Math.random() * 9000).toString();
                }
                
                return `JB${year}${month}${date}${hours}${minutes}${seconds}${phoneLastFour}`;
            };
            
            const orderNumber = orderData.orderNumber || generateOrderNumber(orderData.customer?.phone);

            // Prepare order data in the new structure matching admin requirements
            const newOrderStructure = {
                id: orderNumber,
                orderNumber: orderNumber,
                customer: {
                    name: orderData.customer?.name || 'Guest Customer',
                    email: orderData.customer?.email || 'guest@example.com',
                    phone: orderData.customer?.phone || '0000000000',
                    address: orderData.customer?.address || 'No address provided',
                    specialInstructions: orderData.specialInstructions || ''
                },
                status: 'pending',
                orderDate: new Date().toISOString(),
                totals: {
                    total: orderData.totalAmount || 299
                },
                deliveryMethod: orderData.deliveryMethod || 'standard',
                // Process items with image data
                items: this.processOrderItems(orderData),
                // Keep images array for backward compatibility but populate it properly
                images: this.extractImageUrls(orderData),
                // Add metadata
                paymentId: orderData.paymentId,
                usingCloudinary: orderData.usingCloudinary || false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            // Additional logging for debugging
            console.log('📋 Processed order structure:', {
                orderNumber: newOrderStructure.orderNumber,
                customerName: newOrderStructure.customer.name,
                itemCount: newOrderStructure.items.length,
                imageCount: newOrderStructure.images.length,
                hasItemImages: newOrderStructure.items.some(item => 
                    item.originalImagePath || item.displayImagePath || item.printImagePath
                ),
                usingCloudinary: newOrderStructure.usingCloudinary
            });

            // 🚨 DEBUG: Log the exact data being saved to Firestore
            console.log('🔍 EXACT FIRESTORE DATA BEING SAVED:');
            console.log('Items with image paths:', newOrderStructure.items.map((item, index) => ({
                itemIndex: index + 1,
                originalImagePath: item.originalImagePath,
                printImagePath: item.printImagePath,
                displayImagePath: item.displayImagePath,
                frameColor: item.frameColor,
                frameTexture: item.frameTexture
            })));
            console.log('Images array:', newOrderStructure.images);
            console.log('Using Cloudinary:', newOrderStructure.usingCloudinary);

            // 3. Save to Firestore with new structure
            try {
                const orderRef = await addDoc(collection(this.db, 'orders'), newOrderStructure);
                console.log(`✅ Order saved to Firestore with new structure: ${orderRef.id} (Call ID: ${callId})`);

                return { 
                    success: true, 
                    orderId: orderRef.id,
                    orderNumber: orderNumber,
                    message: `Order ${orderNumber} created successfully`,
                    callId: callId
                };

            } catch (firestoreError) {
                console.error(`❌ Firestore save error (Call ID: ${callId}):`, firestoreError);
                throw new Error(`Failed to save order: ${firestoreError.message}`);
            }

        } catch (error) {
            console.error(`❌ Order creation failed (Call ID: ${callId}):`, error);
            return { 
                success: false, 
                error: error.message,
                details: 'Order creation process failed',
                callId: callId
            };
        }
    }

    // Process order items from the checkout format
    processOrderItems(orderData) {
        // 🚨 DEBUG: Log the exact state of orderData.items
        console.log('🔍 DEBUG processOrderItems - orderData.items check:', {
            hasItems: !!orderData.items,
            itemsType: typeof orderData.items,
            itemsLength: orderData.items ? orderData.items.length : 'N/A',
            itemsArray: orderData.items ? 'Array' : 'Not array',
            firstItem: orderData.items && orderData.items.length > 0 ? 'Has first item' : 'No first item',
            fallbackCondition: !orderData.items || orderData.items.length === 0
        });

        if (!orderData.items || orderData.items.length === 0) {
            // 🚨 DEBUG: This fallback should NOT be triggered for Cloudinary orders
            console.warn('⚠️ FALLBACK TRIGGERED - Using old format (this creates null image paths!)');
            console.log('🔍 Fallback reason:', {
                itemsExists: !!orderData.items,
                itemsLength: orderData.items ? orderData.items.length : 'undefined'
            });
            
            // Fallback for old format
            return [{
                frameSize: { size: orderData.frameSize || 'Standard', orientation: 'Portrait' },
                frameColor: orderData.frameType || 'Wood',
                frameTexture: 'Standard',
                price: orderData.totalAmount || 299,
                adjustments: {
                    brightness: 100,
                    contrast: 100,
                    highlights: 100,
                    shadows: 100,
                    vibrance: 100
                },
                zoom: 1,
                originalImagePath: null,
                enhancedPrintPath: null,
                printImagePath: null,
                displayImagePath: null
            }];
        }

        console.log('✅ Using NEW format - processing items with Cloudinary URLs');
        return orderData.items.map((item, index) => {
            // Extract image URLs from the item or from the Cloudinary upload results
            let originalImagePath = null;
            let displayImagePath = null;
            let printImagePath = null;

            // Priority 1: Check if we have Cloudinary URLs from the upload process
            if (orderData.cloudinaryImages && orderData.cloudinaryImages[index]) {
                const cloudinaryResult = orderData.cloudinaryImages[index];
                if (cloudinaryResult.urls) {
                    originalImagePath = cloudinaryResult.urls.original;
                    printImagePath = cloudinaryResult.urls.print;
                    displayImagePath = cloudinaryResult.urls.display;
                    console.log(`✅ Using Cloudinary URLs for item ${index + 1}:`, cloudinaryResult.urls.original);
                }
            }
            // Priority 2: Check if we have Cloudinary URLs in the images array (old format)
            else if (orderData.usingCloudinary && orderData.images && orderData.images[index]) {
                const imageData = orderData.images[index];
                originalImagePath = imageData.originalImage || imageData.original || null;
                printImagePath = imageData.printImage || imageData.print || null;
                displayImagePath = imageData.displayImage || imageData.display || null;
                console.log(`✅ Using legacy Cloudinary URLs for item ${index + 1}:`, originalImagePath);
            }
            // Priority 3: Fallback to base64 data or direct paths from the item
            else {
                originalImagePath = item.originalImage || null;
                printImagePath = item.printImage || null;
                displayImagePath = item.displayImage || item.previewImage || null;
                console.log(`⚠️ Using fallback image data for item ${index + 1}:`, originalImagePath ? 'base64 data' : 'no image');
            }

            const processedItem = {
                frameSize: {
                    size: item.frameSize?.size || 'Standard',
                    orientation: item.frameSize?.orientation || 'Portrait'
                },
                frameColor: item.frameColor || 'black',
                frameTexture: item.frameTexture || 'Standard',
                price: item.price || 349,
                adjustments: item.adjustments || {
                    brightness: 100,
                    contrast: 100,
                    highlights: 100,
                    shadows: 100,
                    vibrance: 100
                },
                zoom: item.zoom || 1,
                originalImagePath: originalImagePath,
                enhancedPrintPath: null, // Will be populated later during processing
                printImagePath: printImagePath,
                displayImagePath: displayImagePath
            };

            // 🚨 DEBUG: Log the final processed item
            console.log(`🎯 FINAL PROCESSED ITEM ${index + 1}:`, {
                originalImagePath: processedItem.originalImagePath,
                printImagePath: processedItem.printImagePath,
                displayImagePath: processedItem.displayImagePath,
                frameColor: processedItem.frameColor
            });

            return processedItem;
        });
    }

    // Extract image URLs for the images array (backward compatibility)
    extractImageUrls(orderData) {
        if (!orderData.images || orderData.images.length === 0) {
            return [];
        }

        return orderData.images.map((imageData, index) => {
            if (typeof imageData === 'string') {
                return imageData; // Already a URL
            }
            
            if (imageData && typeof imageData === 'object') {
                return imageData.originalImage || imageData.displayImage || imageData.printImage || null;
            }
            
            return null;
        }).filter(url => url !== null);
    }

    // Get all orders for admin
    async getAllOrders() {
        try {
            const ordersQuery = query(
                collection(this.db, 'orders'),
                orderBy('createdAt', 'desc')
            );
            
            const querySnapshot = await getDocs(ordersQuery);
            const orders = [];
            
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                orders.push({
                    id: doc.id,
                    ...data,
                    // Convert Firebase timestamp to readable date
                    createdAt: data.createdAt?.toDate?.()?.toISOString() || new Date().toISOString(),
                    updatedAt: data.updatedAt?.toDate?.()?.toISOString() || new Date().toISOString()
                });
            });

            console.log('✅ Orders fetched:', orders.length);
            return { success: true, orders: orders };
        } catch (error) {
            console.error('❌ Error fetching orders:', error);
            return { success: false, error: error.message };
        }
    }

    // Update order status
    async updateOrderStatus(orderId, status) {
        try {
            const orderRef = doc(this.db, 'orders', orderId);
            await updateDoc(orderRef, {
                status: status,
                updatedAt: serverTimestamp()
            });

            console.log('✅ Order status updated:', orderId, status);
            return { success: true, orderId, status };
        } catch (error) {
            console.error('❌ Error updating order status:', error);
            return { success: false, error: error.message };
        }
    }

    // Send order notifications (placeholder - you can integrate with email service)
    async sendOrderNotifications(orderData) {
        try {
            console.log('📧 Order notification sent:', orderData);
            // Here you can integrate with email services like SendGrid, etc.
            return { success: true };
        } catch (error) {
            console.error('❌ Error sending notifications:', error);
            return { success: false, error: error.message };
        }
    }

    // Health check
    async healthCheck() {
        try {
            // Test database connection
            const testQuery = query(collection(this.db, 'orders'), where('status', '==', 'pending'));
            await getDocs(testQuery);

            return {
                success: true,
                status: 'healthy',
                message: 'JB Creations API powered by Firebase',
                timestamp: new Date().toISOString(),
                backend: 'Firebase Firestore + Storage'
            };
        } catch (error) {
            console.error('❌ Health check failed:', error);
            return {
                success: false,
                status: 'error',
                message: error.message
            };
        }
    }
}

// Initialize API client
export const jbAPI = new JBCreationsAPI();

// Backward compatibility with existing code
window.JBCreationsAPI = JBCreationsAPI;
window.jbAPI = jbAPI;

console.log('🔥 JB Creations Firebase integration loaded successfully!');

// Dispatch event to notify other scripts that Firebase client is ready
window.dispatchEvent(new Event('firebaseReady'));
console.log('✅ Firebase ready event dispatched');