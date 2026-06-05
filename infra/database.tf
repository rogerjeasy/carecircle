# Amazon Aurora PostgreSQL — Serverless v2, tuned for the absolute lowest cost.
#
# Cost posture:
#   - Serverless v2 with min_capacity = 0  -> auto-pauses to ~$0 when idle.
#   - max_capacity = 1 ACU                 -> caps the ceiling.
#   - Single instance, no read replica, no Multi-AZ.
#   - Aurora Standard storage (pay-per-request I/O, cheapest for low usage).
#   - backup_retention = 1 day, AWS-owned KMS key (free), no Performance Insights,
#     no Enhanced Monitoring, no CloudWatch log exports.

# Resolve a valid, current engine version automatically (supports min ACU = 0 + pgvector).
data "aws_rds_engine_version" "pg" {
  engine = "aurora-postgresql"
  latest = true
}

resource "random_password" "db" {
  length  = 24
  special = false # keep it URL-safe for the connection string
}

resource "aws_rds_cluster" "this" {
  cluster_identifier = "${var.project}-db"
  engine             = "aurora-postgresql"
  engine_mode        = "provisioned" # Serverless v2 runs under "provisioned" + the scaling block below
  engine_version     = data.aws_rds_engine_version.pg.version

  database_name   = var.db_name
  master_username = var.db_master_username
  master_password = random_password.db.result

  db_subnet_group_name   = aws_db_subnet_group.this.name
  vpc_security_group_ids  = [aws_security_group.db.id]

  storage_encrypted       = true # AWS-owned key = no KMS cost
  backup_retention_period = var.backup_retention_days
  skip_final_snapshot     = true
  deletion_protection     = false
  apply_immediately       = true

  serverlessv2_scaling_configuration {
    min_capacity = var.min_acu
    max_capacity = var.max_acu
  }
}

resource "aws_rds_cluster_instance" "this" {
  identifier          = "${var.project}-db-1"
  cluster_identifier  = aws_rds_cluster.this.id
  instance_class      = "db.serverless"
  engine              = aws_rds_cluster.this.engine
  publicly_accessible = true

  # Keep monitoring off to avoid extra cost.
  performance_insights_enabled = false
  monitoring_interval          = 0
}
