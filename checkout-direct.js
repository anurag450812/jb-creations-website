/**
 * Modified checkout.js to use direct Cloudinary uploads
 * This eliminates the need for a local server
 */

// Include the direct upload class
const cloudinaryDirect = new CloudinaryDirect();

// Replace the existing uploadOrderImagesToCloudinary function
async function uploadOrderImagesToCloudinaryDirect(items, orderNumber) {
    console.log('🔄 Starting direct Cloudinary uploads for order:', orderNumber);
    
    try {
        const uploadResults = await cloudinaryDirect.uploadOrderImages(items, orderNumber);
        
        // Process results and update items
        const processedItems = items.map((item, index) => {
            const uploadResult = uploadResults.find(result => result.itemIndex === index);
            
            if (uploadResult && uploadResult.urls) {
                return {
                    ...item,
                    cloudinaryUrls: uploadResult.urls,
                    printImage: uploadResult.urls.print,
                    originalImage: uploadResult.urls.original,
                    displayImage: uploadResult.urls.display,
                    uploadStatus: 'success'
                };
            } else {
                console.warn(`⚠️ Upload failed for item ${index + 1}:`, uploadResult?.error);
                return {
                    ...item,
                    cloudinaryUrls: null,
                    uploadStatus: 'failed',
                    uploadError: uploadResult?.error || 'Unknown error'
                };
            }
        });
        
        const successCount = processedItems.filter(item => item.uploadStatus === 'success').length;
        console.log(`✅ Direct uploads completed: ${successCount}/${items.length} successful`);
        
        return processedItems;
        
    } catch (error) {
        console.error('❌ Direct upload process failed:', error);
        throw error;
    }
}

// Modified submitOrder function to use direct uploads
async function submitOrderDirect() {
    try {
        console.log('🔄 Starting order submission with direct Cloudinary uploads...');
        
        // Get order data
        const orderData = prepareOrderData();
        console.log('📦 Order data prepared:', orderData);
        
        // Upload images directly to Cloudinary
        const itemsWithCloudinaryUrls = await uploadOrderImagesToCloudinaryDirect(
            orderData.items, 
            orderData.orderNumber
        );
        
        // Update order data with Cloudinary URLs
        orderData.items = itemsWithCloudinaryUrls;
        
        // Submit to Firebase
        console.log('📤 Submitting order to Firebase...');
        const result = await createOrder(orderData);
        
        if (result.success) {
            console.log('✅ Order submitted successfully with direct uploads!');
            
            // Clear cart and redirect
            localStorage.removeItem('cart');
            localStorage.setItem('orderSuccess', JSON.stringify({
                orderNumber: orderData.orderNumber,
                customerName: orderData.customerName,
                message: 'Your order has been placed successfully!'
            }));
            
            window.location.href = 'order-success.html';
        } else {
            throw new Error(result.error || 'Failed to create order');
        }
        
    } catch (error) {
        console.error('❌ Order submission failed:', error);
        alert('Order submission failed: ' + error.message);
    }
}

// Add this to existing checkout.js or replace the existing submitOrder function