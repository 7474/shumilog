# Tasks: Cloudflare Workers & D1 Deployment Architecture

**Input**: Design documents from `/specs/003-web-cloudflare-cloudflare/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Found: TypeScript 5.2+, Node.js 18+, Hono, Wrangler CLI, D1, devcontainer
   → Project Type: web - backend/frontend structure with Workers deployment
2. Load optional design documents:
   → data-model.md: DevContainer, Wrangler, Environment config entities
   → contracts/: health.md, dev-config.md, dev-migrate.md → 3 contract test tasks
   → research.md: DevContainer + Wrangler decisions → setup tasks
   → quickstart.md: 7-step validation workflow → integration tests
3. Generate tasks by category:
   → Setup: devcontainer, Wrangler config, D1 setup
   → Tests: 3 contract tests, 7 integration tests
   → Core: health endpoint, dev-config endpoint, dev-migrate endpoint
   → Integration: D1 connections, environment management
   → Polish: documentation, troubleshooting
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Contract tests = [P], Configuration files = [P]
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness: ✓ All contracts have tests, ✓ All endpoints implemented
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- Web app structure: `backend/src/`, `frontend/src/`

## Phase 3.1: Infrastructure Setup
- [ ] T001 Create devcontainer configuration in `.devcontainer/devcontainer.json`
- [ ] T002 [P] Update Wrangler configuration in `backend/wrangler.toml` with proper D1 bindings
- [ ] T003 [P] Create development environment file template in `backend/.env.development.example`
- [ ] T004 [P] Update backend package.json scripts for Wrangler development workflow
- [ ] T005 Initialize local D1 database structure and migrations in `backend/migrations/`

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [ ] T006 [P] Contract test GET /health in `backend/tests/contract/health.test.ts`
- [ ] T007 [P] Contract test GET /dev/config in `backend/tests/contract/dev-config.test.ts`
- [ ] T008 [P] Contract test POST /dev/migrate in `backend/tests/contract/dev-migrate.test.ts`
- [ ] T009 [P] Integration test devcontainer setup in `tests/integration/devcontainer-setup.test.ts`
- [ ] T010 [P] Integration test local development environment in `tests/integration/local-development.test.ts`
- [ ] T011 [P] Integration test hot-reload functionality in `tests/integration/hot-reload.test.ts`
- [ ] T012 [P] Integration test database migration workflow in `tests/integration/database-migration.test.ts`
- [ ] T013 [P] Integration test production deployment in `tests/integration/production-deployment.test.ts`

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [ ] T014 [P] Health check endpoint in `backend/src/routes/health.ts`
- [ ] T015 [P] Development configuration endpoint in `backend/src/routes/dev.ts` 
- [ ] T016 Database migration service in `backend/src/services/MigrationService.ts`
- [ ] T017 Environment configuration service in `backend/src/services/ConfigService.ts`
- [ ] T018 Update main server file to include new routes in `backend/src/server.ts`
- [ ] T019 D1 database connection utilities in `backend/src/db/database.ts`
- [ ] T020 Migration execution logic in `backend/src/db/migrate.ts`

## Phase 3.4: Integration & Environment Management
- [ ] T021 Environment-specific configuration loading in `backend/src/utils/environment.ts`
- [ ] T022 Secrets management for local and production environments
- [ ] T023 Error handling and logging for Workers environment
- [ ] T024 D1 database connection pooling and error recovery
- [ ] T025 Development vs production environment detection and routing

## Phase 3.5: Documentation & Validation
- [ ] T026 [P] Create setup documentation in `docs/cloudflare-setup.md`
- [ ] T027 [P] Create troubleshooting guide in `docs/troubleshooting.md`
- [ ] T028 [P] Update main README.md with devcontainer and Wrangler instructions
- [ ] T029 Execute complete quickstart validation workflow
- [ ] T030 Performance testing for startup and migration times
- [ ] T031 [P] Create deployment checklist in `docs/deployment-checklist.md`

## Dependencies
- Infrastructure setup (T001-T005) before tests (T006-T013)
- All tests (T006-T013) before implementation (T014-T020)
- T016 blocks T020 (migration service before execution logic)
- T017 blocks T021 (config service before environment utils)
- T019 blocks T024 (database utilities before connection pooling)
- Implementation (T014-T025) before documentation (T026-T031)

## Parallel Execution Examples

### Phase 3.1 Parallel Setup:
```bash
# Launch T002-T004 together (different files):
Task: "Update Wrangler configuration in backend/wrangler.toml with proper D1 bindings"
Task: "Create development environment file template in backend/.env.development.example"
Task: "Update backend package.json scripts for Wrangler development workflow"
```

### Phase 3.2 Contract Tests:
```bash
# Launch T006-T008 together (different test files):
Task: "Contract test GET /health in backend/tests/contract/health.test.ts"
Task: "Contract test GET /dev/config in backend/tests/contract/dev-config.test.ts"
Task: "Contract test POST /dev/migrate in backend/tests/contract/dev-migrate.test.ts"
```

### Phase 3.2 Integration Tests:
```bash
# Launch T009-T013 together (different test scenarios):
Task: "Integration test devcontainer setup in tests/integration/devcontainer-setup.test.ts"
Task: "Integration test local development environment in tests/integration/local-development.test.ts"
Task: "Integration test hot-reload functionality in tests/integration/hot-reload.test.ts"
Task: "Integration test database migration workflow in tests/integration/database-migration.test.ts"
Task: "Integration test production deployment in tests/integration/production-deployment.test.ts"
```

### Phase 3.3 Core Implementation:
```bash
# Launch T014-T015 together (different route files):
Task: "Health check endpoint in backend/src/routes/health.ts"
Task: "Development configuration endpoint in backend/src/routes/dev.ts"
```

### Phase 3.5 Documentation:
```bash
# Launch T026-T028, T031 together (different documentation files):
Task: "Create setup documentation in docs/cloudflare-setup.md"
Task: "Create troubleshooting guide in docs/troubleshooting.md"  
Task: "Update main README.md with devcontainer and Wrangler instructions"
Task: "Create deployment checklist in docs/deployment-checklist.md"
```

## Task Details

### Infrastructure Tasks (T001-T005)
- **T001**: Configure devcontainer with Node.js 18+, Wrangler CLI, TypeScript extensions, port 8787 forwarding
- **T002**: Update wrangler.toml with development/production D1 bindings, KV namespaces, environment variables
- **T003**: Create .env.development.example with all required environment variables and documentation
- **T004**: Add npm scripts for `dev:wrangler`, `deploy`, `db:migrate:local`, `db:migrate:prod`
- **T005**: Set up migration directory structure and initial schema for D1 compatibility

### Contract Test Tasks (T006-T008)
- **T006**: Test health endpoint returns 200 OK with proper JSON structure and database connectivity status
- **T007**: Test dev/config endpoint returns development configuration, bindings, and migration status (dev only)
- **T008**: Test dev/migrate endpoint handles up/down/status actions with proper validation and error handling

### Integration Test Tasks (T009-T013)
- **T009**: Verify devcontainer starts successfully, has correct Node.js/Wrangler versions, and proper port forwarding
- **T010**: Test complete local development workflow: npm install → D1 setup → server start → health check
- **T011**: Verify file changes trigger automatic reload within 2 seconds
- **T012**: Test migration workflow: apply migrations → verify schema → rollback → verify rollback
- **T013**: Test production deployment: secrets setup → migration → deployment → health verification

### Implementation Tasks (T014-T025)
- **T014-T015**: Implement API endpoints following contract specifications with proper error handling
- **T016-T017**: Create service classes for migration execution and configuration management
- **T018**: Update server.ts to register new routes and middleware
- **T019-T020**: Implement D1 database utilities and migration execution with SQLite compatibility
- **T021-T025**: Environment management, secrets handling, error logging, and Workers-specific features

## Notes
- All contract tests must fail initially (no implementation exists)
- DevContainer configuration must be compatible with VS Code Dev Containers extension
- Wrangler configuration must support both local development and production deployment
- D1 migrations must be compatible with both local SQLite and production D1
- Environment separation must prevent accidental production deployments with development settings
- Performance targets: <10s startup, <2s hot-reload, <30s migrations
- All free-tier constraints must be respected (Cloudflare Workers 100k req/day, D1 5M reads/month)

## Validation Criteria
- [ ] DevContainer starts and provides proper development environment
- [ ] Local development server starts with D1 emulation
- [ ] All contract tests pass with implemented endpoints
- [ ] Hot-reload responds to file changes within 2 seconds
- [ ] Database migrations work in both local and production environments
- [ ] Production deployment succeeds and health checks pass
- [ ] Complete quickstart workflow executes successfully within 33 minutes
- [ ] No development configuration or secrets leak to production environment