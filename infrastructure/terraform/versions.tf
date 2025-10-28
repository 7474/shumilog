terraform {
  required_version = ">= 1.7.0"

  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 5.10"
    }
  }

  backend "local" {
    path = "terraform.tfstate"
  }
}
