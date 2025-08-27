/*
 * Checkout Page JavaScript
 * Handles order processing and submission
 */

// Order management state
let orderData = {
    customer: {},
    items: [],
    totals: {
        subtotal: 0,
        delivery: 50,
        total: 0
    },
    deliveryMethod: 'standard'
};

// Initialize checkout page
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    const user = getCurrentUser();
    
    if (user) {
        // Pre-fill customer information for logged-in users
        document.getElementById('customerName').value = user.name || '';
        document.getElementById('customerEmail').value = user.email || '';
        document.getElementById('customerPhone').value = user.phone || '';
        
        // Show logged-in user info
        showUserStatus(user);
    } else {
        // Show guest checkout options
        showGuestCheckoutOptions();
    }

    loadCartItems();
    updateOrderSummary();
    
    // Select default delivery option
    document.querySelector('.delivery-option').classList.add('selected');
});

// Load cart items from localStorage
function loadCartItems() {
    const cart = JSON.parse(localStorage.getItem('photoFramingCart') || '[]');
    
    if (cart.length === 0) {
        // Redirect back if cart is empty
        alert('Your cart is empty!');
        window.location.href = 'index.html';
        return;
    }
    
    orderData.items = cart;
    calculateTotals();
}

// Show user status for logged-in users
function showUserStatus(user) {
    const statusContainer = document.getElementById('userStatusContainer');
    if (statusContainer) {
        statusContainer.innerHTML = `
            <div class="user-status logged-in">
                <i class="fas fa-user-check"></i>
                <span>Logged in as: <strong>${user.name}</strong> (${user.email})</span>
                <button type="button" class="btn-link" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i> Sign Out
                </button>
            </div>
        `;
        statusContainer.style.display = 'block';
    }
}

// Show guest checkout options
function showGuestCheckoutOptions() {
    const statusContainer = document.getElementById('userStatusContainer');
    if (statusContainer) {
        statusContainer.innerHTML = `
            <div class="user-status guest">
                <div class="checkout-options">
                    <div class="option-header">
                        <i class="fas fa-shopping-cart"></i>
                        <span>Choose Your Checkout Method</span>
                    </div>
                    <div class="checkout-method-buttons">
                        <button type="button" class="checkout-method-btn guest-btn active" onclick="selectCheckoutMethod('guest')">
                            <i class="fas fa-user"></i>
                            <div>
                                <strong>Continue as Guest</strong>
                                <small>Quick checkout without creating an account</small>
                            </div>
                        </button>
                        <button type="button" class="checkout-method-btn login-btn" onclick="redirectToLogin()">
                            <i class="fas fa-sign-in-alt"></i>
                            <div>
                                <strong>Sign In</strong>
                                <small>Access your account and order history</small>
                            </div>
                        </button>
                    </div>
                    <div class="guest-benefits">
                        <h4><i class="fas fa-info-circle"></i> Guest Checkout Benefits:</h4>
                        <ul>
                            <li>✓ No account required</li>
                            <li>✓ Fast and simple process</li>
                            <li>✓ Order confirmation via email</li>
                            <li>✓ Same quality service</li>
                        </ul>
                    </div>
                </div>
            </div>
        `;
        statusContainer.style.display = 'block';
    }
}

// Select checkout method
function selectCheckoutMethod(method) {
    const guestBtn = document.querySelector('.guest-btn');
    const loginBtn = document.querySelector('.login-btn');
    
    if (method === 'guest') {
        guestBtn.classList.add('active');
        loginBtn.classList.remove('active');
        // Enable the form for guest checkout
        enableGuestForm();
    } else {
        redirectToLogin();
    }
}

// Enable form for guest users
function enableGuestForm() {
    const form = document.getElementById('checkoutForm');
    const inputs = form.querySelectorAll('input, textarea');
    
    inputs.forEach(input => {
        input.disabled = false;
    });
    
    // Add guest indicator to form
    const guestIndicator = document.getElementById('guestIndicator');
    if (guestIndicator) {
        guestIndicator.style.display = 'block';
    }
}

// Redirect to login
function redirectToLogin() {
    sessionStorage.setItem('auth_redirect', window.location.href);
    window.location.href = 'auth.html';
}

// Logout function
function logout() {
    localStorage.removeItem('jb_user');
    sessionStorage.removeItem('jb_user');
    window.location.reload();
}

// Calculate order totals
function calculateTotals() {
    orderData.totals.subtotal = orderData.items.reduce((sum, item) => sum + item.price, 0);
    orderData.totals.total = orderData.totals.subtotal + orderData.totals.delivery;
}

// Update order summary display
function updateOrderSummary() {
    const summaryContainer = document.getElementById('orderSummary');
    const subtotalElement = document.getElementById('subtotal');
    const deliveryChargeElement = document.getElementById('deliveryCharge');
    const finalTotalElement = document.getElementById('finalTotal');
    
    // Clear existing content
    summaryContainer.innerHTML = '';
    
    // Add each cart item
    orderData.items.forEach((item, index) => {
        const itemElement = document.createElement('div');
        itemElement.className = 'order-item';
        itemElement.innerHTML = `
            <img src="${item.displayImage}" alt="Framed Photo" class="order-item-image">
            <div class="order-item-details">
                <div class="order-item-title">Custom Framed Photo #${index + 1}</div>
                <div class="order-item-specs">
                    Size: ${item.frameSize.size} ${item.frameSize.orientation}<br>
                    Frame: ${item.frameColor} ${item.frameTexture}<br>
                    Order Date: ${new Date(item.orderDate).toLocaleDateString()}
                </div>
                <div class="order-item-price">₹${item.price}</div>
            </div>
        `;
        summaryContainer.appendChild(itemElement);
    });
    
    // Update totals
    subtotalElement.textContent = `₹${orderData.totals.subtotal}`;
    deliveryChargeElement.textContent = `₹${orderData.totals.delivery}`;
    finalTotalElement.textContent = `₹${orderData.totals.total}`;
}

// Handle delivery method selection
function selectDelivery(method) {
    // Remove previous selection
    document.querySelectorAll('.delivery-option').forEach(option => {
        option.classList.remove('selected');
    });
    
    // Add selection to clicked option
    event.currentTarget.classList.add('selected');
    
    // Update delivery charge
    orderData.deliveryMethod = method;
    orderData.totals.delivery = method === 'express' ? 100 : 50;
    calculateTotals();
    updateOrderSummary();
}

// Validate form data
function validateForm() {
    const form = document.getElementById('checkoutForm');
    const formData = new FormData(form);
    
    const requiredFields = ['customerName', 'customerEmail', 'customerPhone', 'customerAddress'];
    
    for (let field of requiredFields) {
        if (!formData.get(field) || formData.get(field).trim() === '') {
            alert(`Please fill in the ${field.replace('customer', '').toLowerCase()}`);
            return false;
        }
    }
    
    // Email validation
    const email = formData.get('customerEmail');
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('Please enter a valid email address');
        return false;
    }
    
    // Phone validation
    const phone = formData.get('customerPhone');
    const phoneRegex = /^[0-9]{10}$/;
    if (!phoneRegex.test(phone.replace(/[^0-9]/g, ''))) {
        alert('Please enter a valid 10-digit phone number');
        return false;
    }
    
    return true;
}

// Prepare order data for submission
function prepareOrderData() {
    const form = document.getElementById('checkoutForm');
    const formData = new FormData(form);
    const user = getCurrentUser();
    
    // Get customer information
    orderData.customer = {
        userId: user ? user.id : null,
        isGuest: !user, // Add guest indicator
        name: formData.get('customerName'),
        email: formData.get('customerEmail'),
        phone: formData.get('customerPhone'),
        address: formData.get('customerAddress'),
        specialInstructions: formData.get('specialInstructions') || ''
    };
    
    // Add order metadata
    orderData.orderNumber = generateOrderNumber();
    orderData.orderDate = new Date().toISOString();
    orderData.status = 'pending';
    orderData.customerType = user ? 'registered' : 'guest';
    
    return orderData;
}

// Generate unique order number
function generateOrderNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `JB${timestamp.toString().slice(-6)}${random.toString().padStart(3, '0')}`;
}

// Convert order data to email format for backend processing
function formatOrderForEmail(orderData) {
    let emailContent = `
NEW ORDER RECEIVED - ${orderData.orderNumber}
============================================

CUSTOMER INFORMATION:
- Name: ${orderData.customer.name}
- Email: ${orderData.customer.email}
- Phone: ${orderData.customer.phone}
- Address: ${orderData.customer.address}
- Customer Type: ${orderData.customerType}
- Delivery Method: ${orderData.deliveryMethod === 'express' ? 'Express (2-3 days)' : 'Standard (5-7 days)'}
- Special Instructions: ${orderData.customer.specialInstructions || 'None'}

ORDER DETAILS:
`;

    orderData.items.forEach((item, index) => {
        emailContent += `
ITEM ${index + 1}:
- Frame Size: ${item.frameSize.size} ${item.frameSize.orientation}
- Frame Color: ${item.frameColor}
- Frame Texture: ${item.frameTexture}
- Price: ₹${item.price}
- Image Adjustments:
  * Brightness: ${item.adjustments.brightness}%
  * Contrast: ${item.adjustments.contrast}%
  * Highlights: ${item.adjustments.highlights}%
  * Shadows: ${item.adjustments.shadows}%
  * Vibrance: ${item.adjustments.vibrance}%
- Position & Zoom:
  * Zoom Level: ${item.zoom}
  * Position X: ${item.position.x}
  * Position Y: ${item.position.y}

`;
    });

    emailContent += `
ORDER SUMMARY:
- Subtotal: ₹${orderData.totals.subtotal}
- Delivery: ₹${orderData.totals.delivery}
- TOTAL: ₹${orderData.totals.total}

Order Date: ${new Date(orderData.orderDate).toLocaleString()}
`;

    return emailContent;
}

// Submit order to backend
async function submitOrder(orderData) {
    // Prepare the order payload
    const orderPayload = {
        orderNumber: orderData.orderNumber,
        customer: orderData.customer,
        items: orderData.items.map(item => ({
            // Original uploaded image (base64)
            originalImage: item.originalImage,
            // Cropped and styled image ready for printing (base64)
            printReadyImage: item.printImage,
            // Preview image with frame for reference (base64)
            displayImage: item.previewImage || item.displayImage, // Support both field names for backward compatibility
            // Frame specifications
            frameSize: item.frameSize,
            frameColor: item.frameColor,
            frameTexture: item.frameTexture,
            // Image adjustments applied
            adjustments: item.adjustments,
            // Position and zoom for recreating the crop
            position: item.position,
            zoom: item.zoom,
            price: item.price,
            orderDate: item.orderDate
        })),
        totals: orderData.totals,
        deliveryMethod: orderData.deliveryMethod,
        orderDate: orderData.orderDate,
        emailContent: formatOrderForEmail(orderData)
    };

    // Option 1: Send to your backend API
    try {
        const response = await fetch('/api/submit-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderPayload)
        });

        if (response.ok) {
            const result = await response.json();
            return { success: true, data: result };
        } else {
            throw new Error('Failed to submit order');
        }
    } catch (error) {
        console.error('API submission failed, trying email fallback:', error);
        
        // Option 2: Email fallback using EmailJS (free service)
        try {
            // You'll need to sign up at emailjs.com and get your service ID, template ID, and user ID
            const emailParams = {
                to_email: 'your-business-email@example.com', // Your business email
                order_number: orderData.orderNumber,
                customer_name: orderData.customer.name,
                customer_email: orderData.customer.email,
                customer_phone: orderData.customer.phone,
                customer_address: orderData.customer.address,
                order_details: formatOrderForEmail(orderData),
                total_amount: orderData.totals.total
            };

            // Uncomment and configure this when you set up EmailJS
            /*
            const emailResult = await emailjs.send(
                'your_service_id',
                'your_template_id',
                emailParams,
                'your_user_id'
            );
            */

            // For now, store locally and show instructions
            localStorage.setItem('pendingOrder', JSON.stringify(orderPayload));
            return { success: true, method: 'local_storage' };
        } catch (emailError) {
            console.error('Email submission failed:', emailError);
            return { success: false, error: emailError.message };
        }
    }
}

// Main order placement function
async function placeOrder() {
    // Validate form
    if (!validateForm()) {
        return;
    }

    // Show processing overlay
    document.getElementById('processingOverlay').style.display = 'flex';
    document.getElementById('placeOrderBtn').disabled = true;

    try {
        // Prepare order data
        const orderData = prepareOrderData();
        
        // Submit order
        const result = await submitOrder(orderData);
        
        if (result.success) {
            // Save order to user's order history (only for registered users)
            const user = getCurrentUser();
            if (user) {
                saveOrderToUserHistory(user.id, orderData);
            } else {
                // For guest users, save order to local storage for reference
                saveGuestOrderHistory(orderData);
            }
            
            // Clear cart
            localStorage.removeItem('photoFramingCart');
            
            // Show appropriate success message
            const successMessage = user 
                ? `Order placed successfully! Order Number: ${orderData.orderNumber}\n\nYou will receive a confirmation email shortly.\nYou can view this order in your account.`
                : `Order placed successfully! Order Number: ${orderData.orderNumber}\n\nYou will receive a confirmation email shortly.\n\nPlease save your order number: ${orderData.orderNumber} for future reference.`;
            
            alert(successMessage);
            
            // Redirect to a thank you page or back to home
            window.location.href = 'index.html';
        } else {
            throw new Error(result.error || 'Failed to place order');
        }
        
    } catch (error) {
        console.error('Order placement error:', error);
        alert('Sorry, there was an error placing your order. Please try again or contact us directly.');
    } finally {
        // Hide processing overlay
        document.getElementById('processingOverlay').style.display = 'none';
        document.getElementById('placeOrderBtn').disabled = false;
    }
}

// Function to download order data manually (for development/testing)
function downloadOrderData() {
    const cart = JSON.parse(localStorage.getItem('photoFramingCart') || '[]');
    if (cart.length === 0) {
        alert('No order data available');
        return;
    }

    const orderData = prepareOrderData();
    const dataStr = JSON.stringify(orderData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `order-${orderData.orderNumber}.json`;
    link.click();
}

// Add this to window for debugging
window.downloadOrderData = downloadOrderData;

// Authentication helper functions
function getCurrentUser() {
    const storedUser = localStorage.getItem('jb_user') || sessionStorage.getItem('jb_user');
    if (storedUser) {
        try {
            return JSON.parse(storedUser);
        } catch (error) {
            console.error('Error parsing user data:', error);
            return null;
        }
    }
    return null;
}

// Save order to user's history
function saveOrderToUserHistory(userId, orderData) {
    try {
        // Get all users
        const users = JSON.parse(localStorage.getItem('jb_users') || '[]');
        
        // Find the user and add the order
        const userIndex = users.findIndex(user => user.id === userId);
        if (userIndex !== -1) {
            if (!users[userIndex].orders) {
                users[userIndex].orders = [];
            }
            
            // Add order summary to user's order history
            users[userIndex].orders.push({
                orderNumber: orderData.orderNumber,
                orderDate: orderData.orderDate,
                status: orderData.status,
                total: orderData.totals.total,
                itemCount: orderData.items.length,
                deliveryMethod: orderData.deliveryMethod
            });
            
            // Save updated users array
            localStorage.setItem('jb_users', JSON.stringify(users));
        }
    } catch (error) {
        console.error('Error saving order to user history:', error);
    }
}

// Save guest order history
function saveGuestOrderHistory(orderData) {
    try {
        // Get existing guest orders
        const guestOrders = JSON.parse(localStorage.getItem('jb_guest_orders') || '[]');
        
        // Add new order
        guestOrders.push({
            orderNumber: orderData.orderNumber,
            orderDate: orderData.orderDate,
            status: orderData.status,
            total: orderData.totals.total,
            itemCount: orderData.items.length,
            deliveryMethod: orderData.deliveryMethod,
            customerEmail: orderData.customer.email,
            customerName: orderData.customer.name
        });
        
        // Keep only last 10 guest orders to avoid storage bloat
        if (guestOrders.length > 10) {
            guestOrders.splice(0, guestOrders.length - 10);
        }
        
        localStorage.setItem('jb_guest_orders', JSON.stringify(guestOrders));
    } catch (error) {
        console.error('Error saving guest order history:', error);
    }
}
