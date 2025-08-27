# JB Creations - Order Management Setup Guide

## Quick Setup (Choose One Option)

### Option 1: Email-Only Setup (Easiest - Recommended for Start)

This is the simplest way to start receiving orders. Orders will be sent directly to your email.

1. **Update the checkout.js file** to use EmailJS:
   - Sign up for free at [EmailJS.com](https://www.emailjs.com/)
   - Create an email template
   - Get your Service ID, Template ID, and User ID
   - Update the checkout.js file with your credentials

2. **No backend required** - orders are sent directly via email

### Option 2: Full Backend Setup (For Scaling)

Set up a complete order management system with database and admin panel.

## Backend Setup Instructions

### Prerequisites
- Node.js installed on your computer
- A Gmail account (or other email service)

### Step 1: Install Dependencies
```bash
cd "order-backend"
npm install
```

### Step 2: Configure Email
1. Copy `.env.example` to `.env`
2. Update the email settings:
   ```
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   BUSINESS_EMAIL=your-business-email@gmail.com
   ```

3. **For Gmail users:**
   - Enable 2-factor authentication
   - Generate an "App Password" for this application
   - Use the app password in EMAIL_PASS

### Step 3: Start the Server
```bash
npm start
```

The server will run on http://localhost:3001

### Step 4: Update Frontend
Update the `checkout.js` file to point to your backend:
- Change the fetch URL from `/api/submit-order` to `http://localhost:3001/api/submit-order`

### Step 5: Test the System
1. Go to your website
2. Upload an image and customize it
3. Add to cart
4. Go through checkout process
5. Check your email and admin panel

## Admin Panel Access

Once the backend is running, access the admin panel at:
http://localhost:3001/admin.html

## What You'll Receive for Each Order

### 1. Email Notification
- Complete order details
- Customer information
- All images as attachments

### 2. Files Saved on Server
```
orders/
├── JB123456789/
│   ├── order.json (order details)
│   ├── JB123456789_item1_original.jpg (original image)
│   ├── JB123456789_item1_print.jpg (print-ready image)
│   └── JB123456789_item1_preview.jpg (preview with frame)
```

### 3. Image Types Explained
- **Original Image**: The unmodified image uploaded by customer
- **Print-Ready Image**: Cropped and styled image ready for printing
- **Preview Image**: Shows how the final product should look with frame

## Production Deployment

### For Small Business (Recommended)
Use a service like:
- **Heroku** (free tier available)
- **Vercel** (free for small projects)
- **Railway** (simple deployment)

### For Larger Operations
- **VPS** (Virtual Private Server)
- **AWS** or **Google Cloud**
- **DigitalOcean**

## Backup and Security

### Important Files to Backup
- `orders/` folder (contains all orders)
- `images/` folder (contains all images)
- `.env` file (contains your email settings)

### Security Recommendations
- Use strong passwords
- Enable 2-factor authentication
- Regularly backup order data
- Use HTTPS in production
- Limit admin panel access

## Troubleshooting

### Common Issues
1. **Email not sending**
   - Check EMAIL_USER and EMAIL_PASS in .env
   - Verify Gmail app password is correct
   - Check spam folder

2. **Orders not saving**
   - Check server logs for errors
   - Verify write permissions to orders folder
   - Check disk space

3. **Images not displaying**
   - Check images folder permissions
   - Verify image file paths
   - Check browser console for errors

### Testing
Use the provided test files:
- `test-order.html` - Test order submission
- `test-images.html` - Test image processing

## Support

For technical support:
1. Check the logs in your terminal
2. Verify all configuration settings
3. Test with a simple order first
4. Contact your developer if needed

## Scaling Up

As your business grows, consider:
- Database integration (MongoDB, PostgreSQL)
- Payment processing integration
- Automated order status updates
- Customer order tracking portal
- Inventory management system
