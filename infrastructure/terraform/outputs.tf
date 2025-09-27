output "backend_worker_name" {
  description = "Name of the deployed Cloudflare Worker hosting the backend API."
  value       = cloudflare_workers_script.backend.name
}

output "backend_route_pattern" {
  description = "Route pattern applied to the Worker within the production zone."
  value       = cloudflare_workers_route.backend.pattern
}

output "d1_database_id" {
  description = "Identifier of the Cloudflare D1 database backing the backend API."
  value       = cloudflare_d1_database.primary.id
}

output "frontend_pages_project_name" {
  description = "Cloudflare Pages project name serving the frontend."
  value       = cloudflare_pages_project.frontend.name
}

output "frontend_pages_domain" {
  description = "Primary domain assigned to the Cloudflare Pages project."
  value       = cloudflare_pages_domain.frontend.domain
}
