/**
 * API Configuration and Utilities for JB Creations
 * Handles all API calls to the backend server
 */

// Global auth state - declared in auth.js, just reference it here
// const authState will be available globally from auth.js

// API Configuration
const API_CONFIG = {
    // Use Netlify Functions - works automatically with your domain
    BASE_URL: window.location.origin + '/api',
    
    ENDPOINTS: {
        AUTH: {
            REGISTER: '/auth/register',
            LOGIN: '/auth/login',
            PROFILE: '/user/profile'
        },
        ORDERS: {
            CREATE: '/orders',
            LIST: '/orders',
            GET: '/orders',
            TRACK: '/orders'
        },
        ADMIN: {
            ORDERS: '/admin/orders',
            UPDATE_STATUS: '/admin/orders'
        }
    }
};

// API Utility class
class APIClient {
    constructor() {
        this.baseURL = API_CONFIG.BASE_URL;
    }

    // Get authorization header
    getAuthHeaders() {
        const token = localStorage.getItem('auth_token');
        return {
            'Content-Type': 'application/json',
            ...(token && { 'Authorization': `Bearer ${token}` })
        };
    }

    // Generic request method
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        const config = {
            headers: this.getAuthHeaders(),
            ...options
        };

        try {
            console.log(`🌐 API Request: ${options.method || 'GET'} ${url}`);
            
            const response = await fetch(url, config);
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ API Response:', data);
            return data;
            
        } catch (error) {
            console.error('❌ API Error:', error);
            throw error;
        }
    }

    // Authentication methods
    async register(userData) {
        return this.request(API_CONFIG.ENDPOINTS.AUTH.REGISTER, {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async login(credentials) {
        return this.request(API_CONFIG.ENDPOINTS.AUTH.LOGIN, {
            method: 'POST',
            body: JSON.stringify(credentials)
        });
    }

    async getProfile() {
        return this.request(API_CONFIG.ENDPOINTS.AUTH.PROFILE);
    }

    async updateProfile(profileData) {
        return this.request(API_CONFIG.ENDPOINTS.AUTH.PROFILE, {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    // Order methods
    async createOrder(orderData, customerInfo) {
        const formData = new FormData();
        formData.append('orderData', JSON.stringify(orderData));
        formData.append('customerInfo', JSON.stringify(customerInfo));

        return this.request(API_CONFIG.ENDPOINTS.ORDERS.CREATE, {
            method: 'POST',
            headers: {
                ...(localStorage.getItem('auth_token') && { 'Authorization': `Bearer ${localStorage.getItem('auth_token')}` })
            },
            body: formData
        });
    }

    async getOrders(page = 1, limit = 10, status = null) {
        const params = new URLSearchParams({ page, limit });
        if (status) params.append('status', status);
        
        return this.request(`${API_CONFIG.ENDPOINTS.ORDERS.LIST}?${params}`);
    }

    async getOrder(orderId) {
        return this.request(`${API_CONFIG.ENDPOINTS.ORDERS.GET}/${orderId}`);
    }

    async trackOrder(orderId) {
        return this.request(`${API_CONFIG.ENDPOINTS.ORDERS.TRACK}/${orderId}`);
    }

    // Admin methods
    async getAdminOrders(page = 1, limit = 20, status = null) {
        const params = new URLSearchParams({ page, limit });
        if (status) params.append('status', status);
        
        return this.request(`${API_CONFIG.ENDPOINTS.ADMIN.ORDERS}?${params}`);
    }

    async updateOrderStatus(orderId, status, notes = '') {
        return this.request(`${API_CONFIG.ENDPOINTS.ADMIN.UPDATE_STATUS}/${orderId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status, notes })
        });
    }
}

// Create global API client instance
const apiClient = new APIClient();

// Enhanced Authentication utilities with backend integration (legacy system)
const legacyAuthUtils = {
    // Check if user is logged in
    isLoggedIn() {
        const token = localStorage.getItem('auth_token');
        const user = localStorage.getItem('user_data');
        return !!(token && user);
    },

    // Get current user data
    getCurrentUser() {
        try {
            const userData = localStorage.getItem('user_data');
            return userData ? JSON.parse(userData) : null;
        } catch (error) {
            console.error('Error parsing user data:', error);
            return null;
        }
    },

    // Save authentication data
    saveAuthData(token, userData) {
        localStorage.setItem('auth_token', token);
        localStorage.setItem('user_data', JSON.stringify(userData));
        
        // Update global auth state
        authState.isAuthenticated = true;
        authState.user = userData;
        
        console.log('✅ Auth data saved successfully');
    },

    // Clear authentication data
    clearAuthData() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user_data');
        
        // Update global auth state
        authState.isAuthenticated = false;
        authState.user = null;
        
        console.log('🧹 Auth data cleared');
    },

    // Login with backend
    async login(phone, password) {
        try {
            const response = await apiClient.login({ phone, password });
            
            if (response.token && response.user) {
                this.saveAuthData(response.token, response.user);
                return { success: true, user: response.user };
            } else {
                throw new Error('Invalid response from server');
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, error: error.message };
        }
    },

    // Register with backend
    async register(userData) {
        try {
            const response = await apiClient.register(userData);
            
            // Backend registration doesn't auto-login, so we need to login after
            if (response.message) {
                // Registration successful, now login
                const loginResult = await this.login(userData.phone, userData.password);
                return loginResult;
            } else {
                throw new Error('Registration failed');
            }
        } catch (error) {
            console.error('Registration error:', error);
            return { success: false, error: error.message };
        }
    },

    // Logout
    logout() {
        this.clearAuthData();
        
        // Redirect to home page
        if (window.location.pathname !== '/index.html' && window.location.pathname !== '/') {
            window.location.href = 'index.html';
        } else {
            // Refresh to update UI
            window.location.reload();
        }
    },

    // Get user profile from backend
    async getProfile() {
        try {
            const profile = await apiClient.getProfile();
            
            // Update local user data
            const currentUser = this.getCurrentUser();
            if (currentUser) {
                const updatedUser = { ...currentUser, ...profile };
                localStorage.setItem('user_data', JSON.stringify(updatedUser));
                authState.user = updatedUser;
            }
            
            return { success: true, profile };
        } catch (error) {
            console.error('Get profile error:', error);
            return { success: false, error: error.message };
        }
    },

    // Update user profile
    async updateProfile(profileData) {
        try {
            await apiClient.updateProfile(profileData);
            
            // Refresh profile data
            await this.getProfile();
            
            return { success: true };
        } catch (error) {
            console.error('Update profile error:', error);
            return { success: false, error: error.message };
        }
    }
};

// Order management utilities
const orderUtils = {
    // Create new order
    async createOrder(orderData, customerInfo) {
        try {
            const response = await apiClient.createOrder(orderData, customerInfo);
            
            console.log('✅ Order created successfully:', response.orderId);
            return { success: true, orderId: response.orderId, totalAmount: response.totalAmount };
        } catch (error) {
            console.error('Create order error:', error);
            return { success: false, error: error.message };
        }
    },

    // Get user's orders
    async getUserOrders(page = 1, limit = 10, status = null) {
        try {
            if (!legacyAuthUtils.isLoggedIn()) {
                throw new Error('Please login to view your orders');
            }

            const response = await apiClient.getOrders(page, limit, status);
            return { success: true, ...response };
        } catch (error) {
            console.error('Get orders error:', error);
            return { success: false, error: error.message };
        }
    },

    // Track order by ID
    async trackOrder(orderId) {
        try {
            const response = await apiClient.trackOrder(orderId);
            return { success: true, order: response };
        } catch (error) {
            console.error('Track order error:', error);
            return { success: false, error: error.message };
        }
    },

    // Get order details
    async getOrderDetails(orderId) {
        try {
            const response = await apiClient.getOrder(orderId);
            return { success: true, order: response };
        } catch (error) {
            console.error('Get order details error:', error);
            return { success: false, error: error.message };
        }
    }
};

// Admin utilities
const adminUtils = {
    // Check if current user is admin
    isAdmin() {
        const user = legacyAuthUtils.getCurrentUser();
        return user && user.email === 'admin@jbcreations.com'; // Adjust based on your admin logic
    },

    // Get all orders for admin
    async getAllOrders(page = 1, limit = 20, status = null) {
        try {
            if (!this.isAdmin()) {
                throw new Error('Admin access required');
            }

            const response = await apiClient.getAdminOrders(page, limit, status);
            return { success: true, orders: response.orders };
        } catch (error) {
            console.error('Get admin orders error:', error);
            return { success: false, error: error.message };
        }
    },

    // Update order status
    async updateOrderStatus(orderId, status, notes = '') {
        try {
            if (!this.isAdmin()) {
                throw new Error('Admin access required');
            }

            await apiClient.updateOrderStatus(orderId, status, notes);
            return { success: true };
        } catch (error) {
            console.error('Update order status error:', error);
            return { success: false, error: error.message };
        }
    }
};

// Initialize authentication state on page load
document.addEventListener('DOMContentLoaded', function() {
    // Update auth state from localStorage - check both auth systems
    let isAuthenticated = false;
    let currentUser = null;
    
    // Check OTP auth system first
    if (typeof window.otpAuth !== 'undefined') {
        currentUser = window.otpAuth.getCurrentUser();
        if (currentUser) {
            isAuthenticated = true;
        }
    }
    
    // Fallback to legacy auth system
    if (!isAuthenticated && legacyAuthUtils.isLoggedIn()) {
        isAuthenticated = true;
        currentUser = legacyAuthUtils.getCurrentUser();
    }
    
    authState.isAuthenticated = isAuthenticated;
    authState.user = currentUser;
    
    console.log('🔄 API Client initialized');
    console.log('🔐 Auth state:', authState.isAuthenticated ? 'Logged in' : 'Guest');
});

// Export for global use
window.apiClient = apiClient;
// Note: authUtils is defined in auth.js, don't redefine here
window.orderUtils = orderUtils;
window.adminUtils = adminUtils;