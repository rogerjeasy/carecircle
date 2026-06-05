# Use the account's DEFAULT VPC and its public subnets.
# This deliberately avoids creating a custom VPC + NAT Gateway (a NAT Gateway alone
# is ~$32/month). The default VPC's subnets have an internet gateway, so a publicly
# accessible DB needs no extra paid networking. Cheapest possible networking.

data "aws_vpc" "default" {
  default = true
}

data "aws_subnets" "default" {
  filter {
    name   = "vpc-id"
    values = [data.aws_vpc.default.id]
  }
}

resource "aws_db_subnet_group" "this" {
  name       = "${var.project}-subnets"
  subnet_ids = data.aws_subnets.default.ids
}

resource "aws_security_group" "db" {
  name        = "${var.project}-sg"
  description = "CareCircle Aurora PostgreSQL access"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    description = "PostgreSQL"
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    cidr_blocks = [var.db_access_cidr]
  }

  egress {
    description = "All outbound"
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
