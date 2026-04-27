# main.tf — SBTM GCP infrastructure orchestrator
# Deploys all modules in dependency order for a complete GKE-based deployment
# Leverages GCP-native features: GKE Autopilot, Cloud SQL, Memorystore, GCS, Secret Manager

terraform {
  required_version = ">= 1.6.0"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 5.0"
    }
    google-beta = {
      source  = "hashicorp/google-beta"
      version = "~> 5.0"
    }
    kubernetes = {
      source  = "hashicorp/kubernetes"
      version = "~> 2.23"
    }
    helm = {
      source  = "hashicorp/helm"
      version = "~> 2.11"
    }
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}

provider "google-beta" {
  project = var.project_id
  region  = var.region
}

# Configure kubernetes provider after cluster is created
provider "kubernetes" {
  host                   = "https://${module.gke.cluster_endpoint}"
  token                  = data.google_client_config.default.access_token
  cluster_ca_certificate = base64decode(module.gke.cluster_ca_certificate)
}

provider "helm" {
  kubernetes {
    host                   = "https://${module.gke.cluster_endpoint}"
    token                  = data.google_client_config.default.access_token
    cluster_ca_certificate = base64decode(module.gke.cluster_ca_certificate)
  }
}

data "google_client_config" "default" {}

locals {
  common_labels = {
    environment = var.environment
    application = "sbtm"
    managed_by  = "terraform"
    cost_center = var.environment == "production" ? "sbtm-prod" : "sbtm-demo"
  }

  resource_prefix = "sbtm-${var.environment}"
}

# ── 1. Networking ──────────────────────────────────────────────────────────
module "networking" {
  source = "./modules/networking"

  project_id      = var.project_id
  region          = var.region
  environment     = var.environment
  resource_prefix = local.resource_prefix
  labels          = local.common_labels
}

# ── 2. GKE Autopilot (GCP's managed Kubernetes) ───────────────────────────
module "gke" {
  source = "./modules/gke"

  project_id      = var.project_id
  region          = var.region
  environment     = var.environment
  resource_prefix = local.resource_prefix
  labels          = local.common_labels

  network_id    = module.networking.network_id
  subnet_id     = module.networking.gke_subnet_id

  # GKE Autopilot features
  enable_autopilot         = var.enable_gke_autopilot
  enable_workload_identity = true
  enable_binary_authorization = var.environment == "production"

  depends_on = [module.networking]
}

# ── 3. Artifact Registry (GCP's container registry) ────────────────────────
module "artifact_registry" {
  source = "./modules/artifact-registry"

  project_id      = var.project_id
  region          = var.region
  environment     = var.environment
  resource_prefix = local.resource_prefix
  labels          = local.common_labels
}

# ── 4. Cloud SQL (PostgreSQL) ──────────────────────────────────────────────
module "database" {
  source = "./modules/database"

  project_id      = var.project_id
  region          = var.region
  environment     = var.environment
  resource_prefix = local.resource_prefix
  labels          = local.common_labels

  network_id               = module.networking.network_id
  database_version         = var.database_version
  database_tier            = var.database_tier
  database_disk_size       = var.database_disk_size
  database_high_availability = var.database_high_availability
  database_backup_enabled  = true
  database_point_in_time_recovery = var.environment == "production"

  depends_on = [module.networking]
}

# ── 5. Memorystore for Redis ───────────────────────────────────────────────
module "redis" {
  source = "./modules/redis"

  project_id      = var.project_id
  region          = var.region
  environment     = var.environment
  resource_prefix = local.resource_prefix
  labels          = local.common_labels

  network_id        = module.networking.network_id
  redis_memory_size = var.redis_memory_size
  redis_tier        = var.redis_tier
  redis_version     = var.redis_version

  depends_on = [module.networking]
}

# ── 6. Cloud Storage (object storage for videos) ───────────────────────────
module "storage" {
  source = "./modules/storage"

  project_id      = var.project_id
  region          = var.region
  environment     = var.environment
  resource_prefix = local.resource_prefix
  labels          = local.common_labels

  storage_class         = var.storage_class
  enable_versioning     = var.environment == "production"
  lifecycle_age_days    = var.storage_lifecycle_age_days
}

# ── 7. Secret Manager ──────────────────────────────────────────────────────
module "secrets" {
  source = "./modules/secrets"

  project_id      = var.project_id
  region          = var.region
  environment     = var.environment
  resource_prefix = local.resource_prefix
  labels          = local.common_labels

  gke_service_account_email = module.gke.workload_identity_sa_email

  # Database connection details
  database_host     = module.database.instance_ip_address
  database_name     = module.database.database_name
  database_user     = module.database.database_user
  database_password = module.database.database_password

  # Redis connection
  redis_host = module.redis.redis_host
  redis_port = module.redis.redis_port

  # Storage bucket
  storage_bucket_name = module.storage.bucket_name

  depends_on = [
    module.gke,
    module.database,
    module.redis,
    module.storage
  ]
}

# ── 8. Cloud DNS (optional) ────────────────────────────────────────────────
module "dns" {
  count  = var.create_dns_zone ? 1 : 0
  source = "./modules/dns"

  project_id      = var.project_id
  environment     = var.environment
  resource_prefix = local.resource_prefix

  dns_zone_name = var.dns_zone_name
  dns_domain    = var.dns_domain
}

# ── 9. Monitoring (Cloud Operations) ───────────────────────────────────────
module "monitoring" {
  source = "./modules/monitoring"

  project_id      = var.project_id
  region          = var.region
  environment     = var.environment
  resource_prefix = local.resource_prefix

  gke_cluster_name = module.gke.cluster_name

  enable_uptime_checks    = var.environment == "production"
  enable_alert_policies   = var.environment == "production"
  notification_channels   = var.notification_channels

  depends_on = [module.gke]
}

# ── 10. Kubernetes Add-ons (via Helm) ─────────────────────────────────────
module "k8s_addons" {
  source = "./modules/k8s-addons"

  project_id      = var.project_id
  environment     = var.environment
  resource_prefix = local.resource_prefix

  # External Secrets Operator for Secret Manager integration
  install_external_secrets = true

  # NGINX Ingress Controller
  install_nginx_ingress = true

  # cert-manager for TLS certificates
  install_cert_manager = true

  # Optional: GKE Managed Prometheus
  enable_managed_prometheus = var.enable_managed_prometheus

  depends_on = [module.gke, module.secrets]
}
