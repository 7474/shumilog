# Quickstart: Minimal Cloudflare Worker API Revival

Goal: Bring the trimmed repository online locally (backend Worker + minimal frontend) and verify the Hobby Content Log API contract using only offline tooling.

## Prerequisites
- Node.js 22 LTS
- npm 10+
- Wrangler CLI 3+

## 1. Install Dependencies
```bash
# Backend (Cloudflare Worker)
cd backend
npm install

# Frontend (minimal Vite UI)
cd ../frontend
npm install
```

## 2. Prepare Local Database (Cloudflare D1)
```bash
cd ../backend
# Reset + apply migrations
NO_D1_WARNING=true npx wrangler d1 migrations apply shumilog-db-dev --local --env development
# Seed deterministic fixtures (users, tags, logs)
NO_D1_WARNING=true npx wrangler d1 execute shumilog-db-dev --local --file src/db/seeds.sql.ts
```

## 3. Launch Services
```bash
# Terminal A – Cloudflare Worker API
cd backend
npm run dev:worker   # wraps `wrangler dev` with local D1 binding

# Terminal B – Minimal frontend
cd frontend
npm run dev          # starts Vite on http://localhost:5173
```

The frontend proxies API calls to `http://localhost:8787/api` during development.

## 4. Verify API Contract
```bash
# Contract + smoke tests
cd backend
npm run test:contract

# Optional: hit health endpoint
curl http://localhost:8787/health
```

## 5. Manual UI Check
1. Open http://localhost:5173
2. Confirm seeded logs render and tag filters operate.
3. Trigger the "Share" action on a log; verify success toast and API response (inspect browser console).

## 6. Shutdown
- `Ctrl+C` in both terminals.
- Optionally run `npm run clean` in backend/frontend to remove build artefacts (to be implemented during execution).
