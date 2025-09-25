// Netlify Function for Orders
exports.handler = async (event, context) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod === 'POST') {
        try {
            const orderData = JSON.parse(event.body);
            
            // Generate order ID in yearmonthdatetimeseconds+phone format
            const generateOrderId = (customerPhone = '') => {
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
            
            const orderId = generateOrderId(orderData.customer?.phone);
            
            // For now, just return success - later we'll add database storage
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify({
                    success: true,
                    message: 'Order placed successfully!',
                    orderId: orderId,
                    order: {
                        ...orderData,
                        id: orderId,
                        status: 'pending',
                        createdAt: new Date().toISOString()
                    }
                })
            };

        } catch (error) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ 
                    success: false,
                    error: 'Failed to process order' 
                })
            };
        }
    }

    if (event.httpMethod === 'GET') {
        // Return demo orders for now
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                orders: [
                    {
                        id: 'JB123456789',
                        status: 'completed',
                        total: 299,
                        createdAt: '2025-09-22T10:00:00Z'
                    }
                ]
            })
        };
    }

    return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
    };
};