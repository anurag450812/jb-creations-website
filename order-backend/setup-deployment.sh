#!/bin/bash

# JB Creations Backend Deployment Setup Script
# This script automates the deployment process for your backend server

set -e  # Exit on any error

echo "🚀 JB Creations Backend Deployment Setup"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    print_error "This script must be run from the order-backend directory"
    exit 1
fi

print_info "Starting deployment setup..."

# Step 1: Install dependencies
print_info "Installing dependencies..."
if command -v npm &> /dev/null; then
    npm install
    print_status "Dependencies installed successfully"
else
    print_error "npm not found. Please install Node.js and npm first."
    exit 1
fi

# Step 2: Create necessary directories
print_info "Creating necessary directories..."
mkdir -p images orders logs backups
print_status "Directories created"

# Step 3: Check for environment file
if [ ! -f ".env" ]; then
    print_warning "No .env file found. Creating from example..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        print_info "Please edit the .env file with your actual configuration values"
    else
        print_warning "No .env.example found. You'll need to create .env manually"
    fi
fi

# Step 4: Generate JWT secret if not set
print_info "Checking JWT secret..."
if ! grep -q "JWT_SECRET=" .env 2>/dev/null || grep -q "JWT_SECRET=your-super-secret" .env 2>/dev/null; then
    print_warning "Generating new JWT secret..."
    JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
    if [ -f ".env" ]; then
        # Update existing .env file
        sed -i.bak "s/JWT_SECRET=.*/JWT_SECRET=$JWT_SECRET/" .env
        rm .env.bak 2>/dev/null || true
    else
        # Create new .env file
        echo "JWT_SECRET=$JWT_SECRET" > .env
    fi
    print_status "JWT secret generated and saved"
fi

# Step 5: Run database migrations
print_info "Running database migrations..."
if node scripts/migrate-database.js migrate; then
    print_status "Database migrations completed"
else
    print_warning "Database migrations failed or not available"
fi

# Step 6: Create initial backup
print_info "Creating initial database backup..."
if node scripts/enhanced-backup.js create initial-setup; then
    print_status "Initial backup created"
else
    print_warning "Backup creation failed or not available"
fi

# Step 7: Test server startup
print_info "Testing server startup..."
timeout 10s node auth-server-production.js > /dev/null 2>&1 &
SERVER_PID=$!
sleep 3

if kill -0 $SERVER_PID 2>/dev/null; then
    print_status "Server startup test successful"
    kill $SERVER_PID 2>/dev/null || true
else
    print_warning "Server startup test failed - check your configuration"
fi

# Step 8: Display deployment instructions
echo ""
print_info "Setup completed! Next steps:"
echo ""
echo "1. Edit your .env file with actual values:"
echo "   - EMAIL_USER and EMAIL_PASS for email notifications"
echo "   - MSG91_API_KEY for SMS notifications"
echo "   - RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET for payments"
echo "   - CORS_ORIGIN with your Netlify URL"
echo ""
echo "2. Choose a deployment platform:"
echo "   🚀 Railway (Recommended): railway.app"
echo "   🌐 Heroku: heroku.com"
echo "   🔹 Render: render.com"
echo "   🌊 DigitalOcean: digitalocean.com"
echo ""
echo "3. Deploy your backend:"
echo "   - Connect your GitHub repository"
echo "   - Set environment variables in the platform"
echo "   - Deploy from the order-backend folder"
echo ""
echo "4. Update your frontend:"
echo "   - Edit api-client.js with your backend URL"
echo "   - Redeploy your Netlify site"
echo ""
echo "5. Test your deployment:"
echo "   - Visit your-backend-url/health"
echo "   - Test user registration and order creation"
echo "   - Access admin panel at your-backend-url/admin"
echo ""
print_status "Deployment setup complete! 🎉"
echo ""
echo "📖 For detailed instructions, see DEPLOYMENT.md"
echo "❓ Need help? Check the troubleshooting section in the deployment guide"