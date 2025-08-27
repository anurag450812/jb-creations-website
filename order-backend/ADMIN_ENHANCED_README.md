# JB Creations Enhanced Admin Panel

The enhanced admin panel provides a modern, comprehensive interface for managing photo framing orders with advanced features like data visualization, bulk operations, and improved order tracking.

## Features

### 🎯 Dashboard Overview
- Real-time order statistics with visual charts
- Revenue tracking and trends
- Customer metrics (registered vs guest)
- Status distribution visualization

### 📊 Advanced Order Management
- Comprehensive order listing with filtering
- Search by order number, customer name, or email
- Sort by date, amount, or status
- Pagination for large datasets
- Bulk operations (status updates, downloads)

### 🔍 Filtering & Search
- Filter by order status (pending, processing, shipped, delivered, completed)
- Filter by customer type (registered vs guest)
- Date range filtering
- Real-time search functionality

### 📦 Order Details
- Complete order information display
- Customer details and delivery information
- Item specifications and quantities
- Order timeline and status history

### 💾 Data Export & Download
- Export orders to CSV format
- Download individual order images
- Bulk download images for multiple orders
- ZIP archive creation for efficient transfers

### 📱 Responsive Design
- Mobile-friendly interface
- Desktop-optimized layouts
- Touch-friendly controls
- Accessible navigation

## Setup Instructions

### Prerequisites
- Node.js 14+ installed
- NPM or Yarn package manager
- JB Creations photo framing website

### Installation

1. **Navigate to the order-backend directory:**
   ```bash
   cd order-backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the enhanced admin server:**
   ```bash
   # Using NPM script
   npm run admin
   
   # Or using the batch file (Windows)
   start-admin.bat
   
   # Or directly
   node admin-server.js
   ```

4. **Access the admin panel:**
   - Enhanced Admin Panel: http://localhost:3001/admin
   - Legacy Admin Panel: http://localhost:3001/admin-legacy
   - API Health Check: http://localhost:3001/api/health

## API Endpoints

### Order Management
- `GET /api/orders` - Get all orders with filtering and pagination
- `GET /api/orders/:orderNumber` - Get specific order details
- `PATCH /api/orders/:orderNumber/status` - Update order status
- `PATCH /api/orders/bulk/status` - Bulk update order statuses
- `DELETE /api/orders/:orderNumber` - Delete order (admin only)

### File Operations
- `GET /api/orders/:orderNumber/images` - Download order images as ZIP
- `POST /api/orders/bulk/images` - Bulk download images for multiple orders

### Analytics & Export
- `GET /api/stats` - Get order statistics and analytics
- `GET /api/orders/export/csv` - Export orders as CSV file

### System
- `GET /api/health` - API health check
- `POST /api/orders` - Submit new order (from website)

## Query Parameters

### Order Filtering (`/api/orders`)
- `status` - Filter by order status
- `customerType` - Filter by customer type (guest/registered)
- `dateFrom` - Start date for date range filter
- `dateTo` - End date for date range filter
- `search` - Search term for order number, customer name, or email
- `sortBy` - Sort orders (date_asc, date_desc, amount_asc, amount_desc, status)
- `limit` - Number of orders per page
- `offset` - Starting position for pagination

Example:
```
GET /api/orders?status=pending&customerType=guest&limit=20&offset=0
```

## Configuration

### Environment Variables
Create a `.env` file in the order-backend directory:

```env
PORT=3001
NODE_ENV=production

# Email Configuration (for order confirmations)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
```

### Directory Structure
```
order-backend/
├── admin-server.js          # Enhanced admin server
├── admin-enhanced.html      # Enhanced admin panel
├── admin.html              # Legacy admin panel
├── order-receiver.js       # Original order processing server
├── package.json            # Dependencies and scripts
├── start-admin.bat         # Windows startup script
├── .env                    # Environment configuration
├── orders/                 # Order JSON files
│   ├── ORD20241201001.json
│   └── ...
└── images/                 # Order images
    ├── ORD20241201001/
    │   ├── item_1_print.jpg
    │   ├── item_1_display.jpg
    │   └── item_1_original.jpg
    └── ...
```

## Usage Examples

### Starting the Server
```bash
# Development mode with auto-restart
npm run admin-dev

# Production mode
npm run admin

# Using batch file (Windows)
start-admin.bat
```

### Bulk Operations
1. Select multiple orders using checkboxes
2. Choose bulk action (update status, download images)
3. Confirm the operation
4. Monitor progress in the notification system

### Filtering Orders
1. Use the filter panel on the left side
2. Select status, customer type, date ranges
3. Use the search bar for specific orders
4. Results update automatically

### Exporting Data
1. Click "Export CSV" button
2. File downloads automatically with current date
3. Contains all filtered orders in spreadsheet format

## Troubleshooting

### Common Issues

**Server won't start:**
- Check if port 3001 is available
- Verify Node.js installation
- Run `npm install` to ensure dependencies are installed

**Orders not loading:**
- Check if `orders/` directory exists and has read permissions
- Verify order JSON files are valid
- Check browser console for JavaScript errors

**Images not downloading:**
- Ensure `images/` directory exists
- Check if archiver dependency is installed
- Verify sufficient disk space for ZIP creation

**Charts not displaying:**
- Check internet connection (Chart.js loads from CDN)
- Verify browser JavaScript is enabled
- Clear browser cache and reload

### Performance Optimization

**For large datasets:**
- Use pagination (limit parameter)
- Filter by date ranges to reduce data load
- Consider database migration for 1000+ orders

**Memory usage:**
- Regular cleanup of old order files
- Compress or archive old images
- Monitor server memory with large image downloads

## Development

### Adding New Features

1. **New API endpoints:** Add to `admin-server.js`
2. **UI components:** Modify `admin-enhanced.html`
3. **Styling:** Update CSS in the `<style>` section
4. **JavaScript:** Add functions in the `<script>` section

### Testing

```bash
# Test API health
curl http://localhost:3001/api/health

# Test order listing
curl http://localhost:3001/api/orders

# Test statistics
curl http://localhost:3001/api/stats
```

## Security Considerations

- **Admin access:** No authentication implemented - add authentication for production
- **File access:** Server only serves files from designated directories
- **Input validation:** API validates required fields and data types
- **Error handling:** Sensitive information not exposed in error messages

## Support

For technical support or feature requests, contact the development team or refer to the main project documentation.

## Version History

- **v2.0.0** - Enhanced admin panel with Chart.js integration
- **v1.1.0** - Added bulk operations and CSV export
- **v1.0.0** - Initial admin panel implementation
