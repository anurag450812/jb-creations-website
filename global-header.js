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
    isInitialized: false,

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

/* Global Header Container - Enhanced Desktop Design */
#globalSiteHeader {
    padding: 0 !important;
    margin: 0 !important;
    top: 0 !important;
    position: fixed !important;
    width: 100% !important;
    z-index: 2000 !important;
    background: #EDE7E3 !important;
    box-shadow: none !important;
    border: none !important;
    border-bottom: none !important;
}

#globalSiteHeader .header-content {
    max-width: 1400px !important;
    margin: 0 auto !important;
    padding: 0 36px !important;
    display: grid !important;
    grid-template-columns: 1fr auto 1fr !important;
    align-items: center !important;
    gap: 14px !important;
    height: 43px !important;
    line-height: 1 !important;
    background: #EDE7E3 !important;
    border: none !important;
    box-shadow: none !important;
}

/* Position header elements like mobile - Profile left, Brand center, Cart right */
#globalSiteHeader .header-left {
    justify-self: start !important;
}

#globalSiteHeader .header-brand {
    justify-self: center !important;
    grid-column: 2 !important;
}

#globalSiteHeader .header-right {
    justify-self: end !important;
}

/* Desktop Navigation Links - HIDDEN on desktop to match mobile design */
#globalSiteHeader .desktop-nav,
#globalSiteHeader .desktop-nav-right {
    display: none !important;
}

#globalSiteHeader .nav-link {
    display: none !important;
}

/* CTA Button in Nav - Hidden */
#globalSiteHeader .nav-cta {
    display: none !important;
}

#globalSiteHeader .brand-name {
    font-size: 1.32rem !important;
    font-weight: 800 !important;
    letter-spacing: 1.8px !important;
    color: #16697A !important;
    text-decoration: none !important;
    margin: 0 !important;
    padding: 0 !important;
    position: relative !important;
    display: inline-block !important;
    transition: all 0.25s ease !important;
}

#globalSiteHeader .brand-name:hover {
    transform: scale(1.02) !important;
}

#globalSiteHeader .brand-name::after {
    content: '' !important;
    display: block !important;
    width: 60% !important;
    height: 3px !important;
    background: linear-gradient(90deg, #16697A, #489FB5) !important;
    margin: 4px auto 0 !important;
    border-radius: 2px !important;
    transition: width 0.25s ease !important;
}

#globalSiteHeader .brand-name:hover::after {
    width: 80% !important;
}

#globalSiteHeader .header-right {
    display: flex !important;
    align-items: center !important;
    gap: 10px !important;
    margin: 0 !important;
    padding: 0 !important;
}

#globalSiteHeader .header-left {
    display: flex !important;
    align-items: center !important;
    gap: 14px !important;
    margin: 0 !important;
    padding: 0 !important;
}

/* Profile Dropdown Container - Strictly scoped */
#globalSiteHeader .profile-dropdown {
    position: relative !important;
    display: inline-block !important;
    line-height: 1 !important;
}

/* Profile Icon Button - Strictly scoped styling */
#globalSiteHeader .profile-icon-btn {
    background: transparent !important;
    border: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    box-shadow: none !important;
    color: #16697A !important;
    padding: 4px 6px !important;
    border-radius: 4px !important;
    cursor: pointer !important;
    font-size: 0.55rem !important;
    transition: background 0.2s ease !important;
    position: relative !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 2px !important;
    min-width: auto !important;
    min-height: auto !important;
    text-align: center !important;
    line-height: 1 !important;
    margin: 0 !important;
}

#globalSiteHeader .profile-icon-btn:hover {
    background: rgba(22, 105, 122, 0.08) !important;
    color: #16697A !important;
    border: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
    transform: none !important;
    box-shadow: none !important;
}

#globalSiteHeader .profile-icon-btn i {
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 100% !important;
    margin: 0 !important;
    line-height: 1 !important;
    font-size: 0.55rem !important;
}

#globalSiteHeader .profile-icon-btn .button-label {
    font-size: 5.5px !important;
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
    left: 0 !important;
    right: auto !important;
    background: rgba(255, 255, 255, 0.98) !important;
    backdrop-filter: blur(20px) !important;
    -webkit-backdrop-filter: blur(20px) !important;
    border: 1px solid rgba(22, 105, 122, 0.15) !important;
    border-radius: 16px !important;
    box-shadow: 0 10px 40px rgba(22, 105, 122, 0.15), 0 4px 12px rgba(0, 0, 0, 0.08) !important;
    width: 280px !important;
    min-width: 280px !important;
    max-width: 280px !important;
    z-index: 3000 !important;
    opacity: 0;
    visibility: hidden;
    transform: translateY(-10px);
    transition: all 0.3s ease !important;
    margin-top: 12px !important;
    padding: 10px 0 !important;
    box-sizing: border-box !important;
    overflow: hidden !important;
    pointer-events: none !important;
}

/* Dropdown Open State - Click triggered (default for all sizes) */
#globalSiteHeader .profile-dropdown.open .profile-dropdown-menu {
    opacity: 1 !important;
    visibility: visible !important;
    transform: translateY(0) !important;
    pointer-events: auto !important;
}

/* Mobile: Allow hover to show dropdown as fallback for touch devices */
@media (max-width: 768px) {
    #globalSiteHeader .profile-dropdown:hover .profile-dropdown-menu {
        opacity: 1;
        visibility: visible;
        transform: translateY(0);
    }
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
    border-radius: 5px !important;
    color: #16697A !important;
    padding: 5px 8px !important;
    cursor: pointer !important;
    transition: background 0.2s ease !important;
    position: relative !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 3px !important;
    box-shadow: none !important;
    font-weight: 600 !important;
    min-width: auto !important;
    min-height: auto !important;
    text-align: center !important;
    font-size: 0.62rem !important;
    line-height: 1 !important;
    margin: 0 !important;
}

#globalSiteHeader .cart-icon-btn:hover {
    background: rgba(22, 105, 122, 0.08) !important;
    color: #16697A !important;
    border: none !important;
    backdrop-filter: none !important;
    -webkit-backdrop-filter: none !important;
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
    font-size: 11px !important;
}

#globalSiteHeader .cart-icon-btn .button-label {
    font-size: 8px !important;
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
    border-radius: 50% !important;
    padding: 0 !important;
    font-size: 6px !important;
    font-weight: 700 !important;
    min-width: 11px !important;
    width: 11px !important;
    height: 11px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    position: absolute !important;
    top: -5px !important;
    right: -2px !important;
    z-index: 10 !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2) !important;
}

#globalSiteHeader .cart-count:empty {
    display: none !important;
}

/* Mobile Responsive Styles - Strictly scoped */
@media (max-width: 768px) {
    #globalSiteHeader {
        background: #EDE7E3 !important;
        box-shadow: none !important;
        border-bottom: none !important;
    }

    #globalSiteHeader .header-content {
        height: 52px !important;
        padding: 0 12px !important;
        gap: 10px !important;
    }

    #globalSiteHeader .brand-name {
        font-size: 1.3rem !important;
    }
    
    /* Hide desktop navigation on mobile */
    #globalSiteHeader .desktop-nav {
        display: none !important;
    }

    #globalSiteHeader .profile-icon-btn,
    #globalSiteHeader .cart-icon-btn {
        background: transparent !important;
        border: none !important;
        border-radius: 8px !important;
        padding: 6px 10px !important;
        box-shadow: none !important;
        color: #16697A !important;
        font-size: 1rem !important;
    }

    #globalSiteHeader .profile-icon-btn i,
    #globalSiteHeader .cart-icon-btn i {
        font-size: 1rem !important;
    }

    #globalSiteHeader .profile-icon-btn:hover,
    #globalSiteHeader .cart-icon-btn:hover {
        background: rgba(22, 105, 122, 0.08) !important;
        color: #16697A !important;
        border: none !important;
        box-shadow: none !important;
        transform: none !important;
    }

    #globalSiteHeader .profile-icon-btn .button-label,
    #globalSiteHeader .cart-icon-btn .button-label {
        font-size: 0.7rem !important;
        font-weight: 600 !important;
        display: none !important;
    }
    
    /* CRITICAL: Fixed width for mobile dropdown - align left on mobile */
    #globalSiteHeader .profile-dropdown-menu {
        background: rgba(255, 255, 255, 0.98) !important;
        backdrop-filter: blur(20px) !important;
        -webkit-backdrop-filter: blur(20px) !important;
        border: 1px solid rgba(22, 105, 122, 0.15) !important;
        border-radius: 16px !important;
        box-shadow: 0 10px 40px rgba(22, 105, 122, 0.15), 0 4px 12px rgba(0, 0, 0, 0.08) !important;
        width: 260px !important;
        min-width: 260px !important;
        max-width: 260px !important;
        margin-top: 12px !important;
        padding: 10px 0 !important;
        left: 0 !important;
        right: auto !important;
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
        margin-top: 10px !important;
    }
    
    #globalSiteHeader .profile-dropdown-menu .dropdown-item {
        padding: 10px 16px !important;
        font-size: 13px !important;
    }
}

/* Desktop-specific adjustments - Magnified mobile style */
@media (min-width: 769px) {
    /* Hide all navigation links - only show logo, profile, cart */
    #globalSiteHeader .desktop-nav,
    #globalSiteHeader .desktop-nav-right {
        display: none !important;
    }
    
    /* Larger header on desktop */
    #globalSiteHeader .header-content {
        height: 48px !important;
        padding: 0 30px !important;
        gap: 12px !important;
    }
    
    /* Larger brand name on desktop */
    #globalSiteHeader .brand-name {
        font-size: 1.5rem !important;
        letter-spacing: 2.4px !important;
    }
    
    /* Larger icons on desktop */
    #globalSiteHeader .profile-icon-btn,
    #globalSiteHeader .cart-icon-btn {
        padding: 7px 9px !important;
        border-radius: 7px !important;
    }
    
    #globalSiteHeader .profile-icon-btn i,
    #globalSiteHeader .cart-icon-btn i {
        font-size: 0.91rem !important;
    }
    
    /* Show labels on desktop */
    #globalSiteHeader .profile-icon-btn .button-label,
    #globalSiteHeader .cart-icon-btn .button-label {
        display: block !important;
        font-size: 0.48rem !important;
    }
    
    /* Cart badge larger on desktop */
    #globalSiteHeader .cart-count {
        min-width: 13px !important;
        width: 13px !important;
        height: 13px !important;
        font-size: 7px !important;
        top: -4px !important;
        right: 0px !important;
    }
    
    /* Dropdown aligns to the RIGHT of the profile icon on desktop */
    #globalSiteHeader .profile-dropdown-menu {
        left: 0 !important;
        right: auto !important;
    }
}

/* Large desktop screens - even bigger */
@media (min-width: 1440px) {
    #globalSiteHeader .header-content {
        height: 52px !important;
        padding: 0 36px !important;
    }
    
    #globalSiteHeader .brand-name {
        font-size: 1.68rem !important;
    }
    
    #globalSiteHeader .profile-icon-btn i,
    #globalSiteHeader .cart-icon-btn i {
        font-size: 0.98rem !important;
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
        
        // Determine active page for navigation highlighting
        const isHome = currentPage === 'index.html' || currentPage === '';
        const isCustomize = currentPage === 'customize.html';
        const isAbout = currentPage === 'about-us.html';
        const isFaq = currentPage === 'faq.html';
        
        return `
    <!-- Header -->
    <header class="site-header" id="globalSiteHeader">
        <div class="header-content">
            <div class="header-left">
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
            </div>
            
            <!-- Desktop Navigation -->
            <nav class="desktop-nav" id="desktopNav">
                <a href="index.html" class="nav-link ${isHome ? 'active' : ''}">Home</a>
                <a href="about-us.html" class="nav-link ${isAbout ? 'active' : ''}">About</a>
                <a href="faq.html" class="nav-link ${isFaq ? 'active' : ''}">FAQ</a>
                <a href="customize.html" class="nav-link nav-cta ${isCustomize ? 'active' : ''}">
                    <i class="fas fa-palette" style="margin-right: 6px;"></i>Create Now
                </a>
            </nav>
            
            <div class="header-brand">
                <a href="index.html" style="text-decoration: none; color: inherit;"><h1 class="brand-name">XIDLZ</h1></a>
            </div>
            
            <!-- Desktop Navigation (Right Side) -->
            <nav class="desktop-nav desktop-nav-right" id="desktopNavRight">
                <a href="my-orders.html" class="nav-link">Orders</a>
                <a href="cart.html" class="nav-link">Cart</a>
            </nav>
            
            <div class="header-right">
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
        const headerElement = document.getElementById('globalSiteHeader');

        if (!dropdownContainer || !dropdownMenu || !profileBtn || !headerElement) {
            console.warn('GlobalWebsiteHeader: Dropdown elements not found');
            return;
        }

        if (headerElement.dataset.dropdownBehaviorInitialized === 'true') {
            return;
        }

        headerElement.dataset.dropdownBehaviorInitialized = 'true';

        const closeDropdown = () => {
            this.setProfileDropdownState(false);
        };

        const toggleDropdown = () => {
            this.toggleProfileDropdown();
        };

        // Delegate clicks from the header so button content updates on host pages cannot break desktop toggling.
        headerElement.addEventListener('click', (e) => {
            const button = e.target.closest('#profileBtn');
            if (!button) {
                return;
            }

            if (e.__globalHeaderHandled) {
                return;
            }

            e.__globalHeaderHandled = true;
            e.preventDefault();
            e.stopPropagation();
            toggleDropdown();
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!dropdownContainer.contains(e.target)) {
                closeDropdown();
            }
        });

        // Close dropdown when pressing Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && dropdownContainer.classList.contains('open')) {
                closeDropdown();
                profileBtn.focus();
            }
        });

        // Close dropdown when clicking on items with data-close-dropdown attribute
        dropdownMenu.querySelectorAll('[data-close-dropdown="true"]').forEach(item => {
            item.addEventListener('click', () => {
                closeDropdown();
            });
        });

        this.setProfileDropdownState(false);
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
        dropdownMenu.dataset.state = isOpen ? 'open' : 'closed';
        profileBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        dropdownMenu.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
        dropdownMenu.style.opacity = isOpen ? '1' : '0';
        dropdownMenu.style.visibility = isOpen ? 'visible' : 'hidden';
        dropdownMenu.style.transform = isOpen ? 'translateY(0)' : 'translateY(-10px)';
        dropdownMenu.style.pointerEvents = isOpen ? 'auto' : 'none';
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

        // Reuse an existing placeholder when present so pages render one shared header consistently.
        const headerContainer = document.getElementById(this.config.headerContainerId) || document.createElement('div');
        if (!headerContainer.id) {
            headerContainer.id = this.config.headerContainerId;
        }
        headerContainer.innerHTML = this.getHeaderHTML();

        // Insert at the very beginning of body if the placeholder does not already exist there.
        if (!headerContainer.parentNode) {
            body.insertBefore(headerContainer, body.firstChild);
        }

        return true;
    },

    /**
     * Inject favicon if missing
     */
    injectFavicon() {
        if (!document.querySelector('link[rel="icon"]') && !document.querySelector('link[rel="shortcut icon"]')) {
            const link = document.createElement('link');
            link.rel = 'icon';
            link.href = 'image.png';
            link.type = 'image/png';
            document.head.appendChild(link);
        }
    },

    /**
     * Initialize the header component
     */
    init() {
        if (this.isInitialized && document.getElementById('globalSiteHeader')) {
            this.updateCartCount();
            this.checkAndUpdateAuthState();
            return this;
        }

        // Inject scoped styles first to ensure proper styling
        this.injectStyles();
        
        // Inject favicon
        this.injectFavicon();
        
        // Insert the header HTML
        const inserted = this.insertHeader();
        
        if (inserted) {
            // Initialize dropdown behavior
            this.initDropdownBehavior();
            
            // Update cart count
            this.updateCartCount();
            
            // Check auth state and update profile dropdown
            this.checkAndUpdateAuthState();

            // Listen for storage events to update cart count
            window.addEventListener('storage', (e) => {
                if (e.key === 'photoFramingCart') {
                    this.updateCartCount();
                }
                // Also check for auth changes
                if (e.key === 'jb_current_user') {
                    this.checkAndUpdateAuthState();
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

        this.isInitialized = true;

        return this;
    },
    
    /**
     * Check authentication state and update the header
     */
    checkAndUpdateAuthState() {
        // Check jb_current_user in localStorage (OTP auth)
        const currentUserData = localStorage.getItem('jb_current_user');
        if (currentUserData) {
            try {
                const userData = JSON.parse(currentUserData);
                // Handle both direct user object and session wrapper
                const user = userData.user || userData;
                if (user && user.phone) {
                    console.log('GlobalHeader: User is authenticated:', user.name, user.phone);
                    this.updateAuthState(true, user);
                    return;
                }
            } catch (error) {
                console.error('GlobalHeader: Error parsing jb_current_user:', error);
            }
        }
        
        // Check window.otpAuthUtils
        if (window.otpAuthUtils && typeof window.otpAuthUtils.getCurrentUser === 'function') {
            const otpUser = window.otpAuthUtils.getCurrentUser();
            if (otpUser) {
                console.log('GlobalHeader: User from otpAuthUtils:', otpUser.name);
                this.updateAuthState(true, otpUser);
                return;
            }
        }
        
        // Check jb_user (legacy)
        const storedUser = localStorage.getItem('jb_user') || sessionStorage.getItem('jb_user');
        if (storedUser) {
            try {
                const user = JSON.parse(storedUser);
                if (user) {
                    console.log('GlobalHeader: User from jb_user:', user.name);
                    this.updateAuthState(true, user);
                    return;
                }
            } catch (error) {
                console.error('GlobalHeader: Error parsing jb_user:', error);
            }
        }
        
        // No user found - show guest options
        console.log('GlobalHeader: No user found, showing guest options');
        this.updateAuthState(false);
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
        // Open chat support - same logic as openContactChat in quick links
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
                // Fallback to email if chat not available
                window.location.href = 'mailto:jbcreationssss@gmail.com?subject=Support%20Request';
            }
        }
    };
}

if (typeof aboutUs === 'undefined') {
    window.aboutUs = function() {
        // Navigate to About Us page
        window.location.href = 'about-us.html';
    };
}

if (!window.__globalWebsiteHeaderAutoInitAttached) {
    window.__globalWebsiteHeaderAutoInitAttached = true;

    const autoInitGlobalWebsiteHeader = function() {
        if (window.GlobalWebsiteHeader && document.getElementById(GlobalWebsiteHeader.config.headerContainerId)) {
            window.GlobalWebsiteHeader.init();
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', autoInitGlobalWebsiteHeader);
    } else {
        autoInitGlobalWebsiteHeader();
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GlobalWebsiteHeader;
}
