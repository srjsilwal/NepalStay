terraform {
  required_version = ">= 1.6.0"
  backend "s3" {
    bucket       = "nepalstay-terraform-state"
    key          = "nepalstay/dev/terraform.tfstate"
    region       = "us-east-1"
    use_lockfile = true
    encrypt      = true
  }
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  default_tags {
    tags = {
      Project     = "NepalStay"
      Environment = "dev"
      ManagedBy   = "Terraform"
    }
  }
}