# shumilog Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-01-08

## Active Technologies
- TypeScript (latest stable) + Cloudflare Workers, Hono (lightweight framework), Twitter OAuth API, Cloudflare D1 (SQLite), GitHub Flavored Markdown parser (001-web-x-twitter)
- TypeScript 5.2+ (latest stable), Node.js 18+ + Hono (backend), Vite (frontend), React (frontend), Wrangler (Cloudflare Workers), Vitest (testing) (002-docker-compose-up)
- Cloudflare D1 (SQLite) for development database with persistent volumes (002-docker-compose-up)
- TypeScript 5.2+ (latest stable), Node.js 18+ + Hono (web framework), Wrangler CLI (Cloudflare tooling), Vite (frontend), Vitest (testing) (003-web-cloudflare-cloudflare)
- Cloudflare D1 (SQLite-compatible) for both local and production (003-web-cloudflare-cloudflare)
- TypeScript 5.2+ (Cloudflare Workers runtime) + Hono (HTTP routing), Wrangler CLI, Cloudflare D1 binding, Vite (frontend dev server) (003-specs-001-web)
- Cloudflare D1 (SQLite) with seed data for logs/tags/users (003-specs-001-web)

## Project Structure
```
api/                    # Canonical API specifications (source of truth)
backend/
frontend/
tests/
```

## API Development Guidelines
- The canonical API specification is at `/api/v1/openapi.yaml` - this MUST be kept current
- Always update the API specification before implementing changes
- Contract tests should reference the canonical specification
- The specification is the source of truth for all API development

## Commands
npm test [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] npm run lint

## Code Style
TypeScript (latest stable): Follow standard conventions

## Recent Changes
- 003-specs-001-web: Added TypeScript 5.2+ (Cloudflare Workers runtime) + Hono (HTTP routing), Wrangler CLI, Cloudflare D1 binding, Vite (frontend dev server)
- 003-web-cloudflare-cloudflare: Added TypeScript 5.2+ (latest stable), Node.js 18+ + Hono (web framework), Wrangler CLI (Cloudflare tooling), Vite (frontend), Vitest (testing)
- 002-docker-compose-up: Added TypeScript 5.2+ (latest stable), Node.js 18+ + Hono (backend), Vite (frontend), Wrangler (Cloudflare Workers), Vitest (testing)

<!-- MANUAL ADDITIONS START -->
## API Specification Maintenance

The canonical API specification is located at `/api/v1/openapi.yaml` and serves as the **source of truth** for all API development. This specification MUST be continuously maintained and kept current with the actual implementation.

### When making API changes:
1. Update `/api/v1/openapi.yaml` first
2. Update contract tests to match the specification
3. Implement the API changes in the backend
4. Verify implementation matches specification with `npm run test:contract`

### Key points:
- Always reference the canonical specification at `/api/v1/openapi.yaml`
- The old location at `specs/001-web-x-twitter/contracts/api.yaml` is deprecated
- Contract tests should validate against the canonical specification
- The specification should be updated whenever API endpoints, schemas, or behaviors change
<!-- MANUAL ADDITIONS END -->
