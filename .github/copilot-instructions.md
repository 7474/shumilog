# shumilog Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-09-26

## Active Technologies
- TypeScript (latest stable) + Cloudflare Workers, Hono (lightweight framework), Twitter OAuth API, Cloudflare D1 (SQLite), GitHub Flavored Markdown parser (001-web-x-twitter)
- TypeScript 5.2+ (latest stable), Node.js 18+ + Hono (backend), Vite (frontend), Wrangler (Cloudflare Workers), Vitest (testing) (002-docker-compose-up)
- Cloudflare D1 (SQLite) for development database with persistent volumes (002-docker-compose-up)
- TypeScript 5.2+ (latest stable), Node.js 18+ + Hono (web framework), Wrangler CLI (Cloudflare tooling), Vite (frontend), Vitest (testing) (003-web-cloudflare-cloudflare)
- Cloudflare D1 (SQLite-compatible) for both local and production (003-web-cloudflare-cloudflare)

## Project Structure
```
backend/
frontend/
tests/
```

## Commands
npm test [ONLY COMMANDS FOR ACTIVE TECHNOLOGIES][ONLY COMMANDS FOR ACTIVE TECHNOLOGIES] npm run lint

## Code Style
TypeScript (latest stable): Follow standard conventions

## Recent Changes
- 003-web-cloudflare-cloudflare: Added TypeScript 5.2+ (latest stable), Node.js 18+ + Hono (web framework), Wrangler CLI (Cloudflare tooling), Vite (frontend), Vitest (testing)
- 002-docker-compose-up: Added TypeScript 5.2+ (latest stable), Node.js 18+ + Hono (backend), Vite (frontend), Wrangler (Cloudflare Workers), Vitest (testing)
- 001-web-x-twitter: Added TypeScript (latest stable) + Cloudflare Workers, Hono (lightweight framework), Twitter OAuth API, Cloudflare D1 (SQLite), GitHub Flavored Markdown parser

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
