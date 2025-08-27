// Simple test to verify DOM elements and event listeners work
console.log('Test script starting...');

document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded!');
    
    // Test if basic elements exist
    const imageUpload = document.getElementById('imageUpload');
    const imageContainer = document.getElementById('imageContainer');
    const frameButtons = document.querySelectorAll('.size-options button, .desktop-size-btn');
    
    console.log('Image upload element:', imageUpload);
    console.log('Image container:', imageContainer);
    console.log('Frame buttons found:', frameButtons.length);
    
    // Test upload functionality
    if (imageUpload) {
        imageUpload.addEventListener('change', function(e) {
            console.log('Upload change detected!', e.target.files[0]);
            alert('Upload detected! File: ' + (e.target.files[0] ? e.target.files[0].name : 'none'));
        });
    }
    
    // Test click to upload
    if (imageContainer) {
        imageContainer.addEventListener('click', function() {
            console.log('Image container clicked!');
            if (imageUpload) {
                imageUpload.click();
                console.log('Triggering file dialog...');
            }
        });
    }
    
    // Test frame size buttons
    frameButtons.forEach((button, index) => {
        button.addEventListener('click', function() {
            console.log('Frame button clicked:', button.dataset.size, button.dataset.orientation);
            
            // Remove selected from all buttons
            frameButtons.forEach(btn => btn.classList.remove('selected'));
            
            // Add selected to clicked button
            button.classList.add('selected');
            
            alert('Frame selected: ' + button.dataset.size + ' ' + button.dataset.orientation);
        });
    });
    
    console.log('Test setup complete!');
});
