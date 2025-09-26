# Docker Compose Configuration Contract

## docker-compose.yml Structure

```yaml
version: '3.8'

services:
  # Required services
  backend:
    # Build or image specification
    build: ./backend
    # Port mapping (required)
    ports:
      - "8787:8787"
    # Volume mounts (required)
    volumes:
      - ./backend:/app
      - backend_node_modules:/app/node_modules
    # Environment configuration
    environment:
      - NODE_ENV=development
    # Health check (required)
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8787/health"]
      interval: 30s
      timeout: 10s
      retries: 3
    # Dependencies
    depends_on:
      database:
        condition: service_healthy

  frontend:
    build: ./frontend
    ports:
      - "5173:5173"
    volumes:
      - ./frontend:/app
      - frontend_node_modules:/app/node_modules
    environment:
      - NODE_ENV=development
      - VITE_API_URL=http://backend:8787
    depends_on:
      - backend

  database:
    image: sqlite:latest  # Or appropriate SQLite-compatible image
    volumes:
      - db_data:/data
      - ./backend/src/db:/docker-entrypoint-initdb.d
    healthcheck:
      test: ["CMD", "sqlite3", "/data/shumilog.db", "SELECT 1"]
      interval: 30s
      timeout: 10s
      retries: 3

# Required volumes
volumes:
  db_data:
  backend_node_modules:
  frontend_node_modules:

# Optional networks (default network is acceptable)
networks:
  default:
    driver: bridge
```

## devcontainer.json Structure

```json
{
  "name": "Shumilog Development",
  "dockerComposeFile": "docker-compose.yml",
  "service": "backend",
  "workspaceFolder": "/app",
  "customizations": {
    "vscode": {
      "extensions": [
        "ms-vscode.vscode-typescript-next",
        "bradlc.vscode-tailwindcss",
        "ms-vscode.vscode-json"
      ],
      "settings": {
        "typescript.preferences.importModuleSpecifier": "relative"
      }
    }
  },
  "postCreateCommand": "npm install",
  "remoteUser": "node"
}
```

## Environment File Contract (.env)

```bash
# Development environment variables
NODE_ENV=development
LOG_LEVEL=debug

# Database configuration
DATABASE_URL=file:/data/shumilog.db
DB_PATH=/data/shumilog.db

# API configuration
API_PORT=8787
FRONTEND_PORT=5173

# CORS configuration
CORS_ORIGIN=http://localhost:5173

# Development flags
ENABLE_HOT_RELOAD=true
ENABLE_DEBUG_LOGS=true
```

## Health Check Contract

All services must implement health check endpoints that return:

### Successful Response (200)
```json
{
  "status": "healthy",
  "timestamp": "2025-09-26T10:30:00Z",
  "service": "backend|frontend|database",
  "details": {
    "uptime": "300s",
    "connections": "active"
  }
}
```

### Failed Response (503)
```json
{
  "status": "unhealthy",
  "timestamp": "2025-09-26T10:30:00Z",
  "service": "backend|frontend|database",
  "error": "Connection failed",
  "details": {
    "last_success": "2025-09-26T10:25:00Z"
  }
}
```

## Volume Mount Contract

### Source Code Mounts (bind mounts)
- Host: `./backend` → Container: `/app`
- Host: `./frontend` → Container: `/app`
- Requirements: Read/write access, immediate file sync

### Data Persistence (named volumes)
- `db_data`: Database files and initialization
- `backend_node_modules`: Node.js dependencies cache
- `frontend_node_modules`: Frontend dependencies cache

### Configuration Mounts
- Host: `.env` → Container: `/app/.env`
- Host: `./backend/src/db/` → Container: `/docker-entrypoint-initdb.d/`

## Port Assignment Contract

### Reserved Ports
- 8787: Backend API service
- 5173: Frontend development server
- 3306: Database direct access (optional)

### Port Conflict Resolution
If default ports are unavailable:
1. Check for conflicts using `netstat -tlnp`
2. Override in docker-compose.override.yml
3. Update environment variables accordingly
4. Document alternative ports in README

## Service Communication Contract

### Internal Communication
- Services communicate using service names (not localhost)
- Backend URL for frontend: `http://backend:8787`
- Database connection: `database:3306` or SQLite file path

### External Access
- Frontend accessible at: `http://localhost:5173`
- Backend API accessible at: `http://localhost:8787`
- Direct database access: `http://localhost:3306` (if needed)

## Startup Sequence Contract

1. Database service starts
2. Database health check passes
3. Backend service starts
4. Backend connects to database
5. Backend health check passes
6. Frontend service starts
7. All services report healthy

## Hot Reload Contract

### Backend Hot Reload
- File changes in `./backend/src/` trigger automatic restart
- TypeScript compilation happens automatically
- Server restarts with new code within 5 seconds

### Frontend Hot Reload
- File changes in `./frontend/src/` trigger automatic reload
- Browser automatically refreshes or updates modules
- Changes visible within 2 seconds

## Error Handling Contract

### Service Startup Failures
- Services must log clear error messages
- Health checks must provide diagnostic information
- Dependency failures must be clearly indicated

### Runtime Error Recovery
- Transient failures trigger automatic restart
- Permanent failures require manual intervention
- All errors logged with timestamps and context

## Development Workflow Contract

### Initial Setup
1. `docker compose up` starts all services
2. Services initialize and report healthy
3. Frontend accessible in browser
4. Backend API responds to requests

### Development Iteration
1. Developer makes code changes
2. Hot reload triggers automatically
3. Changes visible without manual restart
4. Tests can be run without stopping services

### Cleanup
1. `docker compose down` stops all services
2. Data volumes persist for next session
3. `docker compose down -v` removes all data