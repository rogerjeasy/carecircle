variable "region" {
  description = "AWS region. Must have Bedrock + Claude for the AI features (us-east-1 recommended)."
  type        = string
  default     = "us-east-1"
}

variable "project" {
  description = "Project name, used to prefix resource names."
  type        = string
  default     = "carecircle"
}

variable "db_name" {
  description = "Initial database name created inside the Aurora cluster."
  type        = string
  default     = "carecircle"
}

variable "db_master_username" {
  description = "Aurora master username (admin). 'admin'/'postgres' work too; 'ccadmin' avoids reserved-word edge cases."
  type        = string
  default     = "ccadmin"
}

# ---- Cost levers (defaults = cheapest viable) -------------------------------

variable "min_acu" {
  description = "Aurora Serverless v2 minimum capacity. 0 = auto-pause to ~$0 when idle (cheapest). Use 0.5 if your engine version rejects 0."
  type        = number
  default     = 0
}

variable "max_acu" {
  description = "Aurora Serverless v2 maximum capacity. Caps the cost ceiling. 1 ACU is plenty for a hackathon demo."
  type        = number
  default     = 1
}

variable "backup_retention_days" {
  description = "Automated backup retention. 1 = minimum (cheapest)."
  type        = number
  default     = 1
}

# ---- Access / safety --------------------------------------------------------

variable "db_access_cidr" {
  description = "CIDR allowed to reach Postgres (5432). '0.0.0.0/0' lets Vercel's dynamic IPs connect (protected by SSL + password). Tighten to your IP for local-only."
  type        = string
  default     = "0.0.0.0/0"
}

variable "alert_email" {
  description = "Email address that receives the AWS budget alerts. REQUIRED."
  type        = string
}

variable "budget_limit_usd" {
  description = "Monthly budget. You get alerts at 50% and 90% of this. Keep it under your $100 credit."
  type        = string
  default     = "80"
}
