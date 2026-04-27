# variables.tf — Input variables for SBTM GCP deployment

variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region for resources"
  type        = string
  default     = "us-central1"
}

variable "environment" {
  description = "Deployment environment: demo or production"
  type        = string
  validation {
    condition     = contains(["demo", "production"], var.environment)
    error_message = "Environment must be demo or production"
  }
}

# ── GKE Configuration ──────────────────────────────────────────────────────

variable "enable_gke_autopilot" {
  description = "Enable GKE Autopilot (recommended for production)"
  type        = bool
  default     = true
}

variable "enable_managed_prometheus" {
  description = "Enable GKE Managed Prometheus for observability"
  type        = bool
  default     = false
}

# ── Database Configuration ─────────────────────────────────────────────────

variable "database_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "POSTGRES_15"
}

variable "database_tier" {
  description = "Cloud SQL machine type"
  type        = string
  default     = "db-custom-2-8192" # 2 vCPU, 8GB RAM
}

variable "database_disk_size" {
  description = "Database disk size in GB"
  type        = number
  default     = 32
}

variable "database_high_availability" {
  description = "Enable high availability for Cloud SQL"
  type        = bool
  default     = false # true for production
}

# ── Redis Configuration ────────────────────────────────────────────────────

variable "redis_memory_size" {
  description = "Redis memory size in GB"
  type        = number
  default     = 1
}

variable "redis_tier" {
  description = "Redis tier: BASIC or STANDARD_HA"
  type        = string
  default     = "BASIC"
}

variable "redis_version" {
  description = "Redis version"
  type        = string
  default     = "REDIS_7_0"
}

# ── Storage Configuration ──────────────────────────────────────────────────

variable "storage_class" {
  description = "Storage class: STANDARD, NEARLINE, COLDLINE, ARCHIVE"
  type        = string
  default     = "STANDARD"
}

variable "storage_lifecycle_age_days" {
  description = "Days before moving objects to cheaper storage tier"
  type        = number
  default     = 90
}

# ── DNS Configuration ──────────────────────────────────────────────────────

variable "create_dns_zone" {
  description = "Create a Cloud DNS zone"
  type        = bool
  default     = false
}

variable "dns_zone_name" {
  description = "Cloud DNS zone name"
  type        = string
  default     = "sbtm-zone"
}

variable "dns_domain" {
  description = "DNS domain (e.g., sbtm.example.com)"
  type        = string
  default     = "sbtm.example.com"
}

# ── Monitoring Configuration ───────────────────────────────────────────────

variable "notification_channels" {
  description = "List of notification channel IDs for alerts"
  type        = list(string)
  default     = []
}
