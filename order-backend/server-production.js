/**
 * Enhanced Production Server with Complete API Endpoints
 * Includes user management, order handling, and admin functionality
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
const multer = require('multer');
const fs = require('fs-extra');
const sharp = require('sharp');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;
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

// Enhanced CORS configuration
const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'http://localhost:3000',
            'http://127.0.0.1:5500',
            'https://your-netlify-site.netlify.app',
            process.env.CORS_ORIGIN
        ].filter(Boolean);
        
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
};

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:"],
            scriptSrc: ["'self'", "https:"],
            imgSrc: ["'self'", "data:", "https:"],
        },
    },
    crossOriginEmbedderPolicy: false
}));

app.use(cors(corsOptions));
app.use(compression());
app.use(morgan('combined'));

// Rate limiting
const limiter = rateLimit({
    windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
    max: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
    message: 'Too many requests from this IP, please try again later.'
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: process.env.MAX_FILE_SIZE || '50mb' }));
app.use(express.urlencoded({ limit: process.env.MAX_FILE_SIZE || '50mb', extended: true }));

// Static file serving
app.use('/images', express.static(path.join(__dirname, 'images')));
app.use('/admin', express.static(path.join(__dirname)));

// Initialize database
const dbPath = process.env.DB_PATH || path.join(__dirname, 'users.db');
const db = new sqlite3.Database(dbPath);

// Create tables if they don't exist
db.serialize(() => {
    // Users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            phone TEXT UNIQUE NOT NULL,
            email TEXT,
            name TEXT,
            password_hash TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            is_verified BOOLEAN DEFAULT FALSE,
            verification_token TEXT,
            reset_token TEXT,
            reset_token_expires DATETIME,
            login_attempts INTEGER DEFAULT 0,
            locked_until DATETIME
        )
    `);

    // Orders table
    db.run(`
        CREATE TABLE IF NOT EXISTS orders (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT UNIQUE NOT NULL,
            user_id INTEGER,
            customer_info TEXT NOT NULL,
            order_details TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            total_amount DECIMAL(10,2),
            payment_status TEXT DEFAULT 'pending',
            payment_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            estimated_delivery DATE,
            tracking_number TEXT,
            notes TEXT,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    `);

    // Order items table
    db.run(`
        CREATE TABLE IF NOT EXISTS order_items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            order_id TEXT NOT NULL,
            item_data TEXT NOT NULL,
            image_path TEXT,
            processed_image_path TEXT,
            frame_size TEXT,
            frame_style TEXT,
            price DECIMAL(10,2),
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders (order_id)
        )
    `);
});

// Middleware to authenticate JWT tokens
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Access token required' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
};

// File upload configuration
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 50 * 1024 * 1024 // 50MB limit
    },
    fileFilter: (req, file, cb) => {
        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedTypes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed.'));
        }
    }
});

// API Routes

// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'healthy', 
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development'
    });
});

// Authentication endpoints
app.post('/api/auth/register', async (req, res) => {
    try {
        const { phone, email, name, password } = req.body;

        if (!phone || !password) {
            return res.status(400).json({ error: 'Phone and password are required' });
        }

        // Check if user already exists
        db.get('SELECT * FROM users WHERE phone = ?', [phone], async (err, user) => {
            if (err) {
                logger.error('Database error during registration:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            if (user) {
                return res.status(400).json({ error: 'User with this phone number already exists' });
            }

            // Hash password
            const saltRounds = parseInt(process.env.BCRYPT_ROUNDS) || 12;
            const passwordHash = await bcrypt.hash(password, saltRounds);

            // Generate verification token
            const verificationToken = jwt.sign({ phone }, JWT_SECRET, { expiresIn: '24h' });

            // Insert new user
            db.run(
                'INSERT INTO users (phone, email, name, password_hash, verification_token) VALUES (?, ?, ?, ?, ?)',
                [phone, email, name, passwordHash, verificationToken],
                function(err) {
                    if (err) {
                        logger.error('Error creating user:', err);
                        return res.status(500).json({ error: 'Failed to create user' });
                    }

                    logger.info(`New user registered: ${phone}`);
                    res.status(201).json({
                        message: 'User created successfully',
                        userId: this.lastID,
                        verificationToken
                    });
                }
            );
        });
    } catch (error) {
        logger.error('Registration error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { phone, password } = req.body;

        if (!phone || !password) {
            return res.status(400).json({ error: 'Phone and password are required' });
        }

        db.get('SELECT * FROM users WHERE phone = ?', [phone], async (err, user) => {
            if (err) {
                logger.error('Database error during login:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            if (!user) {
                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Check if account is locked
            if (user.locked_until && new Date(user.locked_until) > new Date()) {
                return res.status(423).json({ error: 'Account temporarily locked due to too many failed attempts' });
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password_hash);
            
            if (!isValidPassword) {
                // Increment login attempts
                const attempts = (user.login_attempts || 0) + 1;
                const lockedUntil = attempts >= 5 ? new Date(Date.now() + 30 * 60 * 1000) : null; // Lock for 30 minutes

                db.run(
                    'UPDATE users SET login_attempts = ?, locked_until = ? WHERE id = ?',
                    [attempts, lockedUntil, user.id]
                );

                return res.status(401).json({ error: 'Invalid credentials' });
            }

            // Reset login attempts on successful login
            db.run('UPDATE users SET login_attempts = 0, locked_until = NULL WHERE id = ?', [user.id]);

            // Generate JWT token
            const token = jwt.sign(
                { 
                    userId: user.id, 
                    phone: user.phone,
                    email: user.email,
                    name: user.name
                },
                JWT_SECRET,
                { expiresIn: process.env.JWT_EXPIRY || '7d' }
            );

            logger.info(`User logged in: ${phone}`);
            res.json({
                message: 'Login successful',
                token,
                user: {
                    id: user.id,
                    phone: user.phone,
                    email: user.email,
                    name: user.name,
                    isVerified: user.is_verified
                }
            });
        });
    } catch (error) {
        logger.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// User profile endpoints
app.get('/api/user/profile', authenticateToken, (req, res) => {
    db.get('SELECT id, phone, email, name, created_at, is_verified FROM users WHERE id = ?', 
        [req.user.userId], (err, user) => {
            if (err) {
                logger.error('Error fetching user profile:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            if (!user) {
                return res.status(404).json({ error: 'User not found' });
            }

            res.json(user);
        }
    );
});

app.put('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const { email, name } = req.body;

        db.run(
            'UPDATE users SET email = ?, name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [email, name, req.user.userId],
            function(err) {
                if (err) {
                    logger.error('Error updating user profile:', err);
                    return res.status(500).json({ error: 'Internal server error' });
                }

                if (this.changes === 0) {
                    return res.status(404).json({ error: 'User not found' });
                }

                logger.info(`Profile updated for user ID: ${req.user.userId}`);
                res.json({ message: 'Profile updated successfully' });
            }
        );
    } catch (error) {
        logger.error('Profile update error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// Order management endpoints
app.post('/api/orders', upload.array('images'), async (req, res) => {
    try {
        const { orderData, customerInfo } = req.body;
        
        if (!orderData || !customerInfo) {
            return res.status(400).json({ error: 'Order data and customer info are required' });
        }

        const orderDetails = JSON.parse(orderData);
        const customer = JSON.parse(customerInfo);
        
        // Generate unique order ID in yearmonthdatetimeseconds+phone format
        const generateOrderId = (customerPhone = '') => {
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
        };
        
        const orderId = generateOrderId(customer.phone);
        
        // Calculate total amount
        let totalAmount = 0;
        if (orderDetails.items) {
            totalAmount = orderDetails.items.reduce((sum, item) => sum + (item.price || 0), 0);
        }

        // Get user ID if authenticated
        const userId = req.user ? req.user.userId : null;

        // Create order directory
        const orderDir = path.join(__dirname, 'orders', orderId);
        await fs.ensureDir(orderDir);

        // Save order to database
        db.run(
            `INSERT INTO orders (order_id, user_id, customer_info, order_details, total_amount, status)
             VALUES (?, ?, ?, ?, ?, 'pending')`,
            [orderId, userId, JSON.stringify(customer), JSON.stringify(orderDetails), totalAmount],
            function(err) {
                if (err) {
                    logger.error('Error creating order:', err);
                    return res.status(500).json({ error: 'Failed to create order' });
                }

                logger.info(`New order created: ${orderId}`);
                
                // Save order details to file (for backward compatibility)
                const orderFile = path.join(orderDir, 'order.json');
                fs.writeJsonSync(orderFile, {
                    orderId,
                    customer,
                    orderDetails,
                    totalAmount,
                    createdAt: new Date().toISOString(),
                    status: 'pending'
                });

                res.status(201).json({
                    message: 'Order created successfully',
                    orderId: orderId,
                    totalAmount: totalAmount
                });
            }
        );
    } catch (error) {
        logger.error('Order creation error:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

app.get('/api/orders', authenticateToken, (req, res) => {
    const { page = 1, limit = 10, status } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM orders WHERE user_id = ?';
    let params = [req.user.userId];
    
    if (status) {
        query += ' AND status = ?';
        params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(query, params, (err, orders) => {
        if (err) {
            logger.error('Error fetching orders:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        // Get total count for pagination
        let countQuery = 'SELECT COUNT(*) as total FROM orders WHERE user_id = ?';
        let countParams = [req.user.userId];
        
        if (status) {
            countQuery += ' AND status = ?';
            countParams.push(status);
        }
        
        db.get(countQuery, countParams, (err, countResult) => {
            if (err) {
                logger.error('Error counting orders:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            res.json({
                orders: orders.map(order => ({
                    ...order,
                    customer_info: JSON.parse(order.customer_info),
                    order_details: JSON.parse(order.order_details)
                })),
                pagination: {
                    page: parseInt(page),
                    limit: parseInt(limit),
                    total: countResult.total,
                    totalPages: Math.ceil(countResult.total / limit)
                }
            });
        });
    });
});

app.get('/api/orders/:orderId', (req, res) => {
    const { orderId } = req.params;
    
    db.get('SELECT * FROM orders WHERE order_id = ?', [orderId], (err, order) => {
        if (err) {
            logger.error('Error fetching order:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        // Check if user owns this order (if authenticated)
        if (req.user && order.user_id !== req.user.userId) {
            return res.status(403).json({ error: 'Access denied' });
        }

        res.json({
            ...order,
            customer_info: JSON.parse(order.customer_info),
            order_details: JSON.parse(order.order_details)
        });
    });
});

// Admin endpoints (require admin privileges)
const requireAdmin = (req, res, next) => {
    // Simple admin check - you can enhance this based on your needs
    if (!req.user || req.user.email !== process.env.ADMIN_EMAIL) {
        return res.status(403).json({ error: 'Admin access required' });
    }
    next();
};

app.get('/api/admin/orders', authenticateToken, requireAdmin, (req, res) => {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (page - 1) * limit;
    
    let query = 'SELECT * FROM orders';
    let params = [];
    
    if (status) {
        query += ' WHERE status = ?';
        params.push(status);
    }
    
    query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    db.all(query, params, (err, orders) => {
        if (err) {
            logger.error('Error fetching admin orders:', err);
            return res.status(500).json({ error: 'Internal server error' });
        }

        res.json({
            orders: orders.map(order => ({
                ...order,
                customer_info: JSON.parse(order.customer_info),
                order_details: JSON.parse(order.order_details)
            }))
        });
    });
});

app.put('/api/admin/orders/:orderId/status', authenticateToken, requireAdmin, (req, res) => {
    const { orderId } = req.params;
    const { status, notes } = req.body;
    
    db.run(
        'UPDATE orders SET status = ?, notes = ?, updated_at = CURRENT_TIMESTAMP WHERE order_id = ?',
        [status, notes, orderId],
        function(err) {
            if (err) {
                logger.error('Error updating order status:', err);
                return res.status(500).json({ error: 'Internal server error' });
            }

            if (this.changes === 0) {
                return res.status(404).json({ error: 'Order not found' });
            }

            logger.info(`Order ${orderId} status updated to: ${status}`);
            res.json({ message: 'Order status updated successfully' });
        }
    );
});

// Serve admin dashboard
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-enhanced.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    logger.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Graceful shutdown
process.on('SIGTERM', () => {
    logger.info('SIGTERM received, shutting down gracefully');
    server.close(() => {
        db.close((err) => {
            if (err) {
                logger.error('Error closing database:', err);
            } else {
                logger.info('Database connection closed');
            }
            process.exit(0);
        });
    });
});

const server = app.listen(PORT, '0.0.0.0', () => {
    logger.info(`JB Creations Production Server running on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.info(`Admin panel available at: http://localhost:${PORT}/admin`);
});

module.exports = app;