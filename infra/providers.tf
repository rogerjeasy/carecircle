provider "aws" {
  region = var.region

  # Tag everything so it's easy to find (and delete) all hackathon resources.
  default_tags {
    tags = {
      Project   = var.project
      ManagedBy = "Terraform"
      Hackathon = "H0-ZeroStack"
    }
  }
}
