# Demo Environment Configuration for GCP

project_id  = "REPLACE_WITH_YOUR_GCP_PROJECT_ID"
region      = "us-central1" # Change to your preferred region
environment = "demo"

# GKE Configuration
enable_gke_autopilot       = true
enable_managed_prometheus  = false

# Database Configuration
database_version             = "POSTGRES_15"
database_tier                = "db-custom-1-3840" # 1 vCPU, 3.75GB RAM (smaller for demo)
database_disk_size           = 20
database_high_availability   = false
database_point_in_time_recovery = false

# Redis Configuration
redis_memory_size = 1
redis_tier        = "BASIC"
redis_version     = "REDIS_7_0"

# Storage Configuration
storage_class          = "STANDARD"
storage_lifecycle_age_days = 90

# DNS Configuration (optional)
create_dns_zone = false
# dns_zone_name   = "sbtm-demo-zone"
# dns_domain      = "demo.sbtm.example.com"

# Monitoring Configuration
notification_channels = []
