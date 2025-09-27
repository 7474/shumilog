# Feature Specification: Minimal Cloudflare Worker API Revival

**Feature Branch**: `003-specs-001-web`  
**Created**: 2025-09-26  
**Status**: Draft  
**Input**: User description: "全く動作しないアプリケーションになっているため specs/001-web-x-twitter/contracts/api.yaml をCloudflare Workersでのホスティング想定で動作させるための最小構成に再生します。不要なファイルは一切容赦なく削除します。READMEにあっかれた手順を踏めばローカルマシンでアプリケーションが動作することが目標です。"

## User Scenarios & Testing *(mandatory)*

### Primary User Story
As a developer tasked with reviving the project, I need to run a minimal version of the application locally via the documented Cloudflare Workers flow so that I can verify the API contract in `specs/001-web-x-twitter/contracts/api.yaml` without wrestling with broken or irrelevant components.

### Acceptance Scenarios
1. **Given** a freshly cloned repository and the prerequisites listed in the README, **When** the developer follows the documented local run steps, **Then** the API endpoints described in `api.yaml` respond successfully through the Cloudflare Workers development environment.
2. **Given** the curated project files after cleanup, **When** the developer inspects the repository structure, **Then** only the assets required for the minimal Cloudflare Worker setup remain and no deleted components are referenced by the README or runtime flow.

### Edge Cases
- Developers follow a fully local `wrangler dev` workflow without supplying Cloudflare account credentials; documentation must highlight any local-only configuration required to mimic hosted behavior.
- Any contract endpoint not yet implemented during the revival MUST return HTTP 501 with a contract-shaped error payload so clients can distinguish temporary gaps from missing routes.
- What occurs if the README prerequisites are missing tooling versions or operating-system-specific steps?

## Clarifications

### Session 2025-09-26
- Q: How should local developers handle Cloudflare credentials when running the backend? → A: Provide a fully local workflow that uses `wrangler dev` (or mocks) without any Cloudflare account credentials.
- Q: When trimming unnecessary files, how aggressively should we remove existing assets? → A: Keep only assets strictly required for the minimal Cloudflare Worker backend and the README instructions.

### Session 2025-09-27
- Q: What level of data persistence should the revived API use to satisfy the contract endpoints? → A: Cloudflare D1-backed persistence matching the original schema.
- Q: What form should the “simple validation procedure” in FR-004 take? → A: Automated Vitest contract tests runnable via npm.
- Q: What authentication posture should the revived endpoints follow? → A: All endpoints public for the minimal revival.
- Q: If a contract endpoint isn’t fully implemented yet during the minimal revival, how should the Worker respond? → A: Return HTTP 501 Not Implemented with contract-aligned error body.

## Requirements *(mandatory)*

### Functional Requirements
- **FR-001**: The project MUST expose a runnable minimal application that serves the endpoints defined in `specs/001-web-x-twitter/contracts/api.yaml` through the Cloudflare Workers local environment so that contract testing can proceed.
- **FR-002**: The README MUST provide an accurate, sequential local run guide that enables a developer to start the application from scratch and confirm API availability via documented verification steps.
- **FR-003**: The repository MUST retain only the assets strictly required for the minimal Cloudflare Worker backend and the README instructions, ensuring that removed items leave no lingering references in documentation or runtime paths.
- **FR-004**: The system MUST include automated Vitest contract tests runnable via npm that confirm API conformity after executing the README instructions, providing sample requests and expected responses for each core endpoint.
- **FR-005**: The project MUST call out any mandatory external dependencies (accounts, environment variables, tooling versions) so that developers understand what must be prepared before running the local flow, explicitly confirming that the default `wrangler dev` setup runs without Cloudflare account credentials.
- **FR-006**: The minimal backend MUST persist data using Cloudflare D1 with the schema defined for `specs/001-web-x-twitter/contracts/api.yaml`, ensuring writes survive across worker reloads.
- **FR-007**: All contract endpoints in the minimal revival MUST remain publicly accessible without authentication to mirror the public resource expectations.

### Key Entities *(include if feature involves data)*
- **Minimal Cloudflare API Surface**: Represents the subset of endpoints and behaviors from `api.yaml` that the revived application must honor, including request/response structures and success criteria.
- **Developer Runbook**: Represents the README-driven instructions, prerequisites, and validation steps that guide a developer from clone to verified API responses.
- **Cloudflare D1 Dataset**: Represents the persisted storage layer backing the revived endpoints, matching the original schema and supporting contract-required CRUD flows across sessions.

## Review & Acceptance Checklist

### Content Quality
- [ ] No implementation details (languages, frameworks, APIs)
- [ ] Focused on user value and business needs
- [ ] Written for non-technical stakeholders
- [ ] All mandatory sections completed

### Requirement Completeness
- [ ] No [NEEDS CLARIFICATION] markers remain
- [ ] Requirements are testable and unambiguous  
- [ ] Success criteria are measurable
- [ ] Scope is clearly bounded
- [ ] Dependencies and assumptions identified

## Execution Status

- [ ] User description parsed
- [ ] Key concepts extracted
- [ ] Ambiguities marked
- [ ] User scenarios defined
- [ ] Requirements generated
- [ ] Entities identified
- [ ] Review checklist passed
