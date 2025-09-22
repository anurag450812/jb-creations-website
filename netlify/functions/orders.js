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
            
            // Generate a demo order ID
            const orderId = 'JB' + Date.now();
            
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