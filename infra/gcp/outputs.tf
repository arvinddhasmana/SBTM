# outputs.tf — Output values from SBTM GCP deployment

# ── GKE Outputs ────────────────────────────────────────────────────────────

output "gke_cluster_name" {
  description = "GKE cluster name"
  value       = module.gke.cluster_name
}

output "gke_cluster_endpoint" {
  description = "GKE cluster endpoint"
  value       = module.gke.cluster_endpoint
  sensitive   = true
}

output "gke_cluster_location" {
  description = "GKE cluster location"
  value       = module.gke.cluster_location
}

output "gke_workload_identity_sa" {
  description = "Workload Identity service account email"
  value       = module.gke.workload_identity_sa_email
}

# ── Artifact Registry Outputs ──────────────────────────────────────────────

output "artifact_registry_url" {
  description = "Artifact Registry URL"
  value       = module.artifact_registry.registry_url
}

output "artifact_registry_id" {
  description = "Artifact Registry ID"
  value       = module.artifact_registry.registry_id
}

# ── Database Outputs ───────────────────────────────────────────────────────

output "database_instance_name" {
  description = "Cloud SQL instance name"
  value       = module.database.instance_name
}

output "database_connection_name" {
  description = "Cloud SQL connection name (for Cloud SQL Proxy)"
  value       = module.database.connection_name
}

output "database_private_ip" {
  description = "Cloud SQL private IP address"
  value       = module.database.instance_ip_address
  sensitive   = true
}

# ── Redis Outputs ──────────────────────────────────────────────────────────

output "redis_instance_name" {
  description = "Memorystore Redis instance name"
  value       = module.redis.redis_instance_name
}

output "redis_host" {
  description = "Redis host"
  value       = module.redis.redis_host
  sensitive   = true
}

output "redis_port" {
  description = "Redis port"
  value       = module.redis.redis_port
}

# ── Storage Outputs ────────────────────────────────────────────────────────

output "storage_bucket_name" {
  description = "Cloud Storage bucket name"
  value       = module.storage.bucket_name
}

output "storage_bucket_url" {
  description = "Cloud Storage bucket URL"
  value       = module.storage.bucket_url
}

# ── Network Outputs ────────────────────────────────────────────────────────

output "network_name" {
  description = "VPC network name"
  value       = module.networking.network_name
}

output "network_id" {
  description = "VPC network ID"
  value       = module.networking.network_id
}

# ── Next Steps ─────────────────────────────────────────────────────────────

output "next_steps" {
  description = "Next steps after infrastructure provisioning"
  value       = <<-EOT
    Infrastructure provisioned successfully!

    Next steps:
    1. Get GKE credentials:
       gcloud container clusters get-credentials ${module.gke.cluster_name} --region ${var.region} --project ${var.project_id}

    2. Configure kubectl context:
       kubectl config use-context gke_${var.project_id}_${var.region}_${module.gke.cluster_name}

    3. Verify cluster:
       kubectl get nodes

    4. Deploy SBTM services:
       kubectl apply -k ../k8s/overlays/gcp-${var.environment}

    5. Check deployment status:
       kubectl get pods -n sbtm-${var.environment}-gcp

    Artifact Registry: ${module.artifact_registry.registry_url}
    Build and push images there before deploying.
  EOT
}
