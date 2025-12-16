/**
 * Shiprocket Integration Service
 * Handles all Shiprocket API interactions for order fulfillment and tracking
 */

const axios = require('axios');

class ShiprocketService {
    constructor() {
        this.baseURL = 'https://apiv2.shiprocket.in/v1/external';
        this.email = process.env.SHIPROCKET_EMAIL || 'anuragrajput200274+api@gmail.com';
        this.password = process.env.SHIPROCKET_PASSWORD || 's181!$ZFw#^IO4$vzMeYTG8%xli@FZD@';
        this.token = null;
        this.tokenExpiry = null;
    }

    /**
     * Get authentication token from Shiprocket
     */
    async authenticate() {
        try {
            // Check if we have a valid cached token
            if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
                return this.token;
            }

            console.log('🔐 Authenticating with Shiprocket...');
            const response = await axios.post(`${this.baseURL}/auth/login`, {
                email: this.email,
                password: this.password
            });

            if (response.data && response.data.token) {
                this.token = response.data.token;
                // Token is valid for 10 days, but we'll refresh after 9 days
                this.tokenExpiry = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000);
                console.log('✅ Shiprocket authentication successful');
                return this.token;
            } else {
                throw new Error('No token received from Shiprocket');
            }
        } catch (error) {
            console.error('❌ Shiprocket authentication failed:', error.response?.data || error.message);
            throw new Error('Failed to authenticate with Shiprocket: ' + (error.response?.data?.message || error.message));
        }
    }

    /**
     * Get headers with authentication token
     */
    async getHeaders() {
        const token = await this.authenticate();
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }

    /**
     * Create a new order in Shiprocket
     */
    async createOrder(orderData) {
        try {
            const headers = await this.getHeaders();
            
            // Format order for Shiprocket API
            const shiprocketOrder = this.formatOrderForShiprocket(orderData);
            
            console.log('📦 Creating Shiprocket order:', shiprocketOrder.order_id);
            
            const response = await axios.post(
                `${this.baseURL}/orders/create/adhoc`,
                shiprocketOrder,
                { headers }
            );

            console.log('✅ Shiprocket order created:', response.data);
            return {
                success: true,
                shiprocketOrderId: response.data.order_id,
                shipmentId: response.data.shipment_id,
                status: response.data.status,
                data: response.data
            };
        } catch (error) {
            console.error('❌ Failed to create Shiprocket order:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message,
                details: error.response?.data
            };
        }
    }

    /**
     * Format order data for Shiprocket API
     */
    formatOrderForShiprocket(order) {
        const customer = order.customer || {};
        const addressDetails = customer.addressDetails || {};
        
        // Extract phone number (remove +91 prefix if present)
        let phone = customer.phone || '';
        phone = phone.replace(/^\+91\s?/, '').replace(/\D/g, '');
        
        // Calculate order items
        const items = (order.items || []).map((item, index) => ({
            name: `Custom Photo Frame - ${item.frameSize?.size || 'Standard'}`,
            sku: `FRAME-${item.frameSize?.size || 'STD'}-${index + 1}`,
            units: item.quantity || 1,
            selling_price: item.price || 349,
            discount: 0,
            tax: 0,
            hsn: 44140010  // HSN code for photo frames
        }));

        // Calculate totals
        const subtotal = order.totals?.subtotal || items.reduce((sum, item) => sum + (item.selling_price * item.units), 0);
        const total = order.totals?.total || subtotal;

        return {
            order_id: order.orderNumber,
            order_date: new Date(order.orderDate || Date.now()).toISOString().split('T')[0],
            pickup_location: "Primary",  // Configure in Shiprocket dashboard
            channel_id: "",
            comment: customer.specialInstructions || "",
            billing_customer_name: customer.name || "Customer",
            billing_last_name: "",
            billing_address: addressDetails.street || customer.address || "Address not provided",
            billing_address_2: addressDetails.landmark || "",
            billing_city: addressDetails.city || "City",
            billing_pincode: addressDetails.pincode || "000000",
            billing_state: addressDetails.state || "State",
            billing_country: "India",
            billing_email: customer.email || "noemail@example.com",
            billing_phone: phone || "0000000000",
            shipping_is_billing: true,
            shipping_customer_name: customer.name || "Customer",
            shipping_last_name: "",
            shipping_address: addressDetails.street || customer.address || "Address not provided",
            shipping_address_2: addressDetails.landmark || "",
            shipping_city: addressDetails.city || "City",
            shipping_pincode: addressDetails.pincode || "000000",
            shipping_country: "India",
            shipping_state: addressDetails.state || "State",
            shipping_email: customer.email || "noemail@example.com",
            shipping_phone: phone || "0000000000",
            order_items: items,
            payment_method: "Prepaid",  // Since you use Razorpay
            shipping_charges: 0,
            giftwrap_charges: 0,
            transaction_charges: 0,
            total_discount: order.totals?.discount || 0,
            sub_total: subtotal,
            length: 35,  // Frame dimensions in cm
            breadth: 25,
            height: 5,
            weight: 0.5  // Weight in kg
        };
    }

    /**
     * Get tracking details for a shipment
     */
    async getTracking(shipmentId) {
        try {
            const headers = await this.getHeaders();
            
            const response = await axios.get(
                `${this.baseURL}/courier/track/shipment/${shipmentId}`,
                { headers }
            );

            return {
                success: true,
                tracking: response.data
            };
        } catch (error) {
            console.error('❌ Failed to get tracking:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    /**
     * Get tracking by AWB number
     */
    async getTrackingByAWB(awbCode) {
        try {
            const headers = await this.getHeaders();
            
            const response = await axios.get(
                `${this.baseURL}/courier/track/awb/${awbCode}`,
                { headers }
            );

            return {
                success: true,
                tracking: response.data
            };
        } catch (error) {
            console.error('❌ Failed to get AWB tracking:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    /**
     * Get all shipments
     */
    async getShipments(filters = {}) {
        try {
            const headers = await this.getHeaders();
            
            const response = await axios.get(
                `${this.baseURL}/shipments`,
                { headers, params: filters }
            );

            return {
                success: true,
                shipments: response.data.data || response.data
            };
        } catch (error) {
            console.error('❌ Failed to get shipments:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    /**
     * Get order details from Shiprocket
     */
    async getOrder(orderId) {
        try {
            const headers = await this.getHeaders();
            
            const response = await axios.get(
                `${this.baseURL}/orders/show/${orderId}`,
                { headers }
            );

            return {
                success: true,
                order: response.data.data || response.data
            };
        } catch (error) {
            console.error('❌ Failed to get order:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    /**
     * Cancel an order
     */
    async cancelOrder(orderIds) {
        try {
            const headers = await this.getHeaders();
            
            const ids = Array.isArray(orderIds) ? orderIds : [orderIds];
            
            const response = await axios.post(
                `${this.baseURL}/orders/cancel`,
                { ids },
                { headers }
            );

            return {
                success: true,
                data: response.data
            };
        } catch (error) {
            console.error('❌ Failed to cancel order:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    /**
     * Generate AWB (Airway Bill) for a shipment
     */
    async generateAWB(shipmentId, courierId) {
        try {
            const headers = await this.getHeaders();
            
            const response = await axios.post(
                `${this.baseURL}/courier/assign/awb`,
                {
                    shipment_id: shipmentId,
                    courier_id: courierId
                },
                { headers }
            );

            return {
                success: true,
                awb: response.data
            };
        } catch (error) {
            console.error('❌ Failed to generate AWB:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    /**
     * Get available courier services for a shipment
     */
    async getAvailableCouriers(pickupPincode, deliveryPincode, weight, cod = false) {
        try {
            const headers = await this.getHeaders();
            
            const response = await axios.get(
                `${this.baseURL}/courier/serviceability`,
                {
                    headers,
                    params: {
                        pickup_postcode: pickupPincode,
                        delivery_postcode: deliveryPincode,
                        weight: weight,
                        cod: cod ? 1 : 0
                    }
                }
            );

            return {
                success: true,
                couriers: response.data.data?.available_courier_companies || []
            };
        } catch (error) {
            console.error('❌ Failed to get couriers:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    /**
     * Generate shipping label
     */
    async generateLabel(shipmentId) {
        try {
            const headers = await this.getHeaders();
            
            const response = await axios.post(
                `${this.baseURL}/courier/generate/label`,
                { shipment_id: [shipmentId] },
                { headers }
            );

            return {
                success: true,
                labelUrl: response.data.label_url || response.data
            };
        } catch (error) {
            console.error('❌ Failed to generate label:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    /**
     * Generate invoice
     */
    async generateInvoice(orderIds) {
        try {
            const headers = await this.getHeaders();
            
            const ids = Array.isArray(orderIds) ? orderIds : [orderIds];
            
            const response = await axios.post(
                `${this.baseURL}/orders/print/invoice`,
                { ids },
                { headers }
            );

            return {
                success: true,
                invoiceUrl: response.data.invoice_url || response.data
            };
        } catch (error) {
            console.error('❌ Failed to generate invoice:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    /**
     * Request pickup
     */
    async requestPickup(shipmentId) {
        try {
            const headers = await this.getHeaders();
            
            const response = await axios.post(
                `${this.baseURL}/courier/generate/pickup`,
                { shipment_id: [shipmentId] },
                { headers }
            );

            return {
                success: true,
                pickup: response.data
            };
        } catch (error) {
            console.error('❌ Failed to request pickup:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    /**
     * Get all orders from Shiprocket
     */
    async getAllOrders(page = 1, perPage = 20) {
        try {
            const headers = await this.getHeaders();
            
            const response = await axios.get(
                `${this.baseURL}/orders`,
                {
                    headers,
                    params: { page, per_page: perPage }
                }
            );

            return {
                success: true,
                orders: response.data.data || [],
                meta: response.data.meta
            };
        } catch (error) {
            console.error('❌ Failed to get orders:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    /**
     * Get channel list
     */
    async getChannels() {
        try {
            const headers = await this.getHeaders();
            
            const response = await axios.get(
                `${this.baseURL}/channels`,
                { headers }
            );

            return {
                success: true,
                channels: response.data.data || response.data
            };
        } catch (error) {
            console.error('❌ Failed to get channels:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }

    /**
     * Get pickup locations
     */
    async getPickupLocations() {
        try {
            const headers = await this.getHeaders();
            
            const response = await axios.get(
                `${this.baseURL}/settings/company/pickup`,
                { headers }
            );

            return {
                success: true,
                locations: response.data.data?.shipping_address || response.data
            };
        } catch (error) {
            console.error('❌ Failed to get pickup locations:', error.response?.data || error.message);
            return {
                success: false,
                error: error.response?.data?.message || error.message
            };
        }
    }
}

// Export singleton instance
module.exports = new ShiprocketService();
