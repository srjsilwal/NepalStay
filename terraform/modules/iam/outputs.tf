output "github_actions_role_arn" {
  value = data.aws_iam_role.github_actions.arn
}

output "cluster_role_arn" {
  value = aws_iam_role.eks_cluster.arn
}

output "node_role_arn" {
  value = aws_iam_role.eks_node.arn
}
