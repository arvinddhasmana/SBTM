# Cloud Storage Module for video storage

resource "google_storage_bucket" "storage" {
  name          = "${var.resource_prefix}-storage-${var.environment}"
  project       = var.project_id
  location      = var.region
  storage_class = var.storage_class
  force_destroy = var.environment != "production"

  uniform_bucket_level_access = true

  versioning {
    enabled = var.enable_versioning
  }

  lifecycle_rule {
    condition {
      age = var.lifecycle_age_days
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  cors {
    origin          = ["*"]
    method          = ["GET", "HEAD", "PUT", "POST", "DELETE"]
    response_header = ["*"]
    max_age_seconds = 3600
  }

  labels = var.labels
}

# Grant GKE service account access to bucket
resource "google_storage_bucket_iam_member" "gke_access" {
  bucket = google_storage_bucket.storage.name
  role   = "roles/storage.objectAdmin"
  member = "serviceAccount:${var.gke_sa_email}"
}
