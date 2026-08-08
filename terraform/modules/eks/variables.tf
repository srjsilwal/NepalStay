variable "cluster_name" {
  description = "The name of the EKS cluster."
  type        = string
}

variable "cluster_version" {
    type        = string
    description = "The Kubernetes version for the EKS cluster."
    default = "1.36"
}

variable "subnet_ids" {
    type = list(string)
}

variable "cluster_role_arn" {
    type = string
}

variable "node_role_arn" {
    type = string
}