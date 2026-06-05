# S3 bucket for the documents vault + timeline photos.
# Cost: pay-per-use, effectively $0 at hackathon scale. Private bucket; the app serves
# files via short-lived presigned URLs (using the app IAM user in iam.tf).

resource "aws_s3_bucket" "uploads" {
  bucket_prefix = "${var.project}-uploads-"
  force_destroy = true # lets `terraform destroy` clean up even if the bucket has objects
}

resource "aws_s3_bucket_ownership_controls" "uploads" {
  bucket = aws_s3_bucket.uploads.id
  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "uploads" {
  bucket                  = aws_s3_bucket.uploads.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_cors_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET", "PUT", "POST", "HEAD"]
    allowed_origins = ["*"] # tighten to your *.vercel.app domain before submitting
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Cost hygiene: drop incomplete multipart uploads so they don't accrue storage.
resource "aws_s3_bucket_lifecycle_configuration" "uploads" {
  bucket = aws_s3_bucket.uploads.id

  rule {
    id     = "abort-incomplete-multipart"
    status = "Enabled"
    filter {}
    abort_incomplete_multipart_upload {
      days_after_initiation = 1
    }
  }
}
