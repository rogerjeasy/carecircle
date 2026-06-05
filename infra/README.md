# CareCircle — Infrastructure (Terraform)

All AWS resources for the project, codified and **tuned for the lowest possible cost**. One command to create everything, one command (`terraform destroy`) to drop the bill to **$0**.

## What this creates

| Resource | Why | Cost posture |
|---|---|---|
| **Aurora PostgreSQL Serverless v2** (`database.tf`) | Primary database | **min 0 ACU (auto-pause → ~$0 idle)**, max 1 ACU, single instance, Aurora Standard, 1-day backups, no Perf Insights/monitoring |
| **Networking** (`network.tf`) | DB reachability | **Default VPC** (no NAT Gateway → saves ~$32/mo), one security group |
| **S3 bucket** (`storage.tf`) | Documents vault + photos | Private, pay-per-use (~$0), lifecycle to drop incomplete uploads |
| **App IAM user + policy** (`iam.tf`) | App credentials for Bedrock + S3 + SNS | Free (IAM); Bedrock/S3 pay-per-use |
| **SNS topic** (`messaging.tf`) | Incident escalations | Free to create; fractions of a cent per message |
| **Budget alert** (`budget.tf`) | Cost guardrail | Free; emails you at 50% / 90% / forecasted 100% |

Everything is tagged `Project=carecircle` so you can find/delete it all easily.

## Prerequisites (one-time)

1. **Terraform** installed (`terraform -version`). → https://developer.hashicorp.com/terraform/install
2. **AWS account on the Paid Plan** (you already upgraded).
3. **AWS credentials on your machine** so Terraform can authenticate. Easiest:
   - AWS Console → **IAM → Users → Create user** → attach **AdministratorAccess** (fine for a hackathon) → **Create access key (CLI)**.
   - Then run `aws configure` (or set `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` / `AWS_DEFAULT_REGION=us-east-1` env vars).
4. ⚠️ **If you already created an Aurora DB in the console, delete that cluster first** — otherwise you'd pay for two. This Terraform is the single source of truth.

## Create everything

```bash
cd carecircle/infra
cp terraform.tfvars.example terraform.tfvars   # set alert_email
terraform init
terraform plan       # review what will be created
terraform apply      # type "yes" — takes ~5–10 min for Aurora
```

## Wire the outputs into the app

```bash
# Admin DB connection string (use as MIGRATION_DATABASE_URL in carecircle/.env):
terraform output -raw database_url_admin

# App AWS credentials (put in Vercel env / local .env):
terraform output    app_access_key_id
terraform output -raw app_secret_access_key
terraform output    s3_bucket_name
terraform output    sns_escalations_topic_arn
```

Then in `carecircle/.env`:
- `MIGRATION_DATABASE_URL` = the `database_url_admin` output (admin connection).
- Create the **least-privilege `carecircle_app` role** per `../SETUP.md` §3, and set `DATABASE_URL` to that role (this is what makes RLS enforce).
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `S3_BUCKET`, `SNS_ESCALATIONS_TOPIC_ARN` from the outputs.

Then run migrations + seed from `carecircle/`:
```bash
npm run db:migrate && npm run db:seed && npm run dev
```

## One manual step Terraform can't do: Bedrock model access

Amazon Bedrock requires a one-time, account-level approval to use Claude (it's not a Terraform resource):
- Console → **Bedrock** (in `us-east-1`) → **Model access** → **Manage / Enable** → turn on the **Anthropic Claude** models you'll use → submit. Approval is usually instant.

## Keeping cost at rock bottom

- **min_acu = 0** means the DB **auto-pauses to ~$0 when idle** (first query after a pause wakes it in ~10–15s — fine for a demo).
- When you're not actively building, you can **`terraform destroy`** to drop everything to **$0**, then `terraform apply` + `npm run db:migrate && npm run db:seed` to recreate in minutes. (You lose data, which is fine — the seed recreates the demo circle.)
- Keep the cluster **up during judging (Jun 30–Jul 24)** — at min 0 ACU it costs almost nothing while idle.
- The **budget alert** emails you well before the $100 credit is at risk.

## Tear down (after the hackathon)

```bash
terraform destroy   # removes the cluster, S3 bucket, IAM user, SNS topic, budget — bill → $0
```

## Troubleshooting

- **`min_capacity` rejected / must be ≥ 0.5:** your engine version doesn't support scale-to-zero. Set `min_acu = 0.5` in `terraform.tfvars`.
- **Engine version error:** the `aws_rds_engine_version` data source picks the latest automatically; if your account pins differently, set `engine_version` explicitly in `database.tf`.
- **Can't connect from local:** confirm `db_access_cidr` includes your IP (or `0.0.0.0/0`), and the connection string keeps `?sslmode=require`.
- **`terraform apply` says no credentials:** finish prerequisite #3 (`aws configure`).
