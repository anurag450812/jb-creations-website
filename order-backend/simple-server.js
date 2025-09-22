// Simple test server for Railway deployment
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;

console.log('Starting simple server...');
console.log('PORT from environment:', process.env.PORT);
console.log('Using PORT:', PORT);

app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
    console.log('Health check requested');
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        port: PORT,
        env: process.env.NODE_ENV || 'development'
    });
});

// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'JB Creations Backend - Simple Test',
        status: 'running'
    });
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Simple server running on port ${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

// Graceful shutdown
process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});

process.on('SIGINT', () => {
    console.log('SIGINT received, shutting down gracefully');
    server.close(() => {
        console.log('Server closed');
        process.exit(0);
    });
});