output "registry_id" { value = google_artifact_registry_repository.docker.id }
output "registry_url" { value = "${google_artifact_registry_repository.docker.location}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.docker.repository_id}" }
