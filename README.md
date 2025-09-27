# Shumilog - Hobby Content Log Service

Minimal Cloudflare Worker backend paired with a lightweight Vite-driven frontend for logging hobby content.

## Requirements

- **Node.js 22 LTS** – `nvm use` picks up the version defined in [`.nvmrc`](./.nvmrc)
- **npm 10+** (bundled with Node 22)
- **Wrangler CLI 3+** for local Worker and D1 development (`npm install -g wrangler`)
- *(Optional)* Twitter API credentials if you plan to exercise the share endpoint

## Quickstart

### 1. Install dependencies

```bash
git clone <repository-url>
cd shumilog
nvm use

npm install --prefix backend
npm install --prefix frontend
```

### 2. Prepare the local database (Cloudflare D1)

```bash
cd backend
NO_D1_WARNING=true npx wrangler d1 migrations apply shumilog-db-dev --local --env development
NO_D1_WARNING=true npx wrangler d1 execute shumilog-db-dev --local --file src/db/seeds.sql
```

### 3. Run the stack locally

- **Terminal A – Worker API**

  ```bash
  cd backend
  npm run dev:worker
  ```

- **Terminal B – Frontend UI**

  ```bash
  cd frontend
  npm run dev
  ```

The frontend proxies `/api` requests to `http://localhost:8787`, matching the Worker dev server.

### 4. Validate the setup

```bash
# In backend/
npm run test:contract

# In frontend/
npm run test:smoke
```

Manual checks:

- Frontend UI → http://localhost:5173
- Health check → http://localhost:8787/health
- Public logs API → http://localhost:8787/api/logs

## Useful scripts

| Location | Command | Purpose |
|----------|---------|---------|
| `backend/` | `npm run dev:worker` | Run the Worker via Wrangler with local D1 persistence |
| `backend/` | `npm run test:contract` | Execute the API contract suite with Vitest |
| `backend/` | `npm run db:migrate` | Apply migrations without reseeding |
| `backend/` | `npm run db:seed` | Recreate schema and load deterministic fixtures |
| `frontend/` | `npm run dev` | Launch the Vite dev server with HMR + API proxy |
| `frontend/` | `npm run build` | Produce a production build into `frontend/dist/` |
| `frontend/` | `npm run test:smoke` | Run the minimal UI smoke test harness |

## Testing & linting

```bash
# API contract tests (backend/)
npm run test:contract

# Frontend smoke tests (frontend/)
npm run test:smoke

# Type checking (backend/)
npm run build

# Lint backend sources (backend/)
npm run lint
```

Frontend linting will be introduced in Phase 3.7 (see `specs/003-specs-001-web/tasks.md`); for now, React typings and the smoke harness cover UI regression checks.

## Project structure

```
shumilog/
├── backend/                # Cloudflare Worker + D1 logic
│   ├── src/
│   │   ├── routes/         # Hono route handlers
│   │   ├── services/       # Domain services
│   │   ├── models/         # Data models
│   │   └── db/             # Migration + seed helpers
│   └── tests/              # Contract, integration, and unit suites
├── frontend/               # Minimal Vite surface for manual validation
│   ├── src/App.tsx         # React log list + share UI
│   ├── src/main.tsx        # React entry point wired to Vite
│   └── src/services/       # API client helpers for the Worker backend
├── specs/                  # Product plans, research, and task tracking
├── tests/                  # Repository-level integration smoke tests
└── README.md               # You are here
```

## Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feature/my-update`
3. Install dependencies and run the Worker locally
4. Make changes and ensure `npm run test:contract` passes
5. Commit with a descriptive message and open a pull request

## License

Licensed under the MIT License. See [LICENSE](./LICENSE) for details.