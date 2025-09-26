# Data Model: Cloudflare Workers & D1 Deployment Architecture

**Date**: 2025-09-26  
**Feature**: 003-web-cloudflare-cloudflare

## Overview

This document defines the data entities and configuration structures required for implementing Cloudflare Workers deployment architecture with D1 database integration.

## Configuration Entities

### DevContainer Configuration
**Purpose**: Defines the isolated development environment setup
**Location**: `.devcontainer/devcontainer.json`

**Fields**:
- `image`: Base container image with Node.js 18+
- `features`: Required development tools (Wrangler CLI, TypeScript)
- `extensions`: VS Code extensions for Cloudflare development
- `forwardPorts`: Local development server ports (8787)
- `mounts`: Volume mappings for code and persistent data
- `postCreateCommand`: Environment setup scripts

**Validation Rules**:
- Image must support Node.js 18+
- Must include Wrangler CLI installation
- Port 8787 must be forwarded for Wrangler dev server

### Wrangler Configuration
**Purpose**: Defines Cloudflare Workers and D1 database bindings
**Location**: `backend/wrangler.toml`

**Fields**:
- `name`: Worker application name
- `main`: Entry point TypeScript file
- `compatibility_date`: Cloudflare Workers API version
- `env.development.d1_databases`: Local D1 database configuration
- `env.production.d1_databases`: Production D1 database configuration
- `env.development.vars`: Development environment variables
- `env.production.vars`: Production environment variables

**Validation Rules**:
- Database bindings must exist for both development and production
- Environment-specific variables must not overlap
- Compatibility date must be recent (within 6 months)

### Environment Configuration
**Purpose**: Environment-specific settings and secrets
**Location**: `.env.development`, `.env.production` (local), Wrangler secrets (production)

**Fields**:
- `ENVIRONMENT`: "development" or "production"
- `DB_PATH`: Local database file path (development only)
- `TWITTER_CLIENT_ID`: OAuth application ID (secret)
- `TWITTER_CLIENT_SECRET`: OAuth application secret (secret)
- `SESSION_SECRET`: Session encryption key (secret)
- `TWITTER_REDIRECT_URI`: OAuth callback URL

**Validation Rules**:
- Secrets must never be committed to version control
- Development and production must have separate OAuth applications
- Redirect URIs must match environment domains

## Database Schema Entities

### Migration Schema
**Purpose**: Database schema versioning and rollback support
**Location**: `backend/migrations/`

**Fields**:
- `version`: Migration version number (timestamp or sequential)
- `up_script`: SQL commands to apply migration
- `down_script`: SQL commands to rollback migration
- `description`: Human-readable migration description
- `applied_at`: Timestamp when migration was applied

**Validation Rules**:
- Version numbers must be unique and sequential
- All migrations must have corresponding rollback scripts
- Migration scripts must be compatible with SQLite/D1

### Health Check Schema
**Purpose**: Application and database connectivity verification
**Location**: Database table and API endpoint

**Fields**:
- `check_type`: Type of health check ("database", "application")
- `status`: Check result ("healthy", "unhealthy", "degraded")
- `timestamp`: When check was performed
- `details`: Additional check information
- `response_time`: Check execution time in milliseconds

**Validation Rules**:
- Checks must complete within 5 seconds
- Status must be one of predefined values
- Response times must be recorded for performance monitoring

## Development Workflow Entities

### Local Development State
**Purpose**: Track local development environment status
**Location**: Local filesystem and memory

**Fields**:
- `wrangler_dev_pid`: Process ID of running dev server
- `database_status`: Local D1 emulation status
- `last_migration`: Last applied migration version
- `hot_reload_enabled`: Whether hot-reload is active
- `port_bindings`: Active port forwarding configuration

**State Transitions**:
- `stopped` → `starting` → `running` → `stopping` → `stopped`
- `running` → `reloading` → `running` (hot-reload cycle)
- Error states: `failed_start`, `crashed`, `migration_failed`

### Deployment State
**Purpose**: Track deployment process and rollback capability
**Location**: Cloudflare Workers dashboard and local deployment logs

**Fields**:
- `deployment_id`: Unique deployment identifier
- `worker_version`: Deployed code version/commit hash
- `migration_version`: Applied database migration version
- `deployment_status`: Current deployment state
- `rollback_target`: Previous successful deployment ID
- `health_check_status`: Post-deployment verification result

**State Transitions**:
- `preparing` → `deploying` → `migrating` → `verifying` → `active`
- Rollback: `active` → `rolling_back` → `active` (previous version)
- Error states: `deploy_failed`, `migration_failed`, `health_check_failed`

## Configuration Relationships

### Environment to Database Binding
- Development environment → Local D1 emulation
- Production environment → Cloudflare D1 instance
- Both environments → Identical schema structure
- Migration scripts → Compatible with both environments

### DevContainer to Wrangler Integration
- DevContainer provides Wrangler CLI installation
- DevContainer mounts enable Wrangler configuration access
- Port forwarding enables local development server access
- Volume persistence maintains local database state

### Secret Management Flow
- Development: Local environment files (excluded from git)
- Production: Wrangler secret commands → Cloudflare KV storage
- Application: Environment-specific secret access patterns
- Rotation: Independent secret rotation per environment

## Validation and Constraints

### Performance Constraints
- Local development startup: <10 seconds
- Hot-reload response: <2 seconds
- Database migration execution: <30 seconds
- Health check response: <5 seconds

### Security Constraints
- Secrets never stored in version control
- Environment separation enforced at configuration level
- OAuth redirect URI validation per environment
- Local development isolated within container

### Operational Constraints
- Free tier resource limits respected
- Cloudflare Workers runtime compatibility maintained
- D1 operation limits and patterns followed
- Configuration drift prevention through versioning

## Testing Entities

### Contract Test Schema
**Purpose**: Verify API contract compliance across environments
**Location**: `backend/tests/contract/`

**Fields**:
- `endpoint`: API endpoint being tested
- `method`: HTTP method (GET, POST, PUT, DELETE)
- `request_schema`: Expected request format
- `response_schema`: Expected response format
- `status_codes`: Valid HTTP status codes
- `environment`: Which environment the test applies to

### Integration Test Schema  
**Purpose**: End-to-end workflow validation
**Location**: `backend/tests/integration/`

**Fields**:
- `test_scenario`: User workflow being tested
- `setup_steps`: Required environment preparation
- `test_steps`: Sequence of actions to perform
- `expected_outcomes`: Success criteria
- `cleanup_steps`: Environment cleanup procedures
- `dependencies`: Required external services or data

This data model provides the foundation for implementing consistent development and deployment workflows while maintaining environment separation and operational simplicity.