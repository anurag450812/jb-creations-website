/*
 * CACHING AND OPTIMIZATION STRATEGIES FOR JB CREATIONS WEBSITE
 * Comprehensive performance improvements including lazy loading, caching, and resource optimization
 */

// ===== SERVICE WORKER FOR CACHING =====
const cacheConfig = {
    version: 'v1.2.0',
    staticCacheName: 'jb-creations-static-v1.2.0',
    dynamicCacheName: 'jb-creations-dynamic-v1.2.0',
    imageCacheName: 'jb-creations-images-v1.2.0',
    maxDynamicCacheSize: 50,
    maxImageCacheSize: 100
};

// Register service worker for caching
if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
        try {
            const registration = await navigator.serviceWorker.register('/sw.js');
            console.log('✅ Service Worker registered:', registration);
        } catch (error) {
            console.warn('⚠️ Service Worker registration failed:', error);
        }
    });
}

// ===== RESOURCE PRELOADING =====
const resourcePreloader = {
    // Critical resources to preload
    criticalResources: [
        { href: '/style.css', as: 'style' },
        { href: '/script.js', as: 'script' },
        { href: '/performance-optimizations.css', as: 'style' },
        { href: '/mobile-responsiveness-fixes.css', as: 'style' }
    ],
    
    // Preload critical resources
    preloadCritical() {
        this.criticalResources.forEach(resource => {
            if (!document.querySelector(`link[href="${resource.href}"]`)) {
                const link = document.createElement('link');
                link.rel = 'preload';
                link.href = resource.href;
                link.as = resource.as;
                if (resource.as === 'style') {
                    link.onload = () => link.rel = 'stylesheet';
                }
                document.head.appendChild(link);
            }
        });
    },
    
    // Preload next page resources
    preloadNextPage(url) {
        const link = document.createElement('link');
        link.rel = 'prefetch';
        link.href = url;
        document.head.appendChild(link);
    }
};

// ===== LAZY LOADING IMPLEMENTATION =====
const lazyLoader = {
    imageObserver: null,
    
    // Initialize intersection observer for images
    init() {
        if (!('IntersectionObserver' in window)) {
            // Fallback for browsers without IntersectionObserver
            this.loadAllImages();
            return;
        }
        
        this.imageObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    this.loadImage(entry.target);
                    this.imageObserver.unobserve(entry.target);
                }
            });
        }, {
            root: null,
            rootMargin: '50px',
            threshold: 0.1
        });
        
        this.observeImages();
    },
    
    // Observe all images with data-src attribute
    observeImages() {
        const lazyImages = document.querySelectorAll('img[data-src], [data-bg]');
        lazyImages.forEach(img => this.imageObserver.observe(img));
    },
    
    // Load individual image
    loadImage(img) {
        if (img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
        }
        if (img.dataset.bg) {
            img.style.backgroundImage = `url(${img.dataset.bg})`;
            img.removeAttribute('data-bg');
        }
        img.classList.add('loaded');
    },
    
    // Fallback: load all images immediately
    loadAllImages() {
        const lazyImages = document.querySelectorAll('img[data-src], [data-bg]');
        lazyImages.forEach(img => this.loadImage(img));
    }
};

// ===== IMAGE OPTIMIZATION =====
const imageOptimizer = {
    // Convert images to WebP format if supported
    supportsWebP: null,
    
    async checkWebPSupport() {
        if (this.supportsWebP !== null) return this.supportsWebP;
        
        return new Promise(resolve => {
            const webP = new Image();
            webP.onload = webP.onerror = () => {
                this.supportsWebP = webP.height === 2;
                resolve(this.supportsWebP);
            };
            webP.src = 'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA';
        });
    },
    
    // Get optimized image URL
    async getOptimizedUrl(originalUrl, width = 800, quality = 80) {
        const supportsWebP = await this.checkWebPSupport();
        
        // If using Cloudinary, add optimizations
        if (originalUrl.includes('cloudinary.com')) {
            const baseUrl = originalUrl.split('/upload/')[0] + '/upload/';
            const imagePath = originalUrl.split('/upload/')[1];
            
            let transformations = `w_${width},q_${quality},f_auto`;
            if (supportsWebP) {
                transformations += ',f_webp';
            }
            
            return `${baseUrl}${transformations}/${imagePath}`;
        }
        
        return originalUrl;
    },
    
    // Optimize all images on page
    async optimizePageImages() {
        const images = document.querySelectorAll('img[src]');
        const supportsWebP = await this.checkWebPSupport();
        
        images.forEach(async img => {
            if (img.dataset.optimized) return;
            
            const optimizedUrl = await this.getOptimizedUrl(
                img.src, 
                img.width || 800,
                80
            );
            
            if (optimizedUrl !== img.src) {
                img.src = optimizedUrl;
                img.dataset.optimized = 'true';
            }
        });
    }
};

// ===== LOCAL STORAGE CACHING =====
const localCache = {
    prefix: 'jb_cache_',
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    
    // Set cache with expiration
    set(key, data, customMaxAge = null) {
        try {
            const item = {
                data: data,
                timestamp: Date.now(),
                maxAge: customMaxAge || this.maxAge
            };
            localStorage.setItem(this.prefix + key, JSON.stringify(item));
        } catch (error) {
            console.warn('Cache set failed:', error);
        }
    },
    
    // Get cache if not expired
    get(key) {
        try {
            const item = localStorage.getItem(this.prefix + key);
            if (!item) return null;
            
            const parsed = JSON.parse(item);
            const now = Date.now();
            
            if (now - parsed.timestamp > parsed.maxAge) {
                this.remove(key);
                return null;
            }
            
            return parsed.data;
        } catch (error) {
            console.warn('Cache get failed:', error);
            return null;
        }
    },
    
    // Remove cache item
    remove(key) {
        try {
            localStorage.removeItem(this.prefix + key);
        } catch (error) {
            console.warn('Cache remove failed:', error);
        }
    },
    
    // Clear all cache
    clear() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                }
            });
        } catch (error) {
            console.warn('Cache clear failed:', error);
        }
    },
    
    // Clean expired cache
    cleanExpired() {
        try {
            const keys = Object.keys(localStorage);
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    const item = localStorage.getItem(key);
                    if (item) {
                        const parsed = JSON.parse(item);
                        if (Date.now() - parsed.timestamp > parsed.maxAge) {
                            localStorage.removeItem(key);
                        }
                    }
                }
            });
        } catch (error) {
            console.warn('Cache clean failed:', error);
        }
    }
};

// ===== API RESPONSE CACHING =====
const apiCache = {
    // Cached fetch with automatic caching
    async cachedFetch(url, options = {}, cacheTime = 300000) { // 5 minutes default
        const cacheKey = `api_${url}_${JSON.stringify(options)}`;
        
        // Try to get from cache first
        const cached = localCache.get(cacheKey);
        if (cached) {
            console.log('📦 Using cached response for:', url);
            return cached;
        }
        
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Cache-Control': 'public, max-age=300',
                    ...options.headers
                }
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            // Cache successful responses
            localCache.set(cacheKey, data, cacheTime);
            
            return data;
        } catch (error) {
            console.error('API request failed:', error);
            throw error;
        }
    }
};

// ===== BUNDLE SPLITTING AND LOADING =====
const moduleLoader = {
    loadedModules: new Set(),
    
    // Dynamically load JavaScript modules
    async loadModule(moduleName, src) {
        if (this.loadedModules.has(moduleName)) {
            return;
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.async = true;
            script.onload = () => {
                this.loadedModules.add(moduleName);
                console.log(`✅ Module loaded: ${moduleName}`);
                resolve();
            };
            script.onerror = () => {
                console.error(`❌ Failed to load module: ${moduleName}`);
                reject(new Error(`Failed to load ${moduleName}`));
            };
            document.head.appendChild(script);
        });
    },
    
    // Load modules based on page requirements
    async loadPageModules() {
        const currentPage = window.location.pathname;
        
        const moduleMap = {
            '/customize.html': [
                { name: 'imageProcessor', src: '/js/image-processor.js' },
                { name: 'frameCustomizer', src: '/js/frame-customizer.js' }
            ],
            '/cart.html': [
                { name: 'cartManager', src: '/js/cart-manager.js' }
            ],
            '/checkout.html': [
                { name: 'razorpay', src: 'https://checkout.razorpay.com/v1/checkout.js' },
                { name: 'paymentProcessor', src: '/js/payment-processor.js' }
            ]
        };
        
        const modules = moduleMap[currentPage] || [];
        
        for (const module of modules) {
            try {
                await this.loadModule(module.name, module.src);
            } catch (error) {
                console.warn(`Non-critical module failed to load: ${module.name}`);
            }
        }
    }
};

// ===== PERFORMANCE MONITORING =====
const performanceMonitor = {
    // Monitor Core Web Vitals
    monitorWebVitals() {
        // Largest Contentful Paint
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            const lastEntry = entries[entries.length - 1];
            console.log('📊 LCP:', lastEntry.startTime);
        }).observe({ entryTypes: ['largest-contentful-paint'] });
        
        // First Input Delay
        new PerformanceObserver((entryList) => {
            const entries = entryList.getEntries();
            entries.forEach(entry => {
                console.log('📊 FID:', entry.processingStart - entry.startTime);
            });
        }).observe({ entryTypes: ['first-input'] });
        
        // Cumulative Layout Shift
        new PerformanceObserver((entryList) => {
            let cumulativeScore = 0;
            entryList.getEntries().forEach(entry => {
                if (!entry.hadRecentInput) {
                    cumulativeScore += entry.value;
                }
            });
            console.log('📊 CLS:', cumulativeScore);
        }).observe({ entryTypes: ['layout-shift'] });
    },
    
    // Monitor resource loading
    monitorResources() {
        window.addEventListener('load', () => {
            const resources = performance.getEntriesByType('resource');
            const slowResources = resources.filter(resource => 
                resource.duration > 1000
            );
            
            if (slowResources.length > 0) {
                console.warn('🐌 Slow loading resources:', slowResources);
            }
        });
    }
};

// ===== INITIALIZATION =====
async function initializeCachingAndOptimization() {
    const startTime = performance.now();
    
    try {
        // Preload critical resources
        resourcePreloader.preloadCritical();
        
        // Initialize lazy loading
        lazyLoader.init();
        
        // Clean expired cache
        localCache.cleanExpired();
        
        // Load page-specific modules
        await moduleLoader.loadPageModules();
        
        // Optimize images
        await imageOptimizer.optimizePageImages();
        
        // Start performance monitoring
        if ('PerformanceObserver' in window) {
            performanceMonitor.monitorWebVitals();
            performanceMonitor.monitorResources();
        }
        
        const loadTime = performance.now() - startTime;
        console.log(`🚀 Caching and optimization initialized in ${loadTime.toFixed(2)}ms`);
        
    } catch (error) {
        console.error('❌ Optimization initialization error:', error);
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeCachingAndOptimization);
} else {
    initializeCachingAndOptimization();
}

// Export optimization utilities
window.optimizationUtils = {
    resourcePreloader,
    lazyLoader,
    imageOptimizer,
    localCache,
    apiCache,
    moduleLoader,
    performanceMonitor
};