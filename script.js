/*
 * Photo Framing Website JavaScript
 * This file handles all the interactive functionality including:
 * - Image upload and preview
 * - Frame customization
 * - Image adjustments
 * - Cart management
 * - Drag and zoom functionality
 */

// State management
console.log('🔄 script.js is loading...');
const state = {
    image: null,
    frameSize: {
        size: '13x19',
        orientation: 'portrait'
    },
    frameColor: 'black',
    frameTexture: 'smooth',
    price: 349,
    adjustments: {
        brightness: 100,
        contrast: 100,
        highlights: 100,
        shadows: 100,
        vibrance: 100
    },
    zoom: 1,
    position: { x: 0, y: 0 },
    roomSlider: {
        currentIndex: 0,
        images: [],
        frameSize: null
    }
};

// DOM Elements - will be initialized in DOMContentLoaded
let elements = {};

// Mobile helpers and lock for live preview position
function isMobileViewport() {
    return window.innerWidth <= 768; // aligns with CSS breakpoint
}

// When true (on mobile), prevent incidental scroll from shifting the image; unlock only during drag/zoom
let mobilePositionLocked = false;

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
    // Initialize DOM elements
    elements = {
        imageUpload: document.getElementById('imageUpload'),
        previewImage: document.getElementById('previewImage'),
        imageContainer: document.getElementById('imageContainer'),
        frame: document.getElementById('frame'),
        totalPrice: document.getElementById('totalPrice'),
        addToCartBtn: document.getElementById('addToCart'),
        zoomIn: document.getElementById('zoomIn'),
        zoomOut: document.getElementById('zoomOut'),
        precisionZoomIn: document.getElementById('precisionZoomIn'),
        precisionZoomOut: document.getElementById('precisionZoomOut'),
        // Cart elements
        headerCartBtn: document.getElementById('headerCartBtn'),
        cartCount: document.getElementById('cartCount')
    };

    // Set up all event listeners after elements are initialized
    initializeEventListeners();
    
    // Initialize default selections
    initializeDefaults();
    
    // Initialize cart count
    updateCartCount();

    // Initialize mobile bottom bar/drop-up if present
    initMobileBottomBar();
    
    // Initialize mobile room preview page functionality
    initMobileRoomPreview();
});

// Also update cart count on window load as a fallback
window.addEventListener('load', function() {
    updateCartCount();
});

// Initialize Mobile Bottom Bar and Drop-up drawers
function initMobileBottomBar() {
    const dropup = document.getElementById('mobileDropup');
    const bottomBar = document.getElementById('mobileBottomBar');
    if (!dropup || !bottomBar) return;

    const drawers = {
        size: dropup.querySelector('.drawer[data-drawer="size"]'),
        color: dropup.querySelector('.drawer[data-drawer="color"]'),
        texture: dropup.querySelector('.drawer[data-drawer="texture"]'),
        adjust: dropup.querySelector('.drawer[data-drawer="adjust"]'),
    };

    // Populate drawers by cloning existing mobile controls
    const template = document.getElementById('mobileControlsTemplate');
    if (template) {
        const tempContent = template.content;
        const sizeGrid = tempContent.querySelector('.mobile-size-grid');
        const colorGrid = tempContent.querySelector('.mobile-color-grid');
        const textureGrid = tempContent.querySelector('.mobile-texture-grid');
        const adjustments = tempContent.querySelector('.mobile-adjustments-container');

        if (sizeGrid && drawers.size && drawers.size.children.length === 0) {
            drawers.size.appendChild(sizeGrid.cloneNode(true));
        }
        if (colorGrid && drawers.color && drawers.color.children.length === 0) {
            drawers.color.appendChild(colorGrid.cloneNode(true));
        }
        if (textureGrid && drawers.texture && drawers.texture.children.length === 0) {
            drawers.texture.appendChild(textureGrid.cloneNode(true));
        }
        if (adjustments && drawers.adjust && drawers.adjust.children.length === 0) {
            const adjClone = adjustments.cloneNode(true);
            // Avoid duplicate IDs by renaming clones and linking to originals
            adjClone.querySelectorAll('input[id]').forEach(input => {
                const origId = input.id;
                input.dataset.sourceId = origId;
                input.removeAttribute('id');
                // Initialize clone value from original if present
                const original = document.getElementById(origId);
                if (original) input.value = original.value;
            });
            drawers.adjust.appendChild(adjClone);
        }
    }

    // Event delegation inside drawers to reuse existing handlers
    // Size
    dropup.addEventListener('click', (e) => {
        const sizeBtn = e.target.closest('.mobile-size-btn');
        if (sizeBtn) {
            // Trigger original click logic by dispatching click on matching button in main DOM
            const selector = `.mobile-size-btn[data-size="${sizeBtn.dataset.size}"][data-orientation="${sizeBtn.dataset.orientation}"]`;
            const original = document.querySelector(selector);
            if (original) original.click();
            // Update clone active states
            if (drawers.size) {
                drawers.size.querySelectorAll('.mobile-size-btn').forEach(btn => btn.classList.remove('active'));
                sizeBtn.classList.add('active');
            }
        }
        const colorBtn = e.target.closest('.mobile-color-btn');
        if (colorBtn) {
            const selector = `.mobile-color-btn[data-color="${colorBtn.dataset.color}"]`;
            const original = document.querySelector(selector);
            if (original) original.click();
            if (drawers.color) {
                drawers.color.querySelectorAll('.mobile-color-btn').forEach(btn => btn.classList.remove('active'));
                colorBtn.classList.add('active');
            }
        }
        const textureBtn = e.target.closest('.mobile-texture-btn');
        if (textureBtn) {
            const selector = `.mobile-texture-btn[data-texture="${textureBtn.dataset.texture}"]`;
            const original = document.querySelector(selector);
            if (original) original.click();
            if (drawers.texture) {
                drawers.texture.querySelectorAll('.mobile-texture-btn').forEach(btn => btn.classList.remove('active'));
                textureBtn.classList.add('active');
            }
        }
    });

    // Adjustments sliders - sync value to originals on input
    dropup.addEventListener('input', (e) => {
        const id = e.target.dataset.sourceId || e.target.id;
        if (!id) return;
        const mobileIds = ['mobileBrightness','mobileContrast','mobileHighlights','mobileShadows','mobileVibrance'];
        if (mobileIds.includes(id)) {
            const val = parseInt(e.target.value, 10);
            // Try to update the original (if present)
            const original = document.getElementById(id);
            if (original && original !== e.target) {
                original.value = val;
                original.dispatchEvent(new Event('input', { bubbles: true }));
                return; // Original handler will update state/filters
            }
            // No original exists (we removed old mobile section) → update state directly
            const base = id.startsWith('mobile') ? id.slice(6) : id; // e.g., Brightness
            const type = base.charAt(0).toLowerCase() + base.slice(1); // brightness
            if (state.adjustments && type in state.adjustments) {
                state.adjustments[type] = val;
                updateImageFilters();
            }
            // Also sync the desktop slider if present
            const desktop = document.getElementById(type);
            if (desktop) desktop.value = val;
        }
    });

    // Measure and set bar height CSS variable for layout spacing
    function setBarHeightVar() {
        const h = bottomBar.getBoundingClientRect().height;
        document.documentElement.style.setProperty('--mobile-bar-height', h + 'px');
    }
    setBarHeightVar();
    // expose for external calls after bar becomes visible
    window.recomputeMobileBarHeight = setBarHeightVar;
    window.addEventListener('resize', setBarHeightVar);
    window.addEventListener('orientationchange', setBarHeightVar);

    // Tabs behavior
    const tabs = bottomBar.querySelectorAll('.bar-tab');
    const titleEl = document.getElementById('dropupTitle');
    const toggleBtn = document.getElementById('dropupToggle');

    function setActiveDrawer(name) {
        // toggle tab states
        tabs.forEach(t => {
            const isActive = t.dataset.target === name;
            t.classList.toggle('active', isActive);
            t.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });
        // toggle drawers
        Object.entries(drawers).forEach(([key, el]) => {
            if (!el) return;
            el.classList.toggle('active', key === name);
        });
        // title
        if (titleEl) {
            const map = { size: 'Size', color: 'Color', texture: 'Texture', adjust: 'Adjust' };
            titleEl.textContent = map[name] || 'Customize';
        }
        // Hide the bottom bar when dropup opens
        bottomBar.classList.add('hidden-for-dropup');
        // open dropup
        dropup.classList.add('open');
        dropup.setAttribute('aria-hidden', 'false');
        if (toggleBtn) {
            toggleBtn.setAttribute('aria-expanded', 'true');
            const icon = toggleBtn.querySelector('i');
            if (icon) { icon.className = 'fas fa-chevron-down'; }
        }
    }

    tabs.forEach(tab => {
        tab.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            const target = tab.dataset.target;
            if (!target) return;
            // Always open the dropup and hide the bar when a tab is clicked
            setActiveDrawer(target);
        });
    });

    // Make the entire dropup header clickable for toggle only (no option selection)
    const dropupHeader = dropup.querySelector('.dropup-header');
    
    function toggleDropup(e) {
        // Prevent event bubbling issues
        if (e) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        const willOpen = !dropup.classList.contains('open');
        if (willOpen) {
            // Hide bottom bar and open dropup
            bottomBar.classList.add('hidden-for-dropup');
            dropup.classList.add('open');
            dropup.setAttribute('aria-hidden', 'false');
            if (toggleBtn) {
                toggleBtn.setAttribute('aria-expanded', 'true');
                const icon = toggleBtn.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-chevron-down';
                }
            }
        } else {
            // Close the dropup and show bottom bar
            dropup.classList.remove('open');
            dropup.setAttribute('aria-hidden', 'true');
            bottomBar.classList.remove('hidden-for-dropup');
            if (toggleBtn) {
                toggleBtn.setAttribute('aria-expanded', 'false');
                const icon = toggleBtn.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-chevron-up';
                }
            }
        }
    }
    
    // Function to close the dropup
    function closeDropup() {
        if (dropup.classList.contains('open')) {
            dropup.classList.remove('open');
            dropup.setAttribute('aria-hidden', 'true');
            bottomBar.classList.remove('hidden-for-dropup');
            if (toggleBtn) {
                toggleBtn.setAttribute('aria-expanded', 'false');
                const icon = toggleBtn.querySelector('i');
                if (icon) {
                    icon.className = 'fas fa-chevron-up';
                }
            }
        }
    }
    
    // Add click listener to the entire header
    if (dropupHeader) {
        dropupHeader.addEventListener('click', toggleDropup);
    }
    
    if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
            // Stop propagation to prevent double-triggering from header click
            e.stopPropagation();
            toggleDropup(e);
        });
    }
    
    // Close dropup when clicking outside of it
    document.addEventListener('click', (e) => {
        // Check if the dropup is open
        if (!dropup.classList.contains('open')) return;
        
        // Check if the click is outside the dropup and bottom bar
        const isInsideDropup = dropup.contains(e.target);
        const isInsideBottomBar = bottomBar.contains(e.target);
        
        if (!isInsideDropup && !isInsideBottomBar) {
            closeDropup();
        }
    });
    
    // Also close on touch outside for mobile devices
    document.addEventListener('touchstart', (e) => {
        // Check if the dropup is open
        if (!dropup.classList.contains('open')) return;
        
        // Check if the touch is outside the dropup and bottom bar
        const isInsideDropup = dropup.contains(e.target);
        const isInsideBottomBar = bottomBar.contains(e.target);
        
        if (!isInsideDropup && !isInsideBottomBar) {
            closeDropup();
        }
    }, { passive: true });

    // Ensure Size drawer is the default active drawer (but don't auto-open the dropup)
    Object.values(drawers).forEach(el => el && el.classList.remove('active'));
    if (drawers.size) drawers.size.classList.add('active');
    // Set Size tab as active by default
    tabs.forEach(t => {
        const isSize = t.dataset.target === 'size';
        t.classList.toggle('active', isSize);
        t.setAttribute('aria-selected', isSize ? 'true' : 'false');
    });
    // Set first dot as active
    if (dots[0]) dots[0].classList.add('active');
    if (titleEl) titleEl.textContent = 'Size';
}

// Listen for storage changes to update cart count across tabs
window.addEventListener('storage', function(e) {
    if (e.key === 'photoFramingCart') {
        updateCartCount();
    }
});

// Function to initialize default selections
function initializeDefaults() {
    // Select the first frame size button by default (13x19 portrait)
    const defaultSizeBtn = document.querySelector('[data-size="13x19"][data-orientation="portrait"]');
    if (defaultSizeBtn) {
        defaultSizeBtn.classList.add('selected');
        console.log('Default frame size selected:', state.frameSize);
    }
    
    // Update total price display
    if (elements.totalPrice) {
        elements.totalPrice.textContent = `₹${state.price}`;
    }
}

// Function to initialize all event listeners
function initializeEventListeners() {
    // Check if required elements exist (they might not exist on all pages)
    if (!elements.imageContainer) {
        console.log('Image container not found, skipping image-related event listeners');
        return;
    }
    
    // Drop zone functionality
    elements.imageContainer.addEventListener('dragover', (e) => {
        e.preventDefault();
        elements.imageContainer.classList.add('drag-over');
    });

    elements.imageContainer.addEventListener('dragleave', () => {
        elements.imageContainer.classList.remove('drag-over');
    });

    elements.imageContainer.addEventListener('drop', (e) => {
        e.preventDefault();
        elements.imageContainer.classList.remove('drag-over');
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            handleImageUpload(file);
        }
    });

    // Click to upload
    elements.imageContainer.addEventListener('click', () => {
        if (!state.image) {
            elements.imageUpload.click();
        }
    });

    // Image Upload Handler
    elements.imageUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            handleImageUpload(file);
        }
    });

    // Frame Size Selection
    document.querySelectorAll('.size-options button, .desktop-size-btn').forEach(button => {
        button.addEventListener('click', (event) => {
            console.log('Frame size button clicked:', button.dataset.size, button.dataset.orientation);
            
            // Remove selected class from all buttons
            document.querySelectorAll('.size-options button, .desktop-size-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            
            // Add selected class to clicked button
            button.classList.add('selected');
            
            // Update state with new frame size
            state.frameSize = {
                size: button.dataset.size,
                orientation: button.dataset.orientation
            };
            
            // Initialize room preview slider for the selected frame size
            initializeRoomSlider(button.dataset.size, button.dataset.orientation);
            
            // Add animation classes for smooth transition
            const framePreview = document.querySelector('.frame-preview');
            const frameWrapper = document.querySelector('.frame-aspect-wrapper');
            const frame = document.querySelector('.preview-section .frame');
            
            if (framePreview && frameWrapper) {
                // Add transition animation classes
                framePreview.classList.add('frame-transitioning');
                frameWrapper.classList.add('frame-wrapper-transitioning');
                
                // Add morphing animation to the frame itself
                if (frame) {
                    frame.classList.add('frame-morphing');
                }
                
                // Remove transition classes after animation
                setTimeout(() => {
                    framePreview.classList.remove('frame-transitioning');
                    frameWrapper.classList.remove('frame-wrapper-transitioning');
                    if (frame) {
                        frame.classList.remove('frame-morphing');
                    }
                }, 800);
            }
            
            // Update frame aspect ratio and styling
            updateFrameSize();
            
            // Update price
            const price = parseInt(button.dataset.price) || 349;
            state.price = price;
            
            // Update price display
            const totalPriceElement = document.getElementById('totalPrice');
            if (totalPriceElement) {
                totalPriceElement.textContent = '₹' + price;
            }
            // Also update mobile total price if present
            if (typeof updateMobileTotalPrice === 'function') {
                updateMobileTotalPrice();
            }
            
            // Removed auto-scroll on mobile to prevent page from jumping to top/center
            
            // On mobile, do NOT auto-update room previews; user will click the update button
            // Keep desktop behavior passive (no auto overlay) for consistency and performance
            if (window.updateRoomPreviewButtonState) {
                setTimeout(() => window.updateRoomPreviewButtonState(), 50);
            }
        });
    });

    // Frame Color Selection
    document.querySelectorAll('.color-options button, .desktop-color-btn').forEach(button => {
        button.addEventListener('click', () => {
            console.log('Frame color button clicked:', button.dataset.color);
            
            // Remove selected class from all buttons
            document.querySelectorAll('.color-options button, .desktop-color-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            
            // Add selected class to clicked button
            button.classList.add('selected');
            
            // Update state with new color
            state.frameColor = button.dataset.color;
            
            // Update frame color
            updateFrameColor();
            
            // No auto-update; let user press Update button
            if (window.updateRoomPreviewButtonState) {
                setTimeout(() => window.updateRoomPreviewButtonState(), 50);
            }
        });
    });

    // Frame Texture Selection
    document.querySelectorAll('.texture-options button, .desktop-texture-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.texture-options button, .desktop-texture-btn').forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            state.frameTexture = button.dataset.texture;
            updateFrameTexture();
        });
    });

    // Add to cart functionality
    console.log('Setting up Add to Cart button:', elements.addToCartBtn);
    if (elements.addToCartBtn) {
        console.log('Add to Cart button found, adding event listener');
        elements.addToCartBtn.addEventListener('click', async () => {
            console.log('Add to Cart button clicked!');
            
            // Check if we're on the right page
            if (typeof state === 'undefined' || !state) {
                console.error('State object not found - might not be on customize page');
                alert('Please go to the customize page to add items to cart.');
                return;
            }
            
            if (!state.image) {
                alert('Please upload an image first');
                return;
            }

            if (!state.frameSize) {
                alert('Please select a frame size');
                return;
            }

            try {
                // Show loading state
                elements.addToCartBtn.disabled = true;
                elements.addToCartBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Adding...';
                
                // Prepare cart item with basic data first
                const cartItem = {
                    id: Date.now(),
                    originalImage: state.originalImage || state.image, // Use original uploaded image
                    frameSize: state.frameSize,
                    frameColor: state.frameColor || '#8B4513',
                    frameTexture: state.frameTexture || 'wood',
                    adjustments: { ...state.adjustments },
                    zoom: state.zoom || 1,
                    position: { ...state.position },
                    price: state.price || 349,
                    orderDate: new Date().toISOString(),
                    timestamp: new Date().toISOString()
                };

                // Try to capture images, but don't fail if it doesn't work
                console.log('Attempting to capture images...');
                console.log('Current state:', {
                    hasImage: !!state.image,
                    hasOriginalImage: !!state.originalImage,
                    hasFrameSize: !!state.frameSize,
                    imageLength: state.image ? state.image.length : 0
                });
                
                try {
                    const [printImageData, previewImageData, adminCroppedImage] = await Promise.all([
                        getCanvasImageData().catch(err => {
                            console.warn('Print image capture failed:', err);
                            return null;
                        }),
                        captureFramePreview().catch(err => {
                            console.warn('Preview image capture failed:', err);
                            return null;
                        }),
                        captureFramedImage().catch(err => {
                            console.warn('Admin cropped image capture failed:', err);
                            return null;
                        })
                    ]);
                    
                    console.log('Image capture results:', {
                        printImageCaptured: !!printImageData,
                        previewImageCaptured: !!previewImageData,
                        adminCroppedImageCaptured: !!adminCroppedImage,
                        printImageSize: printImageData ? printImageData.length : 0,
                        previewImageSize: previewImageData ? previewImageData.length : 0,
                        adminCroppedImageSize: adminCroppedImage ? adminCroppedImage.length : 0
                    });
                    
                    // Add captured images if available
                    if (printImageData) {
                        cartItem.printImage = printImageData;
                        console.log('✅ Print image captured successfully');
                    } else {
                        console.warn('⚠️ Print image not captured, using original image as fallback');
                        cartItem.printImage = state.originalImage || state.image;
                    }
                    
                    if (previewImageData) {
                        cartItem.previewImage = previewImageData;
                        cartItem.displayImage = previewImageData;
                        console.log('✅ Preview image captured successfully');
                    } else {
                        console.warn('⚠️ Preview image not captured, using original image as fallback');
                        cartItem.previewImage = state.originalImage || state.image;
                        cartItem.displayImage = state.originalImage || state.image;
                    }

                    // Add high-quality cropped image for admin panel
                    if (adminCroppedImage) {
                        cartItem.adminCroppedImage = adminCroppedImage;
                        console.log('✅ High-quality cropped image captured for admin panel');
                    } else {
                        console.warn('⚠️ Admin cropped image not captured, will use fallback');
                    }
                    
                } catch (imageError) {
                    console.warn('Image capture failed, using original image as fallback:', imageError);
                    cartItem.printImage = state.originalImage || state.image;
                    cartItem.previewImage = state.originalImage || state.image;
                    cartItem.displayImage = state.originalImage || state.image;
                    cartItem.adminCroppedImage = state.originalImage || state.image;
                }

                console.log('Adding item to cart:', cartItem);
                
                // Call addToCart and handle the response
                try {
                    const success = await addToCart(cartItem);
                    
                    if (success) {
                        // Show success feedback
                        elements.addToCartBtn.innerHTML = '<i class="fas fa-check"></i> Added!';
                        elements.addToCartBtn.style.background = '#27ae60';
                        
                        setTimeout(() => {
                            elements.addToCartBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Add to Cart';
                            elements.addToCartBtn.style.background = '';
                            elements.addToCartBtn.disabled = false;
                        }, 2000);
                    } else {
                        // Reset button state on failure
                        elements.addToCartBtn.disabled = false;
                        elements.addToCartBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Add to Cart';
                    }
                } catch (cartError) {
                    console.error('Error adding to cart:', cartError);
                    elements.addToCartBtn.disabled = false;
                    elements.addToCartBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Add to Cart';
                    
                    // Show user-friendly error
                    if (cartError.message && cartError.message.includes('storage is full')) {
                        alert('Your cart is full! Please checkout or remove some items before adding more.');
                    } else {
                        alert('Unable to add item to cart. Please try again.');
                    }
                }
                
            } catch (error) {
                console.error('Error in add to cart process:', error);
                alert('Error adding item to cart. Please try again.');
                
                // Reset button state
                elements.addToCartBtn.disabled = false;
                elements.addToCartBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Add to Cart';
            }
        });
    } else {
        console.warn('Add to Cart button not found - might not be on customize page');
    }

    // Cart modal functionality
    if (elements.headerCartBtn) {
        elements.headerCartBtn.addEventListener('click', () => {
            window.location.href = 'cart.html';
        });
    }

    // Zoom controls
    console.log('Setting up zoom controls:', {
        zoomIn: elements.zoomIn,
        zoomOut: elements.zoomOut,
        precisionZoomIn: elements.precisionZoomIn,
        precisionZoomOut: elements.precisionZoomOut
    });
    
    if (elements.zoomIn) {
        elements.zoomIn.addEventListener('click', function() {
            console.log('Zoom In clicked'); // Debug log
            if (!state.image) {
                console.log('No image loaded, zoom disabled');
                return;
            }
            if (isMobileViewport()) mobilePositionLocked = false;
            const zoomSpeed = 0.1;
            state.zoom = Math.min(state.zoom + zoomSpeed, 3);
            console.log('New zoom level:', state.zoom);
            elements.previewImage.classList.add('smooth-transition');
            updateImageTransform();
            setTimeout(() => elements.previewImage.classList.remove('smooth-transition'), 200);
            if (isMobileViewport()) mobilePositionLocked = true;
            
            // No auto room overlay; user triggers manually
        });
    }
    if (elements.zoomOut) {
        elements.zoomOut.addEventListener('click', function() {
            console.log('Zoom Out clicked'); // Debug log
            if (!state.image || !state.frameSize) {
                console.log('No image or frame size, zoom disabled');
                return;
            }
            if (isMobileViewport()) mobilePositionLocked = false;
            const zoomSpeed = 0.1;
            const [width, height] = state.frameSize.size.split('x').map(Number);
            const isLandscape = state.frameSize.orientation === 'landscape';
            const frameWidth = isLandscape ? Math.max(width, height) : Math.min(width, height);
            const frameHeight = isLandscape ? Math.min(width, height) : Math.max(width, height);
            const imgWidth = elements.previewImage.naturalWidth;
            const imgHeight = elements.previewImage.naturalHeight;
            const minZoom = calculateRequiredZoom(imgWidth, imgHeight, frameWidth, frameHeight);
            state.zoom = Math.max(state.zoom - zoomSpeed, minZoom);
            console.log('New zoom level:', state.zoom);
            elements.previewImage.classList.add('smooth-transition');
            updateImageTransform();
            setTimeout(() => elements.previewImage.classList.remove('smooth-transition'), 200);
            if (isMobileViewport()) mobilePositionLocked = true;
            
            // No auto room overlay; user triggers manually
        });
    }
    if (elements.precisionZoomIn) {
        elements.precisionZoomIn.addEventListener('click', function() {
            console.log('Precision Zoom In clicked'); // Debug log
            if (!state.image) return;
            if (isMobileViewport()) mobilePositionLocked = false;
            const precisionZoomSpeed = 0.02;
            state.zoom = Math.min(state.zoom + precisionZoomSpeed, 3);
            elements.previewImage.classList.add('smooth-transition');
            updateImageTransform();
            setTimeout(() => elements.previewImage.classList.remove('smooth-transition'), 150);
            if (isMobileViewport()) mobilePositionLocked = true;
            
            // No auto room overlay; user triggers manually
        });
    }
    if (elements.precisionZoomOut) {
        elements.precisionZoomOut.addEventListener('click', function() {
            console.log('Precision Zoom Out clicked'); // Debug log
            if (!state.image || !state.frameSize) return;
            if (isMobileViewport()) mobilePositionLocked = false;
            const precisionZoomSpeed = 0.02;
            const [width, height] = state.frameSize.size.split('x').map(Number);
            const isLandscape = state.frameSize.orientation === 'landscape';
            const frameWidth = isLandscape ? Math.max(width, height) : Math.min(width, height);
            const frameHeight = isLandscape ? Math.min(width, height) : Math.max(width, height);
            const imgWidth = elements.previewImage.naturalWidth;
            const imgHeight = elements.previewImage.naturalHeight;
            const minZoom = calculateRequiredZoom(imgWidth, imgHeight, frameWidth, frameHeight);
            state.zoom = Math.max(state.zoom - precisionZoomSpeed, minZoom);
            elements.previewImage.classList.add('smooth-transition');
            updateImageTransform();
            setTimeout(() => elements.previewImage.classList.remove('smooth-transition'), 150);
            
            // No auto room overlay; user triggers manually
        });
    }

    // Mobile zoom controls - trigger the desktop zoom button clicks to use comprehensive handlers
    const mobileZoomIn = document.querySelector('.mobile-zoom-in');
    const mobileZoomOut = document.querySelector('.mobile-zoom-out');
    const mobilePrecisionZoomIn = document.querySelector('.mobile-precision-zoom-in');
    const mobilePrecisionZoomOut = document.querySelector('.mobile-precision-zoom-out');

    if (mobileZoomIn && elements.zoomIn) {
        mobileZoomIn.addEventListener('click', () => elements.zoomIn.click());
    }
    if (mobileZoomOut && elements.zoomOut) {
        mobileZoomOut.addEventListener('click', () => elements.zoomOut.click());
    }
    if (mobilePrecisionZoomIn && elements.precisionZoomIn) {
        mobilePrecisionZoomIn.addEventListener('click', () => elements.precisionZoomIn.click());
    }
    if (mobilePrecisionZoomOut && elements.precisionZoomOut) {
        mobilePrecisionZoomOut.addEventListener('click', () => elements.precisionZoomOut.click());
    }

    // Desktop card navigation functionality
    const desktopCards = document.querySelectorAll('.desktop-card');
    const prevCardBtn = document.getElementById('prevCardBtn');
    const nextCardBtn = document.getElementById('nextCardBtn');
    const cardIndicators = document.querySelectorAll('.card-dot');
    
    if (desktopCards.length && prevCardBtn && nextCardBtn && cardIndicators.length) {
        let currentCard = 0;
        
        function showCard(index) {
            // Hide all cards
            desktopCards.forEach(card => card.style.display = 'none');
            // Show current card
            if (desktopCards[index]) {
                desktopCards[index].style.display = 'block';
            }
            
            // Update indicators
            cardIndicators.forEach((indicator, i) => {
                indicator.classList.toggle('active', i === index);
            });
            
            // Update button states
            prevCardBtn.disabled = index === 0;
            nextCardBtn.disabled = index === desktopCards.length - 1;
        }
        
        // Navigation event listeners
        prevCardBtn.addEventListener('click', () => {
            if (currentCard > 0) {
                currentCard--;
                showCard(currentCard);
            }
        });
        
        nextCardBtn.addEventListener('click', () => {
            if (currentCard < desktopCards.length - 1) {
                currentCard++;
                showCard(currentCard);
            }
        });
        
        // Indicator click handlers
        cardIndicators.forEach((indicator, index) => {
            indicator.addEventListener('click', () => {
                currentCard = index;
                showCard(currentCard);
            });
        });
        
        // Initialize - show first card
        showCard(0);
    }

    // Initialize default frame size selection
    const defaultButton = document.querySelector('.size-options button[data-size="13x19"][data-orientation="portrait"]') ||
                         document.querySelector('.desktop-size-btn[data-size="13x19"][data-orientation="portrait"]');
    
    if (defaultButton) {
        defaultButton.classList.add('selected');
        state.frameSize = {
            size: defaultButton.dataset.size,
            orientation: defaultButton.dataset.orientation
        };
        
        // Initialize room slider with default frame size
        initializeRoomSlider('13x19', 'portrait');
    } else {
        // Fallback to default room preview if button not found
        showDefaultRoomPreview();
    }

    // Handle change image button click (both desktop and mobile)
    const changeImageBtn = document.getElementById('changeImage');
    const mobileChangeImageBtn = document.getElementById('mobileChangeImage');
    
    function handleChangeImage() {
        console.log('handleChangeImage called - about to reload page');
        // Hide mobile customization UI until next upload
        document.body.classList.remove('has-upload');
        // Reload the page to start fresh with image upload
        window.location.reload();
    }
    
    if (changeImageBtn) {
        console.log('Desktop change image button found and event listener added');
        changeImageBtn.addEventListener('click', (e) => {
            console.log('Desktop change image button clicked!');
            e.preventDefault();
            e.stopPropagation();
            handleChangeImage();
        });
    } else {
        console.log('Desktop change image button NOT found');
    }
    
    if (mobileChangeImageBtn) {
        console.log('Mobile change image button found and event listener added');
        mobileChangeImageBtn.addEventListener('click', (e) => {
            console.log('Mobile change image button clicked!');
            e.preventDefault();
            e.stopPropagation();
            handleChangeImage();
        });
    } else {
        console.log('Mobile change image button NOT found');
    }
}

// Add imageContainer to the elements object
elements.imageContainer = document.getElementById('imageContainer');
elements.uploadOverlay = document.getElementById('uploadOverlay');

// Initialize all sliders - only on customize page
const isCustomizePage = window.location.pathname.includes('customize.html');
const sliders = isCustomizePage ? ['brightness', 'contrast', 'highlights', 'shadows', 'vibrance'].map(id => ({
    id,
    element: document.getElementById(id)
})) : [];

function calculateRequiredZoom(imgWidth, imgHeight, frameWidth, frameHeight) {
    // Validate inputs
    if (!imgWidth || !imgHeight || !frameWidth || !frameHeight) {
        console.warn('Invalid dimensions for zoom calculation');
        return 1;
    }
    
    // Calculate the zoom needed to fit the image width to the frame width
    // This ensures the image initially fits the frame width, as requested by the user
    const zoomToFitWidth = frameWidth / imgWidth;
    
    // Ensure minimum zoom of 0.1 and reasonable maximum
    return Math.max(Math.min(zoomToFitWidth, 5), 0.1);
}

function handleImageUpload(file) {
    if (!file || !file.type.startsWith('image/')) {
        console.error('Invalid file type');
        return;
    }
    
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            // Hide upload section and show preview section
            document.getElementById('uploadSection').classList.add('hidden');
            document.getElementById('previewSection').classList.remove('hidden');

            // Show mobile customization section on mobile
            const mobileSection = document.getElementById('mobileCustomizationSection');
            if (mobileSection && window.innerWidth <= 600) {
                mobileSection.style.display = 'block';
            }

            // Create a temporary image to get dimensions and compress if needed
            const tempImg = new Image();
            tempImg.onload = () => {
                // Compress high-res images for better performance
                compressImageForPreview(tempImg).then(compressedDataURL => {
                    processCompressedImage(compressedDataURL);
                }).catch(error => {
                    console.error('Error compressing image, using original:', error);
                    processCompressedImage(e.target.result);
                });
            };
            
            tempImg.onerror = () => {
                console.error('Failed to load image');
                // Reset to upload state
                document.getElementById('uploadSection').classList.remove('hidden');
                document.getElementById('previewSection').classList.add('hidden');
            };
            
            tempImg.src = e.target.result;
        } catch (error) {
            console.error('Error processing image:', error);
        }
    };
    
    reader.onerror = () => {
        console.error('Failed to read file');
    };
    
    reader.readAsDataURL(file);
}

// Compress image for preview to improve performance with high-res images
function compressImageForPreview(img, maxDimension = 2400, quality = 0.92) {
    return new Promise((resolve) => {
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { alpha: false, willReadFrequently: false });
            
            let { width, height } = img;
            
            // Only compress if image is larger than max dimension
            if (width <= maxDimension && height <= maxDimension) {
                // Image is already small enough, convert to JPEG for consistency
                const smallCanvas = document.createElement('canvas');
                const smallCtx = smallCanvas.getContext('2d', { alpha: false });
                smallCanvas.width = width;
                smallCanvas.height = height;
                smallCtx.drawImage(img, 0, 0);
                resolve(smallCanvas.toDataURL('image/jpeg', quality));
                return;
            }
            
            // Calculate new dimensions maintaining aspect ratio
            const aspectRatio = width / height;
            
            if (width > height) {
                width = maxDimension;
                height = maxDimension / aspectRatio;
            } else {
                height = maxDimension;
                width = maxDimension * aspectRatio;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Use better image smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Draw compressed image
            ctx.drawImage(img, 0, 0, width, height);
            
            // Convert to JPEG with quality setting
            const compressedDataURL = canvas.toDataURL('image/jpeg', quality);
            console.log(`Image compressed: ${img.width}x${img.height} -> ${width}x${height}`);
            resolve(compressedDataURL);
            
        } catch (error) {
            console.error('Error in compressImageForPreview:', error);
            resolve(img.src); // Fallback to original
        }
    });
}

// Process the compressed image and set up the preview
function processCompressedImage(imageDataURL) {
    try {
        const tempImg = new Image();
        tempImg.onload = () => {
            const imgWidth = tempImg.width;
            const imgHeight = tempImg.height;

            // Validate image dimensions
            if (imgWidth === 0 || imgHeight === 0) {
                console.error('Invalid image dimensions');
                return;
            }

            // Set default frame size to 13x19 portrait if not already set
            if (!state.frameSize) {
                state.frameSize = {
                    size: '13x19',
                    orientation: 'portrait'
                };
            }

            // Calculate frame dimensions using actual container pixel dimensions
            const containerRect = elements.imageContainer.getBoundingClientRect();
            const containerWidth = containerRect.width;
            const containerHeight = containerRect.height;

            // Calculate required zoom to fit the image to the width of the frame container
            state.zoom = calculateRequiredZoom(imgWidth, imgHeight, containerWidth, containerHeight);

            // Set image and update UI
            state.image = imageDataURL;
            state.originalImage = imageDataURL;
            elements.previewImage.src = state.image;
                elements.previewImage.onload = () => {
                    // Enable add to cart button and mark container as having image
                    elements.addToCartBtn.disabled = false;
                    elements.imageContainer.classList.add('has-image');
                    // Show mobile customization bar/drop-up
                    document.body.classList.add('has-upload');
                    if (typeof window.recomputeMobileBarHeight === 'function') {
                        // wait a tick so layout applies display changes
                        setTimeout(() => window.recomputeMobileBarHeight(), 50);
                    }
                    // Ensure mobile total price and button state update
                    if (typeof updateMobileTotalPrice === 'function') {
                        updateMobileTotalPrice();
                    }
                    
                    // Update room preview button state
                    if (window.updateRoomPreviewButtonState) {
                        window.updateRoomPreviewButtonState();
                    }
                    
                    // Update mobile See Room Preview button state
                    if (window.updateMobileSeeRoomPreviewBtn) {
                        window.updateMobileSeeRoomPreviewBtn();
                    }
                    
                    // Set default frame color to black if not set
                if (!state.frameColor) {
                    state.frameColor = 'black';
                }
                
                // Center the image initially
                state.position = {
                    x: 0, // Center relative to container center
                    y: 0  // Center relative to container center
                };
                
                // Reset image styles for proper positioning
                elements.previewImage.style.cursor = 'grab';
                
                // Update frame size and aspect ratio
                updateFrameSize();
                
                // Initialize drag and zoom
                initializeDragAndZoom();

                // Update image transform
                updateImageTransform();
                
                // No auto-update on load; just refresh button state
                if (window.updateRoomPreviewButtonState) {
                    setTimeout(() => window.updateRoomPreviewButtonState(), 100);
                }
            };
        };
        
        tempImg.onerror = () => {
            console.error('Failed to load processed image');
            // Reset to upload state
            document.getElementById('uploadSection').classList.remove('hidden');
            document.getElementById('previewSection').classList.add('hidden');
        };
        
        tempImg.src = imageDataURL;
    } catch (error) {
        console.error('Error processing compressed image:', error);
    }
}

// Add hover effect to buttons
document.querySelectorAll('button').forEach(button => {
    button.addEventListener('mouseover', () => {
        button.style.transform = 'translateY(-2px)';
    });
    
    button.addEventListener('mouseout', () => {
        button.style.transform = '';
    });
});

// Add active state to buttons
document.querySelectorAll('button').forEach(button => {
    button.addEventListener('mousedown', () => {
        button.style.transform = 'scale(0.98)';
    });
    
    button.addEventListener('mouseup', () => {
        button.style.transform = '';
    });
});

// Debounce filter updates for better performance
let filterUpdateTimeout = null;
function debouncedUpdateImageFilters() {
    if (filterUpdateTimeout) {
        clearTimeout(filterUpdateTimeout);
    }
    filterUpdateTimeout = setTimeout(() => {
        updateImageFilters();
    }, 16); // ~60fps
}

// Enhance slider interaction - only if sliders exist
if (sliders.length > 0) {
    sliders.forEach(({ id, element }) => {
        // Check if element exists
        if (!element) {
            console.warn(`Slider element for ${id} not found`);
            return;
        }
        
        const label = element?.previousElementSibling;
        
        element.addEventListener('input', (e) => {
            console.log('Adjustment slider changed:', id, 'to', e.target.value);
            
            state.adjustments[id] = e.target.value;
            debouncedUpdateImageFilters();
        
        // Update label with value
        const value = e.target.value;
        label.dataset.value = `${value}%`;
        
        // Sync with mobile sliders
        const mobileSlider = document.getElementById('mobile' + id.charAt(0).toUpperCase() + id.slice(1));
        if (mobileSlider) {
            mobileSlider.value = value;
        }
        
        // No auto-update; allow user to click Update
        if (window.updateRoomPreviewButtonState) window.updateRoomPreviewButtonState();
    });
});
}

// Update image filters based on adjustment values
function updateImageFilters() {
    const { brightness, contrast, highlights, shadows, vibrance } = state.adjustments;
    
    // Calculate combined brightness from base brightness, highlights, and shadows
    const combinedBrightness = Math.max(1, (brightness / 100) * (highlights / 100) * (shadows / 100));
    
    elements.previewImage.style.filter = `
        brightness(${combinedBrightness})
        contrast(${contrast}%)
        saturate(${vibrance}%)
    `;
    
    // Room preview overlays will only update when "Update Room Previews" button is clicked
    // Removed automatic overlay update for filter changes to give users control
}

// Update frame aspect ratio based on selected size
function updateFrameAspectRatio() {
    if (!state.frameSize) return;

    const [width, height] = state.frameSize.size.split('x').map(Number);
    const isLandscape = state.frameSize.orientation === 'landscape';
    
    let aspectRatio;
    
    if (state.frameSize.size === '13x19') {
        aspectRatio = isLandscape ? 19 / 13 : 13 / 19;
    } else if (state.frameSize.size === '13x10') {
        aspectRatio = isLandscape ? 13 / 10 : 10 / 13;
    }

    elements.frame.style.aspectRatio = aspectRatio;
}

// Use requestAnimationFrame for smoother transform updates
let transformUpdatePending = false;
function updateImageTransform() {
    if (!elements.previewImage.src) return;
    
    if (transformUpdatePending) return;
    transformUpdatePending = true;
    
    requestAnimationFrame(() => {
        transformUpdatePending = false;
        
        // If locked on mobile, we still render current state, but any incidental external calls shouldn't modify state.position.
        // Position updates are already controlled in handlers; no-op here other than applying current state.
        // Use transform3d for better GPU acceleration
        const translateX = state.position.x;
        const translateY = state.position.y;
        
        // Apply transform with hardware acceleration and container center as reference point
        elements.previewImage.style.transform = `translate3d(calc(-50% + ${translateX}px), calc(-50% + ${translateY}px), 0) scale(${state.zoom})`;
        elements.previewImage.style.transformOrigin = '50% 50%';
        elements.previewImage.style.position = 'absolute';
        elements.previewImage.style.top = '50%';
        elements.previewImage.style.left = '50%';
        elements.previewImage.style.width = 'auto';
        elements.previewImage.style.height = 'auto';
        elements.previewImage.style.maxWidth = 'none';
        elements.previewImage.style.maxHeight = 'none';
        
        // Room preview overlays are now automatically updated when zoom changes
    });
    // Users can still manually trigger updates via the "Update Room Previews" button
}

// Update drag functionality to work with centered positioning
function initializeDragAndZoom() {
    // Remove any existing event listeners to prevent duplicates
    elements.imageContainer.removeEventListener('wheel', handleWheel);
    elements.previewImage.removeEventListener('wheel', handleWheel);
    elements.previewImage.removeEventListener('mousedown', handleMouseDown);
    window.removeEventListener('mousemove', handleMouseMove);
    window.removeEventListener('mouseup', handleMouseUp);
    elements.previewImage.removeEventListener('touchstart', handleTouchStart);
    window.removeEventListener('touchmove', handleTouchMove);
    window.removeEventListener('touchend', handleTouchEnd);
    
    let isDragging = false;
    let startPos = { x: 0, y: 0 };
    let animationFrameId = null;
    let pendingTransform = null;
    
    // Pinch-to-zoom variables
    let isPinching = false;
    let initialPinchDistance = 0;
    let initialZoom = 1;

    // Calculate distance between two touch points
    function getDistance(touch1, touch2) {
        const dx = touch1.clientX - touch2.clientX;
        const dy = touch1.clientY - touch2.clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Optimized transform update using requestAnimationFrame
    function scheduleTransformUpdate() {
        if (animationFrameId) return;
        
        animationFrameId = requestAnimationFrame(() => {
            if (pendingTransform) {
                updateImageTransform();
                pendingTransform = null;
            }
            animationFrameId = null;
        });
    }

    // Mouse wheel zoom with improved responsiveness
    function handleWheel(e) {
        e.preventDefault(); // Prevent page scrolling
        
        if (!state.image || !state.frameSize) return;
        if (isMobileViewport()) mobilePositionLocked = false; // allow intentional wheel zoom then re-lock
        
        // Determine zoom direction and calculate new zoom
        const zoomSpeed = 0.08; // Slightly reduced for smoother control
        
        // Calculate minimum zoom to ensure image fills the frame
        const [width, height] = state.frameSize.size.split('x').map(Number);
        const isLandscape = state.frameSize.orientation === 'landscape';
        const frameWidth = isLandscape ? Math.max(width, height) : Math.min(width, height);
        const frameHeight = isLandscape ? Math.min(width, height) : Math.max(width, height);
        const imgWidth = elements.previewImage.naturalWidth;
        const imgHeight = elements.previewImage.naturalHeight;
        const minZoom = calculateRequiredZoom(imgWidth, imgHeight, frameWidth, frameHeight);

        // Update zoom based on wheel direction
        const previousZoom = state.zoom;
        if (e.deltaY > 0) {
            // Zoom out
            state.zoom = Math.max(state.zoom - zoomSpeed, minZoom);
        } else {
            // Zoom in (max zoom of 3x)
            state.zoom = Math.min(state.zoom + zoomSpeed, 3);
        }

        // Add smooth transition class for zoom
        elements.previewImage.classList.add('smooth-transition');
        setTimeout(() => elements.previewImage.classList.remove('smooth-transition'), 200);

        // Update transform to reflect new zoom
        updateImageTransform();
    if (isMobileViewport()) mobilePositionLocked = true;
        
        // Auto-update room previews when mouse wheel zoom changes (simulation)
        // No auto room overlay; user triggers manually
    }

    // Mouse down handler with improved responsiveness
    function handleMouseDown(e) {
        if (!state.image) return;
        
        e.preventDefault(); // Prevent image dragging
        e.stopPropagation(); // Prevent event bubbling
        if (isMobileViewport()) {
            // Allow intentional drag to adjust position
            mobilePositionLocked = false;
        }
        
        isDragging = true;
        startPos = {
            x: e.clientX - state.position.x,
            y: e.clientY - state.position.y
        };
        
        // Remove transition for immediate response and add dragging state
        elements.previewImage.classList.remove('smooth-transition');
        elements.previewImage.classList.add('dragging');
        
        // Capture pointer for better mouse tracking
        if (elements.previewImage.setPointerCapture && e.pointerId) {
            elements.previewImage.setPointerCapture(e.pointerId);
        }
    }

    // Optimized mouse move handler
    function handleMouseMove(e) {
        if (!isDragging || !state.image) return;

        e.preventDefault();

        // Calculate new position relative to container center
        const newX = e.clientX - startPos.x;
        const newY = e.clientY - startPos.y;

        // Get container bounds for boundary calculations (cached for performance)
        const container = elements.imageContainer.getBoundingClientRect();
        const imageWidth = elements.previewImage.naturalWidth * state.zoom;
        const imageHeight = elements.previewImage.naturalHeight * state.zoom;
        
        // Calculate maximum allowed movement to keep image within frame bounds
        const maxX = Math.max(0, (imageWidth - container.width) / 2);
        const maxY = Math.max(0, (imageHeight - container.height) / 2);

        // Constrain movement within boundaries with smooth edge resistance
        const dampingFactor = 0.1; // Resistance when near boundaries
        let constrainedX = Math.max(Math.min(newX, maxX), -maxX);
        let constrainedY = Math.max(Math.min(newY, maxY), -maxY);

        // Apply smooth edge resistance
        if (newX > maxX) {
            constrainedX = maxX + (newX - maxX) * dampingFactor;
        } else if (newX < -maxX) {
            constrainedX = -maxX + (newX + maxX) * dampingFactor;
        }

        if (newY > maxY) {
            constrainedY = maxY + (newY - maxY) * dampingFactor;
        } else if (newY < -maxY) {
            constrainedY = -maxY + (newY + maxY) * dampingFactor;
        }

        state.position = {
            x: constrainedX,
            y: constrainedY
        };

        // Schedule transform update for next frame
        pendingTransform = true;
        scheduleTransformUpdate();
    }

    // Mouse up handler
    function handleMouseUp(e) {
        if (!isDragging) return;
        
        isDragging = false;
        
        // Release pointer capture
        if (elements.previewImage.releasePointerCapture && e.pointerId) {
            elements.previewImage.releasePointerCapture(e.pointerId);
        }
        
        // Restore cursor and remove dragging state
        elements.previewImage.classList.remove('dragging');
        
        // Snap back to boundaries if needed
        snapToBoundaries();
        if (isMobileViewport()) {
            // Re-lock after finishing interaction
            mobilePositionLocked = true;
        }
        
        // No auto room overlay after drag; user triggers manually
    }

    // Snap to boundaries with smooth animation
    function snapToBoundaries() {
        if (!state.image) return;

        const container = elements.imageContainer.getBoundingClientRect();
        const imageWidth = elements.previewImage.naturalWidth * state.zoom;
        const imageHeight = elements.previewImage.naturalHeight * state.zoom;
        
        const maxX = Math.max(0, (imageWidth - container.width) / 2);
        const maxY = Math.max(0, (imageHeight - container.height) / 2);

        const newX = Math.max(Math.min(state.position.x, maxX), -maxX);
        const newY = Math.max(Math.min(state.position.y, maxY), -maxY);

        // Only animate if position needs adjustment
        if (newX !== state.position.x || newY !== state.position.y) {
            elements.previewImage.classList.add('smooth-transition');
            state.position = { x: newX, y: newY };
            updateImageTransform();
            setTimeout(() => elements.previewImage.classList.remove('smooth-transition'), 200);
        }
    }

    // Enhanced touch start handler
    function handleTouchStart(e) {
        if (!state.image) return;
        
        // Only prevent default if touching the image directly
        const target = e.target;
        if (target === elements.previewImage || target.closest('.preview-image')) {
            e.preventDefault();
            e.stopPropagation();
        }
        
        if (e.touches.length === 1) {
            // Single touch - dragging
            isDragging = true;
            isPinching = false;
            if (isMobileViewport()) {
                mobilePositionLocked = false; // unlock during gesture
            }
            const touch = e.touches[0];
            startPos = {
                x: touch.clientX - state.position.x,
                y: touch.clientY - state.position.y
            };
            elements.previewImage.classList.remove('smooth-transition');
            elements.previewImage.classList.add('dragging');
        } else if (e.touches.length === 2) {
            // Two touches - pinch to zoom
            isDragging = false;
            isPinching = true;
            if (isMobileViewport()) {
                mobilePositionLocked = false; // unlock during gesture
            }
            initialPinchDistance = getDistance(e.touches[0], e.touches[1]);
            initialZoom = state.zoom;
            elements.previewImage.classList.remove('dragging');
        }
    }

    // Enhanced touch move handler
    function handleTouchMove(e) {
        if (!state.image) return;

        // Only prevent default if we're actually dragging or pinching
        if (isDragging || isPinching) {
            e.preventDefault();
            e.stopPropagation();
        }

        if (e.touches.length === 1 && isDragging && !isPinching) {
            // Single touch dragging
            const touch = e.touches[0];
            const newX = touch.clientX - startPos.x;
            const newY = touch.clientY - startPos.y;

            // Get container bounds for boundary calculations
            const container = elements.imageContainer.getBoundingClientRect();
            const imageWidth = elements.previewImage.naturalWidth * state.zoom;
            const imageHeight = elements.previewImage.naturalHeight * state.zoom;
            
            // Calculate maximum allowed movement
            const maxX = Math.max(0, (imageWidth - container.width) / 2);
            const maxY = Math.max(0, (imageHeight - container.height) / 2);

            // Apply smooth edge resistance for touch
            const dampingFactor = 0.15; // Slightly more resistance for touch
            let constrainedX = Math.max(Math.min(newX, maxX), -maxX);
            let constrainedY = Math.max(Math.min(newY, maxY), -maxY);

            if (newX > maxX) {
                constrainedX = maxX + (newX - maxX) * dampingFactor;
            } else if (newX < -maxX) {
                constrainedX = -maxX + (newX + maxX) * dampingFactor;
            }

            if (newY > maxY) {
                constrainedY = maxY + (newY - maxY) * dampingFactor;
            } else if (newY < -maxY) {
                constrainedY = -maxY + (newY + maxY) * dampingFactor;
            }

            state.position = {
                x: constrainedX,
                y: constrainedY
            };

            // Schedule transform update
            pendingTransform = true;
            scheduleTransformUpdate();
        } else if (e.touches.length === 2 && isPinching) {
            // Two-finger pinch to zoom
            const currentDistance = getDistance(e.touches[0], e.touches[1]);
            const scale = currentDistance / initialPinchDistance;
            
            // Calculate new zoom level
            let newZoom = initialZoom * scale;
            
            // Apply zoom constraints
            const imgWidth = elements.previewImage.naturalWidth;
            const imgHeight = elements.previewImage.naturalHeight;
            const frameContainer = elements.imageContainer.getBoundingClientRect();
            const frameWidth = frameContainer.width;
            const frameHeight = frameContainer.height;
            
            // Calculate minimum zoom (same as existing zoom logic)
            const minZoom = Math.max(
                frameWidth / imgWidth,
                frameHeight / imgHeight
            );
            
            const maxZoom = 3; // Maximum zoom level
            
            // Constrain zoom
            newZoom = Math.max(minZoom, Math.min(newZoom, maxZoom));
            
            // Update zoom state
            state.zoom = newZoom;
            
            // Schedule transform update
            pendingTransform = true;
            scheduleTransformUpdate();
        }
    }

    // Touch end handler
    function handleTouchEnd(e) {
        if (!isDragging && !isPinching) return;
        
        // Reset states
        isDragging = false;
        isPinching = false;
        elements.previewImage.classList.remove('dragging');
        
        // Snap back to boundaries
        snapToBoundaries();
        if (isMobileViewport()) {
            // Re-lock after finishing gesture
            mobilePositionLocked = true;
        }
        
        // No auto room overlay after touch; user triggers manually
    }

    // Add event listeners with improved options
    elements.imageContainer.addEventListener('wheel', handleWheel, { passive: false });
    elements.previewImage.addEventListener('wheel', handleWheel, { passive: false });
    elements.previewImage.addEventListener('mousedown', handleMouseDown, { passive: false });
    window.addEventListener('mousemove', handleMouseMove, { passive: false });
    window.addEventListener('mouseup', handleMouseUp, { passive: false });
    elements.previewImage.addEventListener('touchstart', handleTouchStart, { passive: false });
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd, { passive: false });
    
    // Prevent context menu on right click during drag
    elements.previewImage.addEventListener('contextmenu', (e) => {
        if (isDragging) e.preventDefault();
    });
}

// Function to capture just the cropped image inside the frame with all adjustments
function captureFramedImage() {
    return new Promise((resolve) => {
        const previewImage = document.getElementById('previewImage');
        const frameContainer = document.querySelector('.frame-preview');
        
        if (!previewImage.src || !state.frameSize || !frameContainer) {
            console.log('No image, frame size, or frame container, using original image');
            resolve(state.image);
            return;
        }
        
        try {
            console.log('🖼️ Capturing exactly what is visible in frame preview...');
            
            // Get the frame container dimensions (this is the visible area)
            const frameRect = frameContainer.getBoundingClientRect();
            const frameInnerPadding = 20; // Frame border thickness
            
            // Calculate the actual visible area inside the frame borders
            const visibleWidth = frameRect.width - (frameInnerPadding * 2);
            const visibleHeight = frameRect.height - (frameInnerPadding * 2);
            
            // Create high-resolution canvas for print quality
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { 
                alpha: false, 
                willReadFrequently: false,
                desynchronized: true 
            });
            
            // Set resolution for printing (optimized for performance vs quality)
            const printResolution = 1200; // High resolution for printing
            const aspectRatio = visibleWidth / visibleHeight;
            
            if (aspectRatio > 1) {
                // Landscape
                canvas.width = printResolution;
                canvas.height = Math.round(printResolution / aspectRatio);
            } else {
                // Portrait
                canvas.width = Math.round(printResolution * aspectRatio);
                canvas.height = printResolution;
            }
            
            console.log('Canvas dimensions:', { width: canvas.width, height: canvas.height });
            
            // Create image element
            const img = new Image();
            img.onload = () => {
                try {
                    // Clear canvas with white background
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // Enable high-quality image smoothing
                    ctx.imageSmoothingEnabled = true;
                    ctx.imageSmoothingQuality = 'high';
                    
                    // Calculate scale factor from preview to canvas
                    const scaleX = canvas.width / visibleWidth;
                    const scaleY = canvas.height / visibleHeight;
                    
                    // Get the preview image's current computed style
                    const previewRect = previewImage.getBoundingClientRect();
                    const frameContainerRect = frameContainer.getBoundingClientRect();
                    
                    // Calculate the image's position relative to the frame container
                    const imgLeft = previewRect.left - frameContainerRect.left - frameInnerPadding;
                    const imgTop = previewRect.top - frameContainerRect.top - frameInnerPadding;
                    const imgWidth = previewRect.width;
                    const imgHeight = previewRect.height;
                    
                    console.log('Preview positioning:', {
                        frameVisible: { width: visibleWidth, height: visibleHeight },
                        imagePos: { left: imgLeft, top: imgTop, width: imgWidth, height: imgHeight },
                        scale: { x: scaleX, y: scaleY }
                    });
                    
                    // Apply color adjustments/filters to match preview
                    if (state.adjustments) {
                        const { brightness, contrast, highlights, shadows, vibrance } = state.adjustments;
                        const combinedBrightness = Math.max(0.1, Math.min(3, 
                            (brightness / 100) * 
                            (1 + (highlights - 100) / 200) * 
                            (1 + (shadows - 100) / 200)
                        ));
                        
                        ctx.filter = `
                            brightness(${combinedBrightness})
                            contrast(${contrast}%)
                            saturate(${vibrance}%)
                        `.replace(/\s+/g, ' ').trim();
                        
                        console.log('Applied filters:', ctx.filter);
                    }
                    
                    // Draw the image exactly as it appears in the preview frame
                    // Scale positions from preview to canvas coordinates
                    const canvasX = imgLeft * scaleX;
                    const canvasY = imgTop * scaleY;
                    const canvasW = imgWidth * scaleX;
                    const canvasH = imgHeight * scaleY;
                    
                    // Draw the image with exact positioning
                    ctx.drawImage(img, canvasX, canvasY, canvasW, canvasH);
                    
                    // Reset filter for any additional operations
                    ctx.filter = 'none';
                    
                    // Convert to data URL with optimized quality
                    const dataURL = canvas.toDataURL('image/jpeg', 0.90);
                    
                    console.log('✅ Frame image captured successfully with exact positioning');
                    resolve(dataURL);
                    
                } catch (error) {
                    console.error('Error during image capture:', error);
                    resolve(state.image); // Fallback to original image
                }
            };
            
            img.onerror = () => {
                console.error('Failed to load image for capture');
                resolve(state.image);
            };
            
            // Load the original image
            img.src = state.originalImage || state.image;
            
        } catch (error) {
            console.error('Error in captureFramedImage:', error);
            resolve(state.image);
        }
    });
}

// Function to capture the frame preview for display purposes (with frame borders)
function captureFramePreviewForDisplay() {
    return new Promise((resolve) => {
        const previewImage = document.getElementById('previewImage');
        
        if (!previewImage.src || !state.frameSize) {
            console.log('No image or frame size, using original image');
            resolve(state.image);
            return;
        }
        
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d', { 
                alpha: false, 
                willReadFrequently: false 
            });
            
            // Set canvas size for display preview (optimized size)
            const canvasWidth = 400; // Increased slightly for better quality
            const canvasHeight = 400;
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            
            // Enable high-quality image smoothing
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Get frame aspect ratio
            const [width, height] = state.frameSize.size.split('x').map(Number);
            const isLandscape = state.frameSize.orientation === 'landscape';
            const frameAspectWidth = isLandscape ? Math.max(width, height) : Math.min(width, height);
            const frameAspectHeight = isLandscape ? Math.min(width, height) : Math.max(width, height);
            const frameAspectRatio = frameAspectWidth / frameAspectHeight;
            
            // Calculate frame dimensions on canvas
            let frameWidth, frameHeight;
            if (frameAspectRatio > 1) {
                frameWidth = canvasWidth * 0.9;
                frameHeight = frameWidth / frameAspectRatio;
            } else {
                frameHeight = canvasHeight * 0.9;
                frameWidth = frameHeight * frameAspectRatio;
            }
            
            const frameX = (canvasWidth - frameWidth) / 2;
            const frameY = (canvasHeight - frameHeight) / 2;
            
            // Frame border width
            const borderWidth = Math.min(frameWidth, frameHeight) * 0.08;
            
            // Image area dimensions
            const imageAreaX = frameX + borderWidth;
            const imageAreaY = frameY + borderWidth;
            const imageAreaWidth = frameWidth - (borderWidth * 2);
            const imageAreaHeight = frameHeight - (borderWidth * 2);
            
            // Create image element
            const img = new Image();
            img.onload = () => {
                try {
                    // Fill canvas with white background
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
                    
                    // Draw frame background
                    ctx.fillStyle = state.frameColor || '#8B4513';
                    ctx.fillRect(frameX, frameY, frameWidth, frameHeight);
                    
                    // Add frame texture if specified
                    if (state.frameTexture !== 'smooth') {
                        ctx.save();
                        ctx.globalAlpha = 0.3;
                        ctx.fillStyle = state.frameTexture === 'wood' ? '#654321' : '#999999';
                        
                        // Create simple texture pattern
                        for (let i = frameX; i < frameX + frameWidth; i += 3) {
                            for (let j = frameY; j < frameY + frameHeight; j += 3) {
                                if (Math.random() > 0.6) {
                                    ctx.fillRect(i, j, 1, 1);
                                }
                            }
                        }
                        ctx.restore();
                    }
                    
                    // Create clipping path for image area
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(imageAreaX, imageAreaY, imageAreaWidth, imageAreaHeight);
                    ctx.clip();
                    
                    // Calculate image dimensions and position
                    const imgAspectRatio = img.naturalWidth / img.naturalHeight;
                    const containerAspectRatio = imageAreaWidth / imageAreaHeight;
                    
                    let drawWidth, drawHeight;
                    if (imgAspectRatio > containerAspectRatio) {
                        drawHeight = imageAreaHeight * (state.zoom || 1);
                        drawWidth = drawHeight * imgAspectRatio;
                    } else {
                        drawWidth = imageAreaWidth * (state.zoom || 1);
                        drawHeight = drawWidth / imgAspectRatio;
                    }
                    
                    // Calculate position with user adjustments
                    const centerX = imageAreaX + imageAreaWidth / 2;
                    const centerY = imageAreaY + imageAreaHeight / 2;
                    const positionX = state.position ? state.position.x * imageAreaWidth * 0.01 : 0;
                    const positionY = state.position ? state.position.y * imageAreaHeight * 0.01 : 0;
                    
                    const drawX = centerX - drawWidth / 2 + positionX;
                    const drawY = centerY - drawHeight / 2 + positionY;
                    
                    // Apply filters if any
                    if (state.adjustments) {
                        const { brightness, contrast, highlights, shadows, vibrance } = state.adjustments;
                        // Calculate combined brightness from base brightness, highlights, and shadows
                        const combinedBrightness = Math.max(1, (brightness / 100) * (highlights / 100) * (shadows / 100));
                        
                        ctx.filter = `
                            brightness(${combinedBrightness})
                            contrast(${contrast}%)
                            saturate(${vibrance}%)
                        `;
                    }
                    
                    // Draw the image
                    ctx.drawImage(img, drawX, drawY, drawWidth, drawHeight);
                    
                    ctx.restore();
                    
                    // Convert to data URL
                    const dataURL = canvas.toDataURL('image/jpeg', 0.9);
                    console.log('Frame preview for display captured successfully');
                    resolve(dataURL);
                    
                } catch (error) {
                    console.error('Error drawing frame preview:', error);
                    resolve(state.image);
                }
            };
            
            img.onerror = () => {
                resolve(state.image);
            };
            
            img.crossOrigin = 'anonymous';
            img.src = state.image;
            
        } catch (error) {
            console.error('Error in captureFramePreviewForDisplay:', error);
            resolve(state.image);
        }
    });
}

// Function to get canvas image data for cart (wrapper for captureFramedImage)
function getCanvasImageData() {
    return captureFramedImage();
}

// Function to extract print-ready images from cart for order processing
function getPrintReadyImages() {
    const cart = JSON.parse(localStorage.getItem('photoFramingCart') || '[]');
    return cart.map((item, index) => ({
        orderIndex: index,
        printImage: item.printImage, // This is the cropped, styled image ready for printing
        frameSize: item.frameSize,
        frameColor: item.frameColor,
        frameTexture: item.frameTexture,
        adjustments: item.adjustments,
        price: item.price,
        orderDate: item.orderDate
    }));
}

// Function to download all print images (for testing/manual order processing)
function downloadPrintImages() {
    const printImages = getPrintReadyImages();
    printImages.forEach((order, index) => {
        if (order.printImage) {
            const link = document.createElement('a');
            link.download = `order_${index + 1}_${order.frameSize.size}_${order.frameColor}.jpg`;
            link.href = order.printImage;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    });
}

// Cart Modal Functions
function updateCartCount() {
    try {
        const cart = JSON.parse(sessionStorage.getItem('photoFramingCart') || '[]');
        const count = cart.length;
        
        console.log('updateCartCount called:', {
            cartData: sessionStorage.getItem('photoFramingCart'),
            parsedCart: cart,
            count: count
        });
        
        // Handle both the elements object and direct DOM query
        const cartCountElement = elements.cartCount || document.getElementById('cartCount');
        
        if (cartCountElement) {
            cartCountElement.textContent = count;
            cartCountElement.style.display = count > 0 ? 'flex' : 'none';
            console.log('Cart count updated to:', count, 'Element:', cartCountElement);
        } else {
            console.warn('Cart count element not found - both elements.cartCount and getElementById failed');
        }
    } catch (error) {
        console.error('Error in updateCartCount:', error);
    }
}

function openCartModal() {
    window.location.href = 'cart.html';
}

function closeCartModal() {
    // Not needed anymore - using dedicated cart page
}

function renderCartItems() {
    const cart = JSON.parse(localStorage.getItem('photoFramingCart') || '[]');
    
    if (cart.length === 0) {
        elements.cartEmpty.style.display = 'block';
        elements.cartItems.style.display = 'none';
        elements.cartFooter.style.display = 'none';
        return;
    }
    
    elements.cartEmpty.style.display = 'none';
    elements.cartItems.style.display = 'block';
    elements.cartFooter.style.display = 'block';
    
    elements.cartItems.innerHTML = '';
    let total = 0;
    
    cart.forEach((item, index) => {
        total += item.price;
        console.log(`Cart item ${index}:`, item); // Debug log
        
        // Use previewImage for cart preview, fallback to other images
        let displayImageSrc = item.previewImage || item.displayImage || item.printImage || item.originalImage;
        let hasPrintImage = item.printImage ? 'Yes' : 'No';
        
        console.log(`Item ${index} - Display image:`, displayImageSrc ? 'Available' : 'None');
        console.log(`Item ${index} - Print image ready:`, hasPrintImage);
        
        const cartItemElement = document.createElement('div');
        cartItemElement.className = 'cart-item';
        
        // Better image handling with fallback
        let imageHtml;
        if (displayImageSrc && (displayImageSrc.startsWith('data:') || displayImageSrc.startsWith('http') || displayImageSrc.startsWith('blob:'))) {
            imageHtml = `<img src="${displayImageSrc}" alt="Frame Preview" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';">
                        <div class="image-fallback" style="display:none; align-items:center; justify-content:center; background:#f0f0f0; width:100%; height:100%;">
                            <i class="fas fa-image" style="font-size:24px; color:#999;"></i>
                        </div>`;
        } else {
            imageHtml = `<div class="image-fallback" style="display:flex; align-items:center; justify-content:center; background:#f0f0f0; width:100%; height:100%;">
                            <i class="fas fa-image" style="font-size:24px; color:#999;"></i>
                        </div>`;
        }
        
        cartItemElement.innerHTML = `
            <div class="cart-item-image">
                ${imageHtml}
            </div>
            <div class="cart-item-details">
                <div class="cart-item-title">Custom Photo Frame</div>
                <div class="cart-item-specs">
                    Size: ${item.frameSize ? `${item.frameSize.size} (${item.frameSize.orientation})` : 'Not selected'}<br>
                    Color: ${item.frameColor}<br>
                    Texture: ${item.frameTexture}<br>
                    <small style="color: ${hasPrintImage === 'Yes' ? 'green' : 'orange'};">
                        Print Image: ${hasPrintImage}
                    </small>
                </div>
                <div class="cart-item-price">₹${item.price}</div>
            </div>
            <button class="cart-item-remove" onclick="removeCartItem(${index})">
                <i class="fas fa-trash"></i>
            </button>
        `;
        elements.cartItems.appendChild(cartItemElement);
    });
    
    elements.cartTotalAmount.textContent = total;
}

function removeCartItem(index) {
    let cart = JSON.parse(localStorage.getItem('photoFramingCart') || '[]');
    cart.splice(index, 1);
    localStorage.setItem('photoFramingCart', JSON.stringify(cart));
    renderCartItems();
    updateCartCount();
}

// Make removeCartItem globally accessible
window.removeCartItem = removeCartItem;

// Compress image for thumbnail (small size for cart display)
function compressImageForThumbnail(base64Image, maxWidth = 100, maxHeight = 100, quality = 0.6) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = function() {
            // Calculate thumbnail dimensions while maintaining aspect ratio
            let { width, height } = img;
            const aspectRatio = width / height;
            
            if (width > maxWidth || height > maxHeight) {
                if (aspectRatio > 1) {
                    width = maxWidth;
                    height = maxWidth / aspectRatio;
                } else {
                    height = maxHeight;
                    width = maxHeight * aspectRatio;
                }
            }
            
            canvas.width = width;
            canvas.height = height;
            
            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', quality);
            resolve(compressedBase64);
        };
        
        img.onerror = function() {
            console.warn('Failed to compress thumbnail, using null');
            resolve(null);
        };
        
        img.src = base64Image;
    });
}

async function addToCart(item) {
    console.log('addToCart function called with item:', item);
    try {
        // Validate the item has required fields
        if (!item || typeof item !== 'object') {
            throw new Error('Invalid item data');
        }

        if (!item.frameSize) {
            throw new Error('Missing frame size information');
        }

        // Get existing cart
        let cart;
        try {
            const cartData = sessionStorage.getItem('photoFramingCart');
            cart = cartData ? JSON.parse(cartData) : [];
        } catch (parseError) {
            console.warn('Error parsing existing cart, creating new cart:', parseError);
            cart = [];
        }
        
        // Create lightweight cart item (without large base64 images)
        const isValidImage = (img) => img && img.length > 100 && img !== 'data:,';
        
        const thumbSource = [item.displayImage, item.previewImage, item.printImage, item.originalImage].find(isValidImage) || null;
        
        const lightweightItem = {
            id: item.id,
            timestamp: item.timestamp || new Date().toISOString(),
            frameSize: item.frameSize,
            frameColor: item.frameColor,
            frameTexture: item.frameTexture,
            price: item.price,
            // Store only essential image metadata, not base64 data
            hasImage: !!thumbSource,
            imageSize: {
                original: item.originalImage ? item.originalImage.length : 0,
                print: item.printImage ? item.printImage.length : 0,
                preview: item.displayImage ? item.displayImage.length : (item.previewImage ? item.previewImage.length : 0)
            },
            // Create small thumbnail for cart display (compressed)
            thumbnailImage: thumbSource ? await compressImageForThumbnail(thumbSource) : null
        };
        
        // Store full image data in sessionStorage for order processing (separate from cart)
        // First, try to compress images to reduce storage size
        const compressImage = (base64Data, quality = 0.6, maxSize = 800) => {
            return new Promise((resolve) => {
                if (!base64Data || !base64Data.startsWith('data:image/')) {
                    resolve(base64Data);
                    return;
                }
                
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    
                    // Calculate new dimensions maintaining aspect ratio
                    let { width, height } = img;
                    if (width > height) {
                        if (width > maxSize) {
                            height = (height * maxSize) / width;
                            width = maxSize;
                        }
                    } else {
                        if (height > maxSize) {
                            width = (width * maxSize) / height;
                            height = maxSize;
                        }
                    }
                    
                    canvas.width = width;
                    canvas.height = height;
                    
                    // Draw and compress
                    ctx.drawImage(img, 0, 0, width, height);
                    const compressed = canvas.toDataURL('image/jpeg', quality);
                    resolve(compressed);
                };
                img.onerror = () => resolve(base64Data);
                img.src = base64Data;
            });
        };

        // Compress images for storage while keeping originals for upload
        const compressedImages = {
            originalImage: await compressImage(item.originalImage, 0.7, 1200),
            printImage: await compressImage(item.printImage, 0.8, 1200),
            displayImage: await compressImage(item.displayImage, 0.6, 800),
            previewImage: await compressImage(item.previewImage, 0.6, 800),
            adminCroppedImage: item.adminCroppedImage ? await compressImage(item.adminCroppedImage, 0.9, 1600) : null // High quality for admin
        };

        // Store original full-quality images separately for upload
        const fullImageData = {
            originalImage: item.originalImage,
            printImage: item.printImage,
            displayImage: item.displayImage,
            previewImage: item.previewImage,
            adminCroppedImage: item.adminCroppedImage // Keep full quality for admin panel
        };
        
        try {
            // Store compressed images in sessionStorage for display
            sessionStorage.setItem(`cartImage_${item.id}`, JSON.stringify(compressedImages));
            
            // Store full-quality images for upload (fallback to window if sessionStorage fails)
            try {
                sessionStorage.setItem(`cartImage_full_${item.id}`, JSON.stringify(fullImageData));
                console.log(`🗂️ Stored compressed and full images in sessionStorage for item ${item.id}`);
            } catch (fullStorageError) {
                // Fallback to window storage for full images
                if (typeof window.cartImageStorage === 'undefined') {
                    window.cartImageStorage = {};
                }
                window.cartImageStorage[item.id] = fullImageData;
                console.log(`🗂️ Stored compressed images in sessionStorage, full images in window storage for item ${item.id}`);
            }
            
            console.log(`🗂️ Image storage summary for item ${item.id}:`, {
                originalImage: !!item.originalImage,
                printImage: !!item.printImage,
                displayImage: !!item.displayImage,
                previewImage: !!item.previewImage,
                adminCroppedImage: !!item.adminCroppedImage,
                originalImageSize: item.originalImage ? item.originalImage.length : 0,
                printImageSize: item.printImage ? item.printImage.length : 0,
                adminCroppedImageSize: item.adminCroppedImage ? item.adminCroppedImage.length : 0,
                compressedOriginalSize: compressedImages.originalImage ? compressedImages.originalImage.length : 0,
                compressedPrintSize: compressedImages.printImage ? compressedImages.printImage.length : 0,
                compressedAdminCroppedSize: compressedImages.adminCroppedImage ? compressedImages.adminCroppedImage.length : 0
            });
        } catch (storageError) {
            console.warn('⚠️ Failed to store images in sessionStorage, falling back to window storage:', storageError);
            // Fallback to window storage if sessionStorage fails
            if (typeof window.cartImageStorage === 'undefined') {
                window.cartImageStorage = {};
            }
            window.cartImageStorage[item.id] = fullImageData;
        }
        
        console.log('Current cart:', cart);
        
        // Add the lightweight item to cart
        cart.push(lightweightItem);
        console.log('Updated cart with lightweight item:', cart);
        
        // Save updated cart with better error handling
        try {
            const cartJSON = JSON.stringify(cart);
            sessionStorage.setItem('photoFramingCart', cartJSON);
            console.log('Cart saved to sessionStorage');
        } catch (saveError) {
            console.error('Error saving to sessionStorage:', saveError);
            
            // Check if it's a quota exceeded error
            if (saveError.name === 'QuotaExceededError' || saveError.code === 22) {
                throw new Error('QuotaExceededError');
            } else {
                throw new Error('Failed to save cart to session storage');
            }
        }
        
        // Update cart count
        updateCartCount();
        
        console.log('Item successfully added to cart');
        return true;
        
    } catch (error) {
        console.error('Error adding to cart:', error);
        
        // Show user-friendly error message based on specific error types
        let errorMessage;
        if (error.name === 'QuotaExceededError' || error.code === 22) {
            errorMessage = 'Cart storage is full. Please remove some items and try again.';
        } else if (error.message && error.message.includes('Failed to save cart to local storage')) {
            errorMessage = 'Unable to save to cart. Your browser storage might be full.';
        } else if (error.message && error.message.includes('Invalid item data')) {
            errorMessage = 'Invalid item configuration. Please try customizing your item again.';
        } else if (error.message && error.message.includes('Missing frame size')) {
            errorMessage = 'Please select a frame size before adding to cart.';
        } else {
            errorMessage = 'Error adding item to cart. Please try again.';
        }
            
        alert(errorMessage);
        return false;
    }
}

// Make addToCart globally accessible
window.addToCart = addToCart;

function clearCart() {
    localStorage.removeItem('photoFramingCart');
    renderCartItems();
    updateCartCount();
}

// Cart functionality now handled in initializeEventListeners

// Note: Other cart functionality moved to cart.js for the dedicated cart page

// Add drag hint visibility toggle
let dragTimeout;
if (elements.imageContainer) {
    elements.imageContainer.addEventListener('mousemove', () => {
        const dragHint = document.querySelector('.drag-hint');
        if (dragHint) {
            dragHint.style.opacity = '1';
            
            clearTimeout(dragTimeout);
            dragTimeout = setTimeout(() => {
                dragHint.style.opacity = '0.8';
            }, 2000);
        }
    });
} else {
    console.warn('imageContainer not found, skipping drag hint functionality');
} 

// Debug functions for testing
window.clearCartDebug = function() {
    localStorage.removeItem('photoFramingCart');
    console.log('Cart cleared from localStorage');
    location.reload();
};

window.showCartDebug = function() {
    const cartData = localStorage.getItem('photoFramingCart');
    console.log('Cart data:', cartData);
    if (cartData) {
        try {
            const parsed = JSON.parse(cartData);
            console.log('Parsed cart:', parsed);
            console.log('Cart length:', parsed.length);
        } catch (e) {
            console.error('Error parsing cart:', e);
        }
    } else {
        console.log('No cart data found');
    }
};

// Live Preview Capture Functions
function captureFramePreview() {
    return new Promise((resolve) => {
        try {
            const framePreview = document.querySelector('.frame-preview');
            if (!framePreview) {
                console.log('No frame preview element found');
                resolve(null);
                return;
            }

            const previewImage = document.querySelector('#previewImage');
            if (!previewImage || !previewImage.src || !state.image) {
                console.log('No preview image or image not loaded:', {
                    hasPreviewImage: !!previewImage,
                    hasImageSrc: !!(previewImage && previewImage.src),
                    hasStateImage: !!state.image
                });
                resolve(null);
                return;
            }

            // Create canvas for capturing the frame preview
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Get the frame preview element's dimensions
            const rect = framePreview.getBoundingClientRect();
            
            // Set canvas size to match the visible frame preview
            if (rect.width === 0 || rect.height === 0) {
                console.warn('Frame preview has 0 dimensions (is it hidden?)');
                resolve(null);
                return;
            }
            
            canvas.width = Math.floor(rect.width);
            canvas.height = Math.floor(rect.height);
            
            console.log('Capturing frame preview with dimensions:', {
                width: canvas.width,
                height: canvas.height,
                framePreviewRect: rect
            });

            // Fill with white background first
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Get frame elements
            const frame = framePreview.querySelector('.frame');
            const imageContainer = framePreview.querySelector('.image-container');
            
            if (!frame || !imageContainer) {
                console.log('Missing frame or image container elements');
                resolve(null);
                return;
            }

            // Draw frame background
            const frameColor = state.frameColor || '#8B4513';
            ctx.fillStyle = frameColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Get image container position and size relative to frame preview
            const containerRect = imageContainer.getBoundingClientRect();
            const frameRect = framePreview.getBoundingClientRect();
            
            const containerX = Math.floor(containerRect.left - frameRect.left);
            const containerY = Math.floor(containerRect.top - frameRect.top);
            const containerWidth = Math.floor(containerRect.width);
            const containerHeight = Math.floor(containerRect.height);

            console.log('Container positioning:', {
                containerX,
                containerY, 
                containerWidth,
                containerHeight
            });

            // Draw white background for image area
            ctx.fillStyle = '#ffffff';
            ctx.fillRect(containerX, containerY, containerWidth, containerHeight);

            // Load the image and draw it with current transformations
            const img = new Image();
            img.onload = () => {
                try {
                    // Save context for clipping
                    ctx.save();
                    
                    // Clip to image container bounds
                    ctx.beginPath();
                    ctx.rect(containerX, containerY, containerWidth, containerHeight);
                    ctx.clip();

                    // Calculate image position and size based on current CSS transforms
                    const imgRect = previewImage.getBoundingClientRect();
                    const imgX = Math.floor(imgRect.left - frameRect.left);
                    const imgY = Math.floor(imgRect.top - frameRect.top);
                    const imgWidth = Math.floor(imgRect.width);
                    const imgHeight = Math.floor(imgRect.height);

                    console.log('Drawing image with dimensions:', {
                        imgX, imgY, imgWidth, imgHeight
                    });

                    // Apply CSS filters if any
                    if (state.adjustments) {
                        const { brightness, contrast, highlights, shadows, vibrance } = state.adjustments;
                        // Calculate combined brightness
                        const combinedBrightness = Math.max(1, (brightness / 100) * (highlights / 100) * (shadows / 100));
                        
                        ctx.filter = `
                            brightness(${combinedBrightness})
                            contrast(${contrast}%)
                            saturate(${vibrance}%)
                        `;
                    }

                    // Draw the image at its current position
                    ctx.drawImage(img, imgX, imgY, imgWidth, imgHeight);
                    
                    ctx.restore();

                    // Convert to data URL
                    const dataURL = canvas.toDataURL('image/png', 1.0);
                    // Remove the console.log statement
                    resolve(dataURL);
                    
                } catch (error) {
                    console.error('Error drawing captured frame:', error);
                    resolve(null);
                }
            };

            img.onerror = () => {
                console.error('Error loading image for capture');
                resolve(null);
            };

            img.crossOrigin = 'anonymous';
            img.src = state.image;
            
        } catch (error) {
            console.error('Error in captureFramePreview:', error);
            resolve(null);
        }
    });
}

function overlayFrameOnRoomImages() {
    return new Promise((resolve, reject) => {
        // Add overall timeout to prevent hanging indefinitely
        const overallTimeout = setTimeout(() => {
            console.warn('overlayFrameOnRoomImages timed out after 10 seconds, continuing anyway...');
            resolve();
        }, 10000);
        
        const completeWithCleanup = () => {
            clearTimeout(overallTimeout);
            resolve();
        };
        
        if (!state.image || !state.frameSize) {
            clearTimeout(overallTimeout);
            reject(new Error('No image or frame size selected'));
            return;
        }

        // Capture the current frame preview
        captureFramePreview().then(frameDataURL => {
            if (!frameDataURL) {
                clearTimeout(overallTimeout);
                reject(new Error('Failed to capture frame preview'));
                return;
            }

            console.log('Frame preview captured successfully for room overlay');

            // Get all room slider images
            const roomSlider = document.getElementById('roomSlider');
            if (!roomSlider) {
                console.warn('Room slider not found, skipping overlay');
                completeWithCleanup();
                return;
            }

            const roomImages = roomSlider.querySelectorAll('img');
            console.log(`Applying frame overlay to ${roomImages.length} room images`);
            
            const totalImages = roomImages.length;
            
            if (totalImages === 0) {
                console.warn('No room images found, skipping overlay');
                completeWithCleanup();
                return;
            }
            
            // Pre-load the frame image ONCE for all room images (major optimization)
            const sharedFrameImg = new Image();
            
            // Add timeout for frame image loading
            const frameLoadTimeout = setTimeout(() => {
                console.warn('Frame image load timed out, continuing anyway...');
                completeWithCleanup();
            }, 5000);
            
            sharedFrameImg.onload = () => {
                clearTimeout(frameLoadTimeout);
                console.log('Frame image pre-loaded, processing all room images in parallel...');
                
                // Process all images in parallel using Promise.all
                const imagePromises = Array.from(roomImages).map((roomImg, index) => {
                    return processRoomImageOverlay(roomImg, index, sharedFrameImg);
                });
                
                Promise.all(imagePromises)
                    .then(() => {
                        console.log('All room image overlays completed');
                        completeWithCleanup();
                    })
                    .catch(error => {
                        console.error('Error in parallel image processing:', error);
                        completeWithCleanup(); // Still resolve to not block the flow
                    });
            };
            
            sharedFrameImg.onerror = () => {
                clearTimeout(frameLoadTimeout);
                console.error('Failed to pre-load frame image');
                completeWithCleanup(); // Don't reject, just continue
            };
            
            sharedFrameImg.src = frameDataURL;
            
        }).catch(error => {
            clearTimeout(overallTimeout);
            console.error('Error capturing frame preview:', error);
            resolve(); // Don't reject, just continue
        });
    });
}

// Helper function to process a single room image overlay
function processRoomImageOverlay(roomImg, index, frameImg) {
    return new Promise((resolve) => {
        // Add timeout to prevent hanging - resolve after 3 seconds max
        const timeout = setTimeout(() => {
            console.warn(`Room image ${index} processing timed out, skipping...`);
            resolve();
        }, 3000);
        
        const completeWithCleanup = () => {
            clearTimeout(timeout);
            resolve();
        };
        
        // Skip the fifth image (index === 4) from having frame overlay
        if (index === 4) {
            completeWithCleanup();
            return;
        }

        // Skip if image doesn't exist or is broken
        if (!roomImg.src || roomImg.style.display === 'none') {
            completeWithCleanup();
            return;
        }

        // Store original source for potential restoration
        if (!roomImg.originalSrc) {
            roomImg.originalSrc = roomImg.src;
        }

        // Create a canvas for each room image with the frame overlay
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { 
            alpha: false, 
            willReadFrequently: false,
            desynchronized: true 
        });

        // Process immediately if image is loaded, otherwise wait
        const doProcess = () => {
            try {
                // Set canvas size to match room image (limit max size for performance)
                // OPTIMIZED: Reduced max size for faster processing on mobile
                const maxSize = window.innerWidth <= 768 ? 800 : 1200;
                let width = roomImg.naturalWidth || roomImg.width || 800;
                let height = roomImg.naturalHeight || roomImg.height || 600;
                
                // Scale down if too large
                if (width > maxSize || height > maxSize) {
                    const scale = maxSize / Math.max(width, height);
                    width = Math.round(width * scale);
                    height = Math.round(height * scale);
                }
                
                canvas.width = width;
                canvas.height = height;
                
                // OPTIMIZED: Use medium quality for faster processing
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = window.innerWidth <= 768 ? 'medium' : 'high';

                // Draw the room background image
                ctx.drawImage(roomImg, 0, 0, canvas.width, canvas.height);

                // Calculate frame position
                let frameX, frameY, frameWidth, frameHeight;
                
                // Special positioning for 13x19 portrait on first, second, third, and fourth room images
                if ((index === 0 || index === 1 || index === 2 || index === 3) && state.frameSize && 
                    state.frameSize.size === '13x19' && 
                    state.frameSize.orientation === 'portrait') {
                    
                    const originalImageWidth = 800;
                    const originalImageHeight = 600;
                    
                    const scaleX = canvas.width / originalImageWidth;
                    const scaleY = canvas.height / originalImageHeight;
                    
                    if (index === 0) {
                        frameX = 308 * scaleX;
                        frameY = 48 * scaleY;
                        frameWidth = (506 - 308) * scaleX;
                        frameHeight = (255 - 48) * scaleY;
                    } else if (index === 1) {
                        frameX = 288 * scaleX;
                        frameY = 61 * scaleY;
                        frameWidth = (486 - 288) * scaleX;
                        frameHeight = (268 - 61) * scaleY;
                    } else if (index === 2) {
                        frameX = 404 * scaleX;
                        frameY = 49 * scaleY;
                        frameWidth = (602 - 404) * scaleX;
                        frameHeight = (256 - 49) * scaleY;
                    } else if (index === 3) {
                        frameX = 190 * scaleX;
                        frameY = 63 * scaleY;
                        frameWidth = (401 - 190) * scaleX;
                        frameHeight = (285 - 63) * scaleY;
                    }
                    
                } else if ((index === 0 || index === 1 || index === 2 || index === 3) && state.frameSize && 
                    state.frameSize.size === '13x19' && 
                    state.frameSize.orientation === 'landscape') {
                    
                    const originalImageWidth = 800;
                    const originalImageHeight = 600;
                    
                    const scaleX = canvas.width / originalImageWidth;
                    const scaleY = canvas.height / originalImageHeight;
                    
                    if (index === 0) {
                        frameX = 275 * scaleX;
                        frameY = 64 * scaleY;
                        frameWidth = (565 - 275) * scaleX;
                        frameHeight = (208 - 64) * scaleY;
                    } else if (index === 1) {
                        frameX = 239 * scaleX;
                        frameY = 66 * scaleY;
                        frameWidth = (547 - 239) * scaleX;
                        frameHeight = (218 - 66) * scaleY;
                    } else if (index === 2) {
                        frameX = 252 * scaleX;
                        frameY = 52 * scaleY;
                        frameWidth = (557 - 252) * scaleX;
                        frameHeight = (201 - 52) * scaleY;
                    } else if (index === 3) {
                        frameX = 76 * scaleX;
                        frameY = 68 * scaleY;
                        frameWidth = (416 - 76) * scaleX;
                        frameHeight = (236 - 68) * scaleY;
                    }
                    
                } else if ((index === 0 || index === 1 || index === 2 || index === 3) && state.frameSize && 
                    state.frameSize.size === '13x10' && 
                    state.frameSize.orientation === 'portrait') {
                    
                    const originalImageWidth = 800;
                    const originalImageHeight = 600;
                    
                    const scaleX = canvas.width / originalImageWidth;
                    const scaleY = canvas.height / originalImageHeight;
                    
                    if (index === 0) {
                        frameX = 330 * scaleX;
                        frameY = 76 * scaleY;
                        frameWidth = (485 - 330) * scaleX;
                        frameHeight = (222 - 76) * scaleY;
                    } else if (index === 3) {
                        frameX = 205 * scaleX;
                        frameY = 65 * scaleY;
                        frameWidth = (450 - 205) * scaleX;
                        frameHeight = (296 - 65) * scaleY;
                    }
                    
                } else if ((index === 0 || index === 1 || index === 2 || index === 3) && state.frameSize && 
                    state.frameSize.size === '13x10' && 
                    state.frameSize.orientation === 'landscape') {
                    
                    const originalImageWidth = 800;
                    const originalImageHeight = 600;
                    
                    const scaleX = canvas.width / originalImageWidth;
                    const scaleY = canvas.height / originalImageHeight;
                    
                    if (index === 0) {
                        frameX = 325 * scaleX;
                        frameY = 95 * scaleY;
                        frameWidth = (530 - 325) * scaleX;
                        frameHeight = (210 - 95) * scaleY;
                    } else if (index === 3) {
                        frameX = 179 * scaleX;
                        frameY = 121 * scaleY;
                        frameWidth = (490 - 179) * scaleX;
                        frameHeight = (292 - 121) * scaleY;
                    }
                    
                } else {
                    // Use dynamic scaling for other cases
                    const frameScale = Math.min(0.3, 350 / Math.min(canvas.width, canvas.height));
                    frameWidth = canvas.width * frameScale;
                    frameHeight = frameWidth * (frameImg.height / frameImg.width);
                    
                    // Use index to vary frame position across different room images
                    switch (index % 3) {
                        case 0:
                            frameX = canvas.width * 0.55;
                            frameY = canvas.height * 0.25;
                            break;
                        case 1:
                            frameX = canvas.width * 0.15;
                            frameY = canvas.height * 0.3;
                            break;
                        case 2:
                            frameX = canvas.width * 0.35;
                            frameY = canvas.height * 0.2;
                            break;
                        default:
                            frameX = canvas.width * 0.4;
                            frameY = canvas.height * 0.3;
                    }
                }

                // Draw the frame (frameImg is already loaded, no need to wait)
                ctx.imageSmoothingEnabled = true;
                ctx.imageSmoothingQuality = window.innerWidth <= 768 ? 'medium' : 'high';
                ctx.drawImage(frameImg, frameX, frameY, frameWidth, frameHeight);

                // OPTIMIZED: Use lower JPEG quality on mobile for faster processing
                const jpegQuality = window.innerWidth <= 768 ? 0.75 : 0.85;
                const compositeDataURL = canvas.toDataURL('image/jpeg', jpegQuality);
                roomImg.src = compositeDataURL;
                
                completeWithCleanup();
                
            } catch (error) {
                console.error('Error processing room image:', error);
                completeWithCleanup(); // Still resolve to not block other images
            }
        };

        if (roomImg.complete && roomImg.naturalWidth > 0) {
            doProcess();
        } else {
            roomImg.onload = doProcess;
            roomImg.onerror = () => completeWithCleanup(); // Resolve even on error
        }
    });
}

// Room Preview Slider Functions
function loadRoomPreviewImages(frameSize, orientation) {
    // Handle inconsistent folder naming
    let folderName;
    if (frameSize === '13x10' && orientation === 'portrait') {
        folderName = '13X10  PORTRAIT'; // 2 spaces
    } else {
        folderName = `${frameSize.toUpperCase()} ${orientation.toUpperCase()}`; // 1 space
    }
    
    const imagePaths = [];
    
    // Generate paths for 5 images (1.jpg to 5.jpg)
    for (let i = 1; i <= 5; i++) {
        imagePaths.push(`room-preview-images/${folderName}/${i}.jpg`);
    }
    
    return imagePaths;
}

function initializeRoomSlider(frameSize, orientation) {
    const sliderContainer = document.getElementById('roomSliderContainer');
    let slider = document.getElementById('roomSlider');
    const indicators = document.getElementById('sliderIndicators');
    const defaultPreview = document.getElementById('defaultRoomPreview');
    const slideCounter = document.getElementById('slideCounter');
    const navigationBar = document.querySelector('.room-navigation-bar');
    
    if (!sliderContainer || !slider || !indicators || !defaultPreview) {
        console.warn('Room slider elements not found');
        return;
    }
    
    // Show navigation bar when initializing slider
    if (navigationBar) {
        navigationBar.style.display = 'block';
    }
    
    // Hide default preview and prepare slider with animation
    defaultPreview.style.display = 'none';
    sliderContainer.style.display = 'block';
    
    // Trigger reflow and add visible class for smooth animation
    setTimeout(() => {
        sliderContainer.classList.add('visible');
        if (slideCounter) slideCounter.style.opacity = '1';
    }, 100);
    
    // Load images for the selected frame size
    const imagePaths = loadRoomPreviewImages(frameSize, orientation);
    
    // Update state
    state.roomSlider = {
        ...state.roomSlider,
        images: imagePaths,
        currentIndex: 0,
        frameSize: `${frameSize}-${orientation}`,
        isActive: true
    };
    
    // Update room preview button state since room slider is now active
    if (window.updateRoomPreviewButtonState) {
        setTimeout(() => window.updateRoomPreviewButtonState(), 100);
    }
    
    // Update mobile See Room Preview button state
    if (window.updateMobileSeeRoomPreviewBtn) {
        setTimeout(() => window.updateMobileSeeRoomPreviewBtn(), 100);
    }
    
    // Replace slider node to remove any previously attached touch/click handlers
    // This ensures swipes advance exactly one image per gesture
    if (slider && slider.parentNode) {
        const freshSlider = slider.cloneNode(false); // no children
        slider.parentNode.replaceChild(freshSlider, slider);
        slider = freshSlider;
    }

    // Clear existing content (fresh node is already empty, but keep for safety)
    slider.innerHTML = '';
    indicators.innerHTML = '';
    
    // Initialize arrow button event listeners
    const prevBtn = document.getElementById('roomSliderPrev');
    const nextBtn = document.getElementById('roomSliderNext');
    
    if (prevBtn && nextBtn) {
        // Remove any existing listeners
        prevBtn.removeEventListener('click', prevBtn._roomSliderHandler);
        nextBtn.removeEventListener('click', nextBtn._roomSliderHandler);
        
        // Add new listeners
        prevBtn._roomSliderHandler = () => prevSlide();
        nextBtn._roomSliderHandler = () => nextSlide();
        
        prevBtn.addEventListener('click', prevBtn._roomSliderHandler);
        nextBtn.addEventListener('click', nextBtn._roomSliderHandler);
    }
    
    // Create and add images with simplified loading
    imagePaths.forEach((imagePath, index) => {
        const img = document.createElement('img');
        img.src = imagePath;
        img.alt = `Room Preview ${index + 1} - ${frameSize} ${orientation}`;
        img.className = index === 0 ? 'active' : '';
        img.loading = 'lazy'; // Improve performance
        
        // Simplified error handling
        img.onerror = function() {
            console.warn(`Failed to load room preview image: ${imagePath}`);
            this.style.display = 'none';
            
            // If this was the active image, try to show next available image
            if (index === state.roomSlider.currentIndex) {
                const nextAvailableIndex = findNextAvailableImage(index);
                if (nextAvailableIndex !== -1) {
                    goToSlide(nextAvailableIndex);
                }
            }
        };
        
        // Add load event listener to trigger overlay when image is loaded
        img.onload = function() {
            // If this is the last image loading, trigger the overlay function
            const loadedImages = slider.querySelectorAll('img[src]');
            if (loadedImages.length === imagePaths.length) {
                // Room images are loaded, but overlays will only update when "Update Room Previews" button is clicked
                console.log('Room slider images loaded. Click "Update Room Previews" to apply frame overlay.');
            }
        };
        
        slider.appendChild(img);
        
        // Create indicator dot with enhanced styling
        const dot = document.createElement('div');
        dot.className = `slider-dot ${index === 0 ? 'active' : ''}`;
        dot.setAttribute('data-slide', index);
        dot.setAttribute('title', `View image ${index + 1}`);
        dot.setAttribute('tabindex', '0'); // Make keyboard accessible
        dot.addEventListener('click', () => goToSlide(index));
        dot.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                goToSlide(index);
            }
        });
        indicators.appendChild(dot);
    });
    
    // Update counter and controls
    updateSliderDisplay();
    
    // Enhanced touch/swipe support with better gesture detection
    addTouchSupport(slider);
}

function showDefaultRoomPreview() {
    const sliderContainer = document.getElementById('roomSliderContainer');
    const defaultPreview = document.getElementById('defaultRoomPreview');
    const slideCounter = document.getElementById('slideCounter');
    const navigationBar = document.querySelector('.room-navigation-bar');
    
    if (!sliderContainer || !defaultPreview) return;
    
    // Hide slider with smooth animation
    sliderContainer.classList.remove('visible');
    if (slideCounter) slideCounter.style.opacity = '0';
    
    // Hide navigation bar when showing default preview
    if (navigationBar) {
        navigationBar.style.display = 'none';
    }
    
    setTimeout(() => {
        sliderContainer.style.display = 'none';
        defaultPreview.style.display = 'block';
    }, 500);
    
    // Reset state
    state.roomSlider = {
        images: [],
        currentIndex: 0,
        frameSize: null,
        isActive: false
    };
}

function updateSliderDisplay() {
    const slider = document.getElementById('roomSlider');
    const indicators = document.querySelectorAll('.slider-dot');
    const prevBtn = document.getElementById('roomSliderPrev');
    const nextBtn = document.getElementById('roomSliderNext');
    const currentSlideEl = document.getElementById('currentSlide');
    const totalSlidesEl = document.getElementById('totalSlides');
    
    if (!slider || !state.roomSlider.isActive || state.roomSlider.images.length === 0) return;
    
    // Update images with smooth transition
    const images = slider.querySelectorAll('img');
    images.forEach((img, index) => {
        const isActive = index === state.roomSlider.currentIndex;
        img.classList.toggle('active', isActive);
    });
    
    // Update indicators with animation
    indicators.forEach((dot, index) => {
        dot.classList.toggle('active', index === state.roomSlider.currentIndex);
    });
    
    // Update navigation buttons
    if (prevBtn) {
        prevBtn.disabled = state.roomSlider.currentIndex === 0;
        prevBtn.style.opacity = state.roomSlider.currentIndex === 0 ? '0.4' : '1';
    }
    
    if (nextBtn) {
        nextBtn.disabled = state.roomSlider.currentIndex === state.roomSlider.images.length - 1;
        nextBtn.style.opacity = state.roomSlider.currentIndex === state.roomSlider.images.length - 1 ? '0.4' : '1';
    }
    
    // Update counter
    if (currentSlideEl) currentSlideEl.textContent = state.roomSlider.currentIndex + 1;
    if (totalSlidesEl) totalSlidesEl.textContent = state.roomSlider.images.length;
}

function nextSlide() {
    if (!state.roomSlider.isActive || state.roomSlider.currentIndex >= state.roomSlider.images.length - 1) return;
    
    state.roomSlider.currentIndex++;
    updateSliderDisplay();
}

function prevSlide() {
    if (!state.roomSlider.isActive || state.roomSlider.currentIndex <= 0) return;
    
    state.roomSlider.currentIndex--;
    updateSliderDisplay();
}

function goToSlide(index) {
    if (!state.roomSlider.isActive || index < 0 || index >= state.roomSlider.images.length) return;
    
    state.roomSlider.currentIndex = index;
    updateSliderDisplay();
}

// Helper function to find next available image in case of loading errors
function findNextAvailableImage(startIndex) {
    const slider = document.getElementById('roomSlider');
    if (!slider) return -1;
    
    const images = slider.querySelectorAll('img');
    
    // Try images after the failed one
    for (let i = startIndex + 1; i < images.length; i++) {
        if (images[i].complete && !images[i].style.display.includes('none')) {
            return i;
        }
    }
    
    // Try images before the failed one
    for (let i = 0; i < startIndex; i++) {
        if (images[i].complete && !images[i].style.display.includes('none')) {
            return i;
        }
    }
    
    return -1;
}

// Enhanced touch support with better gesture detection
function addTouchSupport(element) {
    // Prevent duplicate bindings if called multiple times
    if (!element || element._roomTouchAttached) return;
    element._roomTouchAttached = true;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;
    let touchStartTime = 0;
    
    element.addEventListener('touchstart', function(e) {
        const touch = e.changedTouches[0];
        touchStartX = touch.screenX;
        touchStartY = touch.screenY;
        touchStartTime = Date.now();
    }, { passive: true });
    
    element.addEventListener('touchend', function(e) {
        const touch = e.changedTouches[0];
        touchEndX = touch.screenX;
        touchEndY = touch.screenY;
        handleSwipe();
    }, { passive: true });
    
    function handleSwipe() {
        const swipeThreshold = 50;
        const timeThreshold = 300; // Maximum time for a swipe gesture
        const diffX = touchStartX - touchEndX;
        const diffY = Math.abs(touchStartY - touchEndY);
        const timeDiff = Date.now() - touchStartTime;
        
        // Only process horizontal swipes that are quick enough and not too vertical
        if (Math.abs(diffX) > swipeThreshold && diffY < 100 && timeDiff < timeThreshold) {
            if (diffX > 0) {
                nextSlide(); // Swipe left - next slide
            } else {
                prevSlide(); // Swipe right - previous slide
            }
        }
    }
}

// Initialize room slider event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Enhanced keyboard navigation - only active when room slider is visible
    document.addEventListener('keydown', function(e) {
        const sliderContainer = document.getElementById('roomSliderContainer');
        if (!sliderContainer || 
            sliderContainer.style.display === 'none' || 
            !sliderContainer.classList.contains('visible') ||
            !state.roomSlider.isActive) {
            return;
        }
        
        // Prevent default only when we handle the key
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            e.preventDefault();
            
            if (e.key === 'ArrowLeft') {
                prevSlide();
            } else if (e.key === 'ArrowRight') {
                nextSlide();
            }
        }
        
        // Add number key navigation (1-5)
        const numKey = parseInt(e.key);
        if (numKey >= 1 && numKey <= state.roomSlider.images.length) {
            e.preventDefault();
            goToSlide(numKey - 1);
        }
    });
    
    // Initialize with default frame size selection and room preview
    const defaultSizeButton = document.querySelector('.size-options button[data-size="13x19"][data-orientation="portrait"], .desktop-size-btn[data-size="13x19"][data-orientation="portrait"]');
    if (defaultSizeButton) {
        // Visually select the default button
        defaultSizeButton.classList.add('selected');
        
        // Set the default frame size in state
        state.frameSize = {
            size: '13x19',
            orientation: 'portrait'
        };
        
        // Set the default price
        state.price = parseInt(defaultSizeButton.dataset.price) || 349;
        
        // Update price display
        const totalPriceElement = document.getElementById('totalPrice');
        if (totalPriceElement) {
            totalPriceElement.textContent = '₹' + state.price;
        }
        
        // Initialize room slider with default frame size
        initializeRoomSlider('13x19', 'portrait');
    } else {
        // Fallback to default room preview if button not found
        showDefaultRoomPreview();
    }

    // Frame Color Selection - moved inside DOMContentLoaded
    document.querySelectorAll('.color-options button, .desktop-color-btn').forEach(button => {
        button.addEventListener('click', () => {
            // Remove selected class from all buttons
            document.querySelectorAll('.color-options button, .desktop-color-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            
            // Add selected class to clicked button
            button.classList.add('selected');
            
            // Update state with new color
            state.frameColor = button.dataset.color;
            
            // Update frame color
            updateFrameColor();
        });
    });

    // Frame Texture Selection - moved inside DOMContentLoaded
    document.querySelectorAll('.texture-options button, .desktop-texture-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.texture-options button, .desktop-texture-btn').forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            state.frameTexture = button.dataset.texture;
            updateFrameTexture();
        });
    });
});

// Frame Size Selection - moved inside DOMContentLoaded 
document.addEventListener('DOMContentLoaded', function() {
    document.querySelectorAll('.size-options button, .desktop-size-btn').forEach(button => {
        button.addEventListener('click', () => {
            // Remove selected class from all buttons
            document.querySelectorAll('.size-options button, .desktop-size-btn').forEach(btn => {
                btn.classList.remove('selected');
            });
            
            // Add selected class to clicked button
            button.classList.add('selected');
        
        // Update state with new frame size
        state.frameSize = {
            size: button.dataset.size,
            orientation: button.dataset.orientation
        };
        
        // Update frame size immediately to ensure state is consistent
        updateFrameSize();
        
        // Delay room preview slider initialization by 1 second
        setTimeout(() => {
            initializeRoomSlider(button.dataset.size, button.dataset.orientation);
        }, 1000);
        
        // Add animation classes for smooth transition
        const framePreview = document.querySelector('.frame-preview');
        const frameWrapper = document.querySelector('.frame-aspect-wrapper');
        const frame = document.querySelector('.preview-section .frame');
        
        if (framePreview && frameWrapper) {
            // Add transition animation classes
            framePreview.classList.add('frame-transitioning');
            frameWrapper.classList.add('frame-wrapper-transitioning');
            
            // Add morphing animation to the frame itself
            if (frame) {
                frame.classList.add('frame-morphing');
            }
            
            // Remove animation classes after animation completes
            setTimeout(() => {
                framePreview.classList.remove('frame-transitioning');
                frameWrapper.classList.remove('frame-wrapper-transitioning');
                if (frame) {
                    frame.classList.remove('frame-morphing');
                }
            }, 600);
        }
        });
    });
});

// Function to update frame size and recalculate minimum zoom
function updateFrameSize() {
    if (!state.frameSize) return;

    const [width, height] = state.frameSize.size.split('x').map(Number);
    const isLandscape = state.frameSize.orientation === 'landscape';
    
    // Calculate frame dimensions and aspect ratio based on specific requirements
    let frameWidth, frameHeight, aspectRatio, borderDivisor;
    
    if (state.frameSize.size === '13x19') {
        if (isLandscape) {
            // 13x19 Landscape: aspect ratio 19:13, border = breadth/19
            frameWidth = 19;
            frameHeight = 13;
            aspectRatio = 19 / 13;
            borderDivisor = 19;
        } else {
            // 13x19 Portrait: aspect ratio 13:19, border = breadth/13
            frameWidth = 13;
            frameHeight = 19;
            aspectRatio = 13 / 19;
            borderDivisor = 13;
        }
    } else if (state.frameSize.size === '13x10') {
        if (isLandscape) {
            // 13x10 Landscape: aspect ratio 13:10, border = breadth/13
            frameWidth = 13;
            frameHeight = 10;
            aspectRatio = 13 / 10;
            borderDivisor = 13;
        } else {
            // 13x10 Portrait: aspect ratio 10:13, border = breadth/10
            frameWidth = 10;
            frameHeight = 13;
            aspectRatio = 10 / 13;
            borderDivisor = 10;
        }
    }
    
    // Get the frame preview element to use its width for calculations
    const framePreview = document.querySelector('.frame-preview');
    if (!framePreview) return; // Early return if frame preview not found
    
    const previewWidth = framePreview.offsetWidth;
    
    // Calculate border width based on the specific requirements
    // Border width = breadth of the frame / borderDivisor
    const previewHeight = previewWidth / aspectRatio;
    const breadth = Math.min(previewWidth, previewHeight);
    const borderWidth = Math.round(breadth / borderDivisor);
    
    // Ensure minimum border width for visibility on small screens
    const minBorderWidth = window.innerWidth <= 600 ? 6 : 8;
    const finalBorderWidth = Math.max(borderWidth, minBorderWidth);
    
    // Debug information for testing
    console.log(`Frame: ${frameWidth}x${frameHeight} (${aspectRatio.toFixed(2)}), Border: ${finalBorderWidth}px (breadth/${borderDivisor}), Preview: ${previewWidth}x${previewHeight.toFixed(0)}`);
    
    // Get all frame elements and their aspect wrappers
    const frameElements = document.querySelectorAll('.frame');
    const aspectWrappers = document.querySelectorAll('.frame-aspect-wrapper');
    
    // Update aspect wrapper data attributes
    aspectWrappers.forEach(wrapper => {
        wrapper.setAttribute('data-size', state.frameSize.size);
        wrapper.setAttribute('data-orientation', state.frameSize.orientation);
        
        // Force style recalculation by temporarily changing and restoring a property
        const currentDisplay = wrapper.style.display;
        wrapper.style.display = 'none';
        wrapper.offsetHeight; // Trigger reflow
        wrapper.style.display = currentDisplay || '';
        
        // Log the computed aspect ratio
        setTimeout(() => {
            const computedStyle = getComputedStyle(wrapper);
            const actualWidth = wrapper.offsetWidth;
            const actualHeight = wrapper.offsetHeight;
            const actualRatio = actualWidth / actualHeight;
            console.log(`Wrapper: ${state.frameSize.size} ${state.frameSize.orientation}`);
            console.log(`Expected ratio: ${aspectRatio.toFixed(3)}, Actual ratio: ${actualRatio.toFixed(3)}`);
            console.log(`Dimensions: ${actualWidth} × ${actualHeight}`);
            console.log(`Computed aspect-ratio: ${computedStyle.aspectRatio}`);
        }, 100);
    });
    
    frameElements.forEach(frame => {
        // Set data attributes for CSS targeting
        frame.setAttribute('data-size', state.frameSize.size);
        frame.setAttribute('data-orientation', state.frameSize.orientation);
        
        // Clear any conflicting properties - let the wrapper handle aspect ratio
        frame.style.removeProperty('aspect-ratio');
        frame.style.removeProperty('width');
        frame.style.removeProperty('height');
        frame.style.removeProperty('min-width');
        frame.style.removeProperty('min-height');
        frame.style.removeProperty('max-height');
        
        console.log(`Frame size: ${state.frameSize.size}, Orientation: ${state.frameSize.orientation}, Aspect ratio: ${aspectRatio}`);
        
        // Set CSS custom property for dynamic border width
        frame.style.setProperty('--dynamic-border-width', finalBorderWidth + 'px');
        
        // Create inner frame with border
        frame.style.padding = finalBorderWidth + 'px';
        frame.style.backgroundColor = state.frameColor;
        
        // Update image container dimensions to match inner frame dimensions
        const imageContainer = frame.querySelector('.image-container');
        if (imageContainer) {
            // Set the image container to fill the inner space
            imageContainer.style.width = '100%';
            imageContainer.style.height = '100%';
            imageContainer.style.position = 'relative';
            imageContainer.style.left = '0';
            imageContainer.style.top = '0';

            // Recalculate minimum zoom if image is loaded
            if (elements.previewImage.src && elements.previewImage.naturalWidth > 0) {
                const imgWidth = elements.previewImage.naturalWidth;
                const imgHeight = elements.previewImage.naturalHeight;

                // Calculate required zoom based on actual frame dimensions
                const minZoom = calculateRequiredZoom(imgWidth, imgHeight, frameWidth, frameHeight);

                // Update zoom if current zoom is less than minimum
                if (state.zoom < minZoom) {
                    state.zoom = minZoom;
                }
                
                // Avoid resetting position when locked on mobile to prevent scroll-induced shift
                if (!(isMobileViewport() && mobilePositionLocked)) {
                    // Reset position to center when frame size changes
                    state.position = { x: 0, y: 0 };
                }
                updateImageTransform();
            }
        }
    });

    // Update frame preview height based on aspect ratio
    framePreview.style.aspectRatio = aspectRatio;
    framePreview.style.setProperty('aspect-ratio', aspectRatio, 'important');
    framePreview.setAttribute('data-size', state.frameSize.size);
    framePreview.setAttribute('data-orientation', state.frameSize.orientation);
}

// Function to update frame color
function updateFrameColor() {
    const frameElements = document.querySelectorAll('.frame');
    frameElements.forEach(frame => {
        // Update the frame's background color (this creates the frame border effect)
        frame.style.backgroundColor = state.frameColor;
    });
    
    // Update room preview overlays if room slider is active
    // Room preview overlays will only update when "Update Room Previews" button is clicked
    // Removed automatic overlay update for frame color changes to give users control
}

// Function to initialize mobile customization features
    // Step Navigation
    const cards = document.querySelectorAll('.card');
    const stepDots = document.querySelectorAll('.step-dot');
    const nextButtons = document.querySelectorAll('.next-btn');
    const prevButtons = document.querySelectorAll('.prev-btn');
    let currentStep = 1;

    // Initialize - show only first card
    updateStepVisibility();

    // Handle Next button clicks
    nextButtons.forEach(button => {
        button.addEventListener('click', () => {
            // Validate current step
            if (!validateStep(currentStep)) {
                showValidationMessage(currentStep);
                return;
            }
            
            if (currentStep < cards.length) {
                currentStep++;
                updateStepVisibility();
            }
        });
    });

    // Handle Previous button clicks
    prevButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (currentStep > 1) {
                currentStep--;
                updateStepVisibility();
            }
        });
    });

    function updateStepVisibility() {
        // Update cards
        cards.forEach(card => {
            const step = parseInt(card.dataset.step);
            if (step === currentStep) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });

        // Update step indicators
        stepDots.forEach(dot => {
            const step = parseInt(dot.dataset.step);
            if (step === currentStep) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
    }

    function validateStep(step) {
        switch(step) {
            case 1: // Frame Size
                return state.frameSize !== null;
            case 2: // Frame Color
                return state.frameColor !== null;
            case 3: // Frame Texture
                return state.frameTexture !== null;
            case 4: // Image Adjustments
                return true; // Always valid as it has default values
            default:
                return true;
        }
    }

    function showValidationMessage(step) {
        let message = '';
        switch(step) {
            case 1:
                message = 'Please select a frame size to continue';
                break;
            case 2:
                message = 'Please select a frame color to continue';
                break;
            case 3:
                message = 'Please select a frame texture to continue';
                break;
        }
        // You can implement your preferred way of showing the message
        alert(message);
    }

    function enableNextButton(step) {
        const card = document.querySelector(`.card[data-step="${step}"]`);
        const nextBtn = card.querySelector('.next-btn');
        if (nextBtn) {
            nextBtn.disabled = false;
        }
    }

    // Enhanced size selection with validation
    document.querySelectorAll('.size-options button, .desktop-size-btn').forEach(button => {
        button.addEventListener('click', () => {
            // Remove previous selection
            document.querySelectorAll('.size-options button, .desktop-size-btn').forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');

            // Update state and price
            state.frameSize = {
                size: button.dataset.size,
                orientation: button.dataset.orientation,
                price: parseInt(button.dataset.price)
            };
            state.price = state.frameSize.price;
            elements.totalPrice.textContent = `₹${state.price}`;

            // Update frame aspect ratio
            updateFrameSize();
            validateStep(1) && enableNextButton(1);
        });
    });

    // Enhanced color selection with validation
    document.querySelectorAll('.color-options button, .desktop-color-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.color-options button, .desktop-color-btn').forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            
            state.frameColor = button.dataset.color;
            updateFrameColor();
            validateStep(2) && enableNextButton(2);
        });
    });

    // Enhanced texture selection with validation
    document.querySelectorAll('.texture-options button, .desktop-texture-btn').forEach(button => {
        button.addEventListener('click', () => {
            document.querySelectorAll('.texture-options button, .desktop-texture-btn').forEach(btn => btn.classList.remove('selected'));
            button.classList.add('selected');
            
            state.frameTexture = button.dataset.texture;
            elements.frame.dataset.texture = state.frameTexture;
            validateStep(3) && enableNextButton(3);
        });
    });

    // Add zoom button functionality (using existing elements)
    // Note: zoomIn, zoomOut functions are defined elsewhere, and elements are already in the elements object

    if (elements.zoomIn) {
        const handleZoomIn = () => {
            if (!state.image) return;
            
            const zoomSpeed = 0.1;
            state.zoom = Math.min(state.zoom + zoomSpeed, 3);
            
            // Add smooth transition for button zoom
            elements.previewImage.classList.add('smooth-transition');
            updateImageTransform();
            setTimeout(() => elements.previewImage.classList.remove('smooth-transition'), 200);
        };

        // Use ontouchend for better mobile compatibility
        elements.zoomIn.ontouchend = function(e) {
            e.preventDefault();
            e.stopPropagation();
            handleZoomIn();
            return false;
        };
        
        // Keep click for desktop
        elements.zoomIn.onclick = function(e) {
            e.preventDefault();
            handleZoomIn();
            return false;
        };
    }

    if (elements.zoomOut) {
        const handleZoomOut = () => {
            if (!state.image || !state.frameSize) return;
            
            const zoomSpeed = 0.1;
            // Calculate minimum zoom
            const [width, height] = state.frameSize.size.split('x').map(Number);
            const isLandscape = state.frameSize.orientation === 'landscape';
            const frameWidth = isLandscape ? Math.max(width, height) : Math.min(width, height);
            const frameHeight = isLandscape ? Math.min(width, height) : Math.max(width, height);
            const imgWidth = elements.previewImage.naturalWidth;
            const imgHeight = elements.previewImage.naturalHeight;
            const minZoom = calculateRequiredZoom(imgWidth, imgHeight, frameWidth, frameHeight);
            
            state.zoom = Math.max(state.zoom - zoomSpeed, minZoom);
            
            // Add smooth transition for button zoom
            elements.previewImage.classList.add('smooth-transition');
            updateImageTransform();
            setTimeout(() => elements.previewImage.classList.remove('smooth-transition'), 200);
        };

        // Use ontouchend for better mobile compatibility
        zoomOut.ontouchend = function(e) {
            e.preventDefault();
            e.stopPropagation();
            handleZoomOut();
            return false;
        };
        
        // Keep click for desktop
        zoomOut.onclick = function(e) {
            e.preventDefault();
            handleZoomOut();
            return false;
        };
    }

    // Precision zoom functionality with smaller increments - SIMPLIFIED FOR MOBILE
    if (elements.precisionZoomIn) {
        // Function to handle precision zoom in
        const handlePrecisionZoomIn = () => {
            if (!state.image) return;
            
            // Use even smaller increment for mobile devices
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const precisionZoomSpeed = isMobile ? 0.008 : 0.02; // Much smaller increment for mobile
            state.zoom = Math.min(state.zoom + precisionZoomSpeed, 3);
            
            // Add smooth transition for precision zoom
            elements.previewImage.classList.add('smooth-transition');
            updateImageTransform();
            setTimeout(() => elements.previewImage.classList.remove('smooth-transition'), 150);
            if (isMobileViewport()) mobilePositionLocked = true;
        };

        // Use ontouchend instead of addEventListener for better mobile compatibility
        elements.precisionZoomIn.ontouchend = function(e) {
            e.preventDefault();
            e.stopPropagation();
            handlePrecisionZoomIn();
            return false;
        };
        
        // Keep click for desktop
        elements.precisionZoomIn.onclick = function(e) {
            e.preventDefault();
            handlePrecisionZoomIn();
            return false;
        };

        // Additional mobile fallback - direct touch event
        precisionZoomIn.addEventListener('touchstart', function(e) {
            e.preventDefault();
            this.style.transform = 'scale(0.95)';
        }, { passive: false });
        
        precisionZoomIn.addEventListener('touchend', function(e) {
            e.preventDefault();
            this.style.transform = 'scale(1)';
            handlePrecisionZoomIn();
        }, { passive: false });
    }

    if (elements.precisionZoomOut) {
        // Function to handle precision zoom out
        const handlePrecisionZoomOut = () => {
            if (!state.image || !state.frameSize) return;
            
            // Use even smaller increment for mobile devices
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
            const precisionZoomSpeed = isMobile ? 0.008 : 0.02; // Much smaller decrement for mobile
            // Calculate minimum zoom
            const [width, height] = state.frameSize.size.split('x').map(Number);
            const isLandscape = state.frameSize.orientation === 'landscape';
            const frameWidth = isLandscape ? Math.max(width, height) : Math.min(width, height);
            const frameHeight = isLandscape ? Math.min(width, height) : Math.max(width, height);
            const imgWidth = elements.previewImage.naturalWidth;
            const imgHeight = elements.previewImage.naturalHeight;
            const minZoom = calculateRequiredZoom(imgWidth, imgHeight, frameWidth, frameHeight);
            
            state.zoom = Math.max(state.zoom - precisionZoomSpeed, minZoom);
            
            // Add smooth transition for precision zoom
            elements.previewImage.classList.add('smooth-transition');
            updateImageTransform();
            setTimeout(() => elements.previewImage.classList.remove('smooth-transition'), 150);
        };

        // Use ontouchend instead of addEventListener for better mobile compatibility
        elements.precisionZoomOut.ontouchend = function(e) {
            e.preventDefault();
            e.stopPropagation();
            handlePrecisionZoomOut();
            return false;
        };
        
        // Keep click for desktop
        elements.precisionZoomOut.onclick = function(e) {
            e.preventDefault();
            handlePrecisionZoomOut();
            return false;
        };

        // Additional mobile fallback - direct touch event
        precisionZoomOut.addEventListener('touchstart', function(e) {
            e.preventDefault();
            this.style.transform = 'scale(0.95)';
        }, { passive: false });
        
        precisionZoomOut.addEventListener('touchend', function(e) {
            e.preventDefault();
            this.style.transform = 'scale(1)';
            handlePrecisionZoomOut();
        }, { passive: false });
    }

    // Add keyboard shortcuts for precision zooming
    document.addEventListener('keydown', (e) => {
        if (!state.image) return;
        
        // Only activate when not typing in inputs
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        
        // Ctrl/Cmd + Shift + Plus for precision zoom in
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === '+' || e.key === '=')) {
            e.preventDefault();
            if (precisionZoomIn) precisionZoomIn.click();
        }
        
        // Ctrl/Cmd + Shift + Minus for precision zoom out
        if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === '-') {
            e.preventDefault();
            if (elements.precisionZoomOut) elements.precisionZoomOut.click();
        }
    });

// Add window resize handler to update frame size calculations
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (state.frameSize) {
            updateFrameSize();
            
            // Force aspect ratio update after resize
            const frameElements = document.querySelectorAll('.frame');
            frameElements.forEach(frame => {
                if (frame.hasAttribute('data-size') && frame.hasAttribute('data-orientation')) {
                    const size = frame.getAttribute('data-size');
                    const orientation = frame.getAttribute('data-orientation');
                    
                    let aspectRatio;
                    if (size === '13x19') {
                        aspectRatio = orientation === 'landscape' ? '19/13' : '13/19';
                    } else if (size === '13x10') {
                        aspectRatio = orientation === 'landscape' ? '13/10' : '10/13';
                    }
                    
                    if (aspectRatio) {
                        frame.style.setProperty('aspect-ratio', aspectRatio, 'important');
                    }
                }
            });
        }
    }, 100);
});

// Initialize frame dimensions on page load
window.addEventListener('load', () => {
    // Ensure upload section is visible and preview section is hidden by default
    const uploadSection = document.getElementById('uploadSection');
    const previewSection = document.getElementById('previewSection');
    
    if (uploadSection) {
        uploadSection.classList.remove('hidden');
        console.log('Upload section made visible');
    }
    if (previewSection) {
        previewSection.classList.add('hidden');
        console.log('Preview section hidden');
    }
    
    // Set default frame size if none selected
    if (!state.frameSize) {
        const firstSizeButton = document.querySelector('.size-options button, .desktop-size-btn');
        if (firstSizeButton) {
            firstSizeButton.click();
        }
    }
});

// Recalculate frame dimensions on window resize with improved throttling
let resizeThrottleTimeout;

window.addEventListener('resize', () => {
    // Immediate response for better UX
    if (!resizeThrottleTimeout) {
        resizeThrottleTimeout = setTimeout(() => {
            resizeThrottleTimeout = null;
        }, 16); // ~60fps throttle
        
        if (state.frameSize) {
            updateFrameSize();
            // Recalculate boundaries for current image
            if (state.image && elements.previewImage) {
                const container = elements.imageContainer.getBoundingClientRect();
                const imageWidth = elements.previewImage.naturalWidth * state.zoom;
                const imageHeight = elements.previewImage.naturalHeight * state.zoom;
                
                const maxX = Math.max(0, (imageWidth - container.width) / 2);
                const maxY = Math.max(0, (imageHeight - container.height) / 2);

                // Constrain current position to new boundaries (skip when locked on mobile to avoid scroll-induced shifts)
                if (!(isMobileViewport() && mobilePositionLocked)) {
                    state.position.x = Math.max(Math.min(state.position.x, maxX), -maxX);
                    state.position.y = Math.max(Math.min(state.position.y, maxY), -maxY);
                }
                
                updateImageTransform();
            }
        }
    }
    
    // Debounced final update
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        if (state.frameSize) {
            updateFrameSize();
            if (state.image) {
                // Avoid incidental position jumps when locked on mobile
                updateImageTransform();
            }
        }
    }, 100);
});

// Global functions for onclick handlers (fallback for mobile)
window.handleZoomInClick = function() {
    console.log('Zoom In clicked'); // Debug log
    if (!state.image) return;
    const zoomSpeed = 0.1;
    state.zoom = Math.min(state.zoom + zoomSpeed, 3);
    elements.previewImage.classList.add('smooth-transition');
    updateImageTransform();
    setTimeout(() => elements.previewImage.classList.remove('smooth-transition'), 200);
};

window.handleZoomOutClick = function() {
    console.log('Zoom Out clicked'); // Debug log
    if (!state.image || !state.frameSize) return;
    const zoomSpeed = 0.1;
    const [width, height] = state.frameSize.size.split('x').map(Number);
    const isLandscape = state.frameSize.orientation === 'landscape';
    const frameWidth = isLandscape ? Math.max(width, height) : Math.min(width, height);
    const frameHeight = isLandscape ? Math.min(width, height) : Math.max(width, height);
    const imgWidth = elements.previewImage.naturalWidth;
    const imgHeight = elements.previewImage.naturalHeight;
    const minZoom = calculateRequiredZoom(imgWidth, imgHeight, frameWidth, frameHeight);
    state.zoom = Math.max(state.zoom - zoomSpeed, minZoom);
    elements.previewImage.classList.add('smooth-transition');
    updateImageTransform();
    setTimeout(() => elements.previewImage.classList.remove('smooth-transition'), 200);
};

window.handlePrecisionZoomInClick = function() {
    console.log('Precision Zoom In clicked'); // Debug log
    if (!state.image) return;
    const precisionZoomSpeed = 0.02;
    state.zoom = Math.min(state.zoom + precisionZoomSpeed, 3);
    elements.previewImage.classList.add('smooth-transition');
    updateImageTransform();
    setTimeout(() => elements.previewImage.classList.remove('smooth-transition'), 150);
};

window.handlePrecisionZoomOutClick = function() {
    console.log('Precision Zoom Out clicked'); // Debug log
    if (!state.image || !state.frameSize) return;
    const precisionZoomSpeed = 0.02;
    const [width, height] = state.frameSize.size.split('x').map(Number);
    const isLandscape = state.frameSize.orientation === 'landscape';
    const frameWidth = isLandscape ? Math.max(width, height) : Math.min(width, height);
    const frameHeight = isLandscape ? Math.min(width, height) : Math.max(width, height);
    const imgWidth = elements.previewImage.naturalWidth;
    const imgHeight = elements.previewImage.naturalHeight;
    const minZoom = calculateRequiredZoom(imgWidth, imgHeight, frameWidth, frameHeight);
    state.zoom = Math.max(state.zoom - precisionZoomSpeed, minZoom);
    elements.previewImage.classList.add('smooth-transition');
    updateImageTransform();
    setTimeout(() => elements.previewImage.classList.remove('smooth-transition'), 150);
};

// Mobile Customization Bar Functionality
document.addEventListener('DOMContentLoaded', function() {
    initializeMobileCustomization();
    
    // Initialize Update Room Previews button
    const updateRoomPreviewsBtn = document.getElementById('updateRoomPreviews');
    const mobileUpdateRoomPreviewsBtn = document.getElementById('mobileUpdateRoomPreviews');
    if (updateRoomPreviewsBtn || mobileUpdateRoomPreviewsBtn) {
        console.log('✅ Update Room Previews button found and initializing...');
        
        // Function to update button state based on conditions
        function updateButtonState() {
            const hasImage = !!(state.image);
            const hasActiveRoomSlider = !!(state.roomSlider && state.roomSlider.isActive);
            const isReady = hasImage && hasActiveRoomSlider;
            
            const targets = [updateRoomPreviewsBtn, mobileUpdateRoomPreviewsBtn].filter(Boolean);
            targets.forEach(btn => {
                if (isReady) {
                    btn.style.opacity = '1';
                    btn.style.cursor = 'pointer';
                    btn.title = 'Click to update room preview images with current live preview';
                    btn.disabled = false;
                } else {
                    btn.style.opacity = '0.6';
                    btn.style.cursor = 'not-allowed';
                    const reasons = [];
                    if (!hasImage) reasons.push('upload an image');
                    if (!hasActiveRoomSlider) reasons.push('select a frame size');
                    btn.title = `Please ${reasons.join(' and ')} first`;
                    btn.disabled = true;
                }
            });
        }
        
        // Make the button state update function globally accessible
        window.updateRoomPreviewButtonState = updateButtonState;
        
        // Update button state initially
        updateButtonState();
        
        // Add click event listener
        const handleClick = (btn) => {
            console.log('🎯 Update Room Previews button clicked!');
            
            if (state.image && state.roomSlider && state.roomSlider.isActive) {
                console.log('✅ Conditions met, starting room preview update...');
                
                // Show loading feedback with better styling
                const originalText = btn.textContent;
                btn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Updating...';
                btn.disabled = true;
                btn.style.background = '#6c757d';
                btn.style.opacity = '1';
                
                console.log('Updating room previews with current live preview...');
                
                // Capture and apply the current live preview to all room images
                overlayFrameOnRoomImages().then(() => {
                    console.log('✅ Room previews updated successfully!');
                    // Reset button with success feedback
                    setTimeout(() => {
                        btn.innerHTML = '<i class="fas fa-check"></i> Updated!';
                        btn.style.background = '#28a745';
                        
                        // Reset to original state after showing success
                        setTimeout(() => {
                            btn.innerHTML = originalText;
                            btn.style.background = '#82C0CC';
                            btn.disabled = false;
                            updateButtonState(); // Restore proper state
                        }, 1500);
                    }, 500);
                }).catch((error) => {
                    console.error('❌ Error updating room previews:', error);
                    // Reset button with error feedback
                    btn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
                    btn.style.background = '#dc3545';
                    
                    setTimeout(() => {
                        btn.innerHTML = originalText;
                        btn.style.background = '#82C0CC';
                        btn.disabled = false;
                        updateButtonState(); // Restore proper state
                    }, 2000);
                });
            } else {
                // Show helpful message for when button can't be used
                const reasons = [];
                if (!state.image) reasons.push('upload an image');
                if (!state.roomSlider || !state.roomSlider.isActive) reasons.push('select a frame size');
                
                console.log(`⚠️ Button clicked but conditions not met. Missing: ${reasons.join(', ')}`);
                
                // Enhanced alert with more helpful information
                alert(`Update Room Previews Button\n\nTo use this button, you need to:\n\n${reasons.map(r => `• ${r.charAt(0).toUpperCase() + r.slice(1)}`).join('\n')}\n\nOnce you've completed these steps, the button will capture your current live preview (with all your customizations) and apply it to all room preview images.`);
            }
        };
        if (updateRoomPreviewsBtn) updateRoomPreviewsBtn.addEventListener('click', () => handleClick(updateRoomPreviewsBtn));
        if (mobileUpdateRoomPreviewsBtn) mobileUpdateRoomPreviewsBtn.addEventListener('click', () => handleClick(mobileUpdateRoomPreviewsBtn));
        
        console.log('✅ Update Room Previews button event listener attached');
    } else {
        console.error('❌ Update Room Previews button not found in DOM!');
    }
    
    // Handle window resize to show/hide mobile section appropriately
    window.addEventListener('resize', () => {
        const mobileSection = document.getElementById('mobileCustomizationSection');
        if (mobileSection) {
            if (window.innerWidth <= 600 && state.image) {
                mobileSection.style.display = 'block';
            } else {
                mobileSection.style.display = 'none';
            }
        }
    });
});

function initializeMobileCustomization() {
    // Mobile Size Options
    document.querySelectorAll('.mobile-size-btn').forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all mobile size buttons
            document.querySelectorAll('.mobile-size-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Update state
            state.frameSize = {
                size: button.dataset.size,
                orientation: button.dataset.orientation
            };
            
            // Initialize room preview slider for the selected frame size
            initializeRoomSlider(button.dataset.size, button.dataset.orientation);
            
            // Update price
            state.price = parseInt(button.dataset.price);
            updateMobileTotalPrice();
            
            // Update frame size
            updateFrameSize();
            
            // Sync with desktop options
            syncMobileToDesktop('size', button);
            
            // Automatically trigger "Update Room Previews" functionality after frame size change
            setTimeout(() => {
                console.log('🎯 Auto-triggering room preview update after mobile frame size change...');
                
                // Check if conditions are met (same logic as updateRoomPreviewsClick)
                const hasImage = !!(state.image);
                const hasActiveRoomSlider = !!(state.roomSlider && state.roomSlider.isActive);
                
                if (hasImage && hasActiveRoomSlider) {
                    console.log('✅ Auto-updating room previews with new frame size (mobile)...');
                    
                    // Call the overlay function directly (same as updateRoomPreviewsClick but without UI feedback)
                    if (typeof overlayFrameOnRoomImages === 'function') {
                        overlayFrameOnRoomImages().then(() => {
                            console.log('✅ Room previews auto-updated successfully after mobile frame size change!');
                        }).catch((error) => {
                            console.error('❌ Error auto-updating room previews (mobile):', error);
                        });
                    } else {
                        console.log('⚠️ overlayFrameOnRoomImages function not available for mobile auto-update');
                    }
                } else {
                    console.log('⚠️ Mobile auto-update skipped - conditions not met (image:', hasImage, ', room slider:', hasActiveRoomSlider, ')');
                }
            }, 1000); // Wait 1 second for room slider to initialize
        });
    });

    // Mobile Color Options
    document.querySelectorAll('.mobile-color-btn').forEach(button => {
        button.addEventListener('click', () => {
            console.log('Mobile frame color button clicked:', button.dataset.color);
            
            // Remove active class from all mobile color buttons
            document.querySelectorAll('.mobile-color-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Update state
            state.frameColor = button.dataset.color;
            
            // Update frame color
            updateFrameColor();
            
            // Sync with desktop options
            syncMobileToDesktop('color', button);
            
            // Automatically trigger "Update Room Previews" functionality after mobile frame color change
            setTimeout(() => {
                console.log('🎯 Auto-triggering room preview update after mobile frame color change...');
                
                // Check if conditions are met (same logic as updateRoomPreviewsClick)
                const hasImage = !!(state.image);
                const hasActiveRoomSlider = !!(state.roomSlider && state.roomSlider.isActive);
                
                if (hasImage && hasActiveRoomSlider) {
                    console.log('✅ Auto-updating room previews with new frame color (mobile)...');
                    
                    // Call the overlay function directly (same as updateRoomPreviewsClick but without UI feedback)
                    if (typeof overlayFrameOnRoomImages === 'function') {
                        overlayFrameOnRoomImages().then(() => {
                            console.log('✅ Room previews auto-updated successfully after mobile frame color change!');
                        }).catch((error) => {
                            console.error('❌ Error auto-updating room previews after mobile color change:', error);
                        });
                    } else {
                        console.log('⚠️ overlayFrameOnRoomImages function not available for mobile color auto-update');
                    }
                } else {
                    console.log('⚠️ Mobile color auto-update skipped - conditions not met (image:', hasImage, ', room slider:', hasActiveRoomSlider, ')');
                }
            }, 500); // Wait 500ms for frame color update to complete
        });
    });

    // Mobile Texture Options
    document.querySelectorAll('.mobile-texture-btn').forEach(button => {
        button.addEventListener('click', () => {
            // Remove active class from all mobile texture buttons
            document.querySelectorAll('.mobile-texture-btn').forEach(btn => {
                btn.classList.remove('active');
            });
            
            // Add active class to clicked button
            button.classList.add('active');
            
            // Update state
            state.frameTexture = button.dataset.texture;
            elements.frame.dataset.texture = state.frameTexture;
            
            // Sync with desktop options
            syncMobileToDesktop('texture', button);
        });
    });

    // Mobile Sliders
    ['mobileBrightness', 'mobileContrast', 'mobileHighlights', 'mobileShadows', 'mobileVibrance'].forEach(sliderId => {
        const slider = document.getElementById(sliderId);
        if (slider) {
            slider.addEventListener('input', (e) => {
                const adjustmentType = sliderId.replace('mobile', '').toLowerCase();
                console.log('Mobile adjustment slider changed:', adjustmentType, 'to', e.target.value);
                
                state.adjustments[adjustmentType] = parseInt(e.target.value);
                updateImageFilters();
                
                // Sync with desktop sliders
                const desktopSlider = document.getElementById(adjustmentType);
                if (desktopSlider) {
                    desktopSlider.value = e.target.value;
                }
                
                // Automatically trigger "Update Room Previews" functionality after mobile adjustment change
                clearTimeout(window.mobileAdjustmentUpdateTimeout); // Clear any existing timeout to prevent multiple rapid updates
                window.mobileAdjustmentUpdateTimeout = setTimeout(() => {
                    console.log('🎯 Auto-triggering room preview update after mobile adjustment change:', adjustmentType);
                    
                    // Check if conditions are met (same logic as updateRoomPreviewsClick)
                    const hasImage = !!(state.image);
                    const hasActiveRoomSlider = !!(state.roomSlider && state.roomSlider.isActive);
                    
                    if (hasImage && hasActiveRoomSlider) {
                        console.log('✅ Auto-updating room previews with new mobile adjustment:', adjustmentType);
                        
                        // Call the overlay function directly (same as updateRoomPreviewsClick but without UI feedback)
                        if (typeof overlayFrameOnRoomImages === 'function') {
                            overlayFrameOnRoomImages().then(() => {
                                console.log('✅ Room previews auto-updated successfully after mobile adjustment change:', adjustmentType);
                            }).catch((error) => {
                                console.error('❌ Error auto-updating room previews after mobile adjustment change:', error);
                            });
                        } else {
                            console.log('⚠️ overlayFrameOnRoomImages function not available for mobile adjustment auto-update');
                        }
                    } else {
                        console.log('⚠️ Mobile adjustment auto-update skipped - conditions not met (image:', hasImage, ', room slider:', hasActiveRoomSlider, ')');
                    }
                }, 800); // Wait 800ms after user stops adjusting to prevent too many rapid updates
            });
        }
    });

    // Mobile Add to Cart
    const mobileAddToCartBtn = document.getElementById('mobileAddToCart');
    if (mobileAddToCartBtn) {
        mobileAddToCartBtn.addEventListener('click', async () => {
            if (state.image && state.frameSize) {
                // Show loading state
                mobileAddToCartBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                mobileAddToCartBtn.disabled = true;
                
                try {
                    // Capture both the print image and live preview screenshot
                    console.log('Mobile: Starting image capture...');
                    const [printImageData, previewImageData] = await Promise.all([
                        captureFramedImage(),
                        captureFramePreview() // Use the exact live preview capture function
                    ]);
                    console.log('Mobile: Image capture completed:', {
                        printImageCaptured: !!printImageData,
                        previewImageCaptured: !!previewImageData,
                        printImageSize: printImageData ? printImageData.length : 0,
                        previewImageSize: previewImageData ? previewImageData.length : 0
                    });
                    
                    // If preview capture failed, use the print image as fallback
                    const finalPreviewImage = previewImageData || printImageData;
                    
                    console.log('Mobile - Print-ready image captured:', printImageData ? 'Success' : 'Failed');
                    console.log('Mobile - Preview image captured:', previewImageData ? 'Success' : 'Failed');
                    
                    // Create cart item object with all customizations
                    const cartItem = {
                        id: Date.now(),
                        // Image that will be sent for printing (cropped with all adjustments)
                        printImage: printImageData, 
                        // Live preview screenshot for display in cart (with frame borders)
                        previewImage: finalPreviewImage,
                        // Also set displayImage for downstream consumers expecting this key
                        displayImage: finalPreviewImage,
                        // Frame specifications
                        frameSize: state.frameSize,
                        frameColor: state.frameColor || '#8B4513',
                        frameTexture: state.frameTexture || 'wood',
                        // Image adjustments applied
                        adjustments: { ...state.adjustments },
                        // Position and zoom settings
                        position: { ...state.position },
                        zoom: state.zoom,
                        // Pricing
                        price: state.price || 349,
                        // Timestamp for order tracking
                        timestamp: new Date().toISOString()
                    };

                    addToCart(cartItem);
                    
                    // Add success animation
                    mobileAddToCartBtn.classList.add('success');
                    mobileAddToCartBtn.innerHTML = '<i class="fas fa-check"></i> Added to Cart!';
                    
                    setTimeout(() => {
                        mobileAddToCartBtn.classList.remove('success');
                        mobileAddToCartBtn.innerHTML = '<i class="fas fa-shopping-cart"></i><span>Add to Cart</span>';
                        mobileAddToCartBtn.disabled = false;
                    }, 2000);
                    
                } catch (error) {
                    console.error('Error adding to cart:', error);
                    mobileAddToCartBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
                    setTimeout(() => {
                        mobileAddToCartBtn.innerHTML = '<i class="fas fa-shopping-cart"></i><span>Add to Cart</span>';
                        mobileAddToCartBtn.disabled = false;
                    }, 2000);
                }
            }
        });
    }

    // Initialize default selections
    initializeMobileDefaults();
}

function syncMobileToDesktop(optionType, mobileButton) {
    // Find corresponding desktop button and sync selection
    let desktopSelector = '';
    let dataAttribute = '';
    
    switch(optionType) {
        case 'size':
            desktopSelector = '.size-options button, .desktop-size-btn';
            dataAttribute = 'data-size';
            break;
        case 'color':
            desktopSelector = '.color-options button, .desktop-color-btn';
            dataAttribute = 'data-color';
            break;
        case 'texture':
            desktopSelector = '.texture-options button, .desktop-texture-btn';
            dataAttribute = 'data-texture';
            break;
    }
    
    if (desktopSelector && dataAttribute) {
        // Remove selected class from all desktop buttons
        document.querySelectorAll(desktopSelector).forEach(btn => {
            btn.classList.remove('selected');
        });
        
        // Find and select corresponding desktop button
        const value = mobileButton.dataset[dataAttribute.replace('data-', '')];
        let desktopButton;
        
        if (optionType === 'size') {
            const orientation = mobileButton.dataset.orientation;
            desktopButton = document.querySelector(`${desktopSelector}[${dataAttribute}="${value}"][data-orientation="${orientation}"]`);
        } else {
            desktopButton = document.querySelector(`${desktopSelector}[${dataAttribute}="${value}"]`);
        }
        
        if (desktopButton) {
            desktopButton.classList.add('selected');
        }
    }
}

function updateMobileTotalPrice() {
    const mobileTotalPriceElement = document.getElementById('mobileTotalPrice');
    if (mobileTotalPriceElement) {
        mobileTotalPriceElement.textContent = '₹' + state.price;
    }
    
    // Enable/disable mobile add to cart button
    const mobileAddToCartBtn = document.getElementById('mobileAddToCart');
    if (mobileAddToCartBtn) {
        mobileAddToCartBtn.disabled = !(state.image && state.frameSize);
    }
}

function initializeMobileDefaults() {
    // Set default size selection (first option)
    const firstSizeBtn = document.querySelector('.mobile-size-btn');
    if (firstSizeBtn) {
        firstSizeBtn.click();
    }
    
    // Set default color selection (black)
    const blackColorBtn = document.querySelector('.mobile-color-btn[data-color="black"]');
    if (blackColorBtn) {
        blackColorBtn.click();
    }
    
    // Set default texture selection (smooth)
    const smoothTextureBtn = document.querySelector('.mobile-texture-btn[data-texture="smooth"]');
    if (smoothTextureBtn) {
        smoothTextureBtn.click();
    }
    
    // Initialize mobile sliders with default values
    syncMobileSlidersWithState();
}

function syncMobileSlidersWithState() {
    // Sync all mobile sliders with current state values
    const adjustmentTypes = ['brightness', 'contrast', 'highlights', 'shadows', 'vibrance'];
    
    adjustmentTypes.forEach(type => {
        const mobileSlider = document.getElementById('mobile' + type.charAt(0).toUpperCase() + type.slice(1));
        if (mobileSlider && state.adjustments[type] !== undefined) {
            mobileSlider.value = state.adjustments[type];
        }
    });
}

// Mobile Header Hide/Show on Scroll
(function() {
    let lastScrollTop = 0;
    let scrollTimeout;
    const header = document.querySelector('.site-header');
    const scrollThreshold = 10; // Minimum scroll distance to trigger hide/show
    
    function handleScroll() {
        // Only apply this behavior on mobile devices
        if (window.innerWidth > 600) {
            header.classList.remove('hidden');
            return;
        }
        
        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Clear existing timeout
        if (scrollTimeout) {
            clearTimeout(scrollTimeout);
        }
        
        // If scrolled enough distance
        if (Math.abs(currentScrollTop - lastScrollTop) > scrollThreshold) {
            if (currentScrollTop > lastScrollTop && currentScrollTop > 50) {
                // Scrolling down - hide header
                header.classList.add('hidden');
            } else {
                // Scrolling up - show header
                header.classList.remove('hidden');
            }
            
            lastScrollTop = currentScrollTop;
        }
        
        // Always show header when at top of page
        if (currentScrollTop <= 10) {
            header.classList.remove('hidden');
        }
        
        // Add a small delay to prevent too frequent updates
        scrollTimeout = setTimeout(() => {
            // Additional check for when scrolling stops
            if (currentScrollTop <= 10) {
                header.classList.remove('hidden');
            }
        }, 150);
    }
    
    // Add scroll event listener
    window.addEventListener('scroll', handleScroll, { passive: true });
    
    // Handle window resize to reset header state
    window.addEventListener('resize', () => {
        if (window.innerWidth > 600) {
            header.classList.remove('hidden');
        }
    });
    
    // Make necessary objects globally accessible for debugging and button functionality
    window.state = state;
    window.captureFramePreview = captureFramePreview;
    window.overlayFrameOnRoomImages = overlayFrameOnRoomImages;
    
    // Removed duplicate late-initialization block for Update Room Previews button
    
})();

// 🎯 UPDATE ROOM PREVIEWS BUTTON - Direct onclick handler (working solution)
function updateRoomPreviewsClick() {
    console.log('🎯 Update Room Previews button clicked!');
    
    // Check if conditions are met
    const hasImage = !!(state.image);
    const hasActiveRoomSlider = !!(state.roomSlider && state.roomSlider.isActive);
    
    if (hasImage && hasActiveRoomSlider) {
        console.log('✅ Conditions met, starting room preview update...');
        
        const updateBtn = document.getElementById('updateRoomPreviews');
        if (updateBtn) {
            // Show loading feedback
            const originalText = updateBtn.textContent;
            updateBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Updating...';
            updateBtn.disabled = true;
            updateBtn.style.background = '#6c757d';
            updateBtn.style.opacity = '1';
            
            console.log('Updating room previews with current live preview...');
            
            // Call the overlay function
            overlayFrameOnRoomImages().then(() => {
                console.log('✅ Room previews updated successfully!');
                // Show success feedback
                updateBtn.innerHTML = '<i class="fas fa-check"></i> Updated!';
                updateBtn.style.background = '#28a745';
                
                // Reset to original state after showing success
                setTimeout(() => {
                    updateBtn.innerHTML = originalText;
                    updateBtn.style.background = '#82C0CC';
                    updateBtn.disabled = false;
                    updateBtn.style.opacity = '1';
                }, 1500);
            }).catch((error) => {
                console.error('❌ Error updating room previews:', error);
                // Show error feedback
                updateBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
                updateBtn.style.background = '#dc3545';
                
                setTimeout(() => {
                    updateBtn.innerHTML = originalText;
                    updateBtn.style.background = '#82C0CC';
                    updateBtn.disabled = false;
                    updateBtn.style.opacity = '1';
                }, 2000);
            });
        }
    } else {
        // Show helpful message for when button can't be used
        const reasons = [];
        if (!hasImage) reasons.push('upload an image');
        if (!hasActiveRoomSlider) reasons.push('select a frame size');
        
        console.log(`⚠️ Button clicked but conditions not met. Missing: ${reasons.join(', ')}`);
        alert(`Please ${reasons.join(' and ')} first to update room previews.`);
    }
}

// ===========================
// MOBILE ROOM PREVIEW PAGE
// ===========================

function initMobileRoomPreview() {
    console.log('📱 initMobileRoomPreview called');
    
    const mobileSeeRoomPreviewBtn = document.getElementById('mobileSeeRoomPreview');
    const mobileRoomPreviewPage = document.getElementById('mobileRoomPreviewPage');
    const backToEditBtn = document.getElementById('backToEdit');
    const mobileRoomAddToCartBtn = document.getElementById('mobileRoomAddToCart');
    const container = document.getElementById('mainCustomizeContainer') || document.querySelector('.container');
    
    console.log('📱 Elements found:', {
        mobileSeeRoomPreviewBtn: !!mobileSeeRoomPreviewBtn,
        mobileRoomPreviewPage: !!mobileRoomPreviewPage,
        backToEditBtn: !!backToEditBtn,
        container: !!container
    });
    
    if (!mobileSeeRoomPreviewBtn || !mobileRoomPreviewPage) {
        console.warn('📱 initMobileRoomPreview: Required elements not found, exiting');
        return;
    }
    
    console.log('📱 Setting up See Room Preview button click handler...');
    
    // Update See Room Preview button state - always enabled, validation happens on click
    function updateMobileSeeRoomPreviewBtn() {
        // Button is always enabled - we validate on click instead
        if (mobileSeeRoomPreviewBtn) {
            mobileSeeRoomPreviewBtn.disabled = false;
        }
    }
    
    // Call this when image is loaded or frame size changes
    window.updateMobileSeeRoomPreviewBtn = updateMobileSeeRoomPreviewBtn;
    
    // Enable the button immediately
    updateMobileSeeRoomPreviewBtn();
    
    // See Room Preview button click
    if (mobileSeeRoomPreviewBtn) {
        console.log('📱 Adding click event listener to See Room Preview button');
        mobileSeeRoomPreviewBtn.addEventListener('click', async function(e) {
            e.preventDefault();
            e.stopPropagation();
            console.log('📱 See Room Preview button clicked');
            
            if (!state.image || !state.frameSize) {
                alert('Please upload an image and select a frame size first.');
                return;
            }
            
            console.log('📱 State check passed, proceeding with room preview...');

            // Hide bottom customization bar if it exists (use ID for specificity)
            const bottomBar = document.getElementById('mobileBottomBar') || document.querySelector('.mobile-bottom-bar');
            if (bottomBar) {
                bottomBar.style.setProperty('display', 'none', 'important');
            }
            
            // Also hide the dropup if open
            const dropup = document.getElementById('mobileDropup');
            if (dropup) {
                dropup.classList.remove('open');
                dropup.style.setProperty('display', 'none', 'important');
            }

            // Hide any other potential floating elements
            const adjustmentsContainer = document.querySelector('.mobile-adjustments-container');
            if (adjustmentsContainer) {
                adjustmentsContainer.style.setProperty('display', 'none', 'important');
            }
            
            // Show loading state
            mobileSeeRoomPreviewBtn.innerHTML = '<i class=\"fas fa-spinner fa-spin\"></i> Generating Preview...';
            mobileSeeRoomPreviewBtn.disabled = true;
            
            // Define finishMobileRoomPreview BEFORE using it
            const finishMobileRoomPreview = () => {
                console.log('📱 finishMobileRoomPreview called');
                
                // Load room images into mobile view
                loadMobileRoomImages();
                
                // Update specs display
                updateMobileSpecs();
                
                // Hide main container and show mobile room preview page
                console.log('📱 Switching to room preview mode. Container:', container, 'mobileRoomPreviewPage:', mobileRoomPreviewPage);
                if (container) {
                    container.style.display = 'none';
                    console.log('📱 Main container hidden');
                }
                if (mobileRoomPreviewPage) {
                    mobileRoomPreviewPage.style.display = 'block';
                    console.log('📱 Mobile room preview page shown');
                }
                document.body.classList.add('room-preview-active');
                
                // Explicitly hide bottom bar and close drawers to ensure they don't overlap
                const bottomBarEl = document.getElementById('mobileBottomBar');
                if (bottomBarEl) bottomBarEl.style.display = 'none';
                
                const mobileDropup = document.getElementById('mobileDropup');
                if (mobileDropup) {
                    mobileDropup.classList.remove('active');
                    mobileDropup.classList.remove('open');
                    mobileDropup.setAttribute('aria-hidden', 'true');
                }
                
                // Scroll to top
                window.scrollTo(0, 0);
                
                // Reset button
                mobileSeeRoomPreviewBtn.innerHTML = '<i class=\"fas fa-home\"></i> See Room Preview';
                mobileSeeRoomPreviewBtn.disabled = false;
                
                console.log('📱 Room preview transition complete!');
            };
            
            // Add overall timeout to prevent the button from being stuck forever
            const overallTimeout = setTimeout(() => {
                console.warn('📱 Mobile room preview generation timed out, forcing completion...');
                finishMobileRoomPreview();
            }, 15000); // 15 second maximum
            
            try {
                // Capture images needed for cart BEFORE hiding the main container
                // This ensures we have valid images even when elements are hidden
                // Run all captures in PARALLEL for much faster execution
                console.log('Capturing images for cart before switching view (parallel)...');
                const captureStartTime = performance.now();
                
                const [previewResult, printResult, adminResult] = await Promise.all([
                    captureFramePreview().catch(e => { console.warn('Preview capture failed', e); return null; }),
                    getCanvasImageData().catch(e => { console.warn('Print capture failed', e); return null; }),
                    captureFramedImage().catch(e => { console.warn('Admin capture failed', e); return null; })
                ]);
                
                state.cachedCartImages = {
                    preview: previewResult,
                    print: printResult,
                    admin: adminResult
                };
                
                console.log('Images captured in', (performance.now() - captureStartTime).toFixed(0), 'ms:', {
                    preview: !!state.cachedCartImages.preview,
                    print: !!state.cachedCartImages.print
                });

                // Update room previews - this is now optimized with parallel processing
                const overlayStartTime = performance.now();
                await overlayFrameOnRoomImages();
                console.log('📱 Room overlays completed in', (performance.now() - overlayStartTime).toFixed(0), 'ms');
                
                // Clear timeout since we're finishing normally
                clearTimeout(overallTimeout);
                
                // Complete the transition
                finishMobileRoomPreview();
                
            } catch (error) {
                console.error('📱 Error generating room preview:', error);
                // Clear timeout
                clearTimeout(overallTimeout);
                // Still try to show the room preview page even if there's an error
                finishMobileRoomPreview();
            }
        });
    }
    
    // Back to Edit button click
    if (backToEditBtn) {
        backToEditBtn.addEventListener('click', function() {
            console.log('📱 Back to Edit button clicked');
            // Hide mobile room preview page and show main container
            mobileRoomPreviewPage.style.display = 'none';
            document.body.classList.remove('room-preview-active');
            if (container) container.style.display = '';
            
            // Show bottom customization bar again if it exists and we have an upload
            const bottomBar = document.getElementById('mobileBottomBar') || document.querySelector('.mobile-bottom-bar');
            if (bottomBar && document.body.classList.contains('has-upload')) {
                bottomBar.style.display = ''; // Reset to CSS default (flex)
            }

            // Show adjustments container if it exists
            const adjustmentsContainer = document.querySelector('.mobile-adjustments-container');
            if (adjustmentsContainer) {
                adjustmentsContainer.style.display = ''; // Reset to CSS default
            }

            // Scroll to top
            window.scrollTo(0, 0);
            console.log('📱 Back to customize page complete');
        });
    }
    
    // Mobile Room Add to Cart button
    if (mobileRoomAddToCartBtn) {
        mobileRoomAddToCartBtn.addEventListener('click', async function() {
            if (!state.image || !state.frameSize) {
                alert('Please upload an image and select a frame size first.');
                return;
            }
            
            // Disable button and show loading
            mobileRoomAddToCartBtn.disabled = true;
            mobileRoomAddToCartBtn.innerHTML = '<i class=\"fas fa-spinner fa-spin\"></i> Adding...';
            
            try {
                // Use cached images if available, otherwise try to capture (might fail if hidden)
                const cached = state.cachedCartImages || {};
                
                const printImageData = cached.print || await getCanvasImageData().catch(err => {
                    console.warn('Print image capture failed:', err);
                    return null;
                });
                
                const previewImageData = cached.preview || await captureFramePreview().catch(err => {
                    console.warn('Preview image capture failed:', err);
                    return null;
                });
                
                const adminCroppedImage = cached.admin || await captureFramedImage().catch(err => {
                    console.warn('Admin cropped image capture failed:', err);
                    return null;
                });
                
                // Create cart item
                const cartItem = {
                    id: Date.now(),
                    printImage: printImageData || state.originalImage || state.image,
                    previewImage: previewImageData || state.originalImage || state.image,
                    displayImage: previewImageData || state.originalImage || state.image,
                    adminCroppedImage: adminCroppedImage || state.originalImage || state.image,
                    frameSize: state.frameSize,
                    frameColor: state.frameColor || 'black',
                    frameTexture: state.frameTexture || 'smooth',
                    adjustments: { ...state.adjustments },
                    position: { ...state.position },
                    zoom: state.zoom,
                    price: state.price || 349,
                    orderDate: new Date().toISOString(),
                    timestamp: new Date().toISOString()
                };
                
                // Add to cart
                const success = await addToCart(cartItem);
                
                if (success) {
                    // Show success
                    mobileRoomAddToCartBtn.innerHTML = '<i class=\"fas fa-check\"></i> Added to Cart!';
                    mobileRoomAddToCartBtn.style.background = '#27ae60';
                    
                    setTimeout(() => {
                        // Redirect to cart page
                        window.location.href = 'cart.html';
                    }, 1000);
                } else {
                    throw new Error('Failed to add to cart');
                }
                
            } catch (error) {
                console.error('Error adding to cart:', error);
                alert('Failed to add to cart. Please try again.');
                
                // Reset button
                const price = state.price || 349;
                mobileRoomAddToCartBtn.innerHTML = `<i class=\"fas fa-shopping-cart\"></i> <span>Add to Cart</span> <span class=\"btn-price\">₹${price}</span>`;
                mobileRoomAddToCartBtn.disabled = false;
                mobileRoomAddToCartBtn.style.background = '';
            }
        });
    }
}

async function loadMobileRoomImages() {
    const mobileRoomImagesList = document.getElementById('mobileRoomImagesList');
    const sliderDots = document.getElementById('sliderDots');
    if (!mobileRoomImagesList) return;
    
    // Clear existing images and dots
    mobileRoomImagesList.innerHTML = '';
    if (sliderDots) sliderDots.innerHTML = '';
    
    // Get room slider images
    const roomSlider = document.getElementById('roomSlider');
    if (!roomSlider) return;
    
    const roomImages = roomSlider.querySelectorAll('img');
    let imageCount = 0;
    
    // Create horizontal sliding product images
    roomImages.forEach((img, index) => {
        const imageItem = document.createElement('div');
        imageItem.className = 'mobile-product-image-item';
        
        const imageEl = document.createElement('img');
        imageEl.src = img.src;
        imageEl.alt = `Room Preview ${index + 1}`;
        imageEl.loading = 'lazy';
        
        imageItem.appendChild(imageEl);
        mobileRoomImagesList.appendChild(imageItem);
        
        // Create dot indicator
        if (sliderDots) {
            const dot = document.createElement('div');
            dot.className = 'slider-dot';
            if (imageCount === 0) dot.classList.add('active');
            sliderDots.appendChild(dot);
        }
        
        imageCount++;
    });
    
    // Add scroll listener to update active dot
    const sliderContainer = mobileRoomImagesList.parentElement;
    if (sliderContainer && sliderDots) {
        sliderContainer.addEventListener('scroll', () => {
            const scrollLeft = sliderContainer.scrollLeft;
            const itemWidth = sliderContainer.offsetWidth;
            const activeIndex = Math.round(scrollLeft / itemWidth);
            
            const dots = sliderDots.querySelectorAll('.slider-dot');
            dots.forEach((dot, index) => {
                if (index === activeIndex) {
                    dot.classList.add('active');
                } else {
                    dot.classList.remove('active');
                }
            });
        });
    }
}

function updateMobileSpecs() {
    // Update listing page elements
    const mobileListingSize = document.getElementById('mobileListingSize');
    const mobileListingColor = document.getElementById('mobileListingColor');
    const mobileListingTexture = document.getElementById('mobileListingTexture');
    const mobileListingPrice = document.getElementById('mobileListingPrice');
    const mobileListingCartCount = document.getElementById('mobileListingCartCount');
    const mobileRoomAddToCartBtn = document.getElementById('mobileRoomAddToCart');
    
    // Update size
    if (state.frameSize && mobileListingSize) {
        const sizeText = `${state.frameSize.size}\" ${state.frameSize.orientation.charAt(0).toUpperCase() + state.frameSize.orientation.slice(1)}`;
        mobileListingSize.textContent = sizeText;
    }
    
    // Update color
    if (state.frameColor && mobileListingColor) {
        const colorText = state.frameColor.charAt(0).toUpperCase() + state.frameColor.slice(1);
        mobileListingColor.textContent = colorText;
    }
    
    // Update texture
    if (state.frameTexture && mobileListingTexture) {
        const textureText = state.frameTexture.charAt(0).toUpperCase() + state.frameTexture.slice(1);
        mobileListingTexture.textContent = textureText;
    }
    
    // Update price
    const price = state.price || 349;
    if (mobileListingPrice) {
        mobileListingPrice.textContent = `₹${price}`;
    }
    
    // Update cart count badge
    if (mobileListingCartCount) {
        const cart = JSON.parse(sessionStorage.getItem('photoFramingCart') || '[]');
        const count = cart.length;
        mobileListingCartCount.textContent = count;
        if (count > 0) {
            mobileListingCartCount.classList.add('has-items');
        } else {
            mobileListingCartCount.classList.remove('has-items');
        }
    }
    
    // Enable add to cart button if image exists
    if (mobileRoomAddToCartBtn && state.image && state.frameSize) {
        mobileRoomAddToCartBtn.disabled = false;
    }
}