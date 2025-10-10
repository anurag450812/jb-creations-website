/*
 * THIRD-PARTY INTEGRATION OPTIMIZATIONS FOR JB CREATIONS WEBSITE
 * Optimized configurations for Firebase, Razorpay, Fast2SMS, and other services
 */

// ===== FIREBASE OPTIMIZATION =====
const optimizeFirebaseConfig = {
    // Enable offline persistence for better performance
    enablePersistence: true,
    
    // Optimize database settings
    database: {
        settings: {
            cacheSizeBytes: 40000000, // 40MB cache
            merge: true // Merge settings instead of overwrite
        }
    },
    
    // Performance monitoring
    performance: {
        dataCollectionEnabled: true,
        instrumentationEnabled: true
    },
    
    // Analytics optimization
    analytics: {
        // Only send analytics in production
        config: {
            send_page_view: false, // Manual page view tracking
            anonymize_ip: true,
            cookie_expires: 63072000 // 2 years
        }
    }
};

// Optimized Firebase initialization with error handling
async function initializeOptimizedFirebase() {
    try {
        // Initialize Firebase with performance optimizations
        if (typeof firebase !== 'undefined' && !firebase.apps.length) {
            const app = firebase.initializeApp(window.firebaseConfig);
            
            // Enable offline persistence
            if (firebase.firestore) {
                await firebase.firestore().enablePersistence({
                    synchronizeTabs: true
                }).catch(err => {
                    console.warn('Firebase persistence failed:', err);
                });
            }
            
            // Initialize performance monitoring
            if (firebase.performance && typeof firebase.performance === 'function') {
                const perf = firebase.performance();
                perf.instrumentationEnabled = true;
                perf.dataCollectionEnabled = true;
            }
            
            console.log('✅ Firebase optimized initialization complete');
            return app;
        }
    } catch (error) {
        console.error('❌ Firebase initialization error:', error);
        // Fallback to local storage if Firebase fails
        window.firebaseFallback = true;
    }
}

// ===== RAZORPAY OPTIMIZATION =====
const optimizedRazorpay = {
    // Lazy load Razorpay script
    async loadRazorpay() {
        if (window.Razorpay) {
            return window.Razorpay;
        }
        
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://checkout.razorpay.com/v1/checkout.js';
            script.onload = () => resolve(window.Razorpay);
            script.onerror = () => reject(new Error('Failed to load Razorpay'));
            document.head.appendChild(script);
        });
    },
    
    // Optimized payment options
    getOptimizedOptions(orderData) {
        return {
            ...orderData,
            // Performance optimizations
            modal: {
                confirm_close: true,
                animation: false, // Disable animations for faster load
                ondismiss: () => {
                    console.log('Payment modal dismissed');
                }
            },
            // Reduced timeout for faster response
            timeout: 300, // 5 minutes instead of default 15
            // Optimize for mobile
            theme: {
                color: '#16697A',
                backdrop_color: 'rgba(0,0,0,0.6)'
            },
            config: {
                display: {
                    blocks: {
                        banks: {
                            name: 'Most Used Methods',
                            instruments: [
                                { method: 'upi' },
                                { method: 'card' },
                                { method: 'netbanking' }
                            ]
                        }
                    },
                    sequence: ['block.banks'],
                    preferences: {
                        show_default_blocks: false
                    }
                }
            }
        };
    }
};

// ===== FAST2SMS OPTIMIZATION =====
const optimizedFast2SMS = {
    // Rate limiting to prevent API abuse
    rateLimiter: {
        attempts: new Map(),
        maxAttempts: 3,
        windowMs: 900000, // 15 minutes
        
        canMakeRequest(phoneNumber) {
            const key = phoneNumber;
            const now = Date.now();
            const attempts = this.attempts.get(key) || [];
            
            // Clean old attempts
            const validAttempts = attempts.filter(time => now - time < this.windowMs);
            this.attempts.set(key, validAttempts);
            
            return validAttempts.length < this.maxAttempts;
        },
        
        recordAttempt(phoneNumber) {
            const key = phoneNumber;
            const attempts = this.attempts.get(key) || [];
            attempts.push(Date.now());
            this.attempts.set(key, attempts);
        }
    },
    
    // Optimized OTP request with retry logic
    async sendOTP(phoneNumber, maxRetries = 2) {
        const formattedPhone = phoneNumber.replace(/\D/g, '');
        
        // Check rate limiting
        if (!this.rateLimiter.canMakeRequest(formattedPhone)) {
            throw new Error('Too many OTP requests. Please try again later.');
        }
        
        this.rateLimiter.recordAttempt(formattedPhone);
        
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetch('/api/send-otp', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        phone: formattedPhone,
                        attempt: attempt + 1
                    }),
                    // Add timeout
                    signal: AbortSignal.timeout(10000) // 10 seconds
                });
                
                if (response.ok) {
                    const data = await response.json();
                    console.log('✅ OTP sent successfully');
                    return data;
                }
                
                throw new Error(`HTTP ${response.status}`);
            } catch (error) {
                console.warn(`OTP attempt ${attempt + 1} failed:`, error.message);
                
                if (attempt === maxRetries) {
                    throw new Error('Failed to send OTP after multiple attempts');
                }
                
                // Exponential backoff
                await new Promise(resolve => 
                    setTimeout(resolve, Math.pow(2, attempt) * 1000)
                );
            }
        }
    }
};

// ===== CLOUDINARY OPTIMIZATION =====
const optimizedCloudinary = {
    // Responsive image transformations
    transformations: {
        thumbnail: {
            width: 200,
            height: 200,
            crop: 'fill',
            quality: 'auto:low',
            format: 'auto',
            fetch_format: 'auto'
        },
        preview: {
            width: 'auto',
            height: 600,
            crop: 'limit',
            quality: 'auto:good',
            format: 'auto',
            fetch_format: 'auto',
            dpr: 'auto' // Automatic device pixel ratio
        },
        mobile: {
            width: 'auto',
            height: 400,
            crop: 'limit',
            quality: 'auto:low',
            format: 'auto',
            fetch_format: 'auto',
            dpr: 'auto'
        }
    },
    
    // Progressive loading strategy
    async loadImageProgressively(publicId, container) {
        const isMobile = window.innerWidth <= 768;
        const transformation = isMobile ? 'mobile' : 'preview';
        
        // Load low quality placeholder first
        const placeholderUrl = cl.url(publicId, {
            ...this.transformations.thumbnail,
            quality: 'auto:low',
            blur: '300'
        });
        
        // Load full quality image
        const fullUrl = cl.url(publicId, this.transformations[transformation]);
        
        // Set placeholder
        if (container) {
            container.style.backgroundImage = `url(${placeholderUrl})`;
            container.style.backgroundSize = 'cover';
        }
        
        // Preload full image
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                if (container) {
                    container.style.backgroundImage = `url(${fullUrl})`;
                }
                resolve(fullUrl);
            };
            img.onerror = reject;
            img.src = fullUrl;
        });
    }
};

// ===== SUPABASE OPTIMIZATION =====
const optimizedSupabase = {
    // Connection pooling and caching
    config: {
        realtime: {
            params: {
                eventsPerSecond: 10
            }
        },
        auth: {
            autoRefreshToken: true,
            persistSession: true,
            detectSessionInUrl: false // Prevent URL parsing issues
        },
        global: {
            headers: {
                'X-Client-Info': 'jb-creations-web'
            }
        }
    },
    
    // Optimized query builder
    optimizeQuery(query) {
        return query
            .limit(50) // Reasonable default limit
            .abortSignal(AbortSignal.timeout(5000)); // 5 second timeout
    }
};

// ===== PERFORMANCE MONITORING =====
const performanceMonitor = {
    // Track third-party loading times
    trackLoadTime(service, startTime) {
        const loadTime = performance.now() - startTime;
        console.log(`📊 ${service} load time: ${loadTime.toFixed(2)}ms`);
        
        // Send to analytics if available
        if (typeof gtag !== 'undefined') {
            gtag('event', 'timing_complete', {
                name: `${service}_load`,
                value: Math.round(loadTime)
            });
        }
    },
    
    // Monitor API response times
    async monitorAPI(apiCall, serviceName) {
        const startTime = performance.now();
        try {
            const result = await apiCall;
            this.trackLoadTime(`${serviceName}_api`, startTime);
            return result;
        } catch (error) {
            const errorTime = performance.now() - startTime;
            console.error(`❌ ${serviceName} API error after ${errorTime.toFixed(2)}ms:`, error);
            throw error;
        }
    }
};

// ===== INITIALIZATION =====
async function initializeOptimizedIntegrations() {
    const startTime = performance.now();
    
    try {
        // Initialize Firebase first (critical)
        await initializeOptimizedFirebase();
        
        // Initialize other services in parallel (non-blocking)
        const initPromises = [];
        
        // Only load Razorpay when needed
        if (window.location.pathname.includes('checkout')) {
            initPromises.push(
                optimizedRazorpay.loadRazorpay()
                    .then(() => console.log('✅ Razorpay loaded'))
                    .catch(err => console.warn('⚠️ Razorpay load failed:', err))
            );
        }
        
        // Initialize Cloudinary if available
        if (window.cloudinary) {
            console.log('✅ Cloudinary ready');
        }
        
        await Promise.allSettled(initPromises);
        
        performanceMonitor.trackLoadTime('all_integrations', startTime);
        console.log('🚀 All optimized integrations initialized');
        
    } catch (error) {
        console.error('❌ Integration initialization error:', error);
    }
}

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeOptimizedIntegrations);
} else {
    initializeOptimizedIntegrations();
}

// Export optimized configurations
window.optimizedIntegrations = {
    firebase: optimizeFirebaseConfig,
    razorpay: optimizedRazorpay,
    fast2sms: optimizedFast2SMS,
    cloudinary: optimizedCloudinary,
    supabase: optimizedSupabase,
    monitor: performanceMonitor
};