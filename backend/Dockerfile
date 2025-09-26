# Use Node.js 18 LTS Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for SQLite and other tools
RUN apk add --no-cache \
    sqlite \
    curl \
    bash

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --include=dev

# Install nodemon globally for hot-reload in development
RUN npm install -g nodemon

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p /data

# Expose the port
EXPOSE 8787

# Set environment variables
ENV NODE_ENV=development
ENV LOG_LEVEL=debug
ENV API_PORT=8787

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8787/health || exit 1

# Development command with hot-reload
CMD ["npm", "run", "dev"]