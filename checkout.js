/*
 * Checkout Page JavaScript - V9 (Diagnostic Version)
 * Handles order processing and submission with Firebase and Cloudinary integration
 * Users can place orders without login requirement
 */

// VERSION CHECK - Update this to force cache refresh
const CHECKOUT_VERSION = '9.2-INDEXEDDB';

console.log('');
console.log('%c╔═══════════════════════════════════════════════════════════════════════════╗', 'color: #00ff00; font-size: 16px; font-weight: bold;');
console.log('%c║    🛒 CHECKOUT.JS VERSION ' + CHECKOUT_VERSION.padEnd(20) + '                        ║', 'color: #00ff00; font-size: 16px; font-weight: bold;');
console.log('%c║    📅 ' + new Date().toISOString() + '                        ║', 'color: #00ff00; font-size: 16px; font-weight: bold;');
console.log('%c╚═══════════════════════════════════════════════════════════════════════════╝', 'color: #00ff00; font-size: 16px; font-weight: bold;');
console.log('');

// ═══════════════════════════════════════════════════════════════
// IndexedDB Storage for Large Images (sessionStorage has 5MB limit)
// ═══════════════════════════════════════════════════════════════
const ImageDB = {
    dbName: 'JBCreationsImages',
    storeName: 'cartImages',
    version: 1,
    
    // Open/create the database
    async open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            
            request.onerror = () => {
                console.error('❌ IndexedDB error:', request.error);
                reject(request.error);
            };
            
            request.onsuccess = () => {
                resolve(request.result);
            };
            
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                    console.log('📦 IndexedDB store created for cart images');
                }
            };
        });
    },
    
    // Retrieve high-quality image data
    async getImage(itemId) {
        try {
            const db = await this.open();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readonly');
                const store = transaction.objectStore(this.storeName);
                const request = store.get(String(itemId));
                
                request.onsuccess = () => {
                    if (request.result) {
                        console.log(`✅ IndexedDB: Retrieved images for item ${itemId}`);
                        resolve(request.result);
                    } else {
                        console.log(`⚠️ IndexedDB: No images found for item ${itemId}`);
                        resolve(null);
                    }
                };
                
                request.onerror = () => {
                    console.error('❌ IndexedDB get error:', request.error);
                    reject(request.error);
                };
                
                transaction.oncomplete = () => db.close();
            });
        } catch (error) {
            console.error('❌ Failed to get from IndexedDB:', error);
            return null;
        }
    },
    
    // Delete image data for an item
    async deleteImage(itemId) {
        try {
            const db = await this.open();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.delete(String(itemId));
                
                request.onsuccess = () => {
                    console.log(`🗑️ IndexedDB: Deleted images for item ${itemId}`);
                    resolve(true);
                };
                
                request.onerror = () => reject(request.error);
                transaction.oncomplete = () => db.close();
            });
        } catch (error) {
            console.error('❌ Failed to delete from IndexedDB:', error);
            return false;
        }
    },
    
    // Clear all stored images
    async clearAll() {
        try {
            const db = await this.open();
            return new Promise((resolve, reject) => {
                const transaction = db.transaction([this.storeName], 'readwrite');
                const store = transaction.objectStore(this.storeName);
                const request = store.clear();
                
                request.onsuccess = () => {
                    console.log('🧹 IndexedDB: Cleared all cart images');
                    resolve(true);
                };
                
                request.onerror = () => reject(request.error);
                transaction.oncomplete = () => db.close();
            });
        } catch (error) {
            console.error('❌ Failed to clear IndexedDB:', error);
            return false;
        }
    }
};

// Make ImageDB globally available
window.ImageDB = ImageDB;
// ═══════════════════════════════════════════════════════════════

// Clean up old cart images that aren't in current cart to prevent quota issues
function cleanupOldCartImages() {
    console.log('🧹 Cleaning up old cart images from sessionStorage...');
    const currentCart = JSON.parse(sessionStorage.getItem('photoFramingCart') || '[]');
    const currentItemIds = new Set(currentCart.map(item => String(item.id)));
    
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith('cartImage_')) {
            // Extract item ID from key
            const match = key.match(/cartImage_(?:full_|hq_)?(\d+)/);
            if (match) {
                const itemId = match[1];
                if (!currentItemIds.has(itemId)) {
                    keysToRemove.push(key);
                }
            }
        }
    }
    
    keysToRemove.forEach(key => {
        sessionStorage.removeItem(key);
        console.log(`  🗑️ Removed orphaned: ${key}`);
    });
    
    if (keysToRemove.length > 0) {
        console.log(`✅ Cleaned up ${keysToRemove.length} orphaned cart image entries`);
    } else {
        console.log('✅ No orphaned cart images found');
    }
}

// Run cleanup on page load
cleanupOldCartImages();

// Initialize Firebase API instance (will be loaded from window events)
let jbApi = null;

// Listen for Firebase API ready event
window.addEventListener('firebaseReady', (event) => {
    console.log('🔥 Firebase API ready event received');
    jbApi = window.jbAPI || window.jbFirebaseAPI;
    window.jbApi = jbApi; // Make it globally available
    console.log('✅ Firebase API initialized for checkout:', jbApi);
});

// Load Cloudinary client library
document.addEventListener('DOMContentLoaded', function() {
    // ═══════════════════════════════════════════════════════════════
    // DIAGNOSTIC: Dump ALL sessionStorage and localStorage keys
    // ═══════════════════════════════════════════════════════════════
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║        SESSION STORAGE DIAGNOSTIC DUMP                        ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    
    console.log('\n📦 ALL sessionStorage keys:');
    for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        const value = sessionStorage.getItem(key);
        const sizeKB = Math.round(value.length / 1024);
        
        if (key.includes('cartImage') || key.includes('Image')) {
            console.log(`  🖼️ ${key}: ${sizeKB} KB`);
            // Show first 80 chars of the data
            console.log(`      Preview: ${value.substring(0, 80)}...`);
        } else if (key === 'photoFramingCart') {
            try {
                const cart = JSON.parse(value);
                console.log(`  🛒 photoFramingCart: ${cart.length} items`);
                cart.forEach((item, idx) => {
                    console.log(`      Item ${idx + 1} (ID: ${item.id}):`);
                    console.log(`        - hasImage: ${!!item.image}`);
                    console.log(`        - hasThumbnailImage: ${!!item.thumbnailImage}`);
                    console.log(`        - hasHighQualityPrintImage: ${!!item.highQualityPrintImage}`);
                    console.log(`        - hasAdminCroppedImage: ${!!item.adminCroppedImage}`);
                    if (item.thumbnailImage) {
                        console.log(`        - thumbnailImageSize: ${Math.round(item.thumbnailImage.length / 1024)} KB`);
                    }
                    if (item.highQualityPrintImage) {
                        console.log(`        - highQualityPrintImageSize: ${Math.round(item.highQualityPrintImage.length / 1024)} KB`);
                    }
                    if (item.adminCroppedImage) {
                        console.log(`        - adminCroppedImageSize: ${Math.round(item.adminCroppedImage.length / 1024)} KB`);
                    }
                });
            } catch(e) {
                console.log(`  🛒 photoFramingCart: [parse error] ${sizeKB} KB`);
            }
        } else {
            console.log(`  📄 ${key}: ${sizeKB} KB`);
        }
    }
    
    console.log('\n📁 Looking for specific cart image keys:');
    const cart = JSON.parse(sessionStorage.getItem('photoFramingCart') || '[]');
    cart.forEach((item, idx) => {
        const fullKey = `cartImage_full_${item.id}`;
        const compressedKey = `cartImage_${item.id}`;
        const hqKey = `cartImage_hq_${item.id}`;
        
        const fullData = sessionStorage.getItem(fullKey);
        const compressedData = sessionStorage.getItem(compressedKey);
        const hqData = sessionStorage.getItem(hqKey);
        
        console.log(`  Item ${idx + 1} (${item.id}):`);
        console.log(`    - ${fullKey}: ${fullData ? Math.round(fullData.length/1024) + ' KB' : '❌ NOT FOUND'}`);
        console.log(`    - ${compressedKey}: ${compressedData ? Math.round(compressedData.length/1024) + ' KB' : '❌ NOT FOUND'}`);
        console.log(`    - ${hqKey}: ${hqData ? Math.round(hqData.length/1024) + ' KB' : '❌ NOT FOUND'}`);
    });
    
    console.log('');
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║        END OF SESSION STORAGE DIAGNOSTIC                      ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    console.log('');
    
    // Add Cloudinary script if not already added
    if (!window.cloudinary) {
        const script = document.createElement('script');
        script.src = 'https://widget.cloudinary.com/v2.0/global/all.js';
        script.onload = function() {
            console.log('✅ Cloudinary library loaded');
        };
        document.head.appendChild(script);
    }
});

// Fallback: Try to access Firebase API directly from window after delay
setTimeout(() => {
    if (!jbApi && (window.jbAPI || window.jbFirebaseAPI)) {
        jbApi = window.jbAPI || window.jbFirebaseAPI;
        window.jbApi = jbApi;
        console.log('🔄 Firebase API loaded via window fallback:', jbApi);
    } else if (!jbApi) {
        console.warn('⚠️ Firebase client not available after timeout, using local fallback');
    }
}, 2000);

// Cloudinary reference 
let cloudinaryConfig = null;
setTimeout(() => {
    if (window.cloudinaryConfig) {
        cloudinaryConfig = window.cloudinaryConfig;
        console.log('✅ Cloudinary config loaded:', cloudinaryConfig.cloudName);
    } else {
        console.warn('⚠️ Cloudinary config not available');
    }
}, 1000);

// Enhanced Cloudinary Upload with Direct Upload Support
async function uploadOrderImagesToCloudinaryEnhanced(orderData) {
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('🔄 CLOUDINARY UPLOAD - STARTING');
    console.log('═══════════════════════════════════════════════════════════════');
    console.log('📦 Order data:', {
        orderNumber: orderData.orderNumber,
        itemCount: orderData.items ? orderData.items.length : 0
    });
    
    // Log each item's available images
    if (orderData.items) {
        orderData.items.forEach((item, index) => {
            console.log(`📸 Item ${index + 1} (ID: ${item.id}):`, {
                hasHighQualityPrintImage: !!item.highQualityPrintImage,
                hasAdminCroppedImage: !!item.adminCroppedImage,
                hasPrintImage: !!item.printImage,
                hasOriginalImage: !!item.originalImage,
                highQualitySize: item.highQualityPrintImage ? `${Math.round(item.highQualityPrintImage.length / 1024)} KB` : 'N/A',
                adminCroppedSize: item.adminCroppedImage ? `${Math.round(item.adminCroppedImage.length / 1024)} KB` : 'N/A'
            });
            
            // Check sessionStorage for this item
            const fullKey = `cartImage_full_${item.id}`;
            const compressedKey = `cartImage_${item.id}`;
            const fullData = sessionStorage.getItem(fullKey);
            const compressedData = sessionStorage.getItem(compressedKey);
            console.log(`📁 SessionStorage for item ${item.id}:`, {
                fullKeyExists: !!fullData,
                compressedKeyExists: !!compressedData,
                fullDataSize: fullData ? `${Math.round(fullData.length / 1024)} KB` : 'N/A',
                compressedDataSize: compressedData ? `${Math.round(compressedData.length / 1024)} KB` : 'N/A'
            });
        });
    }
    console.log('═══════════════════════════════════════════════════════════════');
    
    // Try direct upload first (production-ready, no server needed)
    if (window.CloudinaryDirect) {
        console.log('📤 Attempting direct browser-to-Cloudinary upload...');
        try {
            const cloudinaryDirect = new window.CloudinaryDirect();
            const results = await cloudinaryDirect.uploadOrderImages(orderData.items, orderData.orderNumber);
            
            // Check if all uploads were successful
            const successfulUploads = results.filter(result => result.urls !== null);
            if (successfulUploads.length > 0) {
                console.log(`✅ Direct upload successful: ${successfulUploads.length}/${results.length} images`);
                return results;
            } else {
                console.warn('⚠️ Direct upload failed for all images, trying fallback...');
            }
        } catch (error) {
            console.warn('⚠️ Direct upload failed:', error.message);
            console.log('🔄 Falling back to server-based upload...');
        }
    } else {
        console.log('📋 Direct upload not available, using server-based upload...');
    }
    
    // Fallback to existing server-based upload
    const fallbackResult = await uploadOrderImagesToCloudinary(orderData);
    
    // Debug the fallback result
    console.log('🔍 Fallback upload result:', {
        hasResult: !!fallbackResult,
        resultLength: fallbackResult ? fallbackResult.length : 0,
        successfulUploads: fallbackResult ? fallbackResult.filter(r => r.urls !== null).length : 0,
        shouldCreateFallback: !fallbackResult || fallbackResult.length === 0 || !fallbackResult.some(result => result.urls !== null)
    });
    
    // If server-based upload also fails, create fallback with compressed images for admin viewing
    if (!fallbackResult || fallbackResult.length === 0 || !fallbackResult.some(result => result.urls !== null)) {
        console.warn('⚠️ All upload methods failed, creating fallback entries with compressed images');
        
        const fallbackResults = [];
        for (let i = 0; i < orderData.items.length; i++) {
            const item = orderData.items[i];
            
            // Try to get compressed image for admin viewing
            let fallbackImageData = null;
            try {
                console.log(`🔍 Looking for fallback image for item ${item.id}...`);
                
                // PRIORITY 0: Check IndexedDB first (high-quality images stored here)
                const indexedDBData = await ImageDB.getImage(item.id);
                if (indexedDBData) {
                    console.log(`💾 Found image in IndexedDB for item ${item.id}:`, {
                        hasHighQualityPrintImage: !!indexedDBData.highQualityPrintImage,
                        hasAdminCroppedImage: !!indexedDBData.adminCroppedImage,
                        hasPrintImage: !!indexedDBData.printImage,
                        hasOriginalImage: !!indexedDBData.originalImage,
                        highQualityPrintImageSize: indexedDBData.highQualityPrintImage ? Math.round(indexedDBData.highQualityPrintImage.length / 1024) + ' KB' : 'N/A',
                        adminCroppedImageSize: indexedDBData.adminCroppedImage ? Math.round(indexedDBData.adminCroppedImage.length / 1024) + ' KB' : 'N/A'
                    });
                    fallbackImageData = indexedDBData.highQualityPrintImage || indexedDBData.adminCroppedImage || indexedDBData.printImage || indexedDBData.originalImage;
                    if (fallbackImageData) {
                        console.log(`✅ Using IndexedDB high-quality image for item ${item.id}, Size: ${Math.round(fallbackImageData.length / 1024)} KB`);
                    }
                }
                
                // PRIORITY 1: Check window.cartImageStorage (fallback for when IndexedDB fails)
                if (!fallbackImageData && window.cartImageStorage && window.cartImageStorage[item.id]) {
                    const windowImageData = window.cartImageStorage[item.id];
                    console.log(`🪟 Found image in window.cartImageStorage for item ${item.id}:`, {
                        hasHighQualityPrintImage: !!windowImageData.highQualityPrintImage,
                        hasAdminCroppedImage: !!windowImageData.adminCroppedImage,
                        hasPrintImage: !!windowImageData.printImage,
                        hasOriginalImage: !!windowImageData.originalImage,
                        highQualityPrintImageSize: windowImageData.highQualityPrintImage ? Math.round(windowImageData.highQualityPrintImage.length / 1024) + ' KB' : 'N/A',
                        adminCroppedImageSize: windowImageData.adminCroppedImage ? Math.round(windowImageData.adminCroppedImage.length / 1024) + ' KB' : 'N/A'
                    });
                    fallbackImageData = windowImageData.highQualityPrintImage || windowImageData.adminCroppedImage || windowImageData.printImage || windowImageData.originalImage;
                    if (fallbackImageData) {
                        console.log(`✅ Using window.cartImageStorage image for item ${item.id}, Size: ${Math.round(fallbackImageData.length / 1024)} KB`);
                    }
                }
                
                // PRIORITY 1: Try FULL quality images from sessionStorage (best for printing)
                if (!fallbackImageData) {
                    const sessionFullImageData = sessionStorage.getItem(`cartImage_full_${item.id}`);
                    if (sessionFullImageData) {
                        const fullImageData = JSON.parse(sessionFullImageData);
                        console.log(`📦 Full storage contents for item ${item.id}:`, {
                            hasHighQualityPrintImage: !!fullImageData.highQualityPrintImage,
                            hasAdminCroppedImage: !!fullImageData.adminCroppedImage,
                            hasPrintImage: !!fullImageData.printImage,
                            hasOriginalImage: !!fullImageData.originalImage,
                            highQualityPrintImageSize: fullImageData.highQualityPrintImage ? fullImageData.highQualityPrintImage.length : 0,
                            adminCroppedImageSize: fullImageData.adminCroppedImage ? fullImageData.adminCroppedImage.length : 0
                        });
                        // PRIORITY: highQualityPrintImage > adminCroppedImage > printImage > originalImage
                        fallbackImageData = fullImageData.highQualityPrintImage || fullImageData.adminCroppedImage || fullImageData.printImage || fullImageData.originalImage;
                        if (fallbackImageData) {
                            console.log(`✅ Using FULL quality image for item ${item.id}:`, 
                                fullImageData.highQualityPrintImage ? 'highQualityPrintImage' :
                                (fullImageData.adminCroppedImage ? 'adminCroppedImage' : 
                                (fullImageData.printImage ? 'printImage' : 'originalImage')),
                                `Size: ${Math.round(fallbackImageData.length / 1024)} KB`);
                        }
                    }
                }
                
                // PRIORITY 2: Try compressed images if full quality not available
                if (!fallbackImageData) {
                    const sessionImageData = sessionStorage.getItem(`cartImage_${item.id}`);
                    if (sessionImageData) {
                        const imageData = JSON.parse(sessionImageData);
                        console.log(`📦 Compressed storage contents for item ${item.id}:`, {
                            hasHighQualityPrintImage: !!imageData.highQualityPrintImage,
                            hasAdminCroppedImage: !!imageData.adminCroppedImage,
                            hasPrintImage: !!imageData.printImage,
                            hasOriginalImage: !!imageData.originalImage
                        });
                        // PRIORITY: highQualityPrintImage > adminCroppedImage > printImage > originalImage > previewImage
                        fallbackImageData = imageData.highQualityPrintImage || imageData.adminCroppedImage || imageData.printImage || imageData.originalImage || imageData.previewImage || imageData.displayImage;
                        if (fallbackImageData) {
                            console.log(`⚠️ Using COMPRESSED image for item ${item.id}, Size: ${Math.round(fallbackImageData.length / 1024)} KB`);
                        }
                    }
                }
            } catch (error) {
                console.warn('Could not retrieve fallback image:', error);
            }
            
            // Fallback to thumbnail if available
            if (!fallbackImageData && item.thumbnailImage) {
                fallbackImageData = item.thumbnailImage;
                console.log(`🖼️ Using thumbnail as fallback image for item ${item.id}`);
            }
            
            console.log(`🔍 Final fallback image status for item ${item.id}:`, !!fallbackImageData);
            
            fallbackResults.push({
                itemIndex: i,
                urls: null,
                error: 'Upload failed - using local storage',
                fallbackImage: fallbackImageData // Store for admin panel
            });
        }
        
        return fallbackResults;
    }
    
    return fallbackResult;
}

// Order management state
let orderData = {
    customer: {},
    items: [],
    totals: {
        subtotal: 0,
        delivery: 0,
        total: 0
    },
    deliveryMethod: 'standard'
};

// Initialize checkout page
document.addEventListener('DOMContentLoaded', function() {
    // Wait for auth utilities to load
    function initializeCheckout() {
        console.log('🔵 Checkout: Initializing...');
        console.log('🔵 Checkout: jb_current_user in localStorage:', localStorage.getItem('jb_current_user'));
        
        // Check if user is authenticated
        const user = getCurrentUser();
        console.log('🔵 Checkout: getCurrentUser returned:', user);
        
        if (user) {
            console.log('🔵 Checkout: User found, pre-filling form...');
            console.log('🔵 Checkout: User phone:', user.phone);
            console.log('🔵 Checkout: User name:', user.name);
            
            // Pre-fill customer information for logged-in users
            const userName = user.name || user.displayName || user.fullName || '';
            const userEmail = user.email || '';
            
            document.getElementById('customerName').value = userName;
            document.getElementById('customerEmail').value = userEmail;
            
            // Handle phone number - extract digits only for new format
            const userPhone = user.phone || '';
            console.log('🔵 Checkout: Extracted phone:', userPhone);
            const phoneInput = document.getElementById('customerPhone');
            if (userPhone && phoneInput) {
                // Extract only the 10-digit number (remove +91 prefix if present)
                let phoneDigits = userPhone.replace(/[^\d]/g, '');
                console.log('🔵 Checkout: Phone digits after cleanup:', phoneDigits);
                if (phoneDigits.startsWith('91') && phoneDigits.length > 10) {
                    phoneDigits = phoneDigits.substring(2); // Remove 91 prefix
                }
                if (phoneDigits.length >= 10) {
                    phoneInput.value = phoneDigits.substring(0, 10);
                    console.log('🔵 Checkout: Phone field set to:', phoneInput.value);
                    // Make phone field read-only for logged-in users
                    // The phone number is their primary ID and should not be changed here
                    phoneInput.readOnly = true;
                    phoneInput.style.backgroundColor = '#f5f5f5';
                    phoneInput.style.cursor = 'not-allowed';
                    phoneInput.title = 'Phone number cannot be changed. It is linked to your account.';
                    
                    // Add a small note under the phone field
                    const phoneContainer = phoneInput.closest('.form-group');
                    if (phoneContainer) {
                        const helpText = phoneContainer.querySelector('.form-help-text');
                        if (helpText) {
                            helpText.innerHTML = '<i class="fas fa-lock" style="margin-right: 4px;"></i> Linked to your account. Orders will be tracked using this number.';
                        }
                    }
                }
            }
            
            // Hide the status container completely for logged-in users
            hideUserStatusContainer();
        } else {
            // Don't show guest/login options - just let user fill the form
            // OTP verification will happen when they enter phone number
            hideUserStatusContainer();
        }

        loadCartItems();
        updateOrderSummary();
        updateEstimatedDelivery();

        // Add form validation listeners
        addFormValidationListeners();
        
        // Add special phone number event listeners
        addPhoneEventListeners();

        // Initialize mobile order toggle
        initMobileOrderToggle();

        // Initialize mobile drawer for viewing items from sticky bar
        initMobileDrawer();
    }
    
    // Check if auth utilities are ready, otherwise wait a bit
    if (window.otpAuthUtils) {
        initializeCheckout();
    } else {
        // Wait for auth utilities to load
        setTimeout(initializeCheckout, 500);
    }
});

// Mobile drawer toggle logic with swipe support
function initMobileDrawer() {
    const toggleBtn = document.getElementById('mobileItemsToggle');
    const drawer = document.getElementById('mobileOrderDrawer');
    const closeBtn = document.getElementById('mobileDrawerClose');
    const backdrop = document.getElementById('mobileDrawerBackdrop');
    const totalBox = document.getElementById('mobileTotalBox');
    const swipeHandle = document.getElementById('mobileDrawerSwipeHandle');
    
    if (!toggleBtn || !drawer || !closeBtn || !backdrop) return;

    const openDrawer = () => {
        drawer.classList.add('open');
        backdrop.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
        backdrop.setAttribute('aria-hidden', 'false');
        toggleBtn.setAttribute('aria-expanded', 'true');
        if (totalBox) totalBox.classList.add('drawer-open');
    };
    
    const closeDrawer = () => {
        drawer.classList.remove('open');
        drawer.classList.remove('dragging');
        backdrop.classList.remove('open');
        drawer.setAttribute('aria-hidden', 'true');
        backdrop.setAttribute('aria-hidden', 'true');
        toggleBtn.setAttribute('aria-expanded', 'false');
        drawer.style.transform = '';
        if (totalBox) totalBox.classList.remove('drawer-open');
    };

    toggleBtn.addEventListener('click', () => {
        const isOpen = drawer.classList.contains('open');
        if (isOpen) closeDrawer(); else openDrawer();
    });
    
    // Click on Total Payable to show/hide items
    if (totalBox) {
        totalBox.addEventListener('click', () => {
            const isOpen = drawer.classList.contains('open');
            if (isOpen) closeDrawer(); else openDrawer();
        });
        
        // Also handle keyboard activation
        totalBox.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                const isOpen = drawer.classList.contains('open');
                if (isOpen) closeDrawer(); else openDrawer();
            }
        });
    }
    
    closeBtn.addEventListener('click', closeDrawer);
    backdrop.addEventListener('click', closeDrawer);

    // Close on Escape
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeDrawer();
    });
    
    // Swipe to close functionality
    let startY = 0;
    let currentY = 0;
    let isDragging = false;
    const SWIPE_THRESHOLD = 80; // Minimum distance to trigger close
    
    const handleTouchStart = (e) => {
        if (!drawer.classList.contains('open')) return;
        startY = e.touches[0].clientY;
        currentY = startY;
        isDragging = true;
        drawer.classList.add('dragging');
    };
    
    const handleTouchMove = (e) => {
        if (!isDragging || !drawer.classList.contains('open')) return;
        currentY = e.touches[0].clientY;
        const deltaY = currentY - startY;
        
        // Only allow dragging down (positive deltaY)
        if (deltaY > 0) {
            e.preventDefault();
            drawer.style.transform = `translateY(${deltaY}px)`;
        }
    };
    
    const handleTouchEnd = () => {
        if (!isDragging) return;
        isDragging = false;
        drawer.classList.remove('dragging');
        
        const deltaY = currentY - startY;
        
        if (deltaY > SWIPE_THRESHOLD) {
            // Swipe down far enough - close the drawer
            closeDrawer();
        } else {
            // Not far enough - snap back to open position
            drawer.style.transform = '';
        }
    };
    
    // Add touch listeners to swipe handle and drawer header
    if (swipeHandle) {
        swipeHandle.addEventListener('touchstart', handleTouchStart, { passive: true });
        swipeHandle.addEventListener('touchmove', handleTouchMove, { passive: false });
        swipeHandle.addEventListener('touchend', handleTouchEnd, { passive: true });
    }
    
    // Also allow swiping from the drawer header area
    const drawerHeader = drawer.querySelector('.mobile-drawer-header');
    if (drawerHeader) {
        drawerHeader.addEventListener('touchstart', handleTouchStart, { passive: true });
        drawerHeader.addEventListener('touchmove', handleTouchMove, { passive: false });
        drawerHeader.addEventListener('touchend', handleTouchEnd, { passive: true });
    }
}

// Pincode lookup functionality
let pincodeTimeout;

// Indian states data for autocomplete
const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Puducherry', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Andaman and Nicobar Islands'
];

// Major cities data for autocomplete (sample - you can expand this)
const indianCities = {
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur', 'Kolhapur', 'Sangli', 'Thane', 'Navi Mumbai'],
    'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Dharwad', 'Mangalore', 'Belgaum', 'Bellary', 'Bijapur', 'Shimoga', 'Tumkur'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode', 'Vellore', 'Thoothukudi', 'Dindigul'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar', 'Anand', 'Bharuch'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Alwar', 'Bharatpur', 'Bhilwara', 'Sikar'],
    'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Allahabad', 'Meerut', 'Bareilly', 'Aligarh', 'Moradabad', 'Ghaziabad'],
    'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman', 'Malda', 'Baharampur', 'Habra', 'Kharagpur'],
    'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Ramagundam', 'Khammam', 'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Miryalaguda'],
    'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry', 'Tirupati', 'Kakinada', 'Anantapur', 'Vizianagaram'],
    'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Palakkad', 'Alappuzha', 'Malappuram', 'Kannur', 'Kasaragod'],
    'Punjab': ['Chandigarh', 'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Firozpur', 'Batala', 'Pathankot'],
    'Haryana': ['Gurgaon', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Panchkula'],
    'Delhi': ['New Delhi', 'Delhi', 'Dwarka', 'Rohini', 'Janakpuri', 'Lajpat Nagar', 'Karol Bagh', 'Connaught Place', 'Saket', 'Vasant Kunj'],
    'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa'],
    'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur', 'Bongaigaon', 'Dhubri', 'Diphu'],
    'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Bihar Sharif', 'Arrah', 'Begusarai', 'Katihar'],
    'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Brahmapur', 'Sambalpur', 'Puri', 'Balasore', 'Bhadrak', 'Baripada', 'Jharsuguda']
};

// Get all cities for general search
const allCities = Object.values(indianCities).flat();

function handlePincodeInput(pincode) {
    // If pincode is being filled, clear manual state/city
    if (pincode && pincode.length > 0) {
        // Use existing pincode logic
        fetchLocationByPincode(pincode);
    } else {
        // If pincode is cleared, enable manual entry
        resetLocationFields();
        enableManualEntry();
    }
}

function enableManualEntry() {
    const stateField = document.getElementById('customerState');
    const cityField = document.getElementById('customerCity');
    
    stateField.removeAttribute('readonly');
    cityField.removeAttribute('readonly');
    stateField.classList.remove('auto-filled');
    cityField.classList.remove('auto-filled');
}

function fetchLocationByPincode(pincode) {
    // Clear previous timeout
    clearTimeout(pincodeTimeout);
    
    // Reset fields if pincode is cleared
    if (!pincode || pincode.length < 6) {
        resetLocationFields();
        return;
    }
    
    // Only proceed if pincode is 6 digits
    if (pincode.length === 6 && /^\d{6}$/.test(pincode)) {
        // Debounce the API call
        pincodeTimeout = setTimeout(() => {
            performPincodeLookup(pincode);
        }, 500);
    }
}

function resetLocationFields() {
    const cityField = document.getElementById('customerCity');
    const stateField = document.getElementById('customerState');
    const loader = document.getElementById('pincodeLoader');
    
    cityField.value = '';
    stateField.value = '';
    cityField.placeholder = 'Will be filled automatically';
    stateField.placeholder = 'Will be filled automatically';
    cityField.classList.remove('auto-filled', 'valid');
    stateField.classList.remove('auto-filled', 'valid');
    loader.style.display = 'none';
}

async function performPincodeLookup(pincode) {
    const cityField = document.getElementById('customerCity');
    const stateField = document.getElementById('customerState');
    const loader = document.getElementById('pincodeLoader');
    const pincodeField = document.getElementById('customerPincode');
    
    // Show loader
    loader.style.display = 'flex';
    cityField.placeholder = 'Loading...';
    stateField.placeholder = 'Loading...';
    
    try {
        // Using India Post Office API (free)
        const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        const data = await response.json();
        
        if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
            const postOffice = data[0].PostOffice[0];
            const city = postOffice.District || postOffice.Name;
            const state = postOffice.State;
            
            // Fill the fields
            cityField.value = city;
            stateField.value = state;
            
            // Add visual feedback
            cityField.classList.add('auto-filled', 'valid');
            stateField.classList.add('auto-filled', 'valid');
            pincodeField.classList.add('valid');
            
            // Update placeholders
            cityField.placeholder = city;
            stateField.placeholder = state;
            
            // Remove readonly attribute to allow editing if needed
            cityField.removeAttribute('readonly');
            stateField.removeAttribute('readonly');
        } else {
            // Invalid pincode
            cityField.placeholder = 'Invalid pincode';
            stateField.placeholder = 'Invalid pincode';
            pincodeField.classList.add('invalid');
        }
    } catch (error) {
        console.error('Error fetching pincode data:', error);
        cityField.placeholder = 'Enter manually';
        stateField.placeholder = 'Enter manually';
        
        // Remove readonly to allow manual entry
        cityField.removeAttribute('readonly');
        stateField.removeAttribute('readonly');
    }
    
    // Hide loader
    loader.style.display = 'none';
}

// Enable manual editing of auto-filled fields
function enableManualEdit(fieldId) {
    const field = document.getElementById(fieldId);
    if (field.hasAttribute('readonly')) {
        field.removeAttribute('readonly');
        field.classList.remove('auto-filled');
        field.focus();
        field.select();
        
        // Update help text
        const helpText = field.parentElement.querySelector('.form-help-text');
        if (helpText) {
            helpText.textContent = fieldId === 'customerCity' ? 'Manual entry enabled' : 'Manual entry enabled';
        }
    }
}

// Helper function to update phone container styling
function updatePhoneContainerStyling(input, isValid, hasContent) {
    const container = input.closest('.phone-input-container');
    if (!container) return;
    
    container.classList.remove('valid', 'invalid');
    
    if (hasContent) {
        if (isValid) {
            container.classList.add('valid');
        } else if (input.required || input.id === 'customerPhone') {
            container.classList.add('invalid');
        }
    }
}

// New phone number formatting for 10-digit numbers only
function formatPhoneNumberNew(input) {
    let value = input.value;
    
    // Remove all non-digit characters
    value = value.replace(/[^\d]/g, '');
    
    // Limit to 10 digits
    if (value.length > 10) {
        value = value.substring(0, 10);
    }
    
    // Set the value
    input.value = value;
    
    // Update styling using helper function
    const isValid = value.length === 10;
    const hasContent = value.length > 0;
    
    updatePhoneContainerStyling(input, isValid, hasContent);
    
    // Also update input classes for consistency
    input.classList.remove('valid', 'invalid');
    if (hasContent) {
        if (isValid) {
            input.classList.add('valid');
        } else if (input.required || input.id === 'customerPhone') {
            input.classList.add('invalid');
        }
    }
}

// New focus handler for phone fields
function handlePhoneFocusNew(input) {
    // Just focus the field - no need to add prefix
    const container = input.closest('.phone-input-container');
    if (container) {
        container.style.borderColor = 'var(--accent-color)';
    }
}

// New blur handler for phone fields
function handlePhoneBlurNew(input) {
    const container = input.closest('.phone-input-container');
    if (container) {
        container.style.borderColor = '';
    }
    
    // Trigger validation styling
    formatPhoneNumberNew(input);
}

// Handle phone field focus
function handlePhoneFocus(input) {
    // Ensure the field has the +91 prefix when focused
    if (!input.value || input.value.trim() === '') {
        input.value = '+91 ';
    }
    
    // Position cursor after the +91 prefix
    requestAnimationFrame(() => {
        if (input.value === '+91 ') {
            input.setSelectionRange(4, 4);
        } else {
            // Position cursor at the end of existing content
            input.setSelectionRange(input.value.length, input.value.length);
        }
    });
}

// Handle phone field blur
function handlePhoneBlur(input) {
    // If field only contains +91 prefix, clear it for optional fields
    if (input.value.trim() === '+91' || input.value.trim() === '+91 ') {
        // Only clear if it's the alternate phone (optional field)
        if (input.id === 'alternatePhone') {
            input.value = '';
            input.classList.remove('invalid', 'valid');
        } else {
            // For required phone field, keep the prefix
            input.value = '+91 ';
        }
    }
}

// DEPRECATED: Old phone number formatting for +91 prefix inside input (kept for compatibility)
function formatPhoneNumber(input) {
    console.warn('formatPhoneNumber is deprecated, use formatPhoneNumberNew instead');
    formatPhoneNumberNew(input);
}

// DEPRECATED: Old focus handler (kept for compatibility)
function handlePhoneFocus(input) {
    console.warn('handlePhoneFocus is deprecated, use handlePhoneFocusNew instead');
    handlePhoneFocusNew(input);
}

// DEPRECATED: Old blur handler (kept for compatibility) 
function handlePhoneBlur(input) {
    console.warn('handlePhoneBlur is deprecated, use handlePhoneBlurNew instead');
    handlePhoneBlurNew(input);
}

// Format phone number with +91 prefix
function formatPhoneNumber(input) {
    // Store current cursor position
    let cursorPosition = input.selectionStart;
    let value = input.value;
    
    // Handle deletion/clearing - if user is trying to clear the field completely
    if (value === '' || value === '+') {
        input.value = '+91 ';
        input.setSelectionRange(4, 4);
        return;
    }
    
    // Always ensure +91 prefix exists and is correct
    if (!value.startsWith('+91 ')) {
        // Remove any existing +91 variations and extract just the digits
        value = value.replace(/^\+91\s?/, '').replace(/[^\d]/g, '');
        
        // Add proper +91 prefix
        value = '+91 ' + value;
        
        // Adjust cursor position if we're adding the prefix
        if (cursorPosition <= 4) {
            cursorPosition = 4;
        }
    }
    
    // Extract the number part after '+91 '
    let numberPart = value.substring(4).replace(/[^\d]/g, '');
    
    // Limit to 10 digits
    if (numberPart.length > 10) {
        numberPart = numberPart.substring(0, 10);
        
        // If cursor was beyond the 10 digit limit, adjust it
        if (cursorPosition > 14) { // 4 for '+91 ' + 10 digits
            cursorPosition = 14;
        }
    }
    
    // Set the formatted value
    const newValue = '+91 ' + numberPart;
    input.value = newValue;
    
    // Restore cursor position (but not before the '+91 ' part)
    let newCursorPos = Math.max(4, Math.min(cursorPosition, newValue.length));
    
    // If user is typing, place cursor at the end of the number part
    if (cursorPosition >= 4 && numberPart.length > 0) {
        newCursorPos = 4 + numberPart.length;
    }
    
    // Set cursor position
    requestAnimationFrame(() => {
        input.setSelectionRange(newCursorPos, newCursorPos);
    });
    
    // Add validation styling
    if (numberPart.length === 10) {
        input.classList.remove('invalid');
        input.classList.add('valid');
    } else if (numberPart.length > 0) {
        input.classList.add('invalid');
        input.classList.remove('valid');
    } else {
        input.classList.remove('invalid', 'valid');
    }
}

// State autocomplete functions
function handleStateInput(value) {
    const suggestions = filterStates(value);
    showStateSuggestions(suggestions);
    
    // Clear city when state changes
    const cityField = document.getElementById('customerCity');
    if (cityField.value && !cityField.classList.contains('auto-filled')) {
        cityField.value = '';
    }
}

function filterStates(query) {
    if (!query || query.length < 2) return [];
    
    return indianStates.filter(state => 
        state.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8); // Limit to 8 suggestions
}

function showStateSuggestions(suggestions = null) {
    const input = document.getElementById('customerState');
    const container = document.getElementById('stateSuggestions');
    
    if (suggestions === null) {
        suggestions = filterStates(input.value);
    }
    
    if (suggestions.length === 0 && input.value.length >= 2) {
        container.innerHTML = '<div class="no-suggestions">No states found</div>';
        container.style.display = 'block';
        return;
    }
    
    if (suggestions.length > 0) {
        container.innerHTML = suggestions.map(state => 
            `<div class="autocomplete-suggestion" onclick="selectState('${state}')">${state}</div>`
        ).join('');
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

function hideStateSuggestions() {
    setTimeout(() => {
        document.getElementById('stateSuggestions').style.display = 'none';
    }, 200);
}

function selectState(state) {
    const stateField = document.getElementById('customerState');
    const cityField = document.getElementById('customerCity');
    
    stateField.value = state;
    stateField.classList.add('valid');
    hideStateSuggestions();
    
    // Clear city field for new state selection
    cityField.value = '';
    cityField.focus();
}

// City autocomplete functions
function handleCityInput(value) {
    const selectedState = document.getElementById('customerState').value;
    const suggestions = filterCities(value, selectedState);
    showCitySuggestions(suggestions);
}

function filterCities(query, state) {
    if (!query || query.length < 2) return [];
    
    let citiesToSearch = allCities;
    
    // If state is selected, prioritize cities from that state
    if (state && indianCities[state]) {
        citiesToSearch = [...indianCities[state], ...allCities.filter(city => !indianCities[state].includes(city))];
    }
    
    return citiesToSearch.filter(city => 
        city.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8); // Limit to 8 suggestions
}

function showCitySuggestions(suggestions = null) {
    const input = document.getElementById('customerCity');
    const container = document.getElementById('citySuggestions');
    
    if (suggestions === null) {
        const selectedState = document.getElementById('customerState').value;
        suggestions = filterCities(input.value, selectedState);
    }
    
    if (suggestions.length === 0 && input.value.length >= 2) {
        container.innerHTML = '<div class="no-suggestions">No cities found</div>';
        container.style.display = 'block';
        return;
    }
    
    if (suggestions.length > 0) {
        container.innerHTML = suggestions.map(city => 
            `<div class="autocomplete-suggestion" onclick="selectCity('${city}')">${city}</div>`
        ).join('');
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

function hideCitySuggestions() {
    setTimeout(() => {
        document.getElementById('citySuggestions').style.display = 'none';
    }, 200);
}

function selectCity(city) {
    const cityField = document.getElementById('customerCity');
    
    cityField.value = city;
    cityField.classList.add('valid');
    hideCitySuggestions();
}

// Add keyboard navigation for autocomplete
document.addEventListener('keydown', function(e) {
    const stateSuggestions = document.getElementById('stateSuggestions');
    const citySuggestions = document.getElementById('citySuggestions');
    
    if (e.key === 'Escape') {
        hideStateSuggestions();
        hideCitySuggestions();
    }
});

// Load cart items from localStorage
function loadCartItems() {
    const cart = JSON.parse(sessionStorage.getItem('photoFramingCart') || '[]');
    
    console.log('Loading cart items:', cart);
    console.log('Cart items count:', cart.length);
    
    if (cart.length === 0) {
        // Redirect back if cart is empty
        alert('Your cart is empty!');
        window.location.href = 'index.html';
        return;
    }
    
    // Log the structure of the first item for debugging
    if (cart.length > 0) {
        console.log('First cart item structure:', cart[0]);
        console.log('Available image properties:', {
            previewImage: !!cart[0].previewImage,
            displayImage: !!cart[0].displayImage,
            printImage: !!cart[0].printImage
        });
    }
    
    orderData.items = cart;
    calculateTotals();
}

// Hide user status container for logged-in users
function hideUserStatusContainer() {
    const statusContainer = document.getElementById('userStatusContainer');
    if (statusContainer) {
        statusContainer.style.display = 'none';
        statusContainer.innerHTML = '';
    }
}

// Show user status for logged-in users (kept for backward compatibility, but not used)
function showUserStatus(user) {
    const statusContainer = document.getElementById('userStatusContainer');
    if (statusContainer) {
        const userName = user.name || user.displayName || user.fullName || 'User';
        const userEmail = user.email || '';
        
        statusContainer.innerHTML = `
            <div class="user-status logged-in">
                <i class="fas fa-user-check"></i>
                <span>Logged in as: <strong>${userName}</strong> ${userEmail ? `(${userEmail})` : ''}</span>
                <button type="button" class="btn-link" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i> Sign Out
                </button>
            </div>
        `;
        statusContainer.style.display = 'block';
    }
}

// Show guest checkout options - disabled, we use OTP verification instead
function showGuestCheckoutOptions() {
    // No longer showing guest/login options
    // Users will verify via OTP when entering phone number
    hideUserStatusContainer();
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
    // Use OTP auth redirect if available
    if (window.otpAuthUtils) {
        window.otpAuthUtils.redirectToAuth();
        return;
    }
    
    // Fallback to legacy auth
    sessionStorage.setItem('auth_redirect', window.location.href);
    window.location.href = 'auth.html';
}

// Logout function
function logout() {
    // Clear OTP authentication if available
    if (window.otpAuthUtils) {
        window.otpAuthUtils.logout();
        return; // OTP auth handles redirect
    }
    
    // Fallback to legacy logout
    localStorage.removeItem('jb_user');
    sessionStorage.removeItem('jb_user');
    window.location.reload();
}

// Calculate order totals
function calculateTotals() {
    orderData.totals.subtotal = orderData.items.reduce((sum, item) => sum + item.price, 0);
    
    // Apply discount if any
    const discountAmount = orderData.discount ? orderData.discount.amount : 0;
    orderData.totals.total = orderData.totals.subtotal + orderData.totals.delivery - discountAmount;
    
    // Ensure total is not negative
    orderData.totals.total = Math.max(0, orderData.totals.total);
}

// Update order summary display
function updateOrderSummary() {
    const summaryContainer = document.getElementById('orderSummary');
    const mobileListContainer = document.getElementById('mobileOrderList');
    const subtotalElement = document.getElementById('subtotal');
    const deliveryChargeElement = document.getElementById('deliveryCharge');
    const finalTotalElement = document.getElementById('finalTotal');
    const orderCountElement = document.getElementById('orderCount');
    const mobileFinalTotalElement = document.getElementById('mobileFinalTotal');
    const mobileItemCountElement = document.getElementById('mobileItemCount');
    const orderToggleCount = document.getElementById('orderToggleCount');
    
    // Clear existing content
    if (summaryContainer) summaryContainer.innerHTML = '';
    if (mobileListContainer) mobileListContainer.innerHTML = '';
    
    // Update order count
    if (orderCountElement) {
        orderCountElement.textContent = `${orderData.items.length} item${orderData.items.length !== 1 ? 's' : ''}`;
    }
    if (mobileItemCountElement) {
        mobileItemCountElement.textContent = `${orderData.items.length} item${orderData.items.length !== 1 ? 's' : ''}`;
    }
    if (orderToggleCount) {
        orderToggleCount.textContent = `(${orderData.items.length})`;
    }
    
    // Add each cart item
    orderData.items.forEach((item, index) => {
        // Prioritize previewImage (framed version) for checkout display, then fallback to thumbnail
        const imageSource = item.previewImage || item.thumbnailImage || item.displayImage || item.printImage;
        
        console.log(`Item ${index + 1} image sources:`, {
            previewImage: item.previewImage ? 'Available (FRAMED)' : 'Not available',
            thumbnailImage: item.thumbnailImage ? 'Available' : 'Not available',
            displayImage: item.displayImage ? 'Available' : 'Not available', 
            printImage: item.printImage ? 'Available' : 'Not available',
            selectedSource: imageSource ? 'Found' : 'None found',
            isLightweight: !!(item.hasImage && !item.printImage && !item.displayImage) // Detect lightweight items
        });
        
        // Create a placeholder image if no image is available
        const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSIjZjhmOWZhIiBzdHJva2U9IiNlOWVjZWYiIHN0cm9rZS13aWR0aD0iMiIvPgo8cGF0aCBkPSJNNDAgNDBINDBWNDBINDBINDBaTTQwIDQwTDgwIDQwTDcwIDYwTDUwIDYwTDQwIDQwWiIgZmlsbD0iIzE2Njk3QSIgZmlsbC1vcGFjaXR5PSIwLjMiLz4KPGNpcmNsZSBjeD0iNTUiIGN5PSI1NSIgcj0iOCIgZmlsbD0iIzE2Njk3QSIgZmlsbC1vcGFjaXR5PSIwLjMiLz4KPHR5cGUgdGV4dD0iUGhvdG8iIHg9IjYwIiB5PSI5MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjMTY2OTdBIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QaG90bzwvdGV4dD4KPC9zdmc+';
        
        const itemHTML = `
            <img src="${imageSource || fallbackImage}" 
                 alt="Framed Photo" 
                 class="order-item-image" 
                 onerror="this.src='${fallbackImage}'; this.onerror=null;"
                 onload="console.log('Image loaded successfully for item ${index + 1}')">
            <div class="order-item-details">
                <div class="order-item-title">Custom Framed Photo #${index + 1}</div>
                <div class="order-item-meta">${item.frameSize?.size || 'N/A'} ${item.frameSize?.orientation || ''} • ${item.frameColor || 'Default'}${item.frameTexture ? ' ' + item.frameTexture : ''}</div>
                <div class="order-item-specs">
                    <strong>Size:</strong> ${item.frameSize?.size || 'N/A'}<br>
                    <strong>Orientation:</strong> ${item.frameSize?.orientation || 'N/A'}<br>
                    <strong>Frame:</strong> ${item.frameColor || 'Default'} ${item.frameTexture || 'texture'}<br>
                    <strong>Quantity:</strong> ${item.quantity || 1}<br>
                    <strong>Added:</strong> ${item.timestamp ? new Date(item.timestamp).toLocaleDateString() : new Date(item.orderDate || Date.now()).toLocaleDateString()}
                </div>
                <div class="order-item-price">₹${item.price || 349}</div>
            </div>
        `;
        if (summaryContainer) {
            const itemElement = document.createElement('div');
            itemElement.className = 'order-item';
            itemElement.innerHTML = itemHTML;
            summaryContainer.appendChild(itemElement);
        }
        if (mobileListContainer) {
            const mobileItem = document.createElement('div');
            mobileItem.className = 'order-item';
            mobileItem.innerHTML = itemHTML;
            mobileListContainer.appendChild(mobileItem);
        }
    });
    
    // Update totals
    if (subtotalElement) subtotalElement.textContent = `₹${orderData.totals.subtotal}`;
    if (deliveryChargeElement) deliveryChargeElement.textContent = `₹${orderData.totals.delivery}`;
    if (finalTotalElement) finalTotalElement.textContent = `₹${orderData.totals.total}`;
    if (mobileFinalTotalElement) {
        mobileFinalTotalElement.textContent = `₹${orderData.totals.total}`;
    }
}

// Update estimated delivery date
function updateEstimatedDelivery() {
    const estimatedDateElement = document.getElementById('estimatedDate');
    if (!estimatedDateElement) return;
    
    const today = new Date();
    
    // Add 5 days from today
    const deliveryDate = new Date(today);
    deliveryDate.setDate(deliveryDate.getDate() + 5);
    
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    
    estimatedDateElement.textContent = deliveryDate.toLocaleDateString('en-IN', options);
}

// Add special event listeners for phone number fields (updated for new format)
function addPhoneEventListeners() {
    const phoneFields = ['customerPhone', 'alternatePhone'];
    
    phoneFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            // Handle paste events
            field.addEventListener('paste', function(e) {
                e.preventDefault();
                const pastedText = (e.clipboardData || window.clipboardData).getData('text');
                
                // Extract just the numbers from pasted content
                let numbers = pastedText.replace(/[^\d]/g, '');
                
                // If it starts with 91, remove it (assuming +91 prefix was pasted)
                if (numbers.startsWith('91') && numbers.length > 10) {
                    numbers = numbers.substring(2);
                }
                
                // Limit to 10 digits
                if (numbers.length >= 10) {
                    this.value = numbers.substring(0, 10);
                    formatPhoneNumberNew(this);
                } else if (numbers.length > 0) {
                    this.value = numbers;
                    formatPhoneNumberNew(this);
                }
            });
            
            // Handle keypress to allow only numbers
            field.addEventListener('keypress', function(e) {
                // Allow only numbers, backspace, delete, tab, escape, enter
                if (!/[0-9]/.test(e.key) && 
                    !['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) {
                    e.preventDefault();
                }
            });
        }
    });
}

// Add form validation listeners
function addFormValidationListeners() {
    const form = document.getElementById('checkoutForm');
    if (!form) return;
    
    const inputs = form.querySelectorAll('input[required], textarea[required]');
    
    inputs.forEach(input => {
        input.addEventListener('blur', validateInput);
        input.addEventListener('input', clearValidationError);
    });
}

// Mobile: toggle order items list
function initMobileOrderToggle() {
    const toggleBtn = document.getElementById('orderToggleBtn');
    const toggleText = document.getElementById('orderToggleText');
    const summary = document.getElementById('orderSummary');
    if (!toggleBtn || !summary || !toggleText) return;

    // Start collapsed on mobile for longer lists
    if (window.matchMedia && window.matchMedia('(max-width: 768px)').matches) {
        try {
            const itemCount = (orderData && orderData.items) ? orderData.items.length : 0;
            if (itemCount > 2) {
                summary.classList.add('is-collapsed');
                toggleText.textContent = 'View items';
            }
        } catch (_) {
            // no-op
        }
    }

    toggleBtn.addEventListener('click', () => {
        const collapsed = summary.classList.toggle('is-collapsed');
        toggleText.textContent = collapsed ? 'View items' : 'Hide items';
    });
}

// Validate individual input
function validateInput(event) {
    const input = event.target;
    const value = input.value.trim();
    
    // Remove existing validation classes
    input.classList.remove('valid', 'invalid');
    
    if (input.hasAttribute('required') && !value) {
        input.classList.add('invalid');
        return false;
    }
    
    // Specific validation rules
    if (input.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            input.classList.add('invalid');
            return false;
        }
    }
    
    if (input.type === 'tel' && value) {
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(value.replace(/[^0-9]/g, ''))) {
            input.classList.add('invalid');
            return false;
        }
    }
    
    input.classList.add('valid');
    return true;
}

// Clear validation error on input
function clearValidationError(event) {
    const input = event.target;
    input.classList.remove('invalid');
}

// Apply promo code
function applyPromoCode() {
    const promoCodeInput = document.getElementById('promoCode');
    const promoCode = promoCodeInput.value.trim().toUpperCase();
    
    if (!promoCode) {
        alert('Please enter a promo code');
        return;
    }
    
    // Mock promo codes for demonstration
    const promoCodes = {
        'WELCOME10': { type: 'percentage', value: 10, description: '10% off your order' },
        'SAVE50': { type: 'fixed', value: 50, description: '₹50 off your order' },
        'FIRST20': { type: 'percentage', value: 20, description: '20% off for first-time customers' }
    };
    
    const discount = promoCodes[promoCode];
    
    if (discount) {
        let discountAmount = 0;
        
        if (discount.type === 'percentage') {
            discountAmount = Math.round((orderData.totals.subtotal * discount.value) / 100);
        } else if (discount.type === 'fixed') {
            discountAmount = discount.value;
        }
        
        // Ensure discount doesn't exceed subtotal
        discountAmount = Math.min(discountAmount, orderData.totals.subtotal);
        
        // Apply discount
        orderData.discount = {
            code: promoCode,
            amount: discountAmount,
            description: discount.description
        };
        
        // Update totals
        calculateTotals();
        updateOrderSummary();
        
        // Show discount in totals
        const discountRow = document.getElementById('discountRow');
        const discountAmountElement = document.getElementById('discountAmount');
        
        if (discountRow && discountAmountElement) {
            discountRow.style.display = 'flex';
            discountAmountElement.textContent = `-₹${discountAmount}`;
        }
        
        // Disable promo code input
        promoCodeInput.disabled = true;
        promoCodeInput.value = `${promoCode} - Applied`;
        
        alert(`Promo code applied! ${discount.description}`);
    } else {
        alert('Invalid promo code. Please try again.');
    }
}

// Validate form data
function validateForm() {
    const form = document.getElementById('checkoutForm');
    const formData = new FormData(form);
    
    const requiredFields = [
        { name: 'customerName', label: 'Full Name' },
        { name: 'customerEmail', label: 'Email Address' },
        { name: 'customerPhone', label: 'Phone Number' },
        { name: 'customerAddress', label: 'Street Address' },
        { name: 'customerCity', label: 'City' },
        { name: 'customerState', label: 'State' }
    ];
    
    let isValid = true;
    let firstErrorField = null;
    
    // Check required fields
    for (let field of requiredFields) {
        const value = formData.get(field.name);
        const input = document.getElementById(field.name);
        
        if (!value || value.trim() === '') {
            input.classList.add('invalid');
            if (!firstErrorField) firstErrorField = input;
            isValid = false;
        } else {
            input.classList.remove('invalid');
            input.classList.add('valid');
        }
    }
    
    // Email validation
    const email = formData.get('customerEmail');
    const emailInput = document.getElementById('customerEmail');
    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            emailInput.classList.add('invalid');
            if (!firstErrorField) firstErrorField = emailInput;
            isValid = false;
            if (isValid) alert('Please enter a valid email address');
        }
    }
    
    // Phone validation (updated for new 10-digit format)
    const phone = formData.get('customerPhone');
    const phoneInput = document.getElementById('customerPhone');
    const phoneContainer = phoneInput ? phoneInput.closest('.phone-input-container') : null;
    
    if (phone) {
        // Check if phone is exactly 10 digits
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(phone.trim())) {
            phoneInput.classList.add('invalid');
            if (phoneContainer) phoneContainer.classList.add('invalid');
            if (!firstErrorField) firstErrorField = phoneInput;
            isValid = false;
            if (isValid) alert('Please enter a valid 10-digit phone number');
        } else {
            phoneInput.classList.remove('invalid');
            phoneInput.classList.add('valid');
            if (phoneContainer) {
                phoneContainer.classList.remove('invalid');
                phoneContainer.classList.add('valid');
            }
        }
    }

    // Alternate phone validation (optional field, but if filled should be valid)
    const alternatePhone = formData.get('alternatePhone');
    const alternatePhoneInput = document.getElementById('alternatePhone');
    const alternatePhoneContainer = alternatePhoneInput ? alternatePhoneInput.closest('.phone-input-container') : null;
    
    if (alternatePhone && alternatePhone.trim() !== '') {
        // Check if alternate phone is exactly 10 digits
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(alternatePhone.trim())) {
            alternatePhoneInput.classList.add('invalid');
            if (alternatePhoneContainer) alternatePhoneContainer.classList.add('invalid');
            if (!firstErrorField) firstErrorField = alternatePhoneInput;
            isValid = false;
            if (isValid) alert('Please enter a valid 10-digit alternate phone number');
        } else {
            alternatePhoneInput.classList.remove('invalid');
            alternatePhoneInput.classList.add('valid');
            if (alternatePhoneContainer) {
                alternatePhoneContainer.classList.remove('invalid');
                alternatePhoneContainer.classList.add('valid');
            }
        }
    } else if (alternatePhone && alternatePhone.trim() === '') {
        // Clear validation classes for empty alternate phone (it's optional)
        alternatePhoneInput.classList.remove('invalid', 'valid');
        if (alternatePhoneContainer) alternatePhoneContainer.classList.remove('invalid', 'valid');
    }
    
    // Pincode validation
    const pincode = formData.get('customerPincode');
    if (pincode && !/^\d{6}$/.test(pincode.trim())) {
        const pincodeInput = document.getElementById('customerPincode');
        pincodeInput.classList.add('invalid');
        if (!firstErrorField) firstErrorField = pincodeInput;
        isValid = false;
        if (isValid) alert('Please enter a valid 6-digit pincode');
    }
    
    // Scroll to first error field
    if (!isValid && firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstErrorField.focus();
        
        // Show a comprehensive error message
        const errorMessages = [];
        if (document.getElementById('customerName').classList.contains('invalid')) {
            errorMessages.push('• Full name is required');
        }
        if (document.getElementById('customerEmail').classList.contains('invalid')) {
            errorMessages.push('• Valid email address is required');
        }
        if (document.getElementById('customerPhone').classList.contains('invalid')) {
            errorMessages.push('• Valid 10-digit phone number is required');
        }
        if (document.getElementById('alternatePhone') && document.getElementById('alternatePhone').classList.contains('invalid')) {
            errorMessages.push('• Valid 10-digit alternate phone number is required');
        }
        if (document.getElementById('customerAddress').classList.contains('invalid')) {
            errorMessages.push('• Street address is required');
        }
        if (document.getElementById('customerCity').classList.contains('invalid')) {
            errorMessages.push('• City is required');
        }
        if (document.getElementById('customerState').classList.contains('invalid')) {
            errorMessages.push('• State is required');
        }
        if (document.getElementById('customerPincode').classList.contains('invalid')) {
            errorMessages.push('• Valid 6-digit pincode is required');
        }
        
        if (errorMessages.length > 0) {
            alert('Please fix the following errors:\n\n' + errorMessages.join('\n'));
        }
    }
    
    return isValid;
}

// Prepare order data for submission
function prepareOrderData() {
    const form = document.getElementById('checkoutForm');
    const formData = new FormData(form);
    const user = getCurrentUser();
    
    // Get customer information
    const street = formData.get('customerAddress');
    const city = formData.get('customerCity');
    const state = formData.get('customerState');
    const landmark = formData.get('customerLandmark');
    const pincode = formData.get('customerPincode');
    
    // Combine address fields
    let fullAddress = street;
    if (city) fullAddress += `, ${city}`;
    if (state) fullAddress += `, ${state}`;
    if (landmark) fullAddress += ` (Near ${landmark})`;
    if (pincode) fullAddress += ` - ${pincode}`;
    
    orderData.customer = {
        userId: user ? user.id : null,
        isGuest: !user, // Add guest indicator
        name: formData.get('customerName'),
        email: formData.get('customerEmail'),
        phone: '+91 ' + formData.get('customerPhone'), // Add +91 prefix for storage
        alternatePhone: formData.get('alternatePhone') ? '+91 ' + formData.get('alternatePhone') : '',
        address: fullAddress,
        addressDetails: {
            street: street,
            city: city,
            state: state,
            landmark: landmark || '',
            pincode: pincode
        },
        specialInstructions: formData.get('specialInstructions') || ''
    };
    
    // Add order metadata
    orderData.orderNumber = generateOrderNumber(formData.get('customerPhone'));
    orderData.orderDate = new Date().toISOString();
    orderData.status = 'pending';
    orderData.customerType = user ? 'registered' : 'guest';
    
    return orderData;
}

// Generate unique order number in yearmonthdatetimeseconds+phone format
function generateOrderNumber(customerPhone = '') {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    // Extract last 4 digits of phone number, default to random if not available
    let phoneLastFour = '0000';
    if (customerPhone) {
        // Remove all non-digit characters
        const digitsOnly = customerPhone.replace(/\D/g, '');
        if (digitsOnly.length >= 4) {
            phoneLastFour = digitsOnly.slice(-4);
        } else if (digitsOnly.length > 0) {
            // Pad with zeros if less than 4 digits
            phoneLastFour = digitsOnly.padStart(4, '0');
        }
    } else {
        // Generate random 4 digits if no phone number
        phoneLastFour = Math.floor(1000 + Math.random() * 9000).toString();
    }
    
    return `JB${year}${month}${date}${hours}${minutes}${seconds}${phoneLastFour}`;
}

// Convert order data to email format for backend processing
function formatOrderForEmail(orderData) {
    let emailContent = `
NEW ORDER RECEIVED - ${orderData.orderNumber}
============================================

CUSTOMER INFORMATION:
- Name: ${orderData.customer?.name || 'Guest Customer'}
- Email: ${orderData.customer?.email || 'No email provided'}
- Phone: ${orderData.customer?.phone || 'No phone provided'}
- Address: ${orderData.customer?.address || 'No address provided'}
- Customer Type: ${orderData.customerType || 'guest'}
- Delivery Method: ${orderData.deliveryMethod === 'express' ? 'Express (2-3 days)' : 'Standard (5-7 days)'}
- Special Instructions: ${orderData.customer?.specialInstructions || 'None'}

ORDER DETAILS:
`;

    orderData.items.forEach((item, index) => {
        emailContent += `
ITEM ${index + 1}:
- Frame Size: ${item.frameSize.size} ${item.frameSize.orientation}
- Frame Color: ${item.frameColor}
- Frame Texture: ${item.frameTexture}
- White Border: ${item.whiteBorder ? 'Yes' : 'No'}
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

// Submit order to backend with robust error handling
async function submitOrder(orderData) {
    try {
        console.log('🔄 Starting order submission process...');
        console.log('🔍 Debug - Submit order data:', {
            hasCustomer: !!orderData.customer,
            customerName: orderData.customer?.name,
            customerEmail: orderData.customer?.email,
            hasItems: !!orderData.items && orderData.items.length > 0,
            totalAmount: orderData.totals?.total
        });

        // First, upload images to Cloudinary using enhanced method (direct + fallback)
        console.log('🖼️ Uploading images to Cloudinary with enhanced method...');
        const cloudinaryImages = await uploadOrderImagesToCloudinaryEnhanced(orderData);
        
        if (!cloudinaryImages) {
            console.warn('⚠️ Cloudinary upload failed or was not available. Proceeding with Firebase-only storage.');
        } else {
            console.log('✅ Images uploaded to Cloudinary successfully:', cloudinaryImages);
        }
        
        // Wait a bit more for Firebase to initialize
        let retryCount = 0;
        const maxRetries = 3;
        
        while (retryCount < maxRetries) {
            // Check if Firebase client is available
            if (window.jbApi || window.jbAPI || (typeof JBCreationsAPI !== 'undefined' && window.JBCreationsAPI)) {
                console.log('🔥 Firebase client found, attempting order submission...');
                
                // Ensure we have the API instance
                if (!window.jbApi) {
                    window.jbApi = window.jbAPI || new window.JBCreationsAPI();
                }
                
                try {
                    // Prepare Firebase-compatible order data with Cloudinary URLs (excluding base64 data)
                    let firebaseOrderData = {
                        customer: {
                            name: orderData.customer?.name || 'Guest Customer',
                            email: orderData.customer?.email || 'guest@example.com',
                            phone: orderData.customer?.phone || '0000000000',
                            address: orderData.customer?.address || 'No address provided'
                        },
                        // Clean items data - exclude large base64 images, keep only essential data
                        items: orderData.items.map((item, index) => {
                            // Get the cart thumbnail (the image user saw in cart)
                            // This is prioritized over Cloudinary URLs so it persists even after Cloudinary cleanup
                            let cartThumbnail = null;
                            
                            // First try the thumbnail from cart (already compressed, what user saw)
                            if (item.thumbnailImage) {
                                // Only include if it's reasonably small (under 100KB)
                                if (item.thumbnailImage.length < 100000) {
                                    cartThumbnail = item.thumbnailImage;
                                    console.log(`📸 Item ${index}: Using cart thumbnail (${Math.round(item.thumbnailImage.length / 1024)}KB)`);
                                } else {
                                    console.log(`📸 Item ${index}: Cart thumbnail too large (${Math.round(item.thumbnailImage.length / 1024)}KB), skipping`);
                                }
                            }
                            
                            // If no cart thumbnail, try to get from sessionStorage
                            if (!cartThumbnail) {
                                const storedImage = sessionStorage.getItem(`cartImage_${item.id}`);
                                if (storedImage && storedImage.length < 100000) {
                                    cartThumbnail = storedImage;
                                    console.log(`📸 Item ${index}: Using sessionStorage thumbnail (${Math.round(storedImage.length / 1024)}KB)`);
                                }
                            }
                            
                            return {
                                id: item.id,
                                frameSize: item.frameSize,
                                frameColor: item.frameColor,
                                frameTexture: item.frameTexture,
                                whiteBorder: item.whiteBorder || false,
                                price: item.price,
                                quantity: item.quantity || 1,
                                // Only include small metadata, no base64 images
                                hasImage: !!(item.originalImage || item.printImage || item.displayImage),
                                imageIndex: index,
                                // Cloudinary URL for admin/printing (may be deleted after delivery)
                                cloudinaryUrl: cloudinaryImages && cloudinaryImages[index] && cloudinaryImages[index].urls 
                                    ? cloudinaryImages[index].urls.original 
                                    : null,
                                // Cart thumbnail for order history display (permanent, stored in Firebase)
                                cartThumbnail: cartThumbnail
                            };
                        }),
                        // Include Cloudinary upload results for processing
                        cloudinaryImages: cloudinaryImages,
                        // Legacy images array for backward compatibility - only URLs, no base64
                        images: cloudinaryImages ? cloudinaryImages.map((result, index) => {
                            if (result.urls) {
                                return {
                                    original: result.urls.original,
                                    print: result.urls.print,
                                    display: result.urls.display,
                                    publicId: result.urls.publicId
                                };
                            }
                            // If Cloudinary failed but we have fallback image, include it for admin viewing
                            return {
                                original: null,
                                print: null,
                                display: null,
                                error: 'Cloudinary upload failed',
                                fallbackImage: result.fallbackImage || null // Include compressed image for admin
                            };
                        }) : [],
                        frameSize: orderData.items[0]?.frameSize?.size || 'Standard',
                        frameType: orderData.items[0]?.frameColor || 'Wood',
                        quantity: orderData.items.length || 1,
                        specialInstructions: orderData.items.map(item => 
                            `Frame: ${item.frameSize?.size || 'Standard'} ${item.frameColor || 'Wood'} ${item.frameTexture || 'Standard'}`
                        ).join('; '),
                        totalAmount: orderData.totals.total,
                        deliveryMethod: orderData.deliveryMethod,
                        paymentId: orderData.paymentId,
                        orderNumber: orderData.orderNumber,
                        // Add flag to indicate whether we're using Cloudinary
                        usingCloudinary: !!cloudinaryImages && cloudinaryImages.some(img => img.urls !== null)
                    };

                    console.log('📤 Submitting to Firebase with data:', {
                        customerName: firebaseOrderData.customer.name,
                        itemCount: firebaseOrderData.items.length,
                        cloudinaryImages: firebaseOrderData.cloudinaryImages?.length || 0,
                        successfulUploads: firebaseOrderData.cloudinaryImages?.filter(img => img.urls !== null)?.length || 0,
                        totalAmount: firebaseOrderData.totalAmount,
                        usingCloudinary: firebaseOrderData.usingCloudinary,
                        firstImageUrl: firebaseOrderData.cloudinaryImages?.[0]?.urls?.original || 'none'
                    });
                    
                    // Debug: Log the complete Cloudinary images array
                    if (firebaseOrderData.cloudinaryImages && firebaseOrderData.cloudinaryImages.length > 0) {
                        console.log('🌥️ Complete Cloudinary images being sent to Firebase:');
                        firebaseOrderData.cloudinaryImages.forEach((img, index) => {
                            console.log(`   Image ${index + 1}:`, {
                                itemIndex: img.itemIndex,
                                hasUrls: !!img.urls,
                                originalUrl: img.urls?.original || 'null',
                                error: img.error || 'none'
                            });
                        });
                    } else {
                        console.log('❌ No Cloudinary images array being sent to Firebase');
                    }
                    
                    // Debug: Log the complete structure being sent to Firebase (without base64 data)
                    const debugOrder = {
                        ...firebaseOrderData,
                        // Exclude potentially large data from debug logs
                        items: firebaseOrderData.items.map(item => ({
                            ...item,
                            // Remove any remaining image data from debug
                            hasImage: item.hasImage,
                            cloudinaryUrl: item.cloudinaryUrl ? 'Present' : 'None'
                        }))
                    };
                    console.log('📋 Complete Firebase order structure (sanitized for debug):', JSON.stringify(debugOrder, null, 2));

                    // CRITICAL: Clean undefined values - Firebase doesn't accept undefined
                    function removeUndefinedValues(obj) {
                        if (obj === null) return null;
                        if (obj === undefined) return null;
                        if (typeof obj !== 'object') return obj;
                        
                        if (Array.isArray(obj)) {
                            return obj.map(item => removeUndefinedValues(item)).filter(item => item !== undefined && item !== null);
                        }
                        
                        const cleaned = {};
                        for (const key in obj) {
                            if (obj.hasOwnProperty(key) && obj[key] !== undefined && obj[key] !== null) {
                                const cleanedValue = removeUndefinedValues(obj[key]);
                                if (cleanedValue !== undefined && cleanedValue !== null) {
                                    cleaned[key] = cleanedValue;
                                }
                            }
                        }
                        return cleaned;
                    }
                    
                    // Clean the Firebase order data
                    firebaseOrderData = removeUndefinedValues(firebaseOrderData);
                    console.log('🧹 Cleaned undefined values from Firebase order data');

                    // Additional comprehensive cleaning pass
                    const cleanedDataString = JSON.stringify(firebaseOrderData, (key, value) => {
                        if (value === undefined || value === null) {
                            return null; // Convert undefined to null for JSON
                        }
                        return value;
                    });
                    firebaseOrderData = JSON.parse(cleanedDataString);
                    console.log('🧹 Additional cleaning pass completed');

                    // CRITICAL: Double-check that we're not sending base64 data
                    const hasBase64 = JSON.stringify(firebaseOrderData).includes('data:image');
                    if (hasBase64) {
                        console.error('🚨 CRITICAL: Base64 data detected in Firebase order data! Cleaning now...');
                        
                        // Emergency clean - remove all base64 data
                        firebaseOrderData.items = firebaseOrderData.items.map(item => {
                            const cleanItem = { ...item };
                            // Remove all image-related base64 data
                            delete cleanItem.originalImage;
                            delete cleanItem.printImage;
                            delete cleanItem.displayImage;
                            delete cleanItem.previewImage;
                            delete cleanItem.originalImagePath;
                            delete cleanItem.printImagePath;
                            delete cleanItem.displayImagePath;
                            delete cleanItem.previewImagePath;
                            return cleanItem;
                        });
                        
                        // Clean the images array - preserve small compressed fallbacks, remove large data
                        if (firebaseOrderData.images) {
                            firebaseOrderData.images = firebaseOrderData.images.map(img => {
                                const cleanImg = {
                                    itemIndex: img.itemIndex,
                                    urls: img.urls && !JSON.stringify(img.urls).includes('data:') ? img.urls : null,
                                    error: img.error,
                                    publicId: img.publicId
                                };
                                
                                // Keep admin-quality images (< 800KB), remove large ones
                                if (img.fallbackImage && img.fallbackImage.startsWith('data:image')) {
                                    const estimatedSize = img.fallbackImage.length * 0.75; // Base64 to binary ratio
                                    if (estimatedSize < 800000) { // 800KB limit for high-quality admin display
                                        cleanImg.fallbackImage = img.fallbackImage;
                                        console.log(`📸 Preserving high-quality admin image (${Math.round(estimatedSize/1000)}KB) for admin panel`);
                                    } else {
                                        console.log(`🗑️ Removing large admin image (${Math.round(estimatedSize/1000)}KB) to prevent Firebase limit`);
                                    }
                                }
                                
                                return cleanImg;
                            });
                        }
                        
                        console.log('✅ Emergency cleaning completed');
                    }

                    // ULTIMATE CLEANING: Convert to JSON and back to eliminate ALL undefined values
                    console.log('🔧 Final ultimate cleaning to eliminate any remaining undefined values...');
                    const jsonString = JSON.stringify(firebaseOrderData, (key, value) => {
                        // Replace undefined with null, remove functions and symbols
                        if (value === undefined) return null;
                        if (typeof value === 'function') return null;
                        if (typeof value === 'symbol') return null;
                        return value;
                    });
                    
                    firebaseOrderData = JSON.parse(jsonString);
                    
                    // Remove any null values that might cause issues
                    function removeNullValues(obj) {
                        if (obj === null || obj === undefined) return null;
                        if (typeof obj !== 'object') return obj;
                        if (Array.isArray(obj)) {
                            return obj.map(removeNullValues).filter(item => item !== null && item !== undefined);
                        }
                        
                        const cleaned = {};
                        for (const key in obj) {
                            if (obj.hasOwnProperty(key) && obj[key] !== null && obj[key] !== undefined) {
                                const cleanedValue = removeNullValues(obj[key]);
                                if (cleanedValue !== null && cleanedValue !== undefined) {
                                    cleaned[key] = cleanedValue;
                                }
                            }
                        }
                        return Object.keys(cleaned).length > 0 ? cleaned : null;
                    }
                    
                    firebaseOrderData = removeNullValues(firebaseOrderData);
                    console.log('✅ Ultimate cleaning completed - all undefined values eliminated');

                    // Submit to Firebase
                    const result = await window.jbApi.createOrder(firebaseOrderData);
                    
                    if (result.success) {
                        console.log('✅ Order submitted successfully to Firebase');
                        return { success: true, orderId: result.orderId, method: 'firebase' };
                    } else {
                        console.error('❌ Firebase order submission failed:', result.error);
                        // Try fallback instead of failing immediately
                        break;
                    }
                } catch (firebaseError) {
                    console.error('❌ Firebase error:', firebaseError);
                    console.log('📋 Firebase error details:', firebaseError.message);
                    
                    // Check if it's a permission error (Firestore rules not set)
                    if (firebaseError.message && firebaseError.message.includes('permission') || 
                        firebaseError.message.includes('security rules') ||
                        firebaseError.message.includes('PERMISSION_DENIED')) {
                        
                        // Show user-friendly message about Firestore rules
                        console.warn('⚠️ Firebase permission denied - Firestore rules need to be configured');
                        return {
                            success: false,
                            error: 'Firebase database rules not configured yet. Please set up Firestore security rules.',
                            needsFirestoreSetup: true
                        };
                    }
                    
                    // Try fallback for other errors
                    break;
                }
            }
            
            console.log(`⏳ Firebase not ready, waiting... (attempt ${retryCount + 1}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            retryCount++;
        }
        
        // Fallback: Store locally and simulate success (without large image data)
        console.log('💾 Using local storage fallback...');
        const orders = JSON.parse(localStorage.getItem('jb_orders') || '[]');
        
        // Create lightweight order data without Base64 images
        const lightweightOrderData = {
            id: Date.now().toString(),
            orderNumber: orderData.orderNumber,
            customerName: orderData.customer?.name || 'Guest',
            customerEmail: orderData.customer?.email || '',
            customerPhone: orderData.customer?.phone || '',
            totalAmount: orderData.totals?.total || 0,
            itemCount: orderData.items?.length || 0,
            status: 'pending',
            createdAt: new Date().toISOString(),
            method: 'localStorage',
            note: 'Images stored locally - will sync to server once database is available'
        };
        
        orders.push(lightweightOrderData);
        
        try {
            localStorage.setItem('jb_orders', JSON.stringify(orders));
            console.log('✅ Order saved locally successfully (without images)');
        } catch (storageError) {
            console.warn('⚠️ LocalStorage quota exceeded, saving minimal data');
            // Keep only last 5 orders if storage is full
            const trimmedOrders = orders.slice(-5);
            localStorage.setItem('jb_orders', JSON.stringify(trimmedOrders));
        }
        
        return { 
            success: true, 
            orderId: lightweightOrderData.id, 
            method: 'localStorage',
            message: 'Order saved locally. Images and full details will be processed once server is available.'
        };
        
    } catch (error) {
        console.error('❌ Critical error submitting order:', error);
        return { 
            success: false, 
            error: `Order submission failed: ${error.message}`,
            critical: true
        };
    }
}

// Show success animation in processing overlay
function showOrderSuccessAnimation() {
    const processingState = document.getElementById('processingState');
    const successState = document.getElementById('successState');
    
    if (processingState && successState) {
        // Hide processing state, show success state
        processingState.style.display = 'none';
        successState.style.display = 'block';
        
        console.log('✅ Showing order success animation');
    }
}

// Reset processing overlay to initial state
function resetProcessingOverlay() {
    const processingState = document.getElementById('processingState');
    const successState = document.getElementById('successState');
    
    if (processingState && successState) {
        processingState.style.display = 'block';
        successState.style.display = 'none';
    }
    
    document.getElementById('processingOverlay').style.display = 'none';
}

// Main order placement function
async function placeOrder() {
    // Validate form
    if (!validateForm()) {
        return;
    }

    // Get user info (can be null for guest checkout)
    const user = getCurrentUser();
    
    // Show processing overlay
    document.getElementById('processingOverlay').style.display = 'flex';
    document.getElementById('placeOrderBtn').disabled = true;
    const mobileBtn = document.getElementById('mobilePlaceOrderBtn');
    if (mobileBtn) mobileBtn.disabled = true;

    try {
        // Prepare order data (includes guest customer information)
        const orderData = prepareOrderData();
        
        console.log('🔍 Debug - Order data prepared:', {
            hasCustomer: !!orderData.customer,
            customerName: orderData.customer?.name,
            customerEmail: orderData.customer?.email,
            customerType: orderData.customerType
        });
        
        // Calculate total amount for Razorpay
        const totalAmount = orderData.totals.total;
        
        // Hide processing overlay before showing Razorpay
    resetProcessingOverlay();
    document.getElementById('placeOrderBtn').disabled = false;
    if (mobileBtn) mobileBtn.disabled = false;

        // Simple direct payment (works for both guests and logged-in users)
        const paymentResult = await processSimplePayment(totalAmount, orderData, user);
        
        if (paymentResult.success) {
            // Show processing overlay during order submission
            document.getElementById('processingOverlay').style.display = 'flex';
            document.getElementById('placeOrderBtn').disabled = true;
            if (mobileBtn) mobileBtn.disabled = true;
            
            // Payment successful - now submit the order
            const result = await submitOrder({...orderData, paymentId: paymentResult.paymentId});
            
            if (result.success) {
                // Clear cart and temporary image storage ONLY after successful Firebase submission
                const cartData = sessionStorage.getItem('photoFramingCart');
                if (cartData) {
                    try {
                        const cartItems = JSON.parse(cartData);
                        // Clear individual image storage for each cart item
                        cartItems.forEach(item => {
                            if (item.id) {
                                sessionStorage.removeItem(`cartImage_${item.id}`);
                                sessionStorage.removeItem(`cartImage_full_${item.id}`);
                                console.log(`🧹 Cleared image storage for item ${item.id}`);
                            }
                        });
                    } catch (e) {
                        console.warn('⚠️ Error parsing cart data during cleanup:', e);
                    }
                }
                
                sessionStorage.removeItem('photoFramingCart');
                localStorage.removeItem('photoFramingCart'); // Remove from both in case of migration
                
                // Clear temporary image storage
                if (window.cartImageStorage) {
                    window.cartImageStorage = {};
                    console.log('🧹 Cleared temporary window image storage');
                }
                
                // Show success message based on storage method - only for actual Firebase success
                let successMessage = `Payment Successful! Order placed successfully!\n\nOrder Number: ${orderData.orderNumber}\nPayment ID: ${paymentResult.paymentId}`;
                
                if (result.method === 'firebase') {
                    successMessage += '\n\nOrder saved to secure cloud database and will be visible in admin panel.';
                    
                    // Store order details for confirmation page
                    sessionStorage.setItem('lastOrderNumber', orderData.orderNumber);
                    sessionStorage.setItem('lastCustomerName', orderData.customer?.name || 'Valued Customer');
                    sessionStorage.setItem('lastCustomerEmail', orderData.customer?.email || '');
                    sessionStorage.setItem('lastOrderAmount', orderData.totals?.total || '299');
                    
                    // Show success animation before redirecting
                    showOrderSuccessAnimation();
                    
                    // Delay redirect to show success animation
                    setTimeout(() => {
                        // Redirect to success page ONLY for Firebase success
                        if (user) {
                            // For logged-in users
                            window.location.href = `order-success.html?order=${orderData.orderNumber}&name=${encodeURIComponent(orderData.customer?.name || 'Customer')}&email=${encodeURIComponent(orderData.customer?.email || '')}&amount=${orderData.totals?.total || 299}&guest=false`;
                        } else {
                            // For guest users
                            window.location.href = `order-success.html?order=${orderData.orderNumber}&name=${encodeURIComponent(orderData.customer?.name || 'Guest Customer')}&email=${encodeURIComponent(orderData.customer?.email || '')}&amount=${orderData.totals?.total || 299}&guest=true`;
                        }
                    }, 2000); // 2 second delay to show success animation
                } else {
                    // For localStorage fallback, show error instead of success
                    console.error('❌ Order not saved to Firebase - showing error message instead of success');
                    
                    // Hide processing overlay
                    resetProcessingOverlay();
                    document.getElementById('placeOrderBtn').disabled = false;
                    if (mobileBtn) mobileBtn.disabled = false;
                    
                    alert('❌ Order Creation Failed!\n\nYour payment was successful, but there was an error creating the order in our system.\n\nPlease contact support with your payment details:\nPayment ID: ' + paymentResult.paymentId + '\nOrder Number: ' + orderData.orderNumber);
                    return;
                }
            } else {
                // Handle specific error types
                if (result.needsFirestoreSetup) {
                    alert(`Payment Successful! However, there's a database configuration issue.\n\nPayment ID: ${paymentResult.paymentId}\n\nYour payment was processed successfully, but the order database needs to be set up. Please contact support with your payment ID to complete your order.\n\nNext steps:\n1. Save this Payment ID: ${paymentResult.paymentId}\n2. The website owner needs to configure Firestore database rules\n3. Contact support to ensure your order is processed`);
                } else if (result.critical) {
                    alert(`Critical error occurred!\n\nPayment ID: ${paymentResult.paymentId}\n\nYour payment was successful, but there was an issue saving your order. Please contact support immediately with this payment ID.\n\nError: ${result.error}`);
                } else {
                    alert(`Order processing error!\n\nPayment ID: ${paymentResult.paymentId}\n\nYour payment was processed, but there was an issue with order submission. Please contact support.\n\nError: ${result.error}`);
                }
                
                // Don't redirect on error - let user contact support
                // Hide processing overlay
                resetProcessingOverlay();
                document.getElementById('placeOrderBtn').disabled = false;
                if (mobileBtn) mobileBtn.disabled = false;
                return;
            }
        }
        
    } catch (error) {
        console.error('Order placement error:', error);
        
        // Show appropriate error message
        if (error.message && error.message.includes('Razorpay')) {
            alert('Payment system error: ' + error.message);
        } else if (error.message && error.message.includes('Payment cancelled')) {
            alert('Payment was cancelled. Your order was not placed.');
        } else {
            alert('Sorry, there was an error processing your payment. Please try again or contact us directly.');
        }
        
        // Hide processing overlay
        resetProcessingOverlay();
        document.getElementById('placeOrderBtn').disabled = false;
        if (mobileBtn) mobileBtn.disabled = false;
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
    // First check OTP authentication system (newer) - jb_current_user is the primary storage
    const currentUserData = localStorage.getItem('jb_current_user');
    if (currentUserData) {
        try {
            const userData = JSON.parse(currentUserData);
            // Handle both direct user object and session wrapper
            const user = userData.user || userData;
            if (user && user.phone) {
                console.log('📱 Checkout: Found user from jb_current_user:', user.name, user.phone);
                return user;
            }
        } catch (error) {
            console.error('Error parsing jb_current_user:', error);
        }
    }
    
    // Check window.otpAuthUtils
    if (window.otpAuthUtils && typeof window.otpAuthUtils.getCurrentUser === 'function') {
        const otpUser = window.otpAuthUtils.getCurrentUser();
        if (otpUser) {
            console.log('📱 Checkout: Found user from otpAuthUtils:', otpUser.name);
            return otpUser;
        }
    }
    
    // Check window.otpAuth
    if (window.otpAuth && typeof window.otpAuth.getCurrentUser === 'function') {
        const otpUser = window.otpAuth.getCurrentUser();
        if (otpUser) {
            console.log('📱 Checkout: Found user from otpAuth:', otpUser.name);
            return otpUser;
        }
    }
    
    // Fallback to legacy authentication system
    const storedUser = localStorage.getItem('jb_user') || sessionStorage.getItem('jb_user');
    if (storedUser) {
        try {
            return JSON.parse(storedUser);
        } catch (error) {
            console.error('Error parsing user data:', error);
            return null;
        }
    }
    
    console.log('📱 Checkout: No user found');
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
            customerEmail: orderData.customer?.email || 'guest@example.com',
            customerName: orderData.customer?.name || 'Guest Customer'
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

/**
 * Upload all images in an order to Cloudinary
 * @param {Object} orderData - The order data containing items with images
 * @returns {Promise<Array>} - Array of objects with Cloudinary URLs for each item
 */
async function uploadOrderImagesToCloudinary(orderData) {
    try {
        console.log('🖼️ Starting image uploads to Cloudinary...');
        
        // Generate order number in yearmonthdatetimeseconds+phone format
        const generateOrderNumber = (customerPhone = '') => {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const date = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            
            // Extract last 4 digits of phone number, default to random if not available
            let phoneLastFour = '0000';
            if (customerPhone) {
                // Remove all non-digit characters
                const digitsOnly = customerPhone.replace(/\D/g, '');
                if (digitsOnly.length >= 4) {
                    phoneLastFour = digitsOnly.slice(-4);
                } else if (digitsOnly.length > 0) {
                    // Pad with zeros if less than 4 digits
                    phoneLastFour = digitsOnly.padStart(4, '0');
                }
            } else {
                // Generate random 4 digits if no phone number
                phoneLastFour = Math.floor(1000 + Math.random() * 9000).toString();
            }
            
            return `JB${year}${month}${date}${hours}${minutes}${seconds}${phoneLastFour}`;
        };
        
        const orderNumber = orderData.orderNumber || generateOrderNumber(orderData.customer?.phone);
        const cloudinaryImages = [];
        
        // For each item in the order, upload its images to Cloudinary
        for (let i = 0; i < orderData.items.length; i++) {
            const item = orderData.items[i];
            
            // Debug temporary storage
            console.log(`🔍 Checking image storage for item ${item.id}:`, {
                sessionStorageKey: `cartImage_${item.id}`,
                cartImageStorageExists: !!window.cartImageStorage,
                cartImageStorageKeys: window.cartImageStorage ? Object.keys(window.cartImageStorage) : 'No window storage',
                hasItemInStorage: !!(window.cartImageStorage && window.cartImageStorage[item.id])
            });
            
            let fullImageData = null;
            
            // Try to retrieve full-quality images from sessionStorage first (for upload)
            try {
                const sessionFullImageData = sessionStorage.getItem(`cartImage_full_${item.id}`);
                if (sessionFullImageData) {
                    fullImageData = JSON.parse(sessionFullImageData);
                    console.log(`🔄 Retrieved full-quality images for item ${item.id} from sessionStorage`);
                }
            } catch (sessionError) {
                console.warn(`⚠️ Failed to retrieve full images from sessionStorage for item ${item.id}:`, sessionError);
            }
            
            // Fallback to compressed images if full images not available
            if (!fullImageData) {
                try {
                    const sessionImageData = sessionStorage.getItem(`cartImage_${item.id}`);
                    if (sessionImageData) {
                        fullImageData = JSON.parse(sessionImageData);
                        console.log(`🔄 Retrieved compressed images for item ${item.id} from sessionStorage (fallback)`);
                    }
                } catch (sessionError) {
                    console.warn(`⚠️ Failed to retrieve compressed images from sessionStorage for item ${item.id}:`, sessionError);
                }
            }

            // Fallback to window storage if sessionStorage failed completely
            if (!fullImageData && window.cartImageStorage && window.cartImageStorage[item.id]) {
                fullImageData = window.cartImageStorage[item.id];
                console.log(`🔄 Retrieved images for item ${item.id} from window storage (final fallback)`);
            }
            
            // Retrieve full images from storage if available
            if (fullImageData) {
                console.log(`📸 Full image data available for item ${item.id}:`, {
                    originalImage: !!fullImageData.originalImage,
                    printImage: !!fullImageData.printImage,
                    displayImage: !!fullImageData.displayImage,
                    previewImage: !!fullImageData.previewImage,
                    originalImageSize: fullImageData.originalImage ? fullImageData.originalImage.length : 0,
                    printImageSize: fullImageData.printImage ? fullImageData.printImage.length : 0
                });
                
                // Merge full image data back into item for upload
                if (fullImageData.originalImage) item.originalImage = fullImageData.originalImage;
                if (fullImageData.printImage) item.printImage = fullImageData.printImage;
                if (fullImageData.displayImage) item.displayImage = fullImageData.displayImage;
                if (fullImageData.previewImage) item.previewImage = fullImageData.previewImage;
            }
            
            // Find the best available image to upload - prioritize printImage (processed without frame)
            let imageToUpload = item.printImage || item.displayImage || item.previewImage || item.originalImage ||
                               item.printImagePath || item.displayImagePath || item.originalImagePath ||
                               item.enhancedPrintPath;
            
            // Additional debug logging
            console.log(`🔍 Item ${i+1} image properties:`, {
                printImage: !!item.printImage,
                displayImage: !!item.displayImage,
                previewImage: !!item.previewImage,
                originalImage: !!item.originalImage,
                printImagePath: !!item.printImagePath,
                displayImagePath: !!item.displayImagePath,
                originalImagePath: !!item.originalImagePath,
                enhancedPrintPath: !!item.enhancedPrintPath,
                imageToUpload: !!imageToUpload,
                imageSize: imageToUpload ? imageToUpload.length : 0
            });
            
            if (!imageToUpload) {
                console.warn(`⚠️ No image found for item ${i+1}`);
                cloudinaryImages.push({
                    itemIndex: i,
                    urls: null
                });
                continue;
            }
            
            console.log(`🔄 Uploading image for item ${i+1}...`);
            
            try {
                // Generate unique public ID for this image
                const timestamp = Date.now();
                const publicId = `jb-creations-orders/${orderNumber}/item${i+1}_${timestamp}`;
                
                // Use fetch to upload to our backend endpoint
                const response = await fetch('http://localhost:3001/api/upload-to-cloudinary', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        image: imageToUpload,
                        publicId: publicId
                    })
                });
                
                const result = await response.json();
                
                if (result.success) {
                    console.log(`✅ Image uploaded successfully for item ${i+1}:`, result.secure_url);
                    cloudinaryImages.push({
                        itemIndex: i,
                        urls: {
                            original: result.secure_url,
                            print: result.secure_url,
                            display: result.secure_url,
                            publicId: result.public_id
                        }
                    });
                } else {
                    console.error(`❌ Failed to upload image for item ${i+1}:`, result.error);
                    cloudinaryImages.push({
                        itemIndex: i,
                        urls: null,
                        error: result.error
                    });
                }
                
            } catch (uploadError) {
                console.error(`❌ Upload error for item ${i+1}:`, uploadError);
                cloudinaryImages.push({
                    itemIndex: i,
                    urls: null,
                    error: uploadError.message
                });
            }
        }
        
        // Log upload summary
        const successfulUploads = cloudinaryImages.filter(img => img.urls !== null).length;
        console.log(`📊 Cloudinary upload summary: ${successfulUploads}/${cloudinaryImages.length} successful`);
        
        return cloudinaryImages.length > 0 ? cloudinaryImages : null;
        
    } catch (error) {
        console.error('❌ Cloudinary upload process failed:', error);
        return null;
    }
}

/**
 * Simple direct payment function (using the working approach)
 */
function processSimplePayment(amount, orderData, user) {
    return new Promise((resolve, reject) => {
        console.log('🔄 Starting simple direct payment...');
        
        // Validate Razorpay SDK
        if (typeof Razorpay === 'undefined') {
            reject(new Error('Razorpay SDK not loaded. Please refresh the page and try again.'));
            return;
        }

        // Clean phone number
        function cleanPhone(phone) {
            if (!phone) return '9999999999';
            const cleaned = phone.replace(/[\+\s\-\(\)]/g, '');
            if (cleaned.startsWith('91') && cleaned.length === 12) {
                return cleaned.substring(2);
            }
            return cleaned.length === 10 ? cleaned : '9999999999';
        }

        // Direct Razorpay options (exactly like the working test)
        const options = {
            "key": "rzp_test_1DP5mmOlF5G5ag", // Working test key
            "amount": (amount * 100).toString(), // Convert to paise
            "currency": "INR",
            "name": "JB Creations",
            "description": `Photo Frame Order - ${orderData.items.length} item(s)`,
            "handler": function (response) {
                console.log('✅ Simple payment success:', response.razorpay_payment_id);
                resolve({
                    success: true,
                    paymentId: response.razorpay_payment_id,
                    orderId: orderData.orderNumber,
                    amount: amount,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_signature: response.razorpay_signature
                });
            },
            "prefill": {
                "name": user?.name || orderData.customer?.name || 'Customer',
                "email": user?.email || orderData.customer?.email || 'customer@example.com',
                "contact": cleanPhone(user?.phone || orderData.customer?.phone || '')
            },
            "theme": {
                "color": "#16697A"
            },
            "modal": {
                "ondismiss": function(){
                    console.log('⚠️ Payment cancelled by user');
                    reject(new Error('Payment was cancelled by user'));
                }
            }
        };

        try {
            const rzp = new Razorpay(options);
            
            rzp.on('payment.failed', function (response) {
                console.error('❌ Simple payment failed:', response.error);
                reject(new Error(response.error.description || 'Payment failed'));
            });

            console.log('🔄 Opening simple payment modal...');
            rzp.open();
            console.log('✅ Simple payment modal opened');
            
        } catch (error) {
            console.error('❌ Error in simple payment:', error);
            reject(new Error('Failed to open payment modal: ' + error.message));
        }
    });
}

// OTP Verification Logic
function initializeOTPVerification() {
    const phoneInput = document.getElementById('customerPhone');
    const phoneVerifySection = document.getElementById('phoneVerifySection');
    const verifyBtn = document.getElementById('verifyPhoneBtn');
    const otpContainer = document.getElementById('otpContainer');
    const otpInput = document.getElementById('otpInput');
    const confirmBtn = document.getElementById('confirmOtpBtn');
    const otpMessage = document.getElementById('otpMessage');
    const phoneVerifiedIndicator = document.getElementById('phoneVerifiedIndicator');
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    const mobilePlaceOrderBtn = document.getElementById('mobilePlaceOrderBtn');

    if (!phoneInput || !verifyBtn) {
        console.log('⚠️ Phone verification elements not found');
        return;
    }

    // Check if user is already signed in
    const currentUser = localStorage.getItem('jb_current_user');
    const isSignedIn = !!currentUser;
    
    // Track phone verification status
    window.phoneVerified = isSignedIn;
    
    // If user is signed in, enable place order button and skip verification
    if (isSignedIn) {
        console.log('✅ User is signed in, skipping phone verification');
        enablePlaceOrderButton();
        if (phoneVerifySection) phoneVerifySection.style.display = 'none';
        if (phoneVerifiedIndicator) phoneVerifiedIndicator.style.display = 'block';
        return;
    }
    
    // User is NOT signed in - disable place order button initially
    disablePlaceOrderButton();

    // Initialize OTP Auth - use real SMS if available, otherwise demo
    let otpAuth;
    if (typeof OTPAuthRealSMS !== 'undefined') {
        otpAuth = new OTPAuthRealSMS();
        console.log('✅ Using Real SMS OTP authentication');
    } else if (typeof OTPAuth !== 'undefined') {
        otpAuth = new OTPAuth();
        console.log('ℹ️ Using Demo OTP authentication');
    } else {
        console.error('❌ No OTP auth system available');
        return;
    }

    phoneInput.addEventListener('input', function() {
        const phone = this.value.replace(/\D/g, '');
        
        if (phone.length === 10) {
            // Show verify button section
            if (phoneVerifySection) phoneVerifySection.style.display = 'block';
        } else {
            if (phoneVerifySection) phoneVerifySection.style.display = 'none';
            if (otpContainer) otpContainer.style.display = 'none';
        }
    });

    verifyBtn.addEventListener('click', async function() {
        const phone = phoneInput.value.replace(/\D/g, '');
        
        if (phone.length !== 10) {
            alert('Please enter a valid 10-digit phone number');
            return;
        }
        
        verifyBtn.disabled = true;
        verifyBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="margin-right: 8px;"></i>Sending OTP...';
        
        try {
            const result = await otpAuth.sendOTP(phone);
            if (result.success) {
                if (otpContainer) otpContainer.style.display = 'block';
                if (phoneVerifySection) phoneVerifySection.style.display = 'none';
                if (otpMessage) {
                    otpMessage.textContent = 'OTP sent to +91 ' + phone + '. Please check your phone.';
                    otpMessage.style.color = '#28a745';
                }
            } else {
                if (otpMessage) {
                    otpMessage.textContent = 'Failed to send OTP: ' + (result.error || 'Unknown error');
                    otpMessage.style.color = '#dc3545';
                }
                verifyBtn.disabled = false;
                verifyBtn.innerHTML = '<i class="fas fa-shield-alt" style="margin-right: 8px;"></i>Verify Phone Number';
            }
        } catch (error) {
            console.error('OTP send error:', error);
            if (otpMessage) {
                otpMessage.textContent = 'Error sending OTP. Please try again.';
                otpMessage.style.color = '#dc3545';
            }
            verifyBtn.disabled = false;
            verifyBtn.innerHTML = '<i class="fas fa-shield-alt" style="margin-right: 8px;"></i>Verify Phone Number';
        }
    });

    confirmBtn.addEventListener('click', async function() {
        const phone = phoneInput.value.replace(/\D/g, '');
        const otp = otpInput.value.trim();
        
        if (!otp || otp.length < 4) {
            if (otpMessage) {
                otpMessage.textContent = 'Please enter a valid OTP';
                otpMessage.style.color = '#dc3545';
            }
            return;
        }
        
        // Get name and email from form fields
        const nameInput = document.getElementById('customerName');
        const emailInput = document.getElementById('customerEmail');
        const fullName = nameInput ? nameInput.value.trim() : '';
        const email = emailInput ? emailInput.value.trim() : '';
        
        if (!fullName) {
            if (otpMessage) {
                otpMessage.textContent = 'Please enter your full name first';
                otpMessage.style.color = '#dc3545';
            }
            if (nameInput) nameInput.focus();
            return;
        }
        
        confirmBtn.disabled = true;
        confirmBtn.textContent = 'Verifying...';
        
        try {
            const result = await otpAuth.verifyOTP(phone, otp);
            if (result.success) {
                // Hide OTP container
                if (otpContainer) otpContainer.style.display = 'none';
                
                // Show verified indicator
                if (phoneVerifiedIndicator) phoneVerifiedIndicator.style.display = 'block';
                
                // Create user object with form data
                const normalizedPhone = '+91' + phone;
                const userData = {
                    id: result.user?.id || 'user_' + Date.now(),
                    phone: normalizedPhone,
                    name: fullName,
                    email: email,
                    registrationDate: new Date().toISOString(),
                    lastLogin: new Date().toISOString(),
                    loginCount: 1,
                    isVerified: true
                };
                
                // Save to Firebase
                if (window.jbAPI && window.jbAPI.createUser) {
                    try {
                        await window.jbAPI.createUser(userData);
                        console.log('✅ User saved to Firebase:', userData);
                    } catch (firebaseError) {
                        console.warn('⚠️ Could not save user to Firebase:', firebaseError);
                    }
                }
                
                // Sign in user locally
                localStorage.setItem('jb_current_user', JSON.stringify(userData));
                window.phoneVerified = true;
                
                // Update UI
                if (window.updateAuthUI) {
                    window.updateAuthUI(userData);
                }
                
                // Enable place order button
                enablePlaceOrderButton();
                
            } else {
                if (otpMessage) {
                    otpMessage.textContent = 'Invalid OTP. Please try again.';
                    otpMessage.style.color = '#dc3545';
                }
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Confirm';
            }
        } catch (error) {
            console.error('OTP verify error:', error);
            if (otpMessage) {
                otpMessage.textContent = 'Error verifying OTP. Please try again.';
                otpMessage.style.color = '#dc3545';
            }
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirm';
        }
    });
    
    // Helper functions to enable/disable place order button
    function disablePlaceOrderButton() {
        const placeOrderBtn = document.getElementById('placeOrderBtn');
        const mobilePlaceOrderBtn = document.getElementById('mobilePlaceOrderBtn');
        
        if (placeOrderBtn) {
            placeOrderBtn.disabled = true;
            placeOrderBtn.style.opacity = '0.5';
            placeOrderBtn.style.cursor = 'not-allowed';
            placeOrderBtn.title = 'Please verify your phone number first';
        }
        if (mobilePlaceOrderBtn) {
            mobilePlaceOrderBtn.disabled = true;
            mobilePlaceOrderBtn.style.opacity = '0.5';
            mobilePlaceOrderBtn.style.cursor = 'not-allowed';
        }
    }
    
    function enablePlaceOrderButton() {
        const placeOrderBtn = document.getElementById('placeOrderBtn');
        const mobilePlaceOrderBtn = document.getElementById('mobilePlaceOrderBtn');
        
        if (placeOrderBtn) {
            placeOrderBtn.disabled = false;
            placeOrderBtn.style.opacity = '1';
            placeOrderBtn.style.cursor = 'pointer';
            placeOrderBtn.title = '';
        }
        if (mobilePlaceOrderBtn) {
            mobilePlaceOrderBtn.disabled = false;
            mobilePlaceOrderBtn.style.opacity = '1';
            mobilePlaceOrderBtn.style.cursor = 'pointer';
        }
    }
}

// Make enable/disable functions globally available
function enablePlaceOrderButton() {
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    const mobilePlaceOrderBtn = document.getElementById('mobilePlaceOrderBtn');
    
    if (placeOrderBtn) {
        placeOrderBtn.disabled = false;
        placeOrderBtn.style.opacity = '1';
        placeOrderBtn.style.cursor = 'pointer';
        placeOrderBtn.title = '';
    }
    if (mobilePlaceOrderBtn) {
        mobilePlaceOrderBtn.disabled = false;
        mobilePlaceOrderBtn.style.opacity = '1';
        mobilePlaceOrderBtn.style.cursor = 'pointer';
    }
}

function disablePlaceOrderButton() {
    const placeOrderBtn = document.getElementById('placeOrderBtn');
    const mobilePlaceOrderBtn = document.getElementById('mobilePlaceOrderBtn');
    
    if (placeOrderBtn) {
        placeOrderBtn.disabled = true;
        placeOrderBtn.style.opacity = '0.5';
        placeOrderBtn.style.cursor = 'not-allowed';
        placeOrderBtn.title = 'Please verify your phone number first';
    }
    if (mobilePlaceOrderBtn) {
        mobilePlaceOrderBtn.disabled = true;
        mobilePlaceOrderBtn.style.opacity = '0.5';
        mobilePlaceOrderBtn.style.cursor = 'not-allowed';
    }
}

// Initialize OTP verification when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    initializeOTPVerification();
});

