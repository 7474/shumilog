# Use Node.js 18 LTS Alpine for smaller image size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apk add --no-cache \
    curl \
    bash

# Copy package files first for better layer caching
COPY package*.json ./

# Install dependencies
RUN npm ci --include=dev

# Copy source code
COPY . .

# Expose the port for Vite dev server
EXPOSE 5173

# Set environment variables
ENV NODE_ENV=development
ENV VITE_API_URL=http://backend:8787

# Health check for Vite dev server
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:5173 || exit 1

# Development command with hot-reload and host binding
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]