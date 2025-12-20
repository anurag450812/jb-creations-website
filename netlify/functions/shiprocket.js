/**
 * Shiprocket API Netlify Function
 * Handles all Shiprocket operations for shipping management
 */

const axios = require('axios');

// Shiprocket API configuration
const SHIPROCKET_BASE_URL = 'https://apiv2.shiprocket.in/v1/external';
const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL || 'anuragrajput200274+api@gmail.com';
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD || 's181!$ZFw#^IO4$vzMeYTG8%xli@FZD@';

// Cache for authentication token
let cachedToken = null;
let tokenExpiry = null;

// Cache for pickup locations
let cachedPickupLocations = null;
let defaultPickupLocation = null;

/**
 * Get pickup locations from Shiprocket
 */
async function getPickupLocations() {
    if (cachedPickupLocations && defaultPickupLocation) {
        return { locations: cachedPickupLocations, defaultLocation: defaultPickupLocation };
    }

    const headers = await getHeaders();
    const response = await axios.get(
        `${SHIPROCKET_BASE_URL}/settings/company/pickup`,
        { headers }
    );

    if (response.data && response.data.data && response.data.data.shipping_address) {
        cachedPickupLocations = response.data.data.shipping_address;
        // Find primary location or use first one
        const primary = cachedPickupLocations.find(a => a.is_primary_location === 1);
        defaultPickupLocation = primary ? primary.pickup_location : (cachedPickupLocations[0]?.pickup_location || 'Primary');
        console.log(`📍 Default pickup location: "${defaultPickupLocation}"`);
    }

    return { locations: cachedPickupLocations, defaultLocation: defaultPickupLocation };
}

/**
 * Authenticate with Shiprocket
 */
async function authenticate() {
    // Check if we have a valid cached token
    if (cachedToken && tokenExpiry && new Date() < tokenExpiry) {
        return cachedToken;
    }

    console.log('🔐 Authenticating with Shiprocket...');
    
    const response = await axios.post(`${SHIPROCKET_BASE_URL}/auth/login`, {
        email: SHIPROCKET_EMAIL,
        password: SHIPROCKET_PASSWORD
    });

    if (response.data && response.data.token) {
        cachedToken = response.data.token;
        // Token is valid for 10 days, but we'll refresh after 9 days
        tokenExpiry = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000);
        console.log('✅ Shiprocket authentication successful');
        return cachedToken;
    }
    
    throw new Error('No token received from Shiprocket');
}

/**
 * Get headers with authentication token
 */
async function getHeaders() {
    const token = await authenticate();
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

/**
 * Format JB Creations order to Shiprocket format
 */
function formatOrderForShiprocket(order, pickupLocation = null) {
    const customer = order.customer || {};
    const items = order.items || [];
    
    // Use provided pickup location, or default, or fallback
    const pickupLoc = pickupLocation || defaultPickupLocation || 'Primary';
    
    // Calculate total weight (assuming 0.5kg per frame)
    const totalWeight = items.length * 0.5;
    
    // Format order items for Shiprocket with proper discount handling
    const totalDiscount = order.totals?.discount || 0;
    const itemDiscount = items.length > 0 ? Math.round((totalDiscount / items.length) * 100) / 100 : 0;
    
    const orderItems = items.map((item, index) => ({
        name: `Custom Photo Frame ${index + 1}`,
        sku: `FRAME-${order.orderNumber}-${index + 1}`,
        units: 1,
        selling_price: parseFloat(item.price) || 349,
        discount: itemDiscount, // Distribute discount across items
        tax: 0,
        hsn: 44140000 // HSN code for wooden frames
    }));

    // Get address details - prefer structured addressDetails over parsed address
    const addressDetails = customer.addressDetails || {};
    
    // Extract pincode from addressDetails, customer.pincode, or parse from address
    let pincode = addressDetails.pincode || customer.pincode || customer.zip;
    if (!pincode && customer.address) {
        // Try to extract 6-digit pincode from address string
        const pincodeMatch = customer.address.match(/\b(\d{6})\b/);
        if (pincodeMatch) {
            pincode = pincodeMatch[1];
        }
    }
    pincode = pincode || '110001'; // Fallback only if no pincode found anywhere
    
    // Get city and state from addressDetails first
    let city = addressDetails.city || customer.city;
    let state = addressDetails.state || customer.state;
    
    // If not in addressDetails, try to parse from address
    if (!city || !state) {
        const addressParts = (customer.address || '').split(',').map(p => p.trim());
        if (!city) city = addressParts[addressParts.length - 2] || 'Unknown';
        if (!state) state = addressParts[addressParts.length - 1]?.replace(/\s*-?\s*\d{6}\s*$/, '') || 'Unknown';
    }
    
    // Get the street address (without city, state, pincode)
    let streetAddress = addressDetails.street || customer.address || 'Address not provided';
    
    // Parse order date - handle Firebase Timestamp, Date objects, and strings
    let orderDate;
    if (order.orderDate) {
        if (order.orderDate.seconds) {
            // Firebase Timestamp
            orderDate = new Date(order.orderDate.seconds * 1000);
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
    
    // Calculate subtotal
    const subtotal = parseFloat(order.totals?.total) || items.reduce((sum, item) => sum + (parseFloat(item.price) || 349), 0);
    
    console.log(`📦 Formatting order for Shiprocket:`, {
        orderNumber: order.orderNumber,
        pincode: pincode,
        city: city,
        state: state,
        discount: totalDiscount,
        subtotal: subtotal
    });

    return {
        order_id: order.orderNumber,
        order_date: orderDateStr,
        pickup_location: pickupLoc,
        channel_id: "",
        comment: customer.specialInstructions || "",
        billing_customer_name: customer.name || 'Customer',
        billing_last_name: "",
        billing_address: streetAddress,
        billing_address_2: addressDetails.landmark || "",
        billing_city: city,
        billing_pincode: pincode,
        billing_state: state,
        billing_country: "India",
        billing_email: customer.email || '',
        billing_phone: (customer.phone || '').replace(/\D/g, '').slice(-10),
        shipping_is_billing: true,
        shipping_customer_name: customer.name || 'Customer',
        shipping_last_name: "",
        shipping_address: streetAddress,
        shipping_address_2: addressDetails.landmark || "",
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
        total_discount: totalDiscount,
        sub_total: subtotal,
        length: 40,
        breadth: 30,
        height: 5,
        weight: totalWeight
    };
}

/**
 * Main handler for all Shiprocket API requests
 */
exports.handler = async (event, context) => {
    // CORS headers
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Content-Type': 'application/json'
    };

    // Handle preflight requests
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    try {
        const path = event.path.replace('/.netlify/functions/shiprocket', '');
        const method = event.httpMethod;
        let body = {};
        
        if (event.body) {
            try {
                body = JSON.parse(event.body);
            } catch (e) {
                console.log('Could not parse body:', e);
            }
        }

        console.log(`📦 Shiprocket API: ${method} ${path}`);

        // Route handling
        if (path === '' || path === '/') {
            // Health check
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'Shiprocket API is connected',
                    timestamp: new Date().toISOString()
                })
            };
        }

        if (path === '/create-order' && method === 'POST') {
            // Create order in Shiprocket
            const order = body.order;
            if (!order) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Order data is required' })
                };
            }

            // Fetch pickup locations to get the correct default
            await getPickupLocations();
            const pickupLocation = body.pickupLocation || defaultPickupLocation;
            
            const shiprocketOrder = formatOrderForShiprocket(order, pickupLocation);
            const apiHeaders = await getHeaders();
            
            const response = await axios.post(
                `${SHIPROCKET_BASE_URL}/orders/create/adhoc`,
                shiprocketOrder,
                { headers: apiHeaders }
            );

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(response.data)
            };
        }

        if (path === '/bulk-create-orders' && method === 'POST') {
            // Bulk create orders in Shiprocket
            const orders = body.orders;
            if (!orders || !Array.isArray(orders) || orders.length === 0) {
                return {
                    statusCode: 400,
                    headers,
                    body: JSON.stringify({ error: 'Orders array is required' })
                };
            }

            // Fetch pickup locations to get the correct default
            await getPickupLocations();
            const pickupLocation = body.pickupLocation || defaultPickupLocation;

            const apiHeaders = await getHeaders();
            const results = [];
            const errors = [];

            for (const order of orders) {
                try {
                    const shiprocketOrder = formatOrderForShiprocket(order, pickupLocation);
                    const response = await axios.post(
                        `${SHIPROCKET_BASE_URL}/orders/create/adhoc`,
                        shiprocketOrder,
                        { headers: apiHeaders }
                    );
                    results.push({
                        orderNumber: order.orderNumber,
                        success: true,
                        data: response.data
                    });
                } catch (err) {
                    errors.push({
                        orderNumber: order.orderNumber,
                        success: false,
                        error: err.response?.data?.message || err.message
                    });
                }
            }

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    total: orders.length,
                    successful: results.length,
                    failed: errors.length,
                    results,
                    errors
                })
            };
        }

        if (path.startsWith('/track/shipment/') && method === 'GET') {
            const shipmentId = path.replace('/track/shipment/', '');
            const apiHeaders = await getHeaders();
            
            const response = await axios.get(
                `${SHIPROCKET_BASE_URL}/courier/track/shipment/${shipmentId}`,
                { headers: apiHeaders }
            );

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(response.data)
            };
        }

        if (path.startsWith('/track/awb/') && method === 'GET') {
            const awbCode = path.replace('/track/awb/', '');
            const apiHeaders = await getHeaders();
            
            const response = await axios.get(
                `${SHIPROCKET_BASE_URL}/courier/track/awb/${awbCode}`,
                { headers: apiHeaders }
            );

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(response.data)
            };
        }

        if (path.startsWith('/order/') && method === 'GET') {
            const orderId = path.replace('/order/', '');
            const apiHeaders = await getHeaders();
            
            const response = await axios.get(
                `${SHIPROCKET_BASE_URL}/orders/show/${orderId}`,
                { headers: apiHeaders }
            );

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(response.data)
            };
        }

        if (path === '/orders' && method === 'GET') {
            const apiHeaders = await getHeaders();
            const params = event.queryStringParameters || {};
            
            const response = await axios.get(
                `${SHIPROCKET_BASE_URL}/orders`,
                { 
                    headers: apiHeaders,
                    params: {
                        page: params.page || 1,
                        per_page: params.per_page || 20
                    }
                }
            );

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(response.data)
            };
        }

        if (path === '/couriers' && method === 'POST') {
            const { pickupPincode, deliveryPincode, weight, cod } = body;
            const apiHeaders = await getHeaders();
            
            const response = await axios.get(
                `${SHIPROCKET_BASE_URL}/courier/serviceability/`,
                { 
                    headers: apiHeaders,
                    params: {
                        pickup_postcode: pickupPincode,
                        delivery_postcode: deliveryPincode,
                        weight: weight || 0.5,
                        cod: cod ? 1 : 0
                    }
                }
            );

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(response.data)
            };
        }

        if (path === '/generate-awb' && method === 'POST') {
            const { shipmentId, courierId } = body;
            const apiHeaders = await getHeaders();
            
            const response = await axios.post(
                `${SHIPROCKET_BASE_URL}/courier/assign/awb`,
                {
                    shipment_id: shipmentId,
                    courier_id: courierId
                },
                { headers: apiHeaders }
            );

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(response.data)
            };
        }

        if (path === '/generate-label' && method === 'POST') {
            const { shipmentId } = body;
            const apiHeaders = await getHeaders();
            
            const response = await axios.post(
                `${SHIPROCKET_BASE_URL}/courier/generate/label`,
                { shipment_id: [shipmentId] },
                { headers: apiHeaders }
            );

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(response.data)
            };
        }

        if (path === '/generate-invoice' && method === 'POST') {
            const { orderIds } = body;
            const apiHeaders = await getHeaders();
            
            const response = await axios.post(
                `${SHIPROCKET_BASE_URL}/orders/print/invoice`,
                { ids: orderIds },
                { headers: apiHeaders }
            );

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(response.data)
            };
        }

        if (path === '/request-pickup' && method === 'POST') {
            const { shipmentId } = body;
            const apiHeaders = await getHeaders();
            
            const response = await axios.post(
                `${SHIPROCKET_BASE_URL}/courier/generate/pickup`,
                { shipment_id: [shipmentId] },
                { headers: apiHeaders }
            );

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(response.data)
            };
        }

        if (path === '/cancel-order' && method === 'POST') {
            const { orderIds } = body;
            const apiHeaders = await getHeaders();
            
            const response = await axios.post(
                `${SHIPROCKET_BASE_URL}/orders/cancel`,
                { ids: orderIds },
                { headers: apiHeaders }
            );

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(response.data)
            };
        }

        if (path === '/pickup-locations' && method === 'GET') {
            const apiHeaders = await getHeaders();
            
            const response = await axios.get(
                `${SHIPROCKET_BASE_URL}/settings/company/pickup`,
                { headers: apiHeaders }
            );

            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(response.data)
            };
        }

        // Not found
        return {
            statusCode: 404,
            headers,
            body: JSON.stringify({ error: 'Endpoint not found', path })
        };

    } catch (error) {
        console.error('❌ Shiprocket API error:', error.response?.data || error.message);
        
        return {
            statusCode: error.response?.status || 500,
            headers,
            body: JSON.stringify({
                error: error.response?.data?.message || error.message,
                details: error.response?.data || null
            })
        };
    }
};
