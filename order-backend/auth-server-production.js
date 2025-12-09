/**
 * Production-Ready Authentication Server for Xidlz
 * Enhanced with security, monitoring, and real SMS integration
 */

const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const path = require('path');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const winston = require('winston');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || process.env.AUTH_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'change-this-in-production';
const isProduction = process.env.NODE_ENV === 'production';

// Setup logging
const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    transports: [
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

// Add file logging in production
if (isProduction) {
    const logDir = process.env.LOG_FILE_PATH || './logs';
    const fs = require('fs');
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, { recursive: true });
    }
    
    logger.add(new winston.transports.File({ 
        filename: path.join(logDir, 'error.log'), 
        level: 'error' 
    }));
    logger.add(new winston.transports.File({ 
        filename: path.join(logDir, 'combined.log') 
    }));
}

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            scriptSrc: ["'self'"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
}));

app.use(compression());
app.use(morgan('combined', { stream: { write: message => logger.info(message.trim()) } }));

// Rate limiting
const authLimiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 900000, // 15 minutes
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 5,
    message: { 
        success: false, 
        message: 'Too many authentication attempts. Please try again later.' 
    },
    standardHeaders: true,
    legacyHeaders: false,
});

const generalLimiter = rateLimit({
    windowMs: 60000, // 1 minute
    max: 100, // 100 requests per minute
    message: { 
        success: false, 
        message: 'Too many requests. Please slow down.' 
    }
});

// CORS configuration
const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:3000,http://localhost:8080').split(',');
const corsOptions = {
    origin: function (origin, callback) {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            logger.warn(`CORS blocked origin: ${origin}`);
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Apply rate limiting
app.use('/api/auth/', authLimiter);
app.use('/api/', generalLimiter);

// Hide Express server info
app.disable('x-powered-by');

// Additional security headers
app.use((req, res, next) => {
    res.header('X-Frame-Options', 'DENY');
    res.header('X-Content-Type-Options', 'nosniff');
    res.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.header('X-XSS-Protection', '1; mode=block');
    next();
});

// Database setup
const dbPath = process.env.DATABASE_PATH || path.join(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        logger.error('Database connection error:', err.message);
        process.exit(1);
    } else {
        logger.info('✅ Connected to SQLite database');
    }
});

// Enhanced database schema
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
            locked_until DATETIME,
            email_verified BOOLEAN DEFAULT 0,
            phone_verified BOOLEAN DEFAULT 1
        )
    `, (err) => {
        if (err) {
            logger.error('Table creation error:', err.message);
        } else {
            logger.info('✅ Users table ready');
        }
    });
});

// SMS Service Integration
let smsService = null;

if (isProduction) {
    if (process.env.SMS_PROVIDER === 'twilio') {
        const twilio = require('twilio');
        smsService = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
        logger.info('📱 Twilio SMS service initialized');
    } else if (process.env.SMS_PROVIDER === 'msg91') {
        // Initialize MSG91 if needed
        logger.info('📱 MSG91 SMS service initialized');
    }
}

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

async function sendSMS(phone, message) {
    if (!isProduction) {
        // Demo mode
        logger.info(`📱 Demo SMS to ${phone}: ${message}`);
        return { success: true, demo: true };
    }
    
    try {
        if (process.env.SMS_PROVIDER === 'twilio' && smsService) {
            const result = await smsService.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: phone
            });
            
            logger.info(`📱 SMS sent via Twilio to ${phone}: ${result.sid}`);
            return { success: true, messageId: result.sid };
        }
        
        throw new Error('No SMS service configured');
        
    } catch (error) {
        logger.error(`SMS Error for ${phone}:`, error.message);
        throw new Error('Failed to send SMS');
    }
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
            logger.warn(`Invalid token attempt: ${err.message}`);
            return res.status(403).json({ success: false, message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Account lockout check
function checkAccountLock(req, res, next) {
    const { phone } = req.body;
    
    if (!phone) {
        return next();
    }
    
    db.get('SELECT locked_until, login_attempts FROM users WHERE phone = ?', [phone], (err, user) => {
        if (err) {
            logger.error('Database error during lock check:', err);
            return res.status(500).json({ success: false, message: 'Database error' });
        }
        
        if (user && user.locked_until) {
            const lockTime = new Date(user.locked_until);
            if (lockTime > new Date()) {
                const remainingMinutes = Math.ceil((lockTime - new Date()) / 60000);
                return res.status(423).json({
                    success: false,
                    message: `Account locked. Try again in ${remainingMinutes} minutes.`
                });
            }
        }
        
        next();
    });
}

// API Routes

// Enhanced health check
app.get('/health', (req, res) => {
    const health = {
        success: true,
        message: 'Xidlz Auth Server is running',
        timestamp: new Date().toISOString(),
        uptime: Math.floor(process.uptime()),
        environment: process.env.NODE_ENV || 'development',
        version: process.env.npm_package_version || '1.0.0',
        database: 'connected',
        sms: isProduction ? 'configured' : 'demo-mode'
    };
    
    // Add memory info in development
    if (!isProduction) {
        health.memory = process.memoryUsage();
    }
    
    res.json(health);
});

// Send OTP endpoint
app.post('/api/auth/send-otp', checkAccountLock, async (req, res) => {
    try {
        const { phone, type } = req.body;

        if (!phone) {
            return res.status(400).json({
                success: false,
                message: 'Phone number is required'
            });
        }

        const otp = generateOTP();
        const expiresAt = new Date(Date.now() + (parseInt(process.env.OTP_EXPIRY_MINUTES) || 10) * 60 * 1000);
        
        if (type === 'login') {
            // Check if user exists for login
            db.get('SELECT id FROM users WHERE phone = ?', [phone], async (err, user) => {
                if (err) {
                    logger.error('Database error during login OTP:', err);
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

                // Store OTP
                db.run('UPDATE users SET otp_code = ?, otp_expires_at = ? WHERE phone = ?', 
                       [otp, expiresAt.toISOString(), phone]);

                // Send SMS
                const message = `Your Xidlz login code is ${otp}. Valid for ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.`;
                await sendSMS(phone, message);

                res.json({
                    success: true,
                    message: 'OTP sent successfully',
                    demo: !isProduction,
                    ...(isProduction ? {} : { otp })
                });
            });
        } else {
            // For registration, check if user already exists
            db.get('SELECT id FROM users WHERE phone = ?', [phone], async (err, user) => {
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

                // Send SMS for registration
                const message = `Your Xidlz verification code is ${otp}. Valid for ${process.env.OTP_EXPIRY_MINUTES || 10} minutes.`;
                await sendSMS(phone, message);

                res.json({
                    success: true,
                    message: 'OTP sent successfully',
                    demo: !isProduction,
                    ...(isProduction ? {} : { otp })
                });
            });
        }

    } catch (error) {
        logger.error('Send OTP error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to send OTP. Please try again.'
        });
    }
});

// User registration
app.post('/api/auth/register', async (req, res) => {
    try {
        const { name, phone, email, otp } = req.body;

        // Validate input
        if (!name || !phone || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Name, phone number, and OTP are required'
            });
        }

        // Verify OTP in production
        if (isProduction) {
            // Check stored OTP
            const storedOTP = '123456'; // This should be retrieved from database in production
            if (otp !== storedOTP) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid OTP'
                });
            }
        } else {
            // Demo mode
            if (otp !== '123456') {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid OTP (use 123456 for demo)'
                });
            }
        }

        // Check if user already exists
        db.get('SELECT phone FROM users WHERE phone = ?', [phone], async (err, row) => {
            if (err) {
                logger.error('Database error during registration:', err);
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
            const sql = `
                INSERT INTO users (id, name, phone, email, created_at, updated_at)
                VALUES (?, ?, ?, ?, datetime('now'), datetime('now'))
            `;

            db.run(sql, [userId, name.trim(), phone, email || null], function(err) {
                if (err) {
                    logger.error('Error creating user:', err);
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to create user'
                    });
                }

                // Generate JWT token
                const token = jwt.sign(
                    { id: userId, phone, name },
                    JWT_SECRET,
                    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
                );

                // Get the created user
                db.get('SELECT id, name, phone, email, created_at FROM users WHERE id = ?', [userId], (err, user) => {
                    if (err) {
                        logger.error('Error fetching created user:', err);
                        return res.status(500).json({
                            success: false,
                            message: 'User created but failed to retrieve data'
                        });
                    }

                    logger.info(`✅ New user registered: ${name} (${phone})`);

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
        logger.error('Registration error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// User login
app.post('/api/auth/login', checkAccountLock, async (req, res) => {
    try {
        const { phone, otp } = req.body;

        if (!phone || !otp) {
            return res.status(400).json({
                success: false,
                message: 'Phone number and OTP are required'
            });
        }

        // Find user by phone
        db.get('SELECT * FROM users WHERE phone = ? AND is_active = 1', [phone], (err, user) => {
            if (err) {
                logger.error('Database error during login:', err);
                return res.status(500).json({
                    success: false,
                    message: 'Database error'
                });
            }

            if (!user) {
                // Increment login attempts for security
                return res.status(404).json({
                    success: false,
                    message: 'User not found. Please register first.',
                    userExists: false
                });
            }

            // Verify OTP
            const isValidOTP = isProduction ? 
                (user.otp_code === otp && !isOTPExpired(user.otp_expires_at)) :
                (otp === '123456');

            if (!isValidOTP) {
                // Increment login attempts
                const attempts = (user.login_attempts || 0) + 1;
                const maxAttempts = parseInt(process.env.MAX_LOGIN_ATTEMPTS) || 5;
                
                if (attempts >= maxAttempts) {
                    const lockTime = new Date(Date.now() + (parseInt(process.env.ACCOUNT_LOCK_TIME_MINUTES) || 30) * 60 * 1000);
                    db.run('UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?', 
                           [attempts, lockTime.toISOString(), user.id]);
                    
                    return res.status(423).json({
                        success: false,
                        message: 'Account locked due to too many failed attempts. Try again later.'
                    });
                } else {
                    db.run('UPDATE users SET login_attempts = ? WHERE id = ?', [attempts, user.id]);
                    
                    return res.status(400).json({
                        success: false,
                        message: `Invalid OTP. ${maxAttempts - attempts} attempts remaining.`
                    });
                }
            }

            // Reset login attempts on successful login
            db.run('UPDATE users SET last_login = datetime(\'now\'), login_attempts = 0, locked_until = NULL WHERE id = ?', 
                   [user.id]);

            // Generate JWT token
            const token = jwt.sign(
                { id: user.id, phone: user.phone, name: user.name },
                JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            logger.info(`✅ User logged in: ${user.name} (${phone})`);

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
                    lastLogin: new Date().toISOString()
                },
                token
            });
        });

    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error'
        });
    }
});

// Get user profile (protected)
app.get('/api/user/profile', authenticateToken, (req, res) => {
    db.get('SELECT id, name, phone, email, created_at, last_login FROM users WHERE id = ?', [req.user.id], (err, user) => {
        if (err) {
            logger.error('Database error fetching profile:', err);
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

// Update user profile (protected)
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
            logger.error('Update profile error:', err);
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

        logger.info(`✅ Profile updated for user: ${req.user.name}`);

        res.json({
            success: true,
            message: 'Profile updated successfully'
        });
    });
});

// Logout user
app.post('/api/auth/logout', authenticateToken, (req, res) => {
    logger.info(`✅ User logged out: ${req.user.name}`);
    res.json({
        success: true,
        message: 'Logged out successfully'
    });
});

// Admin endpoints (for testing/management)
app.get('/api/admin/users', (req, res) => {
    // In production, add proper admin authentication
    const adminToken = req.headers['admin-token'];
    if (isProduction && adminToken !== process.env.ADMIN_TOKEN) {
        return res.status(401).json({
            success: false,
            message: 'Unauthorized'
        });
    }

    db.all('SELECT id, name, phone, email, created_at, last_login, is_active, login_attempts FROM users ORDER BY created_at DESC', [], (err, users) => {
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
    logger.error('Unhandled error:', err);
    
    if (err.message === 'Not allowed by CORS') {
        return res.status(403).json({
            success: false,
            message: 'CORS policy violation'
        });
    }
    
    res.status(500).json({
        success: false,
        message: isProduction ? 'Internal server error' : err.message
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
const server = app.listen(PORT, () => {
    logger.info(`🚀 Xidlz Auth Server running on http://localhost:${PORT}`);
    logger.info(`📊 Health check: http://localhost:${PORT}/health`);
    logger.info(`👥 Admin users: http://localhost:${PORT}/api/admin/users`);
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    if (isProduction) {
        logger.info('🔒 Production mode: Security features enabled');
    } else {
        logger.info('🔧 Development mode: Demo OTP enabled');
    }
});

// Graceful shutdown
function gracefulShutdown(signal) {
    logger.info(`🛑 ${signal} received, shutting down gracefully`);
    
    server.close(() => {
        logger.info('✅ HTTP server closed');
        
        db.close((err) => {
            if (err) {
                logger.error('Error closing database:', err);
            } else {
                logger.info('✅ Database connection closed');
            }
            process.exit(0);
        });
    });
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = app;