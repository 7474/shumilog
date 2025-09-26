# Shumilog - Hobby Content Log Service

Minimal Cloudflare Worker backend paired with a lightweight Vite-driven frontend for logging hobby content.

## Requirements

- **Node.js 22 LTS** – `nvm use` picks up the version defined in [`.nvmrc`](./.nvmrc)
- **npm 10+** (bundled with Node 22)
- **Wrangler CLI 3+** for local Worker and D1 development (`npm install -g wrangler`)
- *(Optional)* Twitter API credentials if you plan to exercise the share endpoint

## Quick start

```bash
# Clone and enter the repository
git clone <repository-url>
cd shumilog

# Align Node/npm versions
nvm use

# Install backend and frontend dependencies
npm install --prefix backend
npm install --prefix frontend

# Seed the local D1-compatible database (creates .wrangler/state on first run)
cd backend
mkdir -p .wrangler/state/d1
DB_PATH=.wrangler/state/d1/shumilog-db.sqlite npm run db:seed

# Start the Worker locally (runs on http://127.0.0.1:8787)
npm run dev:worker
```

Open a second terminal for the frontend:

```bash
cd frontend
npm run dev
```

Access the application at:

- Frontend UI: http://localhost:5173
- REST API: http://127.0.0.1:8787
- Health check: http://127.0.0.1:8787/health

## Useful scripts

| Location | Command | Purpose |
|----------|---------|---------|
| `backend/` | `npm run dev:worker` | Run the Worker via Wrangler with local persistence |
| `backend/` | `npm run dev:server` | Node-based dev server powered by Nodemon |
| `backend/` | `npm run test:contract` | Execute the contract test suite with Vitest |
| `backend/` | `npm run db:migrate` | Apply schema changes without seed data |
| `backend/` | `npm run db:seed` | Recreate schema and load deterministic fixtures |
| `frontend/` | `npm run dev` | Launch the Vite dev server with HMR |
| `frontend/` | `npm run build` | Produce a production build into `frontend/dist/` |

## Testing & linting

```bash
# Contract tests (from backend/)
npm run test:contract

# Type checking (from backend/)
npm run build

# Lint backend sources (from backend/)
npm run lint
```

Frontend linting is intentionally omitted while the UI is rebuilt; the Vite build and React typings keep the UI in check.

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
│   └── src/pages/          # Temporary HTML entry points (React shell coming later)
├── specs/                  # Product plans, research, and task tracking
├── tests/                  # Repository-level integration smoke tests
└── README.md               # You are here
```

## Troubleshooting

- **Database path errors** → ensure the directory exists before seeding: `mkdir -p backend/.wrangler/state/d1`.
- **Wrangler complains about bindings** → delete `.wrangler/state` and rerun `npm run dev:worker` to recreate the local environment.
- **Port already in use** → override via `API_PORT` (backend) or Vite’s `--port` flag.
- **Type errors after dependency bumps** → rerun `npm install --prefix backend` / `npm install --prefix frontend` to refresh local packages.

## Contributing

1. Fork the repository
2. Create a branch: `git checkout -b feature/my-update`
3. Install dependencies and run the Worker locally
4. Make changes and ensure `npm run test:contract` passes
5. Commit with a descriptive message and open a pull request

## License

Licensed under the MIT License. See [LICENSE](./LICENSE) for details.