# Order Management Backend for JB Creations

This directory contains the backend components for receiving and processing orders from your photo framing website.

## What You Get From Each Order

When a customer places an order, you'll receive:

### 1. Customer Information
- Full name, email, phone number
- Delivery address
- Delivery method preference (standard/express)
- Special instructions

### 2. Image Files
- **Original Image**: The unmodified image uploaded by the customer
- **Print-Ready Image**: The cropped and styled image ready for printing (with all adjustments applied)
- **Display Preview**: Preview image showing how it looks with the frame

### 3. Frame Specifications
- Frame size (e.g., 13x19)
- Frame orientation (portrait/landscape)
- Frame color (black, white, brown, etc.)
- Frame texture (smooth, textured, etc.)

### 4. Image Adjustments Applied
- Brightness level
- Contrast level
- Highlights adjustment
- Shadows adjustment
- Vibrance level

### 5. Position & Zoom Details
- Zoom level applied
- X/Y position for exact crop recreation

## Setup Options

### Option 1: Simple Email Receiving (Recommended for start)
1. Set up EmailJS (free service)
2. Orders will be sent directly to your email
3. Images are embedded as base64 data

### Option 2: Backend Server (For scaling)
1. Use the provided Node.js server
2. Orders saved to database
3. Images saved as files
4. Admin panel for order management

### Option 3: Manual Download (For testing)
- Orders saved in browser localStorage
- Can be downloaded as JSON files
- Useful for development and testing

## Files Included

- `order-receiver.js` - Node.js backend server
- `package.json` - Dependencies for backend
- `email-template.html` - Email template for order notifications
- `README.md` - This file with setup instructions

## Quick Start

1. Choose your preferred option above
2. Follow the setup instructions for your chosen method
3. Test with a sample order
4. Start receiving real orders!

## Order Data Structure

Each order contains:
```json
{
  "orderNumber": "JB123456789",
  "customer": {
    "name": "Customer Name",
    "email": "customer@email.com",
    "phone": "1234567890",
    "address": "Full address",
    "specialInstructions": "Any special notes"
  },
  "items": [
    {
      "originalImage": "data:image/jpeg;base64,...",
      "printReadyImage": "data:image/jpeg;base64,...",
      "displayImage": "data:image/jpeg;base64,...",
      "frameSize": {"size": "13x19", "orientation": "portrait"},
      "frameColor": "black",
      "frameTexture": "smooth",
      "adjustments": {
        "brightness": 100,
        "contrast": 100,
        "highlights": 100,
        "shadows": 100,
        "vibrance": 100
      },
      "position": {"x": 0, "y": 0},
      "zoom": 1.2,
      "price": 500
    }
  ],
  "totals": {
    "subtotal": 500,
    "delivery": 50,
    "total": 550
  },
  "deliveryMethod": "standard",
  "orderDate": "2025-01-01T10:00:00.000Z"
}
```
