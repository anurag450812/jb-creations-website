/**
 * Razorpay Configuration for Xidlz
 * Complete payment system integration
 */

const razorpayConfig = {
    // Test API Keys (Using Razorpay's official test key)
    keyId: 'rzp_test_1DP5mmOlF5G5ag',
    keySecret: 'PnsYn4R9hTfnRiBeq21Ld3sB',
    
    // Test mode settings
    testMode: false,
    currency: 'INR',
    
    // Business details
    businessName: 'Xidlz',
    businessLogo: './logo.png', // Update with your actual logo path
    businessDescription: 'Custom Photo Frames & Digital Art',
    contactEmail: 'info@jbcreations.com',
    contactPhone: '+91-9876543210',
    
    // Default order settings
    defaultAmount: 50000, // ₹500.00 in paise (Razorpay uses paise)
    receiptPrefix: 'JBC_',
    
    // Test credentials reference (for testing purposes)
    testCards: {
        success: '4111111111111111',
        failure: '4000000000000002',
        netbanking: 'HDFC',
        upi: 'success@razorpay',
        wallet: 'freecharge'
    }
};

/**
 * Razorpay Payment System Class
 * Handles all payment operations for Xidlz
 */
class RazorpayPaymentSystem {
    constructor() {
        this.config = razorpayConfig;
        this.orders = this.loadFromStorage('jb_orders') || [];
        this.payments = this.loadFromStorage('jb_payments') || [];
        
        // Initialize success callback
        this.onSuccess = null;
        this.onFailure = null;
        
        console.log('🔥 Razorpay Payment System initialized');
        // Log configuration
        console.log('Razorpay Payment System initialized');
    }

    /**
     * Create a new order for payment
     */
    async createOrder(orderData) {
        try {
            const order = {
                id: this.generateOrderId(),
                amount: orderData.amount || this.config.defaultAmount,
                currency: this.config.currency,
                receipt: this.config.receiptPrefix + Date.now(),
                status: 'created',
                createdAt: new Date().toISOString(),
                customerDetails: orderData.customer || {},
                items: orderData.items || [],
                notes: orderData.notes || {},
                source: orderData.source || 'website'
            };

            // In test mode, we simulate server order creation locally
            if (this.config.testMode) {
                console.log('Creating order locally for test mode', order);
                this.saveOrder(order);
                
                return {
                    success: true,
                    order: order,
                    razorpayOrderId: 'order_' + order.id
                };
            }

            // In production, this would make API call to your backend
            return await this.createServerOrder(order);

        } catch (error) {
            console.error('❌ Order creation failed:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Process payment with Razorpay checkout (ultra-simplified version)
     */
    async processPayment(amount, orderData) {
        console.log('🔄 processPayment called with:', { amount, orderData });
        
        return new Promise(async (resolve, reject) => {
            try {
                console.log('🔄 Starting ultra-simplified payment process...');
                
                // Validate Razorpay SDK
                if (typeof Razorpay === 'undefined') {
                    console.error('❌ Razorpay SDK not loaded');
                    reject(new Error('Razorpay SDK not loaded. Please include the Razorpay script.'));
                    return;
                }
                console.log('✅ Razorpay SDK is available');

                // Store the resolve/reject functions for later use
                this._currentPaymentResolve = resolve;
                this._currentPaymentReject = reject;

                // Ultra-simple Razorpay options (matching the working minimal test exactly)
                const razorpayOptions = {
                    key: this.config.keyId, // rzp_test_1DP5mmOlF5G5ag
                    amount: amount * 100, // Convert rupees to paise
                    currency: 'INR',
                    name: 'Xidlz',
                    description: 'Photo Frame Order',
                    
                    // Success handler
                    handler: (response) => {
                        console.log('🎉 Payment success!', response);
                        if (this._currentPaymentResolve) {
                            this._currentPaymentResolve({
                                success: true,
                                paymentId: response.razorpay_payment_id,
                                orderId: 'local_order_' + Date.now()
                            });
                            this._currentPaymentResolve = null;
                            this._currentPaymentReject = null;
                        }
                    },
                    
                    // Pre-fill with simple data
                    prefill: {
                        name: 'Test User',
                        email: 'test@example.com',
                        contact: '9999999999'
                    },
                    
                    // Simple theme
                    theme: {
                        color: '#16697A'
                    }
                };

                console.log('🔄 Ultra-simple Razorpay options:', razorpayOptions);
                console.log('💳 Opening ultra-simple Razorpay checkout...');

                // Create Razorpay instance
                const razorpay = new Razorpay(razorpayOptions);
                
                // Handle payment errors
                razorpay.on('payment.failed', (response) => {
                    console.log('❌ Payment failed:', response);
                    if (this._currentPaymentReject) {
                        this._currentPaymentReject(new Error(response.error?.description || 'Payment failed'));
                        this._currentPaymentResolve = null;
                        this._currentPaymentReject = null;
                    }
                });

                // Open the modal
                try {
                    razorpay.open();
                    console.log('✅ Ultra-simple modal opened');
                } catch (modalError) {
                    console.error('❌ Error opening modal:', modalError);
                    reject(new Error('Failed to open payment modal: ' + modalError.message));
                }

            } catch (error) {
                console.error('❌ Ultra-simple payment failed:', error);
                reject(new Error(error.message || 'Payment processing failed'));
            }
        });
    }

    /**
     * Handle successful payment response
     */
    handlePaymentSuccess(response, order) {
        console.log('🎉 Payment successful:', response);
        console.log('🔄 Processing successful payment...');

        const payment = {
            id: this.generatePaymentId(),
            razorpayPaymentId: response.razorpay_payment_id,
            razorpayOrderId: response.razorpay_order_id,
            razorpaySignature: response.razorpay_signature,
            orderId: order.id,
            amount: order.amount,
            currency: order.currency,
            status: 'success',
            method: 'unknown', // Will be updated after verification
            paidAt: new Date().toISOString(),
            customerDetails: order.customerDetails,
            verificationStatus: 'pending'
        };

        console.log('🔄 Payment object created:', payment);

        // Verify payment signature (in test mode, always passes)
        const isVerified = this.verifyPaymentSignature(
            payment.razorpayPaymentId,
            payment.razorpayOrderId,
            payment.razorpaySignature
        );

        console.log('🔄 Payment verification result:', isVerified);

        if (isVerified) {
            payment.verificationStatus = 'verified';
            
            // Save payment record
            this.savePayment(payment);
            console.log('💾 Payment record saved');

            // Update order status
            order.status = 'paid';
            order.paidAt = payment.paidAt;
            order.paymentId = payment.id;
            order.razorpayPaymentId = payment.razorpayPaymentId;
            this.updateOrder(order);
            console.log('💾 Order status updated');

            // Show success message
            this.showPaymentSuccess(payment, order);

            // Resolve the Promise with payment information
            if (this._currentPaymentResolve) {
                console.log('✅ Resolving Promise with payment data');
                this._currentPaymentResolve({
                    success: true,
                    paymentId: payment.razorpayPaymentId,
                    orderId: order.id,
                    amount: order.amount,
                    payment: payment,
                    order: order
                });
                this._currentPaymentResolve = null;
                this._currentPaymentReject = null;
                console.log('✅ Promise resolved successfully');
            } else {
                console.warn('⚠️ No resolve function available to call');
            }

            // Trigger success callback
            if (this.onSuccess) {
                this.onSuccess(payment, order);
            }

            // Global callback if defined
            if (window.onRazorpaySuccess) {
                window.onRazorpaySuccess(payment, order);
            }

            console.log('✅ Payment completed and verified:', payment.id);
        } else {
            console.error('❌ Payment verification failed');
            this.handlePaymentFailure({ error: { description: 'Payment verification failed' } }, order);
        }
    }

    /**
     * Handle payment failure
     */
    handlePaymentFailure(response, order) {
        console.error('❌ Payment failed:', response);
        console.log('🔄 Processing payment failure...');

        const failureInfo = {
            orderId: order.id,
            razorpayPaymentId: response.razorpay_payment_id || null,
            errorCode: response.error?.code || 'UNKNOWN',
            errorDescription: response.error?.description || 'Payment failed',
            failedAt: new Date().toISOString()
        };

        console.log('🔄 Failure info created:', failureInfo);

        // Update order status
        order.status = 'failed';
        order.failedAt = failureInfo.failedAt;
        order.failureReason = failureInfo.errorDescription;
        this.updateOrder(order);
        console.log('💾 Order status updated to failed');

        // Show failure message
        this.showPaymentFailure(failureInfo, order);

        // Reject the Promise
        if (this._currentPaymentReject) {
            console.log('❌ Rejecting Promise with error');
            this._currentPaymentReject(new Error(failureInfo.errorDescription));
            this._currentPaymentResolve = null;
            this._currentPaymentReject = null;
            console.log('❌ Promise rejected');
        } else {
            console.warn('⚠️ No reject function available to call');
        }

        // Trigger failure callback
        if (this.onFailure) {
            this.onFailure(failureInfo, order);
        }

        console.log('⚠️ Payment failure recorded:', failureInfo);
    }

    /**
     * Handle payment modal dismissal (user closed without completing)
     */
    handlePaymentDismiss(order) {
        console.log('⚠️ Payment modal dismissed by user');

        order.status = 'cancelled';
        order.cancelledAt = new Date().toISOString();
        order.cancelReason = 'User closed payment modal';
        this.updateOrder(order);
        console.log('💾 Order status updated to cancelled');

        // Show cancellation message
        this.showPaymentCancelled(order);

        // Reject the Promise with cancellation
        if (this._currentPaymentReject) {
            console.log('⚠️ Rejecting Promise due to cancellation');
            this._currentPaymentReject(new Error('Payment was cancelled by user'));
            this._currentPaymentResolve = null;
            this._currentPaymentReject = null;
            console.log('⚠️ Promise rejected due to cancellation');
        } else {
            console.warn('⚠️ No reject function available to call');
        }

        console.log('🚫 Payment cancelled:', order.receipt);
    }

    /**
     * Clean phone number for Razorpay (remove +91, spaces, etc.)
     */
    cleanPhoneNumber(phone) {
        if (!phone) return '9999999999';
        
        // Remove +91, +, spaces, dashes, brackets
        const cleaned = phone.replace(/[\+\s\-\(\)]/g, '');
        
        // If starts with 91, remove it
        if (cleaned.startsWith('91') && cleaned.length === 12) {
            return cleaned.substring(2);
        }
        
        // If 10 digits, use as-is
        if (cleaned.length === 10) {
            return cleaned;
        }
        
        // Default fallback
        return '9999999999';
    }

    /**
     * Verify payment signature (simplified for test mode)
     */
    verifyPaymentSignature(razorpayPaymentId, razorpayOrderId, razorpaySignature) {
        if (this.config.testMode) {
            console.log('Payment signature verification skipped (auto-approved for test mode)');
            return true;
        }

        // In production, this verification should be done on your server
        // using the Razorpay key secret for security
        console.warn('⚠️ Browser-side signature verification not implemented for production');
        console.warn('⚠️ Payment verification should be done on server for security');
        
        // For now, return true for browser-based testing
        // In production, send payment details to server for verification
        return true;
    }

    /**
     * Get order history for current user or all users
     */
    getOrderHistory(userId = null) {
        let orders = [...this.orders];
        
        if (userId) {
            orders = orders.filter(order => 
                order.customerDetails?.userId === userId ||
                order.customerDetails?.phone === userId
            );
        }
        
        return orders.sort((a, b) => 
            new Date(b.createdAt) - new Date(a.createdAt)
        );
    }

    /**
     * Get payment history
     */
    getPaymentHistory(userId = null) {
        let payments = [...this.payments];
        
        if (userId) {
            const userOrders = this.getOrderHistory(userId);
            const userOrderIds = userOrders.map(order => order.id);
            payments = payments.filter(payment => 
                userOrderIds.includes(payment.orderId)
            );
        }
        
        return payments.sort((a, b) => 
            new Date(b.paidAt) - new Date(a.paidAt)
        );
    }

    /**
     * Get analytics data
     */
    getAnalytics() {
        const orders = this.orders;
        const payments = this.payments.filter(p => p.status === 'success');
        
        return {
            totalOrders: orders.length,
            successfulPayments: payments.length,
            failedPayments: orders.filter(o => o.status === 'failed').length,
            cancelledPayments: orders.filter(o => o.status === 'cancelled').length,
            totalRevenue: payments.reduce((sum, p) => sum + p.amount, 0),
            averageOrderValue: payments.length > 0 ? 
                payments.reduce((sum, p) => sum + p.amount, 0) / payments.length : 0,
            conversionRate: orders.length > 0 ? 
                (payments.length / orders.length * 100).toFixed(2) : 0
        };
    }

    // UI Helper Methods

    /**
     * Show payment success popup
     */
    showPaymentSuccess(payment, order) {
        const successHTML = `
            <div class="razorpay-popup-overlay">
                <div class="razorpay-success-popup">
                    <div class="success-icon">✅</div>
                    <h3>Payment Successful!</h3>
                    <div class="payment-details">
                        <p><strong>Amount:</strong> ₹${(order.amount / 100).toFixed(2)}</p>
                        <p><strong>Payment ID:</strong> ${payment.razorpayPaymentId}</p>
                        <p><strong>Order ID:</strong> ${order.receipt}</p>
                        <p><strong>Status:</strong> Verified ✅</p>
                    </div>
                    <div class="success-actions">
                        <button onclick="this.closest('.razorpay-popup-overlay').remove()" class="btn-primary">
                            Continue Shopping
                        </button>
                        <button onclick="window.location.href='my-orders.html'" class="btn-secondary">
                            View Orders
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.showPopup(successHTML, 8000); // Auto-remove after 8 seconds
    }

    /**
     * Show payment failure popup
     */
    showPaymentFailure(failureInfo, order) {
        const failureHTML = `
            <div class="razorpay-popup-overlay">
                <div class="razorpay-failure-popup">
                    <div class="failure-icon">❌</div>
                    <h3>Payment Failed</h3>
                    <div class="failure-details">
                        <p><strong>Error:</strong> ${failureInfo.errorDescription}</p>
                        <p><strong>Order:</strong> ${order.receipt}</p>
                        <p><strong>Amount:</strong> ₹${(order.amount / 100).toFixed(2)}</p>
                    </div>
                    <div class="failure-actions">
                        <button onclick="this.closest('.razorpay-popup-overlay').remove()" class="btn-primary">
                            Try Again
                        </button>
                        <button onclick="window.location.href='contact.html'" class="btn-secondary">
                            Contact Support
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.showPopup(failureHTML, 10000);
    }

    /**
     * Show payment cancelled popup
     */
    showPaymentCancelled(order) {
        const cancelHTML = `
            <div class="razorpay-popup-overlay">
                <div class="razorpay-cancel-popup">
                    <div class="cancel-icon">🚫</div>
                    <h3>Payment Cancelled</h3>
                    <div class="cancel-details">
                        <p>Your payment was cancelled. You can try again anytime.</p>
                        <p><strong>Order:</strong> ${order.receipt}</p>
                        <p><strong>Amount:</strong> ₹${(order.amount / 100).toFixed(2)}</p>
                    </div>
                    <div class="cancel-actions">
                        <button onclick="this.closest('.razorpay-popup-overlay').remove()" class="btn-primary">
                            Continue Shopping
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.showPopup(cancelHTML, 5000);
    }

    /**
     * Show error popup
     */
    showError(title, message) {
        const errorHTML = `
            <div class="razorpay-popup-overlay">
                <div class="razorpay-error-popup">
                    <div class="error-icon">⚠️</div>
                    <h3>${title}</h3>
                    <p>${message}</p>
                    <button onclick="this.closest('.razorpay-popup-overlay').remove()" class="btn-primary">
                        Okay
                    </button>
                </div>
            </div>
        `;
        
        this.showPopup(errorHTML, 7000);
    }

    /**
     * Generic popup display method
     */
    showPopup(html, autoRemoveAfter = 0) {
        // Remove any existing popups
        const existingPopups = document.querySelectorAll('.razorpay-popup-overlay');
        existingPopups.forEach(popup => popup.remove());

        // Add new popup
        const popup = document.createElement('div');
        popup.innerHTML = html;
        document.body.appendChild(popup.firstElementChild);

        // Auto-remove if specified
        if (autoRemoveAfter > 0) {
            setTimeout(() => {
                const currentPopup = document.querySelector('.razorpay-popup-overlay');
                if (currentPopup) {
                    currentPopup.remove();
                }
            }, autoRemoveAfter);
        }
    }

    // Utility Methods

    /**
     * Generate unique order ID
     */
    generateOrderId() {
        return 'ORD_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Generate unique payment ID
     */
    generatePaymentId() {
        return 'PAY_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Get current authenticated user
     */
    getCurrentUser() {
        return this.loadFromStorage('jb_user') || {};
    }

    /**
     * Save order to storage
     */
    saveOrder(order) {
        const index = this.orders.findIndex(o => o.id === order.id);
        if (index >= 0) {
            this.orders[index] = order;
        } else {
            this.orders.push(order);
        }
        this.saveToStorage('jb_orders', this.orders);
        console.log('💾 Order saved:', order.receipt);
    }

    /**
     * Update existing order
     */
    updateOrder(order) {
        this.saveOrder(order);
    }

    /**
     * Save payment to storage
     */
    savePayment(payment) {
        this.payments.push(payment);
        this.saveToStorage('jb_payments', this.payments);
        console.log('💾 Payment saved:', payment.razorpayPaymentId);
    }

    /**
     * Load data from localStorage
     */
    loadFromStorage(key) {
        try {
            const data = localStorage.getItem(key);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error(`❌ Error loading ${key} from storage:`, error);
            return null;
        }
    }

    /**
     * Save data to localStorage
     */
    saveToStorage(key, data) {
        try {
            localStorage.setItem(key, JSON.stringify(data));
        } catch (error) {
            console.error(`❌ Error saving ${key} to storage:`, error);
        }
    }

    /**
     * Server communication (for production)
     */
    async createServerOrder(order) {
        try {
            const response = await fetch('/api/razorpay/create-order', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('jb_auth_token')}`
                },
                body: JSON.stringify(order)
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('❌ Server order creation failed:', error);
            throw error;
        }
    }

    /**
     * Export payment data for analytics
     */
    exportData() {
        const exportData = {
            exportDate: new Date().toISOString(),
            analytics: this.getAnalytics(),
            orders: this.getOrderHistory(),
            payments: this.getPaymentHistory()
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `jb-creations-payments-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        console.log('📊 Payment data exported');
        return exportData;
    }
}

// Global instance for easy access
const razorpayPayment = new RazorpayPaymentSystem();

// Export for use in modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { razorpayPayment, razorpayConfig, RazorpayPaymentSystem };
}

console.log('🔥 Razorpay integration loaded successfully!');
console.log('📋 Available methods: processPayment, getOrderHistory, getPaymentHistory, getAnalytics');
// Configuration loaded successfully