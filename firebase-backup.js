/**
 * Firebase Alternative Setup for Xidlz
 * Complete backend solution if Supabase has issues
 */

// Firebase configuration
const firebaseConfig = {
    apiKey: "YOUR_FIREBASE_API_KEY",
    authDomain: "jb-creations.firebaseapp.com",
    projectId: "jb-creations",
    storageBucket: "jb-creations.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};

// Import Firebase modules
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-app.js'
import { getFirestore, collection, addDoc, getDocs, updateDoc, doc } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-firestore.js'
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.0.0/firebase-storage.js'

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

// Xidlz Firebase API Client
export class JBCreationsFirebaseAPI {
    constructor() {
        console.log('🔥 Xidlz API powered by Firebase initialized')
    }

    // Create customer and order
    async createOrder(orderData) {
        try {
            // 1. Create customer record
            const customerRef = await addDoc(collection(db, 'customers'), {
                name: orderData.customer.name,
                email: orderData.customer.email,
                phone: orderData.customer.phone,
                address: orderData.customer.address,
                createdAt: new Date()
            });

            // 2. Upload images to Firebase Storage
            const imageUrls = [];
            for (let i = 0; i < orderData.images.length; i++) {
                const image = orderData.images[i];
                const imageRef = ref(storage, `orders/${customerRef.id}_${Date.now()}_${i}.jpg`);
                const uploadResult = await uploadBytes(imageRef, image);
                const downloadURL = await getDownloadURL(uploadResult.ref);
                imageUrls.push(downloadURL);
            }

            // 3. Create order record
            const orderRef = await addDoc(collection(db, 'orders'), {
                customerId: customerRef.id,
                images: imageUrls,
                frameSize: orderData.frameSize,
                frameType: orderData.frameType,
                quantity: orderData.quantity,
                totalAmount: orderData.totalAmount,
                status: 'pending',
                createdAt: new Date()
            });

            console.log('✅ Order created successfully:', orderRef.id);
            return {
                success: true,
                orderId: orderRef.id,
                customerId: customerRef.id
            };

        } catch (error) {
            console.error('❌ Error creating order:', error);
            return { success: false, error: error.message };
        }
    }

    // Get all orders
    async getAllOrders() {
        try {
            const ordersSnapshot = await getDocs(collection(db, 'orders'));
            const orders = [];
            
            ordersSnapshot.forEach((doc) => {
                orders.push({ id: doc.id, ...doc.data() });
            });

            return { success: true, orders: orders };
        } catch (error) {
            console.error('❌ Error fetching orders:', error);
            return { success: false, error: error.message };
        }
    }

    // Health check
    async healthCheck() {
        return {
            success: true,
            status: 'healthy',
            message: 'Xidlz API powered by Firebase',
            timestamp: new Date().toISOString()
        };
    }
}

export const jbAPI = new JBCreationsFirebaseAPI();