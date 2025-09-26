# Multi-stage build for optimization
FROM node:18-alpine AS base

# Install system dependencies and clean cache
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

# Install dependencies and clean npm cache
RUN npm ci --include=dev \
    && npm cache clean --force

# Copy source code
COPY . .

# Expose the port for Vite dev server
EXPOSE 5173

# Set environment variables for development
ENV NODE_ENV=development
ENV VITE_API_URL=http://backend:8787

# Health check for Vite dev server
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5173 || exit 1

# Development command with hot-reload and host binding
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]