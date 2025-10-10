/*
 * JAVASCRIPT PERFORMANCE OPTIMIZATIONS FOR JB CREATIONS WEBSITE
 * Critical performance improvements to reduce lag and improve user experience
 */

// ===== PERFORMANCE UTILITIES =====

// Debounce function to limit rapid fire events
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Throttle function for scroll/resize events
function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    }
}

// ===== DOM QUERY OPTIMIZATIONS =====

// Cache DOM elements to avoid repeated queries
const domCache = {
    imageUpload: null,
    previewImage: null,
    imageContainer: null,
    frame: null,
    totalPrice: null,
    addToCartBtn: null,
    cartCount: null,
    
    // Initialize cache
    init() {
        this.imageUpload = document.getElementById('imageUpload');
        this.previewImage = document.getElementById('previewImage');
        this.imageContainer = document.getElementById('imageContainer');
        this.frame = document.getElementById('frame');
        this.totalPrice = document.getElementById('totalPrice');
        this.addToCartBtn = document.getElementById('addToCart');
        this.cartCount = document.getElementById('cartCount');
    },
    
    // Get cached element or query if not cached
    get(id) {
        if (!this[id]) {
            this[id] = document.getElementById(id);
        }
        return this[id];
    }
};

// ===== IMAGE PROCESSING OPTIMIZATIONS =====

// Optimize canvas operations
function optimizeCanvasOperations() {
    // Reuse canvas context
    let canvasContext = null;
    
    function getCanvasContext(canvas) {
        if (!canvasContext || canvasContext.canvas !== canvas) {
            canvasContext = canvas.getContext('2d', {
                alpha: false, // Disable alpha channel if not needed
                desynchronized: true, // Allow async operations
                willReadFrequently: false // Optimize for write operations
            });
        }
        return canvasContext;
    }
    
    return { getCanvasContext };
}

// ===== EVENT LISTENER OPTIMIZATIONS =====

// Passive event listeners for better scroll performance
function addPassiveEventListener(element, event, handler) {
    element.addEventListener(event, handler, { passive: true });
}

// Optimized touch event handling
function optimizeTouchEvents() {
    const touchElements = document.querySelectorAll('.preview-image, .zoom-controls button');
    
    touchElements.forEach(element => {
        // Use passive listeners where possible
        addPassiveEventListener(element, 'touchstart', function(e) {
            // Touch start logic
        });
        
        element.addEventListener('touchmove', function(e) {
            // Only prevent default if necessary
            if (element.classList.contains('dragging')) {
                e.preventDefault();
            }
        }, { passive: false });
    });
}

// ===== MEMORY MANAGEMENT =====

// Cleanup function for removing event listeners and clearing caches
function cleanup() {
    // Clear DOM cache
    Object.keys(domCache).forEach(key => {
        if (typeof domCache[key] !== 'function') {
            domCache[key] = null;
        }
    });
    
    // Clear any intervals or timeouts
    if (window.performanceOptimizationTimers) {
        window.performanceOptimizationTimers.forEach(timer => {
            clearTimeout(timer);
            clearInterval(timer);
        });
        window.performanceOptimizationTimers = [];
    }
}

// ===== LAZY LOADING IMPROVEMENTS =====

// Intersection Observer for lazy loading images
function setupLazyLoading() {
    const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const img = entry.target;
                if (img.dataset.src) {
                    img.src = img.dataset.src;
                    img.removeAttribute('data-src');
                    observer.unobserve(img);
                }
            }
        });
    }, {
        rootMargin: '50px' // Start loading 50px before element is visible
    });
    
    // Observe all images with data-src attribute
    document.querySelectorAll('img[data-src]').forEach(img => {
        imageObserver.observe(img);
    });
}

// ===== ANIMATION PERFORMANCE =====

// Request Animation Frame wrapper for smooth animations
function smoothAnimation(callback) {
    let rafId;
    
    function animate() {
        callback();
        rafId = requestAnimationFrame(animate);
    }
    
    rafId = requestAnimationFrame(animate);
    
    return () => cancelAnimationFrame(rafId);
}

// Optimize transform operations
function optimizeTransforms() {
    const elements = document.querySelectorAll('.preview-image, .frame');
    
    elements.forEach(element => {
        // Use CSS transforms instead of changing position properties
        element.style.willChange = 'transform';
        
        // Add transform3d for hardware acceleration
        const currentTransform = element.style.transform || '';
        if (!currentTransform.includes('translateZ')) {
            element.style.transform = currentTransform + ' translateZ(0)';
        }
    });
}

// ===== INITIALIZATION =====

// Initialize all performance optimizations
function initPerformanceOptimizations() {
    // Initialize DOM cache
    domCache.init();
    
    // Setup lazy loading
    setupLazyLoading();
    
    // Optimize touch events
    optimizeTouchEvents();
    
    // Optimize transforms
    optimizeTransforms();
    
    // Setup cleanup on page unload
    window.addEventListener('beforeunload', cleanup);
    
    console.log('🚀 Performance optimizations initialized');
}

// ===== AUTO-INITIALIZATION =====

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initPerformanceOptimizations);
} else {
    initPerformanceOptimizations();
}

// Export utilities for use in other scripts
window.performanceUtils = {
    debounce,
    throttle,
    domCache,
    optimizeCanvasOperations,
    cleanup,
    smoothAnimation
};