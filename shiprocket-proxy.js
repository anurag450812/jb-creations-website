/**
 * Local Development Proxy Server for Shiprocket API
 * Run this when testing locally to avoid CORS issues
 * 
 * Usage: node shiprocket-proxy.js
 * Then the frontend will use http://localhost:3001 as the proxy
 */

const http = require('http');
const https = require('https');

const PORT = 3001;
const SHIPROCKET_BASE_URL = 'apiv2.shiprocket.in';
const SHIPROCKET_EMAIL = 'anuragrajput200274+api@gmail.com';
const SHIPROCKET_PASSWORD = 's181!$ZFw#^IO4$vzMeYTG8%xli@FZD@';

// Cache for authentication token
let cachedToken = null;
let tokenExpiry = null;

// Cache for pickup locations
let cachedPickupLocations = null;
let defaultPickupLocation = null;

/**
 * Get pickup locations from Shiprocket
 */
async function getPickupLocations(token) {
    if (cachedPickupLocations) {
        return cachedPickupLocations;
    }

    return new Promise((resolve, reject) => {
        const options = {
            hostname: SHIPROCKET_BASE_URL,
            port: 443,
            path: '/v1/external/settings/company/pickup',
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    cachedPickupLocations = result;
                    
                    // Set default pickup location (first primary or first one)
                    if (result.data && result.data.shipping_address) {
                        const addresses = result.data.shipping_address;
                        const primary = addresses.find(a => a.is_primary_location === 1);
                        defaultPickupLocation = primary ? primary.pickup_location : (addresses[0]?.pickup_location || 'Primary');
                        console.log(`📍 Default pickup location: "${defaultPickupLocation}"`);
                    }
                    
                    resolve(result);
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.end();
    });
}

/**
 * Authenticate with Shiprocket
 */
async function authenticate() {
    if (cachedToken && tokenExpiry && new Date() < tokenExpiry) {
        return cachedToken;
    }

    console.log('🔐 Authenticating with Shiprocket...');

    return new Promise((resolve, reject) => {
        const data = JSON.stringify({
            email: SHIPROCKET_EMAIL,
            password: SHIPROCKET_PASSWORD
        });

        const options = {
            hostname: SHIPROCKET_BASE_URL,
            port: 443,
            path: '/v1/external/auth/login',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(data)
            }
        };

        const req = https.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const result = JSON.parse(body);
                    if (result.token) {
                        cachedToken = result.token;
                        tokenExpiry = new Date(Date.now() + 9 * 24 * 60 * 60 * 1000);
                        console.log('✅ Shiprocket authentication successful');
                        resolve(cachedToken);
                    } else {
                        reject(new Error('No token received'));
                    }
                } catch (e) {
                    reject(e);
                }
            });
        });

        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

/**
 * Forward request to Shiprocket
 */
async function forwardToShiprocket(path, method, body, token) {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: SHIPROCKET_BASE_URL,
            port: 443,
            path: `/v1/external${path}`,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            }
        };

        if (body && method !== 'GET') {
            options.headers['Content-Length'] = Buffer.byteLength(body);
        }

        const req = https.request(options, (res) => {
            let responseBody = '';
            res.on('data', chunk => responseBody += chunk);
            res.on('end', () => {
                resolve({
                    statusCode: res.statusCode,
                    body: responseBody
                });
            });
        });

        req.on('error', reject);
        
        if (body && method !== 'GET') {
            req.write(body);
        }
        req.end();
    });
}

/**
 * Format order for Shiprocket
 */
function formatOrderForShiprocket(order, pickupLocation = null) {
    const customer = order.customer || {};
    const items = order.items || [];
    const totalWeight = items.length * 0.5;
    
    // Use provided pickup location, or default, or fallback to "Primary"
    const pickupLoc = pickupLocation || defaultPickupLocation || 'Primary';

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

    // Parse order date
    let orderDate;
    if (order.orderDate) {
        if (order.orderDate.seconds) {
            orderDate = new Date(order.orderDate.seconds * 1000);
        } else if (order.orderDate instanceof Date) {
            orderDate = order.orderDate;
        } else {
            orderDate = new Date(order.orderDate);
        }
    }
    if (!orderDate || isNaN(orderDate.getTime())) {
        orderDate = new Date();
    }
    const orderDateStr = orderDate.toISOString().split('T')[0];

    return {
        order_id: order.orderNumber,
        order_date: orderDateStr,
        pickup_location: pickupLoc,
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
 * Create HTTP server
 */
const server = http.createServer(async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Content-Type', 'application/json');

    // Handle preflight
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Parse URL
    const url = new URL(req.url, `http://localhost:${PORT}`);
    const path = url.pathname;

    console.log(`📦 ${req.method} ${path}`);

    try {
        // Get request body
        let body = '';
        for await (const chunk of req) {
            body += chunk;
        }
        let parsedBody = {};
        if (body) {
            try {
                parsedBody = JSON.parse(body);
            } catch (e) {}
        }

        // Authenticate
        const token = await authenticate();

        // Route handling
        if (path === '/' || path === '/health') {
            res.writeHead(200);
            res.end(JSON.stringify({ success: true, message: 'Shiprocket Proxy Server running' }));
            return;
        }

        if (path === '/create-order' && req.method === 'POST') {
            const order = parsedBody.order;
            if (!order) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Order data required' }));
                return;
            }

            // Ensure we have pickup locations loaded
            await getPickupLocations(token);
            
            // Allow override via request body
            const pickupLocation = parsedBody.pickupLocation || defaultPickupLocation;
            const shiprocketOrder = formatOrderForShiprocket(order, pickupLocation);
            const result = await forwardToShiprocket('/orders/create/adhoc', 'POST', JSON.stringify(shiprocketOrder), token);
            
            res.writeHead(result.statusCode);
            res.end(result.body);
            return;
        }

        if (path === '/bulk-create-orders' && req.method === 'POST') {
            const orders = parsedBody.orders;
            if (!orders || !Array.isArray(orders)) {
                res.writeHead(400);
                res.end(JSON.stringify({ error: 'Orders array required' }));
                return;
            }

            // Ensure we have pickup locations loaded
            await getPickupLocations(token);
            const pickupLocation = parsedBody.pickupLocation || defaultPickupLocation;

            const results = [];
            const errors = [];

            for (const order of orders) {
                try {
                    const shiprocketOrder = formatOrderForShiprocket(order, pickupLocation);
                    const result = await forwardToShiprocket('/orders/create/adhoc', 'POST', JSON.stringify(shiprocketOrder), token);
                    const data = JSON.parse(result.body);
                    
                    if (result.statusCode === 200) {
                        results.push({ orderNumber: order.orderNumber, success: true, data });
                    } else {
                        errors.push({ orderNumber: order.orderNumber, success: false, error: data.message || 'Failed' });
                    }
                } catch (err) {
                    errors.push({ orderNumber: order.orderNumber, success: false, error: err.message });
                }
            }

            res.writeHead(200);
            res.end(JSON.stringify({
                success: true,
                total: orders.length,
                successful: results.length,
                failed: errors.length,
                results,
                errors
            }));
            return;
        }

        if (path.startsWith('/track/awb/') && req.method === 'GET') {
            const awb = path.replace('/track/awb/', '');
            const result = await forwardToShiprocket(`/courier/track/awb/${awb}`, 'GET', null, token);
            res.writeHead(result.statusCode);
            res.end(result.body);
            return;
        }

        if (path.startsWith('/track/shipment/') && req.method === 'GET') {
            const shipmentId = path.replace('/track/shipment/', '');
            const result = await forwardToShiprocket(`/courier/track/shipment/${shipmentId}`, 'GET', null, token);
            res.writeHead(result.statusCode);
            res.end(result.body);
            return;
        }

        if (path === '/couriers' && req.method === 'POST') {
            const { pickupPincode, deliveryPincode, weight, cod } = parsedBody;
            const queryParams = new URLSearchParams({
                pickup_postcode: pickupPincode,
                delivery_postcode: deliveryPincode,
                weight: weight || 0.5,
                cod: cod ? 1 : 0
            });
            const result = await forwardToShiprocket(`/courier/serviceability/?${queryParams}`, 'GET', null, token);
            res.writeHead(result.statusCode);
            res.end(result.body);
            return;
        }

        if (path === '/generate-awb' && req.method === 'POST') {
            const { shipmentId, courierId } = parsedBody;
            const result = await forwardToShiprocket('/courier/assign/awb', 'POST', JSON.stringify({
                shipment_id: shipmentId,
                courier_id: courierId
            }), token);
            res.writeHead(result.statusCode);
            res.end(result.body);
            return;
        }

        if (path === '/generate-label' && req.method === 'POST') {
            const { shipmentId } = parsedBody;
            const result = await forwardToShiprocket('/courier/generate/label', 'POST', JSON.stringify({
                shipment_id: [shipmentId]
            }), token);
            res.writeHead(result.statusCode);
            res.end(result.body);
            return;
        }

        if (path === '/request-pickup' && req.method === 'POST') {
            const { shipmentId } = parsedBody;
            const result = await forwardToShiprocket('/courier/generate/pickup', 'POST', JSON.stringify({
                shipment_id: [shipmentId]
            }), token);
            res.writeHead(result.statusCode);
            res.end(result.body);
            return;
        }

        if (path === '/generate-invoice' && req.method === 'POST') {
            const { orderIds } = parsedBody;
            const result = await forwardToShiprocket('/orders/print/invoice', 'POST', JSON.stringify({
                ids: orderIds
            }), token);
            res.writeHead(result.statusCode);
            res.end(result.body);
            return;
        }

        if (path === '/cancel-order' && req.method === 'POST') {
            const { orderIds } = parsedBody;
            const result = await forwardToShiprocket('/orders/cancel', 'POST', JSON.stringify({
                ids: orderIds
            }), token);
            res.writeHead(result.statusCode);
            res.end(result.body);
            return;
        }

        if (path === '/pickup-locations' && req.method === 'GET') {
            const result = await forwardToShiprocket('/settings/company/pickup', 'GET', null, token);
            res.writeHead(result.statusCode);
            res.end(result.body);
            return;
        }

        // Not found
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Endpoint not found', path }));

    } catch (error) {
        console.error('❌ Error:', error.message);
        res.writeHead(500);
        res.end(JSON.stringify({ error: error.message }));
    }
});

server.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════════════════════╗
║                                                            ║
║   🚀 Shiprocket Proxy Server running on port ${PORT}         ║
║                                                            ║
║   Use this for LOCAL DEVELOPMENT only                      ║
║   The frontend will automatically detect and use this      ║
║                                                            ║
║   Endpoints:                                               ║
║   • POST /create-order       - Create single order         ║
║   • POST /bulk-create-orders - Create multiple orders      ║
║   • GET  /track/awb/:awb     - Track by AWB                ║
║   • POST /couriers           - Get available couriers      ║
║   • POST /generate-awb       - Generate AWB                ║
║   • POST /generate-label     - Generate shipping label     ║
║   • POST /request-pickup     - Request pickup              ║
║   • POST /cancel-order       - Cancel order                ║
║                                                            ║
╚════════════════════════════════════════════════════════════╝
`);
});
