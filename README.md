# Shumilog - Hobby Content Log Service

A web application for logging and tracking hobby content consumption with social sharing features.

## 🚀 Quick Start with Cloudflare D1

The fastest way to get started is using Cloudflare Wrangler for local development:

```bash
# Clone the repository
git clone <repository-url>
cd shumilog

# Install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Install Wrangler globally (if not already installed)
npm install -g wrangler

# Start the backend with D1 database
cd backend
npx wrangler d1 migrations apply shumilog-db-dev --local --env development
npx wrangler dev --env development

# In another terminal, start the frontend
cd frontend
npm run dev

# Access the application
# Frontend: http://localhost:5173
# Backend API: http://localhost:8787
# Health Check: http://localhost:8787/health
```

That's it! The application will be running with:
- ✅ Auto-reloading backend and frontend using Wrangler dev
- ✅ Local D1 database with persistent storage
- ✅ Hot module replacement for rapid development
- ✅ Production-compatible D1 database environment
- ✅ Health monitoring and logging

## 📋 Prerequisites

- **Node.js** (18+) and **npm**
- **Wrangler CLI** (for Cloudflare D1 local development)
- **Twitter Developer Account** (for OAuth integration)
- **Cloudflare Account** (for D1 database and Workers deployment)

## 🏗️ Architecture

### Services Overview

| Service | Port | Purpose | Framework |
|---------|------|---------|-----------|
| **Frontend** | 5173 | Web interface | Vite + TypeScript |
| **Backend** | 8787 | REST API | Hono + TypeScript |
| **Database** | - | Data storage | SQLite (D1 compatible) |

### Technology Stack

- **Backend**: TypeScript, Hono framework, Cloudflare Workers compatible
- **Frontend**: TypeScript, Vite, HTML5/CSS3
- **Database**: SQLite (Cloudflare D1 compatible)
- **Development**: Docker Compose, hot-reload, health monitoring
- **Testing**: Vitest, contract testing, integration testing

## 🛠️ Development

### Docker Development (Recommended)

```bash
# First time setup: Install dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Start all services (build images first time)
docker-compose up --build

# Start in background
docker-compose up --build -d

# View logs
docker-compose logs -f

# Stop services
docker-compose down
```

### Native Development

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start backend
cd backend && npm run dev

# Start frontend (in another terminal)
cd frontend && npm run dev
```

### Testing

```bash
# Run all tests
docker-compose exec backend npm test

# Run tests with coverage
docker-compose exec backend npm run test:coverage

# Run specific test
docker-compose exec backend npm test -- tests/contract/health.test.ts
```

## 📖 Documentation

- **[Docker Development Guide](docs/docker-development.md)** - Comprehensive setup and usage
- **[API Documentation](docs/api.md)** - REST API endpoints and contracts
- **[Database Schema](backend/src/db/schema.sql.ts)** - Data model documentation
- **[Testing Guide](backend/tests/README.md)** - Testing strategies and examples

## 🔧 Configuration

### Environment Variables

Key configuration options (see `.env.example`):

```bash
# Service Ports
API_PORT=8787
FRONTEND_PORT=5173

# Database
DATABASE_URL=file:/data/shumilog.db

# Development Features
ENABLE_HOT_RELOAD=true
ENABLE_DEBUG_LOGS=true
ENABLE_DEV_ENDPOINTS=true
```

### Development APIs

Available in development mode at `http://localhost:8787/dev/`:

- `GET /dev/config` - View current configuration
- `GET /dev/logs` - Application logs
- `POST /dev/reload` - Trigger service reload

## 🏥 Health Monitoring

- **Application Health**: `GET /health`
- **Service Status**: `docker-compose ps`
- **Logs**: `docker-compose logs [service]`

## 🤝 Contributing

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Start development environment**: `docker-compose up`
4. **Make your changes** with hot-reload feedback
5. **Run tests**: `docker-compose exec backend npm test`
6. **Commit changes**: `git commit -m 'Add amazing feature'`
7. **Push to branch**: `git push origin feature/amazing-feature`
8. **Open a Pull Request**

### Development Workflow

1. **Code Changes**: Edit files in `backend/src/` or `frontend/src/`
2. **Auto-Reload**: Services restart/reload automatically
3. **Test**: Run `npm test` to verify changes
4. **Debug**: Use dev endpoints and health checks
5. **Commit**: Push changes when tests pass

## 📚 Project Structure

```
shumilog/
├── backend/                 # API server (Hono + TypeScript)
│   ├── src/
│   │   ├── routes/         # API endpoints
│   │   ├── services/       # Business logic
│   │   ├── models/         # Data models
│   │   └── db/            # Database layer
│   └── tests/             # Test suites
├── frontend/              # Web interface (Vite + TypeScript)
│   └── src/
│       ├── pages/         # HTML pages
│       └── styles/        # CSS styles
├── docs/                  # Documentation
├── docker-compose.yml     # Development orchestration
└── .env.example          # Environment template
```

## 🐛 Troubleshooting

### Common Issues

**Dependencies not synced:**
```bash
# Install dependencies first
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
docker-compose up --build
```

**Port conflicts:**
```bash
# Change ports in .env file
echo "API_PORT=8788" >> .env
```

**Database issues:**
```bash
# Reset database
docker-compose down -v && docker-compose up --build
```

**Build failures:**
```bash
# Clean rebuild with dependencies
cd backend && npm install && cd ..
cd frontend && npm install && cd ..
docker-compose build --no-cache
docker-compose up
```

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🔗 Links

- **Repository**: [GitHub](https://github.com/your-org/shumilog)
- **Issues**: [GitHub Issues](https://github.com/your-org/shumilog/issues)
- **Documentation**: [docs/](docs/)

---

**Happy coding! 🎉**

For detailed setup instructions, see the [Docker Development Guide](docs/docker-development.md).