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
});

// Also update cart count on window load as a fallback
window.addEventListener('load', function() {
    updateCartCount();
});

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
            
            // Add smooth scroll animation for mobile
            if (window.innerWidth <= 768) {
                setTimeout(() => {
                    const previewSection = document.querySelector('.preview-section');
                    if (previewSection) {
                        previewSection.scrollIntoView({
                            behavior: 'smooth',
                            block: 'center'
                        });
                    }
                }, 300);
            }
            
            // Automatically trigger "Update Room Previews" functionality after frame size change
            setTimeout(() => {
                console.log('🎯 Auto-triggering room preview update after frame size change...');
                
                // Check if conditions are met (same logic as updateRoomPreviewsClick)
                const hasImage = !!(state.image);
                const hasActiveRoomSlider = !!(state.roomSlider && state.roomSlider.isActive);
                
                if (hasImage && hasActiveRoomSlider) {
                    console.log('✅ Auto-updating room previews with new frame size...');
                    
                    // Call the overlay function directly (same as updateRoomPreviewsClick but without UI feedback)
                    if (typeof overlayFrameOnRoomImages === 'function') {
                        overlayFrameOnRoomImages().then(() => {
                            console.log('✅ Room previews auto-updated successfully after frame size change!');
                        }).catch((error) => {
                            console.error('❌ Error auto-updating room previews:', error);
                        });
                    } else {
                        console.log('⚠️ overlayFrameOnRoomImages function not available for auto-update');
                    }
                } else {
                    console.log('⚠️ Auto-update skipped - conditions not met (image:', hasImage, ', room slider:', hasActiveRoomSlider, ')');
                }
            }, 1000); // Wait 1 second for room slider to initialize
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
            
            // Automatically trigger "Update Room Previews" functionality after frame color change
            setTimeout(() => {
                console.log('🎯 Auto-triggering room preview update after frame color change...');
                
                // Check if conditions are met (same logic as updateRoomPreviewsClick)
                const hasImage = !!(state.image);
                const hasActiveRoomSlider = !!(state.roomSlider && state.roomSlider.isActive);
                
                if (hasImage && hasActiveRoomSlider) {
                    console.log('✅ Auto-updating room previews with new frame color...');
                    
                    // Call the overlay function directly (same as updateRoomPreviewsClick but without UI feedback)
                    if (typeof overlayFrameOnRoomImages === 'function') {
                        overlayFrameOnRoomImages().then(() => {
                            console.log('✅ Room previews auto-updated successfully after frame color change!');
                        }).catch((error) => {
                            console.error('❌ Error auto-updating room previews after color change:', error);
                        });
                    } else {
                        console.log('⚠️ overlayFrameOnRoomImages function not available for color auto-update');
                    }
                } else {
                    console.log('⚠️ Color auto-update skipped - conditions not met (image:', hasImage, ', room slider:', hasActiveRoomSlider, ')');
                }
            }, 500); // Wait 500ms for frame color update to complete
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
                
                // Capture both the print image and live preview screenshot
                console.log('Starting image capture...');
                const [printImageData, previewImageData] = await Promise.all([
                    getCanvasImageData(),
                    captureFramePreview() // Use the exact live preview capture function
                ]);
                console.log('Image capture completed:', {
                    printImageCaptured: !!printImageData,
                    previewImageCaptured: !!previewImageData,
                    printImageSize: printImageData ? printImageData.length : 0,
                    previewImageSize: previewImageData ? previewImageData.length : 0
                });
                
                // If preview capture failed, use the print image as fallback
                const finalPreviewImage = previewImageData || printImageData;
                
                const cartItem = {
                    id: Date.now(),
                    printImage: printImageData,
                    previewImage: finalPreviewImage, // Use captured preview or fallback to print image
                    displayImage: finalPreviewImage, // Add for backward compatibility
                    originalImage: state.originalImage, // Add original uploaded image
                    frameSize: state.frameSize,
                    frameColor: state.frameColor || '#8B4513',
                    frameTexture: state.frameTexture || 'wood',
                    adjustments: { ...state.adjustments },
                    zoom: state.zoom,
                    position: { ...state.position },
                    price: state.price || 349,
                    orderDate: new Date().toISOString(), // Add orderDate for checkout compatibility
                    timestamp: new Date().toISOString()
                };

                addToCart(cartItem);
                
                // Reset button state
                elements.addToCartBtn.disabled = false;
                elements.addToCartBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Add to Cart';
                
                // Show success feedback
                const originalText = elements.addToCartBtn.innerHTML;
                elements.addToCartBtn.innerHTML = '<i class="fas fa-check"></i> Added!';
                elements.addToCartBtn.style.background = '#27ae60';
                setTimeout(() => {
                    elements.addToCartBtn.innerHTML = originalText;
                    elements.addToCartBtn.style.background = '';
                }, 2000);
                
            } catch (error) {
                console.error('Error adding to cart:', error);
                alert('Error adding item to cart. Please try again.');
                
                // Reset button state
                elements.addToCartBtn.disabled = false;
                elements.addToCartBtn.innerHTML = '<i class="fas fa-shopping-cart"></i> Add to Cart';
            }
        });
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
            const zoomSpeed = 0.1;
            state.zoom = Math.min(state.zoom + zoomSpeed, 3);
            console.log('New zoom level:', state.zoom);
            elements.previewImage.classList.add('smooth-transition');
            updateImageTransform();
            setTimeout(() => elements.previewImage.classList.remove('smooth-transition'), 200);
        });
    }
    if (elements.zoomOut) {
        elements.zoomOut.addEventListener('click', function() {
            console.log('Zoom Out clicked'); // Debug log
            if (!state.image || !state.frameSize) {
                console.log('No image or frame size, zoom disabled');
                return;
            }
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
        });
    }
    if (elements.precisionZoomIn) {
        elements.precisionZoomIn.addEventListener('click', function() {
            console.log('Precision Zoom In clicked'); // Debug log
            if (!state.image) return;
            const precisionZoomSpeed = 0.02;
            state.zoom = Math.min(state.zoom + precisionZoomSpeed, 3);
            elements.previewImage.classList.add('smooth-transition');
            updateImageTransform();
            setTimeout(() => elements.previewImage.classList.remove('smooth-transition'), 150);
        });
    }
    if (elements.precisionZoomOut) {
        elements.precisionZoomOut.addEventListener('click', function() {
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

// Initialize all sliders
const sliders = ['brightness', 'contrast', 'highlights', 'shadows', 'vibrance'].map(id => ({
    id,
    element: document.getElementById(id)
}));

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

            // Create a temporary image to get dimensions
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
                state.image = e.target.result;
                elements.previewImage.src = state.image;
                elements.previewImage.onload = () => {
                    // Enable add to cart button and mark container as having image
                    elements.addToCartBtn.disabled = false;
                    elements.imageContainer.classList.add('has-image');
                    
                    // Update room preview button state
                    if (window.updateRoomPreviewButtonState) {
                        window.updateRoomPreviewButtonState();
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
                    
                    // Automatically trigger "Update Room Previews" functionality after image upload
                    setTimeout(() => {
                        console.log('🎯 Auto-triggering room preview update after image upload...');
                        
                        // Check if conditions are met (same logic as updateRoomPreviewsClick)
                        const hasImage = !!(state.image);
                        const hasActiveRoomSlider = !!(state.roomSlider && state.roomSlider.isActive);
                        
                        if (hasImage && hasActiveRoomSlider) {
                            console.log('✅ Auto-updating room previews with uploaded image...');
                            
                            // Call the overlay function directly (same as updateRoomPreviewsClick but without UI feedback)
                            if (typeof overlayFrameOnRoomImages === 'function') {
                                overlayFrameOnRoomImages().then(() => {
                                    console.log('✅ Room previews auto-updated successfully after image upload!');
                                }).catch((error) => {
                                    console.error('❌ Error auto-updating room previews after image upload:', error);
                                });
                            } else {
                                console.log('⚠️ overlayFrameOnRoomImages function not available for image upload auto-update');
                            }
                        } else {
                            console.log('⚠️ Image upload auto-update skipped - conditions not met (image:', hasImage, ', room slider:', hasActiveRoomSlider, ')');
                            console.log('   Note: If room slider is not active, please select a frame size first');
                        }
                    }, 1200); // Wait 1.2 seconds for all initialization to complete
                };
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

// Enhance slider interaction
sliders.forEach(({ id, element }) => {
    const label = element.previousElementSibling;
    
    element.addEventListener('input', (e) => {
        console.log('Adjustment slider changed:', id, 'to', e.target.value);
        
        state.adjustments[id] = e.target.value;
        updateImageFilters();
        
        // Update label with value
        const value = e.target.value;
        label.dataset.value = `${value}%`;
        
        // Sync with mobile sliders
        const mobileSlider = document.getElementById('mobile' + id.charAt(0).toUpperCase() + id.slice(1));
        if (mobileSlider) {
            mobileSlider.value = value;
        }
        
        // Automatically trigger "Update Room Previews" functionality after adjustment change
        clearTimeout(window.adjustmentUpdateTimeout); // Clear any existing timeout to prevent multiple rapid updates
        window.adjustmentUpdateTimeout = setTimeout(() => {
            console.log('🎯 Auto-triggering room preview update after adjustment change:', id);
            
            // Check if conditions are met (same logic as updateRoomPreviewsClick)
            const hasImage = !!(state.image);
            const hasActiveRoomSlider = !!(state.roomSlider && state.roomSlider.isActive);
            
            if (hasImage && hasActiveRoomSlider) {
                console.log('✅ Auto-updating room previews with new adjustment:', id);
                
                // Call the overlay function directly (same as updateRoomPreviewsClick but without UI feedback)
                if (typeof overlayFrameOnRoomImages === 'function') {
                    overlayFrameOnRoomImages().then(() => {
                        console.log('✅ Room previews auto-updated successfully after adjustment change:', id);
                    }).catch((error) => {
                        console.error('❌ Error auto-updating room previews after adjustment change:', error);
                    });
                } else {
                    console.log('⚠️ overlayFrameOnRoomImages function not available for adjustment auto-update');
                }
            } else {
                console.log('⚠️ Adjustment auto-update skipped - conditions not met (image:', hasImage, ', room slider:', hasActiveRoomSlider, ')');
            }
        }, 800); // Wait 800ms after user stops adjusting to prevent too many rapid updates
    });
});

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

function updateImageTransform() {
    if (!elements.previewImage.src) return;
    
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
    
    // Room preview overlays will only update when "Update Room Previews" button is clicked
    // Removed automatic overlay update for zoom/pan changes to give users control
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
    }

    // Mouse down handler with improved responsiveness
    function handleMouseDown(e) {
        if (!state.image) return;
        
        e.preventDefault(); // Prevent image dragging
        e.stopPropagation(); // Prevent event bubbling
        
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
        
        // Automatically trigger "Update Room Previews" functionality after drag operation
        setTimeout(() => {
            console.log('🎯 Auto-triggering room preview update after drag operation...');
            
            // Check if conditions are met (same logic as updateRoomPreviewsClick)
            const hasImage = !!(state.image);
            const hasActiveRoomSlider = !!(state.roomSlider && state.roomSlider.isActive);
            
            if (hasImage && hasActiveRoomSlider) {
                console.log('✅ Auto-updating room previews after drag...');
                
                // Call the overlay function directly (same as updateRoomPreviewsClick but without UI feedback)
                if (typeof overlayFrameOnRoomImages === 'function') {
                    overlayFrameOnRoomImages().then(() => {
                        console.log('✅ Room previews auto-updated successfully after drag!');
                    }).catch((error) => {
                        console.error('❌ Error auto-updating room previews after drag:', error);
                    });
                } else {
                    console.log('⚠️ overlayFrameOnRoomImages function not available for drag auto-update');
                }
            } else {
                console.log('⚠️ Drag auto-update skipped - conditions not met (image:', hasImage, ', room slider:', hasActiveRoomSlider, ')');
            }
        }, 300); // Brief delay to let snap animation complete
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
        
        e.preventDefault();
        e.stopPropagation();
        
        if (e.touches.length === 1) {
            isDragging = true;
            const touch = e.touches[0];
            startPos = {
                x: touch.clientX - state.position.x,
                y: touch.clientY - state.position.y
            };
            elements.previewImage.classList.remove('smooth-transition');
            elements.previewImage.classList.add('dragging');
        }
    }

    // Enhanced touch move handler
    function handleTouchMove(e) {
        if (!isDragging || e.touches.length !== 1 || !state.image) return;

        e.preventDefault();
        e.stopPropagation();

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
    }

    // Touch end handler
    function handleTouchEnd(e) {
        if (!isDragging) return;
        
        isDragging = false;
        elements.previewImage.classList.remove('dragging');
        
        // Snap back to boundaries
        snapToBoundaries();
        
        // Automatically trigger "Update Room Previews" functionality after touch drag operation
        setTimeout(() => {
            console.log('🎯 Auto-triggering room preview update after touch drag operation...');
            
            // Check if conditions are met (same logic as updateRoomPreviewsClick)
            const hasImage = !!(state.image);
            const hasActiveRoomSlider = !!(state.roomSlider && state.roomSlider.isActive);
            
            if (hasImage && hasActiveRoomSlider) {
                console.log('✅ Auto-updating room previews after touch drag...');
                
                // Call the overlay function directly (same as updateRoomPreviewsClick but without UI feedback)
                if (typeof overlayFrameOnRoomImages === 'function') {
                    overlayFrameOnRoomImages().then(() => {
                        console.log('✅ Room previews auto-updated successfully after touch drag!');
                    }).catch((error) => {
                        console.error('❌ Error auto-updating room previews after touch drag:', error);
                    });
                } else {
                    console.log('⚠️ overlayFrameOnRoomImages function not available for touch drag auto-update');
                }
            } else {
                console.log('⚠️ Touch drag auto-update skipped - conditions not met (image:', hasImage, ', room slider:', hasActiveRoomSlider, ')');
            }
        }, 300); // Brief delay to let snap animation complete
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
        
        if (!previewImage.src || !state.frameSize) {
            console.log('No image or frame size, using original image');
            resolve(state.image);
            return;
        }
        
        try {
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            
            // Get frame aspect ratio to determine crop dimensions
            const [width, height] = state.frameSize.size.split('x').map(Number);
            const isLandscape = state.frameSize.orientation === 'landscape';
            const frameAspectWidth = isLandscape ? Math.max(width, height) : Math.min(width, height);
            const frameAspectHeight = isLandscape ? Math.min(width, height) : Math.max(width, height);
            
            // Set canvas size to match the frame's inner dimensions (what will be printed)
            // Using high resolution for printing quality
            const printWidth = 1200; // High resolution for printing
            const printHeight = Math.round(printWidth * (frameAspectHeight / frameAspectWidth));
            
            canvas.width = printWidth;
            canvas.height = printHeight;
            
            // Create image element
            const img = new Image();
            img.onload = () => {
                try {
                    // Clear canvas with white background
                    ctx.fillStyle = '#ffffff';
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    
                    // Calculate image dimensions and position based on user's adjustments
                    const imgAspectRatio = img.naturalWidth / img.naturalHeight;
                    const canvasAspectRatio = canvas.width / canvas.height;
                    
                    // Calculate the base size to fill the frame
                    let baseWidth, baseHeight;
                    if (imgAspectRatio > canvasAspectRatio) {
                        baseHeight = canvas.height;
                        baseWidth = baseHeight * imgAspectRatio;
                    } else {
                        baseWidth = canvas.width;
                        baseHeight = baseWidth / imgAspectRatio;
                    }
                    
                    // Apply user's zoom
                    const zoomLevel = state.zoom || 1;
                    const scaledWidth = baseWidth * zoomLevel;
                    const scaledHeight = baseHeight * zoomLevel;
                    
                    // Calculate position with user's pan adjustments
                    const centerX = canvas.width / 2;
                    const centerY = canvas.height / 2;
                    
                    // Apply user's position adjustments (convert from percentage to pixels)
                    const positionX = state.position ? (state.position.x * canvas.width * 0.01) : 0;
                    const positionY = state.position ? (state.position.y * canvas.height * 0.01) : 0;
                    
                    const drawX = centerX - (scaledWidth / 2) + positionX;
                    const drawY = centerY - (scaledHeight / 2) + positionY;
                    
                    // Apply all the color adjustments/filters
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
                    
                    // Draw the image with all transformations applied
                    ctx.drawImage(img, drawX, drawY, scaledWidth, scaledHeight);
                    
                    // Convert to high-quality JPEG for printing
                    const dataURL = canvas.toDataURL('image/jpeg', 0.95);
                    console.log('Cropped and styled image captured for printing');
                    resolve(dataURL);
                    
                } catch (error) {
                    console.error('Error creating cropped image:', error);
                    resolve(state.image);
                }
            };
            
            img.onerror = () => {
                console.error('Error loading image for cropping');
                resolve(state.image);
            };
            
            img.crossOrigin = 'anonymous';
            img.src = state.image;
            
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
            const ctx = canvas.getContext('2d');
            
            // Set canvas size for display preview (smaller)
            const canvasWidth = 300;
            const canvasHeight = 300;
            canvas.width = canvasWidth;
            canvas.height = canvasHeight;
            
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
        const cart = JSON.parse(localStorage.getItem('photoFramingCart') || '[]');
        const count = cart.length;
        
        console.log('updateCartCount called:', {
            cartData: localStorage.getItem('photoFramingCart'),
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

function addToCart(item) {
    console.log('addToCart function called with item:', item);
    try {
        // Get existing cart
        let cart = JSON.parse(localStorage.getItem('photoFramingCart') || '[]');
        console.log('Current cart:', cart);
        
        // Add timestamp if not present
        if (!item.timestamp) {
            item.timestamp = new Date().toISOString();
        }
        
        // Add the item to cart
        cart.push(item);
        console.log('Updated cart:', cart);
        
        // Save updated cart
        localStorage.setItem('photoFramingCart', JSON.stringify(cart));
        console.log('Cart saved to localStorage');
        
        // Update cart count
        updateCartCount();
        
        // Show success feedback
        if (elements.addToCartBtn) {
            const originalText = elements.addToCartBtn.innerHTML;
            elements.addToCartBtn.innerHTML = '<i class="fas fa-check"></i> Added to Cart!';
            elements.addToCartBtn.classList.add('success');
            elements.addToCartBtn.disabled = true;
            
            setTimeout(() => {
                elements.addToCartBtn.innerHTML = originalText;
                elements.addToCartBtn.classList.remove('success');
                elements.addToCartBtn.disabled = false;
            }, 2000);
        }
        
        console.log('Item successfully added to cart');
        
    } catch (error) {
        console.error('Error adding to cart:', error);
        alert('Error adding item to cart. Please try again.');
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
        if (!state.image || !state.frameSize) {
            reject(new Error('No image or frame size selected'));
            return;
        }

        // Capture the current frame preview
        captureFramePreview().then(frameDataURL => {
            if (!frameDataURL) {
                reject(new Error('Failed to capture frame preview'));
                return;
            }

            console.log('Frame preview captured successfully for room overlay');

            // Get all room slider images
            const roomSlider = document.getElementById('roomSlider');
            if (!roomSlider) {
                reject(new Error('Room slider not found'));
                return;
            }

            const roomImages = roomSlider.querySelectorAll('img');
            console.log(`Applying frame overlay to ${roomImages.length} room images`);
            
            let completedImages = 0;
            const totalImages = roomImages.length;
            
            if (totalImages === 0) {
                resolve();
                return;
            }
        
            roomImages.forEach((roomImg, index) => {
                // Skip the fifth image (index === 4) from having frame overlay for all cases
                if (index === 4) {
                    completedImages++;
                    if (completedImages === totalImages) {
                        resolve();
                    }
                    return;
                }

                // Skip if image doesn't exist or is broken
                if (!roomImg.src || roomImg.style.display === 'none') {
                    completedImages++;
                    if (completedImages === totalImages) {
                        resolve();
                    }
                    return;
                }

                // Store original source for potential restoration
                if (!roomImg.originalSrc) {
                    roomImg.originalSrc = roomImg.src;
                }

                // Create a canvas for each room image with the frame overlay
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');

                // Wait for room image to load if it hasn't already
                const processRoomImage = () => {
                    try {
                        // Set canvas size to match room image
                        canvas.width = roomImg.naturalWidth || roomImg.width || 800;
                        canvas.height = roomImg.naturalHeight || roomImg.height || 600;

                        // Draw the room background image
                        ctx.drawImage(roomImg, 0, 0, canvas.width, canvas.height);

                        // Load and overlay the frame preview
                        const frameImg = new Image();
                        frameImg.onload = () => {
                            try {
                                // Position the frame in different locations for variety
                                let frameX, frameY, frameWidth, frameHeight;
                                
                                // Special positioning for 13x19 portrait on first, second, third, and fourth room images
                                if ((index === 0 || index === 1 || index === 2 || index === 3) && state.frameSize && 
                                    state.frameSize.size === '13x19' && 
                                    state.frameSize.orientation === 'portrait') {
                                    
                                    // Use specific coordinates for first, second, third, and fourth images
                                    // Scale coordinates based on actual canvas size vs original image size
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

                                // Draw the frame
                                ctx.drawImage(frameImg, frameX, frameY, frameWidth, frameHeight);

                                // Convert the composite image to data URL and update the room image
                                const compositeDataURL = canvas.toDataURL('image/jpeg', 0.9);
                                roomImg.src = compositeDataURL;
                                
                                // Track completion
                                completedImages++;
                                if (completedImages === totalImages) {
                                    resolve();
                                }
                                
                            } catch (error) {
                                console.error('Error overlaying frame on room image:', error);
                                completedImages++;
                                if (completedImages === totalImages) {
                                    resolve();
                                }
                            }
                        };

                        frameImg.onerror = () => {
                            console.error('Error loading frame image for overlay');
                            completedImages++;
                            if (completedImages === totalImages) {
                                resolve();
                            }
                        };

                        frameImg.src = frameDataURL;
                        
                    } catch (error) {
                        console.error('Error processing room image:', error);
                        completedImages++;
                        if (completedImages === totalImages) {
                            resolve();
                        }
                    }
                };

                if (roomImg.complete && roomImg.naturalWidth > 0) {
                    processRoomImage();
                } else {
                    roomImg.onload = processRoomImage;
                }
            });
        }).catch(error => {
            console.error('Error capturing frame preview:', error);
            reject(error);
        });
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
    const slider = document.getElementById('roomSlider');
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
    
    // Clear existing content
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
                
                // Reset position to center when frame size changes
                state.position = { x: 0, y: 0 };
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
    if (precisionZoomIn) {
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
        };

        // Use ontouchend instead of addEventListener for better mobile compatibility
        precisionZoomIn.ontouchend = function(e) {
            e.preventDefault();
            e.stopPropagation();
            handlePrecisionZoomIn();
            return false;
        };
        
        // Keep click for desktop
        precisionZoomIn.onclick = function(e) {
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

    if (precisionZoomOut) {
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
        precisionZoomOut.ontouchend = function(e) {
            e.preventDefault();
            e.stopPropagation();
            handlePrecisionZoomOut();
            return false;
        };
        
        // Keep click for desktop
        precisionZoomOut.onclick = function(e) {
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
            if (precisionZoomOut) precisionZoomOut.click();
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

                // Constrain current position to new boundaries
                state.position.x = Math.max(Math.min(state.position.x, maxX), -maxX);
                state.position.y = Math.max(Math.min(state.position.y, maxY), -maxY);
                
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
    if (updateRoomPreviewsBtn) {
        console.log('✅ Update Room Previews button found and initializing...');
        
        // Function to update button state based on conditions
        function updateButtonState() {
            const hasImage = !!(state.image);
            const hasActiveRoomSlider = !!(state.roomSlider && state.roomSlider.isActive);
            const isReady = hasImage && hasActiveRoomSlider;
            
            if (isReady) {
                updateRoomPreviewsBtn.style.opacity = '1';
                updateRoomPreviewsBtn.style.cursor = 'pointer';
                updateRoomPreviewsBtn.title = 'Click to update room preview images with current live preview';
            } else {
                updateRoomPreviewsBtn.style.opacity = '0.6';
                updateRoomPreviewsBtn.style.cursor = 'not-allowed';
                const reasons = [];
                if (!hasImage) reasons.push('upload an image');
                if (!hasActiveRoomSlider) reasons.push('select a frame size');
                updateRoomPreviewsBtn.title = `Please ${reasons.join(' and ')} first`;
            }
        }
        
        // Make the button state update function globally accessible
        window.updateRoomPreviewButtonState = updateButtonState;
        
        // Update button state initially
        updateButtonState();
        
        // Add click event listener
        updateRoomPreviewsBtn.addEventListener('click', () => {
            console.log('🎯 Update Room Previews button clicked!');
            
            if (state.image && state.roomSlider && state.roomSlider.isActive) {
                console.log('✅ Conditions met, starting room preview update...');
                
                // Show loading feedback with better styling
                const originalText = updateRoomPreviewsBtn.textContent;
                updateRoomPreviewsBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Updating...';
                updateRoomPreviewsBtn.disabled = true;
                updateRoomPreviewsBtn.style.background = '#6c757d';
                updateRoomPreviewsBtn.style.opacity = '1';
                
                console.log('Updating room previews with current live preview...');
                
                // Capture and apply the current live preview to all room images
                overlayFrameOnRoomImages().then(() => {
                    console.log('✅ Room previews updated successfully!');
                    // Reset button with success feedback
                    setTimeout(() => {
                        updateRoomPreviewsBtn.innerHTML = '<i class="fas fa-check"></i> Updated!';
                        updateRoomPreviewsBtn.style.background = '#28a745';
                        
                        // Reset to original state after showing success
                        setTimeout(() => {
                            updateRoomPreviewsBtn.innerHTML = originalText;
                            updateRoomPreviewsBtn.style.background = '#82C0CC';
                            updateRoomPreviewsBtn.disabled = false;
                            updateButtonState(); // Restore proper state
                        }, 1500);
                    }, 500);
                }).catch((error) => {
                    console.error('❌ Error updating room previews:', error);
                    // Reset button with error feedback
                    updateRoomPreviewsBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
                    updateRoomPreviewsBtn.style.background = '#dc3545';
                    
                    setTimeout(() => {
                        updateRoomPreviewsBtn.innerHTML = originalText;
                        updateRoomPreviewsBtn.style.background = '#82C0CC';
                        updateRoomPreviewsBtn.disabled = false;
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
        });
        
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
    
    // Initialize Update Room Previews button with multiple attempts
    function initUpdateRoomPreviewsButton() {
        console.log('🔍 Looking for Update Room Previews button...');
        const updateRoomPreviewsBtn = document.getElementById('updateRoomPreviews');
        
        if (updateRoomPreviewsBtn) {
            console.log('✅ Update Room Previews button found! Attaching event listener...');
            
            // Function to update button state based on conditions
            function updateButtonState() {
                const hasImage = !!(state.image);
                const hasActiveRoomSlider = !!(state.roomSlider && state.roomSlider.isActive);
                const isReady = hasImage && hasActiveRoomSlider;
                
                if (isReady) {
                    updateRoomPreviewsBtn.style.opacity = '1';
                    updateRoomPreviewsBtn.style.cursor = 'pointer';
                    updateRoomPreviewsBtn.title = 'Click to update room preview images with current live preview';
                } else {
                    updateRoomPreviewsBtn.style.opacity = '0.6';
                    updateRoomPreviewsBtn.style.cursor = 'not-allowed';
                    const reasons = [];
                    if (!hasImage) reasons.push('upload an image');
                    if (!hasActiveRoomSlider) reasons.push('select a frame size');
                    updateRoomPreviewsBtn.title = `Please ${reasons.join(' and ')} first`;
                }
            }
            
            // Make the button state update function globally accessible
            window.updateRoomPreviewButtonState = updateButtonState;
            
            // Update button state initially
            updateButtonState();
            
            // Remove any existing listeners to avoid duplicates
            const newBtn = updateRoomPreviewsBtn.cloneNode(true);
            updateRoomPreviewsBtn.parentNode.replaceChild(newBtn, updateRoomPreviewsBtn);
            
            // Add click event listener to the new button
            newBtn.addEventListener('click', function(e) {
                // Add alert to ensure we see the click
                alert('Button clicked! Check console for details.');
                console.log('🎯 Update Room Previews button clicked!');
                console.log('Event details:', e);
                
                if (state.image && state.roomSlider && state.roomSlider.isActive) {
                    console.log('✅ Conditions met, starting room preview update...');
                    
                    // Show loading feedback with better styling
                    const originalText = newBtn.textContent;
                    newBtn.innerHTML = '<i class="fas fa-sync-alt fa-spin"></i> Updating...';
                    newBtn.disabled = true;
                    newBtn.style.background = '#6c757d';
                    newBtn.style.opacity = '1';
                    
                    console.log('📸 Capturing current live preview...');
                    console.log('🏠 Applying to room preview images...');
                    
                    // Capture and apply the current live preview to all room images
                    overlayFrameOnRoomImages().then(() => {
                        console.log('✅ Room previews updated successfully!');
                        // Reset button with success feedback
                        setTimeout(() => {
                            newBtn.innerHTML = '<i class="fas fa-check"></i> Updated!';
                            newBtn.style.background = '#28a745';
                            
                            // Reset to original state after showing success
                            setTimeout(() => {
                                newBtn.innerHTML = originalText;
                                newBtn.style.background = '#82C0CC';
                                newBtn.disabled = false;
                                updateButtonState(); // Restore proper state
                            }, 1500);
                        }, 500);
                    }).catch((error) => {
                        console.error('❌ Error updating room previews:', error);
                        // Reset button with error feedback
                        newBtn.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error';
                        newBtn.style.background = '#dc3545';
                        
                        setTimeout(() => {
                            newBtn.innerHTML = originalText;
                            newBtn.style.background = '#82C0CC';
                            newBtn.disabled = false;
                            updateButtonState(); // Restore proper state
                        }, 2000);
                    });
                } else {
                    // Show helpful message for when button can't be used
                    const reasons = [];
                    if (!state.image) reasons.push('upload an image');
                    if (!state.roomSlider || !state.roomSlider.isActive) reasons.push('select a frame size');
                    
                    console.log(`⚠️ Button clicked but conditions not met. Missing: ${reasons.join(', ')}`);
                    console.log('Current state:', {
                        hasImage: !!state.image,
                        hasRoomSlider: !!state.roomSlider,
                        roomSliderActive: state.roomSlider?.isActive
                    });
                    
                    // Enhanced alert with more helpful information
                    alert(`Update Room Previews Button\n\nTo use this button, you need to:\n\n${reasons.map(r => `• ${r.charAt(0).toUpperCase() + r.slice(1)}`).join('\n')}\n\nOnce you've completed these steps, the button will capture your current live preview (with all your customizations) and apply it to all room preview images.`);
                }
            });
            
            console.log('✅ Update Room Previews button event listener attached successfully!');
            return true;
        } else {
            console.log('❌ Update Room Previews button not found in DOM yet...');
            return false;
        }
    }
    
    // Try to initialize immediately
    if (!initUpdateRoomPreviewsButton()) {
        // If button not found, try again after DOM is loaded
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                console.log('📄 DOM loaded, trying to initialize button again...');
                if (!initUpdateRoomPreviewsButton()) {
                    // Try one more time after a delay
                    setTimeout(() => {
                        console.log('⏰ Final attempt to initialize button...');
                        initUpdateRoomPreviewsButton();
                    }, 1000);
                }
            });
        } else {
            // DOM already loaded, try after a short delay
            setTimeout(() => {
                console.log('⏰ Delayed attempt to initialize button...');
                initUpdateRoomPreviewsButton();
            }, 500);
        }
    }
    
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