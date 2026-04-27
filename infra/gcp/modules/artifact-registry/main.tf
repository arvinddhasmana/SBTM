# Artifact Registry Module — GCP's container registry (replacement for GCR)

resource "google_artifact_registry_repository" "docker" {
  project       = var.project_id
  location      = var.region
  repository_id = "${var.resource_prefix}-docker"
  description   = "SBTM Docker images for ${var.environment}"
  format        = "DOCKER"

  labels = var.labels
}

# Grant GKE service account pull access
resource "google_artifact_registry_repository_iam_member" "gke_reader" {
  project    = var.project_id
  location   = google_artifact_registry_repository.docker.location
  repository = google_artifact_registry_repository.docker.name
  role       = "roles/artifactregistry.reader"
  member     = "serviceAccount:${var.gke_sa_email}"
}
