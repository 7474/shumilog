locals {
  worker_public_base_url = format("https://%s.%s.workers.dev", var.backend_worker_name, var.workers_dev_subdomain)

  frontend_api_base_url = "${local.worker_public_base_url}/api"

  frontend_preview_api_base_url = local.frontend_api_base_url

  frontend_production_env_vars = merge({
    VITE_API_BASE_URL = local.frontend_api_base_url
  }, var.frontend_additional_env_vars)

  frontend_preview_env_vars = merge({
    VITE_API_BASE_URL = local.frontend_preview_api_base_url
  }, var.frontend_preview_additional_env_vars)
}
