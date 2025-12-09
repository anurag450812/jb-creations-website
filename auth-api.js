/**
 * Xidlz Auth API Client
 * Replaces localStorage-based user management with server-side authentication
 */

class AuthAPI {
    constructor() {
        this.baseURL = 'http://localhost:3001/api';
        this.token = localStorage.getItem('jb_auth_token') || null;
    }

    // Set authorization headers for API requests
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json',
        };

        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }

        return headers;
    }

    // Handle API errors
    async handleResponse(response) {
        const data = await response.json();
        
        if (!response.ok) {
            throw new Error(data.message || 'API request failed');
        }

        return data;
    }

    // Store authentication token
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('jb_auth_token', token);
        } else {
            localStorage.removeItem('jb_auth_token');
        }
    }

    // Send OTP for registration or login
    async sendOTP(phone, type = 'login') {
        try {
            const response = await fetch(`${this.baseURL}/auth/send-otp`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ phone, type })
            });

            const data = await this.handleResponse(response);
            
            // Real OTP sent via Fast2SMS - no demo logic needed
            return data;
        } catch (error) {
            console.error('Send OTP error:', error);
            throw error;
        }
    }

    // Register new user
    async registerUser(userData) {
        try {
            const response = await fetch(`${this.baseURL}/auth/register`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(userData)
            });

            const data = await this.handleResponse(response);

            if (data.success && data.token) {
                this.setToken(data.token);
                // Store user in localStorage for compatibility
                localStorage.setItem('jb_user', JSON.stringify(data.user));
            }

            return data;
        } catch (error) {
            console.error('Registration error:', error);
            throw error;
        }
    }

    // Login user
    async loginUser(phone, otp) {
        try {
            const response = await fetch(`${this.baseURL}/auth/login`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({ phone, otp })
            });

            const data = await this.handleResponse(response);

            if (data.success && data.token) {
                this.setToken(data.token);
                // Store user in localStorage for compatibility
                localStorage.setItem('jb_user', JSON.stringify(data.user));
            }

            return data;
        } catch (error) {
            console.error('Login error:', error);
            throw error;
        }
    }

    // Get user profile
    async getUserProfile() {
        try {
            if (!this.token) {
                throw new Error('No authentication token');
            }

            const response = await fetch(`${this.baseURL}/user/profile`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error('Get profile error:', error);
            throw error;
        }
    }

    // Update user profile
    async updateUserProfile(updates) {
        try {
            if (!this.token) {
                throw new Error('No authentication token');
            }

            const response = await fetch(`${this.baseURL}/user/profile`, {
                method: 'PUT',
                headers: this.getHeaders(),
                body: JSON.stringify(updates)
            });

            return await this.handleResponse(response);
        } catch (error) {
            console.error('Update profile error:', error);
            throw error;
        }
    }

    // Logout user
    async logout() {
        try {
            if (this.token) {
                await fetch(`${this.baseURL}/auth/logout`, {
                    method: 'POST',
                    headers: this.getHeaders()
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            // Clear local data regardless of server response
            this.setToken(null);
            localStorage.removeItem('jb_user');
            sessionStorage.removeItem('jb_user');
        }
    }

    // Check if user is authenticated
    isAuthenticated() {
        return !!this.token;
    }

    // Get stored user data (for compatibility)
    getCurrentUser() {
        const storedUser = localStorage.getItem('jb_user');
        return storedUser ? JSON.parse(storedUser) : null;
    }

    // Backward compatibility: Replace localStorage getUserByPhone
    async getUserByPhone(phone) {
        try {
            // For backward compatibility, we'll try to send OTP to check if user exists
            const result = await this.sendOTP(phone, 'login');
            return { exists: true }; // If no error, user exists
        } catch (error) {
            if (error.message.includes('not found')) {
                return null; // User doesn't exist
            }
            throw error; // Other errors
        }
    }

    // Server health check
    async checkServerHealth() {
        try {
            const response = await fetch(`${this.baseURL.replace('/api', '')}/health`);
            return await response.json();
        } catch (error) {
            console.error('Server health check failed:', error);
            return { success: false, message: 'Server unreachable' };
        }
    }
}

// Create global instance
window.authAPI = new AuthAPI();

console.log('🔐 Xidlz Auth API Client loaded');
console.log('💡 Use window.authAPI to interact with the server');