/*
 * Mobile Performance Optimizer
 * Optimizes performance specifically for mobile browsers without changing appearance
 */

(function() {
    'use strict';
    
    // Detect mobile device
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     (navigator.maxTouchPoints && navigator.maxTouchPoints > 1) ||
                     window.innerWidth <= 768;
    
    // Apply mobile optimizations only on mobile devices
    if (!isMobile) return;
    
    console.log('🚀 Mobile Performance Optimizer: Applying mobile-specific optimizations');
    
    // 1. Debounced function utility
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
    
    // 2. Throttled function utility
    function throttle(func, limit) {
        let lastFunc;
        let lastRan;
        return function(...args) {
            if (!lastRan) {
                func.apply(this, args);
                lastRan = Date.now();
            } else {
                clearTimeout(lastFunc);
                lastFunc = setTimeout(() => {
                    if ((Date.now() - lastRan) >= limit) {
                        func.apply(this, args);
                        lastRan = Date.now();
                    }
                }, limit - (Date.now() - lastRan));
            }
        };
    }
    
    // 3. Cache DOM elements to reduce queries
    const DOMCache = {
        cache: new Map(),
        
        get(selector) {
            if (!this.cache.has(selector)) {
                const element = document.querySelector(selector);
                if (element) {
                    this.cache.set(selector, element);
                }
            }
            return this.cache.get(selector) || null;
        },
        
        getAll(selector) {
            const cacheKey = `all:${selector}`;
            if (!this.cache.has(cacheKey)) {
                const elements = document.querySelectorAll(selector);
                if (elements.length > 0) {
                    this.cache.set(cacheKey, elements);
                }
            }
            return this.cache.get(cacheKey) || [];
        },
        
        clear() {
            this.cache.clear();
        },
        
        invalidate(selector) {
            this.cache.delete(selector);
            this.cache.delete(`all:${selector}`);
        }
    };
    
    // 4. Optimize animations for mobile
    function optimizeAnimations() {
        // Disable heavy animations on low-end devices
        const isLowEndDevice = navigator.hardwareConcurrency <= 2 || 
                              navigator.deviceMemory <= 2 ||
                              window.innerWidth <= 480;
        
        if (isLowEndDevice) {
            // Reduce animation complexity
            const style = document.createElement('style');
            style.textContent = `
                @media (max-width: 768px) and (prefers-reduced-motion: no-preference) {
                    .frame-transitioning,
                    .frame-wrapper-transitioning,
                    .frame-morphing {
                        animation-duration: 0.3s !important;
                        animation-timing-function: ease-out !important;
                    }
                    
                    /* Simplify keyframes for low-end devices */
                    @keyframes frameResize {
                        0% { transform: scale(1); }
                        100% { transform: scale(0.98); }
                    }
                    
                    @keyframes frameFadeInOut {
                        0% { opacity: 1; }
                        100% { opacity: 0.95; }
                    }
                    
                    @keyframes smoothMorphing {
                        0% { transform: scale(1); }
                        100% { transform: scale(0.99); }
                    }
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // 5. Intersection Observer for lazy loading
    function setupIntersectionObserver() {
        if (!window.IntersectionObserver) return;
        
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
            rootMargin: '50px 0px',
            threshold: 0.1
        });
        
        // Observe images with data-src
        document.querySelectorAll('img[data-src]').forEach(img => {
            imageObserver.observe(img);
        });
        
        window.mobilePerf = window.mobilePerf || {};
        window.mobilePerf.imageObserver = imageObserver;
    }
    
    // 6. Optimize event listeners
    function optimizeEventListeners() {
        // Replace frequent event listeners with delegated versions
        const body = document.body;
        
        // Throttled scroll handler
        const optimizedScrollHandler = throttle(() => {
            // Handle scroll-based updates
            const scrollY = window.scrollY;
            document.documentElement.style.setProperty('--scroll-y', scrollY + 'px');
        }, 16); // ~60fps
        
        // Debounced resize handler
        const optimizedResizeHandler = debounce(() => {
            // Handle resize-based updates
            DOMCache.clear(); // Clear cache on resize
            if (window.recomputeMobileBarHeight) {
                window.recomputeMobileBarHeight();
            }
        }, 250);
        
        // Add optimized listeners
        window.addEventListener('scroll', optimizedScrollHandler, { passive: true });
        window.addEventListener('resize', optimizedResizeHandler, { passive: true });
        window.addEventListener('orientationchange', optimizedResizeHandler, { passive: true });
        
        // Optimize touch events
        const touchOptions = { passive: true, capture: false };
        body.addEventListener('touchstart', (e) => {
            // Add touch-active class for better feedback
            e.target.closest('button, .btn, [role="button"]')?.classList.add('touch-active');
        }, touchOptions);
        
        body.addEventListener('touchend', (e) => {
            // Remove touch-active class
            setTimeout(() => {
                document.querySelectorAll('.touch-active').forEach(el => {
                    el.classList.remove('touch-active');
                });
            }, 150);
        }, touchOptions);
    }
    
    // 7. Memory management
    function setupMemoryManagement() {
        // Clean up unused event listeners and DOM references
        let cleanupTimer;
        
        function cleanup() {
            // Clear unused cache entries
            if (DOMCache.cache.size > 50) {
                DOMCache.clear();
            }
            
            // Force garbage collection hint (if available)
            if (window.gc && typeof window.gc === 'function') {
                window.gc();
            }
        }
        
        // Cleanup on page visibility change
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                cleanup();
            }
        });
        
        // Periodic cleanup
        setInterval(cleanup, 30000); // Every 30 seconds
    }
    
    // 8. Optimize image handling
    function optimizeImages() {
        // Add loading="lazy" to images that don't have it
        document.querySelectorAll('img:not([loading])').forEach(img => {
            if (img.getBoundingClientRect().top > window.innerHeight) {
                img.loading = 'lazy';
            }
        });
        
        // Optimize image quality for mobile
        const images = document.querySelectorAll('img[src*="cloudinary"]');
        images.forEach(img => {
            const src = img.src;
            if (src && !src.includes('q_auto') && !src.includes('f_auto')) {
                // Add Cloudinary auto quality and format
                const optimizedSrc = src.replace(
                    /\/image\/upload\//,
                    '/image/upload/q_auto,f_auto,dpr_auto/'
                );
                img.src = optimizedSrc;
            }
        });
    }
    
    // 9. Battery and connection awareness
    function setupConnectionAwareness() {
        // Reduce functionality on slow connections
        if ('connection' in navigator) {
            const connection = navigator.connection;
            
            if (connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g') {
                // Disable non-essential animations
                document.documentElement.style.setProperty('--animation-duration', '0.1s');
                
                // Reduce image quality further
                document.querySelectorAll('img[src*="cloudinary"]').forEach(img => {
                    const src = img.src;
                    if (!src.includes('q_60')) {
                        img.src = src.replace(/q_auto/, 'q_60');
                    }
                });
            }
        }
        
        // Battery API awareness
        if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
                if (battery.level < 0.2 && !battery.charging) {
                    // Low battery mode - reduce animations
                    document.documentElement.classList.add('low-battery-mode');
                }
            });
        }
    }
    
    // 10. Initialize all optimizations
    function init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', init);
            return;
        }
        
        try {
            optimizeAnimations();
            setupIntersectionObserver();
            optimizeEventListeners();
            setupMemoryManagement();
            optimizeImages();
            setupConnectionAwareness();
            
            console.log('✅ Mobile Performance Optimizer: All optimizations applied');
        } catch (error) {
            console.error('❌ Mobile Performance Optimizer error:', error);
        }
    }
    
    // Expose utilities globally
    window.mobilePerf = {
        DOMCache,
        debounce,
        throttle,
        optimizeImages,
        isMobile
    };
    
    // Initialize
    init();
    
})();
