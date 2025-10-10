/*
 * Mobile Browser Specific Optimizations
 * Handles performance issues specific to mobile browsers vs desktop emulation
 */

(function() {
    'use strict';
    
    // Only run on actual mobile devices
    const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
                     (navigator.maxTouchPoints && navigator.maxTouchPoints > 1);
    
    if (!isMobile) return;
    
    console.log('📱 Mobile Browser Optimizations: Initializing...');
    
    // 1. Handle mobile browser quirks
    function handleMobileBrowserQuirks() {
        // iOS Safari viewport fix
        if (/iPad|iPhone|iPod/.test(navigator.userAgent)) {
            const viewport = document.querySelector('meta[name="viewport"]');
            if (viewport) {
                viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
            }
            
            // Fix iOS Safari scrolling lag
            document.documentElement.style.webkitOverflowScrolling = 'touch';
            document.body.style.webkitOverflowScrolling = 'touch';
        }
        
        // Android Chrome optimizations
        if (/Android/.test(navigator.userAgent)) {
            // Disable text selection on UI elements
            document.body.style.webkitUserSelect = 'none';
            document.body.style.webkitTouchCallout = 'none';
            document.body.style.webkitTapHighlightColor = 'transparent';
        }
    }
    
    // 2. Optimize touch interactions
    function optimizeTouchInteractions() {
        const style = document.createElement('style');
        style.textContent = `
            /* Remove 300ms click delay */
            a, button, input, select, textarea, label {
                touch-action: manipulation;
            }
            
            /* Improve scrolling performance */
            .container, .preview-section, .customization-section {
                -webkit-overflow-scrolling: touch;
                overflow-scrolling: touch;
            }
            
            /* Prevent zoom on input focus */
            input[type="color"],
            input[type="date"],
            input[type="datetime"],
            input[type="datetime-local"],
            input[type="email"],
            input[type="month"],
            input[type="number"],
            input[type="password"],
            input[type="search"],
            input[type="tel"],
            input[type="text"],
            input[type="time"],
            input[type="url"],
            input[type="week"],
            select:focus,
            textarea {
                font-size: 16px !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // 3. Memory management for mobile
    function setupMobileMemoryManagement() {
        let memoryPressureDetected = false;
        
        // Monitor memory pressure
        if ('memory' in performance) {
            const checkMemory = () => {
                const memInfo = performance.memory;
                const usageRatio = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
                
                if (usageRatio > 0.8 && !memoryPressureDetected) {
                    memoryPressureDetected = true;
                    console.warn('🧠 Memory pressure detected, applying emergency optimizations');
                    
                    // Emergency optimizations
                    document.documentElement.classList.add('memory-pressure');
                    
                    // Disable animations
                    const style = document.createElement('style');
                    style.textContent = `
                        .memory-pressure * {
                            animation: none !important;
                            transition: none !important;
                        }
                    `;
                    document.head.appendChild(style);
                    
                    // Clear caches
                    if (window.mobilePerf && window.mobilePerf.DOMCache) {
                        window.mobilePerf.DOMCache.clear();
                    }
                }
            };
            
            setInterval(checkMemory, 5000);
        }
        
        // Handle memory warnings
        window.addEventListener('beforeunload', () => {
            // Clear any large objects
            if (window.state && window.state.image) {
                window.state.image = null;
            }
        });
    }
    
    // 4. Optimize for mobile GPU
    function optimizeForMobileGPU() {
        // Limit concurrent animations
        let activeAnimations = 0;
        const MAX_CONCURRENT_ANIMATIONS = 2;
        
        const originalAddClass = Element.prototype.classList.add;
        Element.prototype.classList.add = function(className) {
            if (className.includes('transitioning') || className.includes('morphing')) {
                if (activeAnimations >= MAX_CONCURRENT_ANIMATIONS) {
                    console.log('🎬 Animation throttled due to GPU limitations');
                    return;
                }
                activeAnimations++;
                
                setTimeout(() => {
                    activeAnimations = Math.max(0, activeAnimations - 1);
                }, 600);
            }
            
            return originalAddClass.call(this, className);
        };
    }
    
    // 5. Network-aware optimizations
    function setupNetworkAwareOptimizations() {
        if ('connection' in navigator) {
            const connection = navigator.connection;
            
            const optimizeForConnection = () => {
                const effectiveType = connection.effectiveType;
                
                if (effectiveType === 'slow-2g' || effectiveType === '2g') {
                    // Aggressively reduce quality on slow connections
                    document.documentElement.classList.add('slow-connection');
                    
                    // Disable non-essential features
                    const style = document.createElement('style');
                    style.textContent = `
                        .slow-connection .frame-transitioning,
                        .slow-connection .frame-wrapper-transitioning,
                        .slow-connection .frame-morphing {
                            animation: none !important;
                        }
                        
                        .slow-connection img {
                            image-rendering: pixelated;
                        }
                    `;
                    document.head.appendChild(style);
                }
            };
            
            connection.addEventListener('change', optimizeForConnection);
            optimizeForConnection();
        }
    }
    
    // 6. Battery-aware optimizations
    function setupBatteryAwareOptimizations() {
        if ('getBattery' in navigator) {
            navigator.getBattery().then(battery => {
                const optimizeForBattery = () => {
                    if (battery.level < 0.2 && !battery.charging) {
                        document.documentElement.classList.add('low-battery');
                        console.log('🔋 Low battery detected, reducing performance overhead');
                        
                        // Disable animations and transitions
                        const style = document.createElement('style');
                        style.textContent = `
                            .low-battery * {
                                animation-duration: 0s !important;
                                transition-duration: 0s !important;
                            }
                        `;
                        document.head.appendChild(style);
                    } else {
                        document.documentElement.classList.remove('low-battery');
                    }
                };
                
                battery.addEventListener('levelchange', optimizeForBattery);
                battery.addEventListener('chargingchange', optimizeForBattery);
                optimizeForBattery();
            });
        }
    }
    
    // 7. Frame rate optimization
    function optimizeFrameRate() {
        let lastFrame = 0;
        let frameCount = 0;
        let fps = 60;
        
        function measureFPS(timestamp) {
            frameCount++;
            
            if (timestamp - lastFrame >= 1000) {
                fps = Math.round((frameCount * 1000) / (timestamp - lastFrame));
                frameCount = 0;
                lastFrame = timestamp;
                
                // Adapt animations based on FPS
                if (fps < 30) {
                    document.documentElement.classList.add('low-fps');
                    console.log(`📊 Low FPS detected (${fps}), reducing animation complexity`);
                } else {
                    document.documentElement.classList.remove('low-fps');
                }
            }
            
            requestAnimationFrame(measureFPS);
        }
        
        requestAnimationFrame(measureFPS);
        
        // Add CSS for low FPS mode
        const style = document.createElement('style');
        style.textContent = `
            .low-fps .frame-transitioning,
            .low-fps .frame-wrapper-transitioning,
            .low-fps .frame-morphing {
                animation-duration: 0.1s !important;
                animation-timing-function: linear !important;
            }
        `;
        document.head.appendChild(style);
    }
    
    // 8. Initialize all optimizations
    function init() {
        try {
            handleMobileBrowserQuirks();
            optimizeTouchInteractions();
            setupMobileMemoryManagement();
            optimizeForMobileGPU();
            setupNetworkAwareOptimizations();
            setupBatteryAwareOptimizations();
            optimizeFrameRate();
            
            console.log('✅ Mobile Browser Optimizations: All systems operational');
        } catch (error) {
            console.error('❌ Mobile Browser Optimizations error:', error);
        }
    }
    
    // Run after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        setTimeout(init, 0);
    }
    
})();