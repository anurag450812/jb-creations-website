FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Install canvas dependencies for Alpine Linux
RUN apk add --no-cache \
    cairo-dev \
    pango-dev \
    jpeg-dev \
    gif-dev \
    librsvg-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev

# Copy application files
COPY . .

# Create necessary directories
RUN mkdir -p images orders logs backups

# Set proper permissions
RUN chown -R node:node /app
USER node

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["npm", "start"]