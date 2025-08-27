// Quick test for customize.html functionality
console.log('Testing customize.html functionality...');

// Test after DOM loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded - testing elements...');
    
    // Check if main elements exist
    const imageUpload = document.getElementById('imageUpload');
    const imageContainer = document.getElementById('imageContainer');
    const frameButtons = document.querySelectorAll('.size-options button, .desktop-size-btn');
    const addToCartBtn = document.getElementById('addToCart');
    
    console.log('Upload element exists:', !!imageUpload);
    console.log('Image container exists:', !!imageContainer);
    console.log('Frame buttons found:', frameButtons.length);
    console.log('Add to cart button exists:', !!addToCartBtn);
    
    // Test if event listeners are attached by triggering a click test
    if (frameButtons.length > 0) {
        console.log('Testing frame button click...');
        setTimeout(() => {
            frameButtons[0].click();
            console.log('Frame button clicked - check if selection changed');
        }, 1000);
    }
    
    // Test upload functionality
    if (imageContainer) {
        console.log('Image container is clickable');
        imageContainer.style.border = '3px solid green';
        imageContainer.style.backgroundColor = '#f0fff0';
        
        // Add visual feedback
        const testDiv = document.createElement('div');
        testDiv.style.position = 'fixed';
        testDiv.style.top = '10px';
        testDiv.style.right = '10px';
        testDiv.style.background = 'green';
        testDiv.style.color = 'white';
        testDiv.style.padding = '10px';
        testDiv.style.zIndex = '9999';
        testDiv.textContent = 'Functionality Test: ACTIVE';
        document.body.appendChild(testDiv);
    }
});

// Add manual test function to window
window.testUpload = function() {
    const imageUpload = document.getElementById('imageUpload');
    if (imageUpload) {
        imageUpload.click();
        console.log('Manual upload test triggered');
        return 'Upload dialog should open';
    }
    return 'Upload element not found';
};

console.log('Test script loaded. Try: testUpload() in console');
