output "backend_worker_name" {
  description = "Name of the deployed Cloudflare Worker hosting the backend API."
  value       = cloudflare_workers_script.backend.name
}

output "d1_database_id" {
  description = "Identifier of the Cloudflare D1 database backing the backend API."
  value       = cloudflare_d1_database.primary.id
}

output "frontend_pages_project_name" {
  description = "Cloudflare Pages project name serving the frontend."
  value       = cloudflare_pages_project.frontend.name
}

output "backend_workers_dev_url" {
  description = "workers.dev URL serving the backend API."
  value       = local.worker_public_base_url
}

output "frontend_pages_dev_url" {
  description = "pages.dev URL serving the frontend."
  value       = local.frontend_base_url
}

output "frontend_api_base_url" {
  description = "API base URL injected into the frontend build."
  value       = local.frontend_api_base_url
}
