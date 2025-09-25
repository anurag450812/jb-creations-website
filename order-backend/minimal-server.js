// Minimal test server for Railway deployment - only Express
require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

// Import Cloudinary service
const cloudinaryService = require('./services/cloudinary-service');

console.log('=== MINIMAL SERVER STARTING ===');
console.log('Node version:', process.version);
console.log('PORT from Railway:', process.env.PORT);
console.log('Using PORT:', PORT);
console.log('Current directory:', process.cwd());
console.log('==================================');

// Cloudinary configuration check
if (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET) {
    console.log('✅ Cloudinary configuration detected');
} else {
    console.warn('⚠️ Cloudinary configuration missing - upload functionality will be limited');
}

app.use(express.json({ limit: '50mb' }));

// Add CORS headers for all routes
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
    
    if (req.method === 'OPTIONS') {
        res.sendStatus(200);
    } else {
        next();
    }
});

app.use(express.static('../')); // Serve the parent directory

// Root endpoint
app.get('/', (req, res) => {
    console.log('GET / requested');
    res.json({
        message: 'JB Creations Backend - MINIMAL TEST',
        status: 'running',
        timestamp: new Date().toISOString(),
        port: PORT,
        nodeVersion: process.version,
        env: process.env.NODE_ENV || 'development'
    });
});

// Health check endpoint
app.get('/health', (req, res) => {
    console.log('GET /health requested');
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        port: PORT
    });
});

// Test endpoint
app.get('/test', (req, res) => {
    console.log('GET /test requested');
    res.json({
        message: 'Test endpoint working!',
        success: true
    });
});

// Cloudinary upload endpoint
app.post('/api/upload-to-cloudinary', async (req, res) => {
    try {
        console.log('🔄 Upload to Cloudinary requested');
        
        const { image, publicId } = req.body;
        
        if (!image || !publicId) {
            console.error('❌ Missing required fields for Cloudinary upload');
            return res.status(400).json({ 
                success: false, 
                error: 'Image data and publicId are required' 
            });
        }
        
        console.log(`🖼️ Uploading image to Cloudinary with publicId: ${publicId}`);
        
        // Upload the image
        const result = await cloudinaryService.uploadBase64Image(image, publicId);
        
        if (result.success) {
            console.log('✅ Image uploaded successfully to Cloudinary');
            res.json({
                success: true,
                secure_url: result.url,
                public_id: result.publicId
            });
        } else {
            console.error('❌ Cloudinary upload failed:', result.error);
            res.status(500).json({
                success: false,
                error: result.error
            });
        }
    } catch (error) {
        console.error('❌ Error in Cloudinary upload endpoint:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Catch all 404
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        path: req.originalUrl,
        message: 'Available endpoints: /, /health, /test, /api/upload-to-cloudinary'
    });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log('🚀 MINIMAL SERVER STARTED SUCCESSFULLY!');
    console.log(`📍 Server running on http://0.0.0.0:${PORT}`);
    console.log(`🔗 Health check: http://0.0.0.0:${PORT}/health`);
    console.log(`🔗 Test endpoint: http://0.0.0.0:${PORT}/test`);
    console.log('==========================================');
});

// Handle errors
server.on('error', (err) => {
    console.error('❌ Server error:', err);
    process.exit(1);
});

// Graceful shutdown
const gracefulShutdown = (signal) => {
    console.log(`\n🛑 ${signal} received, shutting down gracefully`);
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

console.log('Server setup complete, waiting for connections...');