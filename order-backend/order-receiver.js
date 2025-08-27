const express = require('express');
const cors = require('cors');
const fs = require('fs-extra');
const path = require('path');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // Increased limit for base64 images
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve static files from parent directory (your website files)
app.use(express.static(path.join(__dirname, '..')));
// Serve admin files from current directory (admin.html)
app.use(express.static(__dirname));

// Create directories for storing orders and images
const ordersDir = path.join(__dirname, 'orders');
const imagesDir = path.join(__dirname, 'images');

fs.ensureDirSync(ordersDir);
fs.ensureDirSync(imagesDir);

// Email configuration (you'll need to set up your email credentials)
const emailTransporter = nodemailer.createTransport({
    service: 'gmail', // or your preferred email service
    auth: {
        user: process.env.EMAIL_USER, // Your email
        pass: process.env.EMAIL_PASS  // Your email password or app password
    }
});

// Function to save base64 image to file
function saveBase64Image(base64Data, filename) {
    try {
        // Remove data URL prefix if present
        const base64Image = base64Data.replace(/^data:image\/[a-z]+;base64,/, '');
        
        // Create buffer from base64
        const imageBuffer = Buffer.from(base64Image, 'base64');
        
        // Save to file
        const filepath = path.join(imagesDir, filename);
        fs.writeFileSync(filepath, imageBuffer);
        
        return filepath;
    } catch (error) {
        console.error('Error saving image:', error);
        return null;
    }
}

// Function to send order notification email
async function sendOrderNotification(orderData, imagePaths) {
    try {
        const emailHtml = `
            <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #2C2C2C;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h1 style="color: #1DB954; text-align: center;">New Order Received!</h1>
                    
                    <div style="background: #F0F0F0; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h2>Order Details</h2>
                        <p><strong>Order Number:</strong> ${orderData.orderNumber}</p>
                        <p><strong>Order Date:</strong> ${new Date(orderData.orderDate).toLocaleString()}</p>
                        <p><strong>Total Amount:</strong> ₹${orderData.totals.total}</p>
                        <p><strong>Delivery Method:</strong> ${orderData.deliveryMethod === 'express' ? 'Express (2-3 days)' : 'Standard (5-7 days)'}</p>
                    </div>

                    <div style="background: #e3f2fd; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h2>Customer Information</h2>
                        <p><strong>Name:</strong> ${orderData.customer.name}</p>
                        <p><strong>Email:</strong> ${orderData.customer.email}</p>
                        <p><strong>Phone:</strong> ${orderData.customer.phone}</p>
                        <p><strong>Address:</strong> ${orderData.customer.address}</p>
                        ${orderData.customer.specialInstructions ? `<p><strong>Special Instructions:</strong> ${orderData.customer.specialInstructions}</p>` : ''}
                    </div>

                    <div style="background: #f3e5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
                        <h2>Items Ordered</h2>
                        ${orderData.items.map((item, index) => `
                            <div style="border: 1px solid #ddd; padding: 15px; margin: 10px 0; border-radius: 5px;">
                                <h3>Item ${index + 1}</h3>
                                <p><strong>Frame Size:</strong> ${item.frameSize.size} ${item.frameSize.orientation}</p>
                                <p><strong>Frame Color:</strong> ${item.frameColor}</p>
                                <p><strong>Frame Texture:</strong> ${item.frameTexture}</p>
                                <p><strong>Price:</strong> ₹${item.price}</p>
                                <p><strong>Image Adjustments:</strong></p>
                                <ul style="margin: 5px 0;">
                                    <li>Brightness: ${item.adjustments.brightness}%</li>
                                    <li>Contrast: ${item.adjustments.contrast}%</li>
                                    <li>Highlights: ${item.adjustments.highlights}%</li>
                                    <li>Shadows: ${item.adjustments.shadows}%</li>
                                    <li>Vibrance: ${item.adjustments.vibrance}%</li>
                                </ul>
                                <p><strong>Zoom:</strong> ${item.zoom}x</p>
                                <p><strong>Position:</strong> X: ${item.position.x}, Y: ${item.position.y}</p>
                            </div>
                        `).join('')}
                    </div>

                    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                        <h3>Important Notes:</h3>
                        <ul>
                            <li>All images have been saved to your server</li>
                            <li>Use the "Print-Ready" images for production</li>
                            <li>Original images are available for reference</li>
                            <li>Display previews show how the final product should look</li>
                        </ul>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <p style="color: #666;">This is an automated notification from JB Creations Order System</p>
                    </div>
                </div>
            </body>
            </html>
        `;

        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: process.env.BUSINESS_EMAIL || process.env.EMAIL_USER,
            subject: `New Order: ${orderData.orderNumber} - ₹${orderData.totals.total}`,
            html: emailHtml,
            attachments: imagePaths.map((imagePath, index) => ({
                filename: path.basename(imagePath),
                path: imagePath
            }))
        };

        await emailTransporter.sendMail(mailOptions);
        console.log('Order notification email sent successfully');
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
}

// Route to save user data (for Google Sign-In)
app.post('/api/save-user', async (req, res) => {
    try {
        const userData = req.body;
        console.log(`Saving user: ${userData.name} (${userData.email})`);
        
        // Create users directory if it doesn't exist
        const usersDir = path.join(__dirname, 'users');
        fs.ensureDirSync(usersDir);
        
        // Save user data with their ID as filename
        const userFile = path.join(usersDir, `${userData.id}.json`);
        const userDataWithTimestamp = {
            ...userData,
            lastLogin: new Date().toISOString(),
            updatedAt: new Date().toISOString()
        };
        
        // If user file exists, merge with existing data
        if (fs.existsSync(userFile)) {
            const existingUser = fs.readJsonSync(userFile);
            userDataWithTimestamp.createdAt = existingUser.createdAt;
        } else {
            userDataWithTimestamp.createdAt = new Date().toISOString();
        }
        
        fs.writeJsonSync(userFile, userDataWithTimestamp, { spaces: 2 });
        
        res.json({
            success: true,
            message: 'User saved successfully',
            userId: userData.id
        });
        
    } catch (error) {
        console.error('Error saving user:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to save user data'
        });
    }
});

// Route to receive orders
app.post('/api/submit-order', async (req, res) => {
    try {
        const orderData = req.body;
        console.log(`Received order: ${orderData.orderNumber} from user: ${orderData.customer.userId || 'Guest'}`);

        // Create order directory
        const orderDir = path.join(ordersDir, orderData.orderNumber);
        fs.ensureDirSync(orderDir);

        // Save images and collect file paths
        const imagePaths = [];
        
        orderData.items.forEach((item, itemIndex) => {
            // Save original image
            if (item.originalImage) {
                const originalPath = saveBase64Image(
                    item.originalImage, 
                    `${orderData.orderNumber}_item${itemIndex + 1}_original.jpg`
                );
                if (originalPath) {
                    imagePaths.push(originalPath);
                    item.originalImagePath = originalPath;
                }
            }

            // Save print-ready image (this is what you'll use for production)
            if (item.printReadyImage) {
                const printPath = saveBase64Image(
                    item.printReadyImage, 
                    `${orderData.orderNumber}_item${itemIndex + 1}_print.jpg`
                );
                if (printPath) {
                    imagePaths.push(printPath);
                    item.printImagePath = printPath;
                }
            }

            // Save display preview image
            if (item.displayImage) {
                const displayPath = saveBase64Image(
                    item.displayImage, 
                    `${orderData.orderNumber}_item${itemIndex + 1}_preview.jpg`
                );
                if (displayPath) {
                    imagePaths.push(displayPath);
                    item.displayImagePath = displayPath;
                }
            }

            // Remove base64 data from the order object to reduce file size
            delete item.originalImage;
            delete item.printReadyImage;
            delete item.displayImage;
        });

        // Save order data as JSON
        const orderFilePath = path.join(orderDir, 'order.json');
        fs.writeJsonSync(orderFilePath, orderData, { spaces: 2 });

        // Send email notification
        const emailSent = await sendOrderNotification(orderData, imagePaths);

        // Response
        res.json({
            success: true,
            orderNumber: orderData.orderNumber,
            message: 'Order received successfully',
            emailSent,
            orderPath: orderDir,
            imageCount: imagePaths.length
        });

        console.log(`Order ${orderData.orderNumber} processed successfully`);
        console.log(`Customer: ${orderData.customer.userId ? 'Registered User' : 'Guest'}`);
        console.log(`Images saved: ${imagePaths.length}`);
        console.log(`Email notification: ${emailSent ? 'Sent' : 'Failed'}`);

    } catch (error) {
        console.error('Error processing order:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to process order',
            details: error.message
        });
    }
});

// Route to get order details (for admin panel)
app.get('/api/orders/:orderNumber', (req, res) => {
    try {
        const { orderNumber } = req.params;
        const orderPath = path.join(ordersDir, orderNumber, 'order.json');
        
        if (fs.existsSync(orderPath)) {
            const orderData = fs.readJsonSync(orderPath);
            res.json(orderData);
        } else {
            res.status(404).json({ error: 'Order not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve order' });
    }
});

// Route to list all orders (for admin panel)
app.get('/api/orders', (req, res) => {
    try {
        const orders = [];
        const orderDirs = fs.readdirSync(ordersDir);
        
        orderDirs.forEach(dir => {
            const orderPath = path.join(ordersDir, dir, 'order.json');
            if (fs.existsSync(orderPath)) {
                const orderData = fs.readJsonSync(orderPath);
                orders.push({
                    orderNumber: orderData.orderNumber,
                    customerName: orderData.customer.name,
                    customerType: orderData.customer.userId ? 'Registered' : 'Guest',
                    total: orderData.totals.total,
                    orderDate: orderData.orderDate,
                    status: orderData.status || 'pending'
                });
            }
        });
        
        // Sort by date (newest first)
        orders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
        
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve orders' });
    }
});

// Route to get user orders (for authenticated users)
app.get('/api/user/:userId/orders', (req, res) => {
    try {
        const { userId } = req.params;
        const orders = [];
        const orderDirs = fs.readdirSync(ordersDir);
        
        orderDirs.forEach(dir => {
            const orderPath = path.join(ordersDir, dir, 'order.json');
            if (fs.existsSync(orderPath)) {
                const orderData = fs.readJsonSync(orderPath);
                if (orderData.customer.userId === userId) {
                    orders.push({
                        orderNumber: orderData.orderNumber,
                        orderDate: orderData.orderDate,
                        status: orderData.status || 'pending',
                        total: orderData.totals.total,
                        itemCount: orderData.items.length,
                        deliveryMethod: orderData.deliveryMethod
                    });
                }
            }
        });
        
        // Sort by date (newest first)
        orders.sort((a, b) => new Date(b.orderDate) - new Date(a.orderDate));
        
        res.json(orders);
    } catch (error) {
        res.status(500).json({ error: 'Failed to retrieve user orders' });
    }
});

// Serve images
app.use('/images', express.static(imagesDir));

// Route to download all images for a specific order as ZIP
app.get('/api/orders/:orderNumber/images', async (req, res) => {
    try {
        const { orderNumber } = req.params;
        const orderPath = path.join(ordersDir, orderNumber, 'order.json');
        
        if (!fs.existsSync(orderPath)) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const orderData = fs.readJsonSync(orderPath);
        const archiver = require('archiver');
        
        // Set response headers for ZIP download
        res.setHeader('Content-Type', 'application/zip');
        res.setHeader('Content-Disposition', `attachment; filename="${orderNumber}_images.zip"`);
        
        // Create ZIP archive
        const archive = archiver('zip', {
            zlib: { level: 9 } // Maximum compression
        });
        
        archive.pipe(res);
        
        // Add images to ZIP
        orderData.items.forEach((item, index) => {
            if (item.originalImagePath && fs.existsSync(item.originalImagePath)) {
                archive.file(item.originalImagePath, { 
                    name: `item_${index + 1}_original.jpg` 
                });
            }
            if (item.printImagePath && fs.existsSync(item.printImagePath)) {
                archive.file(item.printImagePath, { 
                    name: `item_${index + 1}_print_ready.jpg` 
                });
            }
            if (item.displayImagePath && fs.existsSync(item.displayImagePath)) {
                archive.file(item.displayImagePath, { 
                    name: `item_${index + 1}_preview.jpg` 
                });
            }
        });
        
        // Add order details as text file
        const orderDetails = `
Order Number: ${orderData.orderNumber}
Customer: ${orderData.customer.name}
Email: ${orderData.customer.email}
Phone: ${orderData.customer.phone}
Address: ${orderData.customer.address}
Order Date: ${new Date(orderData.orderDate).toLocaleString()}
Status: ${orderData.status || 'pending'}
Total: ₹${orderData.totals.total}

Items:
${orderData.items.map((item, index) => `
Item ${index + 1}:
- Frame: ${item.frameSize.size} ${item.frameSize.orientation}
- Color: ${item.frameColor}
- Texture: ${item.frameTexture}
- Price: ₹${item.price}
- Adjustments: Brightness ${item.adjustments.brightness}%, Contrast ${item.adjustments.contrast}%
- Zoom: ${item.zoom}x
- Position: X=${item.position.x}, Y=${item.position.y}
`).join('')}
        `;
        
        archive.append(orderDetails, { name: 'order_details.txt' });
        
        await archive.finalize();
        
    } catch (error) {
        console.error('Error creating ZIP archive:', error);
        res.status(500).json({ error: 'Failed to create image archive' });
    }
});

// Route to update order status
app.patch('/api/orders/:orderNumber/status', (req, res) => {
    try {
        const { orderNumber } = req.params;
        const { status } = req.body;
        
        const orderPath = path.join(ordersDir, orderNumber, 'order.json');
        
        if (!fs.existsSync(orderPath)) {
            return res.status(404).json({ error: 'Order not found' });
        }
        
        const orderData = fs.readJsonSync(orderPath);
        orderData.status = status;
        orderData.lastUpdated = new Date().toISOString();
        
        fs.writeJsonSync(orderPath, orderData, { spaces: 2 });
        
        res.json({
            success: true,
            orderNumber,
            newStatus: status,
            message: 'Order status updated successfully'
        });
        
    } catch (error) {
        console.error('Error updating order status:', error);
        res.status(500).json({ error: 'Failed to update order status' });
    }
});

// Route to get order statistics for admin dashboard
app.get('/api/admin/stats', (req, res) => {
    try {
        const orders = [];
        const orderDirs = fs.readdirSync(ordersDir);
        
        orderDirs.forEach(dir => {
            const orderPath = path.join(ordersDir, dir, 'order.json');
            if (fs.existsSync(orderPath)) {
                const orderData = fs.readJsonSync(orderPath);
                orders.push(orderData);
            }
        });
        
        const stats = {
            totalOrders: orders.length,
            pendingOrders: orders.filter(o => o.status === 'pending').length,
            processingOrders: orders.filter(o => o.status === 'processing').length,
            completedOrders: orders.filter(o => o.status === 'completed').length,
            totalRevenue: orders.reduce((sum, o) => sum + o.totals.total, 0),
            averageOrderValue: orders.length > 0 ? orders.reduce((sum, o) => sum + o.totals.total, 0) / orders.length : 0,
            todayOrders: orders.filter(o => {
                const orderDate = new Date(o.orderDate);
                const today = new Date();
                return orderDate.toDateString() === today.toDateString();
            }).length,
            weekOrders: orders.filter(o => {
                const orderDate = new Date(o.orderDate);
                const weekAgo = new Date();
                weekAgo.setDate(weekAgo.getDate() - 7);
                return orderDate >= weekAgo;
            }).length,
            registeredCustomers: orders.filter(o => o.customer.userId).length,
            guestCustomers: orders.filter(o => !o.customer.userId).length
        };
        
        res.json(stats);
        
    } catch (error) {
        console.error('Error getting admin stats:', error);
        res.status(500).json({ error: 'Failed to get statistics' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
    console.log(`JB Creations Order Server running on port ${PORT}`);
    console.log(`Orders will be saved to: ${ordersDir}`);
    console.log(`Images will be saved to: ${imagesDir}`);
    console.log(`Health check: http://localhost:${PORT}/health`);
});

module.exports = app;
