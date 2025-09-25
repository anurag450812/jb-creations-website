// Cart functionality for the dedicated cart page
class CartManager {
    constructor() {
        this.cart = this.loadCart();
        this.promoCodes = {
            'WELCOME10': { discount: 10, type: 'percentage', description: '10% off your first order' },
            'SAVE50': { discount: 50, type: 'fixed', description: '₹50 off your order' },
            'FRAME20': { discount: 20, type: 'percentage', description: '20% off all frames' }
        };
        this.appliedPromo = null;
        this.init();
    }

    init() {
        this.renderCart();
        this.attachEventListeners();
        this.updateHeader();
    }

    loadCart() {
        const cartData = sessionStorage.getItem('photoFramingCart');
        return cartData ? JSON.parse(cartData) : [];
    }

    saveCart() {
        sessionStorage.setItem('photoFramingCart', JSON.stringify(this.cart));
        this.updateHeader();
    }

    attachEventListeners() {
        // Clear cart button (if it exists)
        const clearCartBtn = document.getElementById('clearCartBtn');
        if (clearCartBtn) {
            clearCartBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear your cart?')) {
                    this.clearCart();
                }
            });
        }

        // Coupon section toggle
        document.getElementById('applyCouponBtn').addEventListener('click', () => {
            const promoSection = document.getElementById('promoSection');
            const applyCouponBtn = document.getElementById('applyCouponBtn');
            
            if (promoSection.style.display === 'none' || promoSection.style.display === '') {
                promoSection.style.display = 'block';
                applyCouponBtn.textContent = 'Hide Coupon';
            } else {
                promoSection.style.display = 'none';
                applyCouponBtn.textContent = 'Apply Coupon';
            }
        });

        // Promo code application
        document.getElementById('applyPromoBtn').addEventListener('click', () => {
            this.applyPromoCode();
        });

        // Enter key for promo code
        document.getElementById('promoCodeInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.applyPromoCode();
            }
        });

        // Header functionality
        this.setupHeaderFunctionality();
    }

    setupHeaderFunctionality() {
        // Profile dropdown functionality
        const profileBtn = document.getElementById('profileBtn');
        const profileDropdownMenu = document.getElementById('profileDropdownMenu');
        
        if (profileBtn && profileDropdownMenu) {
            profileBtn.addEventListener('click', function(e) {
                e.stopPropagation();
                profileDropdownMenu.classList.toggle('show');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', function() {
                profileDropdownMenu.classList.remove('show');
            });
        }

        // Cart button (current page, so just update count)
        const headerCartBtn = document.getElementById('headerCartBtn');
        if (headerCartBtn) {
            headerCartBtn.addEventListener('click', function() {
                // Already on cart page, just scroll to top
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
        }
    }

    renderCart() {
        const cartItemsContainer = document.getElementById('cartItems');
        const cartEmptyContainer = document.getElementById('cartEmpty');

        if (this.cart.length === 0) {
            cartItemsContainer.style.display = 'none';
            cartEmptyContainer.style.display = 'block';
            this.updateSummary();
            return;
        }

        cartEmptyContainer.style.display = 'none';
        cartItemsContainer.style.display = 'block';

        cartItemsContainer.innerHTML = this.cart.map((item, index) => {
            console.log(`Cart item ${index}:`, {
                hasPrintImage: !!item.printImage,
                hasPreviewImage: !!item.previewImage,
                printImageType: typeof item.printImage,
                previewImageType: typeof item.previewImage,
                printImageLength: item.printImage ? item.printImage.length : 0,
                previewImageLength: item.previewImage ? item.previewImage.length : 0,
                startsWithDataImage: item.printImage && item.printImage.startsWith('data:image/'),
                previewStartsWithDataImage: item.previewImage && item.previewImage.startsWith('data:image/')
            });
            
            return `
            <div class="cart-item" data-index="${index}">
                <div class="cart-item-image">
                    ${item.previewImage ? 
                        `<img src="${item.previewImage}" alt="Frame Preview">` : 
                        item.printImage ? 
                        `<img src="${item.printImage}" alt="Frame Preview">` : 
                        '<i class="fas fa-image"></i>'
                    }
                </div>
                <div class="cart-item-details">
                    <h4 class="cart-item-title">Custom Photo Frame</h4>
                    <div class="cart-item-specs">
                        <div class="cart-item-spec">
                            <i class="fas fa-ruler-combined"></i>
                            ${item.frameSize ? `${item.frameSize.size}` : 'N/A'}
                        </div>
                        <div class="cart-item-spec">
                            <i class="fas fa-palette"></i>
                            ${item.frameColor || 'Default'}
                        </div>
                        <div class="cart-item-spec">
                            <i class="fas fa-image"></i>
                            ${item.frameSize ? (item.frameSize.orientation || 'Landscape') : 'N/A'}
                        </div>
                    </div>
                    <div class="cart-item-spec">
                        <i class="fas fa-calendar-plus"></i>
                        Added ${this.formatDate(item.timestamp)}
                    </div>
                </div>
                <div class="cart-item-actions">
                    <div class="cart-item-price">₹${item.price}</div>
                    <div class="cart-item-controls">
                        <div class="quantity-control">
                            <button class="quantity-btn quantity-decrease" data-index="${index}">
                                <i class="fas fa-minus"></i>
                            </button>
                            <span class="quantity-display">${item.quantity || 1}</span>
                            <button class="quantity-btn quantity-increase" data-index="${index}">
                                <i class="fas fa-plus"></i>
                            </button>
                        </div>
                        <button class="remove-item-btn" data-index="${index}">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
            </div>
            `;
        }).join('');

        // Add event listeners for all buttons
        this.attachCartItemListeners();
        this.updateSummary();
    }

    attachCartItemListeners() {
        // Remove item buttons
        document.querySelectorAll('.remove-item-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                this.removeItem(index);
            });
        });

        // Quantity buttons
        document.querySelectorAll('.quantity-decrease').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                this.updateQuantity(index, -1);
            });
        });

        document.querySelectorAll('.quantity-increase').forEach(button => {
            button.addEventListener('click', (e) => {
                const index = parseInt(e.currentTarget.dataset.index);
                this.updateQuantity(index, 1);
            });
        });
    }

    updateQuantity(index, change) {
        if (index >= 0 && index < this.cart.length) {
            const item = this.cart[index];
            const newQuantity = (item.quantity || 1) + change;
            
            if (newQuantity <= 0) {
                this.removeItem(index);
                return;
            }
            
            if (newQuantity > 10) {
                alert('Maximum quantity per item is 10');
                return;
            }

            item.quantity = newQuantity;
            this.saveCart();
            this.renderCart();
        }
    }

    removeItem(index) {
        if (index >= 0 && index < this.cart.length) {
            if (confirm('Remove this item from your cart?')) {
                this.cart.splice(index, 1);
                this.saveCart();
                this.renderCart();
            }
        }
    }

    clearCart() {
        this.cart = [];
        this.appliedPromo = null;
        this.saveCart();
        this.renderCart();
    }

    updateSummary() {
        const itemCount = this.cart.reduce((total, item) => total + (item.quantity || 1), 0);
        const subtotal = this.cart.reduce((total, item) => total + (item.price * (item.quantity || 1)), 0);
        
        // Calculate tax (18% GST)
        const taxRate = 0.18;
        const tax = Math.round(subtotal * taxRate);
        
        // Calculate shipping (free for orders above ₹1000)
        const shippingThreshold = 1000;
        const shippingCost = subtotal >= shippingThreshold ? 0 : 100;
        
        // Apply discount if promo code is applied
        let discount = 0;
        if (this.appliedPromo) {
            if (this.appliedPromo.type === 'percentage') {
                discount = Math.round(subtotal * (this.appliedPromo.discount / 100));
            } else {
                discount = this.appliedPromo.discount;
            }
        }
        
        const total = subtotal + tax + shippingCost - discount;

        // Update DOM elements
        document.getElementById('itemCount').textContent = itemCount;
        document.getElementById('subtotalAmount').textContent = subtotal;
        document.getElementById('taxAmount').textContent = tax;
        document.getElementById('shippingAmount').textContent = shippingCost === 0 ? 'Free' : `₹${shippingCost}`;
        document.getElementById('totalAmount').textContent = total;

        // Show/hide discount row
        const discountRow = document.getElementById('discountRow');
        if (discount > 0) {
            document.getElementById('discountAmount').textContent = discount;
            discountRow.style.display = 'flex';
        } else {
            discountRow.style.display = 'none';
        }

        // Enable/disable checkout button
        const checkoutBtn = document.getElementById('checkoutBtn');
        if (this.cart.length === 0) {
            checkoutBtn.style.opacity = '0.5';
            checkoutBtn.style.pointerEvents = 'none';
        } else {
            checkoutBtn.style.opacity = '1';
            checkoutBtn.style.pointerEvents = 'auto';
        }
    }

    applyPromoCode() {
        const promoInput = document.getElementById('promoCodeInput');
        const promoCode = promoInput.value.trim().toUpperCase();

        if (!promoCode) {
            alert('Please enter a promo code');
            return;
        }

        if (this.promoCodes[promoCode]) {
            this.appliedPromo = this.promoCodes[promoCode];
            promoInput.value = '';
            promoInput.placeholder = `Applied: ${promoCode}`;
            promoInput.style.background = 'rgba(39, 174, 96, 0.1)';
            document.getElementById('applyPromoBtn').textContent = 'Applied!';
            document.getElementById('applyPromoBtn').style.background = '#27ae60';
            
            this.updateSummary();
            
            // Show success message
            this.showMessage(`Promo code applied! ${this.appliedPromo.description}`, 'success');
        } else {
            this.showMessage('Invalid promo code. Please try again.', 'error');
            promoInput.focus();
        }
    }

    showMessage(message, type) {
        // Create and show a temporary message
        const messageDiv = document.createElement('div');
        messageDiv.style.cssText = `
            position: fixed;
            top: 100px;
            right: 20px;
            padding: 15px 25px;
            border-radius: 8px;
            color: white;
            font-weight: 600;
            z-index: 10000;
            animation: slideIn 0.3s ease;
            ${type === 'success' ? 'background: #27ae60;' : 'background: #e74c3c;'}
        `;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    updateHeader() {
        const cartCount = document.getElementById('cartCount');
        if (cartCount) {
            const totalItems = this.cart.reduce((total, item) => total + (item.quantity || 1), 0);
            cartCount.textContent = totalItems;
        }
    }

    formatDate(timestamp) {
        if (!timestamp) return 'Recently';
        const date = new Date(timestamp);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays === 1) return 'Today';
        if (diffDays === 2) return 'Yesterday';
        if (diffDays <= 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
    }
}

// Common header functions
async function viewProfile() {
    try {
        // Use Firebase OTP auth system
        if (typeof window.otpAuth !== 'undefined') {
            const user = await window.otpAuth.getCurrentUser();
            if (user) {
                const registrationDate = user.registrationDate ? new Date(user.registrationDate).toLocaleDateString() : 'Unknown';
                alert(`Profile for ${user.name || 'User'}\nPhone: ${user.phone || 'Unknown'}\nEmail: ${user.email || 'Not provided'}\nMember since: ${registrationDate}\nUser ID: ${user.id || 'N/A'}`);
                return;
            }
        }
        
        // Fallback to localStorage if Firebase isn't ready
        const userDataStr = localStorage.getItem('jb_current_user');
        if (userDataStr) {
            let userData;
            try {
                userData = JSON.parse(userDataStr);
            } catch (parseError) {
                // Handle old format (just phone number)
                if (userDataStr.startsWith('+91') || userDataStr.startsWith('+')) {
                    userData = { phone: userDataStr, name: 'User' };
                } else {
                    alert('Please sign in to view your profile.');
                    return;
                }
            }
            
            if (userData && userData.phone) {
                const registrationDate = userData.registrationDate ? new Date(userData.registrationDate).toLocaleDateString() : 'Unknown';
                alert(`Profile for ${userData.name || 'User'}\nPhone: ${userData.phone || 'Unknown'}\nEmail: ${userData.email || 'Not provided'}\nMember since: ${registrationDate}\nUser ID: ${userData.id || 'N/A'}`);
                return;
            }
        }
        
        // No user found
        alert('Please sign in to view your profile.');
    } catch (error) {
        console.error('❌ Error viewing profile:', error);
        alert('Error loading profile. Please try again.');
    }
}

function viewOrders() {
    window.location.href = 'my-orders.html';
}

function contactUs() {
    alert('Contact Us\n\nEmail: contact@jbcreations.com\nPhone: +91 12345 67890\nAddress: 123 Art Street, Creative City, India\n\nWe\'d love to hear from you!');
}

function aboutUs() {
    alert('About JB Creations\n\nWe are passionate about turning your precious memories into beautiful wall art. With years of experience in custom photo framing, we use premium materials and professional craftsmanship to create frames that last a lifetime.\n\nOur mission is to help you showcase your most cherished moments in style.');
}

// Initialize cart manager when page loads
let cartManager;
document.addEventListener('DOMContentLoaded', function() {
    cartManager = new CartManager();
});

// Add CSS animation for messages
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
`;
document.head.appendChild(style);
