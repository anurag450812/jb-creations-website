const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
require('dotenv').config();

// Import Fast2SMS service
const fast2smsService = require('./services/fast2sms-service');

const app = express();
const PORT = process.env.AUTH_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'jb-creations-secret-key-change-in-production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database setup
const dbPath = path.join(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('❌ Error opening database:', err.message);
    } else {
        console.log('✅ Connected to SQLite database');
    }
});

// Create users table if it doesn't exist
db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            phone TEXT UNIQUE NOT NULL,
            email TEXT,
            password_hash TEXT,
            sign_in_method TEXT DEFAULT 'phone',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_active BOOLEAN DEFAULT 1,
            last_login DATETIME,
            otp_code TEXT,
            otp_expires_at DATETIME,
            login_attempts INTEGER DEFAULT 0,
            locked_until DATETIME
        )
    `, (err) => {
        if (err) {
            console.error('❌ Error creating users table:', err.message);
        } else {
            console.log('✅ Users table ready');
        }
    });
});

// Utility functions
function generateUserId() {
    return 'user_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

function isOTPExpired(expiresAt) {
    return new Date() > new Date(expiresAt);
}

// JWT middleware for protected routes
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// API Routes

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        success: true, 
        message: 'JB Creations Auth Server is running',
        timestamp: new Date().toISOString()
    });
});

// Register new user
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, phone, email, otp } = req.body;

        // Validate input
        if (!name || !phone) {
            return res.status(400).json({
                success: false,
                message: 'Name and phone number are required'
            });
        }

        if (!otp) {
            return res.status(400).json({
                success: false,
                message: 'OTP is required'
            });
        }

        // Format phone number
        let formattedPhone;
        try {
            formattedPhone = fast2smsService.formatPhoneNumber(phone);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        // Verify OTP first
        const verificationResult = fast2smsService.verifyOTP(formattedPhone, otp);
        if (!verificationResult.success) {
            return res.status(400).json(verificationResult);
        }

        // Check if user already exists
        db.get('SELECT phone FROM users WHERE phone = ? OR phone = ?', [phone, '+91' + formattedPhone], async (err, row) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }

            if (row) {
                return res.status(409).json({
                    success: false,
                    message: 'User with this phone number already exists'
                });
            }

            // Create new user
            const userId = generateUserId();
            const phoneWithCountryCode = '+91' + formattedPhone;
            const sql = `
                INSERT INTO users (id, name, phone, email, created_at, updated_at)
                VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
            `;

            db.run(sql, [userId, name.trim(), phoneWithCountryCode, email || null], function(err) {
                if (err) {
                    console.error('Error creating user:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to create user'
                    });
                }

                // Generate JWT token
                const token = jwt.sign(
                    { id: userId, phone: phoneWithCountryCode, name },
                    JWT_SECRET,
                    { expiresIn: '7d' }
                );

                // Get the created user
                db.get('SELECT id, name, phone, email, created_at FROM users WHERE id = ?', [userId], (err, user) => {
                    if (err) {
                        console.error('Error fetching created user:', err);
                        return res.status(500).json({
                            success: false,
                            message: 'User created but failed to retrieve data'
                        });
                    }

                    res.status(201).json({
                        success: true,
                        message: 'User registered successfully',
                        user: {
                            id: user.id,
                            name: user.name,
                            phone: user.phone,
                            email: user.email,
                            signInMethod: 'phone',
                            createdAt: user.created_at
                        },
                        token
                    });
                });
            });
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Login user
app.post('/api/auth/login', async (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }

        if (!otp) {
            return res.status(400).json({
                success: false,
                message: 'OTP is required'
            });
        }

        // Format phone number
        let formattedPhone;
        try {
            formattedPhone = fast2smsService.formatPhoneNumber(phone);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        // Verify OTP first
        const verificationResult = fast2smsService.verifyOTP(formattedPhone, otp);
        if (!verificationResult.success) {
            return res.status(400).json(verificationResult);
        }

        // Find user by phone
        const phoneWithCountryCode = '+91' + formattedPhone;
        db.get('SELECT * FROM users WHERE (phone = ? OR phone = ?) AND is_active = 1', [phone, phoneWithCountryCode], (err, user) => {
            if (err) {
                console.error('Database error:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found. Please register first.',
                    userExists: false
                });
            }

            // Update last login
            db.run('UPDATE users SET last_login = datetime(\'now\') WHERE id = ?', [user.id]);

            // Generate JWT token
            const token = jwt.sign(
                { id: user.id, phone: user.phone, name: user.name },
                JWT_SECRET,
                { expiresIn: '7d' }
            );

            res.json({
                success: true,
                message: 'Login successful',
                user: {
                    id: user.id,
                    name: user.name,
                    phone: user.phone,
                    email: user.email,
                    signInMethod: user.sign_in_method,
                    createdAt: user.created_at,
                    lastLogin: user.last_login
                },
                token
            });
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Send OTP (for both login and registration) - Fast2SMS Integration
app.post('/api/auth/send-otp', async (req, res) => {
    try {
        const { phone, type } = req.body; // type: 'login' or 'register'

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }

        // Format phone number
        let formattedPhone;
        try {
            formattedPhone = fast2smsService.formatPhoneNumber(phone);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        // Check if user exists for login
        if (type === 'login') {
            db.get('SELECT id FROM users WHERE phone = ? OR phone = ?', [phone, '+91' + formattedPhone], (err, user) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: 'Database error'
                    });
                }

                if (!user) {
                    return res.status(404).json({
                        success: false,
                        message: 'User not found. Please register first.',
                        userExists: false
                    });
                }

                // Send OTP via Fast2SMS
                fast2smsService.sendOTP(formattedPhone)
                    .then(result => {
                        res.json({
                            success: true,
                            message: result.message,
                            expiresAt: result.expiresAt,
                            phone: result.phone,
                            // Only include OTP in development
                            ...(result.otp && { otp: result.otp })
                        });
                    })
                    .catch(error => {
                        console.error('Fast2SMS Error:', error);
                        res.status(500).json({
                            success: false,
                            message: error.message || 'Failed to send OTP'
                        });
                    });
            });
        } else {
            // For registration, check if user already exists
            db.get('SELECT id FROM users WHERE phone = ? OR phone = ?', [phone, '+91' + formattedPhone], (err, user) => {
                if (err) {
                    return res.status(500).json({
                        success: false,
                        message: 'Database error'
                    });
                }

                if (user) {
                    return res.status(409).json({
                        success: false,
                        message: 'User already exists. Please login instead.'
                    });
                }

                // Send OTP via Fast2SMS
                fast2smsService.sendOTP(formattedPhone)
                    .then(result => {
                        res.json({
                            success: true,
                            message: result.message,
                            expiresAt: result.expiresAt,
                            phone: result.phone,
                            // Only include OTP in development
                            ...(result.otp && { otp: result.otp })
                        });
                    })
                    .catch(error => {
                        console.error('Fast2SMS Error:', error);
                        res.status(500).json({
                            success: false,
                            message: error.message || 'Failed to send OTP'
                        });
                    });
            });
        }

    } catch (error) {
        console.error('Send OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Verify OTP - Fast2SMS Integration
app.post('/api/auth/verify-otp', async (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and OTP are required'
            });
        }

        // Format phone number
        let formattedPhone;
        try {
            formattedPhone = fast2smsService.formatPhoneNumber(phone);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        // Verify OTP using Fast2SMS service
        const verificationResult = fast2smsService.verifyOTP(formattedPhone, otp);

        if (!verificationResult.success) {
            return res.status(400).json(verificationResult);
        }

        // OTP verified successfully
        res.json({
            success: true,
            message: verificationResult.message,
            phone: verificationResult.phone
        });

    } catch (error) {
        console.error('Verify OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Resend OTP - Fast2SMS Integration
app.post('/api/auth/resend-otp', async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }

        // Format phone number
        let formattedPhone;
        try {
            formattedPhone = fast2smsService.formatPhoneNumber(phone);
        } catch (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        // Resend OTP via Fast2SMS
        const result = await fast2smsService.resendOTP(formattedPhone);

        if (!result.success) {
            return res.status(400).json(result);
        }

        res.json({
            success: true,
            message: result.message,
            expiresAt: result.expiresAt,
            phone: result.phone,
            // Only include OTP in development
            ...(result.otp && { otp: result.otp })
        });

    } catch (error) {
        console.error('Resend OTP error:', error);
        res.status(500).json({
            success: false,
            message: error.message || 'Failed to resend OTP'
        });
    }
});

// Get user profile (protected route)
app.get('/api/user/profile', authenticateToken, (req, res) => {
    db.get('SELECT id, name, phone, email, created_at, last_login FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            user: {
                id: user.id,
                name: user.name,
                phone: user.phone,
                email: user.email,
                createdAt: user.created_at,
                lastLogin: user.last_login
            }
        });
    });
});

// Update user profile (protected route)
app.put('/api/user/profile', authenticateToken, (req, res) => {
    const { name, email } = req.body;

    if (!name) {
        return res.status(400).json({
            success: false,
            message: 'Name is required'
        });
    }

    const sql = 'UPDATE users SET name = ?, email = ?, updated_at = datetime(\'now\') WHERE id = ?';
    
    db.run(sql, [name, email || null, req.user.id], function(err) {
        if (err) {
            console.error('Update error:', err);
            return res.status(500).json({
                success: false,
                message: 'Failed to update profile'
            });
        }

        if (this.changes === 0) {
            return res.status(404).json({
                success: false,
                message: 'User not found'
            });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    });
});

// Logout user (optional - mainly clears server-side sessions if any)
app.post('/api/auth/logout', authenticateToken, (req, res) => {
    // In a more complex setup, you might want to blacklist the token
    // For now, we'll just return success and let the client handle token removal
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Get all users (admin endpoint - for testing)
app.get('/api/admin/users', (req, res) => {
    // In production, add proper admin authentication
    db.all('SELECT id, name, phone, email, created_at, last_login, is_active FROM users ORDER BY created_at DESC', [], (err, users) => {
        if (err) {
            return res.status(500).json({
                success: false,
                message: 'Database error'
            });
        }

        res.json({
            success: true,
            users,
            total: users.length
        });
    });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error'
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: 'API endpoint not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 JB Creations Auth Server running on http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
    console.log(`👥 Admin users: http://localhost:${PORT}/api/admin/users`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received, shutting down gracefully');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('✅ Database connection closed');
        }
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('🛑 SIGINT received, shutting down gracefully');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err);
        } else {
            console.log('✅ Database connection closed');
        }
        process.exit(0);
    });
});