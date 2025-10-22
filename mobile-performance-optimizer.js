/**
 * Mobile Performance Optimizer
 * Caches static content locally and optimizes scroll performance
 * Version: 1.0.0
 */

class MobilePerformanceOptimizer {
    constructor() {
        this.CACHE_VERSION = 'jb-creations-v1.0';
        this.CACHE_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days
        this.isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
        this.isLowEndDevice = this.detectLowEndDevice();
        
        this.init();
    }

    init() {
        if (this.isMobile) {
            console.log('🚀 Mobile Performance Optimizer: Initializing...');
            this.optimizeScrolling();
            this.cacheStaticContent();
            this.lazyLoadImages();
            this.optimizeAnimations();
            this.prefetchCriticalResources();
            this.setupIntersectionObserver();
            
            if (this.isLowEndDevice) {
                this.applyLowEndOptimizations();
            }
        }
    }

    detectLowEndDevice() {
        // Detect low-end devices based on hardware concurrency and memory
        const cores = navigator.hardwareConcurrency || 2;
        const memory = navigator.deviceMemory || 2;
        return cores <= 2 || memory <= 2;
    }

    // ===== SCROLL OPTIMIZATION =====
    optimizeScrolling() {
        console.log('📱 Optimizing scroll performance...');
        
        // Add CSS for smooth scrolling
        const style = document.createElement('style');
        style.textContent = `
            /* Optimize scroll performance on mobile */
            * {
                -webkit-overflow-scrolling: touch;
                -webkit-tap-highlight-color: transparent;
            }
            
            body, html {
                overscroll-behavior-y: contain;
                scroll-behavior: auto !important; /* Disable smooth scroll on mobile */
            }
            
            /* Use GPU acceleration for scroll elements */
            .landing-content,
            .hero-section,
            .sub-section,
            .features-section,
            .stats-section,
            .preview-section {
                will-change: scroll-position;
                transform: translateZ(0);
                backface-visibility: hidden;
                -webkit-backface-visibility: hidden;
            }
            
            /* Optimize images for scroll */
            img {
                content-visibility: auto;
                contain-intrinsic-size: 300px;
            }
            
            /* Reduce repaints during scroll */
            @media (max-width: 768px) {
                * {
                    pointer-events: auto;
                }
                
                *:not(input):not(button):not(a):not(select):not(textarea) {
                    user-select: none;
                    -webkit-user-select: none;
                }
            }
        `;
        document.head.appendChild(style);

        // Debounce scroll events
        let scrollTimeout;
        let isScrolling = false;

        const handleScrollStart = () => {
            if (!isScrolling) {
                isScrolling = true;
                document.body.classList.add('is-scrolling');
            }
        };

        const handleScrollEnd = () => {
            isScrolling = false;
            document.body.classList.remove('is-scrolling');
        };

        window.addEventListener('scroll', () => {
            handleScrollStart();
            clearTimeout(scrollTimeout);
            scrollTimeout = setTimeout(handleScrollEnd, 150);
        }, { passive: true });

        // Use passive event listeners
        document.addEventListener('touchstart', () => {}, { passive: true });
        document.addEventListener('touchmove', () => {}, { passive: true });
        document.addEventListener('touchend', () => {}, { passive: true });
    }

    // ===== LOCAL STORAGE CACHING =====
    cacheStaticContent() {
        console.log('💾 Setting up local storage cache...');
        
        const cacheableSelectors = [
            '.hero-section',
            '.features-section',
            '.stats-section',
            '.sub-section'
        ];

        // Cache text content and structure
        cacheableSelectors.forEach(selector => {
            const elements = document.querySelectorAll(selector);
            elements.forEach((element, index) => {
                const cacheKey = `${this.CACHE_VERSION}_${selector}_${index}`;
                const cachedData = this.getFromCache(cacheKey);
                
                if (!cachedData) {
                    // Clone element without images for structure caching
                    const clone = element.cloneNode(true);
                    const images = clone.querySelectorAll('img');
                    images.forEach(img => img.remove());
                    
                    this.saveToCache(cacheKey, {
                        html: clone.innerHTML,
                        timestamp: Date.now()
                    });
                }
            });
        });

        // Cache critical CSS
        this.cacheCriticalCSS();
    }

    cacheCriticalCSS() {
        const styleSheets = Array.from(document.styleSheets);
        const criticalCSS = [];

        try {
            styleSheets.forEach(sheet => {
                if (sheet.href && sheet.href.includes('style.css')) {
                    const cacheKey = `${this.CACHE_VERSION}_critical_css`;
                    
                    fetch(sheet.href)
                        .then(response => response.text())
                        .then(css => {
                            this.saveToCache(cacheKey, {
                                css: css,
                                timestamp: Date.now()
                            });
                        })
                        .catch(err => console.warn('Failed to cache CSS:', err));
                }
            });
        } catch (e) {
            console.warn('CSS caching skipped due to CORS:', e);
        }
    }

    // ===== LAZY LOADING =====
    lazyLoadImages() {
        console.log('🖼️ Setting up lazy loading...');
        
        const images = document.querySelectorAll('img[data-src]');
        
        if ('IntersectionObserver' in window) {
            const imageObserver = new IntersectionObserver((entries, observer) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        const img = entry.target;
                        
                        // Load from cache if available
                        const cachedImg = this.getImageFromCache(img.dataset.src);
                        if (cachedImg) {
                            img.src = cachedImg;
                        } else {
                            img.src = img.dataset.src;
                            this.cacheImage(img.dataset.src);
                        }
                        
                        img.classList.add('loaded');
                        observer.unobserve(img);
                    }
                });
            }, {
                rootMargin: '50px 0px',
                threshold: 0.01
            });

            images.forEach(img => imageObserver.observe(img));
        } else {
            // Fallback for older browsers
            images.forEach(img => {
                img.src = img.dataset.src;
            });
        }
    }

    // ===== ANIMATION OPTIMIZATION =====
    optimizeAnimations() {
        console.log('✨ Optimizing animations...');
        
        if (this.isLowEndDevice) {
            // Disable animations on low-end devices
            const style = document.createElement('style');
            style.textContent = `
                @media (max-width: 768px) {
                    *, *::before, *::after {
                        animation-duration: 0.01ms !important;
                        animation-iteration-count: 1 !important;
                        transition-duration: 0.01ms !important;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Use requestAnimationFrame for smooth animations
        let rafId = null;
        const elements = document.querySelectorAll('.feature-card, .stat-card, .step-card');
        
        elements.forEach(element => {
            element.addEventListener('mouseenter', () => {
                if (rafId) cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(() => {
                    element.style.transform = 'translateY(-5px)';
                });
            });
            
            element.addEventListener('mouseleave', () => {
                if (rafId) cancelAnimationFrame(rafId);
                rafId = requestAnimationFrame(() => {
                    element.style.transform = 'translateY(0)';
                });
            });
        });
    }

    // ===== PREFETCH RESOURCES =====
    prefetchCriticalResources() {
        console.log('⚡ Prefetching critical resources...');
        
        const criticalImages = [
            'room-preview-images/13X19 LANDSCAPE/1.jpg',
            'room-preview-images/13X19 PORTRAIT/1.jpg'
        ];

        criticalImages.forEach(src => {
            const cachedImg = this.getImageFromCache(src);
            if (!cachedImg) {
                const link = document.createElement('link');
                link.rel = 'prefetch';
                link.href = src;
                link.as = 'image';
                document.head.appendChild(link);
            }
        });
    }

    // ===== INTERSECTION OBSERVER FOR VISIBILITY =====
    setupIntersectionObserver() {
        const sections = document.querySelectorAll('.hero-section, .sub-section, .features-section, .stats-section');

        // Ensure critical CTA is never hidden on mobile
        const ctaSection = document.querySelector('.cta-sub-section');
        if (ctaSection) {
            ctaSection.style.contentVisibility = 'visible';
            ctaSection.classList.add('visible');
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    entry.target.style.contentVisibility = 'visible';
                } else {
                    // Never hide CTA section; keep it paint-ready
                    if (entry.target.classList.contains('cta-sub-section')) {
                        entry.target.style.contentVisibility = 'visible';
                        return;
                    }

                    // Remove non-critical elements from paint when far out of view
                    // Be less aggressive on mobile to avoid late reveals
                    const farBelowViewport = entry.boundingClientRect.top > window.innerHeight * 3;
                    if (farBelowViewport) {
                        entry.target.style.contentVisibility = 'hidden';
                    } else {
                        entry.target.style.contentVisibility = 'visible';
                    }
                }
            });
        }, {
            // Reveal earlier on mobile to avoid multiple scrolls before visible
            rootMargin: '400px 0px',
            threshold: 0.01
        });

        sections.forEach(section => observer.observe(section));
    }

    // ===== LOW-END DEVICE OPTIMIZATIONS =====
    applyLowEndOptimizations() {
        console.log('📉 Applying low-end device optimizations...');
        
        // Reduce image quality
        document.querySelectorAll('img').forEach(img => {
            img.loading = 'lazy';
            img.decoding = 'async';
        });

        // Disable expensive effects
        const style = document.createElement('style');
        style.textContent = `
            @media (max-width: 768px) {
                .hero-section::before,
                .sub-section::before,
                .glass-effect,
                .rain-glass,
                .raindrop,
                .water-droplet {
                    display: none !important;
                }
                
                * {
                    box-shadow: none !important;
                    text-shadow: none !important;
                    backdrop-filter: none !important;
                    filter: none !important;
                }
            }
        `;
        document.head.appendChild(style);
    }

    // ===== CACHE UTILITIES =====
    saveToCache(key, data) {
        try {
            const cacheData = {
                ...data,
                version: this.CACHE_VERSION,
                timestamp: Date.now()
            };
            localStorage.setItem(key, JSON.stringify(cacheData));
        } catch (e) {
            console.warn('Failed to save to cache:', e);
            // Clear old cache if storage is full
            if (e.name === 'QuotaExceededError') {
                this.clearOldCache();
            }
        }
    }

    getFromCache(key) {
        try {
            const cached = localStorage.getItem(key);
            if (!cached) return null;

            const data = JSON.parse(cached);
            
            // Check if cache is expired
            if (Date.now() - data.timestamp > this.CACHE_EXPIRY) {
                localStorage.removeItem(key);
                return null;
            }

            // Check version
            if (data.version !== this.CACHE_VERSION) {
                localStorage.removeItem(key);
                return null;
            }

            return data;
        } catch (e) {
            console.warn('Failed to read from cache:', e);
            return null;
        }
    }

    cacheImage(src) {
        const cacheKey = `${this.CACHE_VERSION}_img_${src}`;
        
        fetch(src)
            .then(response => response.blob())
            .then(blob => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    this.saveToCache(cacheKey, {
                        dataUrl: reader.result,
                        timestamp: Date.now()
                    });
                };
                reader.readAsDataURL(blob);
            })
            .catch(err => console.warn('Failed to cache image:', err));
    }

    getImageFromCache(src) {
        const cacheKey = `${this.CACHE_VERSION}_img_${src}`;
        const cached = this.getFromCache(cacheKey);
        return cached ? cached.dataUrl : null;
    }

    clearOldCache() {
        console.log('🧹 Clearing old cache...');
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('jb-creations-') && !key.startsWith(this.CACHE_VERSION)) {
                localStorage.removeItem(key);
            }
        });
    }

    // ===== PUBLIC API =====
    clearCache() {
        console.log('🗑️ Clearing all cache...');
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('jb-creations-')) {
                localStorage.removeItem(key);
            }
        });
        console.log('✅ Cache cleared!');
    }

    getCacheSize() {
        let total = 0;
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith('jb-creations-')) {
                total += (localStorage.getItem(key).length * 2) / 1024; // KB
            }
        });
        return total.toFixed(2) + ' KB';
    }
}

// Initialize optimizer when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        window.mobileOptimizer = new MobilePerformanceOptimizer();
    });
} else {
    window.mobileOptimizer = new MobilePerformanceOptimizer();
}

// Add to window for debugging
window.clearMobileCache = () => {
    if (window.mobileOptimizer) {
        window.mobileOptimizer.clearCache();
    }
};

window.checkCacheSize = () => {
    if (window.mobileOptimizer) {
        console.log('Cache size:', window.mobileOptimizer.getCacheSize());
    }
};

console.log('✅ Mobile Performance Optimizer loaded!');
