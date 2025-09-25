/**
 * Direct Browser-to-Cloudinary Upload Solution
 * This replaces the minimal server with direct uploads from browser to Cloudinary
 */

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
            
            // Convert base64 to blob
            const response = await fetch(imageData);
            const blob = await response.blob();
            
            // Create form data for Cloudinary
            const formData = new FormData();
            formData.append('file', blob);
            formData.append('upload_preset', this.uploadPreset);
            formData.append('public_id', publicId);
            formData.append('folder', 'jb-creations-orders');
            
            // Upload to Cloudinary
            const uploadResponse = await fetch(this.apiUrl, {
                method: 'POST',
                body: formData
            });
            
            if (!uploadResponse.ok) {
                throw new Error(`Cloudinary upload failed: ${uploadResponse.status}`);
            }
            
            const result = await uploadResponse.json();
            
            console.log('✅ Direct upload successful:', result.secure_url);
            
            return {
                success: true,
                secure_url: result.secure_url,
                public_id: result.public_id
            };
            
        } catch (error) {
            console.error('❌ Direct upload failed:', error);
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
        const results = [];
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            // Priority: printImage (processed image without frame) > previewImage (with frame borders)
            const imageData = item.printImage || item.displayImage || item.previewImage || item.originalImage;
            
            if (imageData) {
                const publicId = `${orderNumber}/item${i + 1}_${Date.now()}`;
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
            } else {
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