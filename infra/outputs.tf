# Run `terraform output` to see these. Sensitive ones are hidden unless you ask, e.g.:
#   terraform output -raw database_url_admin
#   terraform output -raw app_secret_access_key

output "db_writer_endpoint" {
  description = "Aurora writer endpoint (host)."
  value       = aws_rds_cluster.this.endpoint
}

output "database_url_admin" {
  description = "Admin connection string. Use as MIGRATION_DATABASE_URL in carecircle/.env (and to create the carecircle_app role per SETUP.md)."
  value       = "postgresql://${var.db_master_username}:${random_password.db.result}@${aws_rds_cluster.this.endpoint}:5432/${var.db_name}?sslmode=require"
  sensitive   = true
}

output "db_master_password" {
  description = "Aurora master password (also needed to build the carecircle_app role + connection string)."
  value       = random_password.db.result
  sensitive   = true
}

output "s3_bucket_name" {
  description = "Documents/photos bucket. Put in the app env as S3_BUCKET."
  value       = aws_s3_bucket.uploads.bucket
}

output "sns_escalations_topic_arn" {
  description = "SNS topic ARN for incident escalations. Put in the app env as SNS_ESCALATIONS_TOPIC_ARN."
  value       = aws_sns_topic.escalations.arn
}

output "app_access_key_id" {
  description = "Access key for the app IAM user. Put in Vercel env as AWS_ACCESS_KEY_ID."
  value       = aws_iam_access_key.app.id
}

output "app_secret_access_key" {
  description = "Secret key for the app IAM user. Put in Vercel env as AWS_SECRET_ACCESS_KEY."
  value       = aws_iam_access_key.app.secret
  sensitive   = true
}

output "aws_region" {
  description = "Region for the app env (AWS_REGION)."
  value       = var.region
}
