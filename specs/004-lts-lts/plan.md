
# Implementation Plan: Dependency Maintenance Policy and LTS Alignment

**Branch**: `[004-lts-lts]` | **Date**: 2025-09-27 | **Spec**: [specs/004-lts-lts/spec.md](specs/004-lts-lts/spec.md)
**Input**: Feature specification from `/specs/004-lts-lts/spec.md`

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
Upgrade all npm dependencies under `backend/` and `frontend/` to the latest LTS or stable releases while codifying a quarterly review policy with 60-day adoption, 72-hour security mitigation, cross-functional exception approval, and two-week stakeholder notice. Implementation will pair automated compliance checks with lightweight documentation so the hobby project can iterate quickly without incurring licensing or hosting costs.

## Technical Context
**Language/Version**: TypeScript 5.x on Node.js 22 (Workers-compatible)  
**Primary Dependencies**: Hono 4, Cloudflare Wrangler 3, React 18, Vite 5, Vitest 1.x  
**Storage**: Cloudflare D1 (SQLite-compatible) for backend persistence  
**Testing**: Vitest (unit, contract, smoke) across backend and frontend workspaces  
**Target Platform**: Cloudflare Workers backend and modern browsers for frontend  
**Project Type**: web (separate `backend/` and `frontend/` workspaces)  
**Performance Goals**: Preserve current build + test cycle under 5 minutes and avoid regressions in worker cold-start latency  
**Constraints**: Adopt new LTS within 60 days, triage security advisories within 24h/mitigate within 72h, two-week stakeholder notice lead time  
**Scale/Scope**: Hobby-scale app (<100 active users) with cost ceiling <$5/month

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

**Quick Experimentation**: Upgrading via automated tooling and scripted checks lets us validate dependency drift faster without manual diff hunting.
**Low-Cost Hosting**: Node/npm upgrades and documentation changes stay on existing free Cloudflare + GitHub tiers; no paid services introduced.
**Iterative Exploration**: We will land minimal scripts/documentation first, allowing future automation (e.g., Dependabot) as follow-ups.
**Simplicity First**: Rely on npm built-ins (npm outdated/install) plus a tiny TypeScript check script—no external dependency managers needed.
**Cost-Conscious Development**: Policy doc will include a quarterly review template to track effort; no new recurring costs anticipated.

**Status**: PASS (reviewed 2025-09-27 after Phase 1 design)

*Violations must be justified in Complexity Tracking or feature scope reduced.*

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

**Structure Decision**: Option 2 (web application: backend + frontend workspaces)

## Phase 0: Outline & Research
1. Inventory upgrade scope: catalogue current backend/frontend dependency trees and categorize them by LTS channel vs. latest stable only.
2. Confirm authoritative sources for LTS timelines (Node.js, Cloudflare Workers runtime, React/Vite schedules) and determine acceptable lag relative to release announcements.
3. Evaluate tooling approaches for synchronized upgrades: compare npm built-ins (`npm outdated`, `npm install @latest`) with npm-check-updates; choose the option with lowest overhead that works in a mono-repo with two package roots.
4. Define verification steps needed after upgrades (linters, Vitest suites, smoke build) and the minimal automation for quarterly reviews.
5. Record decisions in `research.md` using the Decision/Rationale/Alternatives format so future reviews can reuse the playbook.

**Output**: research.md capturing package upgrade strategy, tooling choices, and enforcement approach with all open questions resolved

## Phase 1: Design & Contracts
*Prerequisites: research.md complete*

1. Model the governance artifacts → `data-model.md`:
   - `DependencyRecord`: package name, workspace, current version, target channel (LTS/stable), last reviewed, owner, exception flag, notes.
   - `MaintenancePolicy`: cadence (quarterly), adoption SLA (60 days), security SLA (24h/72h), communication window (≥2 weeks), exception approver (cross-functional board).
   - Capture status transitions for dependencies (e.g., `pending-upgrade → in-progress → compliant → exception`).

2. Define enforcement contract(s) in `/contracts/`:
   - `dependency-policy-check.md`: CLI contract for a new `npm run deps:policy-check` script that inspects both workspaces, fails with non-zero exit if any dependency violates the tracked policy, and emits a markdown summary for docs.
   - `dependency-inventory-schema.json`: JSON schema describing the inventory file consumed by the check script to keep docs and automation aligned.

3. Outline failing tests:
   - Backend contract test to stub inventory entries and assert the checker throws when versions exceed grace period or miss review date.
   - Frontend smoke test to ensure policy script integrates with `npm test` workflow without adding >60s runtime.

4. Document review flow in `quickstart.md` covering: running upgrade script, executing Vitest + lint, updating inventory doc, writing quarterly summary, and notifying stakeholders two weeks ahead.

5. Update `.github/copilot-instructions.md` via `.specify/scripts/bash/update-agent-context.sh copilot` to include the new policy tooling so future assists stay consistent.

**Output**: data-model.md, `/contracts/*`, placeholder failing tests, quickstart.md, updated `.github/copilot-instructions.md`

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load `.specify/templates/tasks-template.md` as base
- Generate tasks from Phase 1 design docs (contracts, data model, quickstart)
- Each contract → contract test task [P]
- Each entity → model creation task [P] 
- Each user story → integration test task
- Implementation tasks to make tests pass

**Ordering Strategy**:
- TDD order: Tests before implementation 
- Dependency order: Models before services before UI
- Mark [P] for parallel execution (independent files)

**Estimated Output**: 25-30 numbered, ordered tasks in tasks.md

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

**Phase Status**:
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
