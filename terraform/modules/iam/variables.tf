variable "name" {
  description = "The name of the IAM resource."
  type        = string

}

variable "github_repository" {
  description = "The GitHub repository associated with the IAM resource."
  type        = string
}

# variable "github_branch" {
#   type = string
# }

variable "ecr_repository_arn" {
  description = "ARN of the NepalStay ECR repository"
  type        = string
}