/**
 * GlobalWebsiteHeader Component
 * 
 * A portable, self-contained header component that includes:
 * - Brand name centered
 * - Profile dropdown with authentication state management
 * - Cart button with item count
 * - Responsive design for mobile and desktop
 * 
 * Usage: Include this script and call GlobalWebsiteHeader.init() after DOM is ready
 */

const GlobalWebsiteHeader = {
    // Configuration
    config: {
        headerContainerId: 'global-header-container',
        defaultRedirect: 'index.html',
        stylesId: 'global-header-styles'
    },

    /**
     * Get the scoped CSS styles for the header component
     * These styles ensure pixel-perfect rendering regardless of host page styles
     */
    getScopedStyles() {
        return `
/* =====================================================
   GlobalWebsiteHeader - Scoped Component Styles
   These styles override any page-specific CSS conflicts
   ===================================================== */

/* Profile Dropdown Container - Strictly scoped */
#globalSiteHeader .profile-dropdown {
    position: relative !important;
    display: inline-block !important;
}

/* Profile Icon Button - Strictly scoped styling */
#globalSiteHeader .profile-icon-btn {
    background: transparent !important;
    border: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    box-shadow: none !important;
    color: #16697A !important;
    padding: 8px 12px !important;
    border-radius: 8px !important;
    cursor: pointer !important;
    font-size: 22px !important;
    transition: all 0.3s ease !important;
    position: relative !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 4px !important;
    min-width: 50px !important;
    text-align: center !important;
}

#globalSiteHeader .profile-icon-btn:hover {
    background: rgba(22, 105, 122, 0.25) !important;
    border: 1px solid rgba(22, 105, 122, 0.4) !important;
    backdrop-filter: blur(10px) !important;
    -webkit-backdrop-filter: blur(10px) !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15) !important;
    color: white !important;
}

#globalSiteHeader .profile-icon-btn i {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 100% !important;
    margin: 0 !important;
    line-height: 1 !important;
    font-size: 20px !important;
}

#globalSiteHeader .profile-icon-btn .button-label {
    font-size: 11px !important;
    font-weight: 600 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.5px !important;
    line-height: 1 !important;
    margin: 0 !important;
    width: 100% !important;
    text-align: center !important;
}

/* Profile Dropdown Menu - The dropdown panel */
/* CRITICAL: Fixed width enforced to prevent page-specific style leakage */
#globalSiteHeader .profile-dropdown-menu {
    position: absolute !important;
    top: 100% !important;
    right: 0 !important;
    left: auto !important;
    background: rgba(255, 255, 255, 0.95) !important;
    backdrop-filter: blur(20px) !important;
    -webkit-backdrop-filter: blur(20px) !important;
    border: 2px solid rgba(255, 255, 255, 0.3) !important;
    border-radius: 15px !important;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15), inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
    width: 280px !important;
    min-width: 280px !important;
    max-width: 280px !important;
    z-index: 3000 !important;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px);
    transition: all 0.3s ease !important;
    margin-top: 10px !important;
    padding: 8px 0 !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
}

/* Dropdown Open State */
#globalSiteHeader .profile-dropdown:hover .profile-dropdown-menu,
#globalSiteHeader .profile-dropdown.open .profile-dropdown-menu {
    opacity: 1;
    visibility: visible;
    transform: translateY(0);
}

/* Dropdown Items - Strictly scoped styling */
#globalSiteHeader .profile-dropdown-menu .dropdown-item {
    display: flex !important;
    align-items: center !important;
    gap: 12px !important;
    padding: 12px 20px !important;
    color: #333 !important;
    text-decoration: none !important;
    transition: all 0.3s ease !important;
    font-size: 14px !important;
    font-weight: 500 !important;
    border-radius: 8px !important;
    margin: 2px 8px !important;
    background: transparent !important;
    border: none !important;
    cursor: pointer !important;
    width: calc(100% - 16px) !important;
    max-width: calc(100% - 16px) !important;
    box-sizing: border-box !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
}

#globalSiteHeader .profile-dropdown-menu .dropdown-item i {
    font-size: 16px !important;
    width: 20px !important;
    min-width: 20px !important;
    text-align: center !important;
    color: #489FB5 !important;
    flex-shrink: 0 !important;
}

#globalSiteHeader .profile-dropdown-menu .dropdown-item:hover {
    background: linear-gradient(135deg, rgba(72, 159, 181, 0.1), rgba(72, 159, 181, 0.05)) !important;
    color: #489FB5 !important;
    transform: translateX(5px) !important;
    text-decoration: none !important;
}

/* Dropdown Divider */
#globalSiteHeader .profile-dropdown-menu .dropdown-divider {
    height: 1px !important;
    background: linear-gradient(90deg, transparent, rgba(72, 159, 181, 0.3), transparent) !important;
    margin: 8px 16px !important;
    padding: 0 !important;
    border: none !important;
    width: auto !important;
}

/* User Info Section */
#globalSiteHeader .dropdown-user-info {
    display: flex !important;
    align-items: center !important;
    padding: 12px 16px !important;
    background: rgba(22, 105, 122, 0.05) !important;
    border-radius: 8px !important;
    margin: 8px !important;
    width: calc(100% - 16px) !important;
    box-sizing: border-box !important;
}

#globalSiteHeader .dropdown-user-info .user-avatar {
    font-size: 24px !important;
    color: #16697A !important;
    margin-right: 12px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    flex-shrink: 0 !important;
}

#globalSiteHeader .dropdown-user-info .user-avatar i {
    font-size: 24px !important;
}

#globalSiteHeader .dropdown-user-info .user-details {
    flex: 1 !important;
    min-width: 0 !important;
    overflow: hidden !important;
}

#globalSiteHeader .dropdown-user-info .user-name {
    font-weight: 600 !important;
    color: #16697A !important;
    font-size: 14px !important;
    margin-bottom: 2px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
}

#globalSiteHeader .dropdown-user-info .user-phone {
    color: #489FB5 !important;
    font-size: 12px !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
}

/* Cart Button - Strictly scoped styling */
#globalSiteHeader .cart-icon-btn {
    background: transparent !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    border: none !important;
    border-radius: 8px !important;
    color: #16697A !important;
    padding: 8px 12px !important;
    cursor: pointer !important;
    transition: all 0.3s ease !important;
    position: relative !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 4px !important;
    box-shadow: none !important;
    font-weight: 600 !important;
    min-width: 50px !important;
    text-align: center !important;
    font-size: 20px !important;
}

#globalSiteHeader .cart-icon-btn:hover {
    background: rgba(22, 105, 122, 0.25) !important;
    border: 1px solid rgba(22, 105, 122, 0.4) !important;
    backdrop-filter: blur(10px) !important;
    -webkit-backdrop-filter: blur(10px) !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.15) !important;
    color: white !important;
}

#globalSiteHeader .cart-icon-btn i {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 100% !important;
    margin: 0 !important;
    line-height: 1 !important;
    font-size: 16px !important;
}

#globalSiteHeader .cart-icon-btn .button-label {
    font-size: 11px !important;
    font-weight: 600 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.5px !important;
    line-height: 1 !important;
    margin: 0 !important;
    width: 100% !important;
    text-align: center !important;
}

/* Cart Count Badge - Strictly scoped */
#globalSiteHeader .cart-count {
    background: #FFA62B !important;
    color: white !important;
    border-radius: 12px !important;
    padding: 3px 7px !important;
    font-size: 11px !important;
    font-weight: 700 !important;
    min-width: 20px !important;
    height: 20px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    position: absolute !important;
    top: -5px !important;
    right: 5px !important;
    z-index: 10 !important;
}

#globalSiteHeader .cart-count:empty {
    display: none !important;
}

/* Mobile Responsive Styles - Strictly scoped */
@media (max-width: 768px) {
    #globalSiteHeader .profile-icon-btn,
    #globalSiteHeader .cart-icon-btn {
        background: transparent !important;
        border: none !important;
        border-radius: 0 !important;
        padding: 6px !important;
        box-shadow: none !important;
        color: #16697A !important;
    }

    #globalSiteHeader .profile-icon-btn {
        font-size: 20px !important;
        min-width: 40px !important;
        gap: 2px !important;
    }

    #globalSiteHeader .profile-icon-btn i {
        font-size: 16px !important;
    }

    #globalSiteHeader .profile-icon-btn:hover,
    #globalSiteHeader .cart-icon-btn:hover {
        background: transparent !important;
        color: #0f4f5d !important;
        border: none !important;
        box-shadow: none !important;
        transform: none !important;
    }

    #globalSiteHeader .profile-icon-btn .button-label,
    #globalSiteHeader .cart-icon-btn .button-label {
        font-size: 0.62rem !important;
        letter-spacing: 0.4px !important;
    }
    
    /* CRITICAL: Fixed width for mobile dropdown */
    #globalSiteHeader .profile-dropdown-menu {
        width: 260px !important;
        min-width: 260px !important;
        max-width: 260px !important;
        right: -10px !important;
    }
}

@media (max-width: 480px) {
    #globalSiteHeader .profile-icon-btn,
    #globalSiteHeader .cart-icon-btn {
        padding: 6px 9px !important;
    }
    
    /* CRITICAL: Fixed width for small mobile dropdown */
    #globalSiteHeader .profile-dropdown-menu {
        width: 240px !important;
        min-width: 240px !important;
        max-width: 240px !important;
    }
    
    #globalSiteHeader .profile-dropdown-menu .dropdown-item {
        padding: 10px 16px !important;
        font-size: 13px !important;
    }
}
`;
    },

    /**
     * Inject scoped styles into the document head
     */
    injectStyles() {
        // Check if styles already exist
        if (document.getElementById(this.config.stylesId)) {
            return;
        }

        const styleElement = document.createElement('style');
        styleElement.id = this.config.stylesId;
        styleElement.textContent = this.getScopedStyles();
        document.head.appendChild(styleElement);
    },

    /**
     * Get the current page name for redirect URLs
     */
    getCurrentPageName() {
        const path = window.location.pathname;
        const pageName = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
        return pageName;
    },

    /**
     * Generate the header HTML
     */
    getHeaderHTML() {
        const currentPage = this.getCurrentPageName();
        
        return `
    <!-- Header -->
    <header class="site-header" id="globalSiteHeader">
        <div class="header-content">
            <div class="header-left"></div>
            <div class="header-brand">
                <a href="index.html" style="text-decoration: none; color: inherit;"><h1 class="brand-name">JB Creations</h1></a>
            </div>
            <div class="header-right">
                <div class="auth-section" id="authSection">
                    <!-- Profile dropdown button (always visible) -->
                    <div class="profile-dropdown" id="profileDropdown">
                        <button class="profile-icon-btn" id="profileBtn" aria-expanded="false" aria-haspopup="true">
                            <i class="fas fa-user-alt"></i>
                            <span class="button-label">Profile</span>
                        </button>
                        <div class="profile-dropdown-menu" id="profileDropdownMenu" aria-hidden="true">
                            <!-- Guest user options -->
                            <div class="guest-options" id="guestOptions">
                                <a href="otp-login.html?redirect=${currentPage}" class="dropdown-item">
                                    <i class="fas fa-sign-in-alt"></i>
                                    Sign In
                                </a>
                                <a href="otp-login.html?redirect=${currentPage}" class="dropdown-item">
                                    <i class="fas fa-user-plus"></i>
                                    Sign Up
                                </a>
                                <div class="dropdown-divider"></div>
                            </div>
                            
                            <!-- Authenticated user options (hidden by default) -->
                            <div class="authenticated-options" id="authenticatedOptions" style="display: none;">
                                <!-- User Info Section -->
                                <div class="dropdown-user-info" id="dropdownUserInfo">
                                    <div class="user-avatar">
                                        <i class="fas fa-user-circle"></i>
                                    </div>
                                    <div class="user-details">
                                        <div class="user-name" id="dropdownUserName">User</div>
                                        <div class="user-phone" id="dropdownUserPhone">Phone</div>
                                    </div>
                                </div>
                                <div class="dropdown-divider"></div>
                                
                                <a href="my-profile.html" class="dropdown-item" data-close-dropdown="true">
                                    <i class="fas fa-user-circle"></i>
                                    My Profile
                                </a>
                                <a href="#" class="dropdown-item" onclick="viewOrders()">
                                    <i class="fas fa-box"></i>
                                    My Orders
                                </a>
                                <div class="dropdown-divider"></div>
                                <a href="#" class="dropdown-item" onclick="authUtils.logout()">
                                    <i class="fas fa-sign-out-alt"></i>
                                    Sign Out
                                </a>
                                <div class="dropdown-divider"></div>
                            </div>
                            
                            <!-- Common options for all users -->
                            <a href="track-order.html" class="dropdown-item">
                                <i class="fas fa-search"></i>
                                Track Order
                            </a>
                            <a href="#" class="dropdown-item" onclick="contactUs()">
                                <i class="fas fa-envelope"></i>
                                Contact Us
                            </a>
                            <a href="#" class="dropdown-item" onclick="aboutUs()">
                                <i class="fas fa-info-circle"></i>
                                About Us
                            </a>
                        </div>
                    </div>
                </div>
                
                <div class="header-cart">
                    <button class="cart-icon-btn" id="headerCartBtn" onclick="window.location.href='cart.html'">
                        <i class="fas fa-shopping-cart"></i>
                        <span class="cart-count" id="cartCount">0</span>
                        <span class="button-label">Cart</span>
                    </button>
                </div>
            </div>
        </div>
    </header>`;
    },

    /**
     * Initialize dropdown functionality
     */
    initDropdownBehavior() {
        const dropdownContainer = document.getElementById('profileDropdown');
        const dropdownMenu = document.getElementById('profileDropdownMenu');
        const profileBtn = document.getElementById('profileBtn');

        if (!dropdownContainer || !dropdownMenu || !profileBtn) {
            console.warn('GlobalWebsiteHeader: Dropdown elements not found');
            return;
        }

        // Toggle dropdown on click
        profileBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = dropdownContainer.classList.toggle('open');
            profileBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
            dropdownMenu.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdownContainer.contains(e.target)) {
                dropdownContainer.classList.remove('open');
                profileBtn.setAttribute('aria-expanded', 'false');
                dropdownMenu.setAttribute('aria-hidden', 'true');
            }
        });

        // Close dropdown when pressing Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && dropdownContainer.classList.contains('open')) {
                dropdownContainer.classList.remove('open');
                profileBtn.setAttribute('aria-expanded', 'false');
                dropdownMenu.setAttribute('aria-hidden', 'true');
                profileBtn.focus();
            }
        });

        // Close dropdown when clicking on items with data-close-dropdown attribute
        dropdownMenu.querySelectorAll('[data-close-dropdown="true"]').forEach(item => {
            item.addEventListener('click', () => {
                dropdownContainer.classList.remove('open');
                profileBtn.setAttribute('aria-expanded', 'false');
                dropdownMenu.setAttribute('aria-hidden', 'true');
            });
        });
    },

    /**
     * Update cart count display
     */
    updateCartCount() {
        const cartCountElement = document.getElementById('cartCount');
        if (!cartCountElement) return;

        try {
            // First try sessionStorage (primary), then localStorage (fallback)
            let cart = JSON.parse(sessionStorage.getItem('photoFramingCart') || '[]');
            
            // If sessionStorage is empty, try localStorage
            if (cart.length === 0) {
                cart = JSON.parse(localStorage.getItem('photoFramingCart') || '[]');
            }
            
            const totalItems = cart.length;
            cartCountElement.textContent = totalItems;
            cartCountElement.style.display = totalItems > 0 ? 'flex' : 'none';
        } catch (e) {
            console.warn('GlobalWebsiteHeader: Error reading cart', e);
            cartCountElement.textContent = '0';
            cartCountElement.style.display = 'none';
        }
    },

    /**
     * Set profile dropdown state programmatically
     */
    setProfileDropdownState(isOpen) {
        const dropdownContainer = document.getElementById('profileDropdown');
        const dropdownMenu = document.getElementById('profileDropdownMenu');
        const profileBtn = document.getElementById('profileBtn');

        if (!dropdownContainer || !dropdownMenu || !profileBtn) {
            return;
        }

        dropdownContainer.classList.toggle('open', isOpen);
        profileBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        dropdownMenu.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
    },

    /**
     * Toggle profile dropdown
     */
    toggleProfileDropdown() {
        const dropdownContainer = document.getElementById('profileDropdown');
        if (!dropdownContainer) {
            return;
        }

        const isOpen = dropdownContainer.classList.contains('open');
        this.setProfileDropdownState(!isOpen);
    },

    /**
     * Update authentication state in the header
     */
    updateAuthState(isAuthenticated, userData = null) {
        const guestOptions = document.getElementById('guestOptions');
        const authenticatedOptions = document.getElementById('authenticatedOptions');
        const dropdownUserName = document.getElementById('dropdownUserName');
        const dropdownUserPhone = document.getElementById('dropdownUserPhone');

        if (isAuthenticated && userData) {
            // Show authenticated options
            if (guestOptions) guestOptions.style.display = 'none';
            if (authenticatedOptions) authenticatedOptions.style.display = 'block';
            
            // Update user info
            if (dropdownUserName) {
                dropdownUserName.textContent = userData.name || userData.displayName || 'User';
            }
            if (dropdownUserPhone) {
                dropdownUserPhone.textContent = userData.phone || userData.phoneNumber || '';
            }
        } else {
            // Show guest options
            if (guestOptions) guestOptions.style.display = 'block';
            if (authenticatedOptions) authenticatedOptions.style.display = 'none';
        }
    },

    /**
     * Insert header into the page
     */
    insertHeader() {
        // Find the body element
        const body = document.body;
        if (!body) {
            console.error('GlobalWebsiteHeader: Body element not found');
            return false;
        }

        // Check if header already exists
        if (document.getElementById('globalSiteHeader')) {
            console.warn('GlobalWebsiteHeader: Header already exists');
            return false;
        }

        // Create a container for the header
        const headerContainer = document.createElement('div');
        headerContainer.id = this.config.headerContainerId;
        headerContainer.innerHTML = this.getHeaderHTML();

        // Insert at the very beginning of body
        body.insertBefore(headerContainer, body.firstChild);

        return true;
    },

    /**
     * Initialize the header component
     */
    init() {
        // Inject scoped styles first to ensure proper styling
        this.injectStyles();
        
        // Insert the header HTML
        const inserted = this.insertHeader();
        
        if (inserted) {
            // Initialize dropdown behavior
            this.initDropdownBehavior();
            
            // Update cart count
            this.updateCartCount();

            // Listen for storage events to update cart count
            window.addEventListener('storage', (e) => {
                if (e.key === 'photoFramingCart') {
                    this.updateCartCount();
                }
            });

            // Also listen for custom cart update events
            window.addEventListener('cartUpdated', () => {
                this.updateCartCount();
            });

            // Poll for cart changes every 2 seconds (for sessionStorage which doesn't fire storage events in same tab)
            setInterval(() => {
                this.updateCartCount();
            }, 2000);

            console.log('GlobalWebsiteHeader: Initialized successfully');
        }

        return this;
    }
};

// Helper functions that may be called from dropdown items
// These are global functions that the header depends on

if (typeof viewOrders === 'undefined') {
    window.viewOrders = function() {
        window.location.href = 'my-orders.html';
    };
}

if (typeof contactUs === 'undefined') {
    window.contactUs = function() {
        // Open contact modal or redirect to contact page
        alert('Contact us at: support@jbcreations.com\nPhone: +91 XXXXXXXXXX');
    };
}

if (typeof aboutUs === 'undefined') {
    window.aboutUs = function() {
        // Open about modal or redirect to about page
        alert('JB Creations - Beautiful Memories Deserve a Frame\n\nWe specialize in custom photo framing with high-quality materials and perfect craftsmanship.');
    };
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlobalWebsiteHeader;
}
