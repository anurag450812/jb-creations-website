/**
 * Direct Browser-to-Cloudinary Upload Solution V2.1
 * This replaces the minimal server with direct uploads from browser to Cloudinary
 * Now with IndexedDB support for high-quality images
 */

console.log('═══════════════════════════════════════════════════════════════');
console.log('☁️ CLOUDINARY-DIRECT.JS VERSION 2.1 - INDEXEDDB SUPPORT');
console.log('═══════════════════════════════════════════════════════════════');

// ═══════════════════════════════════════════════════════════════
// IndexedDB Storage for Large Images (needed for cloudinary upload)
// ═══════════════════════════════════════════════════════════════
const ImageDBReader = {
    dbName: 'JBCreationsImages',
    storeName: 'cartImages',
    version: 1,
    
    async open() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.version);
            request.onerror = () => reject(request.error);
            request.onsuccess = () => resolve(request.result);
            request.onupgradeneeded = (event) => {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(this.storeName)) {
                    db.createObjectStore(this.storeName, { keyPath: 'id' });
                }
            };
        });
    },
    
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
                        resolve(null);
                    }
                };
                
                request.onerror = () => reject(request.error);
                transaction.oncomplete = () => db.close();
            });
        } catch (error) {
            console.error('❌ IndexedDB get error:', error);
            return null;
        }
    }
};
// ═══════════════════════════════════════════════════════════════

class CloudinaryDirect {
    constructor() {
        this.cloudName = 'dfhxnpp9m'; // Your Cloudinary cloud name
        this.uploadPreset = 'jb-creations-orders'; // You'll need to create this in Cloudinary dashboard
        this.apiUrl = `https://api.cloudinary.com/v1_1/${this.cloudName}/image/upload`;
    }

    /**
     * Upload image directly to Cloudinary from browser
     * @param {string} imageData - Base64 image data
     * @param {string} publicId - Public ID for the image
     * @returns {Promise<Object>} - Upload result
     */
    async uploadImage(imageData, publicId) {
        try {
            console.log('🔄 Uploading image directly to Cloudinary...');
            console.log('📊 Image data length:', imageData ? imageData.length : 0, 'bytes');
            console.log('📊 Image data type:', typeof imageData);
            console.log('📊 Image data starts with:', imageData ? imageData.substring(0, 50) : 'N/A');
            
            if (!imageData || imageData.length < 100) {
                throw new Error(`Invalid image data: length=${imageData ? imageData.length : 0}`);
            }
            
            // Convert base64 to blob
            console.log('🔄 Converting base64 to blob...');
            const response = await fetch(imageData);
            const blob = await response.blob();
            console.log('📊 Blob size:', blob.size, 'bytes, type:', blob.type);
            
            if (blob.size < 1000) {
                console.warn('⚠️ Blob size is very small, image may be corrupted');
            }
            
            // Create form data for Cloudinary
            const formData = new FormData();
            formData.append('file', blob);
            formData.append('upload_preset', this.uploadPreset);
            formData.append('public_id', publicId);
            formData.append('folder', 'jb-creations-orders');
            
            console.log('🔼 Uploading to Cloudinary:', this.apiUrl);
            console.log('📊 Upload preset:', this.uploadPreset);
            console.log('📊 Public ID:', publicId);
            
            // Upload to Cloudinary
            const uploadResponse = await fetch(this.apiUrl, {
                method: 'POST',
                body: formData
            });
            
            console.log('📊 Cloudinary response status:', uploadResponse.status, uploadResponse.statusText);
            
            if (!uploadResponse.ok) {
                const errorText = await uploadResponse.text();
                console.error('❌ Cloudinary error response:', errorText);
                throw new Error(`Cloudinary upload failed: ${uploadResponse.status} - ${errorText}`);
            }
            
            const result = await uploadResponse.json();
            
            console.log('✅ Direct upload successful:', result.secure_url);
            console.log('📊 Uploaded image dimensions:', result.width, 'x', result.height);
            console.log('📊 Uploaded image size:', result.bytes, 'bytes');

            return {
                success: true,
                secure_url: result.secure_url,
                public_id: result.public_id,
                width: result.width,
                height: result.height,
                bytes: result.bytes
            };
            
        } catch (error) {
            console.error('❌ Direct upload failed:', error);
            console.error('❌ Error details:', error.message);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Upload multiple images for an order
     * @param {Array} items - Order items with image data
     * @param {string} orderNumber - Order number for folder organization
     * @returns {Promise<Array>} - Array of upload results
     */
    async uploadOrderImages(items, orderNumber) {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('🖼️ CLOUDINARY DIRECT - uploadOrderImages CALLED');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('📦 Items count:', items ? items.length : 0);
        console.log('📦 Order number:', orderNumber);
        
        // Log each item and check sessionStorage availability
        if (items) {
            items.forEach((item, idx) => {
                console.log(`📸 Item ${idx + 1} - ID: ${item.id}`, {
                    hasDirectHighQuality: !!item.highQualityPrintImage,
                    hasDirectAdminCropped: !!item.adminCroppedImage,
                    hasDirectPrint: !!item.printImage,
                    hasDirectOriginal: !!item.originalImage,
                    hasThumbnail: !!item.thumbnailImage
                });
                
                // Check sessionStorage
                const fullKey = `cartImage_full_${item.id}`;
                const compressedKey = `cartImage_${item.id}`;
                console.log(`📁 SessionStorage check for item ${item.id}:`, {
                    fullKeyExists: !!sessionStorage.getItem(fullKey),
                    compressedKeyExists: !!sessionStorage.getItem(compressedKey)
                });
            });
        }
        console.log('═══════════════════════════════════════════════════════════════');
        
        const results = [];
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            // Priority for HIGH-QUALITY print-ready image:
            // 1. highQualityPrintImage (BEST - full resolution from original, cropped and adjusted)
            // 2. adminCroppedImage (good - may be the same as highQualityPrintImage)
            // 3. printImage (processed image without frame borders)
            // 4. originalImage (user's uploaded image)
            // 5. displayImage/previewImage (last resort - may have frame borders)
            
            let imageData = null;
            
            // First, try to get the best quality image from IndexedDB (new primary storage)
            if (item.id) {
                try {
                    // PRIORITY 0: IndexedDB (stores high-quality images without size limits)
                    const indexedDBData = await ImageDBReader.getImage(item.id);
                    if (indexedDBData) {
                        imageData = indexedDBData.highQualityPrintImage || indexedDBData.adminCroppedImage || indexedDBData.printImage || indexedDBData.originalImage;
                        if (imageData) {
                            console.log(`📸 Retrieved high-quality image from IndexedDB for item ${item.id}:`, 
                                indexedDBData.highQualityPrintImage ? 'highQualityPrintImage' :
                                (indexedDBData.adminCroppedImage ? 'adminCroppedImage' : (indexedDBData.printImage ? 'printImage' : 'originalImage')),
                                `Size: ${Math.round(imageData.length / 1024)} KB`);
                        }
                    }
                    
                    // PRIORITY 1: Try full-quality sessionStorage (legacy fallback)
                    if (!imageData) {
                        const fullImageKey = `cartImage_full_${item.id}`;
                        const fullImageData = sessionStorage.getItem(fullImageKey);
                        if (fullImageData) {
                            const parsed = JSON.parse(fullImageData);
                            imageData = parsed.highQualityPrintImage || parsed.adminCroppedImage || parsed.printImage || parsed.originalImage;
                            if (imageData) {
                                console.log(`📸 Retrieved high-quality image from sessionStorage full storage for item ${item.id}`);
                            }
                        }
                    }
                    
                    // If not found, try compressed storage
                    if (!imageData) {
                        const compressedImageKey = `cartImage_${item.id}`;
                        const compressedImageData = sessionStorage.getItem(compressedImageKey);
                        if (compressedImageData) {
                            const parsed = JSON.parse(compressedImageData);
                            imageData = parsed.highQualityPrintImage || parsed.adminCroppedImage || parsed.printImage || parsed.originalImage;
                            if (imageData) {
                                console.log(`📸 Retrieved image from compressed storage for item ${item.id}`);
                            }
                        }
                    }
                    
                    // If not in sessionStorage, try window storage
                    if (!imageData && window.cartImageStorage && window.cartImageStorage[item.id]) {
                        const windowData = window.cartImageStorage[item.id];
                        imageData = windowData.highQualityPrintImage || windowData.adminCroppedImage || windowData.printImage || windowData.originalImage;
                        if (imageData) {
                            console.log(`📸 Retrieved image from window storage for item ${item.id}`);
                        }
                    }
                } catch (error) {
                    console.warn(`⚠️ Error retrieving image from storage for item ${item.id}:`, error);
                }
            }
            
            // Fallback to direct item properties if storage lookup failed
            if (!imageData) {
                imageData = item.highQualityPrintImage || item.adminCroppedImage || item.printImage || item.originalImage || item.displayImage || item.previewImage;
                if (imageData) {
                    console.log(`📸 Using direct item property for item ${i}:`, 
                        item.highQualityPrintImage ? 'highQualityPrintImage' :
                        (item.adminCroppedImage ? 'adminCroppedImage' : 
                        (item.printImage ? 'printImage' : 
                        (item.originalImage ? 'originalImage' : 'displayImage/previewImage'))));
                }
            }
            
            if (imageData) {
                const publicId = `${orderNumber}/item${i + 1}_print_${Date.now()}`;
                console.log(`🔼 Uploading HIGH-QUALITY print image for item ${i + 1}...`);
                const result = await this.uploadImage(imageData, publicId);
                
                results.push({
                    itemIndex: i,
                    urls: result.success ? {
                        original: result.secure_url,
                        print: result.secure_url,
                        display: result.secure_url,
                        publicId: result.public_id
                    } : null,
                    error: result.success ? null : result.error
                });
                
                if (result.success) {
                    console.log(`✅ HIGH-QUALITY image uploaded successfully for item ${i + 1}`);
                }
            } else {
                console.warn(`⚠️ No image data found for item ${i + 1}`);
                results.push({
                    itemIndex: i,
                    urls: null,
                    error: 'No image data found'
                });
            }
        }
        
        return results;
    }
}

// Export for use in other files
window.CloudinaryDirect = CloudinaryDirect;