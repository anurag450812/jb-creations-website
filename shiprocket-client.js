/**
 * Shiprocket Client Library
 * Frontend integration for Shiprocket shipping functionality
 * Supports both Netlify functions (production) and local proxy server (development)
 */

class ShiprocketClient {
    constructor(options = {}) {
        // Detect if running locally
        this.isLocal = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1' ||
                       window.location.port === '5500' ||
                       window.location.port === '5501';
        
        // Cache for pickup locations
        this.pickupLocations = null;
        this.defaultPickupLocation = null;
        
        // Use Netlify functions in production, local proxy server for development
        if (this.isLocal) {
            // Use local proxy server to avoid CORS issues
            this.baseURL = 'http://localhost:3001';
            this.useDirectAPI = false; // Use proxy, not direct API
            console.log('📦 ShiprocketClient initialized in LOCAL mode (proxy server at localhost:3001)');
            console.log('📦 Make sure to run: node shiprocket-proxy.js');
        } else {
            this.baseURL = options.baseURL || '/.netlify/functions/shiprocket';
            this.useDirectAPI = false;
            console.log('📦 ShiprocketClient initialized in PRODUCTION mode (Netlify functions)');
        }
    }

    /**
     * Authenticate with Shiprocket (for direct API mode - not used with proxy)
     */
    async authenticate() {
        if (!this.useDirectAPI) return null;
        
        // Check if we have a valid cached token
        if (this.token && this.tokenExpiry && new Date() < this.tokenExpiry) {
            return this.token;
        }

        console.log('🔐 Authenticating with Shiprocket...');
        
        const response = await fetch(`${this.baseURL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(this.credentials)
        });
        
        const data = await response.json();
        
        if (data && data.token) {
            this.token = data.token;
            // Token valid for 10 days, refresh after 9
            this.tokenExpiry = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000);
            console.log('✅ Shiprocket authentication successful');
            return this.token;
        }
        
        throw new Error('Shiprocket authentication failed');
    }

    /**
     * Make API request to Shiprocket backend
     */
    async request(endpoint, method = 'GET', data = null) {
        try {
            console.log(`📦 Shiprocket API: ${method} ${endpoint}`);
            
            if (this.useDirectAPI) {
                return await this.directRequest(endpoint, method, data);
            } else {
                return await this.netlifyRequest(endpoint, method, data);
            }
        } catch (error) {
            console.error('❌ Shiprocket API error:', error);
            throw error;
        }
    }

    /**
     * Make request via Netlify functions (production)
     */
    async netlifyRequest(endpoint, method, data) {
        const url = `${this.baseURL}${endpoint}`;
        const options = {
            method,
            headers: { 'Content-Type': 'application/json' }
        };

        if (data && method !== 'GET') {
            options.body = JSON.stringify(data);
        }

        const response = await fetch(url, options);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Shiprocket API request failed');
        }

        return result;
    }

    /**
     * Make direct request to Shiprocket API (local development)
     */
    async directRequest(endpoint, method, data) {
        await this.authenticate();
        
        // Map our endpoints to Shiprocket API
        let url = this.baseURL;
        let requestData = data;
        let requestMethod = method;

        // Route mapping
        if (endpoint === '/create-order') {
            url += '/orders/create/adhoc';
            requestData = this.formatOrderForShiprocket(data.order);
            requestMethod = 'POST';
        } else if (endpoint === '/bulk-create-orders') {
            // Handle bulk orders
            const results = await this.processBulkOrders(data.orders);
            return results;
        } else if (endpoint.startsWith('/track/shipment/')) {
            const shipmentId = endpoint.replace('/track/shipment/', '');
            url += `/courier/track/shipment/${shipmentId}`;
            requestMethod = 'GET';
        } else if (endpoint.startsWith('/track/awb/')) {
            const awb = endpoint.replace('/track/awb/', '');
            url += `/courier/track/awb/${awb}`;
            requestMethod = 'GET';
        } else if (endpoint.startsWith('/order/')) {
            const orderId = endpoint.replace('/order/', '');
            url += `/orders/show/${orderId}`;
            requestMethod = 'GET';
        } else if (endpoint === '/orders' || endpoint.startsWith('/orders?')) {
            url += '/orders';
            requestMethod = 'GET';
        } else if (endpoint === '/couriers') {
            url += '/courier/serviceability/';
            // Convert to query params
            const params = new URLSearchParams({
                pickup_postcode: data.pickupPincode,
                delivery_postcode: data.deliveryPincode,
                weight: data.weight || 0.5,
                cod: data.cod ? 1 : 0
            });
            url += `?${params}`;
            requestMethod = 'GET';
            requestData = null;
        } else if (endpoint === '/generate-awb') {
            url += '/courier/assign/awb';
            requestData = { shipment_id: data.shipmentId, courier_id: data.courierId };
            requestMethod = 'POST';
        } else if (endpoint === '/generate-label') {
            url += '/courier/generate/label';
            requestData = { shipment_id: [data.shipmentId] };
            requestMethod = 'POST';
        } else if (endpoint === '/generate-invoice') {
            url += '/orders/print/invoice';
            requestData = { ids: data.orderIds };
            requestMethod = 'POST';
        } else if (endpoint === '/request-pickup') {
            url += '/courier/generate/pickup';
            requestData = { shipment_id: [data.shipmentId] };
            requestMethod = 'POST';
        } else if (endpoint === '/cancel-order') {
            url += '/orders/cancel';
            requestData = { ids: data.orderIds };
            requestMethod = 'POST';
        } else if (endpoint === '/pickup-locations') {
            url += '/settings/company/pickup';
            requestMethod = 'GET';
        } else {
            url += endpoint;
        }

        const options = {
            method: requestMethod,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.token}`
            }
        };

        if (requestData && requestMethod !== 'GET') {
            options.body = JSON.stringify(requestData);
        }

        const response = await fetch(url, options);
        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.message || result.error || 'Shiprocket API request failed');
        }

        return result;
    }

    /**
     * Format JB Creations order to Shiprocket format
     */
    formatOrderForShiprocket(order) {
        const customer = order.customer || {};
        const items = order.items || [];
        const totalWeight = items.length * 0.5;

        const orderItems = items.map((item, index) => ({
            name: `Custom Photo Frame ${index + 1}`,
            sku: `FRAME-${order.orderNumber}-${index + 1}`,
            units: 1,
            selling_price: parseFloat(item.price) || 349,
            discount: 0,
            tax: 0,
            hsn: 44140000
        }));

        const addressParts = (customer.address || '').split(',').map(p => p.trim());
        const city = customer.city || addressParts[addressParts.length - 2] || 'Unknown';
        const state = customer.state || addressParts[addressParts.length - 1] || 'Unknown';
        const pincode = customer.pincode || customer.zip || '110001';

        // Parse order date - handle Firebase Timestamp, Date objects, and strings
        let orderDate;
        if (order.orderDate) {
            if (order.orderDate.seconds) {
                // Firebase Timestamp
                orderDate = new Date(order.orderDate.seconds * 1000);
            } else if (order.orderDate.toDate) {
                // Firestore Timestamp with toDate method
                orderDate = order.orderDate.toDate();
            } else if (order.orderDate instanceof Date) {
                orderDate = order.orderDate;
            } else {
                orderDate = new Date(order.orderDate);
            }
        }
        // Validate date, fallback to today if invalid
        if (!orderDate || isNaN(orderDate.getTime())) {
            orderDate = new Date();
        }
        const orderDateStr = orderDate.toISOString().split('T')[0];

        return {
            order_id: order.orderNumber,
            order_date: orderDateStr,
            pickup_location: "Primary",
            channel_id: "",
            comment: customer.specialInstructions || "",
            billing_customer_name: customer.name || 'Customer',
            billing_last_name: "",
            billing_address: customer.address || 'Address not provided',
            billing_address_2: "",
            billing_city: city,
            billing_pincode: pincode,
            billing_state: state,
            billing_country: "India",
            billing_email: customer.email || '',
            billing_phone: (customer.phone || '').replace(/\D/g, '').slice(-10),
            shipping_is_billing: true,
            shipping_customer_name: customer.name || 'Customer',
            shipping_last_name: "",
            shipping_address: customer.address || 'Address not provided',
            shipping_address_2: "",
            shipping_city: city,
            shipping_pincode: pincode,
            shipping_country: "India",
            shipping_state: state,
            shipping_email: customer.email || '',
            shipping_phone: (customer.phone || '').replace(/\D/g, '').slice(-10),
            order_items: orderItems,
            payment_method: order.payment?.method === 'cod' ? 'COD' : 'Prepaid',
            shipping_charges: order.deliveryMethod === 'express' ? 99 : 0,
            giftwrap_charges: 0,
            transaction_charges: 0,
            total_discount: order.totals?.discount || 0,
            sub_total: parseFloat(order.totals?.total) || items.reduce((sum, item) => sum + (parseFloat(item.price) || 349), 0),
            length: 40,
            breadth: 30,
            height: 5,
            weight: totalWeight
        };
    }

    /**
     * Process bulk orders
     */
    async processBulkOrders(orders) {
        const results = [];
        const errors = [];

        for (const order of orders) {
            try {
                const shiprocketOrder = this.formatOrderForShiprocket(order);
                const response = await fetch(`${this.baseURL}/orders/create/adhoc`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.token}`
                    },
                    body: JSON.stringify(shiprocketOrder)
                });
                
                const data = await response.json();
                
                if (response.ok) {
                    results.push({
                        orderNumber: order.orderNumber,
                        success: true,
                        data: data
                    });
                } else {
                    errors.push({
                        orderNumber: order.orderNumber,
                        success: false,
                        error: data.message || 'Failed to create order'
                    });
                }
            } catch (err) {
                errors.push({
                    orderNumber: order.orderNumber,
                    success: false,
                    error: err.message
                });
            }
        }

        return {
            success: true,
            total: orders.length,
            successful: results.length,
            failed: errors.length,
            results,
            errors
        };
    }

    /**
     * Check if Shiprocket API is connected
     */
    async checkConnection() {
        if (this.useDirectAPI) {
            await this.authenticate();
            return { success: true, message: 'Shiprocket API connected (direct mode)' };
        }
        return await this.request('/', 'GET');
    }

    /**
     * Create a new order in Shiprocket
     */
    async createOrder(order, pickupLocation = null) {
        // Ensure we have pickup locations loaded
        if (!this.defaultPickupLocation) {
            await this.loadPickupLocations();
        }
        const location = pickupLocation || this.defaultPickupLocation;
        return await this.request('/create-order', 'POST', { order, pickupLocation: location });
    }

    /**
     * Bulk create orders in Shiprocket
     */
    async bulkCreateOrders(orders, pickupLocation = null) {
        // Ensure we have pickup locations loaded
        if (!this.defaultPickupLocation) {
            await this.loadPickupLocations();
        }
        const location = pickupLocation || this.defaultPickupLocation;
        return await this.request('/bulk-create-orders', 'POST', { orders, pickupLocation: location });
    }

    /**
     * Load and cache pickup locations
     */
    async loadPickupLocations() {
        try {
            const response = await this.request('/pickup-locations', 'GET');
            if (response && response.data && response.data.shipping_address) {
                this.pickupLocations = response.data.shipping_address;
                // Find primary location or use first one
                const primary = this.pickupLocations.find(a => a.is_primary_location === 1);
                this.defaultPickupLocation = primary ? primary.pickup_location : (this.pickupLocations[0]?.pickup_location || 'Primary');
                console.log(`📍 Default pickup location: "${this.defaultPickupLocation}"`);
                console.log(`📍 Available locations:`, this.pickupLocations.map(l => l.pickup_location));
            }
            return this.pickupLocations;
        } catch (error) {
            console.error('❌ Failed to load pickup locations:', error);
            return null;
        }
    }

    /**
     * Get tracking information by shipment ID
     */
    async getTrackingByShipment(shipmentId) {
        return await this.request(`/track/shipment/${shipmentId}`, 'GET');
    }

    /**
     * Get tracking information by AWB number
     */
    async getTrackingByAWB(awbCode) {
        return await this.request(`/track/awb/${awbCode}`, 'GET');
    }

    /**
     * Get order details from Shiprocket
     */
    async getOrder(orderId) {
        return await this.request(`/order/${orderId}`, 'GET');
    }

    /**
     * Get all orders from Shiprocket
     */
    async getAllOrders(page = 1, perPage = 20) {
        return await this.request(`/orders?page=${page}&per_page=${perPage}`, 'GET');
    }

    /**
     * Get available courier services
     */
    async getAvailableCouriers(pickupPincode, deliveryPincode, weight = 0.5, cod = false) {
        return await this.request('/couriers', 'POST', {
            pickupPincode,
            deliveryPincode,
            weight,
            cod
        });
    }

    /**
     * Generate AWB (Airway Bill) for a shipment
     */
    async generateAWB(shipmentId, courierId) {
        return await this.request('/generate-awb', 'POST', { shipmentId, courierId });
    }

    /**
     * Generate shipping label
     */
    async generateLabel(shipmentId) {
        return await this.request('/generate-label', 'POST', { shipmentId });
    }

    /**
     * Generate invoice
     */
    async generateInvoice(orderIds) {
        return await this.request('/generate-invoice', 'POST', { orderIds });
    }

    /**
     * Request pickup for a shipment
     */
    async requestPickup(shipmentId) {
        return await this.request('/request-pickup', 'POST', { shipmentId });
    }

    /**
     * Cancel an order
     */
    async cancelOrder(orderIds) {
        return await this.request('/cancel-order', 'POST', { orderIds });
    }

    /**
     * Get pickup locations
     */
    async getPickupLocations() {
        return await this.request('/pickup-locations', 'GET');
    }

    /**
     * Format tracking data for display
     */
    formatTrackingForDisplay(trackingData) {
        if (!trackingData || !trackingData.tracking_data) {
            return null;
        }

        const tracking = trackingData.tracking_data;
        const shipmentTrack = tracking.shipment_track || [];
        const activities = tracking.shipment_track_activities || [];

        return {
            awb: tracking.awb_code,
            courier: tracking.courier_name,
            currentStatus: tracking.current_status,
            currentStatusId: tracking.current_status_id,
            shipmentStatus: tracking.shipment_status,
            estimatedDelivery: tracking.edd,
            deliveredDate: tracking.delivered_date,
            origin: tracking.origin,
            destination: tracking.destination,
            pickupDate: tracking.pickup_date,
            activities: activities.map(activity => ({
                date: activity.date,
                status: activity['sr-status'],
                activity: activity.activity,
                location: activity.location
            })),
            timeline: shipmentTrack.map(track => ({
                date: track.date,
                status: track.status,
                activity: track.activity,
                location: track.location
            }))
        };
    }

    /**
     * Get status color for UI display
     */
    getStatusColor(status) {
        const statusMap = {
            'NEW': '#6366f1',
            'PICKUP SCHEDULED': '#3b82f6',
            'PICKED UP': '#06b6d4',
            'IN TRANSIT': '#f59e0b',
            'OUT FOR DELIVERY': '#10b981',
            'DELIVERED': '#22c55e',
            'CANCELLED': '#ef4444',
            'RTO INITIATED': '#f97316',
            'RTO DELIVERED': '#64748b',
            'LOST': '#dc2626',
            'DAMAGED': '#dc2626'
        };

        return statusMap[status?.toUpperCase()] || '#6b7280';
    }

    /**
     * Get status icon for UI display
     */
    getStatusIcon(status) {
        const iconMap = {
            'NEW': 'fas fa-plus-circle',
            'PICKUP SCHEDULED': 'fas fa-clock',
            'PICKED UP': 'fas fa-box',
            'IN TRANSIT': 'fas fa-truck',
            'OUT FOR DELIVERY': 'fas fa-shipping-fast',
            'DELIVERED': 'fas fa-check-circle',
            'CANCELLED': 'fas fa-times-circle',
            'RTO INITIATED': 'fas fa-undo',
            'RTO DELIVERED': 'fas fa-warehouse',
            'LOST': 'fas fa-exclamation-triangle',
            'DAMAGED': 'fas fa-exclamation-triangle'
        };

        return iconMap[status?.toUpperCase()] || 'fas fa-question-circle';
    }
}

// Create global instance
window.shiprocketClient = new ShiprocketClient();

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ShiprocketClient;
}
