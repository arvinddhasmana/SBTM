output "network_name" {
  value = google_compute_network.vpc.name
}

output "network_id" {
  value = google_compute_network.vpc.id
}

output "gke_subnet_id" {
  value = google_compute_subnetwork.gke_subnet.id
}

output "services_subnet_id" {
  value = google_compute_subnetwork.services_subnet.id
}

output "private_vpc_connection_id" {
  value = google_service_networking_connection.private_vpc_connection.id
}
