resource "cloudflare_d1_database" "primary" {
  account_id = var.cloudflare_account_id
  name       = var.d1_database_name
}

resource "cloudflare_worker" "backend" {
  account_id = var.cloudflare_account_id
  name       = var.backend_worker_name
}

resource "cloudflare_pages_project" "frontend" {
  account_id        = var.cloudflare_account_id
  name              = var.frontend_project_name
  production_branch = var.frontend_production_branch

  build_config = {
    build_command   = "npm ci && npm run build"
    destination_dir = "dist"
    root_dir        = "frontend"
  }

  deployment_configs = {
    production = {
      environment_variables = local.frontend_production_env_vars
    }
    preview = {
      environment_variables = local.frontend_preview_env_vars
    }
  }
}
