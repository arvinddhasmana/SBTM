# Secret Manager Module — Store sensitive configuration

# JWT Secret
resource "google_secret_manager_secret" "jwt_secret" {
  project   = var.project_id
  secret_id = "${var.resource_prefix}-jwt-secret"

  replication {
    auto {}
  }

  labels = var.labels
}

resource "random_password" "jwt_secret" {
  length  = 64
  special = true
}

resource "google_secret_manager_secret_version" "jwt_secret" {
  secret      = google_secret_manager_secret.jwt_secret.id
  secret_data = random_password.jwt_secret.result
}

# Database URL
resource "google_secret_manager_secret" "database_url" {
  project   = var.project_id
  secret_id = "${var.resource_prefix}-database-url"

  replication {
    auto {}
  }

  labels = var.labels
}

resource "google_secret_manager_secret_version" "database_url" {
  secret      = google_secret_manager_secret.database_url.id
  secret_data = "postgresql://${var.database_user}:${var.database_password}@${var.database_host}:5432/${var.database_name}"
}

# Database Password
resource "google_secret_manager_secret" "db_password" {
  project   = var.project_id
  secret_id = "${var.resource_prefix}-db-password"

  replication {
    auto {}
  }

  labels = var.labels
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = var.database_password
}

# Redis Connection String
resource "google_secret_manager_secret" "redis_url" {
  project   = var.project_id
  secret_id = "${var.resource_prefix}-redis-url"

  replication {
    auto {}
  }

  labels = var.labels
}

resource "google_secret_manager_secret_version" "redis_url" {
  secret      = google_secret_manager_secret.redis_url.id
  secret_data = "redis://${var.redis_host}:${var.redis_port}"
}

# Storage Bucket Name
resource "google_secret_manager_secret" "storage_bucket" {
  project   = var.project_id
  secret_id = "${var.resource_prefix}-storage-bucket"

  replication {
    auto {}
  }

  labels = var.labels
}

resource "google_secret_manager_secret_version" "storage_bucket" {
  secret      = google_secret_manager_secret.storage_bucket.id
  secret_data = var.storage_bucket_name
}

# FCM Server Key (placeholder - user will update)
resource "google_secret_manager_secret" "fcm_server_key" {
  project   = var.project_id
  secret_id = "${var.resource_prefix}-fcm-server-key"

  replication {
    auto {}
  }

  labels = var.labels
}

resource "google_secret_manager_secret_version" "fcm_server_key" {
  secret      = google_secret_manager_secret.fcm_server_key.id
  secret_data = "REPLACE_WITH_YOUR_FCM_SERVER_KEY"
}

# Twilio Auth Token (placeholder - user will update)
resource "google_secret_manager_secret" "twilio_auth_token" {
  project   = var.project_id
  secret_id = "${var.resource_prefix}-twilio-auth-token"

  replication {
    auto {}
  }

  labels = var.labels
}

resource "google_secret_manager_secret_version" "twilio_auth_token" {
  secret      = google_secret_manager_secret.twilio_auth_token.id
  secret_data = "REPLACE_WITH_YOUR_TWILIO_AUTH_TOKEN"
}

# Grant GKE service account access to secrets
resource "google_secret_manager_secret_iam_member" "gke_secret_access" {
  for_each = toset([
    google_secret_manager_secret.jwt_secret.id,
    google_secret_manager_secret.database_url.id,
    google_secret_manager_secret.db_password.id,
    google_secret_manager_secret.redis_url.id,
    google_secret_manager_secret.storage_bucket.id,
    google_secret_manager_secret.fcm_server_key.id,
    google_secret_manager_secret.twilio_auth_token.id,
  ])

  project   = var.project_id
  secret_id = each.value
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${var.gke_service_account_email}"
}
