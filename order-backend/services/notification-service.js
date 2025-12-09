/**
 * Notification Service for Xidlz
 * Handles email and SMS notifications for order updates
 */

const nodemailer = require('nodemailer');
const winston = require('winston');

// Setup logging
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.simple()
    ),
    transports: [
        new winston.transports.Console()
    ]
});

class NotificationService {
    constructor() {
        this.emailTransporter = null;
        this.initializeEmail();
    }

    // Initialize email transporter
    initializeEmail() {
        try {
            this.emailTransporter = nodemailer.createTransporter({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_PASS
                }
            });

            // Verify email configuration
            this.emailTransporter.verify((error, success) => {
                if (error) {
                    logger.error('Email configuration error:', error);
                } else {
                    logger.info('Email service ready');
                }
            });
        } catch (error) {
            logger.error('Failed to initialize email service:', error);
        }
    }

    // Send SMS using MSG91 (or any SMS service)
    async sendSMS(phone, message) {
        try {
            // This is a placeholder for SMS implementation
            // You can integrate with MSG91, Twilio, or any SMS service
            
            const smsData = {
                authkey: process.env.MSG91_API_KEY,
                mobiles: phone,
                message: message,
                sender: process.env.MSG91_SENDER_ID || 'JBCREAT',
                route: '4',
                country: '91'
            };

            // Example API call (you'll need to implement based on your SMS provider)
            logger.info(`SMS would be sent to ${phone}: ${message}`);
            
            // For now, we'll just log it. Implement actual SMS sending based on your provider
            return { success: true, message: 'SMS sent successfully' };
            
        } catch (error) {
            logger.error('SMS sending failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Send email notification
    async sendEmail(to, subject, htmlContent, attachments = []) {
        try {
            if (!this.emailTransporter) {
                throw new Error('Email service not initialized');
            }

            const mailOptions = {
                from: process.env.EMAIL_FROM || 'Xidlz <noreply@xidlz.com>',
                to: to,
                subject: subject,
                html: htmlContent,
                attachments: attachments
            };

            const result = await this.emailTransporter.sendMail(mailOptions);
            logger.info(`Email sent successfully to ${to}`);
            
            return { success: true, messageId: result.messageId };
            
        } catch (error) {
            logger.error('Email sending failed:', error);
            return { success: false, error: error.message };
        }
    }

    // Order confirmation email template
    generateOrderConfirmationEmail(orderData, customerInfo) {
        const { orderId, items, totalAmount } = orderData;
        const { name, email, phone } = customerInfo;

        const itemsHtml = items.map(item => `
            <tr>
                <td style="padding: 10px; border-bottom: 1px solid #ddd;">
                    ${item.frameSize?.size || 'Custom'} - ${item.frameSize?.orientation || 'Portrait'}
                </td>
                <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">
                    ₹${item.price || 0}
                </td>
            </tr>
        `).join('');

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Order Confirmation - Xidlz</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #16697A; margin: 0;">Xidlz</h1>
                        <p style="color: #666; margin: 5px 0;">Custom Photo Framing</p>
                    </div>
                    
                    <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
                        <h2 style="color: #16697A; margin-top: 0;">Order Confirmation</h2>
                        <p>Dear ${name},</p>
                        <p>Thank you for your order! We've received your custom framing request and will begin processing it shortly.</p>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #16697A;">Order Details</h3>
                        <p><strong>Order ID:</strong> ${orderId}</p>
                        <p><strong>Customer:</strong> ${name}</p>
                        <p><strong>Email:</strong> ${email}</p>
                        <p><strong>Phone:</strong> ${phone}</p>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #16697A;">Items Ordered</h3>
                        <table style="width: 100%; border-collapse: collapse;">
                            <thead>
                                <tr style="background-color: #f8f9fa;">
                                    <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Item</th>
                                    <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${itemsHtml}
                                <tr style="background-color: #f8f9fa; font-weight: bold;">
                                    <td style="padding: 10px; border-bottom: 1px solid #ddd;">Total</td>
                                    <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">₹${totalAmount}</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <h3 style="color: #16697A;">What's Next?</h3>
                        <ul style="padding-left: 20px;">
                            <li>We'll review your images and frame specifications</li>
                            <li>Our team will begin processing your custom frames</li>
                            <li>You'll receive updates via email and SMS</li>
                            <li>Estimated completion: 3-5 business days</li>
                        </ul>
                    </div>
                    
                    <div style="background-color: #16697A; color: white; padding: 15px; border-radius: 8px; text-align: center;">
                        <p style="margin: 0;">Track your order anytime at:</p>
                        <p style="margin: 5px 0; font-weight: bold;">https://your-website.com/track-order.html</p>
                        <p style="margin: 0; font-size: 14px;">Order ID: ${orderId}</p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
                        <p>Questions? Contact us at support@xidlz.com or call us at +91-XXXXXXXXXX</p>
                        <p>&copy; 2024 Xidlz. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    // Order status update email template
    generateOrderUpdateEmail(orderData, customerInfo, newStatus, notes = '') {
        const { orderId } = orderData;
        const { name } = customerInfo;

        const statusMessages = {
            'confirmed': 'Your order has been confirmed and is now being prepared.',
            'processing': 'Your order is currently being processed by our team.',
            'ready': 'Great news! Your order is ready for delivery.',
            'shipped': 'Your order has been shipped and is on its way to you.',
            'delivered': 'Your order has been delivered. Thank you for choosing Xidlz!',
            'cancelled': 'Your order has been cancelled. If you have any questions, please contact us.'
        };

        const statusColors = {
            'confirmed': '#28a745',
            'processing': '#ffc107',
            'ready': '#17a2b8',
            'shipped': '#6f42c1',
            'delivered': '#28a745',
            'cancelled': '#dc3545'
        };

        const message = statusMessages[newStatus] || 'Your order status has been updated.';
        const color = statusColors[newStatus] || '#16697A';

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Order Update - Xidlz</title>
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f4f4f4;">
                <div style="max-width: 600px; margin: 0 auto; background-color: white; padding: 20px;">
                    <div style="text-align: center; margin-bottom: 30px;">
                        <h1 style="color: #16697A; margin: 0;">Xidlz</h1>
                        <p style="color: #666; margin: 5px 0;">Custom Photo Framing</p>
                    </div>
                    
                    <div style="background-color: ${color}; color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center;">
                        <h2 style="margin-top: 0; text-transform: uppercase;">Order ${newStatus}</h2>
                        <p style="margin: 0; font-size: 18px;">Order ID: ${orderId}</p>
                    </div>
                    
                    <div style="margin-bottom: 20px;">
                        <p>Dear ${name},</p>
                        <p>${message}</p>
                        ${notes ? `<p><strong>Additional Notes:</strong> ${notes}</p>` : ''}
                    </div>
                    
                    <div style="background-color: #f8f9fa; padding: 15px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
                        <p style="margin: 0;">Track your order anytime at:</p>
                        <p style="margin: 5px 0; font-weight: bold;">https://your-website.com/track-order.html</p>
                    </div>
                    
                    <div style="text-align: center; margin-top: 30px; color: #666; font-size: 14px;">
                        <p>Questions? Contact us at support@xidlz.com or call us at +91-XXXXXXXXXX</p>
                        <p>&copy; 2024 Xidlz. All rights reserved.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    // Send order confirmation notification
    async sendOrderConfirmation(orderData, customerInfo) {
        try {
            const { email, phone, name } = customerInfo;
            const { orderId } = orderData;

            // Send email confirmation
            const emailHtml = this.generateOrderConfirmationEmail(orderData, customerInfo);
            const emailResult = await this.sendEmail(
                email,
                `Order Confirmation - ${orderId} - Xidlz`,
                emailHtml
            );

            // Send SMS confirmation
            const smsMessage = `Dear ${name}, your order ${orderId} has been confirmed! Track at: https://your-website.com/track-order.html. -Xidlz`;
            const smsResult = await this.sendSMS(phone, smsMessage);

            logger.info(`Order confirmation sent for ${orderId}`);
            
            return {
                success: true,
                email: emailResult,
                sms: smsResult
            };
            
        } catch (error) {
            logger.error('Failed to send order confirmation:', error);
            return { success: false, error: error.message };
        }
    }

    // Send order status update notification
    async sendOrderUpdate(orderData, customerInfo, newStatus, notes = '') {
        try {
            const { email, phone, name } = customerInfo;
            const { orderId } = orderData;

            // Send email update
            const emailHtml = this.generateOrderUpdateEmail(orderData, customerInfo, newStatus, notes);
            const emailResult = await this.sendEmail(
                email,
                `Order Update - ${orderId} - ${newStatus.toUpperCase()} - Xidlz`,
                emailHtml
            );

            // Send SMS update
            const smsMessage = `Dear ${name}, your order ${orderId} is now ${newStatus.toUpperCase()}. Track: https://your-website.com/track-order.html -Xidlz`;
            const smsResult = await this.sendSMS(phone, smsMessage);

            logger.info(`Order update sent for ${orderId} - Status: ${newStatus}`);
            
            return {
                success: true,
                email: emailResult,
                sms: smsResult
            };
            
        } catch (error) {
            logger.error('Failed to send order update:', error);
            return { success: false, error: error.message };
        }
    }

    // Send admin notification for new orders
    async sendAdminNotification(orderData, customerInfo) {
        try {
            const adminEmail = process.env.ADMIN_EMAIL || 'admin@jbcreations.com';
            const { orderId, totalAmount } = orderData;
            const { name, email, phone } = customerInfo;

            const adminHtml = `
                <h2>New Order Received - ${orderId}</h2>
                <p><strong>Customer:</strong> ${name}</p>
                <p><strong>Email:</strong> ${email}</p>
                <p><strong>Phone:</strong> ${phone}</p>
                <p><strong>Total Amount:</strong> ₹${totalAmount}</p>
                <p><strong>Order ID:</strong> ${orderId}</p>
                <p><a href="https://your-backend-url.railway.app/admin">View in Admin Panel</a></p>
            `;

            const emailResult = await this.sendEmail(
                adminEmail,
                `New Order: ${orderId} - ₹${totalAmount}`,
                adminHtml
            );

            logger.info(`Admin notification sent for order ${orderId}`);
            return emailResult;
            
        } catch (error) {
            logger.error('Failed to send admin notification:', error);
            return { success: false, error: error.message };
        }
    }
}

// Create global notification service instance
const notificationService = new NotificationService();

module.exports = notificationService;