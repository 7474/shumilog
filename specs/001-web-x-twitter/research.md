# Research: Hobby Content Review Logging Service

## Technology Stack Decisions

### Language & Runtime
**Decision**: TypeScript on Cloudflare Workers
**Rationale**: 
- TypeScript provides type safety for complex data structures (content metadata, reviews)
- Cloudflare Workers offers generous free tier (100k requests/day) aligning with cost-conscious development
- Edge computing provides global low latency for mobile users
- Familiar web technologies enable rapid prototyping
**Alternatives considered**: 
- Node.js on traditional hosting (higher cost, server management overhead)
- Python with FastAPI (less cost-effective on serverless platforms)
- Go (steeper learning curve, less ecosystem for rapid prototyping)

### Web Framework
**Decision**: Hono for Cloudflare Workers
**Rationale**:
- Lightweight (~10KB), designed specifically for edge runtime environments
- Express-like API for familiar development experience
- Built-in TypeScript support and excellent performance
- Active community and good documentation
**Alternatives considered**:
- itty-router (more minimal but less feature-complete)
- Workers without framework (too low-level for rapid development)
- Express.js (not optimized for Workers environment)

### Database & Storage
**Decision**: Cloudflare D1 (SQLite) for primary data, KV for sessions/cache
**Rationale**:
- D1 offers generous free tier (5 GB storage, 25 million reads/month)
- SQLite provides ACID transactions for data consistency
- KV store perfect for session management and caching
- Both integrate seamlessly with Workers runtime
**Alternatives considered**:
- PostgreSQL on external hosting (higher cost, complexity)
- Cloudflare R2 with JSON files (no relational queries, consistency issues)
- PlanetScale (free tier discontinued, cost concerns)

### Authentication
**Decision**: Twitter OAuth 2.0 with PKCE
**Rationale**:
- Target audience (otaku community) heavily uses Twitter/X
- OAuth eliminates password management and security concerns
- PKCE flow secure for browser-based applications
- Twitter API provides user profile information for personalization
**Alternatives considered**:
- Email/password (higher development complexity, security risks)
- GitHub OAuth (less relevant for target audience)
- Magic links (email delivery reliability concerns)

### Content Processing
**Decision**: marked.js for GitHub Flavored Markdown, DOMPurify for sanitization
**Rationale**:
- marked.js lightweight, extensible, supports GFM extensions
- DOMPurify prevents XSS attacks on user-generated content
- Both libraries work in Workers environment
- Good performance for mobile users
**Alternatives considered**:
- remark (larger bundle size, overkill for basic needs)
- Server-side only processing (poor user experience)
- Custom markdown parser (reinventing the wheel)

### Development Environment
**Decision**: Dev Containers with VS Code
**Rationale**:
- Consistent development environment across team members
- Includes all necessary tools pre-configured
- Isolation prevents conflicts with host system
- Easy onboarding for new contributors
**Alternatives considered**:
- Local development setup (inconsistent environments)
- Docker Compose (more complex for single developer)
- Cloud development environments (cost and latency concerns)

### AI Integration (Future)
**Decision**: Deferred to future iterations - start with manual content linking
**Rationale**:
- AI services add cost and complexity contradicting constitution principles
- Manual Wikipedia/official site linking sufficient for MVP
- Can evaluate cost-effective AI options (OpenAI free tier, local models) later
**Alternatives considered**:
- OpenAI API (cost concerns for hobby project)
- Local LLM (resource intensive, edge runtime limitations)
- Wikipedia API only (limited metadata richness)

## External Service Dependencies

### Twitter API
- **Cost**: Free tier available with usage limits
- **Integration**: OAuth 2.0 for auth, REST API for posting
- **Rate limits**: 15 requests/15 min for auth, posting limits apply
- **Backup plan**: Graceful degradation if API unavailable

### Wikipedia API
- **Cost**: Free with rate limiting
- **Integration**: Search and page content APIs
- **Rate limits**: Reasonable for hobby use (100 req/sec burst)
- **Backup plan**: Cached responses, manual links fallback

### Cloudflare Services
- **Workers**: 100k requests/day free
- **D1**: 5 GB storage, 25M reads/month free  
- **KV**: 10 GB storage, 10M reads/month free
- **R2** (future): 10 GB storage/month free
- **Total estimated cost**: $0-5/month for hobby scale

## Architecture Patterns

### Serverless-First Design
**Pattern**: Function-per-endpoint with shared utilities
**Rationale**: Aligns with Cloudflare Workers execution model, enables independent scaling
**Implementation**: Route handlers as separate modules, shared database/auth utilities

### Content-Centric Data Model
**Pattern**: Normalized content metadata with flexible review associations
**Rationale**: Supports requirement for content-focused browsing over user-focused feeds
**Implementation**: Content entities as first-class objects, reviews as many-to-one relationships

### Progressive Enhancement
**Pattern**: Server-side rendering with client-side enhancement
**Rationale**: Mobile-first approach, works without JavaScript, improves performance
**Implementation**: HTML forms for core functionality, JavaScript for UX improvements