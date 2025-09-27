# Tasks: Frontend Core Implementation

**Input**: Design documents from `/home/koudenpa/ghq/github.com/7474/shumilog/specs/004-tag-log/`
**Prerequisites**: plan.md, research.md, data-model.md, quickstart.md

## Phase 3.1: Setup
- [ ] T001 [P] Remove existing `frontend/index.html`.
- [ ] T002 [P] Set up React and Vite project structure in `frontend/`.
- [ ] T003 [P] Install dependencies: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `typescript`, `vitest`, `hono`.
- [ ] T004 [P] Configure `frontend/vite.config.ts` and `frontend/tsconfig.json`.

## Phase 3.2: Core Implementation
- [ ] T005 Define frontend data models for `Log`, `Tag`, and `User` in `frontend/src/models.ts` based on `data-model.md`.
- [ ] T006 Create API service clients for `logs`, `tags`, and `auth` in `frontend/src/services/` using Hono's RPC client.
- [ ] T007 [P] Implement a `LoginPage` component in `frontend/src/pages/LoginPage.tsx` with a "Login with Twitter" button.
- [ ] T008 [P] Implement a `LogsPage` component in `frontend/src/pages/LogsPage.tsx` to display a list of logs.
- [ ] T009 [P] Implement a `TagsPage` component in `frontend/src/pages/TagsPage.tsx` to display a list of tags.
- [ ] T010 [P] Implement a `LogForm` component in `frontend/src/components/LogForm.tsx` for creating and editing logs.
- [ ] T011 [P] Implement a `TagForm` component in `frontend/src/components/TagForm.tsx` for creating and editing tags.

## Phase 3.3: Integration & Routing
- [ ] T012 Set up client-side routing using a library like `react-router-dom`.
- [ ] T013 Create a main `App.tsx` component to manage routing and application layout.
- [ ] T014 Implement protected routes that require authentication to access `LogsPage` and `TagsPage`.
- [ ] T015 Integrate the `LoginPage` with the auth service to handle user login and session management.
- [ ] T016 Connect `LogsPage` and `LogForm` to the `logs` API service to perform CRUD operations.
- [ ] T017 Connect `TagsPage` and `TagForm` to the `tags` API service to perform CRUD operations.

## Phase 3.4: Testing
- [ ] T018 [P] Write unit tests for `LogForm` and `TagForm` components.
- [ ] T019 [P] Write integration tests for the login flow.
- [ ] T020 [P] Write integration tests for the log management workflow (create, read, update, delete).
- [ ] T021 [P] Write integration tests for the tag management workflow (create, read, update, delete).

## Dependencies
- `T001-T004` must be completed before all other tasks.
- `T005` (Models) should be done before `T006` (Services) and `T008-T011` (Components).
- `T006` (Services) should be done before `T015-T017` (Integration).
- `T012-T014` (Routing) can be done in parallel with component implementation but are needed for full integration.

## Parallel Example
The following tasks can be run in parallel after the initial setup:
```
Task: "Implement a LoginPage component in frontend/src/pages/LoginPage.tsx"
Task: "Implement a LogsPage component in frontend/src/pages/LogsPage.tsx"
Task: "Implement a TagsPage component in frontend/src/pages/TagsPage.tsx"
Task: "Implement a LogForm component in frontend/src/components/LogForm.tsx"
Task: "Implement a TagForm component in frontend/src/components/TagForm.tsx"
```
