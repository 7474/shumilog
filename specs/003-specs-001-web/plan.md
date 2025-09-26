
# Implementation Plan: Minimal Cloudflare Worker API Revival

**Branch**: `003-specs-001-web` | **Date**: 2025-09-26 | **Spec**: [`specs/003-specs-001-web/spec.md`](spec.md)
**Input**: Feature specification from `/specs/003-specs-001-web/spec.md`

## Execution Flow (/plan command scope)
```
1. Load feature spec from Input path
   → If not found: ERROR "No feature spec at {path}"
2. Fill Technical Context (scan for NEEDS CLARIFICATION)
   → Detect Project Type from context (web=frontend+backend, mobile=app+api)
   → Set Structure Decision based on project type
3. Fill the Constitution Check section based on the content of the constitution document.
4. Evaluate Constitution Check section below
   → If violations exist: Document in Complexity Tracking
   → If no justification possible: ERROR "Simplify approach first"
   → Update Progress Tracking: Initial Constitution Check
5. Execute Phase 0 → research.md
   → If NEEDS CLARIFICATION remain: ERROR "Resolve unknowns"
6. Execute Phase 1 → contracts, data-model.md, quickstart.md, agent-specific template file (e.g., `CLAUDE.md` for Claude Code, `.github/copilot-instructions.md` for GitHub Copilot, `GEMINI.md` for Gemini CLI, `QWEN.md` for Qwen Code or `AGENTS.md` for opencode).
7. Re-evaluate Constitution Check section
   → If new violations: Refactor design, return to Phase 1
   → Update Progress Tracking: Post-Design Constitution Check
8. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md)
9. STOP - Ready for /tasks command
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:
- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary
Revive the repository as a minimal, locally runnable Cloudflare Worker backend (with a thin companion frontend) that fully serves the Hobby Content Log API contract while pruning every non-essential asset. Deliver a clear README-driven workflow that uses `wrangler dev` without Cloudflare credentials, verifies endpoints via automated checks and a lightweight UI, and documents any required environment setup.

## Technical Context
**Language/Version**: TypeScript 5.2+ (Cloudflare Workers runtime)  
**Tooling**: Node.js 22 LTS, npm 10, Wrangler CLI 3+  
**Primary Dependencies**: Hono (HTTP routing), Cloudflare D1 binding, Vite (frontend dev server)  
**Storage**: Cloudflare D1 (SQLite) with seed data for logs/tags/users  
**Testing**: Vitest (unit + contract tests), Playwright-lite smoke harness for frontend/API loopback  
**Target Platform**: Cloudflare Workers (local `wrangler dev`) + browser-based Vite frontend  
**Project Type**: web (Cloudflare Worker backend + minimal frontend)  
**Performance Goals**: Sub-500 ms p95 latency for core endpoints under local dev load; successful contract suite within 60 s  
**Constraints**: Must run fully offline using `wrangler dev`; no Cloudflare account credentials; dependencies must remain free-tier friendly; repository trimmed to minimal required assets  
**Scale/Scope**: Single-developer local workflow supporting API contract validation and lightweight UI verification

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

- **Quick Experimentation**: Plan boots with minimal Worker + UI scaffold, enabling rapid endpoint iteration and contract-driven development.
- **Low-Cost Hosting**: Cloudflare Workers free tier with local `wrangler dev`, Vite dev server, and SQLite-compatible D1 meet <$5/month mandate.
- **Iterative Exploration**: Deliver MVP endpoints first (auth, logs, tags), expand only after local contract suite passes.
- **Simplicity First**: Hono + D1 + Vite are mainstream, well-documented, and already present in repo conventions; unnecessary frameworks will be removed.
- **Cost-Conscious Development**: README will document zero-cost local setup; any optional tooling (e.g., Playwright) constrained to open-source/local execution.

*No violations identified; Complexity Tracking remains empty unless future scope creep emerges.*

## Project Structure

### Documentation (this feature)
```
specs/[###-feature]/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)
```
# Option 1: Single project (DEFAULT)
src/
├── models/
├── services/
├── cli/
└── lib/

tests/
├── contract/
├── integration/
└── unit/

# Option 2: Web application (when "frontend" + "backend" detected)
backend/
├── src/
│   ├── models/
│   ├── services/
│   └── api/
└── tests/

frontend/
├── src/
│   ├── components/
│   ├── pages/
│   └── services/
└── tests/

# Option 3: Mobile + API (when "iOS/Android" detected)
api/
└── [same as backend above]

ios/ or android/
└── [platform-specific structure]
```

**Structure Decision**: Option 2 (Web application) — retain `backend/` for the Worker code and testing harness, shrink `frontend/` to a minimal Vite-powered viewer needed for README verification.

## Phase 0: Outline & Research
1. Map critical unknowns to research tasks:
   - Confirm `wrangler dev` + D1 workflow without Cloudflare credentials (bindings, local migrations, seed strategy).
   - Determine minimal data subset required to exercise contract endpoints (users, tags, logs) while keeping schema aligned to `api.yaml`.
   - Evaluate trimming strategy for backend/frontend repos to satisfy Option A while keeping README instructions coherent.
   - Identify lightweight frontend approach (static Vite page vs. Worker-served HTML) that best validates API without extra build complexity.

2. Research dispatch (documented in `research.md`):
   - "Research standalone Cloudflare Worker + D1 dev workflow for offline usage."
   - "Find best practices for structuring Hono routes to mirror OpenAPI contracts."
   - "Assess minimal Vite configuration for API smoke UI within hobby constraints."
   - "Outline pruning methodology ensuring documentation/tests stay in sync."

3. consolidate findings with Decision / Rationale / Alternatives sections per topic in `research.md` to close remaining uncertainties.

**Output**: `research.md` capturing Worker/D1 setup, schema pruning, minimal frontend approach, and repository cleanup tactics.

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. Derive final entity catalog (`data-model.md`): align D1 tables (`users`, `tags`, `logs`, `tag_associations`, `log_tag_associations`, `sessions`) with field-level constraints, indexes, and pruning notes for optional columns.

2. Transform OpenAPI contract into actionable artefacts (`contracts/`):
   - Reference canonical `api.yaml`, highlight minimal response payloads and any intentional omissions.
   - Provide stub contract tests (Vitest) per endpoint group verifying HTTP codes, schema shape, and authorization guardrails.

3. Capture test-ready workflow in `quickstart.md`: sequential commands to install dependencies, run `wrangler dev` + seed D1, launch minimal frontend, and execute contract tests.

4. Update `.github/copilot-instructions.md` via `.specify/scripts/bash/update-agent-context.sh copilot` so the agent mirrors trimmed tech stack, minimal frontend rationale, and recent decisions.

**Output**: `data-model.md`, `/contracts/*` (summaries + test scaffolds), `quickstart.md`, updated Copilot agent instructions, failing-but-compiling contract test skeletons ready for implementation.

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base.
- Emit cleanup tasks first (prune directories outside allowlist, remove unused configs, update README).
- Derive backend tasks from contracts (auth, users, tags, logs) including Worker route scaffolds, validation logic, and D1 query layers.
- Derive frontend tasks from minimal Vite surface (bootstrap app shell, log list, tag filter, share action) keeping scope intentionally tiny.
- Include testing tasks: contract test suites per route group, seed verification, frontend smoke scenario, README quickstart validation.
- Flag independent subtasks (e.g., tag associations vs. log CRUD) with `[P]` for potential parallelism.

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: ~24 ordered tasks covering cleanup, backend Worker implementation, minimal frontend wiring, tests, and documentation updates.

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| [e.g., 4th project] | [current need] | [why 3 projects insufficient] |
| [e.g., Repository pattern] | [specific problem] | [why direct DB access insufficient] |


## Progress Tracking
*This checklist is updated during execution flow*

- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented

---
*Based on Constitution v2.1.1 - See `/memory/constitution.md`*
