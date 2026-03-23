const axios = require('axios');

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

    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({
                success: false,
                message: 'Razorpay is not configured on the server. Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET.'
            })
        };
    }

    try {
        const payload = JSON.parse(event.body || '{}');
        const rawAmount = Number(payload.amount);
        const amount = Number.isFinite(rawAmount) ? Math.round(rawAmount) : 0;
        const currency = payload.currency || 'INR';

        if (amount <= 0) {
            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ success: false, message: 'A valid amount in paise is required.' })
            };
        }

        const receipt = payload.receipt || `JB_${Date.now()}`;
        const notes = payload.notes && typeof payload.notes === 'object' ? payload.notes : {};

        const response = await axios.post(
            'https://api.razorpay.com/v1/orders',
            {
                amount,
                currency,
                receipt,
                notes,
                payment_capture: 1
            },
            {
                auth: {
                    username: keyId,
                    password: keySecret
                },
                timeout: 15000
            }
        );

        return {
            statusCode: 200,
            headers,
            body: JSON.stringify({
                success: true,
                keyId,
                orderId: response.data.id,
                amount: response.data.amount,
                currency: response.data.currency,
                receipt: response.data.receipt
            })
        };
    } catch (error) {
        const message = error.response?.data?.error?.description || error.message || 'Failed to create Razorpay order';
        return {
            statusCode: 500,
            headers,
            body: JSON.stringify({ success: false, message })
        };
    }
};