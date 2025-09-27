# Worker Artifact Placeholder

Terraform expects the compiled backend Worker bundle at `backend-worker.mjs`.

Generate the file with:

```bash
cd backend
npm install
npm run deploy -- --dry-run --outfile ../infrastructure/terraform/artifacts/backend-worker.mjs
```

The generated artifact is safe to commit when publishing infrastructure changes. Rebuild whenever backend code changes.
