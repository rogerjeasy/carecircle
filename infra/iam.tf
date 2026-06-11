# Least-privilege IAM user the app uses (from Vercel) to call Bedrock and S3.
# IAM itself is free. Bedrock is pay-per-token (a few cents for hackathon digests);
# S3 is pay-per-use. The access key/secret are outputs -> put them in Vercel env vars.

resource "aws_iam_user" "app" {
  name = "${var.project}-app"
}

resource "aws_iam_access_key" "app" {
  user = aws_iam_user.app.name
}

data "aws_caller_identity" "current" {}

resource "aws_iam_user_policy" "app" {
  name = "${var.project}-app-policy"
  user = aws_iam_user.app.name

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "S3Objects"
        Effect   = "Allow"
        Action   = ["s3:GetObject", "s3:PutObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.uploads.arn}/*"
      },
      {
        Sid      = "S3List"
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.uploads.arn
      },
      {
        # Bedrock for the Daily Digest + Ask CareCircle (Claude). "*" keeps it simple;
        # you can scope Resource to specific Claude model ARNs later.
        Sid      = "BedrockInvoke"
        Effect   = "Allow"
        Action   = ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"]
        Resource = "*"
      },
      {
        # Allow publishing escalation notifications to the SNS topic.
        Sid      = "SNSPublish"
        Effect   = "Allow"
        Action   = ["sns:Publish"]
        Resource = aws_sns_topic.escalations.arn
      },
      {
        # The /admin/system health monitor pings Bedrock with this unbilled metadata call
        # (src/lib/admin/system-health.ts). It only supports Resource = "*".
        Sid      = "BedrockHealthProbe"
        Effect   = "Allow"
        Action   = ["bedrock:ListFoundationModels"]
        Resource = "*"
      },
      {
        # Same monitor's SNS probe — read the escalations topic's attributes (unbilled).
        Sid      = "SNSHealthProbe"
        Effect   = "Allow"
        Action   = ["sns:GetTopicAttributes"]
        Resource = aws_sns_topic.escalations.arn
      }
    ]
  })
}
