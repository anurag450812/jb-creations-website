// Minimal test server for Railway deployment - only Express
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

console.log('=== MINIMAL SERVER STARTING ===');
console.log('Node version:', process.version);
console.log('PORT from Railway:', process.env.PORT);
console.log('Using PORT:', PORT);
console.log('Current directory:', process.cwd());
console.log('==================================');

app.use(express.json());

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

// Catch all 404
app.use('*', (req, res) => {
    res.status(404).json({
        error: 'Not Found',
        path: req.originalUrl,
        message: 'Available endpoints: /, /health, /test'
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