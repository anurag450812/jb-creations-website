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

// Import Firebase modules from CDN
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-app.js'
import { 
    getFirestore, 
    collection, 
    addDoc, 
    getDocs, 
    updateDoc, 
    doc, 
    query, 
    orderBy,
    where,
    serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-firestore.js'
import { 
    getStorage, 
    ref, 
    uploadBytes, 
    getDownloadURL 
} from 'https://www.gstatic.com/firebasejs/10.5.0/firebase-storage.js'

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

console.log('🔥 Firebase initialized successfully');

// JB Creations API Client powered by Firebase
export class JBCreationsAPI {
    constructor() {
        this.db = db;
        this.storage = storage;
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
                createdAt: serverTimestamp()
            });

            console.log('✅ Customer created:', customerRef.id);
            return { 
                success: true, 
                customer: { id: customerRef.id, ...customerData }
            };
        } catch (error) {
            console.error('❌ Error creating customer:', error);
            return { success: false, error: error.message };
        }
    }

    // Upload images to Firebase Storage
    async uploadOrderImages(customerId, images) {
        try {
            const imageUrls = [];
            
            for (let i = 0; i < images.length; i++) {
                const image = images[i];
                const fileName = `${customerId}_${Date.now()}_${i}.jpg`;
                const imageRef = ref(this.storage, `orders/${fileName}`);
                
                // Upload image
                const uploadResult = await uploadBytes(imageRef, image);
                const downloadURL = await getDownloadURL(uploadResult.ref);
                
                imageUrls.push({
                    fileName: fileName,
                    url: downloadURL,
                    path: uploadResult.ref.fullPath
                });
            }

            console.log('✅ Images uploaded successfully:', imageUrls.length);
            return { success: true, images: imageUrls };
        } catch (error) {
            console.error('❌ Error uploading images:', error);
            return { success: false, error: error.message };
        }
    }

    // Create complete order with customer and images
    async createOrder(orderData) {
        try {
            console.log('🔄 Creating order...');

            // 1. Create customer
            const customerResult = await this.createCustomer(orderData.customer);
            if (!customerResult.success) {
                throw new Error('Failed to create customer: ' + customerResult.error);
            }

            const customerId = customerResult.customer.id;

            // 2. Upload images
            const imageResult = await this.uploadOrderImages(customerId, orderData.images);
            if (!imageResult.success) {
                throw new Error('Failed to upload images: ' + imageResult.error);
            }

            // 3. Create order record
            const orderRef = await addDoc(collection(this.db, 'orders'), {
                customerId: customerId,
                customerName: orderData.customer.name,
                customerEmail: orderData.customer.email,
                customerPhone: orderData.customer.phone,
                customerAddress: orderData.customer.address,
                images: imageResult.images,
                frameSize: orderData.frameSize || 'Standard',
                frameType: orderData.frameType || 'Wood',
                quantity: orderData.quantity || 1,
                specialInstructions: orderData.specialInstructions || '',
                totalAmount: orderData.totalAmount || 299,
                status: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });

            console.log('✅ Order created successfully:', orderRef.id);

            // 4. Send notifications (optional)
            await this.sendOrderNotifications({
                orderId: orderRef.id,
                customerName: orderData.customer.name,
                customerEmail: orderData.customer.email
            });

            return {
                success: true,
                orderId: orderRef.id,
                customerId: customerId,
                message: 'Order placed successfully!'
            };

        } catch (error) {
            console.error('❌ Error creating order:', error);
            return { 
                success: false, 
                error: error.message 
            };
        }
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