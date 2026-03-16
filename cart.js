// Cart functionality for the dedicated cart page
class CartManager {
    constructor() {
        this.cart = this.loadCart();
        this.pendingConfirmAction = null;
        // New coupon system with order-based coupons
        this.availableCoupons = [
            { 
                id: 'SAVE100', 
                discount: 100, 
                minOrder: 500, 
                description: '₹100 OFF on orders above ₹500',
                emoji: '🎁'
            },
            { 
                id: 'SAVE250', 
                discount: 250, 
                minOrder: 1000, 
                description: '₹250 OFF on orders above ₹1000',
                emoji: '🎉'
            },
            { 
                id: 'SAVE300', 
                discount: 300, 
                minOrder: 1500, 
                description: '₹300 OFF on orders above ₹1500',
                emoji: '💎'
            }
        ];
        this.appliedCoupon = null;
        this.init();
    }

    init() {
        this.renderCart();
        this.attachEventListeners();
        this.updateHeader();
    }

    loadCart() {
        const cartData = sessionStorage.getItem('photoFramingCart');
        if (!cartData) return [];
        
        try {
            const cart = JSON.parse(cartData);
            
            // Validate each cart item has valid image data
            const validCart = cart.filter(item => {
                // Check if item has a valid thumbnail or can retrieve image from sessionStorage
                if (item.thumbnailImage && item.thumbnailImage.length > 100) {
                    return true;
                }
                
                // Check sessionStorage for image data
                if (item.id) {
                    try {
                        const stored = sessionStorage.getItem(`cartImage_${item.id}`);
                        if (stored) {
                            const data = JSON.parse(stored);
                            if (data.displayImage || data.previewImage || data.printImage || data.originalImage) {
                                return true;
                            }
                        }
                        // Check in-memory storage
                        if (window.cartImageStorage && window.cartImageStorage[item.id]) {
                            const data = window.cartImageStorage[item.id];
                            if (data.displayImage || data.previewImage || data.printImage || data.originalImage) {
                                return true;
                            }
                        }
                    } catch (e) {
                        console.warn('Error validating cart item image:', e);
                    }
                }
                
                console.warn('🗑️ Removing cart item without valid image data:', item.id);
                return false;
            });
            
            // If we removed any invalid items, update storage
            if (validCart.length !== cart.length) {
                console.log(`📦 Cleaned cart: ${cart.length} -> ${validCart.length} items (removed ${cart.length - validCart.length} invalid)`);
                sessionStorage.setItem('photoFramingCart', JSON.stringify(validCart));
                
                // Clean up orphaned image storage
                this.cleanupOrphanedImages(validCart);
            }
            
            return validCart;
        } catch (e) {
            console.error('Error parsing cart data:', e);
            return [];
        }
    }

    cleanupOrphanedImages(validCart) {
        const validIds = new Set(validCart.map(item => String(item.id)));
        const keysToRemove = [];
        
        for (let i = 0; i < sessionStorage.length; i++) {
            const key = sessionStorage.key(i);
            if (key && key.startsWith('cartImage_')) {
                const match = key.match(/cartImage_(?:full_|hq_)?(\d+)/);
                if (match && !validIds.has(match[1])) {
                    keysToRemove.push(key);
                }
            }
        }
        
        keysToRemove.forEach(key => {
            sessionStorage.removeItem(key);
            console.log(`🗑️ Removed orphaned image: ${key}`);
        });
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
                this.openConfirmModal({
                    title: 'Clear your cart?',
                    message: 'This will remove every item from your cart.',
                    confirmText: 'Clear Cart',
                    onConfirm: () => this.clearCart()
                });
            });
        }

        // Coupon modal button
        const applyCouponBtn = document.getElementById('applyCouponBtn');
        if (applyCouponBtn) {
            applyCouponBtn.addEventListener('click', () => {
                this.openCouponModal();
            });
        }

        // Close coupon modal
        const closeCouponModal = document.getElementById('closeCouponModal');
        if (closeCouponModal) {
            closeCouponModal.addEventListener('click', () => {
                this.closeCouponModal();
            });
        }

        // Close modal on overlay click
        const couponModalOverlay = document.getElementById('couponModalOverlay');
        if (couponModalOverlay) {
            couponModalOverlay.addEventListener('click', (e) => {
                if (e.target === couponModalOverlay) {
                    this.closeCouponModal();
                }
            });
        }

        // Remove coupon button
        const removeCouponBtn = document.getElementById('removeCouponBtn');
        if (removeCouponBtn) {
            removeCouponBtn.addEventListener('click', () => {
                this.removeCoupon();
            });
        }

        const cartConfirmModalOverlay = document.getElementById('cartConfirmModalOverlay');
        if (cartConfirmModalOverlay) {
            cartConfirmModalOverlay.addEventListener('click', (e) => {
                if (e.target === cartConfirmModalOverlay) {
                    this.closeConfirmModal();
                }
            });
        }

        const cartConfirmCancelBtn = document.getElementById('cartConfirmCancelBtn');
        if (cartConfirmCancelBtn) {
            cartConfirmCancelBtn.addEventListener('click', () => {
                this.closeConfirmModal();
            });
        }

        const cartConfirmActionBtn = document.getElementById('cartConfirmActionBtn');
        if (cartConfirmActionBtn) {
            cartConfirmActionBtn.addEventListener('click', () => {
                this.confirmModalAction();
            });
        }

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeCouponModal();
                this.closeConfirmModal();
            }
        });

        // Header functionality
        this.setupHeaderFunctionality();
    }

    setupHeaderFunctionality() {
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
        const cartSummary = document.querySelector('.cart-summary');

        if (this.cart.length === 0) {
            cartItemsContainer.style.display = 'none';
            cartEmptyContainer.style.display = 'block';
            // Hide price details section when cart is empty
            if (cartSummary) cartSummary.style.display = 'none';
            this.updateSummary();
            return;
        }

        cartEmptyContainer.style.display = 'none';
        cartItemsContainer.style.display = 'block';
        // Show price details section when cart has items
        if (cartSummary) cartSummary.style.display = 'block';

        cartItemsContainer.innerHTML = this.cart.map((item, index) => {
            // Resolve a thumbnail source: prefer precomputed, else look into sessionStorage compressed images
            let thumbSrc = item.thumbnailImage || null;
            if (!thumbSrc && item.id) {
                try {
                    const stored = sessionStorage.getItem(`cartImage_${item.id}`);
                    if (stored) {
                        const data = JSON.parse(stored);
                        thumbSrc = data.displayImage || data.previewImage || data.printImage || data.originalImage || null;
                    }
                    // Fallback to in-memory storage if available
                    if (!thumbSrc && window.cartImageStorage && window.cartImageStorage[item.id]) {
                        const data = window.cartImageStorage[item.id];
                        thumbSrc = data.displayImage || data.previewImage || data.printImage || data.originalImage || null;
                    }
                } catch (e) {
                    console.warn('Failed to load fallback image for cart item', item.id, e);
                }
            }
            console.log(`Cart item ${index}:`, {
                hasImage: !!item.hasImage,
                hasThumbnail: !!thumbSrc,
                thumbnailType: typeof thumbSrc,
                thumbnailLength: thumbSrc ? thumbSrc.length : 0,
                imageSize: item.imageSize
            });
            
            return `
            <div class="cart-item" data-index="${index}">
                <div class="cart-item-image">
                    ${thumbSrc ? 
                        `<img src="${thumbSrc}" alt="Frame Preview">` : 
                        item.hasImage ? 
                        '<i class="fas fa-image"></i>' : 
                        '<i class="fas fa-image text-muted"></i>'
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
                        <div class="cart-item-spec">
                            <i class="fas fa-border-style"></i>
                            Border: ${item.whiteBorder ? 'Yes (' + (item.borderThickness || 15) + 'px)' : 'No'}
                        </div>
                    </div>
                </div>
                <div class="cart-item-actions">
                    <div class="cart-item-price">
                        ${item.mrp && item.mrp > item.price ? 
                            `<span style="text-decoration: line-through; color: #999; font-size: 0.75em; margin-right: 6px;">₹${item.mrp}</span>` : 
                            ''}
                        <span>₹${item.price}</span>
                        ${item.mrp && item.mrp > item.price ? 
                            `<span style="color: #28a745; font-size: 0.7em; margin-left: 4px;">${Math.round(((item.mrp - item.price) / item.mrp) * 100)}% OFF</span>` : 
                            ''}
                    </div>
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
                notifications.warning('Maximum quantity per item is 10');
                return;
            }

            item.quantity = newQuantity;
            this.saveCart();
            this.renderCart();
        }
    }

    removeItem(index) {
        if (index >= 0 && index < this.cart.length) {
            this.openConfirmModal({
                title: 'Remove this item?',
                message: 'This item will be removed from your cart.',
                confirmText: 'Remove Item',
                onConfirm: () => {
                this.cart.splice(index, 1);
                this.saveCart();
                this.renderCart();
                }
            });
        }
    }

    clearCart() {
        this.cart = [];
        this.appliedCoupon = null;
        this.saveCart();
        this.renderCart();
    }

    updateSummary() {
        const itemCount = this.cart.reduce((total, item) => total + (item.quantity || 1), 0);
        const subtotal = this.cart.reduce((total, item) => total + (item.price * (item.quantity || 1)), 0);
        
        // Calculate total MRP (sum of all MRPs)
        const totalMRP = this.cart.reduce((total, item) => {
            // Use stored MRP if available, otherwise calculate based on size
            let itemMRP = item.mrp;
            if (!itemMRP) {
                // Fallback MRP calculation based on frame size
                if (item.frameSize && item.frameSize.size === '13x19') {
                    itemMRP = 999;
                } else if (item.frameSize && (item.frameSize.size === '13x10' || item.frameSize.size === '10x13')) {
                    itemMRP = 799;
                } else {
                    itemMRP = item.price * 2; // Default to 2x price
                }
            }
            return total + (itemMRP * (item.quantity || 1));
        }, 0);
        
        // Shipping is always free
        const shippingCost = 0;
        
        // Platform fee is free
        const platformFee = 0;
        
        // Apply coupon discount if valid
        let couponDiscount = 0;
        if (this.appliedCoupon && subtotal >= this.appliedCoupon.minOrder) {
            couponDiscount = this.appliedCoupon.discount;
        } else if (this.appliedCoupon && subtotal < this.appliedCoupon.minOrder) {
            // Cart total dropped below minimum, remove coupon
            this.appliedCoupon = null;
            this.updateAppliedCouponDisplay();
        }
        
        const total = Math.max(0, subtotal - couponDiscount);

        // Update DOM elements
        document.getElementById('itemCount').textContent = itemCount;
        document.getElementById('subtotalAmount').textContent = totalMRP; // Show total MRP
        document.getElementById('shippingAmount').textContent = 'FREE';
        document.getElementById('platformFee').textContent = 'FREE';
        document.getElementById('totalAmount').textContent = total;
        
        // Update discount on MRP (Total MRP - Total Sale Price)
        const discountOnMRP = totalMRP - subtotal;
        document.getElementById('discountAmount').textContent = discountOnMRP;

        // Show/hide coupon discount row
        const couponDiscountRow = document.getElementById('couponDiscountRow');
        if (couponDiscount > 0) {
            document.getElementById('couponDiscountAmount').textContent = couponDiscount;
            if (couponDiscountRow) couponDiscountRow.style.display = 'flex';
        } else {
            if (couponDiscountRow) couponDiscountRow.style.display = 'none';
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
        
        // Update applied coupon display
        this.updateAppliedCouponDisplay();
    }

    // Coupon Modal Functions
    openCouponModal() {
        const subtotal = this.cart.reduce((total, item) => total + (item.price * (item.quantity || 1)), 0);
        const modalBody = document.getElementById('couponModalBody');
        
        modalBody.innerHTML = this.availableCoupons.map(coupon => {
            const isEligible = subtotal >= coupon.minOrder;
            const isApplied = this.appliedCoupon && this.appliedCoupon.id === coupon.id;
            
            let statusClass = isApplied ? 'applied-status' : (isEligible ? 'available' : 'not-eligible');
            let statusText = isApplied ? '✅ Applied' : (isEligible ? '✨ Available' : `Add ₹${coupon.minOrder - subtotal} more`);
            let cardClass = isApplied ? 'applied' : (isEligible ? '' : 'disabled');
            
            return `
                <div class="coupon-card ${cardClass}" data-coupon-id="${coupon.id}" ${isEligible ? 'onclick="cartManager.applyCoupon(\'' + coupon.id + '\')"' : ''}>
                    <span class="coupon-emoji">${coupon.emoji}</span>
                    <div class="coupon-discount">₹${coupon.discount} OFF</div>
                    <div class="coupon-condition">${coupon.description}</div>
                    <span class="coupon-status ${statusClass}">${statusText}</span>
                </div>
            `;
        }).join('');
        
        document.getElementById('couponModalOverlay').classList.add('active');
    }

    closeCouponModal() {
        document.getElementById('couponModalOverlay').classList.remove('active');
    }

    openConfirmModal({ title, message, confirmText, onConfirm }) {
        const overlay = document.getElementById('cartConfirmModalOverlay');
        const titleEl = document.getElementById('cartConfirmModalTitle');
        const messageEl = document.getElementById('cartConfirmModalMessage');
        const actionBtn = document.getElementById('cartConfirmActionBtn');

        if (!overlay || !titleEl || !messageEl || !actionBtn) {
            if (typeof onConfirm === 'function' && confirm(message || 'Are you sure?')) {
                onConfirm();
            }
            return;
        }

        titleEl.textContent = title || 'Confirm action';
        messageEl.textContent = message || 'Are you sure you want to continue?';
        actionBtn.textContent = confirmText || 'Confirm';
        this.pendingConfirmAction = typeof onConfirm === 'function' ? onConfirm : null;
        overlay.classList.add('active');
        overlay.setAttribute('aria-hidden', 'false');
    }

    closeConfirmModal() {
        const overlay = document.getElementById('cartConfirmModalOverlay');
        if (!overlay) {
            this.pendingConfirmAction = null;
            return;
        }

        overlay.classList.remove('active');
        overlay.setAttribute('aria-hidden', 'true');
        this.pendingConfirmAction = null;
    }

    confirmModalAction() {
        const pendingAction = this.pendingConfirmAction;
        this.closeConfirmModal();

        if (typeof pendingAction === 'function') {
            pendingAction();
        }
    }

    applyCoupon(couponId) {
        const coupon = this.availableCoupons.find(c => c.id === couponId);
        const subtotal = this.cart.reduce((total, item) => total + (item.price * (item.quantity || 1)), 0);
        
        if (!coupon) {
            this.showMessage('Coupon not found!', 'error');
            return;
        }
        
        if (subtotal < coupon.minOrder) {
            this.showMessage(`Add ₹${coupon.minOrder - subtotal} more to use this coupon`, 'error');
            return;
        }
        
        this.appliedCoupon = coupon;
        this.closeCouponModal();
        this.updateSummary();
        // Show beautiful coupon applied animation
        this.showCouponAppliedAnimation(coupon);
    }

    showCouponAppliedAnimation(coupon) {
        // Create celebration overlay
        const overlay = document.createElement('div');
        overlay.className = 'coupon-celebration-overlay';
        overlay.innerHTML = `
            <div class="coupon-celebration-content">
                <div class="celebration-confetti"></div>
                <div class="celebration-emoji">${coupon.emoji}</div>
                <div class="celebration-checkmark">
                    <svg viewBox="0 0 52 52">
                        <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                        <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
                    </svg>
                </div>
                <h3 class="celebration-title">Coupon Applied! 🎉</h3>
                <p class="celebration-savings">You save <span>₹${coupon.discount}</span></p>
                <p class="celebration-code">${coupon.id}</p>
            </div>
        `;
        document.body.appendChild(overlay);

        // Trigger animation
        requestAnimationFrame(() => {
            overlay.classList.add('active');
        });

        // Auto-remove after animation
        setTimeout(() => {
            overlay.classList.add('fade-out');
            setTimeout(() => {
                overlay.remove();
            }, 400);
        }, 2200);
    }

    removeCoupon() {
        this.appliedCoupon = null;
        this.updateSummary();
        this.showMessage('Coupon removed', 'error');
    }

    updateAppliedCouponDisplay() {
        const display = document.getElementById('appliedCouponDisplay');
        const textEl = document.getElementById('appliedCouponText');
        const applyBtn = document.getElementById('applyCouponBtn');
        
        if (this.appliedCoupon) {
            display.classList.add('active');
            textEl.textContent = `₹${this.appliedCoupon.discount} OFF Applied!`;
            if (applyBtn) applyBtn.textContent = 'Change Coupon';
        } else {
            display.classList.remove('active');
            if (applyBtn) applyBtn.textContent = 'View Coupons';
        }
    }

    showMessage(message, type) {
        // Use centralized notification system
        if (window.notifications) {
            window.notifications.show(message, type);
        } else {
            // Fallback
            alert(message);
        }
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
                notifications.info(`Profile for ${user.name || 'User'}<br>Phone: ${user.phone || 'Unknown'}<br>Email: ${user.email || 'Not provided'}<br>Member since: ${registrationDate}<br>User ID: ${user.id || 'N/A'}`, 'User Profile');
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
                    notifications.warning('Please sign in to view your profile.');
                    return;
                }
            }
            
            if (userData && userData.phone) {
                const registrationDate = userData.registrationDate ? new Date(userData.registrationDate).toLocaleDateString() : 'Unknown';
                notifications.info(`Profile for ${userData.name || 'User'}<br>Phone: ${userData.phone || 'Unknown'}<br>Email: ${userData.email || 'Not provided'}<br>Member since: ${registrationDate}<br>User ID: ${userData.id || 'N/A'}`, 'User Profile');
                return;
            }
        }
        
        // No user found
        notifications.warning('Please sign in to view your profile.');
    } catch (error) {
        console.error('❌ Error viewing profile:', error);
        notifications.error('Error loading profile. Please try again.');
    }
}

function viewOrders() {
    window.location.href = 'my-orders.html';
}

function contactUs() {
    // Open chat support - same logic as openContactChat
    if (window.supportChat && window.supportChat.openChat) {
        window.supportChat.openChat();
    } else {
        // Initialize chat with forceInit and hideFloatingButton options
        if (typeof SupportChat !== 'undefined') {
            window.supportChat = new SupportChat({ forceInit: true, hideFloatingButton: true });
            setTimeout(() => {
                if (window.supportChat && window.supportChat.openChat) {
                    window.supportChat.openChat();
                }
            }, 300);
        } else {
            window.location.href = 'mailto:jbcreationssss@gmail.com?subject=Support%20Request';
        }
    }
}

function aboutUs() {
    window.location.href = 'about-us.html';
}

// Initialize cart manager when page loads
let cartManager;
document.addEventListener('DOMContentLoaded', function() {
    cartManager = new CartManager();
    
    // Set up back button navigation for mobile
    setupCartBackNavigation();
});

// Handle mobile back button - go to home page
function setupCartBackNavigation() {
    // Only for mobile
    if (window.innerWidth <= 768) {
        // Push a history state so we can intercept back button
        history.pushState({ inCart: true }, '', window.location.href);
        
        window.addEventListener('popstate', function(event) {
            // Clear any saved state flags
            sessionStorage.removeItem('cartSourcePage');
            sessionStorage.removeItem('returnToRoomPreview');
            sessionStorage.removeItem('customizeStateForReturn');
            
            // Always go to home page when pressing back from cart
            window.location.href = 'index.html';
        });
    }
}

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
