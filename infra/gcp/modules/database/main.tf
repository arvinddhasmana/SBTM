# Cloud SQL (PostgreSQL) Module — GCP's managed PostgreSQL
# Features: Automatic backups, point-in-time recovery, high availability

resource "random_id" "db_suffix" {
  byte_length = 4
}

resource "google_sql_database_instance" "postgres" {
  name             = "${var.resource_prefix}-pg-${random_id.db_suffix.hex}"
  project          = var.project_id
  region           = var.region
  database_version = var.database_version

  settings {
    tier              = var.database_tier
    availability_type = var.database_high_availability ? "REGIONAL" : "ZONAL"
    disk_size         = var.database_disk_size
    disk_type         = "PD_SSD"
    disk_autoresize   = true

    backup_configuration {
      enabled                        = var.database_backup_enabled
      point_in_time_recovery_enabled = var.database_point_in_time_recovery
      start_time                     = "02:00"
      transaction_log_retention_days = 7
      backup_retention_settings {
        retained_backups = 30
      }
    }

    ip_configuration {
      ipv4_enabled    = false # Private IP only
      private_network = var.network_id
    }

    database_flags {
      name  = "max_connections"
      value = "200"
    }

    insights_config {
      query_insights_enabled  = true
      query_plans_per_minute  = 5
      query_string_length     = 1024
      record_application_tags = true
    }

    maintenance_window {
      day          = 7 # Sunday
      hour         = 3 # 3 AM
      update_track = "stable"
    }

    user_labels = var.labels
  }

  deletion_protection = var.environment == "production"

  depends_on = [var.network_id]
}

resource "google_sql_database" "database" {
  name     = "sbtm"
  project  = var.project_id
  instance = google_sql_database_instance.postgres.name
}

resource "random_password" "db_password" {
  length  = 32
  special = true
}

resource "google_sql_user" "db_user" {
  name     = "sbtm"
  project  = var.project_id
  instance = google_sql_database_instance.postgres.name
  password = random_password.db_password.result
}
