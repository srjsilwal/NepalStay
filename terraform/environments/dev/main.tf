module "vpc" {
  source   = "../../modules/vpc"
  name     = "nepalstay-dev"
  vpc_cidr = "10.0.0.0/16"
  availability_zones = [
    "us-east-1a",
    "us-east-1b"
  ]

  public_subnet_cidrs = [
    "10.0.1.0/24",
    "10.0.2.0/24"
  ]

  private_subnet_cidrs = [
    "10.0.11.0/24",
    "10.0.12.0/24"
  ]
}

module "ecr" {
  source = "../../modules/ecr"

  repository_name = "nepalstay"
}

module "iam" {
  source = "../../modules/iam"

  name               = "nepalstay-dev"
  github_repository  = "srjsilwal/NepalStay"
  ecr_repository_arn = module.ecr.repository_arn
  github_branch      = "main"
}

module "eks" {
  source = "../../modules/eks"

  cluster_name    = "nepalstay-dev"
  cluster_version = "1.33"
  subnet_ids      = module.vpc.private_subnet_ids

  cluster_role_arn = module.iam.cluster_role_arn
  node_role_arn    = module.iam.node_role_arn
}


