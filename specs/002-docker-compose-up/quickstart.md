# Quickstart: Docker Compose Development Environment

## Prerequisites

### Required Software
- Docker Desktop 4.0+ or Docker Engine 20.0+
- Docker Compose V2 (included with Docker Desktop)
- Git 2.30+
- VSCode 1.70+ (recommended for devcontainer support)

### System Requirements
- 4GB RAM minimum (8GB recommended)
- 10GB free disk space
- Linux, macOS, or Windows with WSL2

## Quick Start

### 1. Clone and Setup
```bash
# Clone the repository
git clone <repository-url>
cd shumilog

# Switch to feature branch
git checkout 002-docker-compose-up

# Verify Docker is running
docker --version
docker compose version
```

### 2. Start Development Environment
```bash
# Start all services
docker compose up

# Or start in background
docker compose up -d

# Follow logs (if running in background)
docker compose logs -f
```

### 3. Verify Services
```bash
# Check service status
docker compose ps

# Test backend API
curl http://localhost:8787/health

# Test frontend (open in browser)
open http://localhost:5173
```

### 4. Development Workflow
```bash
# Make code changes - they auto-reload
# - Backend: Edit files in ./backend/src/
# - Frontend: Edit files in ./frontend/src/

# Run tests
docker compose exec backend npm test
docker compose exec frontend npm test

# View service logs
docker compose logs backend
docker compose logs frontend
docker compose logs database

# Restart specific service
docker compose restart backend

# Stop all services
docker compose down

# Stop and remove volumes (clean slate)
docker compose down -v
```

## VSCode Devcontainer Setup

### 1. Install Extensions
```bash
# Required VSCode extensions
code --install-extension ms-vscode-remote.remote-containers
```

### 2. Open in Container
```bash
# Option 1: Command palette
# Ctrl+Shift+P → "Dev Containers: Open Folder in Container"

# Option 2: VSCode will prompt automatically
# When opening the project folder
```

### 3. Container Development
```bash
# VSCode opens inside backend container
# Terminal runs inside container environment
# All tools and dependencies available
# File changes sync automatically
```

## Service Details

### Backend (Port 8787)
- **URL**: http://localhost:8787
- **Health Check**: http://localhost:8787/health  
- **Hot Reload**: File changes in `./backend/src/` trigger restart
- **Tests**: `docker compose exec backend npm test`
- **Logs**: `docker compose logs backend`

### Frontend (Port 5173)
- **URL**: http://localhost:5173
- **Hot Reload**: File changes in `./frontend/src/` update browser
- **Tests**: `docker compose exec frontend npm test`
- **Build**: `docker compose exec frontend npm run build`
- **Logs**: `docker compose logs frontend`

### Database (SQLite)
- **Type**: SQLite (compatible with Cloudflare D1)
- **Location**: `/data/shumilog.db` inside container
- **Volume**: `db_data` (persistent across restarts)
- **Seeding**: Automatic on first startup
- **Access**: Through backend API or direct file access

## Common Tasks

### Database Operations
```bash
# View database schema
docker compose exec database sqlite3 /data/shumilog.db ".schema"

# Query data
docker compose exec database sqlite3 /data/shumilog.db "SELECT * FROM users LIMIT 5;"

# Reset database (removes all data)
docker compose down -v
docker compose up -d
```

### Testing
```bash
# Run all backend tests
docker compose exec backend npm test

# Run backend tests in watch mode
docker compose exec backend npm run test:watch

# Run integration tests
docker compose exec backend npm run test:integration

# Run frontend tests
docker compose exec frontend npm test
```

### Development Tools
```bash
# Format code
docker compose exec backend npm run format
docker compose exec frontend npm run format

# Lint code
docker compose exec backend npm run lint
docker compose exec frontend npm run lint

# Type checking
docker compose exec backend npm run build
docker compose exec frontend npm run build
```

## Troubleshooting

### Service Won't Start
```bash
# Check service status
docker compose ps

# View service logs
docker compose logs [service-name]

# Restart specific service
docker compose restart [service-name]

# Full restart
docker compose down
docker compose up
```

### Port Conflicts
```bash
# Check what's using the port
netstat -tlnp | grep :8787

# Kill process using port
sudo kill -9 [process-id]

# Or use different ports
# Edit docker-compose.override.yml:
version: '3.8'
services:
  backend:
    ports:
      - "8788:8787"
```

### Volume Permission Issues
```bash
# Fix file permissions
sudo chown -R $USER:$USER ./backend ./frontend

# Or rebuild containers
docker compose down
docker compose build --no-cache
docker compose up
```

### Database Issues
```bash
# Reset database
docker compose down -v
docker volume rm shumilog_db_data
docker compose up -d

# Check database logs
docker compose logs database

# Manual database inspection
docker compose exec database sqlite3 /data/shumilog.db
```

### Slow Performance
```bash
# Check resource usage
docker stats

# Prune unused resources
docker system prune

# Increase Docker memory (Docker Desktop)
# Settings → Resources → Memory → 4GB+
```

## Testing the Complete Workflow

### 1. User Authentication Flow
```bash
# Start services
docker compose up -d

# Navigate to frontend
open http://localhost:5173

# Test login flow (should work end-to-end)
# 1. Click login
# 2. Authenticate with Twitter
# 3. Return to dashboard
# 4. See user profile data
```

### 2. Content Logging Flow
```bash
# From authenticated dashboard
# 1. Click "Add Log Entry"
# 2. Fill out form
# 3. Add tags
# 4. Submit
# 5. See new entry in list
```

### 3. Database Persistence Test
```bash
# Add some data through UI
# Stop containers
docker compose down

# Restart containers
docker compose up -d

# Verify data persists
# Check logs are still visible in UI
```

### 4. Hot Reload Test
```bash
# Edit backend file
echo "console.log('Hot reload test');" >> ./backend/src/index.ts

# Check logs
docker compose logs backend
# Should show restart and new log message

# Edit frontend file
# Change text in ./frontend/src/pages/dashboard.html
# Browser should update automatically
```

## Performance Expectations

### Startup Times
- Initial build: 2-5 minutes
- Subsequent starts: 30-60 seconds
- Service restarts: 5-10 seconds

### Development Experience
- Backend hot reload: 3-5 seconds
- Frontend hot reload: 1-2 seconds
- Test execution: 10-30 seconds
- Database queries: < 100ms

## Success Criteria Validation

✅ **Single Command Setup**: `docker compose up` starts everything  
✅ **Hot Reloading**: Code changes reflect automatically  
✅ **Database Persistence**: Data survives container restarts  
✅ **Full Workflow Testing**: Authentication, logging, tags work end-to-end  
✅ **Development Tools**: Linting, testing, debugging all available  
✅ **Clear Documentation**: All common tasks documented with commands  

## Next Steps

After completing this quickstart:
1. Continue development using the containerized environment
2. Run full test suite to verify functionality
3. Deploy to staging/production using existing CI/CD
4. Document any environment-specific configurations