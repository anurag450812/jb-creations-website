/**
 * Supabase Configuration for JB Creations
 * Complete backend solution - Database, Storage, Authentication
 */

// Import Supabase client
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2'

// Configuration - Update these with your Supabase project details
const SUPABASE_CONFIG = {
    url: 'YOUR_SUPABASE_URL', // Replace with your project URL
    anonKey: 'YOUR_SUPABASE_ANON_KEY', // Replace with your anon key
}

// Initialize Supabase client
export const supabase = createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)

// JB Creations API Client powered by Supabase
export class JBCreationsAPI {
    constructor() {
        console.log('🚀 JB Creations API powered by Supabase initialized')
    }

    // Customer Management
    async createCustomer(customerData) {
        try {
            const { data, error } = await supabase
                .from('customers')
                .insert([{
                    name: customerData.name,
                    email: customerData.email,
                    phone: customerData.phone,
                    address: customerData.address,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single()

            if (error) throw error
            
            console.log('✅ Customer created:', data)
            return { success: true, customer: data }
        } catch (error) {
            console.error('❌ Error creating customer:', error)
            return { success: false, error: error.message }
        }
    }

    // Image Upload to Supabase Storage
    async uploadOrderImages(customerId, images) {
        try {
            const imageUrls = []
            
            for (let i = 0; i < images.length; i++) {
                const image = images[i]
                const fileName = `${customerId}_${Date.now()}_${i}.jpg`
                const filePath = `orders/${fileName}`

                // Upload image to Supabase Storage
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('order-images')
                    .upload(filePath, image)

                if (uploadError) throw uploadError

                // Get public URL
                const { data: { publicUrl } } = supabase.storage
                    .from('order-images')
                    .getPublicUrl(filePath)

                imageUrls.push({
                    fileName: fileName,
                    url: publicUrl,
                    path: filePath
                })
            }

            console.log('✅ Images uploaded:', imageUrls)
            return { success: true, images: imageUrls }
        } catch (error) {
            console.error('❌ Error uploading images:', error)
            return { success: false, error: error.message }
        }
    }

    // Create Order with Images
    async createOrder(orderData) {
        try {
            // 1. Create customer if new
            const customerResult = await this.createCustomer(orderData.customer)
            if (!customerResult.success) {
                throw new Error('Failed to create customer')
            }

            const customerId = customerResult.customer.id

            // 2. Upload images
            const imageResult = await this.uploadOrderImages(customerId, orderData.images)
            if (!imageResult.success) {
                throw new Error('Failed to upload images')
            }

            // 3. Create order record
            const { data: order, error } = await supabase
                .from('orders')
                .insert([{
                    customer_id: customerId,
                    images: imageResult.images,
                    frame_size: orderData.frameSize,
                    frame_type: orderData.frameType,
                    quantity: orderData.quantity,
                    special_instructions: orderData.specialInstructions,
                    total_amount: orderData.totalAmount,
                    status: 'pending',
                    created_at: new Date().toISOString()
                }])
                .select()
                .single()

            if (error) throw error

            console.log('✅ Order created successfully:', order)
            
            // 4. Send notifications (optional)
            await this.sendOrderNotifications(order)

            return {
                success: true,
                order: order,
                message: 'Order placed successfully!'
            }
        } catch (error) {
            console.error('❌ Error creating order:', error)
            return { 
                success: false, 
                error: error.message 
            }
        }
    }

    // Get All Orders (for Admin)
    async getAllOrders() {
        try {
            const { data: orders, error } = await supabase
                .from('orders')
                .select(`
                    *,
                    customers (
                        name,
                        email,
                        phone,
                        address
                    )
                `)
                .order('created_at', { ascending: false })

            if (error) throw error

            console.log('✅ Orders fetched:', orders.length)
            return { success: true, orders: orders }
        } catch (error) {
            console.error('❌ Error fetching orders:', error)
            return { success: false, error: error.message }
        }
    }

    // Update Order Status
    async updateOrderStatus(orderId, status) {
        try {
            const { data, error } = await supabase
                .from('orders')
                .update({ 
                    status: status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', orderId)
                .select()
                .single()

            if (error) throw error

            console.log('✅ Order status updated:', data)
            return { success: true, order: data }
        } catch (error) {
            console.error('❌ Error updating order:', error)
            return { success: false, error: error.message }
        }
    }

    // Send Order Notifications
    async sendOrderNotifications(order) {
        try {
            // Call Supabase Edge Function for sending emails
            const { data, error } = await supabase.functions.invoke('send-order-email', {
                body: {
                    orderId: order.id,
                    customerEmail: order.customers?.email,
                    orderDetails: order
                }
            })

            if (error) throw error
            console.log('✅ Notifications sent')
            return { success: true }
        } catch (error) {
            console.error('❌ Error sending notifications:', error)
            return { success: false, error: error.message }
        }
    }

    // Health Check
    async healthCheck() {
        try {
            const { data, error } = await supabase
                .from('customers')
                .select('count', { count: 'exact', head: true })

            if (error) throw error

            return {
                success: true,
                status: 'healthy',
                message: 'JB Creations API powered by Supabase',
                timestamp: new Date().toISOString(),
                customerCount: data?.length || 0
            }
        } catch (error) {
            return {
                success: false,
                status: 'error',
                message: error.message
            }
        }
    }
}

// Initialize API client
export const jbAPI = new JBCreationsAPI()

// Backward compatibility with existing code
window.APIClient = JBCreationsAPI
window.jbAPI = jbAPI

console.log('🎯 JB Creations Supabase integration loaded successfully!')