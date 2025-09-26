# Docker Compose Development Environment

This document provides comprehensive instructions for setting up and using the Docker Compose development environment for the Shumilog project.

## Quick Start

1. **Prerequisites**
   - Docker and Docker Compose installed
   - Git repository cloned
   - Environment variables configured

2. **Setup**
   ```bash
   # Clone and navigate to project
   git clone <repository-url>
   cd shumilog

   # Copy environment template (optional customization)
   cp .env.example .env

   # Start all services
   docker-compose up
   ```

3. **Access**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:8787
   - Health Check: http://localhost:8787/health
   - Dev APIs: http://localhost:8787/dev/*

## Architecture Overview

### Services

#### Database Service (`database`)
- **Image**: Alpine Linux with SQLite
- **Purpose**: Provides SQLite database compatible with Cloudflare D1
- **Volume**: Persistent data storage at `/data/shumilog.db`
- **Health Check**: Database connectivity verification
- **Network Aliases**: `db`, `shumilog-db`

#### Backend Service (`backend`)
- **Build**: Node.js 18 Alpine with TypeScript support
- **Purpose**: Hono-based API server with hot-reload
- **Port**: 8787 (configurable via API_PORT)
- **Features**: Nodemon hot-reload, development APIs, health monitoring
- **Dependencies**: Waits for database health check
- **Network Aliases**: `api`, `shumilog-api`

#### Frontend Service (`frontend`)
- **Build**: Node.js 18 Alpine with Vite
- **Purpose**: Development frontend with hot module replacement
- **Port**: 5173 (configurable via FRONTEND_PORT)
- **Features**: Vite HMR, file watching, development server
- **Dependencies**: Waits for backend health check
- **Network Aliases**: `web`, `shumilog-web`

### Networking

- **Default Network**: `shumilog_network` (bridge driver)
- **Service Discovery**: Each service accessible by name and aliases
- **Internal Communication**: Services can communicate using container names
- **External Access**: Frontend and backend expose ports to host

### Volumes

- **Database Data**: `shumilog_db_data` - Persistent SQLite database
- **Backend Modules**: `shumilog_backend_node_modules` - Node.js dependencies
- **Frontend Modules**: `shumilog_frontend_node_modules` - Node.js dependencies
- **Source Code**: Hot-reload enabled bind mounts

## Environment Configuration

### Core Variables

```bash
# Service Ports
API_PORT=8787                    # Backend API port
FRONTEND_PORT=5173               # Frontend development server port

# Database
DATABASE_URL=file:/data/shumilog.db  # SQLite database path
DB_PATH=/data/shumilog.db            # Database file location

# Development Settings
NODE_ENV=development             # Environment mode
LOG_LEVEL=debug                  # Logging verbosity
ENABLE_HOT_RELOAD=true          # Hot-reload feature flag
ENABLE_DEBUG_LOGS=true          # Debug logging
ENABLE_DEV_ENDPOINTS=true       # Development API endpoints

# CORS Configuration
CORS_ORIGIN=http://localhost:5173,http://frontend:5173  # Allowed origins
```

### Service Discovery

Services can communicate internally using these hostnames:
- Database: `database`, `db`, `shumilog-db`
- Backend: `backend`, `api`, `shumilog-api`
- Frontend: `frontend`, `web`, `shumilog-web`

## Development Workflow

### Starting the Environment

```bash
# Start all services (detached)
docker-compose up -d

# Start with logs visible
docker-compose up

# Start specific service
docker-compose up backend

# Rebuild and start
docker-compose up --build
```

### Monitoring Services

```bash
# Check service status
docker-compose ps

# View logs from all services
docker-compose logs

# View logs from specific service
docker-compose logs backend
docker-compose logs -f frontend  # Follow logs

# Check health status
curl http://localhost:8787/health
```

### Development Features

#### Hot Reload
- **Backend**: Nodemon watches TypeScript files and restarts automatically
- **Frontend**: Vite HMR updates browser without page refresh
- **Database**: Schema changes require service restart

#### Development APIs
Available at `http://localhost:8787/dev/` (only in development mode):

- `GET /dev/config` - View current configuration
- `GET /dev/logs` - View application logs
- `POST /dev/reload` - Trigger service reload

#### Health Monitoring
- `GET /health` - Overall system health
- Docker health checks with automatic restart policies
- Service dependency management with health conditions

### Making Code Changes

1. **Backend Changes**
   ```bash
   # Edit files in backend/src/
   # Nodemon automatically restarts the server
   # Check logs: docker-compose logs backend
   ```

2. **Frontend Changes**
   ```bash
   # Edit files in frontend/src/
   # Vite HMR updates browser automatically
   # Check logs: docker-compose logs frontend
   ```

3. **Database Changes**
   ```bash
   # Edit schema in backend/src/db/schema.sql.ts
   # Restart database service:
   docker-compose restart database backend
   ```

### Testing

```bash
# Run backend tests
docker-compose exec backend npm test

# Run tests with coverage
docker-compose exec backend npm run test:coverage

# Run specific test file
docker-compose exec backend npm test -- tests/contract/health.test.ts
```

### Troubleshooting

#### Common Issues

1. **Port Already in Use**
   ```bash
   # Check what's using the port
   lsof -i :8787
   # Change port in .env file
   echo "API_PORT=8788" >> .env
   ```

2. **Database Connection Issues**
   ```bash
   # Check database health
   docker-compose exec database sqlite3 /data/shumilog.db "SELECT 1"
   # Reset database
   docker-compose down -v && docker-compose up
   ```

3. **Hot Reload Not Working**
   ```bash
   # Check file watching
   docker-compose logs backend | grep "watching"
   # Restart service
   docker-compose restart backend
   ```

4. **Build Failures**
   ```bash
   # Clean build
   docker-compose down
   docker-compose build --no-cache
   docker-compose up
   ```

#### Service Status

```bash
# Check individual service health
docker-compose exec backend curl -f http://localhost:8787/health
docker-compose exec frontend curl -f http://localhost:5173

# Check database
docker-compose exec database sqlite3 /data/shumilog.db ".tables"

# View service configuration
docker-compose exec backend curl http://localhost:8787/dev/config
```

### Stopping the Environment

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (data loss!)
docker-compose down -v

# Stop and remove images
docker-compose down --rmi all
```

## Advanced Configuration

### Custom Environment Files

Create environment-specific configurations:

```bash
# Development
cp .env.example .env.development

# Local testing
cp .env.example .env.local

# Use specific env file
docker-compose --env-file .env.local up
```

### Override Files

Create `docker-compose.override.yml` for local customizations:

```yaml
version: '3.8'
services:
  backend:
    environment:
      - DEBUG=true
    ports:
      - "9229:9229"  # Node.js debugging
```

### Volume Management

```bash
# List volumes
docker volume ls | grep shumilog

# Backup database
docker run --rm -v shumilog_db_data:/data alpine tar czf - /data > backup.tar.gz

# Restore database
cat backup.tar.gz | docker run --rm -i -v shumilog_db_data:/data alpine tar xzf - -C /
```

## VSCode Integration

The project includes a `.devcontainer` configuration for VSCode:

1. Install the "Remote-Containers" extension
2. Open project in VSCode
3. Click "Reopen in Container" when prompted
4. Development environment automatically configured

## Production Considerations

This Docker Compose setup is optimized for development. For production:

- Use production-grade database (PostgreSQL, etc.)
- Implement proper secrets management
- Configure reverse proxy (nginx, Traefik)
- Set up monitoring and logging
- Use multi-stage builds for smaller images
- Implement proper backup strategies

## Performance Tips

1. **Use .dockerignore** - Exclude unnecessary files from build context
2. **Layer Caching** - Order Dockerfile commands for optimal caching
3. **Volume Types** - Use named volumes for persistence, bind mounts for development
4. **Resource Limits** - Set memory and CPU limits in production
5. **Health Checks** - Configure appropriate intervals and timeouts

---

For more information, see:
- [Backend API Documentation](../docs/api.md)
- [Frontend Development Guide](frontend/README.md)
- [Database Schema](backend/src/db/schema.sql.ts)
- [Testing Guide](backend/tests/README.md)