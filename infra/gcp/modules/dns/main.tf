# Cloud DNS Module

resource "google_dns_managed_zone" "dns_zone" {
  name        = var.dns_zone_name
  project     = var.project_id
  dns_name    = "${var.dns_domain}."
  description = "DNS zone for SBTM ${var.environment}"

  visibility = "public"
}
