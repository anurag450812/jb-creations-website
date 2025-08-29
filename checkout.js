/*
 * Checkout Page JavaScript
 * Handles order processing and submission
 */

// Order management state
let orderData = {
    customer: {},
    items: [],
    totals: {
        subtotal: 0,
        delivery: 0,
        total: 0
    },
    deliveryMethod: 'standard'
};

// Initialize checkout page
document.addEventListener('DOMContentLoaded', function() {
    // Check if user is authenticated
    const user = getCurrentUser();
    
    if (user) {
        // Pre-fill customer information for logged-in users
        document.getElementById('customerName').value = user.name || '';
        document.getElementById('customerEmail').value = user.email || '';
        
        // Handle phone number with +91 prefix
        const userPhone = user.phone || '';
        if (userPhone && !userPhone.startsWith('+91')) {
            // Add +91 prefix if not present
            document.getElementById('customerPhone').value = '+91 ' + userPhone.replace(/[^\d]/g, '');
        } else {
            document.getElementById('customerPhone').value = userPhone;
        }
        
        // Show logged-in user info
        showUserStatus(user);
    } else {
        // Show guest checkout options
        showGuestCheckoutOptions();
    }

    loadCartItems();
    updateOrderSummary();
    updateEstimatedDelivery();

    // Add form validation listeners
    addFormValidationListeners();
});

// Pincode lookup functionality
let pincodeTimeout;

// Indian states data for autocomplete
const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu', 
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Delhi', 'Puducherry', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Andaman and Nicobar Islands'
];

// Major cities data for autocomplete (sample - you can expand this)
const indianCities = {
    'Maharashtra': ['Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Aurangabad', 'Solapur', 'Kolhapur', 'Sangli', 'Thane', 'Navi Mumbai'],
    'Karnataka': ['Bangalore', 'Mysore', 'Hubli', 'Dharwad', 'Mangalore', 'Belgaum', 'Bellary', 'Bijapur', 'Shimoga', 'Tumkur'],
    'Tamil Nadu': ['Chennai', 'Coimbatore', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode', 'Vellore', 'Thoothukudi', 'Dindigul'],
    'Gujarat': ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Junagadh', 'Gandhinagar', 'Anand', 'Bharuch'],
    'Rajasthan': ['Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Bikaner', 'Ajmer', 'Alwar', 'Bharatpur', 'Bhilwara', 'Sikar'],
    'Uttar Pradesh': ['Lucknow', 'Kanpur', 'Agra', 'Varanasi', 'Allahabad', 'Meerut', 'Bareilly', 'Aligarh', 'Moradabad', 'Ghaziabad'],
    'West Bengal': ['Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman', 'Malda', 'Baharampur', 'Habra', 'Kharagpur'],
    'Telangana': ['Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Ramagundam', 'Khammam', 'Mahbubnagar', 'Nalgonda', 'Adilabad', 'Miryalaguda'],
    'Andhra Pradesh': ['Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry', 'Tirupati', 'Kakinada', 'Anantapur', 'Vizianagaram'],
    'Kerala': ['Thiruvananthapuram', 'Kochi', 'Kozhikode', 'Thrissur', 'Kollam', 'Palakkad', 'Alappuzha', 'Malappuram', 'Kannur', 'Kasaragod'],
    'Punjab': ['Chandigarh', 'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Firozpur', 'Batala', 'Pathankot'],
    'Haryana': ['Gurgaon', 'Faridabad', 'Panipat', 'Ambala', 'Yamunanagar', 'Rohtak', 'Hisar', 'Karnal', 'Sonipat', 'Panchkula'],
    'Delhi': ['New Delhi', 'Delhi', 'Dwarka', 'Rohini', 'Janakpuri', 'Lajpat Nagar', 'Karol Bagh', 'Connaught Place', 'Saket', 'Vasant Kunj'],
    'Madhya Pradesh': ['Bhopal', 'Indore', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Dewas', 'Satna', 'Ratlam', 'Rewa'],
    'Assam': ['Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur', 'Bongaigaon', 'Dhubri', 'Diphu'],
    'Bihar': ['Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Purnia', 'Darbhanga', 'Bihar Sharif', 'Arrah', 'Begusarai', 'Katihar'],
    'Odisha': ['Bhubaneswar', 'Cuttack', 'Rourkela', 'Brahmapur', 'Sambalpur', 'Puri', 'Balasore', 'Bhadrak', 'Baripada', 'Jharsuguda']
};

// Get all cities for general search
const allCities = Object.values(indianCities).flat();

function handlePincodeInput(pincode) {
    // If pincode is being filled, clear manual state/city
    if (pincode && pincode.length > 0) {
        // Use existing pincode logic
        fetchLocationByPincode(pincode);
    } else {
        // If pincode is cleared, enable manual entry
        resetLocationFields();
        enableManualEntry();
    }
}

function enableManualEntry() {
    const stateField = document.getElementById('customerState');
    const cityField = document.getElementById('customerCity');
    
    stateField.removeAttribute('readonly');
    cityField.removeAttribute('readonly');
    stateField.classList.remove('auto-filled');
    cityField.classList.remove('auto-filled');
}

function fetchLocationByPincode(pincode) {
    // Clear previous timeout
    clearTimeout(pincodeTimeout);
    
    // Reset fields if pincode is cleared
    if (!pincode || pincode.length < 6) {
        resetLocationFields();
        return;
    }
    
    // Only proceed if pincode is 6 digits
    if (pincode.length === 6 && /^\d{6}$/.test(pincode)) {
        // Debounce the API call
        pincodeTimeout = setTimeout(() => {
            performPincodeLookup(pincode);
        }, 500);
    }
}

function resetLocationFields() {
    const cityField = document.getElementById('customerCity');
    const stateField = document.getElementById('customerState');
    const loader = document.getElementById('pincodeLoader');
    
    cityField.value = '';
    stateField.value = '';
    cityField.placeholder = 'Will be filled automatically';
    stateField.placeholder = 'Will be filled automatically';
    cityField.classList.remove('auto-filled', 'valid');
    stateField.classList.remove('auto-filled', 'valid');
    loader.style.display = 'none';
}

async function performPincodeLookup(pincode) {
    const cityField = document.getElementById('customerCity');
    const stateField = document.getElementById('customerState');
    const loader = document.getElementById('pincodeLoader');
    const pincodeField = document.getElementById('customerPincode');
    
    // Show loader
    loader.style.display = 'flex';
    cityField.placeholder = 'Loading...';
    stateField.placeholder = 'Loading...';
    
    try {
        // Using India Post Office API (free)
        const response = await fetch(`https://api.postalpincode.in/pincode/${pincode}`);
        const data = await response.json();
        
        if (data && data[0] && data[0].Status === 'Success' && data[0].PostOffice && data[0].PostOffice.length > 0) {
            const postOffice = data[0].PostOffice[0];
            const city = postOffice.District || postOffice.Name;
            const state = postOffice.State;
            
            // Fill the fields
            cityField.value = city;
            stateField.value = state;
            
            // Add visual feedback
            cityField.classList.add('auto-filled', 'valid');
            stateField.classList.add('auto-filled', 'valid');
            pincodeField.classList.add('valid');
            
            // Update placeholders
            cityField.placeholder = city;
            stateField.placeholder = state;
            
            // Remove readonly attribute to allow editing if needed
            cityField.removeAttribute('readonly');
            stateField.removeAttribute('readonly');
        } else {
            // Invalid pincode
            cityField.placeholder = 'Invalid pincode';
            stateField.placeholder = 'Invalid pincode';
            pincodeField.classList.add('invalid');
        }
    } catch (error) {
        console.error('Error fetching pincode data:', error);
        cityField.placeholder = 'Enter manually';
        stateField.placeholder = 'Enter manually';
        
        // Remove readonly to allow manual entry
        cityField.removeAttribute('readonly');
        stateField.removeAttribute('readonly');
    }
    
    // Hide loader
    loader.style.display = 'none';
}

// Enable manual editing of auto-filled fields
function enableManualEdit(fieldId) {
    const field = document.getElementById(fieldId);
    if (field.hasAttribute('readonly')) {
        field.removeAttribute('readonly');
        field.classList.remove('auto-filled');
        field.focus();
        field.select();
        
        // Update help text
        const helpText = field.parentElement.querySelector('.form-help-text');
        if (helpText) {
            helpText.textContent = fieldId === 'customerCity' ? 'Manual entry enabled' : 'Manual entry enabled';
        }
    }
}

// Format phone number with +91 prefix
function formatPhoneNumber(input) {
    let value = input.value;
    
    // Always ensure +91 prefix
    if (!value.startsWith('+91 ')) {
        // Remove any existing +91 variations and non-digits except the space after +91
        value = value.replace(/^\+91\s?/, '').replace(/[^\d]/g, '');
        
        // Add +91 prefix
        value = '+91 ' + value;
    }
    
    // Extract the number part after +91 
    let numberPart = value.substring(4).replace(/[^\d]/g, '');
    
    // Limit to 10 digits
    if (numberPart.length > 10) {
        numberPart = numberPart.substring(0, 10);
    }
    
    // Set the formatted value
    input.value = '+91 ' + numberPart;
    
    // Add validation styling
    if (numberPart.length === 10) {
        input.classList.remove('invalid');
        input.classList.add('valid');
    } else if (numberPart.length > 0) {
        input.classList.add('invalid');
        input.classList.remove('valid');
    } else {
        input.classList.remove('invalid', 'valid');
    }
}

// State autocomplete functions
function handleStateInput(value) {
    const suggestions = filterStates(value);
    showStateSuggestions(suggestions);
    
    // Clear city when state changes
    const cityField = document.getElementById('customerCity');
    if (cityField.value && !cityField.classList.contains('auto-filled')) {
        cityField.value = '';
    }
}

function filterStates(query) {
    if (!query || query.length < 2) return [];
    
    return indianStates.filter(state => 
        state.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8); // Limit to 8 suggestions
}

function showStateSuggestions(suggestions = null) {
    const input = document.getElementById('customerState');
    const container = document.getElementById('stateSuggestions');
    
    if (suggestions === null) {
        suggestions = filterStates(input.value);
    }
    
    if (suggestions.length === 0 && input.value.length >= 2) {
        container.innerHTML = '<div class="no-suggestions">No states found</div>';
        container.style.display = 'block';
        return;
    }
    
    if (suggestions.length > 0) {
        container.innerHTML = suggestions.map(state => 
            `<div class="autocomplete-suggestion" onclick="selectState('${state}')">${state}</div>`
        ).join('');
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

function hideStateSuggestions() {
    setTimeout(() => {
        document.getElementById('stateSuggestions').style.display = 'none';
    }, 200);
}

function selectState(state) {
    const stateField = document.getElementById('customerState');
    const cityField = document.getElementById('customerCity');
    
    stateField.value = state;
    stateField.classList.add('valid');
    hideStateSuggestions();
    
    // Clear city field for new state selection
    cityField.value = '';
    cityField.focus();
}

// City autocomplete functions
function handleCityInput(value) {
    const selectedState = document.getElementById('customerState').value;
    const suggestions = filterCities(value, selectedState);
    showCitySuggestions(suggestions);
}

function filterCities(query, state) {
    if (!query || query.length < 2) return [];
    
    let citiesToSearch = allCities;
    
    // If state is selected, prioritize cities from that state
    if (state && indianCities[state]) {
        citiesToSearch = [...indianCities[state], ...allCities.filter(city => !indianCities[state].includes(city))];
    }
    
    return citiesToSearch.filter(city => 
        city.toLowerCase().includes(query.toLowerCase())
    ).slice(0, 8); // Limit to 8 suggestions
}

function showCitySuggestions(suggestions = null) {
    const input = document.getElementById('customerCity');
    const container = document.getElementById('citySuggestions');
    
    if (suggestions === null) {
        const selectedState = document.getElementById('customerState').value;
        suggestions = filterCities(input.value, selectedState);
    }
    
    if (suggestions.length === 0 && input.value.length >= 2) {
        container.innerHTML = '<div class="no-suggestions">No cities found</div>';
        container.style.display = 'block';
        return;
    }
    
    if (suggestions.length > 0) {
        container.innerHTML = suggestions.map(city => 
            `<div class="autocomplete-suggestion" onclick="selectCity('${city}')">${city}</div>`
        ).join('');
        container.style.display = 'block';
    } else {
        container.style.display = 'none';
    }
}

function hideCitySuggestions() {
    setTimeout(() => {
        document.getElementById('citySuggestions').style.display = 'none';
    }, 200);
}

function selectCity(city) {
    const cityField = document.getElementById('customerCity');
    
    cityField.value = city;
    cityField.classList.add('valid');
    hideCitySuggestions();
}

// Add keyboard navigation for autocomplete
document.addEventListener('keydown', function(e) {
    const stateSuggestions = document.getElementById('stateSuggestions');
    const citySuggestions = document.getElementById('citySuggestions');
    
    if (e.key === 'Escape') {
        hideStateSuggestions();
        hideCitySuggestions();
    }
});

// Load cart items from localStorage
function loadCartItems() {
    const cart = JSON.parse(localStorage.getItem('photoFramingCart') || '[]');
    
    console.log('Loading cart items:', cart);
    console.log('Cart items count:', cart.length);
    
    if (cart.length === 0) {
        // Redirect back if cart is empty
        alert('Your cart is empty!');
        window.location.href = 'index.html';
        return;
    }
    
    // Log the structure of the first item for debugging
    if (cart.length > 0) {
        console.log('First cart item structure:', cart[0]);
        console.log('Available image properties:', {
            previewImage: !!cart[0].previewImage,
            displayImage: !!cart[0].displayImage,
            printImage: !!cart[0].printImage
        });
    }
    
    orderData.items = cart;
    calculateTotals();
}

// Show user status for logged-in users
function showUserStatus(user) {
    const statusContainer = document.getElementById('userStatusContainer');
    if (statusContainer) {
        statusContainer.innerHTML = `
            <div class="user-status logged-in">
                <i class="fas fa-user-check"></i>
                <span>Logged in as: <strong>${user.name}</strong> (${user.email})</span>
                <button type="button" class="btn-link" onclick="logout()">
                    <i class="fas fa-sign-out-alt"></i> Sign Out
                </button>
            </div>
        `;
        statusContainer.style.display = 'block';
    }
}

// Show guest checkout options
function showGuestCheckoutOptions() {
    const statusContainer = document.getElementById('userStatusContainer');
    if (statusContainer) {
        statusContainer.innerHTML = `
            <div class="user-status guest">
                <div class="checkout-options">
                    <div class="option-header">
                        <i class="fas fa-shopping-cart"></i>
                        <span>Choose Your Checkout Method</span>
                    </div>
                    <div class="checkout-method-buttons">
                        <button type="button" class="checkout-method-btn guest-btn active" onclick="selectCheckoutMethod('guest')">
                            <i class="fas fa-user"></i>
                            <div>
                                <strong>Continue as Guest</strong>
                                <small>Quick checkout without creating an account</small>
                            </div>
                        </button>
                        <button type="button" class="checkout-method-btn login-btn" onclick="redirectToLogin()">
                            <i class="fas fa-sign-in-alt"></i>
                            <div>
                                <strong>Sign In</strong>
                                <small>Access your account and order history</small>
                            </div>
                        </button>
                    </div>
                </div>
            </div>
        `;
        statusContainer.style.display = 'block';
    }
}

// Select checkout method
function selectCheckoutMethod(method) {
    const guestBtn = document.querySelector('.guest-btn');
    const loginBtn = document.querySelector('.login-btn');
    
    if (method === 'guest') {
        guestBtn.classList.add('active');
        loginBtn.classList.remove('active');
        // Enable the form for guest checkout
        enableGuestForm();
    } else {
        redirectToLogin();
    }
}

// Enable form for guest users
function enableGuestForm() {
    const form = document.getElementById('checkoutForm');
    const inputs = form.querySelectorAll('input, textarea');
    
    inputs.forEach(input => {
        input.disabled = false;
    });
    
    // Add guest indicator to form
    const guestIndicator = document.getElementById('guestIndicator');
    if (guestIndicator) {
        guestIndicator.style.display = 'block';
    }
}

// Redirect to login
function redirectToLogin() {
    sessionStorage.setItem('auth_redirect', window.location.href);
    window.location.href = 'auth.html';
}

// Logout function
function logout() {
    localStorage.removeItem('jb_user');
    sessionStorage.removeItem('jb_user');
    window.location.reload();
}

// Calculate order totals
function calculateTotals() {
    orderData.totals.subtotal = orderData.items.reduce((sum, item) => sum + item.price, 0);
    
    // Apply discount if any
    const discountAmount = orderData.discount ? orderData.discount.amount : 0;
    orderData.totals.total = orderData.totals.subtotal + orderData.totals.delivery - discountAmount;
    
    // Ensure total is not negative
    orderData.totals.total = Math.max(0, orderData.totals.total);
}

// Update order summary display
function updateOrderSummary() {
    const summaryContainer = document.getElementById('orderSummary');
    const subtotalElement = document.getElementById('subtotal');
    const deliveryChargeElement = document.getElementById('deliveryCharge');
    const finalTotalElement = document.getElementById('finalTotal');
    const orderCountElement = document.getElementById('orderCount');
    
    // Clear existing content
    summaryContainer.innerHTML = '';
    
    // Update order count
    if (orderCountElement) {
        orderCountElement.textContent = `${orderData.items.length} item${orderData.items.length !== 1 ? 's' : ''}`;
    }
    
    // Add each cart item
    orderData.items.forEach((item, index) => {
        // Use the available image properties with fallbacks
        const imageSource = item.previewImage || item.displayImage || item.printImage;
        
        console.log(`Item ${index + 1} image sources:`, {
            previewImage: item.previewImage ? 'Available' : 'Not available',
            displayImage: item.displayImage ? 'Available' : 'Not available', 
            printImage: item.printImage ? 'Available' : 'Not available',
            selectedSource: imageSource ? 'Found' : 'None found'
        });
        
        // Create a placeholder image if no image is available
        const fallbackImage = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwIiBoZWlnaHQ9IjEyMCIgdmlld0JveD0iMCAwIDEyMCAxMjAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIxMjAiIGhlaWdodD0iMTIwIiBmaWxsPSIjZjhmOWZhIiBzdHJva2U9IiNlOWVjZWYiIHN0cm9rZS13aWR0aD0iMiIvPgo8cGF0aCBkPSJNNDAgNDBINDBWNDBINDBINDBaTTQwIDQwTDgwIDQwTDcwIDYwTDUwIDYwTDQwIDQwWiIgZmlsbD0iIzE2Njk3QSIgZmlsbC1vcGFjaXR5PSIwLjMiLz4KPGNpcmNsZSBjeD0iNTUiIGN5PSI1NSIgcj0iOCIgZmlsbD0iIzE2Njk3QSIgZmlsbC1vcGFjaXR5PSIwLjMiLz4KPHR5cGUgdGV4dD0iUGhvdG8iIHg9IjYwIiB5PSI5MCIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjEyIiBmaWxsPSIjMTY2OTdBIiB0ZXh0LWFuY2hvcj0ibWlkZGxlIj5QaG90bzwvdGV4dD4KPC9zdmc+';
        
        const itemElement = document.createElement('div');
        itemElement.className = 'order-item';
        itemElement.innerHTML = `
            <img src="${imageSource || fallbackImage}" 
                 alt="Framed Photo" 
                 class="order-item-image" 
                 onerror="this.src='${fallbackImage}'; this.onerror=null;"
                 onload="console.log('Image loaded successfully for item ${index + 1}')">
            <div class="order-item-details">
                <div class="order-item-title">Custom Framed Photo #${index + 1}</div>
                <div class="order-item-specs">
                    <strong>Size:</strong> ${item.frameSize?.size || 'N/A'} ${item.frameSize?.orientation || ''}<br>
                    <strong>Frame:</strong> ${item.frameColor || 'Default'} ${item.frameTexture || 'texture'}<br>
                    <strong>Added:</strong> ${item.timestamp ? new Date(item.timestamp).toLocaleDateString() : new Date(item.orderDate || Date.now()).toLocaleDateString()}
                </div>
                <div class="order-item-price">₹${item.price || 349}</div>
            </div>
        `;
        summaryContainer.appendChild(itemElement);
    });
    
    // Update totals
    subtotalElement.textContent = `₹${orderData.totals.subtotal}`;
    deliveryChargeElement.textContent = `₹${orderData.totals.delivery}`;
    finalTotalElement.textContent = `₹${orderData.totals.total}`;
}

// Update estimated delivery date
function updateEstimatedDelivery() {
    const estimatedDateElement = document.getElementById('estimatedDate');
    if (!estimatedDateElement) return;
    
    const today = new Date();
    
    // Add 5 days from today
    const deliveryDate = new Date(today);
    deliveryDate.setDate(deliveryDate.getDate() + 5);
    
    const options = { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
    };
    
    estimatedDateElement.textContent = deliveryDate.toLocaleDateString('en-IN', options);
}

// Add form validation listeners
function addFormValidationListeners() {
    const form = document.getElementById('checkoutForm');
    if (!form) return;
    
    const inputs = form.querySelectorAll('input[required], textarea[required]');
    
    inputs.forEach(input => {
        input.addEventListener('blur', validateInput);
        input.addEventListener('input', clearValidationError);
    });
}

// Validate individual input
function validateInput(event) {
    const input = event.target;
    const value = input.value.trim();
    
    // Remove existing validation classes
    input.classList.remove('valid', 'invalid');
    
    if (input.hasAttribute('required') && !value) {
        input.classList.add('invalid');
        return false;
    }
    
    // Specific validation rules
    if (input.type === 'email' && value) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(value)) {
            input.classList.add('invalid');
            return false;
        }
    }
    
    if (input.type === 'tel' && value) {
        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(value.replace(/[^0-9]/g, ''))) {
            input.classList.add('invalid');
            return false;
        }
    }
    
    input.classList.add('valid');
    return true;
}

// Clear validation error on input
function clearValidationError(event) {
    const input = event.target;
    input.classList.remove('invalid');
}

// Apply promo code
function applyPromoCode() {
    const promoCodeInput = document.getElementById('promoCode');
    const promoCode = promoCodeInput.value.trim().toUpperCase();
    
    if (!promoCode) {
        alert('Please enter a promo code');
        return;
    }
    
    // Mock promo codes for demonstration
    const promoCodes = {
        'WELCOME10': { type: 'percentage', value: 10, description: '10% off your order' },
        'SAVE50': { type: 'fixed', value: 50, description: '₹50 off your order' },
        'FIRST20': { type: 'percentage', value: 20, description: '20% off for first-time customers' }
    };
    
    const discount = promoCodes[promoCode];
    
    if (discount) {
        let discountAmount = 0;
        
        if (discount.type === 'percentage') {
            discountAmount = Math.round((orderData.totals.subtotal * discount.value) / 100);
        } else if (discount.type === 'fixed') {
            discountAmount = discount.value;
        }
        
        // Ensure discount doesn't exceed subtotal
        discountAmount = Math.min(discountAmount, orderData.totals.subtotal);
        
        // Apply discount
        orderData.discount = {
            code: promoCode,
            amount: discountAmount,
            description: discount.description
        };
        
        // Update totals
        calculateTotals();
        updateOrderSummary();
        
        // Show discount in totals
        const discountRow = document.getElementById('discountRow');
        const discountAmountElement = document.getElementById('discountAmount');
        
        if (discountRow && discountAmountElement) {
            discountRow.style.display = 'flex';
            discountAmountElement.textContent = `-₹${discountAmount}`;
        }
        
        // Disable promo code input
        promoCodeInput.disabled = true;
        promoCodeInput.value = `${promoCode} - Applied`;
        
        alert(`Promo code applied! ${discount.description}`);
    } else {
        alert('Invalid promo code. Please try again.');
    }
}

// Validate form data
function validateForm() {
    const form = document.getElementById('checkoutForm');
    const formData = new FormData(form);
    
    const requiredFields = [
        { name: 'customerName', label: 'Full Name' },
        { name: 'customerEmail', label: 'Email Address' },
        { name: 'customerPhone', label: 'Phone Number' },
        { name: 'customerAddress', label: 'Street Address' },
        { name: 'customerCity', label: 'City' },
        { name: 'customerState', label: 'State' }
    ];
    
    let isValid = true;
    let firstErrorField = null;
    
    // Check required fields
    for (let field of requiredFields) {
        const value = formData.get(field.name);
        const input = document.getElementById(field.name);
        
        if (!value || value.trim() === '') {
            input.classList.add('invalid');
            if (!firstErrorField) firstErrorField = input;
            isValid = false;
        } else {
            input.classList.remove('invalid');
            input.classList.add('valid');
        }
    }
    
    // Email validation
    const email = formData.get('customerEmail');
    const emailInput = document.getElementById('customerEmail');
    if (email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            emailInput.classList.add('invalid');
            if (!firstErrorField) firstErrorField = emailInput;
            isValid = false;
            if (isValid) alert('Please enter a valid email address');
        }
    }
    
    // Phone validation
    const phone = formData.get('customerPhone');
    const phoneInput = document.getElementById('customerPhone');
    if (phone) {
        // Check if phone follows +91 XXXXXXXXXX format
        const phoneRegex = /^\+91 [0-9]{10}$/;
        if (!phoneRegex.test(phone.trim())) {
            phoneInput.classList.add('invalid');
            if (!firstErrorField) firstErrorField = phoneInput;
            isValid = false;
            if (isValid) alert('Please enter a valid phone number in +91 XXXXXXXXXX format');
        }
    }
    
    // Pincode validation
    const pincode = formData.get('customerPincode');
    if (pincode && !/^\d{6}$/.test(pincode.trim())) {
        const pincodeInput = document.getElementById('customerPincode');
        pincodeInput.classList.add('invalid');
        if (!firstErrorField) firstErrorField = pincodeInput;
        isValid = false;
        if (isValid) alert('Please enter a valid 6-digit pincode');
    }
    
    // Scroll to first error field
    if (!isValid && firstErrorField) {
        firstErrorField.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstErrorField.focus();
        
        // Show a comprehensive error message
        const errorMessages = [];
        if (document.getElementById('customerName').classList.contains('invalid')) {
            errorMessages.push('• Full name is required');
        }
        if (document.getElementById('customerEmail').classList.contains('invalid')) {
            errorMessages.push('• Valid email address is required');
        }
        if (document.getElementById('customerPhone').classList.contains('invalid')) {
            errorMessages.push('• Valid phone number in +91 XXXXXXXXXX format is required');
        }
        if (document.getElementById('customerAddress').classList.contains('invalid')) {
            errorMessages.push('• Street address is required');
        }
        if (document.getElementById('customerCity').classList.contains('invalid')) {
            errorMessages.push('• City is required');
        }
        if (document.getElementById('customerState').classList.contains('invalid')) {
            errorMessages.push('• State is required');
        }
        if (document.getElementById('customerPincode').classList.contains('invalid')) {
            errorMessages.push('• Valid 6-digit pincode is required');
        }
        
        if (errorMessages.length > 0) {
            alert('Please fix the following errors:\n\n' + errorMessages.join('\n'));
        }
    }
    
    return isValid;
}

// Prepare order data for submission
function prepareOrderData() {
    const form = document.getElementById('checkoutForm');
    const formData = new FormData(form);
    const user = getCurrentUser();
    
    // Get customer information
    const street = formData.get('customerAddress');
    const city = formData.get('customerCity');
    const state = formData.get('customerState');
    const landmark = formData.get('customerLandmark');
    const pincode = formData.get('customerPincode');
    
    // Combine address fields
    let fullAddress = street;
    if (city) fullAddress += `, ${city}`;
    if (state) fullAddress += `, ${state}`;
    if (landmark) fullAddress += ` (Near ${landmark})`;
    if (pincode) fullAddress += ` - ${pincode}`;
    
    orderData.customer = {
        userId: user ? user.id : null,
        isGuest: !user, // Add guest indicator
        name: formData.get('customerName'),
        email: formData.get('customerEmail'),
        phone: formData.get('customerPhone'),
        address: fullAddress,
        addressDetails: {
            street: street,
            city: city,
            state: state,
            landmark: landmark || '',
            pincode: pincode
        },
        specialInstructions: formData.get('specialInstructions') || ''
    };
    
    // Add order metadata
    orderData.orderNumber = generateOrderNumber();
    orderData.orderDate = new Date().toISOString();
    orderData.status = 'pending';
    orderData.customerType = user ? 'registered' : 'guest';
    
    return orderData;
}

// Generate unique order number
function generateOrderNumber() {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000);
    return `JB${timestamp.toString().slice(-6)}${random.toString().padStart(3, '0')}`;
}

// Convert order data to email format for backend processing
function formatOrderForEmail(orderData) {
    let emailContent = `
NEW ORDER RECEIVED - ${orderData.orderNumber}
============================================

CUSTOMER INFORMATION:
- Name: ${orderData.customer.name}
- Email: ${orderData.customer.email}
- Phone: ${orderData.customer.phone}
- Address: ${orderData.customer.address}
- Customer Type: ${orderData.customerType}
- Delivery Method: ${orderData.deliveryMethod === 'express' ? 'Express (2-3 days)' : 'Standard (5-7 days)'}
- Special Instructions: ${orderData.customer.specialInstructions || 'None'}

ORDER DETAILS:
`;

    orderData.items.forEach((item, index) => {
        emailContent += `
ITEM ${index + 1}:
- Frame Size: ${item.frameSize.size} ${item.frameSize.orientation}
- Frame Color: ${item.frameColor}
- Frame Texture: ${item.frameTexture}
- Price: ₹${item.price}
- Image Adjustments:
  * Brightness: ${item.adjustments.brightness}%
  * Contrast: ${item.adjustments.contrast}%
  * Highlights: ${item.adjustments.highlights}%
  * Shadows: ${item.adjustments.shadows}%
  * Vibrance: ${item.adjustments.vibrance}%
- Position & Zoom:
  * Zoom Level: ${item.zoom}
  * Position X: ${item.position.x}
  * Position Y: ${item.position.y}

`;
    });

    emailContent += `
ORDER SUMMARY:
- Subtotal: ₹${orderData.totals.subtotal}
- Delivery: ₹${orderData.totals.delivery}
- TOTAL: ₹${orderData.totals.total}

Order Date: ${new Date(orderData.orderDate).toLocaleString()}
`;

    return emailContent;
}

// Submit order to backend
async function submitOrder(orderData) {
    // Prepare the order payload
    const orderPayload = {
        orderNumber: orderData.orderNumber,
        customer: orderData.customer,
        items: orderData.items.map(item => ({
            // Original uploaded image (base64)
            originalImage: item.originalImage,
            // Cropped and styled image ready for printing (base64)
            printReadyImage: item.printImage,
            // Preview image with frame for reference (base64)
            displayImage: item.previewImage || item.displayImage, // Support both field names for backward compatibility
            // Frame specifications
            frameSize: item.frameSize,
            frameColor: item.frameColor,
            frameTexture: item.frameTexture,
            // Image adjustments applied
            adjustments: item.adjustments,
            // Position and zoom for recreating the crop
            position: item.position,
            zoom: item.zoom,
            price: item.price,
            orderDate: item.orderDate
        })),
        totals: orderData.totals,
        deliveryMethod: orderData.deliveryMethod,
        orderDate: orderData.orderDate,
        emailContent: formatOrderForEmail(orderData)
    };

    // Option 1: Send to your backend API
    try {
        const response = await fetch('/api/submit-order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(orderPayload)
        });

        if (response.ok) {
            const result = await response.json();
            return { success: true, data: result };
        } else {
            throw new Error('Failed to submit order');
        }
    } catch (error) {
        console.error('API submission failed, trying email fallback:', error);
        
        // Option 2: Email fallback using EmailJS (free service)
        try {
            // You'll need to sign up at emailjs.com and get your service ID, template ID, and user ID
            const emailParams = {
                to_email: 'your-business-email@example.com', // Your business email
                order_number: orderData.orderNumber,
                customer_name: orderData.customer.name,
                customer_email: orderData.customer.email,
                customer_phone: orderData.customer.phone,
                customer_address: orderData.customer.address,
                order_details: formatOrderForEmail(orderData),
                total_amount: orderData.totals.total
            };

            // Uncomment and configure this when you set up EmailJS
            /*
            const emailResult = await emailjs.send(
                'your_service_id',
                'your_template_id',
                emailParams,
                'your_user_id'
            );
            */

            // For now, store locally and show instructions
            localStorage.setItem('pendingOrder', JSON.stringify(orderPayload));
            return { success: true, method: 'local_storage' };
        } catch (emailError) {
            console.error('Email submission failed:', emailError);
            return { success: false, error: emailError.message };
        }
    }
}

// Main order placement function
async function placeOrder() {
    // Validate form
    if (!validateForm()) {
        return;
    }

    // Show processing overlay
    document.getElementById('processingOverlay').style.display = 'flex';
    document.getElementById('placeOrderBtn').disabled = true;

    try {
        // Prepare order data
        const orderData = prepareOrderData();
        
        // Submit order
        const result = await submitOrder(orderData);
        
        if (result.success) {
            // Save order to user's order history (only for registered users)
            const user = getCurrentUser();
            if (user) {
                saveOrderToUserHistory(user.id, orderData);
            } else {
                // For guest users, save order to local storage for reference
                saveGuestOrderHistory(orderData);
            }
            
            // Clear cart
            localStorage.removeItem('photoFramingCart');
            
            // Show appropriate success message
            const successMessage = user 
                ? `Order placed successfully! Order Number: ${orderData.orderNumber}\n\nYou will receive a confirmation email shortly.\nYou can view this order in your account.`
                : `Order placed successfully! Order Number: ${orderData.orderNumber}\n\nYou will receive a confirmation email shortly.\n\nPlease save your order number: ${orderData.orderNumber} for future reference.`;
            
            alert(successMessage);
            
            // Redirect to a thank you page or back to home
            window.location.href = 'index.html';
        } else {
            throw new Error(result.error || 'Failed to place order');
        }
        
    } catch (error) {
        console.error('Order placement error:', error);
        alert('Sorry, there was an error placing your order. Please try again or contact us directly.');
    } finally {
        // Hide processing overlay
        document.getElementById('processingOverlay').style.display = 'none';
        document.getElementById('placeOrderBtn').disabled = false;
    }
}

// Function to download order data manually (for development/testing)
function downloadOrderData() {
    const cart = JSON.parse(localStorage.getItem('photoFramingCart') || '[]');
    if (cart.length === 0) {
        alert('No order data available');
        return;
    }

    const orderData = prepareOrderData();
    const dataStr = JSON.stringify(orderData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    
    const link = document.createElement('a');
    link.href = URL.createObjectURL(dataBlob);
    link.download = `order-${orderData.orderNumber}.json`;
    link.click();
}

// Add this to window for debugging
window.downloadOrderData = downloadOrderData;

// Authentication helper functions
function getCurrentUser() {
    const storedUser = localStorage.getItem('jb_user') || sessionStorage.getItem('jb_user');
    if (storedUser) {
        try {
            return JSON.parse(storedUser);
        } catch (error) {
            console.error('Error parsing user data:', error);
            return null;
        }
    }
    return null;
}

// Save order to user's history
function saveOrderToUserHistory(userId, orderData) {
    try {
        // Get all users
        const users = JSON.parse(localStorage.getItem('jb_users') || '[]');
        
        // Find the user and add the order
        const userIndex = users.findIndex(user => user.id === userId);
        if (userIndex !== -1) {
            if (!users[userIndex].orders) {
                users[userIndex].orders = [];
            }
            
            // Add order summary to user's order history
            users[userIndex].orders.push({
                orderNumber: orderData.orderNumber,
                orderDate: orderData.orderDate,
                status: orderData.status,
                total: orderData.totals.total,
                itemCount: orderData.items.length,
                deliveryMethod: orderData.deliveryMethod
            });
            
            // Save updated users array
            localStorage.setItem('jb_users', JSON.stringify(users));
        }
    } catch (error) {
        console.error('Error saving order to user history:', error);
    }
}

// Save guest order history
function saveGuestOrderHistory(orderData) {
    try {
        // Get existing guest orders
        const guestOrders = JSON.parse(localStorage.getItem('jb_guest_orders') || '[]');
        
        // Add new order
        guestOrders.push({
            orderNumber: orderData.orderNumber,
            orderDate: orderData.orderDate,
            status: orderData.status,
            total: orderData.totals.total,
            itemCount: orderData.items.length,
            deliveryMethod: orderData.deliveryMethod,
            customerEmail: orderData.customer.email,
            customerName: orderData.customer.name
        });
        
        // Keep only last 10 guest orders to avoid storage bloat
        if (guestOrders.length > 10) {
            guestOrders.splice(0, guestOrders.length - 10);
        }
        
        localStorage.setItem('jb_guest_orders', JSON.stringify(guestOrders));
    } catch (error) {
        console.error('Error saving guest order history:', error);
    }
}
