# Photo Framing Website - Admin Panel

## Overview
This is a comprehensive admin panel for managing orders from your photo framing website. It provides advanced filtering, bulk operations, and image download capabilities.

## Features

### 🎯 Order Management
- **View all orders** with detailed information
- **Advanced filtering** by status, date range, customer type, and search
- **Real-time order statistics** dashboard
- **Bulk operations** for processing multiple orders
- **Status management** with one-click updates

### 📥 Image Downloads
- **Individual image downloads** for each order item
- **Bulk ZIP downloads** containing all images for an order
- **Organized file structure** with clear naming conventions
- **Order details** included as text file in ZIP

### 📊 Data Export
- **CSV export** for spreadsheet analysis
- **Printable order lists** for physical records
- **Filtered exports** based on current search criteria

### 🔍 Search & Filter Options
- **Text search** across order numbers, customer names, and emails
- **Status filtering**: All, Pending, Processing, Completed
- **Date range picker** for time-based filtering
- **Customer type**: All, Registered Users, Guest Customers

## Getting Started

### 1. Prerequisites
- Node.js installed on your system
- Basic understanding of running terminal commands

### 2. Installation
1. Navigate to the `order-backend` folder
2. Run `setup.bat` (Windows) or install manually:
   ```bash
   npm install
   ```

### 3. Starting the Server
```bash
# Standard mode
npm start

# Development mode (auto-reload)
npm run dev
```

### 4. Access Admin Panel
Open your browser and go to: `http://localhost:3001/admin.html`

## Admin Panel Usage

### Dashboard Overview
- **Total Orders**: Complete count of all orders
- **Status Breakdown**: Pending, Processing, Completed counts
- **Revenue Metrics**: Total revenue and average order value
- **Time-based Stats**: Today's orders, this week's orders
- **Customer Types**: Registered vs Guest customer breakdown

### Order Management Workflow

#### 1. Viewing Orders
- Orders are displayed in a sortable table
- Click column headers to sort by that field
- Use pagination controls for large order lists

#### 2. Filtering Orders
- **Search Bar**: Type order number, customer name, or email
- **Status Filter**: Select specific order statuses
- **Date Range**: Pick start and end dates
- **Customer Type**: Filter by registered or guest customers
- **Clear Filters**: Reset all filters with one click

#### 3. Processing Individual Orders
- **View Details**: Click order number to see full details
- **Update Status**: Use dropdown to change order status
- **Download Images**: 
  - Individual images via item action buttons
  - Complete order ZIP via "Download ZIP" button

#### 4. Bulk Operations
- **Select Orders**: Use checkboxes to select multiple orders
- **Select All**: Toggle all visible orders
- **Bulk Status Update**: Change status for all selected orders
- **Bulk Export**: Export selected orders to CSV

### Image Downloads

#### Individual Images
Each order item has action buttons for:
- **Original**: The user's uploaded image
- **Print**: The cropped, print-ready version
- **Preview**: The image with frame preview

#### ZIP Downloads
- Contains all images for an order
- Includes order details as text file
- Organized with clear file naming:
  - `item_1_original.jpg`
  - `item_1_print_ready.jpg`
  - `item_1_preview.jpg`
  - `order_details.txt`

### Data Export

#### CSV Export
- Exports order data in spreadsheet format
- Includes all order details and customer information
- Respects current filter settings
- Downloads automatically to default folder

#### Print View
- Clean, printer-friendly order list
- Removes interactive elements
- Maintains essential order information
- Print using browser's print function (Ctrl+P)

## API Endpoints

The admin panel uses these backend API endpoints:

### Order Management
- `GET /api/orders` - Get all orders with filtering
- `PATCH /api/orders/:orderNumber/status` - Update order status
- `GET /api/admin/stats` - Get dashboard statistics

### Image Downloads
- `GET /api/orders/:orderNumber/images` - Download order images as ZIP
- `GET /images/:filename` - Access individual image files

## File Structure

```
order-backend/
├── admin.html              # Admin panel interface
├── order-receiver.js       # Main server file
├── package.json            # Dependencies
├── setup.bat              # Windows setup script
├── orders/                # Order data storage
│   └── ORD-XXXXXX/       # Individual order folders
│       ├── order.json    # Order details
│       └── images/       # Order images
└── images/               # Global image storage
```

## Order Data Structure

Each order contains:
```json
{
  "orderNumber": "ORD-123456",
  "orderDate": "2024-01-15T10:30:00Z",
  "status": "pending",
  "customer": {
    "userId": "user123",
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+1234567890",
    "address": "123 Main St..."
  },
  "items": [
    {
      "frameSize": {"size": "13X10", "orientation": "PORTRAIT"},
      "frameColor": "Black",
      "frameTexture": "Wood",
      "price": 1500,
      "originalImagePath": "path/to/original.jpg",
      "printImagePath": "path/to/print.jpg",
      "displayImagePath": "path/to/preview.jpg",
      "adjustments": {"brightness": 100, "contrast": 100},
      "zoom": 1.0,
      "position": {"x": 0, "y": 0}
    }
  ],
  "totals": {
    "subtotal": 1500,
    "shipping": 100,
    "total": 1600
  }
}
```

## Troubleshooting

### Common Issues

1. **Server won't start**
   - Check if port 3001 is available
   - Ensure all dependencies are installed
   - Verify Node.js is installed

2. **Orders not displaying**
   - Check if orders folder exists
   - Verify backend server is running
   - Check browser console for errors

3. **Images not downloading**
   - Ensure archiver package is installed
   - Check file permissions
   - Verify image paths in order data

4. **Filters not working**
   - Refresh the page
   - Check browser console for JavaScript errors
   - Ensure backend API is responding

### Getting Help
- Check the browser console for error messages
- Verify backend server logs
- Ensure all required npm packages are installed

## Security Notes

- This admin panel is designed for local/internal use
- For production deployment, add proper authentication
- Consider adding HTTPS for sensitive data
- Implement proper user access controls

---

## Order Processing Best Practices

1. **Regular Status Updates**: Keep customers informed by updating order statuses
2. **Download Management**: Organize downloaded images in folders by date
3. **Quality Control**: Review images before marking orders as completed
4. **Customer Communication**: Use order details for customer follow-up
5. **Data Backup**: Regularly backup order data and images

Enjoy managing your photo framing orders efficiently! 📸🖼️
