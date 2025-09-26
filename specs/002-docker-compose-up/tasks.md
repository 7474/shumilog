# Tasks: Docker Compose Development Environment

**Input**: Design documents from `/specs/002-docker-compose-up/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/

## Execution Flow (main)
```
1. Load plan.md from feature directory
   → Found: TypeScript 5.2+, Node.js 18+, Hono, Vite, Docker Compose
   → Structure: web - frontend + backend detected
2. Load optional design documents:
   → data-model.md: Configuration entities for Docker services
   → contracts/: API endpoints and Docker configuration contracts
   → research.md: Docker Compose strategy and devcontainer decisions
   → quickstart.md: User workflows and testing scenarios
3. Generate tasks by category:
   → Setup: Docker configuration, devcontainer setup
   → Tests: Contract tests for dev API, integration tests for workflows
   → Core: Docker Compose files, Dockerfiles, environment configuration
   → Integration: Service health checks, hot-reload setup
   → Polish: Documentation, performance validation
4. Apply task rules:
   → Different files = mark [P] for parallel
   → Configuration files can be created in parallel
   → Tests before implementation (TDD)
5. Number tasks sequentially (T001, T002...)
6. Generate dependency graph
7. Create parallel execution examples
8. Validate task completeness:
   → All contracts have tests ✓
   → All configuration entities covered ✓
   → All quickstart scenarios tested ✓
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions

## Path Conventions
- **Web app structure**: `backend/`, `frontend/`, `.devcontainer/`
- Docker configurations at repository root
- Tests in respective service directories

## Phase 3.1: Setup
- [x] T001 Create Docker Compose configuration structure at repository root
- [x] T002 [P] Create .env.example file for development environment variables
- [x] T003 [P] Create .dockerignore files for backend and frontend services
- [x] T004 [P] Create .devcontainer/devcontainer.json for VSCode integration

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**
- [x] T005 [P] Contract test GET /health endpoint in backend/tests/contract/health.test.ts
- [x] T006 [P] Contract test GET /dev/config endpoint in backend/tests/contract/dev-config.test.ts
- [x] T007 [P] Contract test GET /dev/logs endpoint in backend/tests/contract/dev-logs.test.ts
- [x] T008 [P] Contract test POST /dev/reload endpoint in backend/tests/contract/dev-reload.test.ts
- [x] T009 [P] Integration test: Docker Compose startup in tests/integration/docker-startup.test.ts
- [x] T010 [P] Integration test: Service health checks in tests/integration/health-checks.test.ts
- [x] T011 [P] Integration test: Hot reload functionality in tests/integration/hot-reload.test.ts
- [x] T012 [P] Integration test: Database persistence in tests/integration/database-persistence.test.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)
- [ ] T013 [P] Create backend/Dockerfile with Node.js and development setup
- [ ] T014 [P] Create frontend/Dockerfile with Vite development server
- [ ] T015 Create docker-compose.yml with all service definitions and dependencies
- [ ] T016 [P] Implement health check endpoint in backend/src/routes/health.ts
- [ ] T017 [P] Implement dev configuration endpoint in backend/src/routes/dev.ts
- [ ] T018 [P] Create database initialization script in backend/src/db/init-dev.sql
- [ ] T019 Configure volume mounts for hot-reload in docker-compose.yml
- [ ] T020 Configure service dependencies and startup order

## Phase 3.4: Integration
- [ ] T021 [P] Configure backend hot-reload with nodemon in backend/package.json
- [ ] T022 [P] Configure frontend hot-reload with Vite HMR
- [ ] T023 Setup service networking and inter-service communication
- [ ] T024 Configure environment variable management across services
- [ ] T025 Implement service health check monitoring and reporting
- [ ] T026 Configure logging aggregation for all services

## Phase 3.5: Polish
- [ ] T027 [P] Create comprehensive README.md with Docker setup instructions
- [ ] T028 [P] Create troubleshooting guide in docs/docker-troubleshooting.md
- [ ] T029 [P] Performance test: Container startup time validation (<5s)
- [ ] T030 [P] Performance test: Hot-reload speed validation (backend <5s, frontend <2s)
- [ ] T031 [P] Create manual testing checklist for all quickstart scenarios
- [ ] T032 Optimize Docker images for faster builds and smaller size
- [ ] T033 Validate complete user workflow: auth → logging → tags

## Dependencies
- Setup (T001-T004) before all other phases
- Tests (T005-T012) before implementation (T013-T026)
- T015 (docker-compose.yml) blocks T019, T020, T023
- T013, T014 (Dockerfiles) before T015 (compose file)
- T016, T017 (endpoints) need T015 (service running)
- Integration (T021-T026) before polish (T027-T033)
- T025 (health monitoring) needs T016, T017 (health endpoints)

## Parallel Example
```bash
# Phase 3.2: Launch contract tests together
Task: "Contract test GET /health endpoint in backend/tests/contract/health.test.ts"
Task: "Contract test GET /dev/config endpoint in backend/tests/contract/dev-config.test.ts"  
Task: "Contract test GET /dev/logs endpoint in backend/tests/contract/dev-logs.test.ts"
Task: "Contract test POST /dev/reload endpoint in backend/tests/contract/dev-reload.test.ts"

# Phase 3.3: Launch Docker configuration tasks together
Task: "Create backend/Dockerfile with Node.js and development setup"
Task: "Create frontend/Dockerfile with Vite development server"
Task: "Implement health check endpoint in backend/src/routes/health.ts"
Task: "Implement dev configuration endpoint in backend/src/routes/dev.ts"

# Phase 3.5: Launch documentation and performance tasks together
Task: "Create comprehensive README.md with Docker setup instructions"
Task: "Create troubleshooting guide in docs/docker-troubleshooting.md"
Task: "Performance test: Container startup time validation (<5s)"
Task: "Performance test: Hot-reload speed validation (backend <5s, frontend <2s)"
```

## Notes
- [P] tasks = different files, no dependencies
- Verify tests fail before implementing endpoints
- Test Docker configuration after each major change
- Commit after each task completion
- Ensure containers start successfully before proceeding to next phase

## Task Generation Rules
*Applied during main() execution*

1. **From Contracts**:
   - api.yaml endpoints → contract test tasks [P] (T005-T008)
   - docker-compose.md specifications → implementation tasks (T015, T019-T020)
   
2. **From Data Model**:
   - DockerComposeConfig → docker-compose.yml task (T015)
   - ServiceConfig → Dockerfile tasks [P] (T013-T014)
   - DevcontainerConfig → devcontainer.json task [P] (T004)
   
3. **From Quickstart Scenarios**:
   - User authentication flow → integration test [P] (T012)
   - Hot reload test → integration test [P] (T011)
   - Database persistence → integration test [P] (T012)
   - Complete workflow → validation task (T033)

4. **From Research Decisions**:
   - Docker Compose strategy → core implementation tasks (T015, T019-T020)
   - Devcontainer integration → setup and configuration tasks (T004)
   - Hot-reload requirements → integration tasks (T021-T022)

## Validation Checklist
*GATE: Checked by main() before returning*

- [x] All contracts have corresponding tests (T005-T008)
- [x] All configuration entities have implementation tasks (T013-T015, T004)
- [x] All tests come before implementation (Phase 3.2 before 3.3)
- [x] Parallel tasks truly independent (different files, no shared dependencies)
- [x] Each task specifies exact file path
- [x] No task modifies same file as another [P] task
- [x] All quickstart scenarios covered by integration tests
- [x] Performance requirements validated (T029-T030)

## Core Success Criteria
1. **Single Command Setup**: `docker compose up` starts all services (T015, T019-T020)
2. **Hot Reloading**: Code changes reflect automatically (T021-T022, T011)
3. **Service Health**: All services report healthy status (T016-T017, T025)
4. **Complete Workflow**: Authentication, logging, and tag management work (T033)
5. **Performance Goals**: Startup <5s, hot-reload <5s backend/<2s frontend (T029-T030)