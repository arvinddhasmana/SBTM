output "cluster_name" {
  description = "GKE cluster name"
  value       = google_container_cluster.gke.name
}

output "cluster_endpoint" {
  description = "GKE cluster endpoint"
  value       = google_container_cluster.gke.endpoint
}

output "cluster_location" {
  description = "GKE cluster location"
  value       = google_container_cluster.gke.location
}

output "cluster_ca_certificate" {
  description = "Cluster CA certificate"
  value       = google_container_cluster.gke.master_auth[0].cluster_ca_certificate
  sensitive   = true
}

output "workload_identity_sa_email" {
  description = "Workload Identity service account email"
  value       = google_service_account.gke_workload_identity.email
}

output "workload_identity_sa_name" {
  description = "Workload Identity service account name"
  value       = google_service_account.gke_workload_identity.name
}
