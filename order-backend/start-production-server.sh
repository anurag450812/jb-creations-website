#!/bin/bash
# JB Creations Production Auth Server - Linux/Mac Startup Script

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "========================================="
echo "  JB Creations Production Auth Server   "
echo "========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

echo -e "${GREEN}✅ Node.js is installed$(NC)"

# Check if production environment file exists
if [ ! -f ".env.production" ]; then
    echo -e "${YELLOW}⚠️  No .env.production file found${NC}"
    echo "Please create .env.production with your production settings"
    echo "Use .env.production.example as a template"
    exit 1
fi

# Install production dependencies if needed
if [ ! -d "node_modules" ]; then
    echo -e "${BLUE}📦 Installing dependencies...${NC}"
    npm install
    if [ $? -ne 0 ]; then
        echo -e "${RED}❌ Failed to install dependencies${NC}"
        exit 1
    fi
fi

# Install additional production dependencies
echo -e "${BLUE}📦 Installing production security packages...${NC}"
npm install helmet express-rate-limit morgan compression winston twilio pm2
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to install production dependencies${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Dependencies installed successfully${NC}"

# Copy production environment
cp .env.production .env

echo ""
echo -e "${GREEN}🔒 Starting JB Creations Auth Server in PRODUCTION MODE...${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT: Make sure you have:${NC}"
echo -e "${GREEN}✅ Set a strong JWT_SECRET in .env.production${NC}"
echo -e "${GREEN}✅ Configured SMS service (Twilio/MSG91)${NC}"
echo -e "${GREEN}✅ Set up proper CORS origins${NC}"
echo -e "${GREEN}✅ Configured SSL certificates (if using HTTPS)${NC}"
echo ""
echo -e "${BLUE}Server will be available at: http://localhost:3001${NC}"
echo -e "${BLUE}Health check: http://localhost:3001/health${NC}"
echo -e "${BLUE}Admin panel: http://localhost:3001/api/admin/users${NC}"
echo ""
echo -e "${YELLOW}Press Ctrl+C to stop the server${NC}"
echo ""

# Start the production auth server
export NODE_ENV=production
node auth-server-production.js