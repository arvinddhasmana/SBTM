output "dns_zone_name" { value = google_dns_managed_zone.dns_zone.name }
output "name_servers" { value = google_dns_managed_zone.dns_zone.name_servers }
