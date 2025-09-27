# Contract: `npm run deps:policy-check`

## Purpose
Validate that every dependency listed in `docs/dependency-inventory.yaml` adheres to the maintenance policy: quarterly reviews, 60-day adoption window for LTS/stable releases, 24h/72h security SLA, and approved exceptions.

## Invocation
```
npm run deps:policy-check
```
(Invokes `tsx scripts/dependency-policy-check.ts` from repository root.)

## Inputs
| Source | Description |
|--------|-------------|
| `docs/dependency-inventory.yaml` | Canonical inventory entries (`DependencyRecord`). |
| `backend/package.json` | Actual backend dependencies (prod + dev). |
| `frontend/package.json` | Actual frontend dependencies (prod + dev). |
| `--format=json` (optional) | When provided, emits machine-readable JSON summary for CI annotations. |

## Behaviour
1. Load inventory entries and validate against schema.
2. For each dependency:
   - Compare installed version from lockfile with `targetVersion`.
   - Ensure `lastReviewedAt` ≤ 90 days old and `nextReviewDue` ≥ current date.
   - If `targetChannel = lts`, confirm installed version belongs to latest LTS line; otherwise ensure it matches latest stable.
   - Check `graceDeadline` has not passed unless `exceptionStatus = approved`.
3. Aggregate warnings and failures.
4. Print markdown table summarising compliant/non-compliant packages and pending actions.

## Exit Codes
| Code | Meaning |
|------|---------|
| `0` | All dependencies compliant with policy. |
| `1` | One or more dependencies out of compliance (version lag, overdue review, expired exception). |
| `2` | Inventory schema invalid or checker execution error. |

## Sample Output (Markdown)
```
✅ All 28 dependencies comply with quarterly review (last run: 2025-09-15)

| Workspace | Package        | Status      | Action |
|-----------|----------------|-------------|--------|
| backend   | hono           | ✅ Compliant|  
| backend   | wrangler       | ⚠️ Review due 2025-10-01 | Schedule review (grace deadline 2025-11-30)
| frontend  | @vitejs/plugin-react | ❌ Version lag (installed 4.3.2, target 4.4.0) | Upgrade within 60 days (deadline 2025-11-20)
```

## Error Handling
- Missing inventory file → exit 2 with guidance to run quarterly review template.
- Unknown workspace/package pair → exit 1; treat as policy violation (inventory incomplete).
- YAML parse failure → exit 2 with pointer to offending entry.

## Observability
- Script logs summary counts (compliant, warning, failing) and total runtime.
- When `--format=json` is passed, output includes timestamps for ingestion by CI dashboards.
