variable "cloudflare_account_id" {
  description = "Cloudflare account identifier used for Workers, D1, and Pages resources."
  type        = string
}

variable "backend_worker_name" {
  description = "Name of the Worker service hosting the backend API."
  type        = string
  default     = "shumilog-backend"
}

variable "d1_database_name" {
  description = "Primary D1 database name used by the backend Worker."
  type        = string
  default     = "shumilog-db"
}

variable "frontend_project_name" {
  description = "Cloudflare Pages project name used for the frontend."
  type        = string
  default     = "shumilog-frontend"
}

variable "frontend_production_branch" {
  description = "Git branch used for production deployments in Cloudflare Pages."
  type        = string
  default     = "master"
}

variable "workers_dev_subdomain" {
  description = "workers.dev subdomain configured on the Cloudflare account (e.g. shumilog)."
  type        = string
}

variable "frontend_additional_env_vars" {
  description = "Extra environment variables for the production Cloudflare Pages environment."
  type        = map(string)
  default     = {}
}

variable "frontend_preview_additional_env_vars" {
  description = "Extra environment variables for preview Cloudflare Pages deployments."
  type        = map(string)
  default     = {}
}