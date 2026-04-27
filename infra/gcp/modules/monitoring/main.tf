# Cloud Monitoring Module

# Uptime check for API
resource "google_monitoring_uptime_check_config" "api_uptime" {
  count = var.enable_uptime_checks ? 1 : 0

  display_name = "${var.resource_prefix}-api-uptime"
  project      = var.project_id
  timeout      = "10s"
  period       = "60s"

  http_check {
    path         = "/health"
    port         = "443"
    use_ssl      = true
    validate_ssl = true
  }

  monitored_resource {
    type = "uptime_url"
    labels = {
      project_id = var.project_id
      host       = "api.${var.environment}.sbtm.example.com"
    }
  }
}

# Alert policy for high error rate
resource "google_monitoring_alert_policy" "high_error_rate" {
  count = var.enable_alert_policies ? 1 : 0

  display_name = "${var.resource_prefix}-high-error-rate"
  project      = var.project_id
  combiner     = "OR"

  conditions {
    display_name = "Error rate > 5%"

    condition_threshold {
      filter          = "resource.type=\"k8s_pod\" AND metric.type=\"logging.googleapis.com/user/error_rate\""
      duration        = "300s"
      comparison      = "COMPARISON_GT"
      threshold_value = 5

      aggregations {
        alignment_period   = "60s"
        per_series_aligner = "ALIGN_RATE"
      }
    }
  }

  notification_channels = var.notification_channels

  documentation {
    content = "Error rate exceeded 5% for ${var.gke_cluster_name}"
  }
}
