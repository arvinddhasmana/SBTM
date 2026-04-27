output "uptime_check_id" {
  value = var.enable_uptime_checks ? google_monitoring_uptime_check_config.api_uptime[0].id : null
}
