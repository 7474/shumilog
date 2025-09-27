# Phase 0 Research — Dependency Maintenance Policy and LTS Alignment

## Decision 1: Prefer npm core tooling for upgrades
- **Decision**: Use `npm outdated` + `npm install @latest` (backend/frontend separately) with lockfile regeneration instead of introducing npm-check-updates.
- **Rationale**: Core tooling keeps workflow lightweight, aligns with Simplicity First, and avoids new transitive updates or licensing quirks. The two workspaces can be upgraded independently while sharing the same Node runtime constraints.
- **Alternatives considered**: `npx npm-check-updates -u` (adds extra dependency and requires separate install), `pnpm dlx` tooling (increases cognitive load), custom scripts (more maintenance).

## Decision 2: Track dependency inventory in a single YAML document
- **Decision**: Author `docs/dependency-inventory.yaml` describing every package, workspace, current version, target channel (LTS/stable), owner, last-reviewed date, and exception reason.
- **Rationale**: Human-readable YAML satisfies the spec’s centralized inventory requirement, is easy to diff in git, and stays cost-free. YAML supports comments for guidance and can be parsed by the planned policy checker.
- **Alternatives considered**: Markdown tables (harder for automation), JSON (less friendly for manual edits), Cloud storage (violates low-cost and simplicity principles).

## Decision 3: Build a shared TypeScript policy checker executed via npm script
- **Decision**: Add `scripts/dependency-policy-check.ts` in the repository root (compiled with `tsx`) to load the YAML inventory, inspect `package.json` files, and enforce cadence/SLA rules with actionable console output.
- **Rationale**: A single script keeps enforcement DRY, can be invoked from CI/CD and both workspaces, and lets us codify the 60-day grace, 24h/72h security SLA, and quarterly review deadlines.
- **Alternatives considered**: Separate scripts per workspace (duplicated logic), shell scripts (harder to validate dates), relying solely on documentation (no automated gating).

## Decision 4: Document governance in `docs/dependency-policy.md`
- **Decision**: Create a concise policy document summarizing cadence, grace periods, exception process, and communication checklist with links to inventory + checker usage.
- **Rationale**: Written guidance satisfies stakeholder communication requirements and supports the two-week notice rule by providing a repeatable template each quarter.
- **Alternatives considered**: Inline README updates (less discoverable), wiki pages (out of repo), ad-hoc issues (lose historical context).
