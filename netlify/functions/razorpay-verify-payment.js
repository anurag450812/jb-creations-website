const crypto = require('crypto');

exports.handler = async (event) => {
    const headers = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
    };

    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 200, headers, body: '' };
    }

    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers,
            body: JSON.stringify({ success: false, message: 'Method not allowed' })
        };
    }

    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keySecret) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: 'Razorpay verification secret is not configured.' })
        };
    }

    try {
        const payload = JSON.parse(event.body || '{}');
        const orderId = payload.razorpay_order_id;
        const paymentId = payload.razorpay_payment_id;
        const signature = payload.razorpay_signature;

        if (!orderId || !paymentId || !signature) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, message: 'Missing Razorpay verification fields.' })
            };
        }

        const expectedSignature = crypto
            .createHmac('sha256', keySecret)
            .update(`${orderId}|${paymentId}`)
            .digest('hex');

        const isValid = expectedSignature === signature;

        return {
            statusCode: isValid ? 200 : 400,
            headers,
            body: JSON.stringify({ success: isValid, message: isValid ? 'Payment verified' : 'Invalid payment signature' })
        };
    } catch (error) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message: error.message || 'Failed to verify payment' })
        };
    }
};