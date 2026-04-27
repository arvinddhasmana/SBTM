# Production Environment Configuration for GCP

project_id  = "REPLACE_WITH_YOUR_GCP_PROJECT_ID"
region      = "us-central1" # Change to your preferred region
environment = "production"

# GKE Configuration
enable_gke_autopilot       = true
enable_managed_prometheus  = true

# Database Configuration
database_version             = "POSTGRES_15"
database_tier                = "db-custom-2-8192" # 2 vCPU, 8GB RAM
database_disk_size           = 100
database_high_availability   = true
database_point_in_time_recovery = true

# Redis Configuration
redis_memory_size = 5
redis_tier        = "STANDARD_HA" # High availability for production
redis_version     = "REDIS_7_0"

# Storage Configuration
storage_class          = "STANDARD"
storage_lifecycle_age_days = 90

# DNS Configuration (optional)
create_dns_zone = false
# dns_zone_name   = "sbtm-prod-zone"
# dns_domain      = "sbtm.example.com"

# Monitoring Configuration
# Add your notification channel IDs here
notification_channels = []
