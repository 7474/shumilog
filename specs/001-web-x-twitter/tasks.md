# Tasks: Hobby Content Log Service

**Input**: Design documents from `/specs/001-web-x-twitter/`
**Prerequisites**: plan.md (required), research.md, data-model.md, contracts/api.yaml, quickstart.md

## Execution Flow (main)
```
1. Load plan.md from feature directory ✓
   → Extract: TypeScript + Cloudflare Workers, Hono framework, D1 database, KV storage
2. Load design documents ✓:
   → data-model.md: 6 entities (User, Tag, Log, TagAssociation, LogTagAssociation, UserTagProgress)
   → contracts/api.yaml: 4 endpoint groups (auth, users, tags, logs) with 11 total endpoints
   → research.md: Technology decisions and alternatives
   → quickstart.md: 6 user scenarios for testing
3. Generate tasks by category ✓
4. Apply task rules ✓
5. Number tasks sequentially ✓
6. Generate dependency graph ✓
7. Create parallel execution examples ✓
```

## Format: `[ID] [P?] Description`
- **[P]**: Can run in parallel (different files, no dependencies)
- **Path Convention**: Web app structure (`backend/`, `frontend/`)

## Phase 3.1: Setup
- [x] T001 Create backend/ and frontend/ directories with TypeScript project structure per implementation plan
- [x] T002 Initialize backend TypeScript project with Hono, Cloudflare Workers, D1, KV dependencies in backend/package.json
- [x] T003 [P] Configure ESLint, Prettier, and TypeScript config in backend/
- [x] T004 [P] Initialize frontend with basic HTML, CSS, TypeScript structure in frontend/
- [x] T005 [P] Set up Vitest and Miniflare testing environment in backend/vitest.config.ts

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3
**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests (API Endpoints)
- [ ] T006 [P] Contract test GET /auth/twitter in backend/tests/contract/auth-twitter.test.ts
- [ ] T007 [P] Contract test GET /auth/callback in backend/tests/contract/auth-callback.test.ts
- [ ] T008 [P] Contract test POST /auth/logout in backend/tests/contract/auth-logout.test.ts
- [ ] T009 [P] Contract test GET /users/me in backend/tests/contract/users-me.test.ts
- [ ] T010 [P] Contract test GET /tags in backend/tests/contract/tags-list.test.ts
- [ ] T011 [P] Contract test POST /tags in backend/tests/contract/tags-create.test.ts
- [ ] T012 [P] Contract test GET /tags/{tagId} in backend/tests/contract/tags-detail.test.ts
- [ ] T013 [P] Contract test PUT /tags/{tagId} in backend/tests/contract/tags-update.test.ts
- [ ] T014 [P] Contract test DELETE /tags/{tagId} in backend/tests/contract/tags-delete.test.ts
- [ ] T015 [P] Contract test GET /tags/{tagId}/associations in backend/tests/contract/tag-associations-list.test.ts
- [ ] T016 [P] Contract test POST /tags/{tagId}/associations in backend/tests/contract/tag-associations-create.test.ts
- [ ] T017 [P] Contract test DELETE /tags/{tagId}/associations in backend/tests/contract/tag-associations-delete.test.ts
- [ ] T018 [P] Contract test GET /logs in backend/tests/contract/logs-list.test.ts
- [ ] T019 [P] Contract test POST /logs in backend/tests/contract/logs-create.test.ts
- [ ] T020 [P] Contract test GET /logs/{logId} in backend/tests/contract/logs-detail.test.ts
- [ ] T021 [P] Contract test PUT /logs/{logId} in backend/tests/contract/logs-update.test.ts
- [ ] T022 [P] Contract test DELETE /logs/{logId} in backend/tests/contract/logs-delete.test.ts
- [ ] T023 [P] Contract test POST /logs/{logId}/share in backend/tests/contract/logs-share.test.ts

### Integration Tests (User Scenarios)
- [ ] T024 [P] Integration test: New user registration and first log in backend/tests/integration/user-onboarding.test.ts
- [ ] T025 [P] Integration test: Episode-level log tracking with tag associations in backend/tests/integration/episode-logging.test.ts
- [ ] T026 [P] Integration test: Tag-based content discovery in backend/tests/integration/content-discovery.test.ts
- [ ] T027 [P] Integration test: Mobile-first experience workflows in backend/tests/integration/mobile-workflows.test.ts
- [ ] T028 [P] Integration test: Dynamic tag creation and management in backend/tests/integration/tag-management.test.ts
- [ ] T029 [P] Integration test: Error handling and edge cases in backend/tests/integration/error-handling.test.ts

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Database Models
- [ ] T030 [P] User model with Twitter OAuth fields in backend/src/models/User.ts
- [ ] T031 [P] Tag model with metadata JSON field in backend/src/models/Tag.ts
- [ ] T032 [P] Log model with Markdown content in backend/src/models/Log.ts
- [ ] T033 [P] TagAssociation model for tag-to-tag relationships in backend/src/models/TagAssociation.ts
- [ ] T034 [P] LogTagAssociation model for log-tag relationships in backend/src/models/LogTagAssociation.ts
- [ ] T035 [P] UserTagProgress model for content tracking in backend/src/models/UserTagProgress.ts

### Database Schema & Migrations
- [ ] T036 Database schema creation script with all tables and indexes in backend/src/db/schema.sql
- [ ] T037 Database seed data script for default tags in backend/src/db/seeds.sql
- [ ] T038 Database connection and query utilities in backend/src/db/database.ts

### Services Layer
- [ ] T039 [P] UserService with Twitter OAuth integration in backend/src/services/UserService.ts
- [ ] T040 [P] TagService with search and association logic in backend/src/services/TagService.ts
- [ ] T041 [P] LogService with Markdown processing in backend/src/services/LogService.ts
- [ ] T042 [P] TwitterService for OAuth and sharing in backend/src/services/TwitterService.ts
- [ ] T043 [P] SessionService for KV-based session management in backend/src/services/SessionService.ts

### API Routes Implementation
- [ ] T044 Authentication routes (/auth/*) in backend/src/routes/auth.ts
- [ ] T045 User routes (/users/*) in backend/src/routes/users.ts
- [ ] T046 Tag routes (/tags/*) including associations in backend/src/routes/tags.ts  
- [ ] T047 Log routes (/logs/*) including sharing in backend/src/routes/logs.ts

### Frontend Pages
- [ ] T048 [P] Landing page with Twitter OAuth login in frontend/src/pages/index.html
- [ ] T049 [P] Log creation form with tag selection in frontend/src/pages/create-log.html
- [ ] T050 [P] Tag browsing and discovery interface in frontend/src/pages/browse-tags.html
- [ ] T051 [P] User dashboard with personal logs in frontend/src/pages/dashboard.html

## Phase 3.4: Integration
- [ ] T052 Connect all services to D1 database in backend/src/services/
- [ ] T053 Authentication middleware with session validation in backend/src/middleware/auth.ts
- [ ] T054 CORS and security headers middleware in backend/src/middleware/security.ts
- [ ] T055 Request/response logging middleware in backend/src/middleware/logging.ts
- [ ] T056 Error handling and validation middleware in backend/src/middleware/validation.ts
- [ ] T057 Main Hono app setup with all routes and middleware in backend/src/index.ts

## Phase 3.5: Polish
- [ ] T058 [P] Unit tests for UserService validation in backend/tests/unit/UserService.test.ts
- [ ] T059 [P] Unit tests for TagService search logic in backend/tests/unit/TagService.test.ts
- [ ] T060 [P] Unit tests for LogService Markdown processing in backend/tests/unit/LogService.test.ts
- [ ] T061 [P] Unit tests for TwitterService OAuth flow in backend/tests/unit/TwitterService.test.ts
- [ ] T062 [P] Performance tests ensuring <200ms response times in backend/tests/performance/
- [ ] T063 [P] Frontend responsive design validation in frontend/tests/
- [ ] T064 [P] Update API documentation with examples in docs/api.md
- [ ] T065 [P] Add GitHub Flavored Markdown processing library integration
- [ ] T066 Remove code duplication and refactor shared utilities
- [ ] T067 Run complete quickstart.md scenarios as acceptance tests

## Dependencies
- **Setup (T001-T005)** before all other phases
- **Contract tests (T006-T023)** before **Models (T030-T035)**  
- **Integration tests (T024-T029)** before **Services (T039-T043)**
- **Models (T030-T035)** before **Database (T036-T038)**
- **Database (T036-T038)** before **Services (T039-T043)**
- **Services (T039-T043)** before **Routes (T044-T047)**
- **Routes (T044-T047)** before **Integration (T052-T057)**
- **Core Implementation (T030-T057)** before **Polish (T058-T067)**

## Parallel Execution Examples

### Setup Phase (all parallel)
```bash
Task: "Configure ESLint, Prettier, and TypeScript config in backend/"  
Task: "Initialize frontend with basic HTML, CSS, TypeScript structure in frontend/"
Task: "Set up Vitest and Miniflare testing environment in backend/vitest.config.ts"
```

### Contract Tests Phase (all parallel)
```bash
Task: "Contract test GET /auth/twitter in backend/tests/contract/auth-twitter.test.ts"
Task: "Contract test GET /auth/callback in backend/tests/contract/auth-callback.test.ts"
Task: "Contract test POST /auth/logout in backend/tests/contract/auth-logout.test.ts"
Task: "Contract test GET /users/me in backend/tests/contract/users-me.test.ts"
# ... (continue with all T006-T023)
```

### Models Phase (all parallel)
```bash
Task: "User model with Twitter OAuth fields in backend/src/models/User.ts"
Task: "Tag model with metadata JSON field in backend/src/models/Tag.ts"  
Task: "Log model with Markdown content in backend/src/models/Log.ts"
Task: "TagAssociation model for tag-to-tag relationships in backend/src/models/TagAssociation.ts"
Task: "LogTagAssociation model for log-tag relationships in backend/src/models/LogTagAssociation.ts"
Task: "UserTagProgress model for content tracking in backend/src/models/UserTagProgress.ts"
```

### Services Phase (all parallel)
```bash
Task: "UserService with Twitter OAuth integration in backend/src/services/UserService.ts"
Task: "TagService with search and association logic in backend/src/services/TagService.ts"
Task: "LogService with Markdown processing in backend/src/services/LogService.ts"
Task: "TwitterService for OAuth and sharing in backend/src/services/TwitterService.ts"
Task: "SessionService for KV-based session management in backend/src/services/SessionService.ts"
```

## Notes
- **[P] tasks**: Different files, no dependencies, can run in parallel
- **Sequential tasks**: Share files or have dependencies, must run in order  
- **TDD Critical**: All tests (T006-T029) must fail before implementation starts
- **Mobile-first**: Frontend tasks prioritize responsive design
- **Cost-conscious**: Use Cloudflare free tiers (Workers, D1, KV)
- **Commit strategy**: Commit after each completed task

## Task Generation Rules Applied
1. **From Contracts**: api.yaml → 18 contract tests (T006-T023)
2. **From Data Model**: 6 entities → 6 model tasks (T030-T035) 
3. **From User Stories**: quickstart.md → 6 integration tests (T024-T029)
4. **From Tech Stack**: Cloudflare Workers + Hono → specific setup tasks
5. **Dependencies**: Tests → Models → Services → Routes → Integration → Polish

## Validation Checklist ✓
- [x] All 18 API endpoints have contract tests
- [x] All 6 entities have model creation tasks  
- [x] All 6 user scenarios have integration tests
- [x] Tests come before implementation (T006-T029 before T030+)
- [x] Parallel tasks are truly independent (different files)
- [x] Each task specifies exact file path
- [x] No [P] task modifies same file as another [P] task
- [x] Dependencies clearly defined and sequenced