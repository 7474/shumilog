# Tasks: Dependency Maintenance Policy and LTS Alignment

**Input**: Design documents from `/specs/004-lts-lts/`
**Prerequisites**: plan.md, research.md, data-model.md, contracts/, quickstart.md

## Phase 3.1: Setup
- [ ] T001 Initialize root npm workspace (`package.json`) with `workspaces: ["backend","frontend"]`, stub `deps:policy-check` script, and placeholder `test` script.
- [ ] T002 Install root dev dependencies (`tsx`, `vitest`, `@types/node`, `semver`, `js-yaml`, `chalk`, `date-fns`) and commit generated `package-lock.json`.
- [ ] T003 Configure root TypeScript + test tooling by adding `tsconfig.json`, `tests/tsconfig.json`, and `vitest.config.ts` targeting the new CLI script and tests.

## Phase 3.2: Tests First (write, ensure fail)
- [ ] T004 [P] Add failing contract tests for the policy checker CLI in `tests/contract/dependency-policy-check.test.ts` covering compliant vs. violating inventory cases.
- [ ] T005 [P] Add integration test `tests/integration/dependency-review.flow.test.ts` that simulates the quarterly quickstart workflow and expects non-zero exit when steps are skipped.

## Phase 3.3: Core Implementation (after T004–T005 fail)
- [ ] T006 Implement YAML loader and entity types for `DependencyRecord`/`MaintenancePolicy` in `scripts/dependency-policy-check.ts` using `js-yaml` parsing.
- [ ] T007 Implement compliance evaluation (cadence, 60-day adoption, 24h/72h security SLA, exception handling) in `scripts/dependency-policy-check.ts` with descriptive error aggregation.
- [ ] T008 Finish CLI entrypoint, Markdown/JSON output formatting, and wire `npm run deps:policy-check` to `tsx scripts/dependency-policy-check.ts` in root `package.json`.

## Phase 3.4: Documentation & Data
- [ ] T009 [P] Create baseline `docs/dependency-inventory.yaml` listing backend/frontend packages with review dates, grace deadlines, and exception placeholders.
- [ ] T010 [P] Author `docs/dependency-policy.md` summarizing cadence, SLAs, exception approval workflow, and two-week communication template.

## Phase 3.5: Dependency Upgrades
- [ ] T011 Upgrade `backend/package.json` (and lockfile) packages to latest LTS/stable, adjusting scripts if needed to invoke the root policy check.
- [ ] T012 [P] Upgrade `frontend/package.json` (and lockfile) packages to latest stable versions and ensure local build succeeds.

## Phase 3.6: Validation & Integration
- [ ] T013 Run backend quality gates (`npm run lint`, `npm test`, `npm run test:contract`) to confirm upgrades and policy checker coexist.
- [ ] T014 [P] Run frontend quality gates (`npm run lint`, `npm test`, `npm run test:smoke`) after dependency updates.
- [ ] T015 Update `.github/workflows/ci.yml` (or equivalent pipeline) to execute `npm run deps:policy-check` before backend/frontend test jobs.

## Phase 3.7: Polish
- [ ] T016 [P] Link the new policy + inventory docs from `README.md` (or `/docs/README.md`) and note the quarterly review cadence.
- [ ] T017 Execute `npm run deps:policy-check -- --format=json`, capture the compliance summary, and append the latest run snapshot to `docs/dependency-policy.md`.

## Dependencies
- T002 depends on T001 (package.json must exist first).
- T003 depends on T002 to ensure toolchain packages are available.
- T004–T005 depend on T003 for compiler/test config.
- T006–T008 depend on tests T004–T005 being in place.
- T009–T010 depend on T006–T008 to define data structures/output expectations.
- T011 depends on T008–T010 so the checker and docs exist before locking new versions.
- T012 depends on T011 (ensure backend upgrades land before frontend runs in parallel).
- T013 depends on T011; T014 depends on T012.
- T015 depends on T008 (command available) and T013–T014 (validated locally).
- T016 depends on T010; T017 depends on T008–T016.

## Parallel Execution Example
```
# After T003 completes:
task run T004
task run T005

# After T008 completes:
task run T009
task run T010

# During upgrade validation:
task run T012
# once frontend install finishes, in parallel:
task run T014

# Final polish parallel pair:
task run T016
```

```Taskfile
matrix:
  post-tests:
    tasks:
      - T004
      - T005
  docs:
    tasks:
      - T009
      - T010
  frontend-validate:
    tasks:
      - T012
      - T014
```

Ensure each task is committed individually and keep failing tests in place until corresponding implementation tasks are complete.
