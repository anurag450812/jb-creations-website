/**
 * Utility functions for Xidlz website
 * Common functions used across multiple files
 */

/**
 * Generate a unique order number in yearmonthdatetimeseconds+phone format
 * Format: JBYYYYMMDDHHmmssXXXX (e.g., JB202509231145301234)
 * @param {string} customerPhone - Customer's phone number (optional)
 * @returns {string} - Formatted order number
 */
function generateOrderNumber(customerPhone = '') {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const date = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const seconds = String(now.getSeconds()).padStart(2, '0');
    
    // Extract last 4 digits of phone number, default to random if not available
    let phoneLastFour = '0000';
    if (customerPhone) {
        // Remove all non-digit characters
        const digitsOnly = customerPhone.replace(/\D/g, '');
        if (digitsOnly.length >= 4) {
            phoneLastFour = digitsOnly.slice(-4);
        } else if (digitsOnly.length > 0) {
            // Pad with zeros if less than 4 digits
            phoneLastFour = digitsOnly.padStart(4, '0');
        }
    } else {
        // Generate random 4 digits if no phone number
        phoneLastFour = Math.floor(1000 + Math.random() * 9000).toString();
    }
    
    return `JB${year}${month}${date}${hours}${minutes}${seconds}${phoneLastFour}`;
}

/**
 * Format a timestamp to readable date string
 * @param {string|Date} timestamp - The timestamp to format
 * @returns {string} - Formatted date string
 */
function formatOrderDate(timestamp) {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/**
 * Extract order number from various formats for consistency
 * @param {string} orderNumber - The order number to normalize
 * @returns {string} - Normalized order number
 */
function normalizeOrderNumber(orderNumber) {
    if (!orderNumber) return generateOrderNumber();
    
    // If it already starts with JB, return as is
    if (orderNumber.startsWith('JB')) {
        return orderNumber;
    }
    
    // If it's just a number, add JB prefix with current timestamp format
    if (/^\d+$/.test(orderNumber)) {
        return generateOrderNumber();
    }
    
    return orderNumber;
}

// Export for Node.js environments
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        generateOrderNumber,
        formatOrderDate,
        normalizeOrderNumber
    };
}

// Make available globally for browser environments
if (typeof window !== 'undefined') {
    window.JBUtils = {
        generateOrderNumber,
        formatOrderDate,
        normalizeOrderNumber
    };
}