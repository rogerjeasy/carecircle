# SNS topic for incident escalations ("a fall was reported -> notify coordinators").
# Creating a topic is free; you only pay per published message (fractions of a cent).
# Email/SMS subscriptions can be added later, or wired to the app's notification system.

resource "aws_sns_topic" "escalations" {
  name = "${var.project}-escalations"
}

# Optional: uncomment to email a coordinator on escalations (they must confirm the
# subscription via the email AWS sends).
# resource "aws_sns_topic_subscription" "escalation_email" {
#   topic_arn = aws_sns_topic.escalations.arn
#   protocol  = "email"
#   endpoint  = var.alert_email
# }
