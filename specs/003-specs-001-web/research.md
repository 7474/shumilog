# Phase 0 Research: Minimal Cloudflare Worker API Revival

## 1. Offline Cloudflare Worker + D1 Workflow
- **Decision**: Use `wrangler dev` with a local D1 binding, seeded through `wrangler d1 migrations apply` and `wrangler d1 execute` commands scripted in the README.
- **Rationale**: Provides an entirely credential-free workflow that mirrors production bindings while keeping setup steps reproducible and scriptable for hobby contributors.
- **Alternatives Considered**:
  - **Remote Cloudflare account bindings**: Rejected due to credential requirements and cost risk.
  - **In-memory mock storage**: Rejected because it diverges from future deployment expectations and complicates contract validation.

## 2. Minimal Schema & Seed Strategy
- **Decision**: Retain only the D1 tables/columns necessary to satisfy the OpenAPI contract (users, tags, logs, tag associations, log tag associations, sessions) and ship a compact seed SQL that exercises every endpoint.
- **Rationale**: Keeps migrations understandable, data volume tiny, and ensures contract tests have deterministic fixtures for validation.
- **Alternatives Considered**:
  - **Full legacy schema**: Rejected because it preserves unused baggage and slows iteration.
  - **Schema-less KV storage**: Rejected due to mismatch with relational queries (filters, associations) defined in the contract.

## 3. Hono Route Layout for Contract Fidelity
- **Decision**: Mirror `api.yaml` path groups in Hono routers (`/auth`, `/users`, `/tags`, `/logs`) with shared middleware for session validation and error normalization.
- **Rationale**: Aligns code structure with contract organization, simplifies test mapping, and keeps Worker runtime lightweight.
- **Alternatives Considered**:
  - **Single-file router**: Rejected for readability and scalability concerns.
  - **Heavy framework swap (e.g., Express via Miniflare)**: Rejected as unnecessary complexity within Workers.

## 4. Minimal Frontend Verification Surface
- **Decision**: Deliver a trimmed Vite React view that lists logs and tags via the Worker API and exposes a manual "share" trigger, with all other historical pages removed.
- **Rationale**: Provides a sanity check for backend endpoints, honours the "frontend runs locally" ask, and keeps bundle size and dependencies minimal.
- **Alternatives Considered**:
  - **No frontend**: Rejected given the explicit requirement for a runnable frontend experience.
  - **Full legacy SPA**: Rejected due to maintenance overhead and deviation from cost-conscious goals.

## 5. Repository Pruning Process
- **Decision**: Define an allowlist (backend Worker, minimal frontend, specs/tests/docs needed by README) and delete everything else, followed by CI/test sweeps to ensure no dangling references.
- **Rationale**: Enforces Option A clarification, reduces cognitive load, and shortens install/test times.
- **Alternatives Considered**:
  - **Gradual deprecation**: Rejected; leaves dead code and documentation drift.
  - **Git submodule archival**: Rejected as overkill for a hobby project and adds maintenance complexity.
