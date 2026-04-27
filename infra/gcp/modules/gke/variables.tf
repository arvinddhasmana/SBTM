variable "project_id" {
  description = "GCP Project ID"
  type        = string
}

variable "region" {
  description = "GCP region"
  type        = string
}

variable "environment" {
  description = "Environment name"
  type        = string
}

variable "resource_prefix" {
  description = "Resource name prefix"
  type        = string
}

variable "labels" {
  description = "Resource labels"
  type        = map(string)
}

variable "network_id" {
  description = "VPC network ID"
  type        = string
}

variable "subnet_id" {
  description = "Subnet ID for GKE"
  type        = string
}

variable "enable_autopilot" {
  description = "Enable GKE Autopilot"
  type        = bool
  default     = true
}

variable "enable_workload_identity" {
  description = "Enable Workload Identity"
  type        = bool
  default     = true
}

variable "enable_binary_authorization" {
  description = "Enable Binary Authorization"
  type        = bool
  default     = false
}

variable "enable_managed_prometheus" {
  description = "Enable GKE Managed Prometheus"
  type        = bool
  default     = false
}
