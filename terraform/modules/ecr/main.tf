resource "aws_ecr_repository" "this" {
  name                 = var.repository_name
  image_tag_mutability = "MUTABLE" # this allows you to overwrite existing image tags
  image_scanning_configuration {
    scan_on_push = true # this enables image scanning on push
  }
  encryption_configuration {
    encryption_type = "AES256" # this enables encryption at rest using AES-256
  }
}

# Harden ECR
resource "aws_ecr_lifecycle_policy" "this" {
  repository = aws_ecr_repository.this.name
  policy = jsonencode({
    rules = [
      {
        rulePriority = 1
        description  = "keep the last 20 images"
        selection = {
          tagStatus   = "any"
          countType   = "imageCounterMoreThan"
          countNumber = 20
        }
        action = {
          type = "expire"
        }
      }
    ]
  })
}

