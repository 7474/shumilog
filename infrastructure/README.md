# Infrastructure

Terraform configuration for deploying the Shumilog backend Worker and frontend Pages project on Cloudflare lives under [`terraform/`](./terraform/).

## Contents

| Path | Purpose |
| --- | --- |
| [`terraform/`](./terraform/) | Terraform root module for Cloudflare resources |
| [`terraform/artifacts/`](./terraform/artifacts/) | Bundled Worker artifacts consumed by Terraform |
| [`terraform/terraform.tfvars.example`](./terraform/terraform.tfvars.example) | Sample variable file to copy and fill before running Terraform |

## Usage Overview

1. Install Terraform **1.7+** and the Cloudflare Terraform provider (`~> 4.40`).
2. Generate a Worker bundle using Wrangler:
   ```bash
   cd backend
   npm install
   npm run deploy -- --dry-run --out=../infrastructure/terraform/artifacts/backend-worker.mjs
   ```
3. Copy the example variable file and provide real values:
   ```bash
   cd infrastructure/terraform
   cp terraform.tfvars.example terraform.tfvars
   # edit terraform.tfvars with account, zone, domains, and secrets
   ```
4. Initialise and apply Terraform:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```

> **State storage**: The module uses the default local backend, writing `terraform.tfstate` inside `infrastructure/terraform/`. Commit the state file to version control if required, but avoid placing production secrets directly in `terraform.tfvars`.

## Cloudflare Permissions

The API token supplied via `cloudflare_api_token` must allow:

- **Workers Scripts**: `Workers Scripts` → `Edit`
- **Workers Routes**: `Workers Routes` → `Edit`
- **D1 Databases**: `Account` → `D1` → `Edit`
- **Pages Projects**: `Account` → `Pages` → `Edit`
- **Pages Domains**: `Account` → `Pages` → `Edit`

Grant the token narrowly to the target account and rotate regularly.
