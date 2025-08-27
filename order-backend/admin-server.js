/**
 * Enhanced Order Processing Backend for JB Creations
 * Supports the new admin panel features
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const archiver = require('archiver');
const multer = require('multer');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Directories
const ORDERS_DIR = path.join(__dirname, 'orders');
const IMAGES_DIR = path.join(__dirname, 'images');

// Ensure directories exist
async function ensureDirectories() {
    try {
        await fs.mkdir(ORDERS_DIR, { recursive: true });
        await fs.mkdir(IMAGES_DIR, { recursive: true });
        console.log('✅ Directories initialized');
    } catch (error) {
        console.error('❌ Error creating directories:', error);
    }
}

// Helper function to read all orders
async function getAllOrders() {
    try {
        const files = await fs.readdir(ORDERS_DIR);
        const orderFiles = files.filter(file => file.endsWith('.json'));
        
        const orders = [];
        for (const file of orderFiles) {
            try {
                const filePath = path.join(ORDERS_DIR, file);
                const data = await fs.readFile(filePath, 'utf8');
                const order = JSON.parse(data);
                orders.push(order);
            } catch (error) {
                console.error(`Error reading order file ${file}:`, error);
            }
        }
        
        // Sort by date (newest first)
        orders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
        
        return orders;
    } catch (error) {
        console.error('Error reading orders:', error);
        return [];
    }
}

// Helper function to save order
async function saveOrder(order) {
    try {
        const filePath = path.join(ORDERS_DIR, `${order.orderNumber}.json`);
        await fs.writeFile(filePath, JSON.stringify(order, null, 2));
        return true;
    } catch (error) {
        console.error('Error saving order:', error);
        return false;
    }
}

// Helper function to save images
async function saveOrderImages(orderNumber, items) {
    try {
        const orderImageDir = path.join(IMAGES_DIR, orderNumber);
        await fs.mkdir(orderImageDir, { recursive: true });
        
        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            
            // Save print-ready image
            if (item.printReadyImage) {
                const printImageData = item.printReadyImage.replace(/^data:image\/[a-z]+;base64,/, '');
                const printImagePath = path.join(orderImageDir, `item_${i + 1}_print.jpg`);
                await fs.writeFile(printImagePath, printImageData, 'base64');
            }
            
            // Save display image
            if (item.displayImage) {
                const displayImageData = item.displayImage.replace(/^data:image\/[a-z]+;base64,/, '');
                const displayImagePath = path.join(orderImageDir, `item_${i + 1}_display.jpg`);
                await fs.writeFile(displayImagePath, displayImageData, 'base64');
            }
            
            // Save original image if available
            if (item.originalImage) {
                const originalImageData = item.originalImage.replace(/^data:image\/[a-z]+;base64,/, '');
                const originalImagePath = path.join(orderImageDir, `item_${i + 1}_original.jpg`);
                await fs.writeFile(originalImagePath, originalImageData, 'base64');
            }
        }
        
        return true;
    } catch (error) {
        console.error('Error saving order images:', error);
        return false;
    }
}

// Routes

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'JB Creations Enhanced Admin API is running',
        timestamp: new Date().toISOString()
    });
});

// Get all orders with filtering and pagination
app.get('/api/orders', async (req, res) => {
    try {
        let orders = await getAllOrders();
        
        // Apply filters
        const { 
            status, 
            customerType, 
            dateFrom, 
            dateTo, 
            search, 
            sortBy, 
            limit, 
            offset 
        } = req.query;
        
        // Filter by status
        if (status) {
            orders = orders.filter(order => order.status === status);
        }
        
        // Filter by customer type
        if (customerType) {
            orders = orders.filter(order => order.customerType === customerType);
        }
        
        // Filter by date range
        if (dateFrom) {
            const fromDate = new Date(dateFrom);
            orders = orders.filter(order => new Date(order.orderDate) >= fromDate);
        }
        
        if (dateTo) {
            const toDate = new Date(dateTo);
            toDate.setHours(23, 59, 59, 999); // End of day
            orders = orders.filter(order => new Date(order.orderDate) <= toDate);
        }
        
        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            orders = orders.filter(order => 
                order.orderNumber.toLowerCase().includes(searchLower) ||
                order.customer.name.toLowerCase().includes(searchLower) ||
                order.customer.email.toLowerCase().includes(searchLower)
            );
        }
        
        // Sort orders
        if (sortBy) {
            switch (sortBy) {
                case 'date_asc':
                    orders.sort((a, b) => new Date(a.orderDate) - new Date(b.orderDate));
                    break;
                case 'date_desc':
                    orders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
                    break;
                case 'amount_asc':
                    orders.sort((a, b) => a.totals.total - b.totals.total);
                    break;
                case 'amount_desc':
                    orders.sort((a, b) => b.totals.total - a.totals.total);
                    break;
                case 'status':
                    orders.sort((a, b) => a.status.localeCompare(b.status));
                    break;
                default:
                    orders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
            }
        }
        
        // Pagination
        const totalOrders = orders.length;
        if (limit) {
            const limitNum = parseInt(limit);
            const offsetNum = parseInt(offset) || 0;
            orders = orders.slice(offsetNum, offsetNum + limitNum);
        }
        
        // Transform orders for admin display
        const transformedOrders = orders.map(order => ({
            orderNumber: order.orderNumber,
            customerName: order.customer.name,
            customerEmail: order.customer.email,
            customerType: order.customerType || 'registered',
            orderDate: order.orderDate,
            status: order.status,
            total: order.totals.total,
            itemCount: order.items.length,
            deliveryMethod: order.deliveryMethod || 'standard',
            specialInstructions: order.customer.specialInstructions || '',
            address: order.customer.address
        }));
        
        res.json({
            orders: transformedOrders,
            total: totalOrders,
            filtered: transformedOrders.length
        });
        
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).json({ 
            error: 'Failed to fetch orders',
            message: error.message 
        });
    }
});

// Get single order details
app.get('/api/orders/:orderNumber', async (req, res) => {
    try {
        const { orderNumber } = req.params;
        const filePath = path.join(ORDERS_DIR, `${orderNumber}.json`);
        
        const data = await fs.readFile(filePath, 'utf8');
        const order = JSON.parse(data);
        
        res.json(order);
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Order not found' });
        } else {
            console.error('Error fetching order:', error);
            res.status(500).json({ 
                error: 'Failed to fetch order',
                message: error.message 
            });
        }
    }
});

// Update order status
app.patch('/api/orders/:orderNumber/status', async (req, res) => {
    try {
        const { orderNumber } = req.params;
        const { status } = req.body;
        
        if (!status || !['pending', 'processing', 'shipped', 'delivered', 'completed'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        const filePath = path.join(ORDERS_DIR, `${orderNumber}.json`);
        const data = await fs.readFile(filePath, 'utf8');
        const order = JSON.parse(data);
        
        order.status = status;
        order.updatedAt = new Date().toISOString();
        
        await fs.writeFile(filePath, JSON.stringify(order, null, 2));
        
        res.json({ 
            success: true, 
            message: `Order ${orderNumber} status updated to ${status}`,
            order: {
                orderNumber: order.orderNumber,
                status: order.status,
                updatedAt: order.updatedAt
            }
        });
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Order not found' });
        } else {
            console.error('Error updating order status:', error);
            res.status(500).json({ 
                error: 'Failed to update order status',
                message: error.message 
            });
        }
    }
});

// Bulk update order statuses
app.patch('/api/orders/bulk/status', async (req, res) => {
    try {
        const { orderNumbers, status } = req.body;
        
        if (!orderNumbers || !Array.isArray(orderNumbers) || orderNumbers.length === 0) {
            return res.status(400).json({ error: 'Order numbers array is required' });
        }
        
        if (!status || !['pending', 'processing', 'shipped', 'delivered', 'completed'].includes(status)) {
            return res.status(400).json({ error: 'Invalid status' });
        }
        
        const results = [];
        const timestamp = new Date().toISOString();
        
        for (const orderNumber of orderNumbers) {
            try {
                const filePath = path.join(ORDERS_DIR, `${orderNumber}.json`);
                const data = await fs.readFile(filePath, 'utf8');
                const order = JSON.parse(data);
                
                order.status = status;
                order.updatedAt = timestamp;
                
                await fs.writeFile(filePath, JSON.stringify(order, null, 2));
                
                results.push({ orderNumber, success: true });
            } catch (error) {
                console.error(`Error updating order ${orderNumber}:`, error);
                results.push({ orderNumber, success: false, error: error.message });
            }
        }
        
        const successCount = results.filter(r => r.success).length;
        
        res.json({
            success: true,
            message: `${successCount}/${orderNumbers.length} orders updated successfully`,
            results
        });
        
    } catch (error) {
        console.error('Error bulk updating orders:', error);
        res.status(500).json({ 
            error: 'Failed to bulk update orders',
            message: error.message 
        });
    }
});

// Download order images as ZIP
app.get('/api/orders/:orderNumber/images', async (req, res) => {
    try {
        const { orderNumber } = req.params;
        const orderImageDir = path.join(IMAGES_DIR, orderNumber);
        
        // Check if order images directory exists
        try {
            await fs.access(orderImageDir);
        } catch (error) {
            return res.status(404).json({ error: 'Order images not found' });
        }
        
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        res.attachment(`${orderNumber}_images.zip`);
        
        archive.on('error', (err) => {
            console.error('Archive error:', err);
            res.status(500).json({ error: 'Failed to create archive' });
        });
        
        archive.pipe(res);
        
        // Add all files in the order directory to the archive
        const files = await fs.readdir(orderImageDir);
        for (const file of files) {
            const filePath = path.join(orderImageDir, file);
            archive.file(filePath, { name: file });
        }
        
        await archive.finalize();
        
    } catch (error) {
        console.error('Error downloading order images:', error);
        res.status(500).json({ 
            error: 'Failed to download order images',
            message: error.message 
        });
    }
});

// Bulk download images for multiple orders
app.post('/api/orders/bulk/images', async (req, res) => {
    try {
        const { orderNumbers } = req.body;
        
        if (!orderNumbers || !Array.isArray(orderNumbers) || orderNumbers.length === 0) {
            return res.status(400).json({ error: 'Order numbers array is required' });
        }
        
        const archive = archiver('zip', { zlib: { level: 9 } });
        
        res.attachment(`bulk_order_images_${new Date().toISOString().split('T')[0]}.zip`);
        
        archive.on('error', (err) => {
            console.error('Archive error:', err);
            res.status(500).json({ error: 'Failed to create archive' });
        });
        
        archive.pipe(res);
        
        for (const orderNumber of orderNumbers) {
            const orderImageDir = path.join(IMAGES_DIR, orderNumber);
            
            try {
                await fs.access(orderImageDir);
                const files = await fs.readdir(orderImageDir);
                
                for (const file of files) {
                    const filePath = path.join(orderImageDir, file);
                    archive.file(filePath, { name: `${orderNumber}/${file}` });
                }
            } catch (error) {
                console.log(`No images found for order ${orderNumber}`);
            }
        }
        
        await archive.finalize();
        
    } catch (error) {
        console.error('Error bulk downloading images:', error);
        res.status(500).json({ 
            error: 'Failed to bulk download images',
            message: error.message 
        });
    }
});

// Get order statistics
app.get('/api/stats', async (req, res) => {
    try {
        const orders = await getAllOrders();
        
        const stats = {
            total: orders.length,
            pending: 0,
            processing: 0,
            shipped: 0,
            delivered: 0,
            completed: 0,
            totalRevenue: 0,
            totalCustomers: 0,
            guestOrders: 0,
            registeredOrders: 0
        };
        
        const uniqueCustomers = new Set();
        
        orders.forEach(order => {
            stats[order.status]++;
            stats.totalRevenue += order.totals.total;
            uniqueCustomers.add(order.customer.email);
            
            if (order.customerType === 'guest') {
                stats.guestOrders++;
            } else {
                stats.registeredOrders++;
            }
        });
        
        stats.totalCustomers = uniqueCustomers.size;
        
        // Calculate weekly/monthly changes (simplified)
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        
        const recentOrders = orders.filter(order => new Date(order.orderDate) >= oneWeekAgo);
        const weeklyStats = {
            total: recentOrders.length,
            pending: recentOrders.filter(o => o.status === 'pending').length,
            processing: recentOrders.filter(o => o.status === 'processing').length,
            shipped: recentOrders.filter(o => o.status === 'shipped').length,
            completed: recentOrders.filter(o => o.status === 'completed').length
        };
        
        res.json({ stats, weeklyStats });
        
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ 
            error: 'Failed to fetch statistics',
            message: error.message 
        });
    }
});

// Original order submission endpoint (enhanced)
app.post('/api/orders', async (req, res) => {
    try {
        const orderData = req.body;
        
        // Validate required fields
        if (!orderData.orderNumber || !orderData.customer || !orderData.items) {
            return res.status(400).json({ 
                error: 'Missing required fields',
                required: ['orderNumber', 'customer', 'items']
            });
        }
        
        // Add server timestamp
        orderData.receivedAt = new Date().toISOString();
        orderData.status = orderData.status || 'pending';
        orderData.customerType = orderData.customerType || 'registered';
        
        // Save order data
        const orderSaved = await saveOrder(orderData);
        if (!orderSaved) {
            throw new Error('Failed to save order data');
        }
        
        // Save order images
        const imagesSaved = await saveOrderImages(orderData.orderNumber, orderData.items);
        if (!imagesSaved) {
            console.warn('Failed to save some order images');
        }
        
        console.log(`✅ Order ${orderData.orderNumber} processed successfully`);
        
        res.json({
            success: true,
            message: 'Order received and processed successfully',
            orderNumber: orderData.orderNumber,
            status: orderData.status
        });
        
    } catch (error) {
        console.error('❌ Error processing order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process order',
            message: error.message
        });
    }
});

// Export orders as CSV
app.get('/api/orders/export/csv', async (req, res) => {
    try {
        const orders = await getAllOrders();
        
        const csvHeaders = [
            'Order Number',
            'Customer Name',
            'Email',
            'Type',
            'Date',
            'Status',
            'Total',
            'Items',
            'Delivery',
            'Special Instructions'
        ];
        
        const csvRows = orders.map(order => [
            order.orderNumber,
            `"${order.customer.name}"`,
            order.customer.email,
            order.customerType || 'registered',
            new Date(order.orderDate).toLocaleDateString(),
            order.status,
            order.totals.total,
            order.items.length,
            order.deliveryMethod || 'standard',
            `"${order.customer.specialInstructions || ''}"`
        ]);
        
        const csvContent = [csvHeaders.join(','), ...csvRows.map(row => row.join(','))].join('\n');
        
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename="orders_export_${new Date().toISOString().split('T')[0]}.csv"`);
        res.send(csvContent);
        
    } catch (error) {
        console.error('Error exporting orders:', error);
        res.status(500).json({ 
            error: 'Failed to export orders',
            message: error.message 
        });
    }
});

// Delete order (admin only)
app.delete('/api/orders/:orderNumber', async (req, res) => {
    try {
        const { orderNumber } = req.params;
        
        // Delete order file
        const orderFilePath = path.join(ORDERS_DIR, `${orderNumber}.json`);
        await fs.unlink(orderFilePath);
        
        // Delete order images directory
        const orderImageDir = path.join(IMAGES_DIR, orderNumber);
        try {
            await fs.rmdir(orderImageDir, { recursive: true });
        } catch (error) {
            console.log(`No images directory found for order ${orderNumber}`);
        }
        
        res.json({
            success: true,
            message: `Order ${orderNumber} deleted successfully`
        });
        
    } catch (error) {
        if (error.code === 'ENOENT') {
            res.status(404).json({ error: 'Order not found' });
        } else {
            console.error('Error deleting order:', error);
            res.status(500).json({ 
                error: 'Failed to delete order',
                message: error.message 
            });
        }
    }
});

// Serve the enhanced admin panel
app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin-enhanced.html'));
});

// Serve the original admin panel
app.get('/admin-legacy', (req, res) => {
    res.sendFile(path.join(__dirname, 'admin.html'));
});

// Error handler
app.use((error, req, res, next) => {
    console.error('Unhandled error:', error);
    res.status(500).json({
        error: 'Internal server error',
        message: error.message
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({
        error: 'Endpoint not found',
        message: `${req.method} ${req.path} is not a valid endpoint`
    });
});

// Start server
async function startServer() {
    await ensureDirectories();
    
    app.listen(PORT, () => {
        console.log(`🚀 JB Creations Enhanced Admin API running on port ${PORT}`);
        console.log(`📊 Enhanced Admin Panel: http://localhost:${PORT}/admin`);
        console.log(`📋 Legacy Admin Panel: http://localhost:${PORT}/admin-legacy`);
        console.log(`🔧 API Health Check: http://localhost:${PORT}/api/health`);
    });
}

// Handle graceful shutdown
process.on('SIGTERM', () => {
    console.log('👋 Shutting down server gracefully...');
    process.exit(0);
});

process.on('SIGINT', () => {
    console.log('👋 Shutting down server gracefully...');
    process.exit(0);
});

startServer().catch(error => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
});

module.exports = app;
