# Quickstart: Cloudflare Workers & D1 Deployment Architecture

**Date**: 2025-09-26  
**Feature**: 003-web-cloudflare-cloudflare  
**Prerequisites**: Docker, VS Code, Git

## Overview

This quickstart validates the complete development-to-production workflow for shumilog application using Cloudflare Workers and D1 database. It covers devcontainer setup, local development, and production deployment.

## Quick Validation Steps

### Step 1: DevContainer Setup (5 minutes)

```bash
# 1. Open repository in VS Code
code /path/to/shumilog

# 2. Open in devcontainer (VS Code will prompt)
# OR manually: Ctrl+Shift+P → "Dev Containers: Reopen in Container"

# 3. Verify devcontainer is running
node --version  # Should show 18+
npx wrangler --version  # Should show latest Wrangler version
```

**Expected Result**: DevContainer loads successfully with Node.js 18+ and Wrangler CLI available.

### Step 2: Local Development Environment (10 minutes)

```bash
# 1. Navigate to backend directory
cd /workspace/backend

# 2. Install dependencies
npm install

# 3. Initialize local D1 database
npx wrangler d1 migrations apply shumilog-db-dev --local --env development

# 4. Start development server
npm run dev:wrangler

# 5. Verify health endpoint (in new terminal)
curl http://localhost:8787/health
```

**Expected Result**: 
- Development server starts on port 8787
- Health endpoint returns 200 OK with "healthy" status
- Local D1 database is connected and operational

### Step 3: Development Configuration Verification (3 minutes)

```bash
# 1. Check development configuration
curl http://localhost:8787/dev/config

# 2. Verify migration status
curl -X POST http://localhost:8787/dev/migrate \
  -H "Content-Type: application/json" \
  -d '{"action": "status"}'
```

**Expected Result**:
- Configuration endpoint shows proper bindings and database status
- Migration status shows current schema version and no pending migrations

### Step 4: Hot-Reload Testing (2 minutes)

```bash
# 1. Make a simple change to src/server.ts
# Add a comment or modify a log message

# 2. Save the file

# 3. Verify hot-reload worked
curl http://localhost:8787/health
# Should respond immediately without manual restart
```

**Expected Result**: Changes are reflected immediately without manual server restart.

### Step 5: Production Deployment Preparation (5 minutes)

```bash
# 1. Login to Cloudflare (if not already logged in)
npx wrangler auth login

# 2. Create production D1 database
npx wrangler d1 create shumilog-db-prod

# 3. Update wrangler.toml with actual database ID
# (Copy ID from previous command output)

# 4. Set production secrets
npx wrangler secret put TWITTER_CLIENT_ID --env production
npx wrangler secret put TWITTER_CLIENT_SECRET --env production
npx wrangler secret put SESSION_SECRET --env production
```

**Expected Result**: Cloudflare authentication successful, production database created, secrets configured.

### Step 6: Production Deployment (3 minutes)

```bash
# 1. Apply migrations to production database
npx wrangler d1 migrations apply shumilog-db-prod --env production

# 2. Deploy to Cloudflare Workers
npx wrangler deploy --env production

# 3. Verify production deployment
curl https://shumilog-backend-prod.your-subdomain.workers.dev/health
```

**Expected Result**: 
- Application deploys successfully to Cloudflare Workers
- Production health endpoint returns 200 OK
- Database operations work in production environment

### Step 7: End-to-End Workflow Validation (5 minutes)

```bash
# 1. Make a code change locally
echo "// Workflow test change" >> src/server.ts

# 2. Test locally
curl http://localhost:8787/health

# 3. Commit change
git add .
git commit -m "test: workflow validation change"

# 4. Deploy to production
npx wrangler deploy --env production

# 5. Verify production update
curl https://shumilog-backend-prod.your-subdomain.workers.dev/health
```

**Expected Result**: Complete development-to-production workflow executes successfully.

## Validation Checklist

### Local Development Environment
- [ ] DevContainer starts successfully with all required tools
- [ ] Local D1 database initializes and connects
- [ ] Wrangler dev server starts on port 8787
- [ ] Health endpoint responds with 200 OK
- [ ] Development configuration endpoint works
- [ ] Migration management endpoint functions correctly
- [ ] Hot-reload responds to code changes within 2 seconds

### Production Environment
- [ ] Cloudflare authentication completes successfully
- [ ] Production D1 database creates without errors
- [ ] Database migrations apply to production instance
- [ ] Application deploys to Cloudflare Workers
- [ ] Production health endpoint responds correctly 
- [ ] Environment-specific configuration is active
- [ ] All secrets are properly configured and accessible

### Development Workflow
- [ ] Code changes reflect immediately in local environment
- [ ] Local testing validates functionality before deployment
- [ ] Production deployment succeeds from local environment
- [ ] Production environment mirrors local behavior
- [ ] Configuration prevents development/production mixing

## Troubleshooting

### DevContainer Issues
```bash
# If devcontainer fails to start
docker system prune -f
# Then restart VS Code and retry container

# If Node.js version is wrong
# Check .devcontainer/devcontainer.json for correct base image
```

### Local D1 Issues
```bash
# If local database fails to initialize
rm -rf .wrangler/state/d1/DB.sqlite
npx wrangler d1 migrations apply shumilog-db-dev --local --env development

# If database connection fails
pkill -f "wrangler dev"
npm run dev:wrangler
```

### Production Deployment Issues
```bash
# If authentication fails
npx wrangler auth logout
npx wrangler auth login

# If database ID is wrong
npx wrangler d1 list
# Copy correct ID to wrangler.toml

# If secrets are missing
npx wrangler secret list --env production
```

### Performance Issues
```bash
# If startup is slow (>10 seconds)
# Check Docker resources allocation
# Ensure adequate CPU/memory for devcontainer

# If hot-reload is slow (>2 seconds)  
# Check file watchers and exclude unnecessary directories
```

## Success Criteria

### Functional Success
- All validation steps complete without errors
- Local and production environments behave identically
- Hot-reload functionality works reliably
- Database operations succeed in both environments
- Configuration management prevents environment mixing

### Performance Success
- DevContainer startup: <30 seconds
- Local development server startup: <10 seconds
- Hot-reload response: <2 seconds
- Health check response: <1 second (local), <3 seconds (production)
- Database migration execution: <30 seconds

### Operational Success
- No manual configuration required after initial setup
- Secrets are properly isolated between environments
- Deployment process is repeatable and reliable
- Troubleshooting procedures resolve common issues
- Documentation is sufficient for team onboarding

## Next Steps

After successful quickstart validation:
1. Review generated tasks.md for implementation details
2. Execute implementation tasks following TDD approach
3. Set up continuous integration for automated testing
4. Configure monitoring and alerting for production environment
5. Document team development workflows and conventions

This quickstart validates that the Cloudflare Workers & D1 architecture provides a solid foundation for shumilog application development and deployment.