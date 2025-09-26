# Multi-stage build for optimization
FROM node:18-alpine AS base

# Install system dependencies
RUN apk add --no-cache \
    curl \
    bash \
    && rm -rf /var/cache/apk/*

# Set working directory
WORKDIR /app

# Development stage
FROM base AS development

# Copy package files for better layer caching
COPY package*.json ./

# Install all dependencies including dev dependencies
RUN npm ci --include=dev \
    && npm cache clean --force

# Install nodemon globally for hot-reload
RUN npm install -g nodemon@3.0.0 \
    && npm cache clean --force

# Copy source code
COPY . .

# Create necessary directories
RUN mkdir -p /data

# Expose the port
EXPOSE 8787

# Set environment variables for development
ENV NODE_ENV=development
ENV LOG_LEVEL=debug
ENV API_PORT=8787

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8787/health || exit 1

# Development command with hot-reload
CMD ["npm", "run", "dev"]