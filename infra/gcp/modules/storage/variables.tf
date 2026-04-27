variable "project_id" { type = string }
variable "region" { type = string }
variable "environment" { type = string }
variable "resource_prefix" { type = string }
variable "labels" { type = map(string) }
variable "storage_class" { type = string }
variable "enable_versioning" { type = bool }
variable "lifecycle_age_days" { type = number }
variable "gke_sa_email" { type = string default = "" }
