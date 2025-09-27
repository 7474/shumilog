# Local Worker & D1 Operations

This guide expands on the project quickstart to focus on day-to-day commands for running the Cloudflare Worker locally with a persistent Cloudflare D1 database. Everything here runs without Cloudflare credentials and assumes development from the repository root.

## Prerequisites

- Node.js 22 LTS (`nvm use` reads `.nvmrc`)
- npm 10+
- Wrangler CLI 3+ (`npm install -g wrangler`)
- (Optional) Twitter API credentials if you plan to exercise the `/logs/{id}/share` endpoint for real

## Environment Layout

```
shumilog/
├── backend/
│   ├── wrangler.toml        # Worker + D1 binding configuration
│   ├── .wrangler/state/     # Local Wrangler state & D1 files (created on demand)
│   └── src/db/              # Migration + seed scripts
└── docs/local-worker.md     # This guide
```

The `wrangler.toml` file defines the `shumilog-db-dev` D1 binding and persists data to `backend/.wrangler/state`. Delete that folder to reset the database.

## Common Commands

Run all commands from the repository root unless noted.

### 1. Install dependencies (once per clone)

```bash
npm install --prefix backend
npm install --prefix frontend
```

### 2. Apply migrations & seeds

```bash
cd backend
NO_D1_WARNING=true npx wrangler d1 migrations apply shumilog-db-dev --local --env development
NO_D1_WARNING=true npx wrangler d1 execute shumilog-db-dev --local --file src/db/seeds.sql.ts
```

- `migrations apply`: ensures schema matches `src/db/schema.sql.ts`
- `execute ... seeds.sql.ts`: loads deterministic fixtures for tests/UI smoke checks

> **Tip:** After updating migrations or seed data, rerun both commands to keep the local D1 in sync.

### 3. Launch local services

- **Worker API (Cloudflare runtime)**
  ```bash
  cd backend
  npm run dev:worker
  ```
  Wrangler serves the Worker on <http://localhost:8787> and binds the D1 database.

- **Frontend (Vite)**
  ```bash
  cd frontend
  npm run dev
  ```
  The dev server proxies `/api` calls to <http://localhost:8787/api>.

### 4. Run automated checks

```bash
# Contract tests (backend)
cd backend
npm run test:contract

# Frontend smoke test (jsdom)
cd ../frontend
npm run test:smoke
```

These tests rely on the deterministic D1 seed data; re-run the seed script if fixtures drift.

## Database Operations

### Inspect data interactively

```bash
cd backend
NO_D1_WARNING=true npx wrangler d1 execute shumilog-db-dev --local --command "SELECT * FROM logs LIMIT 5"
```

Use any SQL supported by SQLite; omit `--command` and pass `--file` to execute a saved script.

### Reset the database

```bash
cd backend
rm -rf .wrangler/state
NO_D1_WARNING=true npx wrangler d1 migrations apply shumilog-db-dev --local --env development
NO_D1_WARNING=true npx wrangler d1 execute shumilog-db-dev --local --file src/db/seeds.sql.ts
```

Deleting `.wrangler/state` clears all persisted data and forces Wrangler to recreate the local environment.

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `SqliteFailure` errors about missing tables | Re-run the migrations command; schema may be outdated. |
| Seed data missing (tests fail with 404) | Re-run the seed script or reset the `.wrangler/state` directory. |
| Worker fails to start due to binding errors | Delete `.wrangler/state`, then restart `npm run dev:worker`. |
| Ports 5173 or 8787 already in use | Stop conflicting processes or run `npm run dev -- --port <alt>` (frontend) / `npm run dev:worker -- --port <alt>` (backend). |

## Next Steps

- After modifying schema or seeds, update `backend/src/db/schema.sql.ts` and `backend/src/db/seeds.sql.ts`, then run the commands above.
- Keep `docs/local-worker.md` aligned with `specs/003-specs-001-web/tasks.md` as Phase 3.7 progresses.
