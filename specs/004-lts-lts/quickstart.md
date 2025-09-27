# Quickstart — Dependency Maintenance Policy Review

## 1. Prepare environment
1. Ensure Node.js 22.x and npm 10.x are installed (`node --version`).
2. Install dependencies per workspace:
   - `cd backend && npm install`
   - `cd ../frontend && npm install`
3. Return to repository root before running policy scripts.

## 2. Run quarterly dependency review
1. From repo root, generate outdated report for each workspace:
   - `cd backend && npm outdated && cd ..`
   - `cd frontend && npm outdated && cd ..`
2. Upgrade packages to the latest LTS or stable:
   - `cd backend && npm install <package>@latest`
   - `cd frontend && npm install <package>@latest`
3. Regenerate lockfiles automatically via `npm install` after editing `package.json`.

## 3. Execute compliance checks
1. Update `docs/dependency-inventory.yaml` with new versions, review dates, and grace deadlines.
2. Run the automated policy checker:
   - `npm run deps:policy-check`
3. Expect exit code `0` when all dependencies comply. Non-zero exit prints a table listing required actions.

## 4. Validate builds and tests
1. Backend: `cd backend && npm run lint && npm test`
2. Frontend: `cd frontend && npm run lint && npm test`
3. Optional smoke: `npm run test:smoke` (frontend) and contract suites in backend.

## 5. Communicate changes
1. If upgrades will land in production, schedule stakeholder notice ≥14 days ahead using the policy template.
2. Record summary in `docs/dependency-policy.md` (review date, owners, exceptions, planned rollout window).
3. Notify cross-functional review board for any exception approvals and log outcome in inventory notes.

## 6. Post-review checklist
- Commit updated `package.json`, lockfiles, inventory YAML, and policy doc.
- Ensure CI includes `npm run deps:policy-check` before deployment steps.
- Set reminders for next quarterly review (`nextReviewDue` values).
