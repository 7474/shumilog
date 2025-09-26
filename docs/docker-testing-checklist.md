# Docker Development Environment Testing Checklist

## Prerequisites
- [ ] Docker Engine 20.10+ installed
- [ ] Docker Compose 2.0+ installed
- [ ] 4GB+ available RAM
- [ ] 2GB+ available disk space

## Initial Setup Testing

### Fresh Environment Setup
- [ ] Clone repository to clean directory
- [ ] Run `docker-compose up -d` from project root
- [ ] Verify no errors in console output
- [ ] Wait for all services to reach healthy status
- [ ] Confirm all containers started within 15 seconds

### Service Health Checks
- [ ] Backend health: `curl http://localhost:8787/health` returns healthy status
- [ ] Frontend access: `curl http://localhost:5173/pages/index.html` returns 200 OK
- [ ] Database connectivity: Health endpoint shows database connected
- [ ] All containers show "healthy" status in `docker-compose ps`

## Hot-Reload Testing

### Backend Hot-Reload
- [ ] Edit any TypeScript file in `backend/src/`
- [ ] Verify backend restarts automatically within 5 seconds
- [ ] Confirm health endpoint reflects changes
- [ ] Check no compilation errors in container logs

### Frontend Hot-Reload
- [ ] Edit any HTML/CSS file in `frontend/src/`
- [ ] Verify changes appear in browser within 2 seconds
- [ ] Confirm no build errors in container logs
- [ ] Test HMR (Hot Module Replacement) preserves application state

## Development Workflow Testing

### Code Changes
- [ ] TypeScript compilation works correctly
- [ ] ESLint/Prettier integration (if configured)
- [ ] Source maps work for debugging
- [ ] File watching works across all file types

### Database Operations
- [ ] Database initializes with schema on first run
- [ ] Seed data loads correctly
- [ ] Database persists data between container restarts
- [ ] SQLite file accessible in `/data/shumilog.db`

### API Testing
- [ ] Health endpoint: `GET /health`
- [ ] Dev endpoints: `GET /dev/config`, `GET /dev/logs`, `POST /dev/reload`
- [ ] CORS configuration allows frontend requests
- [ ] Environment variables propagate correctly

## Performance Testing

### Startup Performance
- [ ] Cold start (first run): Complete within 30 seconds
- [ ] Warm start (after images built): Complete within 15 seconds
- [ ] Service ready time: All services responding within 20 seconds

### Hot-Reload Performance
- [ ] Backend changes reflect within 5 seconds
- [ ] Frontend changes reflect within 2 seconds
- [ ] No memory leaks during development sessions
- [ ] CPU usage reasonable during file watching

## Network and Communication

### Service Discovery
- [ ] Backend can reach database via `database:5432` (internal network)
- [ ] Frontend can reach backend via configured API URL
- [ ] External access works on published ports
- [ ] Service aliases work correctly

### Port Configuration
- [ ] Backend accessible on `localhost:8787`
- [ ] Frontend accessible on `localhost:5173`
- [ ] No port conflicts with host system
- [ ] Health checks work on internal networks

## Volume and Persistence Testing

### Code Synchronization
- [ ] Backend code changes sync to container
- [ ] Frontend code changes sync to container
- [ ] File permissions correct for development
- [ ] No issues with file watching on host OS

### Data Persistence
- [ ] Database data persists between restarts
- [ ] Node modules cache persists (faster rebuilds)
- [ ] Log files accessible from host
- [ ] Development artifacts properly excluded

## Error Handling and Recovery

### Container Failure Recovery
- [ ] Backend container restart works correctly
- [ ] Frontend container restart works correctly
- [ ] Database container restart preserves data
- [ ] Dependency order maintained during recovery

### Common Error Scenarios
- [ ] Port already in use - graceful error message
- [ ] Insufficient disk space - clear error message
- [ ] Missing dependencies - helpful error guidance
- [ ] Configuration errors - actionable error messages

## Integration Testing

### End-to-End Workflow
- [ ] Services start in correct dependency order
- [ ] Database initializes before backend starts
- [ ] Backend health checks pass before frontend starts
- [ ] All services reach healthy state together

### API Integration
- [ ] Frontend can make requests to backend
- [ ] Backend can query database successfully
- [ ] Error responses formatted correctly
- [ ] Request/response logging works

## Cleanup and Maintenance

### Environment Cleanup
- [ ] `docker-compose down` stops all services cleanly
- [ ] `docker-compose down -v` removes volumes correctly
- [ ] No orphaned containers or networks remain
- [ ] Disk space cleaned up properly

### Image Management
- [ ] Images rebuild correctly when Dockerfile changes
- [ ] Build cache works for faster subsequent builds
- [ ] No excessive image layers or bloat
- [ ] Security updates can be applied easily

## Documentation and Usability

### Developer Experience
- [ ] README instructions are clear and complete
- [ ] Error messages provide actionable guidance
- [ ] Development workflow is intuitive
- [ ] Troubleshooting guide covers common issues

### Performance Documentation
- [ ] Expected startup times documented
- [ ] Resource requirements clearly stated
- [ ] Performance optimization tips provided
- [ ] Known limitations documented

## Manual Testing Scenarios

### First-Time Setup
1. [ ] Fresh repository clone
2. [ ] Run `docker-compose up -d`
3. [ ] Access frontend at `http://localhost:5173/pages/index.html`
4. [ ] Verify backend health at `http://localhost:8787/health`
5. [ ] Check all services healthy: `docker-compose ps`

### Development Session
1. [ ] Start development environment
2. [ ] Make changes to backend TypeScript file
3. [ ] Verify automatic restart and hot-reload
4. [ ] Make changes to frontend HTML/CSS
5. [ ] Verify instant updates in browser
6. [ ] Test API endpoints work correctly

### Persistence Testing
1. [ ] Create some data in the application
2. [ ] Stop services: `docker-compose down`
3. [ ] Restart services: `docker-compose up -d`
4. [ ] Verify data persisted correctly
5. [ ] Confirm no data loss occurred

### Error Recovery
1. [ ] Introduce syntax error in backend code
2. [ ] Verify error handling and logging
3. [ ] Fix error and confirm automatic recovery
4. [ ] Test frontend error scenarios similarly

## Success Criteria

All checklist items should pass for successful Docker development environment:

- ✅ Single command setup works
- ✅ Hot-reload functions properly (backend <5s, frontend <2s)
- ✅ All services reach healthy status
- ✅ Development workflow is smooth
- ✅ Data persistence works correctly
- ✅ Error handling is robust
- ✅ Performance meets requirements
- ✅ Documentation is complete and accurate

## Notes

- Run this checklist on different host operating systems (Linux, macOS, Windows)
- Test with different Docker versions within supported range
- Verify memory and CPU usage remain reasonable during development
- Document any issues found and solutions applied