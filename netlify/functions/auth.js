// Netlify Function for User Authentication
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
            const { action, mobile, otp } = JSON.parse(event.body);

            // Simple demo authentication
            if (action === 'send_otp') {
                return {
                    statusCode: 200,
                    headers,
                    body: JSON.stringify({
                        success: true,
                        message: 'OTP sent successfully!',
                        demo_otp: '123456' // For demo purposes
                    })
                };
            }

            if (action === 'verify_otp') {
                // Simple demo verification
                if (otp === '123456') {
                    return {
                        statusCode: 200,
                        headers,
                        body: JSON.stringify({
                            success: true,
                            message: 'Login successful!',
                            user: {
                                mobile: mobile,
                                name: 'Demo User'
                            },
                            token: 'demo_token_' + Date.now()
                        })
                    };
                } else {
                    return {
                        statusCode: 400,
                        headers,
                        body: JSON.stringify({
                            success: false,
                            message: 'Invalid OTP'
                        })
                    };
                }
            }

            return {
                statusCode: 400,
                headers,
                body: JSON.stringify({ error: 'Invalid action' })
            };

        } catch (error) {
            return {
                statusCode: 500,
                headers,
                body: JSON.stringify({ error: 'Server error' })
            };
        }
    }

    return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' })
    };
};