resource "cloudflare_d1_database" "primary" {
  account_id = var.cloudflare_account_id
  name       = var.d1_database_name
}

resource "cloudflare_workers_script" "backend" {
  account_id          = var.cloudflare_account_id
  name                = var.backend_worker_name
  content             = file(local.backend_bundle_abspath)
  module              = true
  compatibility_date  = var.worker_compatibility_date
  compatibility_flags = var.worker_compatibility_flags

  d1_database_binding {
    name        = "DB"
    database_id = cloudflare_d1_database.primary.id
  }

  dynamic "plain_text_binding" {
    for_each = local.worker_plain_text_bindings
    content {
      name = plain_text_binding.key
      text = plain_text_binding.value
    }
  }
}

resource "cloudflare_workers_secret" "backend" {
  for_each    = toset(local.worker_secret_names)
  account_id  = var.cloudflare_account_id
  script_name = cloudflare_workers_script.backend.name
  name        = each.value
  secret_text = local.worker_secrets[each.value]
}

resource "cloudflare_workers_route" "backend" {
  zone_id     = var.cloudflare_zone_id
  pattern     = var.backend_route_pattern
  script_name = cloudflare_workers_script.backend.name
}

resource "cloudflare_pages_project" "frontend" {
  account_id        = var.cloudflare_account_id
  name              = var.frontend_project_name
  production_branch = var.frontend_production_branch

  build_config {
    build_command   = var.frontend_build_command
    destination_dir = var.frontend_destination_dir
    root_dir        = var.frontend_root_dir
  }

  deployment_configs {
    production {
      environment_variables = local.frontend_production_env_vars
    }

    preview {
      environment_variables = local.frontend_preview_env_vars
    }
  }
}

resource "cloudflare_pages_domain" "frontend" {
  account_id   = var.cloudflare_account_id
  project_name = cloudflare_pages_project.frontend.name
  domain       = var.frontend_domain
}
