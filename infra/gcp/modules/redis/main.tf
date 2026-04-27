# Memorystore for Redis Module

resource "google_redis_instance" "redis" {
  name           = "${var.resource_prefix}-redis"
  project        = var.project_id
  region         = var.region
  tier           = var.redis_tier
  memory_size_gb = var.redis_memory_size
  redis_version  = var.redis_version

  authorized_network = var.network_id
  connect_mode       = "PRIVATE_SERVICE_ACCESS"

  redis_configs = {
    maxmemory-policy = "allkeys-lru"
  }

  maintenance_policy {
    weekly_maintenance_window {
      day = "SUNDAY"
      start_time {
        hours   = 3
        minutes = 0
      }
    }
  }

  labels = var.labels
}
