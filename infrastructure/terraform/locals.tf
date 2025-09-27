locals {
  backend_bundle_abspath = abspath("${path.module}/${var.backend_worker_bundle_path}")

  worker_public_base_url = coalesce(
    var.worker_public_base_url_override,
    format("https://%s.%s.workers.dev", var.backend_worker_name, var.workers_dev_subdomain)
  )

  frontend_base_url = coalesce(
    var.frontend_base_url_override,
    format("https://%s.pages.dev", var.frontend_project_name)
  )

  worker_plain_text_bindings = merge({
    ENVIRONMENT          = "production"
    APP_BASE_URL         = local.frontend_base_url
    APP_LOGIN_URL        = "${local.frontend_base_url}/login"
    TWITTER_REDIRECT_URI = "${local.worker_public_base_url}/api/auth/callback"
  }, var.worker_additional_plain_text_bindings)

  worker_secrets = {
    for name, value in {
      TWITTER_CLIENT_ID     = var.twitter_client_id
      TWITTER_CLIENT_SECRET = var.twitter_client_secret
      SESSION_SECRET        = var.session_secret
    } : name => value if value != null && trim(value) != ""
  }

  worker_secret_names = keys(local.worker_secrets)

  frontend_api_base_url = coalesce(var.frontend_api_base_url, "${local.worker_public_base_url}/api")

  frontend_preview_api_base_url = coalesce(var.frontend_preview_api_base_url, local.frontend_api_base_url)

  frontend_production_env_vars = merge({
    VITE_API_BASE_URL = local.frontend_api_base_url
  }, var.frontend_additional_env_vars)

  frontend_preview_env_vars = merge({
    VITE_API_BASE_URL = local.frontend_preview_api_base_url
  }, var.frontend_preview_additional_env_vars)
}
